import assert from "node:assert/strict";
import test from "node:test";
import {
  generateListeningQuestions,
  generateMatchingQuestions,
  generateMultipleChoiceQuestions,
  scheduleDelayedRetry,
} from "../src/engine/activityEngine.ts";
import type { World } from "../src/types.ts";

const createRandom = (values: number[]) => {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
};

const createWorld = (wordCount = 12): World => ({
  id: "test-world",
  unit: 1,
  name: "Test World",
  spanishName: "Mundo de prueba",
  description: "A test fixture.",
  color: "#ffffff",
  accent: "#000000",
  icon: "T",
  words: Array.from({ length: wordCount }, (_, index) => ({
    id: `word-${index}`,
    es: `palabra ${index}`,
    en: `meaning ${index}`,
    example: {
      es: `Esta es la frase ${index}.`,
      en: `This is sentence ${index}.`,
    },
  })),
});

test("generated sessions contain unique IDs and semantic prompts", () => {
  const questions = generateMultipleChoiceQuestions(
    createWorld(),
    10,
    createRandom([0.1, 0.7, 0.3, 0.9]),
  );
  const ids = questions.map((question) => question.id);
  const semantics = questions.map((question) => question.semanticKey);
  const prompts = questions.map((question) => question.prompt);

  assert.equal(new Set(ids).size, questions.length);
  assert.equal(new Set(semantics).size, questions.length);
  assert.equal(new Set(prompts).size, questions.length);
});

test("listening sessions use unique Spanish audio prompts", () => {
  const questions = generateListeningQuestions(
    createWorld(),
    10,
    createRandom([0.4, 0.8, 0.2]),
  );
  const prompts = questions.map((question) => question.prompt);

  assert.equal(new Set(prompts).size, questions.length);
});

test("incorrect concepts are retried only after three other questions", () => {
  const questions = generateListeningQuestions(
    createWorld(),
    6,
    createRandom([0.2, 0.8, 0.4]),
  );
  const currentIndex = 0;
  const withRetry = scheduleDelayedRetry(
    questions,
    currentIndex,
    questions[currentIndex],
    1,
  );
  const retryIndex = withRetry.findIndex((question) => question.isRetry);

  assert.equal(retryIndex, 4);
  assert.equal(
    retryIndex - currentIndex - 1,
    3,
    "three other questions should appear before the retry",
  );
});

test("small content pools produce short duplicate-free sessions", () => {
  const questions = generateMatchingQuestions(
    createWorld(2),
    10,
    createRandom([0.5]),
  );

  assert.equal(questions.length, 2);
  assert.equal(new Set(questions.map((question) => question.id)).size, 2);
});

test("all generated and retry-extended sessions stay capped at ten", () => {
  const questions = generateMultipleChoiceQuestions(
    createWorld(20),
    30,
    createRandom([0.15, 0.55, 0.95]),
  );
  assert.equal(questions.length, 10);

  const withRetry = scheduleDelayedRetry(
    questions,
    0,
    questions[0],
    1,
  );
  assert.equal(withRetry.length, 10);
});

test("correct answer position never repeats more than twice", () => {
  const questions = generateMultipleChoiceQuestions(
    createWorld(),
    10,
    () => 0,
  );
  const positions = questions.map((question) =>
    question.choices?.findIndex(
      (choice) => choice.id === question.correctChoiceId,
    ),
  );

  for (let index = 2; index < positions.length; index += 1) {
    assert.notDeepEqual(
      [positions[index - 2], positions[index - 1], positions[index]],
      [positions[index], positions[index], positions[index]],
    );
  }
});
