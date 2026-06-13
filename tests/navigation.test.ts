import assert from "node:assert/strict";
import test from "node:test";
import { beginnerWorlds } from "../src/data/beginnerWorlds.ts";
import { worlds } from "../src/data/worlds.ts";
import {
  createHistoryState,
  getResumeRoute,
  parseRouteHash,
  readHistoryState,
  resolveInitialRoute,
  routeCourseId,
  routeToHash,
  validateRoute,
  type AppRoute,
} from "../src/engine/navigation.ts";
import type { SafeSessionSnapshot } from "../src/engine/sessionRecovery.ts";
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

const activeSnapshot = (
  overrides: Partial<SafeSessionSnapshot> = {},
): SafeSessionSnapshot => ({
  version: 1,
  courseId: "a1-a2",
  worldId: beginnerWorld.id,
  unit: beginnerWorld.unit,
  activityType: "explore",
  sessionId: "a1-session",
  seed: "a1-seed",
  status: "active",
  meaningful: true,
  index: 2,
  total: 8,
  correctCount: 0,
  answeredCount: 2,
  startedAt: "2026-06-13T10:00:00.000Z",
  updatedAt: "2026-06-13T10:05:00.000Z",
  payload: {},
  ...overrides,
});

test("refresh recovery resolves a valid course, unit, and activity hash", () => {
  const expected: AppRoute = {
    name: "activity",
    courseId: "a1-a2",
    worldId: beginnerWorld.id,
    activityType: "explore",
  };
  const route = resolveInitialRoute(
    routeToHash(expected),
    null,
    "b1",
    courses,
  );

  assert.deepEqual(route, expected);
});

test("invalid navigation state falls back to the selected course map", () => {
  const route = resolveInitialRoute(
    "#/b1/unit/%E0%A4%A/activity/explore",
    {
      name: "activity",
      courseId: "b1",
      worldId: "missing-world",
      activityType: "explore",
    },
    "a1-a2",
    courses,
  );

  assert.deepEqual(route, { name: "map", courseId: "a1-a2" });
  assert.equal(
    validateRoute(
      {
        name: "world",
        courseId: "b1",
        worldId: "missing-world",
      },
      courses,
    ),
    null,
  );
});

test("browser history state preserves route and index for back and forward", () => {
  const map = createHistoryState(
    { name: "map", courseId: "b1" },
    3,
  );
  const unit = createHistoryState(
    {
      name: "world",
      courseId: "b1",
      worldId: intermediateWorld.id,
    },
    4,
  );
  const activity = createHistoryState(
    {
      name: "activity",
      courseId: "b1",
      worldId: intermediateWorld.id,
      activityType: "explore",
    },
    5,
  );

  assert.equal(readHistoryState(map, courses)?.index, 3);
  assert.equal(readHistoryState(unit, courses)?.index, 4);
  assert.equal(readHistoryState(activity, courses)?.index, 5);
  assert.equal(readHistoryState(unit, courses)?.route.name, "world");
  assert.equal(readHistoryState(activity, courses)?.route.name, "activity");
});

test("safe resume creates only a validated route", () => {
  assert.deepEqual(getResumeRoute(activeSnapshot(), courses), {
    name: "activity",
    courseId: "a1-a2",
    worldId: beginnerWorld.id,
    activityType: "explore",
  });
  assert.equal(
    getResumeRoute(activeSnapshot({ status: "completed" }), courses),
    null,
  );
  assert.equal(
    getResumeRoute(
      activeSnapshot({ worldId: "missing-world", unit: 999 }),
      courses,
    ),
    null,
  );
});

test("review history preserves selected concepts while hashes remain shareable", () => {
  const state = createHistoryState(
    {
      name: "review",
      courseId: "a1-a2",
      mode: "mistakes",
      selectedConceptIds: ["hola", "adios"],
    },
    7,
  );
  const restored = readHistoryState(state, courses);

  assert.deepEqual(
    restored?.route.name === "review"
      ? restored.route.selectedConceptIds
      : undefined,
    ["hola", "adios"],
  );
  assert.deepEqual(
    parseRouteHash("#/a1-a2/review/mistakes", courses),
    { name: "review", courseId: "a1-a2", mode: "mistakes" },
  );
});

test("course switching keeps route attribution explicit", () => {
  assert.equal(
    routeCourseId({ name: "map", courseId: "a1-a2" }),
    "a1-a2",
  );
  assert.equal(routeCourseId({ name: "map", courseId: "b1" }), "b1");
  assert.equal(routeCourseId({ name: "course" }), null);
});
