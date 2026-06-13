import type { ActivityType, Course, CourseId } from "../types";
import { getActivityAvailability } from "./activityAvailability.ts";
import type { SafeSessionSnapshot } from "./sessionRecovery.ts";

export type AppRoute =
  | { name: "course" }
  | { name: "map"; courseId: CourseId }
  | { name: "learned"; courseId: CourseId }
  | { name: "mistakes"; courseId: CourseId }
  | {
      name: "review";
      courseId: CourseId;
      mode: "daily" | "mistakes";
      selectedConceptIds?: string[];
    }
  | { name: "world"; courseId: CourseId; worldId: string }
  | {
      name: "activity";
      courseId: CourseId;
      worldId: string;
      activityType: ActivityType;
    };

export type NavigationHistoryState = {
  app: "spanish-adventure";
  version: 1;
  index: number;
  route: AppRoute;
};

const ACTIVITY_TYPES = new Set<ActivityType>([
  "explore",
  "matching",
  "listening",
  "sentence-builder",
  "dialogue",
  "story-shuffle",
  "unit-challenge",
]);

const isCourseId = (value: string | undefined): value is CourseId =>
  value === "a1-a2" || value === "b1";

const findCourse = (courses: readonly Course[], courseId: CourseId) =>
  courses.find((course) => course.id === courseId);

export const routeToHash = (route: AppRoute) => {
  switch (route.name) {
    case "course":
      return "#/courses";
    case "map":
      return `#/${route.courseId}/map`;
    case "learned":
      return `#/${route.courseId}/learned`;
    case "mistakes":
      return `#/${route.courseId}/mistakes`;
    case "review":
      return `#/${route.courseId}/review/${route.mode}`;
    case "world":
      return `#/${route.courseId}/unit/${encodeURIComponent(route.worldId)}`;
    case "activity":
      return `#/${route.courseId}/unit/${encodeURIComponent(
        route.worldId,
      )}/activity/${route.activityType}`;
  }
};

export const parseRouteHash = (
  hash: string,
  courses: readonly Course[],
): AppRoute | null => {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts.length === 1 && parts[0] === "courses") {
    return { name: "course" };
  }
  if (!isCourseId(parts[0])) return null;
  const courseId = parts[0];
  const course = findCourse(courses, courseId);
  if (!course) return null;
  if (parts.length === 2 && parts[1] === "map") {
    return { name: "map", courseId };
  }
  if (parts.length === 2 && parts[1] === "learned") {
    return { name: "learned", courseId };
  }
  if (parts.length === 2 && parts[1] === "mistakes") {
    return { name: "mistakes", courseId };
  }
  if (
    parts.length === 3 &&
    parts[1] === "review" &&
    (parts[2] === "daily" || parts[2] === "mistakes")
  ) {
    return { name: "review", courseId, mode: parts[2] };
  }
  if (parts[1] !== "unit" || !parts[2]) return null;
  let worldId: string;
  try {
    worldId = decodeURIComponent(parts[2]);
  } catch {
    return null;
  }
  const world = course.worlds.find((candidate) => candidate.id === worldId);
  if (!world) return null;
  if (parts.length === 3) {
    return { name: "world", courseId, worldId };
  }
  const activityType = parts[4] as ActivityType | undefined;
  if (
    parts.length !== 5 ||
    parts[3] !== "activity" ||
    !activityType ||
    !ACTIVITY_TYPES.has(activityType)
  ) {
    return null;
  }
  if (!getActivityAvailability(world, activityType).available) return null;
  return { name: "activity", courseId, worldId, activityType };
};

export const validateRoute = (
  value: unknown,
  courses: readonly Course[],
): AppRoute | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.name === "course") return { name: "course" };
  if (
    typeof candidate.name !== "string" ||
    typeof candidate.courseId !== "string" ||
    !isCourseId(candidate.courseId)
  ) {
    return null;
  }
  const courseId = candidate.courseId;
  switch (candidate.name) {
    case "map":
    case "learned":
    case "mistakes":
      return parseRouteHash(`#/${courseId}/${candidate.name}`, courses);
    case "review":
      if (
        candidate.mode !== "daily" &&
        candidate.mode !== "mistakes"
      ) {
        return null;
      }
      return {
        name: "review",
        courseId,
        mode: candidate.mode,
        selectedConceptIds:
          Array.isArray(candidate.selectedConceptIds) &&
          candidate.selectedConceptIds.every(
            (item): item is string => typeof item === "string",
          )
            ? candidate.selectedConceptIds
            : undefined,
      };
    case "world":
      if (typeof candidate.worldId !== "string") return null;
      return parseRouteHash(
        `#/${courseId}/unit/${encodeURIComponent(candidate.worldId)}`,
        courses,
      );
    case "activity":
      if (
        typeof candidate.worldId !== "string" ||
        typeof candidate.activityType !== "string"
      ) {
        return null;
      }
      return parseRouteHash(
        `#/${courseId}/unit/${encodeURIComponent(
          candidate.worldId,
        )}/activity/${candidate.activityType}`,
        courses,
      );
    default:
      return null;
  }
};

export const resolveInitialRoute = (
  hash: string,
  savedRoute: unknown,
  selectedCourseId: CourseId | null,
  courses: readonly Course[],
) =>
  parseRouteHash(hash, courses) ??
  validateRoute(savedRoute, courses) ??
  (selectedCourseId
    ? ({ name: "map", courseId: selectedCourseId } as const)
    : ({ name: "course" } as const));

export const routeCourseId = (route: AppRoute) =>
  route.name === "course" ? null : route.courseId;

export const isSessionRoute = (route: AppRoute) =>
  route.name === "activity" || route.name === "review";

export const getResumeRoute = (
  snapshot: SafeSessionSnapshot | null,
  courses: readonly Course[],
): AppRoute | null => {
  if (
    !snapshot ||
    snapshot.status !== "active" ||
    !snapshot.meaningful
  ) {
    return null;
  }
  if (snapshot.activityType === "daily-review") {
    return validateRoute(
      { name: "review", courseId: snapshot.courseId, mode: "daily" },
      courses,
    );
  }
  if (snapshot.activityType === "mistake-review") {
    return validateRoute(
      { name: "review", courseId: snapshot.courseId, mode: "mistakes" },
      courses,
    );
  }
  if (!snapshot.worldId) return null;
  return validateRoute(
    {
      name: "activity",
      courseId: snapshot.courseId,
      worldId: snapshot.worldId,
      activityType: snapshot.activityType,
    },
    courses,
  );
};

export const createHistoryState = (
  route: AppRoute,
  index: number,
): NavigationHistoryState => ({
  app: "spanish-adventure",
  version: 1,
  index,
  route,
});

export const readHistoryState = (
  value: unknown,
  courses: readonly Course[],
): NavigationHistoryState | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<NavigationHistoryState>;
  const route = validateRoute(candidate.route, courses);
  if (
    candidate.app !== "spanish-adventure" ||
    candidate.version !== 1 ||
    typeof candidate.index !== "number" ||
    !Number.isInteger(candidate.index) ||
    !route
  ) {
    return null;
  }
  return { ...candidate, route } as NavigationHistoryState;
};
