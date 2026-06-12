import assert from "node:assert/strict";
import test from "node:test";
import { getActivityProgressKey } from "../src/engine/activityEngine.ts";
import { createInitialGameState } from "../src/state/progressState.ts";
import {
  applyProgressEvent,
  createProgressEventId,
} from "../src/state/progressEvents.ts";
import type {
  ActivityType,
  ProgressConcept,
  VocabularyWord,
} from "../src/types.ts";

const word = (
  id: string,
  es: string,
  en: string,
): VocabularyWord => ({ id, es, en });

const beginnerWord = word("a1-greeting-hola", "hola", "hello");
const b1Word = word("b1-work-reunion", "la reunión", "meeting");

const concept = (
  vocabularyWord: VocabularyWord,
  worldId: string,
): ProgressConcept => ({ word: vocabularyWord, worldId });

test("duplicate answer submission mutates XP, mastery, and mistakes only once", () => {
  const initial = createInitialGameState("2026-06-12");
  const event = {
    kind: "answer" as const,
    id: "session-1:answer:q1",
    activityType: "listening" as const,
    concepts: [concept(beginnerWord, "a1-greetings")],
    isCorrect: false,
    occurredAt: "2026-06-12T12:00:00.000Z",
  };

  const once = applyProgressEvent(initial, event);
  const twice = applyProgressEvent(once, event);

  assert.equal(once.xp, 2);
  assert.equal(twice.xp, 2);
  assert.equal(twice.mastery[beginnerWord.id].seenCount, 1);
  assert.equal(twice.mastery[beginnerWord.id].incorrectCount, 1);
  assert.equal(twice.mistakes[beginnerWord.id].incorrectCount, 1);
  assert.equal(twice.worlds["a1-greetings"].quizAnswers, 1);
  assert.strictEqual(twice, once);
});

test("duplicate seen events cannot duplicate XP or learned-word evidence", () => {
  const initial = createInitialGameState("2026-06-12");
  const event = {
    kind: "seen" as const,
    id: "explore-session:seen:hola",
    worldId: "a1-greetings",
    activityType: "explore" as const,
    words: [beginnerWord],
  };
  const once = applyProgressEvent(initial, event);
  const twice = applyProgressEvent(once, event);

  assert.equal(twice.xp, 2);
  assert.deepEqual(twice.worlds["a1-greetings"].learnedWordIds, [
    beginnerWord.id,
  ]);
  assert.equal(twice.mastery[beginnerWord.id].seenCount, 1);
});

test("duplicate Matching completion cannot duplicate completion or stars", () => {
  const initial = createInitialGameState("2026-06-12");
  const event = {
    kind: "activity-completion" as const,
    id: "matching-session:completion:matching",
    worldId: "a1-greetings",
    activityType: "matching" as const,
    words: [beginnerWord],
    score: 92,
    occurredAt: "2026-06-12T12:00:00.000Z",
  };

  const once = applyProgressEvent(initial, event);
  const twice = applyProgressEvent(once, event);
  const progress =
    twice.activities[getActivityProgressKey("a1-greetings", "matching")];

  assert.equal(twice.worlds["a1-greetings"].completedSessions, 1);
  assert.equal(progress.completedSessions, 1);
  assert.equal(progress.bestStars, 3);
  assert.strictEqual(twice, once);
});

test("Story Shuffle completion is idempotent and does not alter vocabulary mastery", () => {
  const initial = createInitialGameState("2026-06-12");
  const event = {
    kind: "activity-completion" as const,
    id: "story-session:completion:story-shuffle",
    worldId: "b1-work",
    activityType: "story-shuffle" as const,
    words: [b1Word],
    score: 80,
    rewardXp: 10,
    occurredAt: "2026-06-12T12:00:00.000Z",
  };

  const once = applyProgressEvent(initial, event);
  const twice = applyProgressEvent(once, event);

  assert.equal(twice.xp, 10);
  assert.equal(twice.worlds["b1-work"].completedSessions, 1);
  assert.equal(Object.keys(twice.mastery).length, 0);
  assert.equal(Object.keys(twice.mistakes).length, 0);
  assert.strictEqual(twice, once);
});

test("Dialogue and Unit Challenge each accept only one completion per session", () => {
  const activityTypes: ActivityType[] = ["dialogue", "unit-challenge"];

  activityTypes.forEach((activityType) => {
    const initial = createInitialGameState("2026-06-12");
    const event = {
      kind: "activity-completion" as const,
      id: `${activityType}-session:completion:${activityType}`,
      worldId: "a1-greetings",
      activityType,
      words: [beginnerWord],
      score: 75,
      occurredAt: "2026-06-12T12:00:00.000Z",
    };
    const once = applyProgressEvent(initial, event);
    const twice = applyProgressEvent(once, event);
    assert.equal(twice.worlds["a1-greetings"].completedSessions, 1);
    assert.equal(
      twice.activities[
        getActivityProgressKey("a1-greetings", activityType)
      ].completedSessions,
      1,
    );
  });
});

test("retry answers are separate evidence but do not create extra completions", () => {
  const initial = createInitialGameState("2026-06-12");
  const wrong = applyProgressEvent(initial, {
    kind: "answer",
    id: "listen-session:answer:q1",
    activityType: "listening",
    concepts: [concept(beginnerWord, "a1-greetings")],
    isCorrect: false,
  });
  const corrected = applyProgressEvent(wrong, {
    kind: "answer",
    id: "listen-session:answer:q1:retry:1",
    activityType: "listening",
    concepts: [concept(beginnerWord, "a1-greetings")],
    isCorrect: true,
  });
  const completion = {
    kind: "activity-completion" as const,
    id: "listen-session:completion:listening",
    worldId: "a1-greetings",
    activityType: "listening" as const,
    words: [beginnerWord],
    score: 50,
  };
  const completed = applyProgressEvent(corrected, completion);
  const duplicateCompletion = applyProgressEvent(completed, completion);

  assert.equal(duplicateCompletion.mastery[beginnerWord.id].seenCount, 2);
  assert.equal(duplicateCompletion.worlds["a1-greetings"].quizAnswers, 2);
  assert.equal(
    duplicateCompletion.worlds["a1-greetings"].completedSessions,
    1,
  );
});

test("cross-world concepts update their source worlds and mistake attribution", () => {
  const initial = createInitialGameState("2026-06-12");
  const result = applyProgressEvent(initial, {
    kind: "answer",
    id: "challenge-session:answer:story",
    activityType: "unit-challenge",
    concepts: [
      concept(beginnerWord, "a1-greetings"),
      concept(b1Word, "b1-work"),
    ],
    isCorrect: false,
  });

  assert.deepEqual(result.worlds["a1-greetings"].learnedWordIds, [
    beginnerWord.id,
  ]);
  assert.deepEqual(result.worlds["b1-work"].learnedWordIds, [b1Word.id]);
  assert.equal(result.mistakes[beginnerWord.id].worldId, "a1-greetings");
  assert.equal(result.mistakes[b1Word.id].worldId, "b1-work");
});

test("course states remain isolated even when event IDs are identical", () => {
  const event = {
    kind: "answer" as const,
    id: "shared-session:answer:q1",
    activityType: "matching" as const,
    concepts: [concept(beginnerWord, "a1-greetings")],
    isCorrect: true,
  };
  const beginner = applyProgressEvent(
    createInitialGameState("2026-06-12"),
    event,
  );
  const intermediate = createInitialGameState("2026-06-12");

  assert.equal(beginner.xp, 10);
  assert.equal(intermediate.xp, 0);
  assert.deepEqual(intermediate.processedEvents, {});
});

test("a replay is a new session and follows the regular reward policy", () => {
  const initial = createInitialGameState("2026-06-12");
  const first = applyProgressEvent(initial, {
    kind: "answer",
    id: createProgressEventId("session-one", "answer", "q1"),
    activityType: "listening",
    concepts: [concept(beginnerWord, "a1-greetings")],
    isCorrect: true,
  });
  const replay = applyProgressEvent(first, {
    kind: "answer",
    id: createProgressEventId("session-two", "answer", "q1"),
    activityType: "listening",
    concepts: [concept(beginnerWord, "a1-greetings")],
    isCorrect: true,
  });

  assert.equal(replay.xp, 20);
  assert.equal(replay.mastery[beginnerWord.id].correctCount, 2);
});
