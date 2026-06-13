# Spanish Adventure Upgrade State

Last updated: 2026-06-13

## Status

Phase 0 stabilization and Phase 1A storage durability are complete. No course
vocabulary, examples, visual redesign, or new learning activity was added.

## Completed fixes

### Storage durability and progress backup

- centralized browser storage access for course selection, progress, backups,
  and browser voice preference behind a guarded storage adapter
- added typed handling for unavailable storage, security failures, unknown
  failures, and quota exhaustion
- skipped identical writes and added best-effort transactional rollback for
  two-course batch writes
- replaced shallow progress loading with field-level validation and recovery
- preserved migrations from schema versions 1, 2, 3, and 4
- rejects unsupported future schemas, uses safe in-memory defaults, and leaves
  the newer stored data untouched until an explicit replacement
- malformed JSON and partially damaged records can no longer crash rendering
- added a versioned, validated JSON export containing only course progress and
  harmless course metadata
- added import preview, per-course summary, warnings, and replacement
  confirmation
- automatically backs up both current course states before import or reset
- added previous-backup restore and a visible last-backup timestamp
- split reset into explicit active-course and full two-course actions
- keeps A1-A2 and B1 import, backup, restore, and reset data isolated
- shows a non-blocking storage warning while preserving the in-memory session

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

- `src/components/AppHeader.tsx`
- `src/components/ProgressDataTools.tsx`
- `src/state/CourseContext.tsx`
- `src/state/GameContext.tsx`
- `src/state/progressData.ts`
- `src/state/progressState.ts`
- `src/state/storage.ts`
- `src/styles.css`
- `src/utils/speak.ts`
- `tests/progressData.test.ts`
- `tests/progressState.test.ts`
- `tests/storage.test.ts`
- `tests/activityAvailability.test.ts`
- `tests/progressEvents.test.ts`
- `tests/tts.test.ts`
- `tests/challengeEngine.test.ts`
- `tests/progressState.test.ts`
- `UPGRADE_STATE.md`

## Tests added

- invalid saved JSON recovery
- unavailable localStorage handling
- storage quota error classification
- unchanged-write suppression
- complete version 1, 2, 3, and 4 migration coverage
- partial-record field recovery
- unsupported future schema rejection
- export/import JSON round trip
- invalid and future import rejection
- backup data integrity and restore
- A1-A2/B1 import and restore isolation
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

Run on 2026-06-13:

- `npm test`: PASS, 47 passed, 0 failed
- `npm run lint`: PASS
- `npm run build`: PASS
- Vite transformed 1,618 modules
- output JavaScript approximately 308.70 kB, 96.55 kB gzip
- output CSS approximately 80.83 kB, 16.14 kB gzip

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
- tiny adaptive-review pools can still produce weak choice sets
- navigation has no URL history or active-session recovery
- drawer and search focus management remains incomplete
- component/browser/accessibility coverage remains limited
- reward and progress terminology still needs a later product-alignment pass
- automatic backups use one browser-local slot and do not survive clearing site
  data; downloaded JSON exports remain the durable off-device/manual copy
- imports replace both courses rather than merging individual records
- there is no cloud synchronization or cross-device account backup

## Exact next phase

Begin Phase 1B: progress semantics only.

The exact next implementation step is to define shared selectors that
separately calculate coverage, completed sessions, score, stars, and mastery.
Then rename the current lifetime mastery percentage to accuracy in the UI and
tests before adding confidence-weighted mastery or resolved-mistake rules.
