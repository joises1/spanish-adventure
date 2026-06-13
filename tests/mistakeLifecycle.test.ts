import assert from "node:assert/strict";
import test from "node:test";
import {
  applyMistakeEvidence,
  type MistakeEvidence,
} from "../src/engine/mistakeLifecycle.ts";
import type { MistakeRecord, ProgressConcept } from "../src/types.ts";

const concept: ProgressConcept = {
  word: {
    id: "a1-food-pan",
    es: "el pan",
    en: "bread",
    example: { es: "Quiero pan.", en: "I want bread." },
  },
  worldId: "a1-food",
  unit: 4,
};

const evidence = (
  isCorrect: boolean,
  overrides: Partial<MistakeEvidence> = {},
): MistakeEvidence => ({
  courseId: "a1-a2",
  concept,
  activityType: "listening",
  skill: "listening",
  isCorrect,
  isRetry: false,
  isReview: false,
  userAnswer: isCorrect ? "bread" : "cheese",
  correctAnswer: "bread",
  explanation: "El pan means bread.",
  practicedAt: "2026-06-13T12:00:00.000Z",
  ...overrides,
});

test("mistakes are created with complete provenance and grouped by concept", () => {
  const first = applyMistakeEvidence(undefined, evidence(false));
  const second = applyMistakeEvidence(
    first,
    evidence(false, {
      userAnswer: "rice",
      practicedAt: "2026-06-14T12:00:00.000Z",
    }),
  );

  assert.equal(first?.status, "new");
  assert.equal(first?.courseId, "a1-a2");
  assert.equal(first?.worldId, "a1-food");
  assert.equal(first?.unit, 4);
  assert.equal(first?.userAnswer, "cheese");
  assert.equal(second?.status, "practicing");
  assert.equal(second?.incorrectCount, 2);
  assert.equal(second?.userAnswer, "rice");
});

test("later first-attempt success improves then resolves a mistake", () => {
  let mistake = applyMistakeEvidence(undefined, evidence(false));
  mistake = applyMistakeEvidence(mistake, evidence(true));
  assert.equal(mistake?.status, "improved");

  mistake = applyMistakeEvidence(
    mistake,
    evidence(true, {
      activityType: "mistake-review",
      isReview: true,
      practicedAt: "2026-06-15T12:00:00.000Z",
    }),
  );

  assert.equal(mistake?.status, "resolved");
  assert.equal(mistake?.successfulReviews, 1);
  assert.equal(mistake?.consecutiveSuccesses, 2);
  assert.equal(mistake?.resolvedAt, "2026-06-15T12:00:00.000Z");
});

test("an immediate retry practices but does not resolve the mistake", () => {
  const created = applyMistakeEvidence(undefined, evidence(false));
  const retried = applyMistakeEvidence(
    created,
    evidence(true, { isRetry: true }),
  );

  assert.equal(retried?.status, "practicing");
  assert.equal(retried?.consecutiveSuccesses, 0);
});

test("resolved mistakes reopen only after two meaningful errors", () => {
  const resolved: MistakeRecord = {
    ...applyMistakeEvidence(undefined, evidence(false))!,
    status: "resolved",
    consecutiveErrors: 0,
    consecutiveSuccesses: 3,
    resolvedAt: "2026-06-16T12:00:00.000Z",
  };
  const firstError = applyMistakeEvidence(
    resolved,
    evidence(false, { practicedAt: "2026-06-20T12:00:00.000Z" }),
  );
  const secondError = applyMistakeEvidence(
    firstError,
    evidence(false, { practicedAt: "2026-06-21T12:00:00.000Z" }),
  );

  assert.equal(firstError?.status, "resolved");
  assert.equal(firstError?.reopenErrors, 1);
  assert.equal(secondError?.status, "practicing");
  assert.equal(secondError?.reopenedCount, 1);
  assert.equal(secondError?.resolvedAt, undefined);
});
