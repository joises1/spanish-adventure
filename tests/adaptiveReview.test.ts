import assert from "node:assert/strict";
import test from "node:test";
import {
  generateAdaptiveReviewQuestions,
  selectAdaptiveReviewConcepts,
} from "../src/engine/adaptiveReviewEngine.ts";
import { createInitialGameState } from "../src/state/progressState.ts";
import type { GameState, World } from "../src/types.ts";

const world: World = {
  id: "review-world",
  unit: 1,
  name: "Review",
  spanishName: "Repaso",
  description: "Review fixture",
  color: "#fff",
  accent: "#000",
  icon: "R",
  words: Array.from({ length: 8 }, (_, index) => ({
    id: `review-${index}`,
    es: `es ${index}`,
    en: `en ${index}`,
    example: {
      es: `Esta es la frase ${index}.`,
      en: `This is sentence ${index}.`,
    },
  })),
};

const state = (): GameState => {
  const initial = createInitialGameState("2026-06-12");
  return {
    ...initial,
    worlds: {
      [world.id]: {
        learnedWordIds: world.words.map((word) => word.id),
        collectedWordIds: world.words.map((word) => word.id),
        completedSessions: 1,
        quizAnswers: 8,
        quizCorrect: 4,
      },
    },
    mastery: {
      "review-0": {
        seenCount: 3,
        correctCount: 0,
        incorrectCount: 3,
        masteryEstimate: 0,
        lastPracticedAt: "2026-05-01T00:00:00.000Z",
      },
      "review-1": {
        seenCount: 8,
        correctCount: 8,
        incorrectCount: 0,
        masteryEstimate: 100,
        lastPracticedAt: "2026-06-11T00:00:00.000Z",
      },
    },
    mistakes: {
      "review-0": {
        conceptId: "review-0",
        worldId: world.id,
        activityType: "listening",
        incorrectCount: 3,
        lastIncorrectAt: "2026-05-01T00:00:00.000Z",
        correctedAnswer: "en 0",
      },
    },
  };
};

test("adaptive review prioritizes low mastery and older mistakes", () => {
  const selected = selectAdaptiveReviewConcepts(
    [world],
    state(),
    "daily",
    5,
    new Date("2026-06-12T12:00:00.000Z"),
  );

  assert.equal(selected[0].word.id, "review-0");
  const masteredIndex = selected.findIndex(
    (concept) => concept.word.id === "review-1",
  );
  assert.ok(masteredIndex === -1 || masteredIndex > 0);
});

test("mistake review includes only recorded mistakes", () => {
  const selected = selectAdaptiveReviewConcepts(
    [world],
    state(),
    "mistakes",
    8,
    new Date("2026-06-12T12:00:00.000Z"),
  );

  assert.deepEqual(selected.map((concept) => concept.word.id), ["review-0"]);
});

test("mistake review preserves legacy incorrect-answer history", () => {
  const legacyState = state();
  legacyState.mistakes = {};
  legacyState.words["review-0"] = {
    correct: 0,
    incorrect: 2,
    lastSeen: "2026-05-01T00:00:00.000Z",
  };
  const selected = selectAdaptiveReviewConcepts(
    [world],
    legacyState,
    "mistakes",
    8,
    new Date("2026-06-12T12:00:00.000Z"),
  );

  assert.deepEqual(selected.map((concept) => concept.word.id), ["review-0"]);
});

test("daily review uses multiple activity types without duplicates", () => {
  const selected = selectAdaptiveReviewConcepts(
    [world],
    state(),
    "daily",
    8,
    new Date("2026-06-12T12:00:00.000Z"),
  );
  const questions = generateAdaptiveReviewQuestions(
    selected,
    "daily",
    "adaptive-test",
  );

  assert.ok(new Set(questions.map((question) => question.kind)).size >= 3);
  assert.equal(
    new Set(questions.map((question) => question.id)).size,
    questions.length,
  );
  assert.ok(questions.length >= 5 && questions.length <= 10);
});
