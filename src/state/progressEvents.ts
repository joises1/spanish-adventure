import {
  getActivityProgressKey,
  scoreToStars,
} from "../engine/activityEngine.ts";
import type {
  ActivityType,
  ConceptMastery,
  GameState,
  ProgressConcept,
  VocabularyWord,
} from "../types";
import { createEmptyWorldProgress } from "./progressState.ts";

const MAX_PROCESSED_EVENTS = 2_000;

type BaseProgressEvent = {
  id: string;
  occurredAt?: string;
};

export type AnswerProgressEvent = BaseProgressEvent & {
  kind: "answer";
  activityType: ActivityType;
  concepts: ProgressConcept[];
  isCorrect: boolean;
  rewardXp?: number;
};

export type SeenProgressEvent = BaseProgressEvent & {
  kind: "seen";
  activityType: ActivityType;
  worldId: string;
  words: VocabularyWord[];
};

export type ActivityCompletionProgressEvent = BaseProgressEvent & {
  kind: "activity-completion";
  worldId: string;
  activityType: ActivityType;
  words: VocabularyWord[];
  score: number;
  rewardXp?: number;
};

export type SessionCompletionProgressEvent = BaseProgressEvent & {
  kind: "session-completion";
  worldId: string;
  words: VocabularyWord[];
};

export type ReviewCompletionProgressEvent = BaseProgressEvent & {
  kind: "review-completion";
  activityType: "daily-review" | "mistake-review";
  score: number;
};

export type ProgressEvent =
  | AnswerProgressEvent
  | SeenProgressEvent
  | ActivityCompletionProgressEvent
  | SessionCompletionProgressEvent
  | ReviewCompletionProgressEvent;

const uniqueWords = (words: readonly VocabularyWord[]) =>
  words.filter(
    (word, index, allWords) =>
      allWords.findIndex((candidate) => candidate.id === word.id) === index,
  );

const uniqueConcepts = (concepts: readonly ProgressConcept[]) =>
  concepts.filter(
    (concept, index, allConcepts) =>
      allConcepts.findIndex(
        (candidate) =>
          candidate.word.id === concept.word.id &&
          candidate.worldId === concept.worldId,
      ) === index,
  );

const rememberEvent = (
  state: GameState,
  event: ProgressEvent,
  processedAt: string,
) => {
  const entries = [
    ...Object.entries(state.processedEvents),
    [event.id, { kind: event.kind, processedAt }] as const,
  ];
  const boundedEntries = entries.slice(-MAX_PROCESSED_EVENTS);
  return Object.fromEntries(boundedEntries);
};

const applyAnswer = (
  state: GameState,
  event: AnswerProgressEvent,
  now: string,
) => {
  const concepts = uniqueConcepts(event.concepts);
  const nextWords = { ...state.words };
  const nextMastery = { ...state.mastery };
  const nextMistakes = { ...state.mistakes };
  const nextWorlds = { ...state.worlds };
  const conceptsByWorld = new Map<string, ProgressConcept[]>();

  concepts.forEach((concept) => {
    const existing = conceptsByWorld.get(concept.worldId) ?? [];
    existing.push(concept);
    conceptsByWorld.set(concept.worldId, existing);

    const record = nextWords[concept.word.id] ?? {
      correct: 0,
      incorrect: 0,
    };
    nextWords[concept.word.id] = {
      correct: record.correct + (event.isCorrect ? 1 : 0),
      incorrect: record.incorrect + (event.isCorrect ? 0 : 1),
      lastSeen: now,
    };

    const mastery: ConceptMastery = nextMastery[concept.word.id] ?? {
      seenCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      masteryEstimate: 0,
    };
    const correctCount = mastery.correctCount + (event.isCorrect ? 1 : 0);
    const incorrectCount =
      mastery.incorrectCount + (event.isCorrect ? 0 : 1);
    nextMastery[concept.word.id] = {
      seenCount: mastery.seenCount + 1,
      correctCount,
      incorrectCount,
      lastPracticedAt: now,
      masteryEstimate: Math.round(
        (correctCount / Math.max(1, correctCount + incorrectCount)) * 100,
      ),
    };

    if (!event.isCorrect) {
      const mistake = nextMistakes[concept.word.id];
      nextMistakes[concept.word.id] = {
        conceptId: concept.word.id,
        worldId: concept.worldId,
        activityType: event.activityType,
        incorrectCount: (mistake?.incorrectCount ?? 0) + 1,
        lastIncorrectAt: now,
        correctedAnswer: concept.word.en,
        example: concept.word.example,
      };
    }
  });

  conceptsByWorld.forEach((worldConcepts, worldId) => {
    const worldProgress =
      nextWorlds[worldId] ?? createEmptyWorldProgress();
    nextWorlds[worldId] = {
      ...worldProgress,
      learnedWordIds: [
        ...new Set([
          ...worldProgress.learnedWordIds,
          ...worldConcepts.map((concept) => concept.word.id),
        ]),
      ],
      quizAnswers: worldProgress.quizAnswers + 1,
      quizCorrect: worldProgress.quizCorrect + (event.isCorrect ? 1 : 0),
    };
  });

  return {
    ...state,
    xp:
      state.xp +
      (event.rewardXp ?? (event.isCorrect ? 10 : 2)),
    words: nextWords,
    worlds: nextWorlds,
    mastery: nextMastery,
    mistakes: nextMistakes,
  };
};

const applySeen = (
  state: GameState,
  event: SeenProgressEvent,
  now: string,
) => {
  const words = uniqueWords(event.words);
  const worldProgress =
    state.worlds[event.worldId] ?? createEmptyWorldProgress();
  const newWords = words.filter(
    (word) => !worldProgress.learnedWordIds.includes(word.id),
  );
  const nextMastery = { ...state.mastery };

  words.forEach((word) => {
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
    ...state,
    xp: state.xp + newWords.length * 2,
    mastery: nextMastery,
    worlds: {
      ...state.worlds,
      [event.worldId]: {
        ...worldProgress,
        learnedWordIds: [
          ...worldProgress.learnedWordIds,
          ...newWords.map((word) => word.id),
        ],
      },
    },
  };
};

const applyActivityCompletion = (
  state: GameState,
  event: ActivityCompletionProgressEvent,
  now: string,
) => {
  const worldProgress =
    state.worlds[event.worldId] ?? createEmptyWorldProgress();
  const activityKey = getActivityProgressKey(
    event.worldId,
    event.activityType,
  );
  const activityProgress = state.activities[activityKey] ?? {
    completedSessions: 0,
    bestScore: 0,
    bestStars: 0,
  };

  return {
    ...state,
    xp: state.xp + (event.rewardXp ?? 0),
    worlds: {
      ...state.worlds,
      [event.worldId]: {
        ...worldProgress,
        collectedWordIds: [
          ...new Set([
            ...worldProgress.collectedWordIds,
            ...event.words.map((word) => word.id),
          ]),
        ],
        completedSessions: worldProgress.completedSessions + 1,
      },
    },
    activities: {
      ...state.activities,
      [activityKey]: {
        completedSessions: activityProgress.completedSessions + 1,
        bestScore: Math.max(activityProgress.bestScore, event.score),
        bestStars: Math.max(
          activityProgress.bestStars,
          scoreToStars(event.score),
        ),
        lastCompletedAt: now,
      },
    },
  };
};

const applySessionCompletion = (
  state: GameState,
  event: SessionCompletionProgressEvent,
) => {
  const worldProgress =
    state.worlds[event.worldId] ?? createEmptyWorldProgress();
  return {
    ...state,
    worlds: {
      ...state.worlds,
      [event.worldId]: {
        ...worldProgress,
        collectedWordIds: [
          ...new Set([
            ...worldProgress.collectedWordIds,
            ...event.words.map((word) => word.id),
          ]),
        ],
        completedSessions: worldProgress.completedSessions + 1,
      },
    },
  };
};

const applyReviewCompletion = (
  state: GameState,
  event: ReviewCompletionProgressEvent,
  now: string,
) => {
  const activityKey = `review:${event.activityType}`;
  const progress = state.activities[activityKey] ?? {
    completedSessions: 0,
    bestScore: 0,
    bestStars: 0,
  };
  return {
    ...state,
    activities: {
      ...state.activities,
      [activityKey]: {
        completedSessions: progress.completedSessions + 1,
        bestScore: Math.max(progress.bestScore, event.score),
        bestStars: Math.max(progress.bestStars, scoreToStars(event.score)),
        lastCompletedAt: now,
      },
    },
  };
};

export const applyProgressEvent = (
  state: GameState,
  event: ProgressEvent,
): GameState => {
  // A replay gets a new session ID and earns normal rewards. The same
  // persisted event ID is always a no-op, including duplicate completions.
  if (!event.id || state.processedEvents[event.id]) return state;
  const now = event.occurredAt ?? new Date().toISOString();
  let nextState: GameState;

  switch (event.kind) {
    case "answer":
      nextState = applyAnswer(state, event, now);
      break;
    case "seen":
      nextState = applySeen(state, event, now);
      break;
    case "activity-completion":
      nextState = applyActivityCompletion(state, event, now);
      break;
    case "session-completion":
      nextState = applySessionCompletion(state, event);
      break;
    case "review-completion":
      nextState = applyReviewCompletion(state, event, now);
      break;
  }

  return {
    ...nextState,
    processedEvents: rememberEvent(state, event, now),
  };
};

export const createProgressEventId = (
  sessionId: string,
  kind: "answer" | "seen" | "completion",
  subjectId: string,
) => `${sessionId}:${kind}:${subjectId}`;
