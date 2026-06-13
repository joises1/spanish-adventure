import type { CourseId, GameState } from "../types";
import {
  getCourseStorageKey,
  validateGameState,
  type GameStateValidation,
} from "./progressState.ts";
import type { SafeStorage, StorageResult } from "./storage";

export const PROGRESS_EXPORT_FORMAT = "spanish-adventure-progress";
export const PROGRESS_EXPORT_VERSION = 1;
export const PROGRESS_BACKUP_KEY =
  "spanish-adventure-progress-backup-v1";

export type CourseStates = Record<CourseId, GameState>;

export type CourseProgressSummary = {
  xp: number;
  streak: number;
  completedActivities: number;
  learnedWords: number;
  mistakes: number;
};

export type ProgressSummary = Record<CourseId, CourseProgressSummary>;

export type ProgressExport = {
  format: typeof PROGRESS_EXPORT_FORMAT;
  exportVersion: typeof PROGRESS_EXPORT_VERSION;
  exportedAt: string;
  selectedCourseId: CourseId | null;
  courses: CourseStates;
};

export type ProgressImportValidation =
  | {
      ok: true;
      data: ProgressExport;
      summary: ProgressSummary;
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    };

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCourseId = (value: unknown): value is CourseId =>
  value === "a1-a2" || value === "b1";

const learnedWordCount = (state: GameState) =>
  new Set(
    Object.values(state.worlds).flatMap(
      (world) => world.collectedWordIds,
    ),
  ).size;

export const summarizeCourseProgress = (
  state: GameState,
): CourseProgressSummary => ({
  xp: state.xp,
  streak: state.streak,
  completedActivities: Object.values(state.activities).reduce(
    (total, activity) => total + activity.completedSessions,
    0,
  ),
  learnedWords: learnedWordCount(state),
  mistakes: Object.keys(state.mistakes).length,
});

export const summarizeProgress = (
  states: CourseStates,
): ProgressSummary => ({
  "a1-a2": summarizeCourseProgress(states["a1-a2"]),
  b1: summarizeCourseProgress(states.b1),
});

export const createProgressExport = (
  states: CourseStates,
  selectedCourseId: CourseId | null,
  exportedAt = new Date().toISOString(),
): ProgressExport => ({
  format: PROGRESS_EXPORT_FORMAT,
  exportVersion: PROGRESS_EXPORT_VERSION,
  exportedAt,
  selectedCourseId,
  courses: states,
});

export const serializeProgressExport = (data: ProgressExport) =>
  JSON.stringify(data, null, 2);

const validateImportedCourse = (
  value: unknown,
  courseName: string,
  today: string,
): GameStateValidation | string => {
  const validation = validateGameState(value, today, false);
  if (!validation.ok) {
    if (validation.error === "future-version") {
      return `${courseName} uses a newer unsupported progress version.`;
    }
    return `${courseName} progress is not a valid saved game.`;
  }
  return validation;
};

export const validateProgressImport = (
  input: string | unknown,
  today?: string,
): ProgressImportValidation => {
  let value: unknown = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return { ok: false, error: "The selected file is not valid JSON." };
    }
  }

  if (!isRecord(value)) {
    return { ok: false, error: "The import must contain a JSON object." };
  }
  if (value.format !== PROGRESS_EXPORT_FORMAT) {
    return {
      ok: false,
      error: "This is not a Spanish Adventure progress export.",
    };
  }
  if (
    typeof value.exportVersion !== "number" ||
    !Number.isInteger(value.exportVersion)
  ) {
    return { ok: false, error: "The export version is missing or invalid." };
  }
  if (value.exportVersion > PROGRESS_EXPORT_VERSION) {
    return {
      ok: false,
      error: "This export was created by a newer app version.",
    };
  }
  if (value.exportVersion < 1 || !isRecord(value.courses)) {
    return { ok: false, error: "The export structure is unsupported." };
  }

  const importToday = today ?? new Date().toISOString().slice(0, 10);
  const beginner = validateImportedCourse(
    value.courses["a1-a2"],
    "A1-A2",
    importToday,
  );
  if (typeof beginner === "string") {
    return { ok: false, error: beginner };
  }
  const intermediate = validateImportedCourse(
    value.courses.b1,
    "B1",
    importToday,
  );
  if (typeof intermediate === "string") {
    return { ok: false, error: intermediate };
  }

  const selectedCourseId = isCourseId(value.selectedCourseId)
    ? value.selectedCourseId
    : null;
  const exportedAt =
    typeof value.exportedAt === "string" && value.exportedAt
      ? value.exportedAt
      : new Date().toISOString();
  const data = createProgressExport(
    {
      "a1-a2": beginner.state,
      b1: intermediate.state,
    },
    selectedCourseId,
    exportedAt,
  );
  const warnings = [
    ...beginner.warnings.map((warning) => `A1-A2: ${warning}`),
    ...intermediate.warnings.map((warning) => `B1: ${warning}`),
  ];

  return {
    ok: true,
    data,
    summary: summarizeProgress(data.courses),
    warnings,
  };
};

export const persistCourseStates = (
  storage: SafeStorage,
  states: CourseStates,
): StorageResult<undefined> =>
  storage.writeBatch([
    [
      getCourseStorageKey("a1-a2"),
      JSON.stringify(states["a1-a2"]),
    ],
    [getCourseStorageKey("b1"), JSON.stringify(states.b1)],
  ]);

export const saveProgressBackup = (
  storage: SafeStorage,
  states: CourseStates,
  selectedCourseId: CourseId | null,
  timestamp = new Date().toISOString(),
): StorageResult<undefined> =>
  storage.write(
    PROGRESS_BACKUP_KEY,
    serializeProgressExport(
      createProgressExport(states, selectedCourseId, timestamp),
    ),
  );

export const loadProgressBackup = (
  storage: SafeStorage,
  today?: string,
): ProgressImportValidation | null => {
  const result = storage.read(PROGRESS_BACKUP_KEY);
  if (!result.ok || !result.value) return null;
  return validateProgressImport(result.value, today);
};
