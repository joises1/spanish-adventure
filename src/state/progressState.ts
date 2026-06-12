import type { CourseId, GameState, WorldProgress } from "../types";

export const LEGACY_STORAGE_KEY = "spanish-adventure-progress-v1";
export const getCourseStorageKey = (courseId: CourseId) =>
  `spanish-adventure-progress-${courseId}-v1`;

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const dateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dayDifference = (from: string, to: string) => {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) -
      Date.UTC(fromYear, fromMonth - 1, fromDay)) /
      86_400_000,
  );
};

export const createEmptyWorldProgress = (): WorldProgress => ({
  learnedWordIds: [],
  collectedWordIds: [],
  completedSessions: 0,
  quizAnswers: 0,
  quizCorrect: 0,
});

export const createInitialGameState = (today = dateKey()): GameState => ({
  version: 3,
  xp: 0,
  streak: 1,
  lastActiveDate: today,
  words: {},
  worlds: {},
  activities: {},
  mastery: {},
  mistakes: {},
});

type PersistedGameState = Partial<Omit<GameState, "version">> & {
  version?: number;
};

export const normalizeGameState = (
  state: PersistedGameState,
  today = dateKey(),
): GameState => {
  const normalized: GameState = {
    ...createInitialGameState(today),
    ...state,
    version: 3,
    words: state.words ?? {},
    worlds: Object.fromEntries(
      Object.entries(state.worlds ?? {}).map(([worldId, progress]) => [
        worldId,
        {
          ...createEmptyWorldProgress(),
          ...progress,
          learnedWordIds: progress.learnedWordIds ?? [],
          collectedWordIds: progress.collectedWordIds ?? [],
        },
      ]),
    ),
    activities: state.activities ?? {},
    mastery: state.mastery ?? {},
    mistakes: state.mistakes ?? {},
  };

  if (normalized.lastActiveDate === today) return normalized;
  const difference = normalized.lastActiveDate
    ? dayDifference(normalized.lastActiveDate, today)
    : 1;
  return {
    ...normalized,
    streak: difference === 1 ? Math.max(1, normalized.streak + 1) : 1,
    lastActiveDate: today,
  };
};

export const loadCourseGameState = (
  storage: StorageLike,
  courseId: CourseId,
  today = dateKey(),
) => {
  try {
    const saved =
      storage.getItem(getCourseStorageKey(courseId)) ??
      (courseId === "b1" ? storage.getItem(LEGACY_STORAGE_KEY) : null);
    if (!saved) return createInitialGameState(today);
    const parsed = JSON.parse(saved) as PersistedGameState;
    if (![1, 2, 3].includes(parsed.version ?? 0)) {
      return createInitialGameState(today);
    }
    return normalizeGameState(parsed, today);
  } catch {
    return createInitialGameState(today);
  }
};
