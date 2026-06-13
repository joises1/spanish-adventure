import type {
  ActivityType,
  CourseId,
  MasterySkill,
  MistakeRecord,
  ProgressConcept,
} from "../types";

export type MistakeEvidence = {
  courseId: CourseId;
  concept: ProgressConcept;
  activityType: ActivityType;
  skill: MasterySkill;
  isCorrect: boolean;
  isRetry: boolean;
  isReview: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  practicedAt: string;
};

const nextIncorrectStatus = (
  current: MistakeRecord | undefined,
): MistakeRecord["status"] => {
  if (!current) return "new";
  if (current.status === "resolved") return "resolved";
  return "practicing";
};

export const applyMistakeEvidence = (
  current: MistakeRecord | undefined,
  evidence: MistakeEvidence,
): MistakeRecord | undefined => {
  if (!current && evidence.isCorrect) return undefined;

  if (!evidence.isCorrect) {
    const pendingReopenErrors =
      current?.status === "resolved"
        ? (current.reopenErrors ?? 0) + 1
        : 0;
    const reopens = current?.status === "resolved" && pendingReopenErrors >= 2;
    return {
      conceptId: evidence.concept.word.id,
      courseId: evidence.courseId,
      worldId: evidence.concept.worldId,
      unit: evidence.concept.unit ?? current?.unit ?? 0,
      activityType: evidence.activityType,
      skill: evidence.skill,
      status: reopens ? "practicing" : nextIncorrectStatus(current),
      userAnswer: evidence.userAnswer,
      correctAnswer: evidence.correctAnswer,
      explanation: evidence.explanation,
      incorrectCount: (current?.incorrectCount ?? 0) + 1,
      consecutiveErrors: reopens
        ? 2
        : current?.status === "resolved"
          ? current.consecutiveErrors
          : (current?.consecutiveErrors ?? 0) + 1,
      consecutiveSuccesses: reopens
        ? 0
        : current?.status === "resolved"
          ? current.consecutiveSuccesses
          : 0,
      successfulReviews: reopens
        ? 0
        : (current?.successfulReviews ?? 0),
      reopenErrors: reopens ? 0 : pendingReopenErrors,
      reopenedCount:
        (current?.reopenedCount ?? 0) + (reopens ? 1 : 0),
      lastIncorrectAt: evidence.practicedAt,
      lastPracticedAt: evidence.practicedAt,
      resolvedAt: reopens ? undefined : current?.resolvedAt,
      example: evidence.concept.word.example,
    };
  }

  if (!current) return undefined;
  if (current.status === "resolved") {
    return {
      ...current,
      lastPracticedAt: evidence.practicedAt,
      reopenErrors: 0,
    };
  }
  if (evidence.isRetry) {
    return {
      ...current,
      status: current.status === "new" ? "practicing" : current.status,
      lastPracticedAt: evidence.practicedAt,
    };
  }

  const consecutiveSuccesses = current.consecutiveSuccesses + 1;
  const successfulReviews =
    current.successfulReviews + (evidence.isReview ? 1 : 0);
  const resolved =
    consecutiveSuccesses >= 3 ||
    (consecutiveSuccesses >= 2 && successfulReviews >= 1);
  return {
    ...current,
    status: resolved ? "resolved" : "improved",
    consecutiveErrors: 0,
    consecutiveSuccesses,
    successfulReviews,
    reopenErrors: 0,
    lastPracticedAt: evidence.practicedAt,
    resolvedAt: resolved ? evidence.practicedAt : undefined,
  };
};
