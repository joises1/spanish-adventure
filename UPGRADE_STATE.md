# Spanish Adventure Upgrade State

Last updated: 2026-06-12

## Status

Product audit complete. No application features or course content were changed.

## Completed work

- inspected screens, active and legacy activities, engines, state, storage,
  migrations, data, API routes, shared components, styles, and tests
- completed a simulated 100-persona heuristic review; these were not real users
- deduplicated and classified 33 findings
- documented product, UX, learning, technical, and roadmap recommendations
- verified current test, lint, type, and production build baseline

## Finding totals

- P0: 2
- P1: 15
- P2: 12
- P3: 4

## Pending work

### Release blockers

- make progress/reward answer events idempotent
- stop Story Shuffle ordering errors from mutating vocabulary mastery
- correct Story Shuffle score persistence/display mismatch
- preserve original world provenance for prior-unit challenge concepts
- protect `/api/tts` with rate limiting or a request budget

### Trust and persistence

- handle localStorage failures visibly
- clarify active-course reset scope
- add validated progress backup/restore
- resolve or archive recovered mistakes
- separate coverage, score, stars, accuracy, and mastery

### Learning quality

- add per-unit activity capability checks
- prevent empty/incomplete B1 activity promises
- improve tiny-pool adaptive review
- later, with content-change approval, author B1 examples and reviewed scenarios

### UX and accessibility

- add route/history and session recovery
- complete dialog focus management
- improve map orientation and mobile Matching

### Engineering quality

- add component, API, storage, accessibility, and browser tests
- consolidate TTS server logic
- remove verified legacy code
- split the stylesheet
- update README
- declare Node support and add CI

## Current tests

Run on 2026-06-12:

- `npm test`: PASS, 19 passed, 0 failed
- `npm run lint`: PASS
- `npm run build`: PASS
- Vite transformed 1,613 modules
- output JavaScript approximately 287.68 kB, 90.56 kB gzip
- output CSS approximately 78.05 kB, 15.67 kB gzip

The current suite covers generator deduplication, retry spacing, answer
positions, adaptive selection, dialogue/story structure, future-vocabulary
scope, challenge fixtures, migration, and course separation. It does not cover
the two P0 findings.

## Known risks

1. Matching and Story Shuffle can produce duplicate XP/progress mutations.
2. The public TTS endpoint can consume paid ElevenLabs credits.
3. Most B1 units cannot fully support example-dependent activities.
4. Story-order failures can corrupt vocabulary mastery and mistake priority.
5. localStorage failure can prevent saving without a recoverable user state.
6. Clearing browser storage removes the only progress copy.
7. Green tests do not exercise components, API behavior, or accessibility.

## Exact next implementation step

Create a typed, stable answer event ID and make `recordActivityAnswer`
idempotent before it mutates XP, word records, mastery, mistakes, or world
counters. Wire Matching and Story Shuffle to pass that event ID, then add
component or state integration tests proving repeated submissions do not award
XP or increment counters more than once.

After that slice passes test, lint, and build, implement TTS request limiting as
the second Phase 0 change.
