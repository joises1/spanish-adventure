# Spanish Adventure Learning Audit

Date: 2026-06-12

## Scope

This is a learning-design and content-capability audit based on the application
code, content structures, generators, and tests. The tester perspectives are
simulated, not real learner or teacher research.

## Learning strengths

- Spanish is consistently the prompt/audio language and English is the meaning
  language.
- Explore, retrieval, listening, sentence assembly, dialogue, ordering, and
  mixed challenge create useful modality variety.
- Sessions are short and avoid punitive mechanics.
- Incorrect concepts can feed adaptive review.
- Existing generators prevent exact duplicate prompts and delay retries.
- "What You Learned" is based on completed activity collection.
- Course scope helpers prevent future-unit vocabulary leakage.

## Content capability inventory

Static inspection found:

- A1-A2: 8 worlds, 96 words, with examples throughout the course
- B1: 34 worlds, 555 words
- B1 examples are concentrated in the first three worlds
- 31 of 34 B1 worlds contain no example sentences

This does not mean the B1 vocabulary itself is invalid. It means the current
content schema cannot support every advertised activity equally across B1.

## Major learning findings

### P1-01: Activity availability is not content-aware

Sentence Builder requires `word.example.es`. Unit Challenge also relies on
examples for sentence-building and grammar-repair questions. For most B1
worlds these generators return no such questions, while the hub still presents
the activities and reward expectations.

Impact:

- learners can open an activity that has no meaningful session
- the "balanced" Unit Challenge silently loses productive sentence and grammar
  practice
- B1 feels less complete than A1-A2 despite appearing structurally identical

Recommendation:

Before changing course content, add a capability matrix per unit:

- vocabulary available
- listening available
- examples available
- sentence builder available
- grammar repair available
- authored dialogue/story available

The hub and challenge composer should reflect actual capability. A later,
separate content sprint can author examples for B1.

### P1-02: Narrative language is structurally coherent but not authentic

Dialogue and Story Shuffle use deterministic templates, which is safer than
uncontrolled random generation. However, the story is mainly about Elena
studying vocabulary and can place an English gloss directly inside a Spanish
sentence. It practices meta-language more than real communicative use.

Impact:

- B1 learners receive little pragmatic or situational transfer
- teachers may view the text as grammatically awkward or pedagogically thin
- repeated templates become predictable rather than meaningfully contextual

Recommendation:

Use curated, unit-specific scenario templates with reviewed Spanish slots:
ordering food, describing symptoms, asking for directions, resolving a work
problem, and similar communicative tasks. Keep deterministic generation and
scope controls.

### P1-04: Story mistakes are attributed to the wrong skill

An incorrect story order records every current story word as an incorrect
vocabulary answer. The learner may know every word and only misunderstand the
sequence.

Impact:

- vocabulary mastery drops for a discourse-level error
- the Mistake Notebook receives misleading corrections
- Daily Review prioritizes concepts for the wrong reason

Recommendation:

Track the story-order attempt as a story/discourse result. Update vocabulary
mastery only when a question directly tests vocabulary, or store separate skill
mastery dimensions.

### P1-05: Mastery is not a reliable learning estimate

The concept value is lifetime percentage correct. Unit mastery averages those
values with unseen concepts as zero, while activity cards label best activity
score as mastery.

Missing factors:

- number of observations and confidence
- recency or forgetting
- cue type and activity difficulty
- independent listening versus recognition evidence
- assisted/revealed answers

Recommendation:

Rename the current concept metric to "accuracy" until a confidence-aware model
exists. A simple next model can use:

- weighted recent evidence
- minimum attempts before showing mastery
- skill-specific evidence
- decay or review due date
- separate recognition and production confidence

### P1-06: Mistakes never resolve

Correct answers update mastery but do not clear, resolve, or lower the stored
mistake record. Mistake Review therefore includes old errors indefinitely.

Recommendation:

Add mistake states such as `active`, `improving`, and `resolved`, with a clear
rule based on later correct retrieval and recency. Keep history for reflection,
but do not treat resolved mistakes as equally urgent.

### P1-13: Adaptive review breaks down for small pools

The selector caps at ten but cannot guarantee five when fewer concepts exist.
Choice generation uses only the selected review pool, so one recorded mistake
can produce a one-option multiple-choice question.

Recommendation:

- source distractors from the current course while keeping target selection
  adaptive
- switch to self-recall or explore cards when a valid choice set cannot be made
- state honestly when a review is shorter because little evidence exists

### P1-14: Previous vocabulary can be recorded under the wrong world

Story comprehension may include a previously learned concept, but the challenge
question sets the current world as its source. Recording then mutates the
current world's learned IDs and counters for that prior concept.

Recommendation:

Carry `{ courseId, worldId, conceptId }` provenance per concept instead of one
question-level world ID.

### P1-15: Learning rewards and completion do not align

Explore can award strong completion despite being browsing, while stars and XP
have different meanings across activities. Activity previews are fixed even
when generated session length or content capability differs.

Recommendation:

- reward Explore for coverage, not correctness
- reward retrieval activities for independent answers
- make "reveal" lower confidence without punishment
- calculate rewards from actual generated interactions
- distinguish completion, coverage, accuracy, and mastery

## Secondary learning findings

### P2-09: World stars permit very partial completion

One star is awarded at 20% coverage or 50% accuracy. A star is then used by the
map as evidence that a world is cleared. This is encouraging, but not a strong
completion contract.

### P2-10: Grammar repair is mechanically generated

Grammar repair swaps the first two tokens of an example sentence. This tests
word order inconsistently and may create an obvious or unnatural distractor
rather than a targeted grammar misconception.

Recommendation:

Use curated transformations tagged by grammar objective:

- agreement
- article choice
- verb form
- pronoun placement
- preposition
- sentence order

## Learning test gaps

Current tests verify generator structure and scope, but not:

- grammatical correctness of generated Spanish
- communicative naturalness
- per-world activity capability
- B1 challenge balance using production data
- distinction between vocabulary and discourse errors
- mastery validity and mistake resolution
- distractor quality for tiny review pools
- assisted versus independent answers

## Learning priorities

1. Stop corrupting vocabulary mastery with story-order failures.
2. Make unit activity availability match content capability.
3. Resolve mistakes after demonstrated recovery.
4. Rename or redesign mastery so it communicates evidence honestly.
5. Author reviewed B1 examples and scenario templates in a later content sprint.
