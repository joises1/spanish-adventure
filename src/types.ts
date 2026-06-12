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

export type Mode = "learn" | "flashcards" | "quiz" | "review";

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
  version: 1;
  xp: number;
  streak: number;
  lastActiveDate?: string;
  words: Record<string, AnswerRecord>;
  worlds: Record<string, WorldProgress>;
};
