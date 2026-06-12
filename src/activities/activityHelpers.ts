import type {
  ActivityQuestion,
  VocabularyWord,
  World,
} from "../types";

export const getQuestionWords = (
  world: World,
  question: ActivityQuestion,
) =>
  question.sourceWordIds
    .map((wordId) => world.words.find((word) => word.id === wordId))
    .filter((word): word is VocabularyWord => Boolean(word));

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
