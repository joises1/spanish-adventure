import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CourseId,
  GameState,
  ProgressConcept,
  VocabularyWord,
} from "../types";
import { useCourse } from "./CourseContext";
import {
  createProgressExport,
  loadProgressBackup,
  persistCourseStates,
  saveProgressBackup,
  serializeProgressExport,
  validateProgressImport,
  type CourseStates,
  type ProgressImportValidation,
} from "./progressData";
import {
  createInitialGameState,
  getCourseStorageKey,
  loadCourseGameStateResult,
} from "./progressState";
import {
  applyProgressEvent,
  type ActivityCompletionProgressEvent,
  type AnswerProgressEvent,
  type ReviewCompletionProgressEvent,
  type SeenProgressEvent,
  type SessionCompletionProgressEvent,
} from "./progressEvents";
import { browserStorage, type StorageFailure } from "./storage";

export type DataOperationResult = {
  ok: boolean;
  message: string;
};

export type ProgressStorageStatus = {
  available: boolean;
  message?: string;
};

type GameContextValue = {
  state: GameState;
  storageStatus: ProgressStorageStatus;
  lastBackupAt: string | null;
  markLearned: (
    eventId: string,
    worldId: string,
    word: VocabularyWord,
  ) => void;
  recordAnswer: (
    eventId: string,
    worldId: string,
    word: VocabularyWord,
    isCorrect: boolean,
  ) => void;
  completeSession: (event: SessionCompletionProgressEvent) => void;
  recordActivitySeen: (event: SeenProgressEvent) => void;
  recordActivityAnswer: (event: AnswerProgressEvent) => void;
  completeActivity: (event: ActivityCompletionProgressEvent) => void;
  completeReview: (event: ReviewCompletionProgressEvent) => void;
  exportProgress: () => string;
  previewProgressImport: (raw: string) => ProgressImportValidation;
  importProgress: (
    validation: ProgressImportValidation,
  ) => DataOperationResult;
  restoreBackup: () => DataOperationResult;
  resetCourseProgress: (courseId?: CourseId) => DataOperationResult;
  resetAllProgress: () => DataOperationResult;
  resetProgress: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

const storageFailureMessage = (failure: StorageFailure) => {
  if (failure.code === "quota") {
    return "Browser storage is full. Export your progress, then free some site storage.";
  }
  if (failure.code === "security" || failure.code === "unavailable") {
    return "Browser storage is unavailable. Progress will work for this visit but cannot be saved.";
  }
  return "Progress could not be saved in browser storage.";
};

const getInitialLoads = () => ({
  "a1-a2": loadCourseGameStateResult(browserStorage, "a1-a2"),
  b1: loadCourseGameStateResult(browserStorage, "b1"),
});

export function GameProvider({ children }: PropsWithChildren) {
  const { selectedCourseId } = useCourse();
  const activeCourseId = selectedCourseId ?? "b1";
  const [initialLoads] = useState(getInitialLoads);
  const [courseStates, setCourseStates] = useState<CourseStates>(() => ({
    "a1-a2": initialLoads["a1-a2"].state,
    b1: initialLoads.b1.state,
  }));
  const blockedCourseWrites = useRef(
    new Set<CourseId>(
      (["a1-a2", "b1"] as const).filter(
        (courseId) =>
          initialLoads[courseId].error === "future-version",
      ),
    ),
  );
  const initialStorageFailure =
    initialLoads["a1-a2"].storageError ??
    initialLoads.b1.storageError;
  const initialWarning = (
    ["a1-a2", "b1"] as const
  ).find((courseId) => initialLoads[courseId].error === "future-version")
    ? "Newer progress data was found and left untouched. This app is using safe defaults and will not overwrite that course unless you explicitly import or reset."
    : undefined;
  const [storageUnavailable, setStorageUnavailable] = useState(
    Boolean(initialStorageFailure),
  );
  const [storageMessage, setStorageMessage] = useState<string | undefined>(
    initialStorageFailure
      ? storageFailureMessage(initialStorageFailure)
      : initialWarning,
  );
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => {
    const backup = loadProgressBackup(browserStorage);
    return backup?.ok ? backup.data.exportedAt : null;
  });
  const state = courseStates[activeCourseId];

  useEffect(() => {
    const blocked = blockedCourseWrites.current;
    if (blocked.size === 0) {
      const result = persistCourseStates(browserStorage, courseStates);
      if (!result.ok) {
        setStorageUnavailable(true);
        setStorageMessage(storageFailureMessage(result.error));
      }
      return;
    }

    for (const courseId of ["a1-a2", "b1"] as const) {
      if (blocked.has(courseId)) continue;
      const result = browserStorage.write(
        getCourseStorageKey(courseId),
        JSON.stringify(courseStates[courseId]),
      );
      if (!result.ok) {
        setStorageUnavailable(true);
        setStorageMessage(storageFailureMessage(result.error));
        return;
      }
    }
  }, [courseStates]);

  const updateActiveState = useCallback(
    (updater: (current: GameState) => GameState) => {
      setCourseStates((current) => ({
        ...current,
        [activeCourseId]: updater(current[activeCourseId]),
      }));
    },
    [activeCourseId],
  );

  const markLearned = useCallback(
    (eventId: string, worldId: string, word: VocabularyWord) => {
      updateActiveState((current) =>
        applyProgressEvent(current, {
          kind: "seen",
          id: eventId,
          worldId,
          activityType: "explore",
          words: [word],
        }),
      );
    },
    [updateActiveState],
  );

  const recordAnswer = useCallback(
    (
      eventId: string,
      worldId: string,
      word: VocabularyWord,
      isCorrect: boolean,
    ) => {
      const concepts: ProgressConcept[] = [{ word, worldId }];
      updateActiveState((current) =>
        applyProgressEvent(current, {
          kind: "answer",
          id: eventId,
          activityType: "multiple-choice",
          concepts,
          isCorrect,
        }),
      );
    },
    [updateActiveState],
  );

  const completeSession = useCallback(
    (event: SessionCompletionProgressEvent) => {
      updateActiveState((current) => applyProgressEvent(current, event));
    },
    [updateActiveState],
  );

  const recordActivityAnswer = useCallback(
    (event: AnswerProgressEvent) => {
      updateActiveState((current) => applyProgressEvent(current, event));
    },
    [updateActiveState],
  );

  const recordActivitySeen = useCallback(
    (event: SeenProgressEvent) => {
      updateActiveState((current) => applyProgressEvent(current, event));
    },
    [updateActiveState],
  );

  const completeActivity = useCallback(
    (event: ActivityCompletionProgressEvent) => {
      updateActiveState((current) => applyProgressEvent(current, event));
    },
    [updateActiveState],
  );

  const completeReview = useCallback(
    (event: ReviewCompletionProgressEvent) => {
      updateActiveState((current) => applyProgressEvent(current, event));
    },
    [updateActiveState],
  );

  const exportProgress = useCallback(
    () =>
      serializeProgressExport(
        createProgressExport(courseStates, selectedCourseId),
      ),
    [courseStates, selectedCourseId],
  );

  const previewProgressImport = useCallback(
    (raw: string) => validateProgressImport(raw),
    [],
  );

  const backUpCurrentProgress = useCallback(() => {
    const timestamp = new Date().toISOString();
    const result = saveProgressBackup(
      browserStorage,
      courseStates,
      selectedCourseId,
      timestamp,
    );
    if (result.ok) setLastBackupAt(timestamp);
    return result;
  }, [courseStates, selectedCourseId]);

  const importProgress = useCallback(
    (validation: ProgressImportValidation): DataOperationResult => {
      if (!validation.ok) {
        return { ok: false, message: validation.error };
      }
      const backup = backUpCurrentProgress();
      if (!backup.ok) {
        return {
          ok: false,
          message: `Import stopped: ${storageFailureMessage(backup.error)}`,
        };
      }
      const persisted = persistCourseStates(
        browserStorage,
        validation.data.courses,
      );
      if (!persisted.ok) {
        return {
          ok: false,
          message: `Import stopped: ${storageFailureMessage(persisted.error)}`,
        };
      }

      blockedCourseWrites.current.clear();
      setCourseStates(validation.data.courses);
      setStorageUnavailable(false);
      setStorageMessage(undefined);
      return {
        ok: true,
        message: "Progress imported. Your previous progress was backed up.",
      };
    },
    [backUpCurrentProgress],
  );

  const restoreBackup = useCallback((): DataOperationResult => {
    const backup = loadProgressBackup(browserStorage);
    if (!backup) {
      return { ok: false, message: "No usable progress backup was found." };
    }
    if (!backup.ok) {
      return { ok: false, message: backup.error };
    }
    const persisted = persistCourseStates(
      browserStorage,
      backup.data.courses,
    );
    if (!persisted.ok) {
      return {
        ok: false,
        message: storageFailureMessage(persisted.error),
      };
    }

    blockedCourseWrites.current.clear();
    setCourseStates(backup.data.courses);
    setStorageUnavailable(false);
    setStorageMessage(undefined);
    return { ok: true, message: "The previous backup was restored." };
  }, []);

  const resetCourseProgress = useCallback(
    (courseId = activeCourseId): DataOperationResult => {
      const backup = backUpCurrentProgress();
      if (!backup.ok) {
        return {
          ok: false,
          message: `Reset stopped: ${storageFailureMessage(backup.error)}`,
        };
      }
      const next: CourseStates = {
        ...courseStates,
        [courseId]: createInitialGameState(),
      };
      const persisted = persistCourseStates(browserStorage, next);
      if (!persisted.ok) {
        return {
          ok: false,
          message: `Reset stopped: ${storageFailureMessage(persisted.error)}`,
        };
      }

      blockedCourseWrites.current.delete(courseId);
      setCourseStates(next);
      setStorageUnavailable(false);
      setStorageMessage(undefined);
      return { ok: true, message: "Course progress was reset." };
    },
    [activeCourseId, backUpCurrentProgress, courseStates],
  );

  const resetAllProgress = useCallback((): DataOperationResult => {
    const backup = backUpCurrentProgress();
    if (!backup.ok) {
      return {
        ok: false,
        message: `Reset stopped: ${storageFailureMessage(backup.error)}`,
      };
    }
    const next: CourseStates = {
      "a1-a2": createInitialGameState(),
      b1: createInitialGameState(),
    };
    const persisted = persistCourseStates(browserStorage, next);
    if (!persisted.ok) {
      return {
        ok: false,
        message: `Reset stopped: ${storageFailureMessage(persisted.error)}`,
      };
    }

    blockedCourseWrites.current.clear();
    setCourseStates(next);
    setStorageUnavailable(false);
    setStorageMessage(undefined);
    return { ok: true, message: "All course progress was reset." };
  }, [backUpCurrentProgress]);

  const resetProgress = useCallback(() => {
    resetCourseProgress();
  }, [resetCourseProgress]);

  const value = useMemo(
    () => ({
      state,
      storageStatus: {
        available: browserStorage.available && !storageUnavailable,
        message: storageMessage,
      },
      lastBackupAt,
      markLearned,
      recordAnswer,
      completeSession,
      recordActivitySeen,
      recordActivityAnswer,
      completeActivity,
      completeReview,
      exportProgress,
      previewProgressImport,
      importProgress,
      restoreBackup,
      resetCourseProgress,
      resetAllProgress,
      resetProgress,
    }),
    [
      completeActivity,
      completeReview,
      completeSession,
      exportProgress,
      importProgress,
      lastBackupAt,
      markLearned,
      previewProgressImport,
      recordActivitySeen,
      recordActivityAnswer,
      recordAnswer,
      resetAllProgress,
      resetCourseProgress,
      resetProgress,
      restoreBackup,
      state,
      storageMessage,
      storageUnavailable,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// The hook intentionally shares this module with its provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useGame = () => {
  const value = useContext(GameContext);
  if (!value) {
    throw new Error("useGame must be used inside GameProvider");
  }
  return value;
};
