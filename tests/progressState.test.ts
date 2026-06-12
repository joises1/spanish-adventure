import assert from "node:assert/strict";
import test from "node:test";
import {
  getCourseStorageKey,
  loadCourseGameState,
  normalizeGameState,
  type StorageLike,
} from "../src/state/progressState.ts";

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test("version 1 and 2 progress migrates safely to version 3", () => {
  const migrated = normalizeGameState(
    {
      version: 1,
      xp: 125,
      streak: 4,
      lastActiveDate: "2026-06-12",
      words: { hola: { correct: 2, incorrect: 1 } },
      worlds: {
        greetings: {
          learnedWordIds: ["hola"],
          collectedWordIds: ["hola"],
          completedSessions: 1,
          quizAnswers: 3,
          quizCorrect: 2,
        },
      },
    },
    "2026-06-12",
  );

  assert.equal(migrated.version, 3);
  assert.equal(migrated.xp, 125);
  assert.deepEqual(migrated.activities, {});
  assert.deepEqual(migrated.mastery, {});
  assert.deepEqual(migrated.mistakes, {});
  assert.deepEqual(migrated.worlds.greetings.collectedWordIds, ["hola"]);
});

test("A1-A2 and B1 storage remain isolated", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    getCourseStorageKey("a1-a2"),
    JSON.stringify({
      version: 3,
      xp: 40,
      streak: 1,
      words: {},
      worlds: {},
      activities: {},
      mastery: {},
      mistakes: {},
    }),
  );
  storage.setItem(
    getCourseStorageKey("b1"),
    JSON.stringify({
      version: 3,
      xp: 900,
      streak: 7,
      words: {},
      worlds: {},
      activities: {},
      mastery: {},
      mistakes: {},
    }),
  );

  const beginner = loadCourseGameState(storage, "a1-a2", "2026-06-12");
  const intermediate = loadCourseGameState(storage, "b1", "2026-06-12");

  assert.equal(beginner.xp, 40);
  assert.equal(intermediate.xp, 900);
  assert.notEqual(beginner.xp, intermediate.xp);
});
