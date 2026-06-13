import {
  ArrowRight,
  Check,
  RotateCcw,
  Sparkles,
  TextCursorInput,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { SessionResults } from "../components/SessionResults";
import { SpeakerButton } from "../components/SpeakerButton";
import {
  createActivitySession,
  normalizeSentence,
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
import type { ActivityToken, CourseId, World } from "../types";
import {
  getAnswerEvidence,
  getNewlyCollectedWords,
  getQuestionConcepts,
  getSessionScore,
  getSessionWords,
} from "./activityHelpers";

type SentenceBuilderActivityProps = {
  courseId: CourseId;
  world: World;
  onBack: () => void;
  onBackToMap: () => void;
  onComplete: () => void;
};

export function SentenceBuilderActivity({
  courseId,
  world,
  onBack,
  onBackToMap,
  onComplete,
}: SentenceBuilderActivityProps) {
  const { completeActivity, recordActivityAnswer, state } = useGame();
  const recovery = useRecoverableSession({
    courseId,
    world,
    activityType: "sentence-builder",
  });
  const [session] = useState(() => ({
    ...createActivitySession(
      "sentence-builder",
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
  const [selectedTokens, setSelectedTokens] = useState<ActivityToken[]>(
    () => {
      const selectedIds = new Set(
        getSnapshotStringArray(recovery.restored, "selectedTokenIds"),
      );
      return (
        queue[
          Math.min(
            Math.max(0, recovery.restored?.index ?? 0),
            Math.max(0, queue.length - 1),
          )
        ]?.tokens?.filter((token) => selectedIds.has(token.id)) ?? []
      );
    },
  );
  const [checked, setChecked] = useState(false);
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
  const builtSentence = selectedTokens.map((token) => token.text).join(" ");
  const isCorrect =
    checked &&
    normalizeSentence(builtSentence) === normalizeSentence(question?.answer ?? "");
  const sessionWords = getSessionWords(world, queue);
  const snapshotPayload = (
    questions = queue,
    tokens = selectedTokens,
  ) => ({
    questions,
    selectedTokenIds: tokens.map((token) => token.id),
    sessionStartXp,
    initialCollectedIds: [...initialCollectedIds],
  });

  const addToken = (token: ActivityToken) => {
    if (checked) return;
    const nextTokens = [...selectedTokens, token];
    setSelectedTokens(nextTokens);
    recovery.checkpoint({
      index,
      total: queue.length,
      correctCount,
      answeredCount,
      meaningful: true,
      payload: snapshotPayload(queue, nextTokens),
    });
  };

  const removeToken = (token: ActivityToken) => {
    if (checked) return;
    const nextTokens = selectedTokens.filter((item) => item.id !== token.id);
    setSelectedTokens(nextTokens);
    recovery.checkpoint({
      index,
      total: queue.length,
      correctCount,
      answeredCount,
      meaningful: nextTokens.length > 0 || answeredCount > 0,
      payload: snapshotPayload(queue, nextTokens),
    });
  };

  const checkSentence = () => {
    if (
      !question ||
      checked ||
      selectedTokens.length === 0 ||
      submittedQuestionIds.current.has(question.id)
    ) {
      return;
    }
    submittedQuestionIds.current.add(question.id);
    const correct =
      normalizeSentence(builtSentence) === normalizeSentence(question.answer);
    setChecked(true);
    setAnsweredCount((current) => current + 1);
    setCorrectCount((current) => current + (correct ? 1 : 0));
    recordActivityAnswer({
      kind: "answer",
      id: createProgressEventId(session.id, "answer", question.id),
      activityType: "sentence-builder",
      concepts: getQuestionConcepts([world], world, question),
      isCorrect: correct,
      ...getAnswerEvidence(question, builtSentence),
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
        id: createProgressEventId(
          session.id,
          "completion",
          "sentence-builder",
        ),
        worldId: world.id,
        activityType: "sentence-builder",
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
      payload: snapshotPayload(queue, []),
    });
    setSelectedTokens([]);
    setChecked(false);
    setIndex(nextIndex);
  };

  if (!question) {
    return (
      <ModeShell
        world={world}
        title="Sentence Builder"
        subtitle="Example sentences are needed for this activity"
        onBack={onBack}
        onBackToMap={onBackToMap}
        icon={<TextCursorInput size={19} />}
      >
        <section className="activity-empty">
          <h2>No sentences available</h2>
          <p>Explore or Matching still work with this unit's vocabulary.</p>
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
        title="Sentence Builder complete"
        subtitle="Your Spanish is taking shape"
        onBack={onBack}
        onBackToMap={onBackToMap}
        icon={<TextCursorInput size={19} />}
      >
        <SessionResults
          title={`${score}%`}
          message={`You built ${answeredCount} Spanish sentences from shuffled tiles.`}
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

  const selectedIds = new Set(selectedTokens.map((token) => token.id));
  const availableTokens =
    question.tokens?.filter((token) => !selectedIds.has(token.id)) ?? [];

  return (
    <ModeShell
      world={world}
      title="Sentence Builder"
      subtitle="Build the Spanish sentence"
      onBack={onBack}
      onBackToMap={onBackToMap}
      icon={<TextCursorInput size={19} />}
      current={index + 1}
      total={queue.length}
    >
      <section className="sentence-builder">
        <div className="sentence-builder__prompt">
          <span className="card-label">Build this meaning in Spanish</span>
          <h2>{question.prompt}</h2>
        </div>

        <div
          className={`sentence-builder__answer ${
            checked
              ? isCorrect
                ? "sentence-builder__answer--correct"
                : "sentence-builder__answer--wrong"
              : ""
          }`}
          aria-label="Your Spanish sentence"
        >
          {selectedTokens.length === 0 && (
            <span className="sentence-builder__placeholder">
              Tap words below to build the sentence
            </span>
          )}
          {selectedTokens.map((token) => (
            <button
              key={token.id}
              type="button"
              onClick={() => removeToken(token)}
              disabled={checked}
            >
              {token.text}
            </button>
          ))}
        </div>

        <div className="sentence-builder__tiles" aria-label="Available words">
          {availableTokens.map((token) => (
            <button
              key={token.id}
              type="button"
              onClick={() => addToken(token)}
              disabled={checked}
            >
              {token.text}
            </button>
          ))}
        </div>

        {!checked && (
          <div className="sentence-builder__actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setSelectedTokens([]);
                recovery.checkpoint({
                  index,
                  total: queue.length,
                  correctCount,
                  answeredCount,
                  meaningful: answeredCount > 0,
                  payload: snapshotPayload(queue, []),
                });
              }}
              disabled={selectedTokens.length === 0}
            >
              <RotateCcw size={17} />
              Clear
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={checkSentence}
              disabled={selectedTokens.length === 0}
            >
              Check sentence
              <Check size={18} />
            </button>
          </div>
        )}

        {checked && (
          <div
            className={`feedback ${
              isCorrect ? "feedback--correct" : "feedback--gentle"
            }`}
            aria-live="polite"
          >
            <span className="feedback__icon">
              {isCorrect ? <Sparkles size={21} /> : <X size={21} />}
            </span>
            <div>
              <strong>
                {isCorrect ? "Sentence complete!" : "Good attempt. Compare it:"}
              </strong>
              {!isCorrect && (
                <div className="sentence-correction">
                  <span>
                    <b>Correct:</b> {question.answer}
                  </span>
                  <SpeakerButton
                    text={question.audioText ?? question.answer}
                    label="Hear the correct Spanish sentence"
                  />
                </div>
              )}
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
