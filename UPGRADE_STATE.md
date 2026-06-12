# Spanish Adventure Upgrade State

Last updated: 2026-06-12

## Status

Phase 0 stabilization is complete. No course vocabulary, examples, visual
redesign, or new learning activity was added.

## Completed fixes

### Idempotent progress

- migrated progress from version 3 to version 4 without removing existing data
- added a persisted, bounded processed-event ledger
- added stable session-scoped IDs for answer, seen, completion, and review events
- made XP, learned words, mastery, mistakes, world counters, collection,
  activity completion, scores, and stars idempotent
- made duplicate event processing return the existing state unchanged
- disabled or guarded answer and completion controls immediately
- made result-screen actions run once
- defined replay behavior: a new session may earn normal rewards again, while
  the same event or completion cannot reward twice

### Progress correctness

- Matching duplicate pair submissions no longer duplicate XP or progress
- Matching mistakes follow the initially selected concept
- Story Shuffle ordering errors no longer create vocabulary mistakes or lower
  vocabulary mastery
- Story Shuffle now stores and displays the same 100/80/60 score
- Story Shuffle grants one bounded completion reward instead of repeatable
  per-check XP
- Dialogue, Unit Challenge, Matching, Story Shuffle, review, and all other
  active activities use one completion event per session
- mixed challenge concepts are resolved to their original world before
  mastery, mistake, and learned-word updates
- story comprehension attributes evidence only to the expression it tests
- A1-A2 and B1 event ledgers remain isolated in their existing course stores
- retries may add answer evidence but never create another completion
- streak normalization was verified to advance at most once per calendar day

### B1 activity availability

- added unit-level capability checks
- Listening requires four distinct words and meanings
- Sentence Builder requires three reviewed examples
- Dialogue and Story Shuffle require example-backed structured material
- Unit Challenge requires enough words, meanings, and examples for a balanced
  session
- unsupported B1 activities are disabled with a clear explanation
- direct activity launches are guarded as well as activity cards
- all A1-A2 units retain their current activity availability

### TTS protection

- consolidated Vite and Vercel TTS behavior into one server utility
- kept `ELEVENLABS_API_KEY` server-only
- retained voice `MWXF5l2gMPzYdfnzWbHM` and model `eleven_multilingual_v2`
- validates POST, JSON content type, object body, non-empty text, body size, and
  500-character text limit
- rejects malformed, oversized, and cross-origin requests with safe errors
- aborts slow ElevenLabs requests after 12 seconds
- adds a best-effort in-memory per-client limit of 20 requests per minute
- returns `429` and `Retry-After` when throttled
- logs upstream error details on the server without logging the API key
- preserves browser Spanish `speechSynthesis` fallback for all server failures

## Files changed

### Progress and types

- `src/types.ts`
- `src/state/GameContext.tsx`
- `src/state/progressState.ts`
- `src/state/progressEvents.ts`
- `src/engine/activityEngine.ts`
- `src/engine/challengeEngine.ts`
- `src/activities/activityHelpers.ts`

### Activity controls and completion

- `src/activities/AdaptiveReviewActivity.tsx`
- `src/activities/DialogueActivity.tsx`
- `src/activities/ExploreActivity.tsx`
- `src/activities/ListeningActivity.tsx`
- `src/activities/MatchingActivity.tsx`
- `src/activities/SentenceBuilderActivity.tsx`
- `src/activities/StoryShuffleActivity.tsx`
- `src/activities/UnitChallengeActivity.tsx`
- `src/components/MixedQuestionCard.tsx`
- `src/components/SessionResults.tsx`
- `src/screens/LearnMode.tsx`
- `src/screens/FlashcardMode.tsx`
- `src/screens/QuizMode.tsx`

### Availability

- `src/engine/activityAvailability.ts`
- `src/screens/ActivityScreen.tsx`
- `src/screens/WorldScreen.tsx`

### TTS

- `server/tts.ts`
- `api/tts.ts`
- `vite.config.ts`
- `tsconfig.node.json`

### Tests and state tracking

- `tests/activityAvailability.test.ts`
- `tests/progressEvents.test.ts`
- `tests/tts.test.ts`
- `tests/challengeEngine.test.ts`
- `tests/progressState.test.ts`
- `UPGRADE_STATE.md`

## Tests added

- duplicate answer submission
- duplicate seen/learned-word submission
- duplicate XP prevention
- duplicate activity completion
- duplicate star prevention
- Matching completion idempotency
- Story Shuffle completion idempotency and mastery isolation
- Dialogue and Unit Challenge completion idempotency
- retry evidence versus unique completion
- correct cross-world mastery and mistake attribution
- A1-A2/B1 event isolation
- replay reward policy
- version 1-3 migration to version 4
- once-per-day streak advancement
- B1 missing-content capability gating
- A1-A2 availability preservation
- challenge story attribution
- TTS method, JSON, empty, malformed, body-size, and text-length validation
- server-only `xi-api-key` forwarding
- TTS rate limiting
- TTS upstream timeout

## Current verification

Run on 2026-06-12:

- `npm test`: PASS, 35 passed, 0 failed
- `npm run lint`: PASS
- `npm run build`: PASS
- Vite transformed 1,615 modules
- output JavaScript approximately 292.82 kB, 91.94 kB gzip
- output CSS approximately 78.05 kB, 15.67 kB gzip

The in-app browser connection was unavailable during the final smoke-check
attempt, so no visual browser verification is claimed.

## Remaining P0 issues

No known P0 issue from the audit remains open.

The TTS limiter is intentionally basic and per warm server instance. A
distributed Vercel/edge rate-limit store would provide stronger protection if
the app becomes public or receives meaningful traffic.

## Remaining P1 issues

- the underlying B1 example coverage remains incomplete; unsupported activities
  are now safely gated instead of inventing content
- dialogue and story language still needs a later teacher-reviewed content pass
- the current mastery percentage remains a simple lifetime accuracy estimate
- mistake records do not yet resolve or archive after recovery
- localStorage writes still need guarded failure handling
- localStorage remains the only progress copy
- reset wording still overstates its active-course scope
- tiny adaptive-review pools can still produce weak choice sets
- navigation has no URL history or active-session recovery
- drawer and search focus management remains incomplete
- component/browser/accessibility coverage remains limited
- reward and progress terminology still needs a later product-alignment pass

## Exact next phase

Begin Phase 1: trustworthy persistence and progress semantics.

The exact next implementation step is to introduce a guarded storage adapter
for course selection and both course progress stores. It should catch quota,
privacy-mode, serialization, and security failures; preserve the in-memory
session; and show a non-blocking "Progress is not being saved" status. Add
storage-failure and recovery tests before changing reset, backup/export, or
mastery semantics.
