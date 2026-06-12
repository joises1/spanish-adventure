# Spanish Adventure UX Audit

Date: 2026-06-12

## Scope

This document synthesizes the UX, accessibility, game-feel, and navigation
findings from the simulated 100-persona heuristic review. It does not represent
real-user research.

## What already works

- Course selection is visually and structurally separated from the adventure.
- The map, unit hub, side drawer, and activity shell form a recognizable
  hierarchy.
- All worlds are open, which supports self-directed learning.
- Activity screens use short instructions, encouraging feedback, and explicit
  completion summaries.
- Native buttons are used for most interactions, giving a useful keyboard
  baseline.
- The drawer supports Escape and a backdrop close action.
- Search is collapsed by default and auto-focuses its input when opened.

## Major UX findings

### P1-10: Dialog focus behavior is incomplete

`AppHeader` gives the drawer `role="dialog"` and `aria-modal="true"`, but focus
is not moved into it, trapped within it, or restored to the menu trigger after
close. The map search uses `role="dialog"` but does not support Escape, a
backdrop, focus trapping, or background inertness.

Impact:

- keyboard and screen-reader users can move into obscured background controls
- closing can leave focus in an unpredictable location
- mobile assistive technology may not experience the panel as a contained task

Recommendation:

- use a shared accessible dialog/drawer primitive
- focus the first meaningful control on open
- trap Tab and Shift+Tab
- make the rest of the app inert while modal
- restore focus to the opening control
- support Escape consistently

### P1-11: Navigation is not durable

`App.tsx` stores navigation entirely in React state. There are no routes,
history entries, deep links, or session snapshots.

Impact:

- browser Back does not reliably mean "go back one app screen"
- refresh returns to course selection and discards the active session
- users cannot bookmark or share a unit
- interrupted mobile sessions have no resume path

Recommendation:

Introduce lightweight route state for course, map, unit, collection, and
activity. Persist only a minimal active-session snapshot, with an explicit
"Resume" or "Start over" choice.

### P1-12: Reset scope is misleading

The confirmation says it clears "all progress", but `resetProgress` resets only
the active course. That is a trust problem even if the active-course behavior
is preferable.

Recommendation:

- rename the current action to "Reset this course"
- state the course name in confirmation
- add a separate, more deliberate "Reset both courses" only if needed

### P1-15: Product labels overpromise mechanics

Examples:

- activity cards show fixed XP rewards while XP is actually awarded per answer
- Story Shuffle is described as multiple interactions but is one ordering task
- course cards say "10-item sessions" although activity lengths vary
- activity `bestScore` is displayed as "mastery"
- world stars, activity stars, completion, and concept mastery use different
  rules without explaining the differences

Recommendation:

Create one product vocabulary:

- `XP`: earned actions
- `Activity score`: performance in one activity
- `Best stars`: best activity result
- `Unit coverage`: words encountered or collected
- `Unit mastery`: concept-level evidence, only when confidence is sufficient

Reward previews should be calculated from the actual session or described as
"up to X XP".

## Map and mobile experience

### P2-07: The map communicates a linear current level

All worlds are open, but the first world without a star is marked "Current" and
drives automatic scrolling. This can feel like an implicit required sequence.
The 34-world B1 course also creates a very tall map.

Recommendation:

- call the marker "Suggested next" instead of "Current"
- remember the user's last visited world
- keep "Find world" prominent
- add compact chapter navigation or an overview minimap
- avoid unexpected auto-scroll after returning from an activity

### P2-08: Matching is demanding on small screens

Spanish and English cards are shuffled into one combined field. With 12 cards,
users may need to scroll while retaining a pair in working memory.

Recommendation:

- use two columns or two clearly separated language zones when space permits
- on narrow screens, pin the selected card or show it in a sticky tray
- reduce pair count for very small viewports if necessary

### P2-09: Completion feedback is ambiguous

A world can receive one star at 20% coverage, and coverage includes any word
with an answer record. A user can therefore see a completed-looking world
without finishing a session.

Recommendation:

- reserve completion styling for at least one completed session
- show coverage and performance separately
- use stars for performance, not partial exposure

## Accessibility and clarity

### P3-02: Progress visuals need stronger semantics

Some rings and labels rely on styled spans and `aria-label`. Prefer native
`progress`, `meter`, or an element with explicit `role`, value minimum,
maximum, and current value where appropriate.

### P3-03: Optional study shortcuts

The app is operable through buttons, but frequent learners would benefit from
optional shortcuts:

- number keys for choices
- Space to replay audio
- Enter to check/continue
- arrow keys for card navigation and ordered items

These should supplement, not replace, visible controls.

### P3-04: Visual regression coverage

The product relies heavily on a large custom stylesheet, but has no automated
checks for:

- 320px mobile width
- sticky header overlap
- drawer and search layering
- map node clipping
- reduced motion
- high zoom
- color contrast

## Journey-level synthesis

### First session

The course cards and open exploration are welcoming. The first uncertainty is
what stars, XP, mastery, and "current" each mean. A short "How progress works"
explanation would be more useful after the metric model is corrected.

### Returning session

Daily Review and Mistake Notebook provide a good return loop. The weak point is
that resolved mistakes remain visible and refresh cannot resume an activity.

### Long-term session

The major trust gaps are no backup/export, ambiguous reset scope, and no
confidence-aware mastery. Long-term users need durable progress more than new
activity types.

## UX priorities

1. Make rewards and progress labels truthful.
2. Correct reset scope and storage failure messaging.
3. Add accessible shared dialog behavior.
4. Add route/history and session recovery.
5. Improve long-map orientation and mobile Matching.
