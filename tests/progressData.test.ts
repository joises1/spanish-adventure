import assert from "node:assert/strict";
import test from "node:test";
import {
  createProgressExport,
  loadProgressBackup,
  persistCourseStates,
  saveProgressBackup,
  serializeProgressExport,
  validateProgressImport,
  type CourseStates,
} from "../src/state/progressData.ts";
import {
  createInitialGameState,
  loadCourseGameState,
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

const createStates = (): CourseStates => ({
  "a1-a2": {
    ...createInitialGameState("2026-06-12"),
    xp: 120,
    worlds: {
      greetings: {
        learnedWordIds: ["hola"],
        collectedWordIds: ["hola"],
        completedSessions: 1,
        quizAnswers: 2,
        quizCorrect: 2,
      },
    },
  },
  b1: {
    ...createInitialGameState("2026-06-12"),
    xp: 840,
    streak: 6,
  },
});

test("progress export and import complete a validated round trip", () => {
  const states = createStates();
  const exported = createProgressExport(
    states,
    "a1-a2",
    "2026-06-12T12:00:00.000Z",
  );
  const validation = validateProgressImport(
    serializeProgressExport(exported),
    "2026-06-12",
  );

  assert.equal(validation.ok, true);
  if (!validation.ok) return;
  assert.equal(validation.data.courses["a1-a2"].xp, 120);
  assert.equal(validation.data.courses.b1.xp, 840);
  assert.equal(validation.summary["a1-a2"].learnedWords, 1);
  assert.equal(validation.data.selectedCourseId, "a1-a2");
});

test("invalid and future imports are rejected before applying", () => {
  assert.equal(validateProgressImport("{bad json").ok, false);
  assert.equal(
    validateProgressImport({
      format: "another-app",
      exportVersion: 1,
      courses: {},
    }).ok,
    false,
  );
  assert.equal(
    validateProgressImport({
      format: "spanish-adventure-progress",
      exportVersion: 99,
      courses: {},
    }).ok,
    false,
  );
  assert.equal(
    validateProgressImport({
      format: "spanish-adventure-progress",
      exportVersion: 1,
      courses: {},
    }).ok,
    false,
  );
});

test("backup restores both course states after replacement", () => {
  const storage = new SafeStorage(new MemoryStorage());
  const original = createStates();
  const replacement: CourseStates = {
    "a1-a2": createInitialGameState("2026-06-12"),
    b1: createInitialGameState("2026-06-12"),
  };

  assert.equal(
    saveProgressBackup(
      storage,
      original,
      "b1",
      "2026-06-12T12:00:00.000Z",
    ).ok,
    true,
  );
  assert.equal(persistCourseStates(storage, replacement).ok, true);

  const backup = loadProgressBackup(storage, "2026-06-12");
  assert.equal(backup?.ok, true);
  if (!backup?.ok) return;
  assert.equal(persistCourseStates(storage, backup.data.courses).ok, true);

  assert.equal(
    loadCourseGameState(storage, "a1-a2", "2026-06-12").xp,
    120,
  );
  assert.equal(loadCourseGameState(storage, "b1", "2026-06-12").xp, 840);
});

test("imported A1-A2 and B1 progress remain isolated", () => {
  const validation = validateProgressImport(
    serializeProgressExport(
      createProgressExport(createStates(), "b1"),
    ),
    "2026-06-12",
  );

  assert.equal(validation.ok, true);
  if (!validation.ok) return;
  validation.data.courses["a1-a2"].xp += 5;

  assert.equal(validation.data.courses["a1-a2"].xp, 125);
  assert.equal(validation.data.courses.b1.xp, 840);
});
