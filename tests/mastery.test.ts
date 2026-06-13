import assert from "node:assert/strict";
import test from "node:test";
import {
  applyMasteryEvidence,
  getConceptMastery,
  getDimensionMastery,
  getQuestionMasteryEvidence,
} from "../src/engine/mastery.ts";
import type {
  ConceptMastery,
  MasterySkill,
} from "../src/types.ts";

const practicedAt = "2026-06-13T12:00:00.000Z";

const answer = (
  mastery: ConceptMastery | undefined,
  skill: MasterySkill,
  isCorrect: boolean,
  options: { retry?: boolean; review?: boolean } = {},
) =>
  applyMasteryEvidence(mastery, {
    skill,
    responseMode:
      skill === "sentence-building" || skill === "grammar"
        ? "recall"
        : skill === "dialogue"
          ? "context"
          : "recognition",
    isCorrect,
    isRetry: Boolean(options.retry),
    isReview: Boolean(options.review),
    practicedAt,
  });

test("one lucky answer is confidence-capped and mastery stays bounded", () => {
  const mastery = answer(undefined, "vocabulary", true);

  assert.equal(mastery.masteryEstimate, 15);
  assert.ok(mastery.masteryEstimate >= 0);
  assert.ok(mastery.masteryEstimate <= 100);
  assert.equal(
    getDimensionMastery(
      {
        attempts: 1,
        firstAttemptCorrect: 1,
        retryCorrect: 0,
        incorrectCount: 0,
        weightedEarned: 999,
        weightedPossible: 1,
        lastPracticedAt: practicedAt,
      },
      new Date(practicedAt),
    ),
    25,
  );
});

test("recognition, listening, recall, grammar, and context stay separate", () => {
  let mastery = answer(undefined, "vocabulary", true);
  mastery = answer(mastery, "listening", false);
  mastery = answer(mastery, "sentence-building", true);
  mastery = answer(mastery, "grammar", false);
  mastery = answer(mastery, "dialogue", true);

  assert.deepEqual(Object.keys(mastery.skills).sort(), [
    "dialogue",
    "grammar",
    "listening",
    "sentence-building",
    "vocabulary",
  ]);
  assert.equal(mastery.skills.vocabulary?.firstAttemptCorrect, 1);
  assert.equal(mastery.skills.listening?.incorrectCount, 1);
  assert.equal(mastery.skills["sentence-building"]?.firstAttemptCorrect, 1);
});

test("retries earn partial evidence and never equal first-attempt recall", () => {
  const wrong = answer(undefined, "sentence-building", false);
  const retry = answer(wrong, "sentence-building", true, { retry: true });
  const firstAttempt = answer(undefined, "sentence-building", true);

  assert.equal(retry.skills["sentence-building"]?.retryCorrect, 1);
  assert.ok(retry.masteryEstimate < firstAttempt.masteryEstimate);
});

test("later success repairs mastery after an earlier mistake", () => {
  let mastery = answer(undefined, "grammar", false);
  const afterMistake = mastery.masteryEstimate;
  mastery = answer(mastery, "grammar", true);
  mastery = answer(mastery, "grammar", true, { review: true });
  mastery = answer(mastery, "grammar", true);

  assert.equal(afterMistake, 0);
  assert.ok(mastery.masteryEstimate >= 70);
  assert.ok(mastery.masteryEstimate <= 100);
});

test("time since practice applies deterministic recency decay", () => {
  let mastery: ConceptMastery | undefined;
  for (let index = 0; index < 4; index += 1) {
    mastery = answer(mastery, "listening", true);
  }

  const fresh = getConceptMastery(mastery, new Date(practicedAt));
  const old = getConceptMastery(
    mastery,
    new Date("2026-10-01T12:00:00.000Z"),
  );

  assert.equal(fresh, 77);
  assert.equal(old, 57);
});

test("story ordering creates no vocabulary or concept mastery evidence", () => {
  const evidence = getQuestionMasteryEvidence({
    id: "story-order",
    semanticKey: "story-order",
    activityType: "story-shuffle",
    kind: "story-order",
    conceptIds: ["a1-food-pan"],
    sourceWordIds: ["a1-food-pan"],
    prompt: "Order the story",
    answer: "1,2,3",
    skill: "story",
  });

  assert.equal(evidence, null);
});
