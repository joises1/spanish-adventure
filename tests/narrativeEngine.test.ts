import assert from "node:assert/strict";
import test from "node:test";
import {
  generateDialogueQuestions,
  generateStory,
  generateStoryShuffleQuestion,
} from "../src/engine/narrativeEngine.ts";
import { getCompletedPreviousWords } from "../src/engine/courseScope.ts";
import { createInitialGameState } from "../src/state/progressState.ts";
import type { VocabularyWord, World } from "../src/types.ts";

const words = (prefix: string, count: number): VocabularyWord[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    es: `${prefix} español ${index}`,
    en: `${prefix} english ${index}`,
    example: {
      es: `Ejemplo ${prefix} ${index}.`,
      en: `Example ${prefix} ${index}.`,
    },
  }));

const world: World = {
  id: "current-unit",
  unit: 3,
  name: "Current Unit",
  spanishName: "La unidad actual",
  description: "Practice the current topic.",
  color: "#fff",
  accent: "#000",
  icon: "C",
  words: words("current", 8),
};

test("dialogues provide all five curated interaction types", () => {
  const questions = generateDialogueQuestions(
    world,
    words("previous", 4),
    "fixed-dialogue",
  );

  assert.deepEqual(
    new Set(questions.map((question) => question.kind)),
    new Set([
      "dialogue-choice",
      "dialogue-order",
      "dialogue-fill",
      "dialogue-listening",
      "dialogue-role",
    ]),
  );
  assert.equal(new Set(questions.map((question) => question.id)).size, 5);
});

test("each dialogue uses four to eight turns and current-unit concepts", () => {
  const questions = generateDialogueQuestions(
    world,
    words("previous", 4),
    "turn-rules",
  );
  const currentIds = new Set(world.words.map((word) => word.id));

  questions.forEach((question) => {
    assert.ok((question.dialogueTurns?.length ?? 0) >= 4);
    assert.ok((question.dialogueTurns?.length ?? 0) <= 8);
    assert.ok(
      question.sourceWordIds.every((wordId) => currentIds.has(wordId)),
    );
  });
});

test("dialogue and story generation never leak future vocabulary", () => {
  const previous = words("previous", 4);
  const future = words("future", 4);
  const allowedIds = new Set([
    ...world.words.map((word) => word.id),
    ...previous.map((word) => word.id),
  ]);

  const dialogue = generateDialogueQuestions(
    world,
    previous,
    "no-future-dialogue",
  );
  const story = generateStory(
    world,
    previous,
    "no-future-story",
  );

  assert.ok(
    dialogue
      .flatMap((question) => question.sourceWordIds)
      .every((wordId) => allowedIds.has(wordId)),
  );
  assert.ok(
    story
      .flatMap((sentence) => sentence.sourceWordIds)
      .every((wordId) => allowedIds.has(wordId)),
  );
  assert.ok(
    !dialogue.some((question) =>
      question.sourceWordIds.some((wordId) =>
        future.some((word) => word.id === wordId),
      ),
    ),
  );
});

test("course scope includes completed earlier units but excludes future units", () => {
  const previousWorld: World = {
    ...world,
    id: "previous-unit",
    unit: 2,
    words: words("previous", 2),
  };
  const futureWorld: World = {
    ...world,
    id: "future-unit",
    unit: 4,
    words: words("future", 2),
  };
  const state = createInitialGameState("2026-06-12");
  state.worlds[previousWorld.id] = {
    learnedWordIds: previousWorld.words.map((word) => word.id),
    collectedWordIds: previousWorld.words.map((word) => word.id),
    completedSessions: 1,
    quizAnswers: 2,
    quizCorrect: 2,
  };
  state.worlds[futureWorld.id] = {
    learnedWordIds: futureWorld.words.map((word) => word.id),
    collectedWordIds: futureWorld.words.map((word) => word.id),
    completedSessions: 1,
    quizAnswers: 2,
    quizCorrect: 2,
  };

  const scoped = getCompletedPreviousWords(
    world,
    [previousWorld, world, futureWorld],
    state,
  );

  assert.deepEqual(
    scoped.map((word) => word.id),
    previousWorld.words.map((word) => word.id),
  );
});

test("story templates remain deterministic and preserve one ordered arc", () => {
  const first = generateStory(world, words("previous", 3), "stable-story");
  const second = generateStory(world, words("previous", 3), "stable-story");

  assert.deepEqual(first, second);
  assert.ok(first.length >= 3 && first.length <= 6);
  assert.deepEqual(
    first.map((sentence) => sentence.position),
    [0, 1, 2, 3],
  );
  assert.match(first[1].es, /^Primero /);
  assert.match(first[2].es, /^Después /);
  assert.match(first[3].es, /^Al final /);
});

test("story shuffle keeps the canonical order separate from shuffled display", () => {
  const question = generateStoryShuffleQuestion(
    world,
    words("previous", 3),
    "shuffle-integrity",
  );

  assert.ok(question);
  assert.equal(question?.kind, "story-order");
  assert.equal(question?.orderedItemIds?.length, question?.storySentences?.length);
  assert.equal(
    new Set(question?.storySentences?.map((sentence) => sentence.id)).size,
    question?.storySentences?.length,
  );
});
