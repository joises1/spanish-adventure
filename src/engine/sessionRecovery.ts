import type {
  ActivityQuestion,
  ActivityType,
  Course,
  CourseId,
} from "../types";
import { getActivityAvailability } from "./activityAvailability.ts";

export const SESSION_SNAPSHOT_VERSION = 1;
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export type SessionStatus = "active" | "completed";

export type SafeSessionSnapshot = {
  version: typeof SESSION_SNAPSHOT_VERSION;
  courseId: CourseId;
  worldId?: string;
  unit?: number;
  activityType: ActivityType;
  sessionId: string;
  seed: string;
  status: SessionStatus;
  meaningful: boolean;
  index: number;
  total: number;
  correctCount: number;
  answeredCount: number;
  startedAt: string;
  updatedAt: string;
  payload: Record<string, unknown>;
};

const SESSION_ACTIVITY_TYPES = new Set<ActivityType>([
  "explore",
  "matching",
  "listening",
  "sentence-builder",
  "dialogue",
  "story-shuffle",
  "unit-challenge",
  "daily-review",
  "mistake-review",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finiteInteger = (
  value: unknown,
  minimum = 0,
): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= minimum;

const isSafePayload = (value: unknown) => {
  if (!isRecord(value)) return false;
  try {
    return JSON.stringify(value).length <= 100_000;
  } catch {
    return false;
  }
};

export const getSessionStorageKey = (courseId: CourseId) =>
  `spanish-adventure-session-${courseId}-v1`;

export const validateSessionSnapshot = (
  value: unknown,
  courses: readonly Course[],
  now = new Date(),
): SafeSessionSnapshot | null => {
  if (!isRecord(value) || value.version !== SESSION_SNAPSHOT_VERSION) {
    return null;
  }
  if (value.courseId !== "a1-a2" && value.courseId !== "b1") return null;
  if (
    typeof value.activityType !== "string" ||
    !SESSION_ACTIVITY_TYPES.has(value.activityType as ActivityType)
  ) {
    return null;
  }
  if (
    typeof value.sessionId !== "string" ||
    !value.sessionId ||
    typeof value.seed !== "string" ||
    !value.seed ||
    (value.status !== "active" && value.status !== "completed") ||
    typeof value.meaningful !== "boolean" ||
    !finiteInteger(value.index) ||
    !finiteInteger(value.total) ||
    !finiteInteger(value.correctCount) ||
    !finiteInteger(value.answeredCount) ||
    typeof value.startedAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    !isSafePayload(value.payload)
  ) {
    return null;
  }
  const updatedAt = new Date(value.updatedAt).getTime();
  if (
    !Number.isFinite(updatedAt) ||
    now.getTime() - updatedAt > SESSION_MAX_AGE_MS ||
    updatedAt - now.getTime() > 60_000
  ) {
    return null;
  }
  const course = courses.find((candidate) => candidate.id === value.courseId);
  if (!course) return null;
  const activityType = value.activityType as ActivityType;
  const isReview =
    activityType === "daily-review" || activityType === "mistake-review";
  if (isReview) {
    if (value.worldId !== undefined || value.unit !== undefined) return null;
  } else {
    if (typeof value.worldId !== "string") return null;
    const world = course.worlds.find(
      (candidate) => candidate.id === value.worldId,
    );
    if (
      !world ||
      value.unit !== world.unit ||
      !getActivityAvailability(world, activityType).available
    ) {
      return null;
    }
  }
  if (value.index > Math.max(value.total, 10)) return null;
  return value as SafeSessionSnapshot;
};

export const parseSessionSnapshot = (
  raw: string | null,
  courses: readonly Course[],
  now = new Date(),
) => {
  if (!raw) return null;
  try {
    return validateSessionSnapshot(JSON.parse(raw), courses, now);
  } catch {
    return null;
  }
};

export const canResumeSession = (
  snapshot: SafeSessionSnapshot | null,
) => Boolean(snapshot?.status === "active" && snapshot.meaningful);

export const shouldWarnBeforeAbandon = (
  snapshot: SafeSessionSnapshot | null,
) =>
  Boolean(
    snapshot?.status === "active" &&
      snapshot.meaningful,
  );

export const getSnapshotNumber = (
  snapshot: SafeSessionSnapshot | null,
  key: string,
  fallback = 0,
) => {
  const value = snapshot?.payload[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
};

export const getSnapshotStringArray = (
  snapshot: SafeSessionSnapshot | null,
  key: string,
) => {
  const value = snapshot?.payload[key];
  return Array.isArray(value) &&
    value.every((item): item is string => typeof item === "string")
    ? value
    : [];
};

export const getSnapshotRecord = (
  snapshot: SafeSessionSnapshot | null,
  key: string,
) => {
  const value = snapshot?.payload[key];
  return isRecord(value) ? value : {};
};

const isActivityQuestion = (value: unknown): value is ActivityQuestion => {
  if (!isRecord(value)) return false;
  const hasValidItems = (
    key: string,
    validator: (item: unknown) => boolean,
  ) =>
    value[key] === undefined ||
    (Array.isArray(value[key]) && value[key].every(validator));
  return (
    typeof value.id === "string" &&
    typeof value.semanticKey === "string" &&
    typeof value.activityType === "string" &&
    typeof value.kind === "string" &&
    Array.isArray(value.conceptIds) &&
    value.conceptIds.every((item) => typeof item === "string") &&
    Array.isArray(value.sourceWordIds) &&
    value.sourceWordIds.every((item) => typeof item === "string") &&
    typeof value.prompt === "string" &&
    typeof value.answer === "string" &&
    hasValidItems(
      "choices",
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.text === "string",
    ) &&
    hasValidItems(
      "tokens",
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.text === "string",
    ) &&
    hasValidItems(
      "dialogueTurns",
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.speaker === "string" &&
        typeof item.text === "string",
    ) &&
    hasValidItems(
      "storySentences",
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        finiteInteger(item.position) &&
        typeof item.es === "string" &&
        typeof item.en === "string" &&
        Array.isArray(item.sourceWordIds) &&
        item.sourceWordIds.every((wordId) => typeof wordId === "string"),
    ) &&
    hasValidItems("orderedItemIds", (item) => typeof item === "string")
  );
};

export const getSnapshotQuestions = (
  snapshot: SafeSessionSnapshot | null,
  key = "questions",
) => {
  const value = snapshot?.payload[key];
  return Array.isArray(value) && value.every(isActivityQuestion)
    ? value
    : [];
};
