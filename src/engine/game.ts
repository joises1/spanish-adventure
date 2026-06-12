import type {
  AnswerRecord,
  GameState,
  VocabularyWord,
  World,
  WorldProgress,
} from "../types";

export const EMPTY_WORLD_PROGRESS: WorldProgress = {
  learnedWordIds: [],
  quizAnswers: 0,
  quizCorrect: 0,
};

export const getWorldProgress = (state: GameState, worldId: string) =>
  state.worlds[worldId] ?? EMPTY_WORLD_PROGRESS;

export const getCompletion = (state: GameState, world: World) => {
  const progress = getWorldProgress(state, world.id);
  const answeredIds = world.words
    .filter((word) => state.words[word.id])
    .map((word) => word.id);
  const touched = new Set([...progress.learnedWordIds, ...answeredIds]).size;
  return Math.round((touched / world.words.length) * 100);
};

export const getAccuracy = (state: GameState, world: World) => {
  const progress = getWorldProgress(state, world.id);
  if (!progress.quizAnswers) return 0;
  return Math.round((progress.quizCorrect / progress.quizAnswers) * 100);
};

export const getStars = (state: GameState, world: World) => {
  const completion = getCompletion(state, world);
  const accuracy = getAccuracy(state, world);
  if (completion >= 90 && accuracy >= 85) return 3;
  if (completion >= 55 && accuracy >= 70) return 2;
  if (completion >= 20 || accuracy >= 50) return 1;
  return 0;
};

export const getCurrentWorldIndex = (state: GameState, worlds: World[]) => {
  const firstUnclearedIndex = worlds.findIndex(
    (world) => getStars(state, world) === 0,
  );
  return firstUnclearedIndex === -1
    ? Math.max(0, worlds.length - 1)
    : firstUnclearedIndex;
};

const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

export const createChoices = (
  correctWord: VocabularyWord,
  pool: VocabularyWord[],
  count = 4,
) => {
  const distractors = shuffle(
    pool.filter(
      (word) => word.id !== correctWord.id && word.en !== correctWord.en,
    ),
  ).slice(0, Math.max(2, count - 1));

  return shuffle([correctWord, ...distractors]);
};

const difficultyScore = (record?: AnswerRecord) => {
  if (!record) return 0;
  const attempts = record.correct + record.incorrect;
  return record.incorrect * 4 + (attempts ? record.incorrect / attempts : 0);
};

export const getReviewWords = (state: GameState, world: World) => {
  const difficult = world.words
    .filter((word) => (state.words[word.id]?.incorrect ?? 0) > 0)
    .sort(
      (a, b) =>
        difficultyScore(state.words[b.id]) -
        difficultyScore(state.words[a.id]),
    );

  return difficult.length > 0 ? difficult : world.words.slice(0, 6);
};

export const createQuizQueue = (state: GameState, world: World) => {
  const difficultIds = new Set(getReviewWords(state, world).map((word) => word.id));
  const weighted = world.words.flatMap((word) =>
    difficultIds.has(word.id) ? [word, word] : [word],
  );
  return shuffle(weighted);
};

export const formatCount = (value: number, singular: string, plural?: string) =>
  `${value} ${value === 1 ? singular : (plural ?? `${singular}s`)}`;
