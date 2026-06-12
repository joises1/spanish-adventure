import { BookMarked, CalendarCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { MixedQuestionCard } from "../components/MixedQuestionCard";
import { SessionResults } from "../components/SessionResults";
import {
  generateAdaptiveReviewQuestions,
  selectAdaptiveReviewConcepts,
} from "../engine/adaptiveReviewEngine";
import { scoreToStars } from "../engine/activityEngine";
import { ModeShell } from "../screens/LearnMode";
import { useGame } from "../state/GameContext";
import type { Course, VocabularyWord } from "../types";
import { getSessionScore } from "./activityHelpers";

type AdaptiveReviewActivityProps = {
  course: Course;
  mode: "daily" | "mistakes";
  onBack: () => void;
  onComplete: () => void;
};

export function AdaptiveReviewActivity({
  course,
  mode,
  onBack,
  onComplete,
}: AdaptiveReviewActivityProps) {
  const { completeReview, recordActivityAnswer, state } = useGame();
  const [concepts] = useState(() =>
    selectAdaptiveReviewConcepts(
      course.worlds,
      state,
      mode,
      mode === "daily" ? 8 : 10,
    ),
  );
  const [questions] = useState(() =>
    generateAdaptiveReviewQuestions(
      concepts,
      mode,
      `${course.id}:${mode}:${Date.now()}`,
    ),
  );
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [sessionStartXp] = useState(() => state.xp);
  const question = questions[index];
  const shellWorld = concepts[0]?.world ?? course.worlds[0];

  const recordResult = (isCorrect: boolean) => {
    if (!question) return;
    const concept = concepts.find(
      (item) => item.word.id === question.sourceWordIds[0],
    );
    const words: VocabularyWord[] = concept ? [concept.word] : [];
    recordActivityAnswer(
      question.sourceWorldId ?? concept?.world.id ?? shellWorld.id,
      mode === "daily" ? "daily-review" : "mistake-review",
      words,
      isCorrect,
    );
    setCorrectCount((current) => current + (isCorrect ? 1 : 0));
  };

  const continueSession = () => {
    if (index >= questions.length - 1) {
      const score = getSessionScore(correctCount, questions.length);
      completeReview(
        mode === "daily" ? "daily-review" : "mistake-review",
        score,
      );
      setFinished(true);
      return;
    }
    setIndex((current) => current + 1);
  };

  if (!shellWorld || !question) {
    return (
      <ModeShell
        world={course.worlds[0]}
        title={mode === "daily" ? "Daily Review" : "Mistake Replay"}
        subtitle="Your review queue is clear"
        onBack={onBack}
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
        isLast={index === questions.length - 1}
      />
    </ModeShell>
  );
}
