# Spanish Adventure Mastery Model

Date: 2026-06-13

## Purpose

Mastery estimates durable ability, not a single activity score. Activity score,
stars, completion, XP, and mastery remain separate signals.

## Skill dimensions

Each concept stores independent evidence for:

- vocabulary
- listening
- sentence building
- grammar
- dialogue and context

Story ordering is a discourse task and does not change concept mastery.
Story comprehension can add dialogue/context evidence when it directly tests a
unit expression.

## Evidence weights

Base skill weights:

| Skill | Weight |
| --- | ---: |
| Vocabulary | 0.70 |
| Listening | 0.90 |
| Sentence building | 1.00 |
| Grammar | 1.00 |
| Dialogue/context | 0.90 |

Response-mode multipliers:

| Response | Multiplier |
| --- | ---: |
| Recognition | 0.85 |
| Recall | 1.00 |
| Context | 0.95 |

Daily Review and Mistake Review evidence receives a 1.15 multiplier. A retry
adds half the normal possible evidence and earns 60% of that reduced evidence
when correct. Incorrect answers earn zero weighted evidence while still
increasing weighted possible evidence.

## Formula

For each skill dimension:

```text
weighted accuracy = weighted earned / weighted possible
confidence = min(1, weighted possible / 4)
mastery = weighted accuracy * confidence * recency * 100
```

Recency:

| Time since practice | Factor |
| --- | ---: |
| 0-14 days | 1.00 |
| 15-30 days | 0.95 |
| 31-90 days | 0.85 |
| More than 90 days | 0.75 |

The concept total is the evidence-weighted mean of its skill dimensions. Every
result is clamped to 0-100.

This confidence rule prevents one lucky answer from creating high mastery.
Later first-attempt and review successes can repair an earlier mistake because
the model retains weighted evidence rather than applying a permanent penalty.

## Mistake lifecycle

Mistakes are grouped by concept and carry course, world, unit, skill, activity,
answer, correction, explanation, and timestamps.

```text
new -> practicing -> improved -> resolved
```

- First error: `new`.
- Repeated error or successful immediate retry: `practicing`.
- Later correct first-attempt answer: `improved`.
- Three consecutive later successes resolve the mistake.
- Two consecutive later successes also resolve it when at least one is a Daily
  Review or Mistake Review success.
- Immediate retries never resolve a mistake.
- A resolved mistake remains resolved after one isolated error.
- Two meaningful errors reopen it as `practicing`.
- A successful answer between those errors clears the pending reopen signal.

Resolved mistakes remain visible through filters but are excluded from normal
Mistake Replay. They can still be selected explicitly for focused practice.

## Migration

Saved versions 1-4 remain supported. Legacy lifetime counts are recovered into
the vocabulary dimension. Legacy mistake records become `practicing` records,
retain their incorrect count and correction, and receive safe defaults for
new provenance fields.
