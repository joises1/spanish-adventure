# Spanish Adventure Product Audit

Date: 2026-06-12

## Executive summary

Spanish Adventure has a strong product foundation: two course tracks, a clear
storybook identity, short activities, course-scoped progress, adaptive review,
audio fallback, and a surprisingly broad activity engine for a personal app.
The codebase builds cleanly and all 19 current automated tests pass.

The product is not yet ready to treat its progress data and paid speech service
as fully trustworthy. Two P0 issues need to be fixed before further feature
work:

1. Answer recording is not idempotent. Matching and Story Shuffle can award XP
   repeatedly for repeated wrong submissions, while also inflating mistake and
   mastery counters.
2. The deployed `/api/tts` route is a public proxy to a paid ElevenLabs account
   with no rate limiting, request budget, or abuse control.

The next largest product risk is promise mismatch. Most B1 units have no
example sentences, but Sentence Builder and balanced Unit Challenge experiences
are still presented as available. Several visible labels also overstate what
the underlying metrics mean, especially "mastery", reward previews, reset
scope, and session length.

## Audit scope and method

This was a code-based product and heuristic audit. It covered:

- application screens and navigation
- all activity components and question generators
- progress, rewards, mastery, mistakes, streaks, and storage migration
- A1-A2 and B1 course data
- TTS browser client, local middleware, and Vercel API route
- shared components, map behavior, accessibility semantics, and responsive CSS
- all existing automated tests
- production lint and build behavior

The in-app browser control was unavailable during the audit, so no fresh
automated visual walkthrough was claimed. UI conclusions are based on rendered
component structure, styles, interaction code, and existing behavior contracts.

## Simulated 100-persona review

These are simulated heuristic reviewer perspectives, not real users, usability
sessions, analytics, surveys, or research participants.

| Simulated cohort | Count | Primary lens |
| --- | ---: | --- |
| First-time users | 10 | onboarding, course choice, orientation |
| Complete beginners | 8 | confidence, clarity, error recovery |
| A1-A2 learners | 8 | pacing, examples, useful repetition |
| B1 learners | 8 | challenge depth, authenticity, transfer |
| Long-term users | 7 | retention, backup, review quality |
| Mobile users | 8 | reachability, scrolling, compact layouts |
| Desktop users | 6 | navigation, density, keyboard use |
| Accessibility needs | 8 | keyboard, screen reader, low vision, motor and cognitive load |
| Language teachers | 7 | correctness, sequencing, feedback |
| UX designers | 6 | hierarchy, expectations, modal behavior |
| Product managers | 5 | value, trust, prioritization |
| Game designers | 5 | rewards, stars, progression, exploit resistance |
| QA engineers | 5 | edge cases, repeatability, failure handling |
| Frontend engineers | 5 | architecture, state, maintainability |
| Learning specialists | 4 | mastery validity, retrieval, adaptive review |
| **Total** | **100** | |

The simulated review used shared scenarios: first launch, both course choices,
map exploration, unit opening, each activity, repeated wrong answers, review,
audio failure, reset, refresh, small content pools, mobile navigation,
keyboard-only navigation, and long-term localStorage use.

## Architecture summary

- `src/App.tsx` is an in-memory screen state machine. It switches between
  course selection, map, collections, review, unit hub, and activity screens.
- `src/state/CourseContext.tsx` persists the selected course.
- `src/state/GameContext.tsx` owns both course states and all progress mutations.
- `src/state/progressState.ts` handles version 1-3 state normalization and
  course-specific localStorage keys.
- `src/screens/` contains top-level product surfaces and three legacy modes.
- `src/activities/` contains the active activity implementations.
- `src/engine/` contains generation, shuffle, narrative, challenge, adaptive
  review, course scope, and progress calculations.
- `src/data/` separates A1-A2 and B1 course content from activity logic.
- `src/utils/speak.ts` uses `/api/tts` first and browser Spanish voices second.
- `api/tts.ts` is the Vercel TTS function; `vite.config.ts` duplicates the local
  development implementation.
- `tests/` contains 19 Node tests focused on pure engines and migration.

## Severity totals

| Severity | Count | Meaning |
| --- | ---: | --- |
| P0 | 2 | broken, unsafe, data loss, or duplicate rewards |
| P1 | 15 | major UX, learning, trust, or quality problem |
| P2 | 12 | meaningful improvement |
| P3 | 4 | optional polish |
| **Total** | **33** | deduplicated findings |

## Deduplicated finding register

| ID | Finding | Primary area |
| --- | --- | --- |
| P0-01 | Answer recording is not idempotent; repeat submissions can award duplicate XP and corrupt counters. | Rewards/state |
| P0-02 | The public TTS proxy can be used to consume paid ElevenLabs quota without abuse controls. | API/security |
| P1-01 | Thirty-one of 34 B1 worlds have no examples, so advertised sentence and mixed challenge capabilities are unavailable or incomplete. | Content capability |
| P1-02 | Dialogue and story templates are structurally safe but often artificial and can place English glosses inside Spanish narrative. | Learning quality |
| P1-03 | Story Shuffle can persist an 80 score while displaying 60 after multiple failed attempts. | Scoring |
| P1-04 | A story ordering error records every story vocabulary concept as incorrect. | Mastery integrity |
| P1-05 | "Mastery" combines lifetime accuracy, activity best score, and averages including unseen concepts, so the label is not psychometrically trustworthy. | Learning metrics |
| P1-06 | Mistake records never resolve, decay, or archive after later success. | Adaptive review |
| P1-07 | localStorage reads/writes outside migration loading are unguarded and have no user-visible failure state. | Reliability |
| P1-08 | localStorage is the only progress copy; there is no backup or export path for long-term use. | Data durability |
| P1-09 | The green test suite has no component, browser, API, accessibility, storage-failure, reset, or reward-idempotency coverage. | QA |
| P1-10 | Drawer and search dialogs lack complete focus trapping, focus restoration, and inert-background behavior. | Accessibility |
| P1-11 | In-memory navigation has no URL history, deep links, or active-session recovery after refresh. | Navigation |
| P1-12 | Reset copy says "all progress" while implementation resets only the active course. | UX/data expectation |
| P1-13 | Small review pools can produce fewer than five questions and even one-choice multiple-choice items. | Review quality |
| P1-14 | Unit Challenge story questions can attribute previously learned words to the current world. | Progress integrity |
| P1-15 | Activity reward, duration, interaction, stars, completion, and mastery labels do not consistently match actual mechanics. | Product trust |
| P2-01 | Legacy Learn, Flashcard, Quiz, and old engine paths remain alongside the new activity system. | Maintainability |
| P2-02 | README product and architecture claims are materially stale. | Documentation |
| P2-03 | A single 5,543-line stylesheet mixes current and legacy surfaces. | Maintainability |
| P2-04 | Local and Vercel TTS implementations are duplicated and can drift. | API maintenance |
| P2-05 | Some TTS failures disable ElevenLabs for the whole page session, and cached object URLs are never revoked. | Audio resilience |
| P2-06 | Version 3 data uses `-v1` storage keys and migration performs only shallow structural validation. | Persistence clarity |
| P2-07 | The long B1 map and "current level" framing imply linear progression despite all worlds being open. | Map UX |
| P2-08 | Matching mixes both languages in one long mobile card field, increasing scrolling and working-memory load. | Activity UX |
| P2-09 | World stars can mark a world complete after partial exposure, while "completion" is based on touched words rather than completed sessions. | Progress semantics |
| P2-10 | Grammar repair is generated by mechanically swapping early tokens rather than using curated grammar errors. | Learning quality |
| P2-11 | No CI workflow or declared Node engine protects the experimental TypeScript test command across environments. | Delivery |
| P2-12 | Shared boundaries leak through `ModeShell` living in a legacy screen, and several architecture types are unused or aspirational. | Architecture |
| P3-01 | Browser fallback loading state ends before speech playback ends. | Audio polish |
| P3-02 | Some progress visuals expose labels on non-semantic elements rather than robust meter semantics. | Accessibility polish |
| P3-03 | Practical keyboard operation exists, but there are no optional shortcuts for high-frequency study actions. | Efficiency |
| P3-04 | There are no automated visual, responsive, or color-contrast regression checks. | Visual QA |

## Product strengths

- Course progress is cleanly separated for A1-A2 and B1.
- All worlds are accessible without punitive locks.
- Session generators use deterministic IDs and Fisher-Yates style shuffling.
- Retry spacing and answer-position tests cover the original duplicate-question
  sprint goals.
- "What You Learned" updates on completed sessions instead of exposing future
  content.
- Audio keeps the API key server-side and has a Spanish browser fallback.
- The current build is compact for the breadth of functionality and has no
  lint, type, or production build errors.

## Product recommendation

Pause feature expansion for one stabilization phase. Fix P0-01 and P0-02,
add regression coverage, then repair progress semantics and storage durability.
Only after those foundations are trustworthy should the team improve B1
activity coverage and authored dialogue/story quality.
