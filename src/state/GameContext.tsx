import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  createInitialGameState,
  getCourseStorageKey,
  loadCourseGameState,
} from "./progressState";
import {
  applyProgressEvent,
  type ActivityCompletionProgressEvent,
  type AnswerProgressEvent,
  type ReviewCompletionProgressEvent,
  type SeenProgressEvent,
  type SessionCompletionProgressEvent,
} from "./progressEvents";

type CourseStates = Record<CourseId, GameState>;

type GameContextValue = {
  state: GameState;
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
  resetProgress: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: PropsWithChildren) {
  const { selectedCourseId } = useCourse();
  const activeCourseId = selectedCourseId ?? "b1";
  const [courseStates, setCourseStates] = useState<CourseStates>(() => ({
    "a1-a2": loadCourseGameState(localStorage, "a1-a2"),
    b1: loadCourseGameState(localStorage, "b1"),
  }));
  const state = courseStates[activeCourseId];

  useEffect(() => {
    localStorage.setItem(
      getCourseStorageKey("a1-a2"),
      JSON.stringify(courseStates["a1-a2"]),
    );
    localStorage.setItem(
      getCourseStorageKey("b1"),
      JSON.stringify(courseStates.b1),
    );
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

  const resetProgress = useCallback(() => {
    updateActiveState(() => createInitialGameState());
  }, [updateActiveState]);

  const value = useMemo(
    () => ({
      state,
      markLearned,
      recordAnswer,
      completeSession,
      recordActivitySeen,
      recordActivityAnswer,
      completeActivity,
      completeReview,
      resetProgress,
    }),
    [
      completeActivity,
      completeReview,
      completeSession,
      markLearned,
      recordActivitySeen,
      recordActivityAnswer,
      recordAnswer,
      resetProgress,
      state,
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
