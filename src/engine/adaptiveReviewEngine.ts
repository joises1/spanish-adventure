import type {
  ActivityChoice,
  ActivityQuestion,
  GameState,
  VocabularyWord,
  World,
} from "../types";
import {
  dedupeQuestions,
  normalizeText,
  shuffle,
} from "./activityEngine.ts";
import { getConceptMastery } from "./mastery.ts";
import { createSeededRandom } from "./narrativeEngine.ts";

export type ReviewConcept = {
  word: VocabularyWord;
  world: World;
  priority: number;
};

const ageInDays = (isoDate: string | undefined, now: Date) => {
  if (!isoDate) return 365;
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return 365;
  return Math.max(0, (now.getTime() - timestamp) / 86_400_000);
};

export const selectAdaptiveReviewConcepts = (
  worlds: readonly World[],
  state: GameState,
  mode: "daily" | "mistakes",
  count = 8,
  now = new Date(),
  selectedConceptIds?: ReadonlySet<string>,
) => {
  const learnedIds = new Set(
    Object.values(state.worlds).flatMap((progress) => [
      ...(progress.learnedWordIds ?? []),
      ...(progress.collectedWordIds ?? []),
    ]),
  );

  return worlds
    .flatMap((world) =>
      world.words.map((word): ReviewConcept | null => {
        const mastery = state.mastery[word.id];
        const mistake = state.mistakes[word.id];
        const legacyIncorrect = state.words[word.id]?.incorrect ?? 0;
        if (selectedConceptIds && !selectedConceptIds.has(word.id)) {
          return null;
        }
        if (
          mode === "mistakes" &&
          !selectedConceptIds &&
          ((!mistake && legacyIncorrect === 0) ||
            mistake?.status === "resolved")
        ) {
          return null;
        }
        if (
          mode === "daily" &&
          !learnedIds.has(word.id) &&
          !mastery &&
          !mistake
        ) {
          return null;
        }

        const masteryEstimate = getConceptMastery(mastery, now);
        const age = ageInDays(mastery?.lastPracticedAt, now);
        const incorrectCount = Math.max(
          mistake?.incorrectCount ?? 0,
          legacyIncorrect,
          mastery?.incorrectCount ?? 0,
        );
        const recentMasteryPenalty =
          masteryEstimate >= 85 && age < 7 ? 220 : 0;
        const mistakeStatusBoost =
          mistake?.status === "new"
            ? 45
            : mistake?.status === "practicing"
              ? 30
              : mistake?.status === "improved"
                ? 8
                : -180;
        const priority =
          (100 - masteryEstimate) * 2 +
          Math.min(90, age) +
          incorrectCount * 18 -
          recentMasteryPenalty +
          mistakeStatusBoost;
        return { word, world, priority };
      }),
    )
    .filter((concept): concept is ReviewConcept => Boolean(concept))
    .sort(
      (first, second) =>
        second.priority - first.priority ||
        first.word.id.localeCompare(second.word.id),
    )
    .slice(0, Math.min(10, Math.max(5, count)));
};

const createChoices = (
  id: string,
  correct: VocabularyWord,
  pool: readonly VocabularyWord[],
  random: () => number,
) => {
  const seen = new Set([normalizeText(correct.en)]);
  const distractors = shuffle(
    pool.filter((word) => word.id !== correct.id),
    random,
  ).filter((word) => {
    const meaning = normalizeText(word.en);
    if (!meaning || seen.has(meaning)) return false;
    seen.add(meaning);
    return true;
  }).slice(0, 3);
  const choices: ActivityChoice[] = shuffle(
    [correct, ...distractors].map((word) => ({
      id: `${id}:choice:${word.id}`,
      text: word.en,
    })),
    random,
  );
  return {
    choices,
    correctChoiceId: `${id}:choice:${correct.id}`,
  };
};

const sentenceTokens = (id: string, sentence: string, random: () => number) =>
  shuffle(
    sentence.split(/\s+/).map((text, index) => ({
      id: `${id}:token:${index}`,
      text,
    })),
    random,
  );

export const generateAdaptiveReviewQuestions = (
  concepts: readonly ReviewConcept[],
  mode: "daily" | "mistakes",
  seed = `${mode}:review`,
) => {
  const random = createSeededRandom(seed);
  const pool = concepts.map((concept) => concept.word);
  const questions = concepts.map((concept, index): ActivityQuestion => {
    const { word, world } = concept;
    const activityType =
      mode === "daily" ? "daily-review" : "mistake-review";
    const baseId = `${activityType}:${world.id}:${word.id}`;
    const pattern = index % 4;

    if (pattern === 1) {
      return {
        id: `${baseId}:listening`,
        semanticKey: `${baseId}:listening:${normalizeText(word.es)}`,
        activityType,
        kind: "listening-choice",
        conceptIds: [word.id],
        sourceWordIds: [word.id],
        sourceWorldId: world.id,
        skill: "listening",
        prompt: word.es,
        answer: word.en,
        audioText: word.es,
        ...createChoices(`${baseId}:listening`, word, pool, random),
        explanation: `«${word.es}» means “${word.en}.”`,
      };
    }

    if (pattern === 2 && word.example) {
      const sentence = word.example.es;
      return {
        id: `${baseId}:sentence`,
        semanticKey: `${baseId}:sentence:${normalizeText(sentence)}`,
        activityType,
        kind: "sentence-builder",
        conceptIds: [word.id],
        sourceWordIds: [word.id],
        sourceWorldId: world.id,
        skill: "sentence-building",
        prompt: word.example.en,
        answer: sentence,
        audioText: sentence,
        tokens: sentenceTokens(`${baseId}:sentence`, sentence, random),
        explanation: `The complete sentence is «${sentence}»`,
      };
    }

    if (pattern === 3 && word.example) {
      const sentence = word.example.es;
      const tokens = sentence.split(/\s+/);
      const broken = tokens.length > 2
        ? [tokens[1], tokens[0], ...tokens.slice(2)].join(" ")
        : [...tokens].reverse().join(" ");
      const id = `${baseId}:grammar`;
      const choices: ActivityChoice[] = shuffle(
        [
          { id: `${id}:correct`, text: sentence },
          { id: `${id}:broken`, text: broken },
        ],
        random,
      );
      return {
        id,
        semanticKey: `${id}:${normalizeText(sentence)}`,
        activityType,
        kind: "grammar-repair",
        conceptIds: [word.id],
        sourceWordIds: [word.id],
        sourceWorldId: world.id,
        skill: "grammar",
        prompt: `Choose the repaired sentence: ${broken}`,
        answer: sentence,
        choices,
        correctChoiceId: `${id}:correct`,
        explanation: `The correct order is «${sentence}»`,
      };
    }

    return {
      id: `${baseId}:vocabulary`,
      semanticKey: `${baseId}:vocabulary:${normalizeText(word.es)}`,
      activityType,
      kind: "multiple-choice",
      conceptIds: [word.id],
      sourceWordIds: [word.id],
      sourceWorldId: world.id,
      skill: "vocabulary",
      prompt: `What does «${word.es}» mean?`,
      answer: word.en,
      audioText: word.es,
      ...createChoices(`${baseId}:vocabulary`, word, pool, random),
      explanation: `«${word.es}» means “${word.en}.”`,
    };
  });

  return dedupeQuestions(questions, 10);
};
