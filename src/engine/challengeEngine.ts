import type {
  ActivityChoice,
  ActivityQuestion,
  ActivitySkill,
  VocabularyWord,
  World,
} from "../types";
import {
  dedupeQuestions,
  generateListeningQuestions,
  generateMultipleChoiceQuestions,
  generateSentenceBuilderQuestions,
  normalizeText,
  shuffle,
} from "./activityEngine.ts";
import {
  createSeededRandom,
  generateDialogueQuestions,
  generateStory,
} from "./narrativeEngine.ts";

const toChallengeQuestion = (
  question: ActivityQuestion,
  sequence: number,
): ActivityQuestion => ({
  ...question,
  id: `unit-challenge:${question.id}:${sequence}`,
  semanticKey: `unit-challenge:${question.semanticKey}:${sequence}`,
  activityType: "unit-challenge",
});

const grammarRepairQuestion = (
  world: World,
  random: () => number,
): ActivityQuestion | null => {
  const word = shuffle(
    world.words.filter((candidate) => candidate.example?.es),
    random,
  )[0];
  const sentence = word?.example?.es;
  if (!word || !sentence) return null;
  const tokens = sentence.trim().split(/\s+/);
  const swapped = [...tokens];
  if (swapped.length > 2) {
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  } else {
    swapped.reverse();
  }
  const incorrect = swapped.join(" ");
  const id = `unit-challenge:${world.id}:grammar:${word.id}`;
  const choices: ActivityChoice[] = shuffle(
    [
      { id: `${id}:correct`, text: sentence },
      { id: `${id}:swapped`, text: incorrect },
      { id: `${id}:missing`, text: tokens.slice(1).join(" ") },
    ],
    random,
  );

  return {
    id,
    semanticKey: `${id}:${normalizeText(sentence)}`,
    activityType: "unit-challenge",
    kind: "grammar-repair",
    conceptIds: [word.id],
    sourceWordIds: [word.id],
    sourceWorldId: world.id,
    skill: "grammar",
    prompt: `Repair this sentence: ${incorrect}`,
    answer: sentence,
    choices,
    correctChoiceId: `${id}:correct`,
    explanation: `The natural word order is «${sentence}»`,
    audioText: sentence,
  };
};

const storyComprehensionQuestion = (
  world: World,
  previousWords: readonly VocabularyWord[],
  seed: string,
  random: () => number,
): ActivityQuestion | null => {
  const story = generateStory(world, previousWords, seed);
  const finalConceptId = story.at(-1)?.sourceWordIds[0];
  const correctWord = [...world.words, ...previousWords].find(
    (word) => word.id === finalConceptId,
  );
  if (!correctWord) return null;
  const pool = shuffle(
    world.words.filter((word) => word.id !== correctWord.id),
    random,
  ).slice(0, 3);
  const id = `unit-challenge:${world.id}:story:${correctWord.id}`;
  const choices: ActivityChoice[] = shuffle(
    [correctWord, ...pool].map((word) => ({
      id: `${id}:choice:${word.id}`,
      text: word.es,
    })),
    random,
  );

  return {
    id,
    semanticKey: `${id}:${normalizeText(correctWord.es)}`,
    activityType: "unit-challenge",
    kind: "story-comprehension",
    conceptIds: story.flatMap((sentence) => sentence.sourceWordIds),
    sourceWordIds: story.flatMap((sentence) => sentence.sourceWordIds),
    sourceWorldId: world.id,
    skill: "story",
    prompt: "Which expression does Elena remember at the end?",
    answer: correctWord.es,
    choices,
    correctChoiceId: `${id}:choice:${correctWord.id}`,
    storySentences: story,
    explanation: `The final sentence says that Elena remembers «${correctWord.es}».`,
  };
};

export const generateUnitChallenge = (
  world: World,
  previouslyLearnedWords: readonly VocabularyWord[] = [],
  seed = `${world.id}:unit-challenge`,
) => {
  const random = createSeededRandom(seed);
  const vocabulary = generateMultipleChoiceQuestions(world, 2, random).map(
    (question, index) =>
      toChallengeQuestion(
        { ...question, skill: "vocabulary" as ActivitySkill },
        index,
      ),
  );
  const listening = generateListeningQuestions(world, 2, random).map(
    (question, index) =>
      toChallengeQuestion(
        { ...question, skill: "listening" as ActivitySkill },
        index,
      ),
  );
  const sentences = generateSentenceBuilderQuestions(world, 2, random).map(
    (question, index) =>
      toChallengeQuestion(
        { ...question, skill: "sentence-building" as ActivitySkill },
        index,
      ),
  );
  const grammar = grammarRepairQuestion(world, random);
  const dialogue = generateDialogueQuestions(
    world,
    previouslyLearnedWords,
    `${seed}:dialogue`,
  )
    .filter(
      (question) =>
        question.kind === "dialogue-choice" ||
        question.kind === "dialogue-fill",
    )
    .slice(0, 2)
    .map((question, index) => toChallengeQuestion(question, index));
  const story = storyComprehensionQuestion(
    world,
    previouslyLearnedWords,
    `${seed}:story`,
    random,
  );

  return dedupeQuestions(
    shuffle(
      [
        ...vocabulary,
        ...listening,
        ...sentences,
        ...(grammar ? [grammar] : []),
        ...dialogue,
        ...(story ? [story] : []),
      ],
      random,
    ),
    10,
  );
};
