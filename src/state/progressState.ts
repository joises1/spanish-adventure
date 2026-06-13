import type {
  ActivityProgress,
  ActivityType,
  AnswerRecord,
  ConceptMastery,
  CourseId,
  GameState,
  MistakeRecord,
  ProcessedProgressEvent,
  WorldProgress,
} from "../types";
import type { SafeStorage, StorageFailure } from "./storage";

export type { StorageLike } from "./storage";

export const LEGACY_STORAGE_KEY = "spanish-adventure-progress-v1";
export const getCourseStorageKey = (courseId: CourseId) =>
  `spanish-adventure-progress-${courseId}-v1`;

const SUPPORTED_VERSIONS = new Set([1, 2, 3, 4]);
const ACTIVITY_TYPES = new Set<ActivityType>([
  "explore",
  "multiple-choice",
  "matching",
  "listening",
  "sentence-builder",
  "grammar-repair",
  "dialogue",
  "story-shuffle",
  "unit-challenge",
  "daily-review",
  "mistake-review",
]);
const EVENT_KINDS = new Set<ProcessedProgressEvent["kind"]>([
  "answer",
  "seen",
  "activity-completion",
  "session-completion",
  "review-completion",
]);

type UnknownRecord = Record<string, unknown>;

export type GameStateValidation = {
  ok: boolean;
  state: GameState;
  sourceVersion?: number;
  recovered: boolean;
  warnings: string[];
  error?: "invalid-json" | "invalid-shape" | "future-version";
};

export type CourseLoadResult = GameStateValidation & {
  storageError?: StorageFailure;
  source: "current" | "legacy" | "default";
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finiteNumber = (
  value: unknown,
  fallback: number,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;

const integer = (
  value: unknown,
  fallback: number,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
) => Math.round(finiteNumber(value, fallback, minimum, maximum));

const optionalString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : undefined;

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (item): item is string =>
              typeof item === "string" && Boolean(item.trim()),
          ),
        ),
      ]
    : [];

const sanitizeRecordMap = <T>(
  value: unknown,
  sanitizer: (entry: unknown, key: string) => T | undefined,
) => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key, sanitizer(entry, key)] as const)
      .filter((entry): entry is [string, T] => entry[1] !== undefined),
  );
};

const sanitizeAnswerRecord = (value: unknown): AnswerRecord | undefined => {
  if (!isRecord(value)) return undefined;
  return {
    correct: integer(value.correct, 0),
    incorrect: integer(value.incorrect, 0),
    lastSeen: optionalString(value.lastSeen),
  };
};

export const createEmptyWorldProgress = (): WorldProgress => ({
  learnedWordIds: [],
  collectedWordIds: [],
  completedSessions: 0,
  quizAnswers: 0,
  quizCorrect: 0,
});

const sanitizeWorldProgress = (value: unknown): WorldProgress | undefined => {
  if (!isRecord(value)) return undefined;
  const quizAnswers = integer(value.quizAnswers, 0);
  return {
    learnedWordIds: stringArray(value.learnedWordIds),
    collectedWordIds: stringArray(value.collectedWordIds),
    completedSessions: integer(value.completedSessions, 0),
    quizAnswers,
    quizCorrect: integer(value.quizCorrect, 0, 0, quizAnswers),
  };
};

const sanitizeActivityProgress = (
  value: unknown,
): ActivityProgress | undefined => {
  if (!isRecord(value)) return undefined;
  return {
    completedSessions: integer(value.completedSessions, 0),
    bestScore: integer(value.bestScore, 0, 0, 100),
    bestStars: integer(value.bestStars, 0, 0, 3),
    lastCompletedAt: optionalString(value.lastCompletedAt),
  };
};

const sanitizeMastery = (value: unknown): ConceptMastery | undefined => {
  if (!isRecord(value)) return undefined;
  const correctCount = integer(value.correctCount, 0);
  const incorrectCount = integer(value.incorrectCount, 0);
  return {
    seenCount: integer(
      value.seenCount,
      correctCount + incorrectCount,
      correctCount + incorrectCount,
    ),
    correctCount,
    incorrectCount,
    lastPracticedAt: optionalString(value.lastPracticedAt),
    masteryEstimate: integer(value.masteryEstimate, 0, 0, 100),
  };
};

const sanitizeMistake = (
  value: unknown,
  key: string,
): MistakeRecord | undefined => {
  if (!isRecord(value)) return undefined;
  const conceptId = optionalString(value.conceptId) ?? key;
  const worldId = optionalString(value.worldId);
  const correctedAnswer = optionalString(value.correctedAnswer);
  const lastIncorrectAt = optionalString(value.lastIncorrectAt);
  const activityType = ACTIVITY_TYPES.has(value.activityType as ActivityType)
    ? (value.activityType as ActivityType)
    : undefined;
  if (!worldId || !correctedAnswer || !lastIncorrectAt || !activityType) {
    return undefined;
  }
  const example = isRecord(value.example)
    ? {
        es: optionalString(value.example.es) ?? "",
        en: optionalString(value.example.en) ?? "",
      }
    : undefined;
  return {
    conceptId,
    worldId,
    activityType,
    incorrectCount: integer(value.incorrectCount, 1, 1),
    lastIncorrectAt,
    correctedAnswer,
    example: example?.es && example.en ? example : undefined,
  };
};

const sanitizeProcessedEvent = (
  value: unknown,
): ProcessedProgressEvent | undefined => {
  if (!isRecord(value)) return undefined;
  const kind = EVENT_KINDS.has(value.kind as ProcessedProgressEvent["kind"])
    ? (value.kind as ProcessedProgressEvent["kind"])
    : undefined;
  const processedAt = optionalString(value.processedAt);
  return kind && processedAt ? { kind, processedAt } : undefined;
};

export const dateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dayDifference = (from: string, to: string) => {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  if (
    !Number.isFinite(fromYear) ||
    !Number.isFinite(fromMonth) ||
    !Number.isFinite(fromDay)
  ) {
    return Number.NaN;
  }
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) -
      Date.UTC(fromYear, fromMonth - 1, fromDay)) /
      86_400_000,
  );
};

export const createInitialGameState = (today = dateKey()): GameState => ({
  version: 4,
  xp: 0,
  streak: 1,
  lastActiveDate: today,
  words: {},
  worlds: {},
  activities: {},
  mastery: {},
  mistakes: {},
  processedEvents: {},
});

export const validateGameState = (
  value: unknown,
  today = dateKey(),
  updateStreak = true,
): GameStateValidation => {
  const fallback = createInitialGameState(today);
  if (!isRecord(value)) {
    return {
      ok: false,
      state: fallback,
      recovered: false,
      warnings: ["Saved progress was not an object."],
      error: "invalid-shape",
    };
  }

  const rawVersion = value.version;
  const sourceVersion =
    rawVersion === undefined
      ? 1
      : typeof rawVersion === "number" &&
          Number.isInteger(rawVersion)
        ? rawVersion
        : -1;
  if (sourceVersion > 4) {
    return {
      ok: false,
      state: fallback,
      sourceVersion,
      recovered: false,
      warnings: ["Saved progress uses a newer unsupported schema."],
      error: "future-version",
    };
  }
  if (!SUPPORTED_VERSIONS.has(sourceVersion)) {
    return {
      ok: false,
      state: fallback,
      sourceVersion,
      recovered: false,
      warnings: ["Saved progress has an unsupported schema version."],
      error: "invalid-shape",
    };
  }

  const warnings: string[] = [];
  const fieldWasInvalid = (field: string, valid: boolean) => {
    if (!valid && value[field] !== undefined) {
      warnings.push(`Recovered invalid ${field}.`);
    }
  };
  fieldWasInvalid(
    "xp",
    typeof value.xp === "number" && Number.isFinite(value.xp),
  );
  fieldWasInvalid(
    "streak",
    typeof value.streak === "number" && Number.isFinite(value.streak),
  );
  fieldWasInvalid("words", isRecord(value.words));
  fieldWasInvalid("worlds", isRecord(value.worlds));
  fieldWasInvalid("activities", isRecord(value.activities));
  fieldWasInvalid("mastery", isRecord(value.mastery));
  fieldWasInvalid("mistakes", isRecord(value.mistakes));
  fieldWasInvalid("processedEvents", isRecord(value.processedEvents));

  let state: GameState = {
    version: 4,
    xp: integer(value.xp, 0),
    streak: integer(value.streak, 1, 1),
    lastActiveDate: optionalString(value.lastActiveDate) ?? today,
    words: sanitizeRecordMap(value.words, sanitizeAnswerRecord),
    worlds: sanitizeRecordMap(value.worlds, sanitizeWorldProgress),
    activities: sanitizeRecordMap(
      value.activities,
      sanitizeActivityProgress,
    ),
    mastery: sanitizeRecordMap(value.mastery, sanitizeMastery),
    mistakes: sanitizeRecordMap(value.mistakes, sanitizeMistake),
    processedEvents: sanitizeRecordMap(
      value.processedEvents,
      sanitizeProcessedEvent,
    ),
  };

  if (updateStreak && state.lastActiveDate !== today) {
    const difference = dayDifference(
      state.lastActiveDate ?? today,
      today,
    );
    state = {
      ...state,
      streak:
        difference === 1
          ? Math.max(1, state.streak + 1)
          : difference === 0
            ? state.streak
            : 1,
      lastActiveDate: today,
    };
  }

  return {
    ok: true,
    state,
    sourceVersion,
    recovered: sourceVersion < 4 || warnings.length > 0,
    warnings,
  };
};

export const parseGameStateJson = (
  raw: string,
  today = dateKey(),
  updateStreak = true,
): GameStateValidation => {
  try {
    return validateGameState(JSON.parse(raw), today, updateStreak);
  } catch {
    return {
      ok: false,
      state: createInitialGameState(today),
      recovered: false,
      warnings: ["Saved progress contained invalid JSON."],
      error: "invalid-json",
    };
  }
};

export const normalizeGameState = (
  state: Partial<GameState> | unknown,
  today = dateKey(),
) => validateGameState(state, today).state;

export const loadCourseGameStateResult = (
  storage: SafeStorage,
  courseId: CourseId,
  today = dateKey(),
): CourseLoadResult => {
  const current = storage.read(getCourseStorageKey(courseId));
  if (!current.ok) {
    return {
      ok: false,
      state: createInitialGameState(today),
      recovered: false,
      warnings: [],
      storageError: current.error,
      source: "default",
    };
  }

  let raw = current.value;
  let source: CourseLoadResult["source"] = "current";
  if (!raw && courseId === "b1") {
    const legacy = storage.read(LEGACY_STORAGE_KEY);
    if (!legacy.ok) {
      return {
        ok: false,
        state: createInitialGameState(today),
        recovered: false,
        warnings: [],
        storageError: legacy.error,
        source: "default",
      };
    }
    raw = legacy.value;
    source = "legacy";
  }

  if (!raw) {
    return {
      ok: true,
      state: createInitialGameState(today),
      sourceVersion: 4,
      recovered: false,
      warnings: [],
      source: "default",
    };
  }

  return { ...parseGameStateJson(raw, today), source };
};

export const loadCourseGameState = (
  storage: SafeStorage,
  courseId: CourseId,
  today = dateKey(),
) => loadCourseGameStateResult(storage, courseId, today).state;
