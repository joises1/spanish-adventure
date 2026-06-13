import type {
  ActivityQuestion,
  ProgressConcept,
  VocabularyWord,
  World,
} from "../types";
import { getQuestionMasteryEvidence } from "../engine/mastery";

export const getQuestionWords = (
  world: World,
  question: ActivityQuestion,
) =>
  question.sourceWordIds
    .map((wordId) => world.words.find((word) => word.id === wordId))
    .filter((word): word is VocabularyWord => Boolean(word));

export const getQuestionConcepts = (
  worlds: readonly World[],
  fallbackWorld: World,
  question: ActivityQuestion,
): ProgressConcept[] =>
  question.sourceWordIds
    .map((wordId) => {
      const sourceWorld =
        worlds.find((world) =>
          world.words.some((word) => word.id === wordId),
        ) ?? fallbackWorld;
      const word = sourceWorld.words.find((candidate) => candidate.id === wordId);
      return word
        ? { word, worldId: sourceWorld.id, unit: sourceWorld.unit }
        : undefined;
    })
    .filter(
      (
        concept,
      ): concept is {
        word: VocabularyWord;
        worldId: string;
        unit: number;
      } => Boolean(concept),
    );

export const getSessionWords = (
  world: World,
  questions: readonly ActivityQuestion[],
) => {
  const wordIds = new Set(
    questions.flatMap((question) => question.sourceWordIds),
  );
  return world.words.filter((word) => wordIds.has(word.id));
};

export const getNewlyCollectedWords = (
  words: readonly VocabularyWord[],
  initialCollectedIds: ReadonlySet<string>,
) => words.filter((word) => !initialCollectedIds.has(word.id));

export const getSessionScore = (correct: number, answered: number) =>
  answered > 0 ? Math.round((correct / answered) * 100) : 0;

export const getAnswerEvidence = (
  question: ActivityQuestion,
  userAnswer: string,
) => {
  const mastery = getQuestionMasteryEvidence(question);
  return mastery
    ? {
        ...mastery,
        isRetry: Boolean(question.isRetry),
        userAnswer,
        correctAnswer: question.answer,
        explanation:
          question.explanation ?? `The correct answer is ${question.answer}.`,
      }
    : null;
};
