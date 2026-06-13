import assert from "node:assert/strict";
import test from "node:test";
import {
  getCourseStorageKey,
  loadCourseGameState,
  loadCourseGameStateResult,
  normalizeGameState,
  parseGameStateJson,
  validateGameState,
} from "../src/state/progressState.ts";
import {
  SafeStorage,
  type StorageLike,
} from "../src/state/storage.ts";

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const createStorage = () => {
  const memory = new MemoryStorage();
  return { memory, storage: new SafeStorage(memory) };
};

test("version 1 through 4 progress migrates safely to version 4", () => {
  for (const version of [1, 2, 3, 4]) {
    const migrated = validateGameState(
      {
        version,
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
        activities:
          version >= 2
            ? {
                "greetings:explore": {
                  completedSessions: 1,
                  bestScore: 90,
                  bestStars: 3,
                },
              }
            : undefined,
        mastery:
          version >= 3
            ? {
                hola: {
                  seenCount: 3,
                  correctCount: 2,
                  incorrectCount: 1,
                  masteryEstimate: 70,
                },
              }
            : undefined,
        mistakes: {},
        processedEvents:
          version === 4
            ? {
                "event-1": {
                  kind: "answer",
                  processedAt: "2026-06-12T10:00:00.000Z",
                },
              }
            : undefined,
      },
      "2026-06-12",
    );

    assert.equal(migrated.ok, true);
    assert.equal(migrated.state.version, 4);
    assert.equal(migrated.state.xp, 125);
    assert.deepEqual(
      migrated.state.worlds.greetings.collectedWordIds,
      ["hola"],
    );
    if (version === 4) {
      assert.equal(migrated.state.processedEvents["event-1"].kind, "answer");
    }
  }
});

test("invalid JSON falls back safely instead of throwing", () => {
  const validation = parseGameStateJson("{not valid", "2026-06-12");

  assert.equal(validation.ok, false);
  assert.equal(validation.error, "invalid-json");
  assert.equal(validation.state.version, 4);
  assert.equal(validation.state.xp, 0);
});

test("valid fields survive partially damaged progress", () => {
  const validation = validateGameState(
    {
      version: 3,
      xp: 220,
      streak: "wrong",
      words: {
        hola: { correct: 4, incorrect: "wrong", lastSeen: "yesterday" },
        broken: "not-an-answer-record",
      },
      worlds: {
        greetings: {
          learnedWordIds: ["hola", "hola", 7],
          collectedWordIds: ["hola"],
          completedSessions: 2,
          quizAnswers: 4,
          quizCorrect: 99,
        },
      },
      activities: [],
    },
    "2026-06-12",
  );

  assert.equal(validation.ok, true);
  assert.equal(validation.recovered, true);
  assert.equal(validation.state.xp, 220);
  assert.equal(validation.state.streak, 1);
  assert.equal(validation.state.words.hola.correct, 4);
  assert.equal(validation.state.words.hola.incorrect, 0);
  assert.equal(validation.state.words.broken, undefined);
  assert.deepEqual(
    validation.state.worlds.greetings.learnedWordIds,
    ["hola"],
  );
  assert.equal(validation.state.worlds.greetings.quizCorrect, 4);
});

test("unsupported future progress uses defaults and reports the version", () => {
  const validation = validateGameState(
    { version: 99, xp: 9_999 },
    "2026-06-12",
  );

  assert.equal(validation.ok, false);
  assert.equal(validation.error, "future-version");
  assert.equal(validation.sourceVersion, 99);
  assert.equal(validation.state.xp, 0);
});

test("A1-A2 and B1 storage remain isolated", () => {
  const { memory, storage } = createStorage();
  memory.setItem(
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
  memory.setItem(
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
  const intermediate = loadCourseGameState(
    storage,
    "b1",
    "2026-06-12",
  );

  assert.equal(beginner.xp, 40);
  assert.equal(intermediate.xp, 900);
  assert.notEqual(beginner.xp, intermediate.xp);
});

test("damaged stored JSON returns a safe course load result", () => {
  const { memory, storage } = createStorage();
  memory.setItem(getCourseStorageKey("b1"), "{bad json");

  const result = loadCourseGameStateResult(
    storage,
    "b1",
    "2026-06-12",
  );

  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid-json");
  assert.equal(result.source, "current");
  assert.equal(result.state.xp, 0);
});

test("streak migration advances at most once for the same calendar day", () => {
  const first = normalizeGameState(
    {
      version: 3,
      streak: 4,
      lastActiveDate: "2026-06-11",
    },
    "2026-06-12",
  );
  const second = normalizeGameState(first, "2026-06-12");

  assert.equal(first.streak, 5);
  assert.equal(second.streak, 5);
});

test("legacy mastery and mistakes gain Phase 1B fields without data loss", () => {
  const validation = validateGameState(
    {
      version: 4,
      mastery: {
        hola: {
          seenCount: 3,
          correctCount: 2,
          incorrectCount: 1,
          masteryEstimate: 67,
          lastPracticedAt: "2026-06-12T10:00:00.000Z",
        },
      },
      mistakes: {
        hola: {
          conceptId: "hola",
          worldId: "a1-greetings",
          activityType: "listening",
          incorrectCount: 2,
          lastIncorrectAt: "2026-06-12T10:00:00.000Z",
          correctedAnswer: "hello",
        },
      },
    },
    "2026-06-12",
    false,
  );

  assert.equal(validation.ok, true);
  assert.equal(validation.state.mastery.hola.skills.vocabulary?.attempts, 3);
  assert.equal(validation.state.mistakes.hola.correctAnswer, "hello");
  assert.equal(validation.state.mistakes.hola.status, "practicing");
  assert.equal(validation.state.mistakes.hola.courseId, "a1-a2");
});
