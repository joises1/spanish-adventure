# Spanish Adventure Upgrade Roadmap

Date: 2026-06-12

## Principles

- Stabilize trust before adding activities.
- Do not change course content during the stabilization phase.
- Preserve both course states and migrate safely.
- Separate completion, score, mastery, and rewards.
- Add tests at the same boundary where each defect occurred.

## Phase 0: Release blockers

Target findings: P0-01, P0-02, P1-03, P1-04, P1-14

### 0.1 Idempotent progress events

- define a typed `ProgressEvent` with course, session, question, skill, concept
  provenance, correctness, and stable event ID
- keep a bounded processed-event ledger per active session or persisted session
- reject duplicate reward and progress mutations
- stop treating story-order errors as vocabulary errors
- preserve historical version 3 data through a version 4 migration

Acceptance:

- repeated clicks cannot increase XP twice for one answer event
- Matching and Story Shuffle counters remain stable under repeated submission
- prior-unit concepts remain attributed to their original world
- component-level regression tests cover the exploit paths

### 0.2 Protect TTS spend

- add deployment-level rate limiting or an edge request budget
- add same-origin checks as defense in depth
- cache normalized text/audio where practical
- add structured server metrics for status, latency, cache hit, and rejection
- test malformed bodies, oversized text, upstream failures, and throttling

Acceptance:

- direct automated abuse is throttled
- API key remains server-only
- browser fallback still works when the server rejects or fails

## Phase 1: Trustworthy progress and persistence

Target findings: P1-05, P1-06, P1-07, P1-08, P1-12, P1-15, P2-06, P2-09

### Work

- introduce a storage adapter with guarded reads/writes and visible failure
- rename reset to active-course reset and make scope explicit
- add JSON export/import with schema validation
- distinguish coverage, completed sessions, score, stars, and mastery
- call current mastery "accuracy" until confidence rules are implemented
- add resolved mistake status and recovery rules
- make activity reward previews derive from the actual generated session
- migrate existing state without deleting progress

Acceptance:

- quota/private-mode failures do not crash the app
- users can back up and restore both course states
- resolved mistakes stop dominating Daily Review
- UI labels match calculations and reset scope

## Phase 2: Capability-aware learning

Target findings: P1-01, P1-02, P1-13, P2-08, P2-10

### Work without content changes

- compute a per-unit capability matrix
- hide, disable, or explain activities that lack sufficient source material
- let Unit Challenge balance only among available skills and disclose coverage
- source review distractors from the course, not only the tiny target pool
- provide a non-choice fallback for one-concept review
- separate story/discourse results from vocabulary results

### Later content sprint

Only after explicit approval to change content:

- author reviewed examples for B1 worlds 4-34
- create unit-specific dialogue scenarios
- replace vocabulary-study stories with communicative mini-stories
- add curated grammar-repair transformations tagged by objective
- add teacher review for Spanish correctness and CEFR fit

Acceptance:

- no unit opens to an empty advertised activity
- challenges report their actual skill mix
- review always presents a valid interaction
- authored Spanish passes a teacher/content QA checklist

## Phase 3: Navigation and accessibility

Target findings: P1-10, P1-11, P2-07, P3-02, P3-03, P3-04

### Work

- add routes for course, map, unit, collection, and activity
- add safe active-session resume
- create a shared accessible drawer/dialog primitive
- trap and restore focus and support Escape consistently
- mark background content inert while modal
- rename "Current" map state to "Suggested next"
- remember last visited world and reduce unexpected auto-scroll
- add responsive, zoom, reduced-motion, and contrast checks

Acceptance:

- Back, refresh, and deep links behave predictably
- keyboard and screen-reader dialog behavior passes automated and manual checks
- 320px mobile and 200% zoom remain usable

## Phase 4: Maintainability and delivery

Target findings: P1-09, P2-01, P2-02, P2-03, P2-04, P2-05, P2-11, P2-12,
P3-01

### Work

- move shared activity shell out of legacy screens
- remove confirmed dead modes and old engine paths
- split the stylesheet by product surface
- share one server TTS handler between Vite and Vercel
- add TTS retry cooldown and revoke cached object URLs
- update README and architecture documentation
- declare Node support and add CI for test, lint, and build
- add component, API, storage, accessibility, and selected browser tests

Acceptance:

- one documented architecture matches runtime behavior
- CI reproduces the local green baseline
- legacy removal does not change course content or progress

## Priority totals

| Severity | Findings |
| --- | ---: |
| P0 | 2 |
| P1 | 15 |
| P2 | 12 |
| P3 | 4 |

## Recommended next implementation phase

Begin Phase 0 only. The first implementation slice should be idempotent answer
events and regression tests for Matching and Story Shuffle. Do not combine that
slice with content authoring, navigation changes, or visual redesign.
