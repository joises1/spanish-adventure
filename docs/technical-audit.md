# Spanish Adventure Technical Audit

Date: 2026-06-12

## Architecture

### Application shell

`src/main.tsx` mounts the React app with course and game providers.
`src/App.tsx` is a typed screen union and conditional renderer rather than a
router. This is simple and readable, but navigation and active sessions exist
only in memory.

### State and persistence

`CourseContext` persists the selected course. `GameContext` loads and retains
both course states, exposes progress mutation methods, and writes both states
to localStorage after changes. `progressState.ts` migrates state versions 1 and
2 into version 3 and isolates A1-A2 from B1.

### Activity layer

`ActivityScreen` dispatches to activity components. Shared generators create
stable question IDs, semantic keys, deterministic seeded narrative sessions,
Fisher-Yates shuffles, and capped question collections.

### API and audio

The browser calls `/api/tts`. Vercel uses `api/tts.ts`; Vite development and
preview use a similar middleware implementation in `vite.config.ts`. The
ElevenLabs key stays server-side. Browser Spanish speech is the fallback.

### Tests

Five test files contain 19 Node tests for:

- unique question IDs and prompts
- delayed retry and answer-position distribution
- small pools and ten-item caps
- adaptive review ordering and course scope
- dialogue/story structure and future-vocabulary exclusion
- challenge balance on fixtures
- version migration and course isolation

## P0 findings

### P0-01: Reward and answer mutations are not idempotent

Evidence:

- `src/activities/MatchingActivity.tsx:76-103` records every attempted pair,
  including repeated wrong pairs.
- `src/activities/StoryShuffleActivity.tsx:87-106` records every failed check.
- `src/state/GameContext.tsx:183-269` has no session/question attempt ledger and
  always adds 10 XP for correct or 2 XP for incorrect.

Consequences:

- repeated wrong pair clicks can farm 2 XP each
- repeated Story Shuffle checks can farm 2 XP each
- incorrect, seen, quiz answer, and mistake counters are inflated
- adaptive review and mastery become less trustworthy

Required fix:

Pass a stable answer event ID such as
`courseId:sessionId:questionId:attemptKind` into the state mutation. Ignore
already-recorded reward/progress events. Matching should record at most one
error per pair attempt policy, and Story Shuffle should store sequencing
attempts separately from concept answers.

### P0-02: Paid TTS proxy has no abuse controls

Evidence:

`api/tts.ts:12-80` accepts any POST containing up to 500 characters and forwards
it to ElevenLabs. There is no authentication, origin enforcement, rate limit,
per-IP budget, or deployment-level protection.

Consequences:

- a third party can call the deployed endpoint directly
- ElevenLabs credits can be drained
- server logs can be flooded

Required fix:

- add an edge/provider rate limit or request budget
- validate same-origin browser requests as a secondary signal
- cap requests by IP/session and text hash
- cache generated text where deployment infrastructure supports it
- return generic errors and retain detailed logs server-side

## P1 technical findings

### P1-03: Story score state diverges

`StoryShuffleActivity.tsx:94` completes any correct post-failure attempt with
80, while `StoryShuffleActivity.tsx:138` displays 60 after two or more failures.

### P1-04: Wrong state domain is updated

Story ordering errors call the general vocabulary answer recorder for every
story concept. State needs skill-specific result events.

### P1-07: Persistence writes are unguarded

- `CourseContext.tsx:13-15` reads localStorage directly.
- `CourseContext.tsx:29-31` writes directly.
- `GameContext.tsx:72-81` writes both course payloads without handling quota,
  privacy mode, serialization, or security errors.

Migration loading catches parse/read failures, but normal application writes do
not. Add a storage adapter returning success/failure and show a non-blocking
"Progress is not being saved" state.

### P1-09: Test coverage stops at pure engines

Missing regression coverage includes:

- repeated answer event idempotency
- matching and story component behavior
- XP and star accounting
- reset scope
- localStorage write failure and corrupted nested schemas
- TTS route validation, rate limiting, and fallback
- focus management and keyboard interaction
- production course capability coverage
- route/history or refresh behavior

### P1-14: Challenge provenance is too coarse

`challengeEngine.ts:103-116` can put previous-unit IDs in a story question but
sets `sourceWorldId` to the current world. `UnitChallengeActivity.tsx:75-85`
then records all source words under that single world.

Use per-concept provenance rather than a question-level world owner.

## P2 technical findings

### P2-01: Legacy code remains reachable by imports

Legacy `LearnMode`, `FlashcardMode`, and `QuizMode` coexist with the activity
system. `ModeShell` is imported from `LearnMode` by active activities, making
safe deletion harder.

Move `ModeShell` to `src/components/ActivityShell.tsx`, confirm no active
references, then remove obsolete modes and old engine functions.

### P2-02: README is stale

It describes a B1-only app with Learn, flashcards, quiz, review, and gentle
locking. It omits A1-A2, the activity hub, dialogue/story/challenge, adaptive
review, and current navigation.

### P2-03: Stylesheet concentration

`src/styles.css` is 5,543 lines and mixes legacy and current surfaces. Split by
tokens/base, shell/navigation, map, activities, collections, and responsive
overrides after behavior is stabilized.

### P2-04: TTS server code is duplicated

Voice, model, limits, request formatting, and error handling are repeated in
`api/tts.ts` and `vite.config.ts`. Extract a server-only handler module usable
by both environments.

### P2-05: TTS client session behavior

`src/utils/speak.ts:139-170` disables ElevenLabs for the entire page session
after selected status codes. There is no timed recovery. Object URLs stored in
the session cache are not revoked.

### P2-06: Migration clarity and validation

Version 3 data is stored in keys ending with `-v1`. Normalization fills missing
top-level fields but does not validate nested values, numeric ranges, IDs, or
timestamps. Invalid data can be silently reset by the broad catch path.

### P2-11: Runtime portability

Tests depend on Node's experimental TypeScript flags, but `package.json` does
not declare a Node engine and there is no CI workflow proving supported
versions. Add a declared runtime and a GitHub Actions matrix or replace the
experimental runner with a stable test tool.

### P2-12: Boundary and type cleanup

The shared activity shell lives in a legacy screen, while types such as
`ActivitySession` and `ActivityResult` do not consistently drive runtime
behavior. Align types with real state transitions rather than retaining
aspirational interfaces.

## Positive technical observations

- TypeScript strictness and linting currently pass.
- Production build passes without bundling the ElevenLabs key.
- Course storage is separated and migration has direct automated coverage.
- Question generators avoid `sort(() => Math.random() - 0.5)`.
- Stable IDs, semantic deduplication, capped sessions, and seeded narratives
  are good foundations.
- The client uses pending-request deduplication and per-session audio caching.

## Verification baseline

Run on 2026-06-12:

- `npm test`: passed, 19 tests, 0 failures
- `npm run lint`: passed
- `npm run build`: passed
- build output: 1,613 modules transformed
- main CSS: approximately 78.05 kB, 15.67 kB gzip
- main JavaScript: approximately 287.68 kB, 90.56 kB gzip

## Technical recommendation

Do not begin another activity sprint. First introduce idempotent domain events,
protect the TTS proxy, add integration tests around progress mutations, and
make persistence failure visible. These changes reduce both product risk and
the chance that later refactoring migrates corrupted data.
