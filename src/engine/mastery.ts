import type {
  ActivityQuestion,
  ActivitySkill,
  ActivityType,
  ConceptMastery,
  CourseId,
  GameState,
  MasteryDimension,
  MasteryResponseMode,
  MasterySkill,
  World,
} from "../types";

export type MasteryEvidence = {
  courseId?: CourseId;
  worldId?: string;
  unit?: number;
  activityType?: ActivityType;
  skill: MasterySkill;
  responseMode: MasteryResponseMode;
  isCorrect: boolean;
  isRetry: boolean;
  isReview: boolean;
  practicedAt: string;
};

const SKILL_WEIGHTS: Record<MasterySkill, number> = {
  vocabulary: 0.7,
  listening: 0.9,
  "sentence-building": 1,
  grammar: 1,
  dialogue: 0.9,
};

const RESPONSE_WEIGHTS: Record<MasteryResponseMode, number> = {
  recognition: 0.85,
  recall: 1,
  context: 0.95,
};

export const toMasterySkill = (
  skill: ActivitySkill | undefined,
  activityType?: ActivityType,
): MasterySkill | null => {
  if (skill === "story") return "dialogue";
  if (skill) return skill;
  if (activityType === "listening") return "listening";
  if (activityType === "sentence-builder") return "sentence-building";
  if (activityType === "grammar-repair") return "grammar";
  if (activityType === "dialogue") return "dialogue";
  if (activityType === "story-shuffle") return null;
  return "vocabulary";
};

export const getQuestionMasteryEvidence = (
  question: ActivityQuestion,
) => {
  if (question.kind === "story-order") return null;
  const skill = toMasterySkill(question.skill, question.activityType);
  if (!skill) return null;
  const responseMode: MasteryResponseMode =
    question.kind === "sentence-builder" ||
    question.kind === "grammar-repair"
      ? "recall"
      : question.kind.startsWith("dialogue-") ||
          question.kind === "story-comprehension"
        ? "context"
        : "recognition";
  return { skill, responseMode };
};

const clamp = (value: number, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, value));

const ageInDays = (timestamp: string | undefined, now: Date) => {
  if (!timestamp) return 365;
  const practicedAt = new Date(timestamp).getTime();
  if (!Number.isFinite(practicedAt)) return 365;
  return Math.max(0, (now.getTime() - practicedAt) / 86_400_000);
};

const recencyFactor = (timestamp: string | undefined, now: Date) => {
  const age = ageInDays(timestamp, now);
  if (age <= 14) return 1;
  if (age <= 30) return 0.95;
  if (age <= 90) return 0.85;
  return 0.75;
};

export const createEmptyMasteryDimension = (): MasteryDimension => ({
  attempts: 0,
  firstAttemptCorrect: 0,
  retryCorrect: 0,
  incorrectCount: 0,
  weightedEarned: 0,
  weightedPossible: 0,
});

export const createEmptyConceptMastery = (): ConceptMastery => ({
  seenCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  masteryEstimate: 0,
  skills: {},
});

export const getDimensionMastery = (
  dimension: MasteryDimension | undefined,
  now = new Date(),
) => {
  if (!dimension || dimension.weightedPossible <= 0) return 0;
  const accuracy = clamp(
    dimension.weightedEarned / dimension.weightedPossible,
    0,
    1,
  );
  const confidence = clamp(dimension.weightedPossible / 4, 0, 1);
  return Math.round(
    clamp(
      accuracy *
        confidence *
        recencyFactor(dimension.lastPracticedAt, now) *
        100,
    ),
  );
};

export const getConceptMastery = (
  mastery: ConceptMastery | undefined,
  now = new Date(),
) => {
  if (!mastery) return 0;
  const dimensions = Object.values(mastery.skills ?? {}).filter(
    (dimension): dimension is MasteryDimension => Boolean(dimension),
  );
  if (dimensions.length === 0) {
    return clamp(mastery.masteryEstimate);
  }
  const possible = dimensions.reduce(
    (total, dimension) => total + dimension.weightedPossible,
    0,
  );
  if (possible <= 0) return 0;
  const weightedScore = dimensions.reduce(
    (total, dimension) =>
      total +
      getDimensionMastery(dimension, now) * dimension.weightedPossible,
    0,
  );
  return Math.round(clamp(weightedScore / possible));
};

export const applyMasteryEvidence = (
  current: ConceptMastery | undefined,
  evidence: MasteryEvidence,
) => {
  const mastery = current ?? createEmptyConceptMastery();
  const dimension =
    mastery.skills?.[evidence.skill] ?? createEmptyMasteryDimension();
  const baseWeight =
    SKILL_WEIGHTS[evidence.skill] *
    RESPONSE_WEIGHTS[evidence.responseMode] *
    (evidence.isReview ? 1.15 : 1);
  const possibleWeight = baseWeight * (evidence.isRetry ? 0.5 : 1);
  const earnedWeight = evidence.isCorrect
    ? possibleWeight * (evidence.isRetry ? 0.6 : 1)
    : 0;
  const nextDimension: MasteryDimension = {
    attempts: dimension.attempts + 1,
    firstAttemptCorrect:
      dimension.firstAttemptCorrect +
      (evidence.isCorrect && !evidence.isRetry ? 1 : 0),
    retryCorrect:
      dimension.retryCorrect +
      (evidence.isCorrect && evidence.isRetry ? 1 : 0),
    incorrectCount:
      dimension.incorrectCount + (evidence.isCorrect ? 0 : 1),
    weightedEarned: dimension.weightedEarned + earnedWeight,
    weightedPossible: dimension.weightedPossible + possibleWeight,
    lastPracticedAt: evidence.practicedAt,
  };
  const next: ConceptMastery = {
    courseId: evidence.courseId ?? mastery.courseId,
    worldId: evidence.worldId ?? mastery.worldId,
    unit: evidence.unit ?? mastery.unit,
    lastActivityType:
      evidence.activityType ?? mastery.lastActivityType,
    seenCount: mastery.seenCount + 1,
    correctCount: mastery.correctCount + (evidence.isCorrect ? 1 : 0),
    incorrectCount:
      mastery.incorrectCount + (evidence.isCorrect ? 0 : 1),
    lastPracticedAt: evidence.practicedAt,
    masteryEstimate: 0,
    skills: {
      ...(mastery.skills ?? {}),
      [evidence.skill]: nextDimension,
    },
  };
  return {
    ...next,
    masteryEstimate: getConceptMastery(
      next,
      new Date(evidence.practicedAt),
    ),
  };
};

export const getWorldMastery = (
  state: GameState,
  world: World,
  now = new Date(),
) =>
  Math.round(
    world.words.reduce(
      (total, word) =>
        total + getConceptMastery(state.mastery[word.id], now),
      0,
    ) / Math.max(1, world.words.length),
  );

export const getWorldSkillMastery = (
  state: GameState,
  world: World,
  skill: MasterySkill,
  now = new Date(),
) => {
  const dimensions = world.words
    .map((word) => state.mastery[word.id]?.skills?.[skill])
    .filter(
      (dimension): dimension is MasteryDimension => Boolean(dimension),
    );
  if (dimensions.length === 0) return 0;
  return Math.round(
    dimensions.reduce(
      (total, dimension) => total + getDimensionMastery(dimension, now),
      0,
    ) / dimensions.length,
  );
};
