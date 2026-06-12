export type Example = {
  es: string;
  en: string;
};

export type VocabularyWord = {
  id: string;
  es: string;
  en: string;
  example?: Example;
  sourcePage?: number;
  tags?: string[];
};

export type World = {
  id: string;
  unit: number;
  name: string;
  spanishName: string;
  description: string;
  color: string;
  accent: string;
  icon: string;
  words: VocabularyWord[];
};

export type CourseId = "a1-a2" | "b1";

export type Course = {
  id: CourseId;
  level: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  accent: string;
  worlds: World[];
};

export type Mode = "learn" | "flashcards" | "quiz" | "review";

export type ActivityType =
  | "explore"
  | "multiple-choice"
  | "matching"
  | "listening"
  | "sentence-builder"
  | "grammar-repair"
  | "dialogue"
  | "story-shuffle"
  | "unit-challenge"
  | "daily-review"
  | "mistake-review";

export type ActivityQuestionKind =
  | "explore-card"
  | "multiple-choice"
  | "matching-pair"
  | "listening-choice"
  | "sentence-builder"
  | "dialogue-choice"
  | "dialogue-order"
  | "dialogue-fill"
  | "dialogue-listening"
  | "dialogue-role"
  | "story-order"
  | "story-comprehension"
  | "grammar-repair";

export type ActivityChoice = {
  id: string;
  text: string;
};

export type ActivityToken = {
  id: string;
  text: string;
};

export type DialogueTurn = {
  id: string;
  speaker: string;
  text: string;
  translation?: string;
  isLearnerTurn?: boolean;
};

export type StorySentence = {
  id: string;
  position: number;
  es: string;
  en: string;
  sourceWordIds: string[];
};

export type ActivitySkill =
  | "vocabulary"
  | "listening"
  | "sentence-building"
  | "grammar"
  | "dialogue"
  | "story";

export type ActivityQuestion = {
  id: string;
  semanticKey: string;
  activityType: ActivityType;
  kind: ActivityQuestionKind;
  conceptIds: string[];
  sourceWordIds: string[];
  prompt: string;
  answer: string;
  audioText?: string;
  choices?: ActivityChoice[];
  correctChoiceId?: string;
  tokens?: ActivityToken[];
  dialogueTurns?: DialogueTurn[];
  storySentences?: StorySentence[];
  orderedItemIds?: string[];
  sourceWorldId?: string;
  skill?: ActivitySkill;
  explanation?: string;
  isRetry?: boolean;
};

export type ProgressConcept = {
  word: VocabularyWord;
  worldId: string;
};

export type ProcessedProgressEvent = {
  kind:
    | "answer"
    | "seen"
    | "activity-completion"
    | "session-completion"
    | "review-completion";
  processedAt: string;
};

export type ActivityDefinition = {
  type: ActivityType;
  title: string;
  description: string;
  durationMinutes: number;
  interactionCount: number;
  xpReward: number;
  available: boolean;
};

export type ActivitySession = {
  id: string;
  activityType: ActivityType;
  worldId: string;
  questions: ActivityQuestion[];
  currentIndex: number;
  correctCount: number;
  answeredCount: number;
  retryCounts: Record<string, number>;
  startedAt: string;
};

export type ActivityResult = {
  activityType: ActivityType;
  worldId: string;
  questionCount: number;
  correctCount: number;
  score: number;
  stars: number;
  xpGained: number;
  conceptIds: string[];
  completedAt: string;
};

export type ConceptMastery = {
  seenCount: number;
  correctCount: number;
  incorrectCount: number;
  lastPracticedAt?: string;
  masteryEstimate: number;
};

export type ActivityProgress = {
  completedSessions: number;
  bestScore: number;
  bestStars: number;
  lastCompletedAt?: string;
};

export type MistakeRecord = {
  conceptId: string;
  worldId: string;
  activityType: ActivityType;
  incorrectCount: number;
  lastIncorrectAt: string;
  correctedAnswer: string;
  example?: Example;
};

export type AnswerRecord = {
  correct: number;
  incorrect: number;
  lastSeen?: string;
};

export type WorldProgress = {
  learnedWordIds: string[];
  collectedWordIds: string[];
  completedSessions: number;
  quizAnswers: number;
  quizCorrect: number;
};

export type GameState = {
  version: 4;
  xp: number;
  streak: number;
  lastActiveDate?: string;
  words: Record<string, AnswerRecord>;
  worlds: Record<string, WorldProgress>;
  activities: Record<string, ActivityProgress>;
  mastery: Record<string, ConceptMastery>;
  mistakes: Record<string, MistakeRecord>;
  processedEvents: Record<string, ProcessedProgressEvent>;
};
