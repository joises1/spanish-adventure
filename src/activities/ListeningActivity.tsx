import {
  ArrowRight,
  Check,
  Headphones,
  PlayCircle,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { SessionResults } from "../components/SessionResults";
import { SpeakerButton } from "../components/SpeakerButton";
import {
  createActivitySession,
  scheduleDelayedRetry,
  scoreToStars,
} from "../engine/activityEngine";
import { getWorldProgress } from "../engine/game";
import { createSeededRandom } from "../engine/narrativeEngine";
import {
  getSnapshotNumber,
  getSnapshotQuestions,
  getSnapshotStringArray,
} from "../engine/sessionRecovery";
import { ModeShell } from "../screens/LearnMode";
import { useGame } from "../state/GameContext";
import { createProgressEventId } from "../state/progressEvents";
import { useRecoverableSession } from "../state/SessionContext";
import type { CourseId, World } from "../types";
import {
  getAnswerEvidence,
  getNewlyCollectedWords,
  getQuestionConcepts,
  getSessionScore,
  getSessionWords,
} from "./activityHelpers";

type ListeningActivityProps = {
  courseId: CourseId;
  world: World;
  onBack: () => void;
  onBackToMap: () => void;
  onComplete: () => void;
};

export function ListeningActivity({
  courseId,
  world,
  onBack,
  onBackToMap,
  onComplete,
}: ListeningActivityProps) {
  const { completeActivity, recordActivityAnswer, state } = useGame();
  const recovery = useRecoverableSession({
    courseId,
    world,
    activityType: "listening",
  });
  const [session] = useState(() => ({
    ...createActivitySession(
      "listening",
      world,
      createSeededRandom(recovery.seed),
    ),
    id: recovery.sessionId,
  }));
  const [queue, setQueue] = useState(() => {
    const restored = getSnapshotQuestions(recovery.restored);
    return restored.length > 0 ? restored : session.questions;
  });
  const [index, setIndex] = useState(() =>
    Math.min(
      Math.max(0, recovery.restored?.index ?? 0),
      Math.max(0, queue.length - 1),
    ),
  );
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>();
  const [correctCount, setCorrectCount] = useState(
    () => recovery.restored?.correctCount ?? 0,
  );
  const [answeredCount, setAnsweredCount] = useState(
    () => recovery.restored?.answeredCount ?? 0,
  );
  const [finished, setFinished] = useState(
    () => recovery.restored?.status === "completed",
  );
  const [sessionStartXp] = useState(() =>
    getSnapshotNumber(recovery.restored, "sessionStartXp", state.xp),
  );
  const [initialCollectedIds] = useState(
    () => {
      const restoredIds = getSnapshotStringArray(
        recovery.restored,
        "initialCollectedIds",
      );
      return new Set(
        restoredIds.length > 0
          ? restoredIds
          : getWorldProgress(state, world.id).collectedWordIds,
      );
    },
  );
  const retryCounts = useRef<Record<string, number>>({});
  const submittedQuestionIds = useRef(new Set<string>());
  const completionStarted = useRef(false);
  const question = queue[index];
  const sessionWords = getSessionWords(world, queue);
  const isCorrect = selectedChoiceId === question?.correctChoiceId;
  const snapshotPayload = (questions = queue) => ({
    questions,
    sessionStartXp,
    initialCollectedIds: [...initialCollectedIds],
  });

  const choose = (choiceId: string) => {
    if (
      !question ||
      selectedChoiceId ||
      submittedQuestionIds.current.has(question.id)
    ) {
      return;
    }
    submittedQuestionIds.current.add(question.id);
    const correct = choiceId === question.correctChoiceId;
    setSelectedChoiceId(choiceId);
    setAnsweredCount((current) => current + 1);
    setCorrectCount((current) => current + (correct ? 1 : 0));
    recordActivityAnswer({
      kind: "answer",
      id: createProgressEventId(session.id, "answer", question.id),
      activityType: "listening",
      concepts: getQuestionConcepts([world], world, question),
      isCorrect: correct,
      ...getAnswerEvidence(
        question,
        question.choices?.find((choice) => choice.id === choiceId)?.text ?? "",
      ),
    });
    recovery.checkpoint({
      index,
      total: queue.length,
      correctCount,
      answeredCount,
      meaningful: true,
      payload: snapshotPayload(),
    });

    if (!correct && !question.isRetry) {
      const nextRetry = (retryCounts.current[question.id] ?? 0) + 1;
      retryCounts.current[question.id] = nextRetry;
      setQueue((current) =>
        scheduleDelayedRetry(
          current,
          index,
          question,
          nextRetry,
        ),
      );
    }
  };

  const next = () => {
    if (completionStarted.current) return;
    if (index >= queue.length - 1) {
      const score = getSessionScore(correctCount, answeredCount);
      completionStarted.current = true;
      completeActivity({
        kind: "activity-completion",
        id: createProgressEventId(session.id, "completion", "listening"),
        worldId: world.id,
        activityType: "listening",
        words: sessionWords,
        score,
      });
      recovery.checkpoint({
        index,
        total: queue.length,
        correctCount,
        answeredCount,
        meaningful: false,
        status: "completed",
        payload: snapshotPayload(),
      });
      setFinished(true);
      return;
    }
    const nextIndex = index + 1;
    recovery.checkpoint({
      index: nextIndex,
      total: queue.length,
      correctCount,
      answeredCount,
      meaningful: true,
      payload: snapshotPayload(),
    });
    setSelectedChoiceId(undefined);
    setIndex(nextIndex);
  };

  if (!question) {
    return (
      <ModeShell
        world={world}
        title="Listening"
        subtitle="This unit needs more words"
        onBack={onBack}
        onBackToMap={onBackToMap}
        icon={<Headphones size={19} />}
      >
        <section className="activity-empty">
          <h2>No listening questions available</h2>
          <button className="primary-button" onClick={onBack}>
            Back to activities
          </button>
        </section>
      </ModeShell>
    );
  }

  if (finished) {
    const score = getSessionScore(correctCount, answeredCount);
    return (
      <ModeShell
        world={world}
        title="Listening complete"
        subtitle="Your ear is getting sharper"
        onBack={onBack}
        onBackToMap={onBackToMap}
        icon={<Headphones size={19} />}
      >
        <SessionResults
          title={`${score}%`}
          message={`You completed ${answeredCount} short listening interactions.`}
          stars={scoreToStars(score)}
          starsLabel="Activity stars"
          xpGained={Math.max(0, state.xp - sessionStartXp)}
          learnedWords={getNewlyCollectedWords(
            sessionWords,
            initialCollectedIds,
          )}
          onContinue={onComplete}
        />
      </ModeShell>
    );
  }

  return (
    <ModeShell
      world={world}
      title="Listening"
      subtitle="Hear Spanish, then choose the meaning"
      onBack={onBack}
      onBackToMap={onBackToMap}
      icon={<Headphones size={19} />}
      current={index + 1}
      total={queue.length}
    >
      <section className="quiz-card listening-card">
        <span className="card-label">Listen carefully</span>
        <div className="listening-card__speaker">
          <SpeakerButton
            text={question.audioText ?? question.answer}
            label="Play or replay the Spanish audio"
          />
          <strong>
            <PlayCircle size={18} aria-hidden="true" />
            Play Spanish
          </strong>
        </div>
        <p>Which English meaning matches the Spanish audio?</p>

        <div className="choice-grid">
          {question.choices?.map((choice) => {
            const chosen = selectedChoiceId === choice.id;
            const correctChoice =
              Boolean(selectedChoiceId) &&
              choice.id === question.correctChoiceId;
            const wrongChoice = chosen && !correctChoice;
            return (
              <button
                className={`choice ${
                  correctChoice ? "choice--correct" : ""
                } ${wrongChoice ? "choice--wrong" : ""}`}
                key={choice.id}
                type="button"
                onClick={() => choose(choice.id)}
                disabled={Boolean(selectedChoiceId)}
              >
                <span>{choice.text}</span>
                {correctChoice && <Check size={19} aria-hidden="true" />}
                {wrongChoice && <X size={19} aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {selectedChoiceId && (
          <div
            className={`feedback ${
              isCorrect ? "feedback--correct" : "feedback--gentle"
            }`}
            aria-live="polite"
          >
            <span className="feedback__icon">
              {isCorrect ? <Check size={21} /> : <Headphones size={21} />}
            </span>
            <div>
              <strong>
                {isCorrect
                  ? "Nice listening!"
                  : "Almost. You will hear this concept again later."}
              </strong>
              {!isCorrect && <span>The answer is {question.answer}.</span>}
            </div>
            <button className="primary-button" onClick={next}>
              {index === queue.length - 1 ? "See result" : "Continue"}
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </section>
    </ModeShell>
  );
}
