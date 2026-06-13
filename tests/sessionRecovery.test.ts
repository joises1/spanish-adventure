import assert from "node:assert/strict";
import test from "node:test";
import { beginnerWorlds } from "../src/data/beginnerWorlds.ts";
import { worlds } from "../src/data/worlds.ts";
import {
  canResumeSession,
  getSessionStorageKey,
  getSnapshotQuestions,
  parseSessionSnapshot,
  shouldWarnBeforeAbandon,
  validateSessionSnapshot,
  type SafeSessionSnapshot,
} from "../src/engine/sessionRecovery.ts";
import { createInitialGameState } from "../src/state/progressState.ts";
import {
  applyProgressEvent,
  createProgressEventId,
} from "../src/state/progressEvents.ts";
import type { Course } from "../src/types.ts";

const courses: Course[] = [
  {
    id: "a1-a2",
    level: "A1-A2",
    name: "Beginner",
    shortName: "A1-A2 Beginner",
    description: "Beginner course",
    icon: "A",
    color: "#8dcc87",
    accent: "#377449",
    worlds: beginnerWorlds,
  },
  {
    id: "b1",
    level: "B1",
    name: "Intermediate",
    shortName: "B1 Intermediate",
    description: "Intermediate course",
    icon: "B",
    color: "#9a7bd0",
    accent: "#55407d",
    worlds,
  },
];

const beginner = courses.find((course) => course.id === "a1-a2")!;
const intermediate = courses.find((course) => course.id === "b1")!;
const beginnerWorld = beginner.worlds[0];
const intermediateWorld = intermediate.worlds[0];

const snapshot = (
  overrides: Partial<SafeSessionSnapshot> = {},
): SafeSessionSnapshot => ({
  version: 1,
  courseId: "a1-a2",
  worldId: beginnerWorld.id,
  unit: beginnerWorld.unit,
  activityType: "explore",
  sessionId: "stable-restored-session",
  seed: "stable-seed",
  status: "active",
  meaningful: true,
  index: 3,
  total: 8,
  correctCount: 2,
  answeredCount: 3,
  startedAt: "2026-06-13T10:00:00.000Z",
  updatedAt: "2026-06-13T10:05:00.000Z",
  payload: {
    sessionStartXp: 20,
    initialCollectedIds: [],
  },
  ...overrides,
});

const now = new Date("2026-06-13T11:00:00.000Z");

test("safe unfinished session checkpoints survive validation and parsing", () => {
  const original = snapshot();
  const validated = validateSessionSnapshot(original, courses, now);
  const parsed = parseSessionSnapshot(
    JSON.stringify(original),
    courses,
    now,
  );

  assert.deepEqual(validated, original);
  assert.deepEqual(parsed, original);
  assert.equal(parsed?.index, 3);
  assert.equal(parsed?.correctCount, 2);
  assert.equal(canResumeSession(parsed), true);
});

test("unfinished activity warning appears only for meaningful active work", () => {
  assert.equal(shouldWarnBeforeAbandon(snapshot()), true);
  assert.equal(
    shouldWarnBeforeAbandon(snapshot({ meaningful: false })),
    false,
  );
  assert.equal(
    shouldWarnBeforeAbandon(snapshot({ status: "completed" })),
    false,
  );
  assert.equal(shouldWarnBeforeAbandon(null), false);
});

test("outdated, future, malformed, and cross-course snapshots fail safely", () => {
  assert.equal(
    validateSessionSnapshot(
      snapshot({ updatedAt: "2026-05-01T10:00:00.000Z" }),
      courses,
      now,
    ),
    null,
  );
  assert.equal(
    validateSessionSnapshot(
      snapshot({ updatedAt: "2026-06-14T10:00:00.000Z" }),
      courses,
      now,
    ),
    null,
  );
  assert.equal(parseSessionSnapshot("{bad json", courses, now), null);
  assert.equal(
    validateSessionSnapshot(
      snapshot({
        courseId: "b1",
        worldId: beginnerWorld.id,
        unit: beginnerWorld.unit,
      }),
      courses,
      now,
    ),
    null,
  );
});

test("unsafe saved question payload is ignored instead of reaching the UI", () => {
  const damaged = snapshot({
    payload: {
      questions: [
        {
          id: "q1",
          semanticKey: "q1",
          activityType: "sentence-builder",
          kind: "sentence-builder",
          conceptIds: ["word"],
          sourceWordIds: ["word"],
          prompt: "Build it",
          answer: "Hola",
          tokens: "not-an-array",
        },
      ],
    },
  });

  assert.deepEqual(getSnapshotQuestions(damaged), []);
});

test("restoring the same session cannot award answer or completion twice", () => {
  const restored = snapshot();
  const word = beginnerWorld.words[0];
  const answerId = createProgressEventId(
    restored.sessionId,
    "answer",
    "question-1",
  );
  const completionId = createProgressEventId(
    restored.sessionId,
    "completion",
    "explore",
  );
  const initial = createInitialGameState("2026-06-13");
  const answered = applyProgressEvent(initial, {
    kind: "answer",
    id: answerId,
    courseId: "a1-a2",
    activityType: "explore",
    concepts: [
      {
        word,
        worldId: beginnerWorld.id,
        unit: beginnerWorld.unit,
      },
    ],
    isCorrect: true,
  });
  const answeredAgain = applyProgressEvent(answered, {
    kind: "answer",
    id: answerId,
    courseId: "a1-a2",
    activityType: "explore",
    concepts: [
      {
        word,
        worldId: beginnerWorld.id,
        unit: beginnerWorld.unit,
      },
    ],
    isCorrect: true,
  });
  const completed = applyProgressEvent(answeredAgain, {
    kind: "activity-completion",
    id: completionId,
    worldId: beginnerWorld.id,
    activityType: "explore",
    words: [word],
    score: 100,
  });
  const completedAgain = applyProgressEvent(completed, {
    kind: "activity-completion",
    id: completionId,
    worldId: beginnerWorld.id,
    activityType: "explore",
    words: [word],
    score: 100,
  });

  assert.strictEqual(answeredAgain, answered);
  assert.strictEqual(completedAgain, completed);
  assert.equal(completed.worlds[beginnerWorld.id].completedSessions, 1);
});

test("A1-A2 and B1 session storage and validation remain isolated", () => {
  assert.notEqual(
    getSessionStorageKey("a1-a2"),
    getSessionStorageKey("b1"),
  );
  const b1Snapshot = snapshot({
    courseId: "b1",
    worldId: intermediateWorld.id,
    unit: intermediateWorld.unit,
    sessionId: "b1-session",
  });

  assert.equal(
    validateSessionSnapshot(snapshot(), courses, now)?.courseId,
    "a1-a2",
  );
  assert.equal(
    validateSessionSnapshot(b1Snapshot, courses, now)?.courseId,
    "b1",
  );
});
