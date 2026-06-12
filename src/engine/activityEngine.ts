import type {
  ActivityChoice,
  ActivityDefinition,
  ActivityQuestion,
  ActivitySession,
  ActivityToken,
  ActivityType,
  VocabularyWord,
  World,
} from "../types";

export const MAX_SESSION_ITEMS = 10;
export const RETRY_GAP = 3;

type RandomSource = () => number;

export const createSessionId = (
  worldId: string,
  activityType: ActivityType,
) => {
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  return `${worldId}:${activityType}:${randomId}`;
};

export const ACTIVITY_DEFINITIONS: ActivityDefinition[] = [
  {
    type: "multiple-choice",
    title: "Quick Choice",
    description: "Choose the English meaning for a Spanish prompt.",
    durationMinutes: 3,
    interactionCount: 8,
    xpReward: 80,
    available: true,
  },
  {
    type: "explore",
    title: "Explore",
    description: "Meet useful words, meanings, examples, and sounds.",
    durationMinutes: 3,
    interactionCount: 8,
    xpReward: 16,
    available: true,
  },
  {
    type: "matching",
    title: "Match",
    description: "Pair Spanish cards with their English meanings.",
    durationMinutes: 3,
    interactionCount: 6,
    xpReward: 60,
    available: true,
  },
  {
    type: "listening",
    title: "Listening",
    description: "Listen in Spanish and choose the right meaning.",
    durationMinutes: 3,
    interactionCount: 8,
    xpReward: 80,
    available: true,
  },
  {
    type: "sentence-builder",
    title: "Sentence Builder",
    description: "Put shuffled tiles into a natural Spanish sentence.",
    durationMinutes: 4,
    interactionCount: 6,
    xpReward: 72,
    available: true,
  },
  {
    type: "grammar-repair",
    title: "Grammar Repair",
    description: "Spot and repair a small grammar mistake.",
    durationMinutes: 4,
    interactionCount: 6,
    xpReward: 75,
    available: false,
  },
  {
    type: "dialogue",
    title: "Dialogue",
    description: "Practice short choices inside a friendly conversation.",
    durationMinutes: 4,
    interactionCount: 6,
    xpReward: 75,
    available: true,
  },
  {
    type: "story-shuffle",
    title: "Story Shuffle",
    description: "Arrange moments to rebuild a tiny Spanish story.",
    durationMinutes: 4,
    interactionCount: 6,
    xpReward: 80,
    available: true,
  },
  {
    type: "unit-challenge",
    title: "Unit Challenge",
    description: "Mix your skills in one cheerful final round.",
    durationMinutes: 4,
    interactionCount: 10,
    xpReward: 100,
    available: true,
  },
];

export const shuffle = <T,>(
  items: readonly T[],
  random: RandomSource = Math.random,
) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
};

export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[¿?¡!.,;:()[\]{}"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeSentence = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/[¿?¡!.,;:()[\]{}"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const uniqueWords = (words: readonly VocabularyWord[]) => {
  const seenIds = new Set<string>();
  const seenMeanings = new Set<string>();

  return words.filter((word) => {
    const meaningKey = `${normalizeText(word.es)}::${normalizeText(word.en)}`;
    if (seenIds.has(word.id) || seenMeanings.has(meaningKey)) return false;
    seenIds.add(word.id);
    seenMeanings.add(meaningKey);
    return true;
  });
};

const limitWords = (
  world: World,
  count: number,
  random: RandomSource,
  predicate: (word: VocabularyWord) => boolean = () => true,
) =>
  shuffle(uniqueWords(world.words).filter(predicate), random).slice(
    0,
    Math.min(count, MAX_SESSION_ITEMS),
  );

const createSemanticKey = (
  activityType: ActivityType,
  prompt: string,
  answer: string,
) =>
  `${activityType}:${normalizeText(prompt)}:${normalizeText(answer)}`;

const createBaseQuestion = (
  activityType: ActivityType,
  kind: ActivityQuestion["kind"],
  world: World,
  word: VocabularyWord,
  prompt: string,
  answer: string,
): ActivityQuestion => ({
  id: `${activityType}:${world.id}:${word.id}`,
  semanticKey: createSemanticKey(activityType, prompt, answer),
  activityType,
  kind,
  conceptIds: [word.id],
  sourceWordIds: [word.id],
  prompt,
  answer,
  explanation: word.example
    ? `${word.example.es} - ${word.example.en}`
    : `${word.es} means ${word.en}.`,
});

export const dedupeQuestions = (
  questions: readonly ActivityQuestion[],
  count = MAX_SESSION_ITEMS,
) => {
  const ids = new Set<string>();
  const semantics = new Set<string>();

  return questions.filter((question) => {
    if (ids.has(question.id) || semantics.has(question.semanticKey)) {
      return false;
    }
    ids.add(question.id);
    semantics.add(question.semanticKey);
    return true;
  }).slice(0, Math.min(count, MAX_SESSION_ITEMS));
};

const getChoicePool = (
  correctWord: VocabularyWord,
  words: readonly VocabularyWord[],
  random: RandomSource,
  count = 4,
) => {
  const seenMeanings = new Set([normalizeText(correctWord.en)]);
  const distractors = shuffle(
    uniqueWords(words).filter((word) => word.id !== correctWord.id),
    random,
  ).filter((word) => {
    const meaning = normalizeText(word.en);
    if (!meaning || seenMeanings.has(meaning)) return false;
    seenMeanings.add(meaning);
    return true;
  });

  return distractors.slice(0, Math.max(0, count - 1));
};

const chooseCorrectPosition = (
  optionCount: number,
  history: number[],
  random: RandomSource,
) => {
  if (optionCount <= 1) return 0;
  const previous = history.at(-1);
  const repeatedTwice =
    history.length >= 2 && previous === history.at(-2);
  const allowedPositions = Array.from(
    { length: optionCount },
    (_, index) => index,
  ).filter((position) => !repeatedTwice || position !== previous);
  return allowedPositions[Math.floor(random() * allowedPositions.length)] ?? 0;
};

const createChoiceQuestion = (
  activityType: "multiple-choice" | "listening",
  kind: "multiple-choice" | "listening-choice",
  world: World,
  word: VocabularyWord,
  positionHistory: number[],
  random: RandomSource,
) => {
  const prompt =
    activityType === "listening"
      ? word.es
      : `What does "${word.es}" mean?`;
  const question = createBaseQuestion(
    activityType,
    kind,
    world,
    word,
    prompt,
    word.en,
  );
  const distractors = getChoicePool(word, world.words, random);
  const optionCount = distractors.length + 1;
  const correctPosition = chooseCorrectPosition(
    optionCount,
    positionHistory,
    random,
  );
  const optionWords = [...distractors];
  optionWords.splice(correctPosition, 0, word);
  positionHistory.push(correctPosition);
  const choices: ActivityChoice[] = optionWords.map((option) => ({
    id: `${question.id}:choice:${option.id}`,
    text: option.en,
  }));

  return {
    ...question,
    audioText: word.es,
    choices,
    correctChoiceId: `${question.id}:choice:${word.id}`,
  };
};

export const generateExploreQuestions = (
  world: World,
  count = 8,
  random: RandomSource = Math.random,
) =>
  dedupeQuestions(
    limitWords(world, count, random).map((word) => {
      const question = createBaseQuestion(
        "explore",
        "explore-card",
        world,
        word,
        word.es,
        word.en,
      );
      return { ...question, audioText: word.es };
    }),
    count,
  );

export const generateMultipleChoiceQuestions = (
  world: World,
  count = 8,
  random: RandomSource = Math.random,
) => {
  const positionHistory: number[] = [];
  return dedupeQuestions(
    limitWords(world, count, random).map((word) =>
      createChoiceQuestion(
        "multiple-choice",
        "multiple-choice",
        world,
        word,
        positionHistory,
        random,
      ),
    ),
    count,
  );
};

export const generateListeningQuestions = (
  world: World,
  count = 8,
  random: RandomSource = Math.random,
) => {
  const positionHistory: number[] = [];
  return dedupeQuestions(
    limitWords(world, count, random).map((word) =>
      createChoiceQuestion(
        "listening",
        "listening-choice",
        world,
        word,
        positionHistory,
        random,
      ),
    ),
    count,
  );
};

export const generateMatchingQuestions = (
  world: World,
  count = 6,
  random: RandomSource = Math.random,
) =>
  dedupeQuestions(
    limitWords(world, count, random).map((word) =>
      createBaseQuestion(
        "matching",
        "matching-pair",
        world,
        word,
        word.es,
        word.en,
      ),
    ),
    count,
  );

const tokenizeSentence = (sentence: string) =>
  sentence
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

export const generateSentenceBuilderQuestions = (
  world: World,
  count = 6,
  random: RandomSource = Math.random,
) =>
  dedupeQuestions(
    limitWords(world, count, random, (word) => Boolean(word.example?.es)).map(
      (word) => {
        const answer = word.example?.es ?? word.es;
        const question = createBaseQuestion(
          "sentence-builder",
          "sentence-builder",
          world,
          word,
          word.example?.en ?? word.en,
          answer,
        );
        const tokens: ActivityToken[] = tokenizeSentence(answer).map(
          (text, index) => ({
            id: `${question.id}:token:${index}`,
            text,
          }),
        );
        return {
          ...question,
          audioText: answer,
          tokens: shuffle(tokens, random),
        };
      },
    ),
    count,
  );

export const generateActivityQuestions = (
  activityType: ActivityType,
  world: World,
  count?: number,
  random: RandomSource = Math.random,
) => {
  switch (activityType) {
    case "explore":
      return generateExploreQuestions(world, count, random);
    case "matching":
      return generateMatchingQuestions(world, count, random);
    case "listening":
      return generateListeningQuestions(world, count, random);
    case "sentence-builder":
      return generateSentenceBuilderQuestions(world, count, random);
    case "multiple-choice":
    case "unit-challenge":
      return generateMultipleChoiceQuestions(world, count, random);
    default:
      return [];
  }
};

export const createActivitySession = (
  activityType: ActivityType,
  world: World,
  random: RandomSource = Math.random,
): ActivitySession => {
  const definition = ACTIVITY_DEFINITIONS.find(
    (activity) => activity.type === activityType,
  );
  const questions = generateActivityQuestions(
    activityType,
    world,
    definition?.interactionCount,
    random,
  );

  return {
    id: createSessionId(world.id, activityType),
    activityType,
    worldId: world.id,
    questions,
    currentIndex: 0,
    correctCount: 0,
    answeredCount: 0,
    retryCounts: {},
    startedAt: new Date().toISOString(),
  };
};

export const scheduleDelayedRetry = (
  questions: readonly ActivityQuestion[],
  currentIndex: number,
  question: ActivityQuestion,
  retryNumber: number,
  maxItems = MAX_SESSION_ITEMS,
) => {
  if (questions.length >= maxItems) return [...questions];
  const availableGap = questions.length - currentIndex - 1;
  if (availableGap < RETRY_GAP) return [...questions];

  const retryQuestion: ActivityQuestion = {
    ...question,
    id: `${question.id}:retry:${retryNumber}`,
    semanticKey: `${question.semanticKey}:retry:${retryNumber}`,
    prompt: `Try this concept again: ${question.prompt}`,
    isRetry: true,
  };
  const insertAt = Math.min(
    questions.length,
    currentIndex + RETRY_GAP + 1,
  );
  const nextQuestions = [...questions];
  nextQuestions.splice(insertAt, 0, retryQuestion);
  return nextQuestions.slice(0, maxItems);
};

export const getActivityProgressKey = (
  worldId: string,
  activityType: ActivityType,
) => `${worldId}:${activityType}`;

export const scoreToStars = (score: number) => {
  if (score >= 90) return 3;
  if (score >= 70) return 2;
  if (score > 0) return 1;
  return 0;
};
