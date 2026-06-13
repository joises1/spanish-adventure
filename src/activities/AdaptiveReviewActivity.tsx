import { BookMarked, CalendarCheck, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { MixedQuestionCard } from "../components/MixedQuestionCard";
import { SessionResults } from "../components/SessionResults";
import {
  generateAdaptiveReviewQuestions,
  selectAdaptiveReviewConcepts,
} from "../engine/adaptiveReviewEngine";
import { scoreToStars } from "../engine/activityEngine";
import {
  getSnapshotNumber,
  getSnapshotQuestions,
  getSnapshotStringArray,
} from "../engine/sessionRecovery";
import { ModeShell } from "../screens/LearnMode";
import { useGame } from "../state/GameContext";
import { createProgressEventId } from "../state/progressEvents";
import { useRecoverableSession } from "../state/SessionContext";
import type { Course } from "../types";
import {
  getAnswerEvidence,
  getQuestionConcepts,
  getSessionScore,
} from "./activityHelpers";

type AdaptiveReviewActivityProps = {
  course: Course;
  mode: "daily" | "mistakes";
  selectedConceptIds?: string[];
  onBack: () => void;
  onBackToMap: () => void;
  onComplete: () => void;
};

export function AdaptiveReviewActivity({
  course,
  mode,
  selectedConceptIds,
  onBack,
  onBackToMap,
  onComplete,
}: AdaptiveReviewActivityProps) {
  const { completeReview, recordActivityAnswer, state } = useGame();
  const activityType =
    mode === "daily" ? "daily-review" : "mistake-review";
  const recovery = useRecoverableSession({
    courseId: course.id,
    activityType,
  });
  const sessionId = recovery.sessionId;
  const [concepts] = useState(() =>
    selectAdaptiveReviewConcepts(
      course.worlds,
      state,
      mode,
      mode === "daily" ? 8 : 10,
      new Date(),
      selectedConceptIds || recovery.restored
        ? new Set(
            getSnapshotStringArray(
              recovery.restored,
              "selectedConceptIds",
            ).length > 0
              ? getSnapshotStringArray(
                  recovery.restored,
                  "selectedConceptIds",
                )
              : selectedConceptIds,
          )
        : undefined,
    ),
  );
  const [questions] = useState(() => {
    const restored = getSnapshotQuestions(recovery.restored);
    return restored.length > 0
      ? restored
      : generateAdaptiveReviewQuestions(
      concepts,
      mode,
      recovery.seed,
    );
  });
  const [index, setIndex] = useState(() =>
    Math.min(
      Math.max(0, recovery.restored?.index ?? 0),
      Math.max(0, questions.length - 1),
    ),
  );
  const [correctCount, setCorrectCount] = useState(
    () => recovery.restored?.correctCount ?? 0,
  );
  const [draftTokenIds, setDraftTokenIds] = useState(() =>
    getSnapshotStringArray(recovery.restored, "draftTokenIds"),
  );
  const [finished, setFinished] = useState(
    () => recovery.restored?.status === "completed",
  );
  const [sessionStartXp] = useState(() =>
    getSnapshotNumber(recovery.restored, "sessionStartXp", state.xp),
  );
  const question = questions[index];
  const shellWorld = concepts[0]?.world ?? course.worlds[0];
  const submittedQuestionIds = useRef(new Set<string>());
  const completionStarted = useRef(false);
  const snapshotPayload = (nextDraftTokenIds = draftTokenIds) => ({
    questions,
    selectedConceptIds: concepts.map((concept) => concept.word.id),
    draftTokenIds: nextDraftTokenIds,
    sessionStartXp,
  });

  const recordResult = (isCorrect: boolean, userAnswer: string) => {
    if (!question || submittedQuestionIds.current.has(question.id)) return;
    submittedQuestionIds.current.add(question.id);
    recordActivityAnswer({
      kind: "answer",
      id: createProgressEventId(sessionId, "answer", question.id),
      activityType:
        mode === "daily" ? "daily-review" : "mistake-review",
      concepts: getQuestionConcepts(course.worlds, shellWorld, question),
      isCorrect,
      ...getAnswerEvidence(question, userAnswer),
    });
    recovery.checkpoint({
      index,
      total: questions.length,
      correctCount,
      answeredCount: index,
      meaningful: true,
      payload: snapshotPayload(),
    });
    setCorrectCount((current) => current + (isCorrect ? 1 : 0));
  };

  const continueSession = () => {
    if (completionStarted.current) return;
    if (index >= questions.length - 1) {
      const score = getSessionScore(correctCount, questions.length);
      completionStarted.current = true;
      completeReview({
        kind: "review-completion",
        id: createProgressEventId(sessionId, "completion", mode),
        activityType:
          mode === "daily" ? "daily-review" : "mistake-review",
        score,
      });
      recovery.checkpoint({
        index,
        total: questions.length,
        correctCount,
        answeredCount: questions.length,
        meaningful: false,
        status: "completed",
        payload: snapshotPayload([]),
      });
      setFinished(true);
      return;
    }
    const nextIndex = index + 1;
    recovery.checkpoint({
      index: nextIndex,
      total: questions.length,
      correctCount,
      answeredCount: nextIndex,
      meaningful: true,
      payload: snapshotPayload([]),
    });
    setDraftTokenIds([]);
    setIndex(nextIndex);
  };

  if (!shellWorld || !question) {
    return (
      <ModeShell
        world={course.worlds[0]}
        title={mode === "daily" ? "Daily Review" : "Mistake Replay"}
        subtitle="Your review queue is clear"
        onBack={onBack}
        onBackToMap={onBackToMap}
        backLabel="Back"
        icon={
          mode === "daily" ? (
            <CalendarCheck size={19} />
          ) : (
            <BookMarked size={19} />
          )
        }
      >
        <section className="activity-empty">
          <h2>
            {mode === "daily"
              ? "Complete an activity to build your review"
              : "No recorded mistakes to replay"}
          </h2>
          <p>
            Review only uses words already encountered in this course.
          </p>
          <button className="primary-button" onClick={onBack}>
            Back
          </button>
        </section>
      </ModeShell>
    );
  }

  if (finished) {
    const score = getSessionScore(correctCount, questions.length);
    return (
      <ModeShell
        world={shellWorld}
        title={mode === "daily" ? "Daily Review complete" : "Replay complete"}
        subtitle="Focused practice, finished"
        onBack={onBack}
        onBackToMap={onBackToMap}
        backLabel="Back"
        icon={
          mode === "daily" ? (
            <CalendarCheck size={19} />
          ) : (
            <BookMarked size={19} />
          )
        }
      >
        <SessionResults
          title={`${score}%`}
          message={`You reviewed ${questions.length} priority concept${questions.length === 1 ? "" : "s"} with a mix of activity types.`}
          stars={scoreToStars(score)}
          starsLabel="Review stars"
          xpGained={Math.max(0, state.xp - sessionStartXp)}
          learnedWords={[]}
          onContinue={onComplete}
        />
      </ModeShell>
    );
  }

  return (
    <ModeShell
      world={shellWorld}
      title={mode === "daily" ? "Daily Review" : "Mistake Replay"}
      subtitle={
        mode === "daily"
          ? "Low-mastery and older concepts come first"
          : "Focused practice from your Mistake Notebook"
      }
      onBack={onBack}
      onBackToMap={onBackToMap}
      backLabel="Back"
      icon={
        mode === "daily" ? (
          <CalendarCheck size={19} />
        ) : (
          <BookMarked size={19} />
        )
      }
      current={index + 1}
      total={questions.length}
    >
      <div className="review-priority-banner">
        <Sparkles size={16} aria-hidden="true" />
        <span>
          {mode === "daily"
            ? "Adapted from mastery and practice age"
            : "Built only from recorded mistakes"}
        </span>
      </div>
      <MixedQuestionCard
        key={question.id}
        question={question}
        onResult={recordResult}
        onContinue={continueSession}
        initialSelectedTokenIds={draftTokenIds}
        onDraftChange={(nextDraftTokenIds) => {
          setDraftTokenIds(nextDraftTokenIds);
          recovery.checkpoint({
            index,
            total: questions.length,
            correctCount,
            answeredCount: index,
            meaningful: nextDraftTokenIds.length > 0 || index > 0,
            payload: snapshotPayload(nextDraftTokenIds),
          });
        }}
        isLast={index === questions.length - 1}
      />
    </ModeShell>
  );
}
