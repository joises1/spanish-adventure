import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getActivityProgressKey, scoreToStars } from "../engine/activityEngine";
import type {
  ActivityType,
  ConceptMastery,
  CourseId,
  GameState,
  VocabularyWord,
} from "../types";
import { useCourse } from "./CourseContext";
import {
  createEmptyWorldProgress,
  createInitialGameState,
  getCourseStorageKey,
  loadCourseGameState,
} from "./progressState";

type CourseStates = Record<CourseId, GameState>;

type GameContextValue = {
  state: GameState;
  markLearned: (worldId: string, word: VocabularyWord) => void;
  recordAnswer: (
    worldId: string,
    word: VocabularyWord,
    isCorrect: boolean,
  ) => void;
  completeSession: (worldId: string, words: VocabularyWord[]) => void;
  recordActivitySeen: (
    worldId: string,
    activityType: ActivityType,
    words: VocabularyWord[],
  ) => void;
  recordActivityAnswer: (
    worldId: string,
    activityType: ActivityType,
    words: VocabularyWord[],
    isCorrect: boolean,
  ) => void;
  completeActivity: (
    worldId: string,
    activityType: ActivityType,
    words: VocabularyWord[],
    score: number,
  ) => void;
  completeReview: (
    activityType: "daily-review" | "mistake-review",
    score: number,
  ) => void;
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
    (worldId: string, word: VocabularyWord) => {
      updateActiveState((current) => {
        const worldProgress =
          current.worlds[worldId] ?? createEmptyWorldProgress();
        if (worldProgress.learnedWordIds.includes(word.id)) return current;

        return {
          ...current,
          xp: current.xp + 2,
          worlds: {
            ...current.worlds,
            [worldId]: {
              ...worldProgress,
              learnedWordIds: [...worldProgress.learnedWordIds, word.id],
            },
          },
        };
      });
    },
    [updateActiveState],
  );

  const recordAnswer = useCallback(
    (worldId: string, word: VocabularyWord, isCorrect: boolean) => {
      updateActiveState((current) => {
        const wordRecord = current.words[word.id] ?? {
          correct: 0,
          incorrect: 0,
        };
        const worldProgress =
          current.worlds[worldId] ?? createEmptyWorldProgress();
        const learnedWordIds = worldProgress.learnedWordIds.includes(word.id)
          ? worldProgress.learnedWordIds
          : [...worldProgress.learnedWordIds, word.id];

        return {
          ...current,
          xp: current.xp + (isCorrect ? 10 : 2),
          words: {
            ...current.words,
            [word.id]: {
              correct: wordRecord.correct + (isCorrect ? 1 : 0),
              incorrect: wordRecord.incorrect + (isCorrect ? 0 : 1),
              lastSeen: new Date().toISOString(),
            },
          },
          worlds: {
            ...current.worlds,
            [worldId]: {
              ...worldProgress,
              learnedWordIds,
              quizAnswers: worldProgress.quizAnswers + 1,
              quizCorrect: worldProgress.quizCorrect + (isCorrect ? 1 : 0),
            },
          },
        };
      });
    },
    [updateActiveState],
  );

  const completeSession = useCallback(
    (worldId: string, words: VocabularyWord[]) => {
      updateActiveState((current) => {
        const worldProgress =
          current.worlds[worldId] ?? createEmptyWorldProgress();
        const collectedWordIds = [
          ...new Set([
            ...worldProgress.collectedWordIds,
            ...words.map((word) => word.id),
          ]),
        ];

        return {
          ...current,
          worlds: {
            ...current.worlds,
            [worldId]: {
              ...worldProgress,
              collectedWordIds,
              completedSessions: worldProgress.completedSessions + 1,
            },
          },
        };
      });
    },
    [updateActiveState],
  );

  const recordActivityAnswer = useCallback(
    (
      worldId: string,
      _activityType: ActivityType,
      words: VocabularyWord[],
      isCorrect: boolean,
    ) => {
      void _activityType;
      updateActiveState((current) => {
        const now = new Date().toISOString();
        const worldProgress =
          current.worlds[worldId] ?? createEmptyWorldProgress();
        const uniqueWords = words.filter(
          (word, index, allWords) =>
            allWords.findIndex((item) => item.id === word.id) === index,
        );
        const learnedWordIds = [
          ...new Set([
            ...worldProgress.learnedWordIds,
            ...uniqueWords.map((word) => word.id),
          ]),
        ];
        const nextWordRecords = { ...current.words };
        const nextMastery = { ...current.mastery };
        const nextMistakes = { ...current.mistakes };

        uniqueWords.forEach((word) => {
          const record = nextWordRecords[word.id] ?? {
            correct: 0,
            incorrect: 0,
          };
          nextWordRecords[word.id] = {
            correct: record.correct + (isCorrect ? 1 : 0),
            incorrect: record.incorrect + (isCorrect ? 0 : 1),
            lastSeen: now,
          };

          const mastery: ConceptMastery = nextMastery[word.id] ?? {
            seenCount: 0,
            correctCount: 0,
            incorrectCount: 0,
            masteryEstimate: 0,
          };
          const correctCount = mastery.correctCount + (isCorrect ? 1 : 0);
          const incorrectCount =
            mastery.incorrectCount + (isCorrect ? 0 : 1);
          const seenCount = mastery.seenCount + 1;
          nextMastery[word.id] = {
            seenCount,
            correctCount,
            incorrectCount,
            lastPracticedAt: now,
            masteryEstimate: Math.round(
              (correctCount / Math.max(1, correctCount + incorrectCount)) * 100,
            ),
          };

          if (!isCorrect) {
            const mistake = nextMistakes[word.id];
            nextMistakes[word.id] = {
              conceptId: word.id,
              worldId,
              activityType: _activityType,
              incorrectCount: (mistake?.incorrectCount ?? 0) + 1,
              lastIncorrectAt: now,
              correctedAnswer: word.en,
              example: word.example,
            };
          }
        });

        return {
          ...current,
          xp: current.xp + (isCorrect ? 10 : 2),
          words: nextWordRecords,
          mastery: nextMastery,
          mistakes: nextMistakes,
          worlds: {
            ...current.worlds,
            [worldId]: {
              ...worldProgress,
              learnedWordIds,
              quizAnswers: worldProgress.quizAnswers + 1,
              quizCorrect: worldProgress.quizCorrect + (isCorrect ? 1 : 0),
            },
          },
        };
      });
    },
    [updateActiveState],
  );

  const recordActivitySeen = useCallback(
    (
      worldId: string,
      _activityType: ActivityType,
      words: VocabularyWord[],
    ) => {
      void _activityType;
      updateActiveState((current) => {
        const now = new Date().toISOString();
        const worldProgress =
          current.worlds[worldId] ?? createEmptyWorldProgress();
        const uniqueWords = words.filter(
          (word, index, allWords) =>
            allWords.findIndex((item) => item.id === word.id) === index,
        );
        const newWords = uniqueWords.filter(
          (word) => !worldProgress.learnedWordIds.includes(word.id),
        );
        const nextMastery = { ...current.mastery };

        uniqueWords.forEach((word) => {
          const mastery: ConceptMastery = nextMastery[word.id] ?? {
            seenCount: 0,
            correctCount: 0,
            incorrectCount: 0,
            masteryEstimate: 0,
          };
          nextMastery[word.id] = {
            ...mastery,
            seenCount: mastery.seenCount + 1,
            lastPracticedAt: now,
          };
        });

        return {
          ...current,
          xp: current.xp + newWords.length * 2,
          mastery: nextMastery,
          worlds: {
            ...current.worlds,
            [worldId]: {
              ...worldProgress,
              learnedWordIds: [
                ...worldProgress.learnedWordIds,
                ...newWords.map((word) => word.id),
              ],
            },
          },
        };
      });
    },
    [updateActiveState],
  );

  const completeActivity = useCallback(
    (
      worldId: string,
      activityType: ActivityType,
      words: VocabularyWord[],
      score: number,
    ) => {
      updateActiveState((current) => {
        const worldProgress =
          current.worlds[worldId] ?? createEmptyWorldProgress();
        const collectedWordIds = [
          ...new Set([
            ...worldProgress.collectedWordIds,
            ...words.map((word) => word.id),
          ]),
        ];
        const activityKey = getActivityProgressKey(worldId, activityType);
        const activityProgress = current.activities[activityKey] ?? {
          completedSessions: 0,
          bestScore: 0,
          bestStars: 0,
        };

        return {
          ...current,
          worlds: {
            ...current.worlds,
            [worldId]: {
              ...worldProgress,
              collectedWordIds,
              completedSessions: worldProgress.completedSessions + 1,
            },
          },
          activities: {
            ...current.activities,
            [activityKey]: {
              completedSessions: activityProgress.completedSessions + 1,
              bestScore: Math.max(activityProgress.bestScore, score),
              bestStars: Math.max(
                activityProgress.bestStars,
                scoreToStars(score),
              ),
              lastCompletedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [updateActiveState],
  );

  const completeReview = useCallback(
    (
      activityType: "daily-review" | "mistake-review",
      score: number,
    ) => {
      updateActiveState((current) => {
        const activityKey = `review:${activityType}`;
        const progress = current.activities[activityKey] ?? {
          completedSessions: 0,
          bestScore: 0,
          bestStars: 0,
        };
        return {
          ...current,
          activities: {
            ...current.activities,
            [activityKey]: {
              completedSessions: progress.completedSessions + 1,
              bestScore: Math.max(progress.bestScore, score),
              bestStars: Math.max(progress.bestStars, scoreToStars(score)),
              lastCompletedAt: new Date().toISOString(),
            },
          },
        };
      });
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
