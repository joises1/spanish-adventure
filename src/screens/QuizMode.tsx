import {
  ArrowRight,
  Brain,
  Check,
  CircleHelp,
  PartyPopper,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SessionResults } from "../components/SessionResults";
import { SpeakerButton } from "../components/SpeakerButton";
import { createSessionId } from "../engine/activityEngine";
import {
  createChoices,
  createQuizQueue,
  createReviewQueue,
  getStars,
  getWorldProgress,
} from "../engine/game";
import { useGame } from "../state/GameContext";
import { createProgressEventId } from "../state/progressEvents";
import type { VocabularyWord, World } from "../types";
import { ModeShell } from "./LearnMode";

type QuizModeProps = {
  world: World;
  onBack: () => void;
  onComplete: () => void;
  review?: boolean;
};

const encouragement = [
  "Nice one!",
  "Good job!",
  "You got it!",
  "Muy bien!",
];

export function QuizMode({
  world,
  onBack,
  onComplete,
  review = false,
}: QuizModeProps) {
  const { completeSession, state, recordAnswer } = useGame();
  const [sessionId, setSessionId] = useState(() =>
    createSessionId(world.id, "multiple-choice"),
  );
  const initialQueue = useMemo(
    () =>
      review
        ? createReviewQueue(state, world)
        : createQuizQueue(state, world),
    // The queue is intentionally fixed for this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [review, world.id],
  );
  const [queue, setQueue] = useState(initialQueue);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const [sessionStartXp, setSessionStartXp] = useState(() => state.xp);
  const [initialCollectedIds, setInitialCollectedIds] = useState(
    () => new Set(getWorldProgress(state, world.id).collectedWordIds),
  );
  const word = queue[index];

  const choices = useMemo(
    () => (word ? createChoices(word, world.words) : []),
    [word, world.words],
  );
  const selected = choices.find((choice) => choice.id === selectedId);
  const isCorrect = selected?.id === word?.id;

  const choose = (choice: VocabularyWord) => {
    if (selectedId || !word) return;
    const correct = choice.id === word.id;
    setSelectedId(choice.id);
    setSessionCorrect((current) => current + (correct ? 1 : 0));
    recordAnswer(
      createProgressEventId(sessionId, "answer", word.id),
      world.id,
      word,
      correct,
    );
  };

  const next = () => {
    if (index >= queue.length - 1) {
      completeSession({
        kind: "session-completion",
        id: createProgressEventId(sessionId, "completion", "quiz"),
        worldId: world.id,
        words: queue,
      });
      setFinished(true);
      return;
    }
    setSelectedId(undefined);
    setIndex((current) => current + 1);
  };

  const restart = () => {
    const nextQueue = review
      ? createReviewQueue(state, world)
      : createQuizQueue(state, world);
    setQueue(nextQueue);
    setSessionId(createSessionId(world.id, "multiple-choice"));
    setIndex(0);
    setSelectedId(undefined);
    setSessionCorrect(0);
    setFinished(false);
    setSessionStartXp(state.xp);
    setInitialCollectedIds(
      new Set(getWorldProgress(state, world.id).collectedWordIds),
    );
  };

  if (finished) {
    const percentage = Math.round((sessionCorrect / queue.length) * 100);
    const newlyLearnedWords = queue.filter(
      (queueWord, queueIndex) =>
        !initialCollectedIds.has(queueWord.id) &&
        queue.findIndex((item) => item.id === queueWord.id) === queueIndex,
    );
    return (
      <ModeShell
        world={world}
        title={review ? "Review complete" : "Quiz complete"}
        subtitle="A little practice goes a long way"
        onBack={onBack}
        icon={<PartyPopper size={19} />}
      >
        <SessionResults
          title={`${percentage}%`}
          message={`You matched ${sessionCorrect} of ${queue.length} Spanish words to their English meanings.`}
          stars={getStars(state, world)}
          xpGained={Math.max(0, state.xp - sessionStartXp)}
          learnedWords={newlyLearnedWords}
          onContinue={onComplete}
          onPracticeAgain={restart}
        />
      </ModeShell>
    );
  }

  return (
    <ModeShell
      world={world}
      title={review ? "Review" : "Quick Quiz"}
      subtitle={
        review
          ? "A friendly revisit for tricky words"
          : "Choose the English meaning"
      }
      onBack={onBack}
      icon={
        review ? <Brain size={19} /> : <CircleHelp size={19} />
      }
      current={index + 1}
      total={queue.length}
    >
      <section className="quiz-card">
        <span className="card-label">What does this mean?</span>
        <div className="spoken-heading">
          <h2>{word.es}</h2>
          <SpeakerButton
            text={word.es}
            label={`Hear the quiz question ${word.es}`}
          />
        </div>
        <div className="choice-grid">
          {choices.map((choice) => {
            const chosen = choice.id === selectedId;
            const correctChoice = selectedId && choice.id === word.id;
            const wrongChoice = chosen && choice.id !== word.id;
            return (
              <button
                className={`choice ${correctChoice ? "choice--correct" : ""} ${
                  wrongChoice ? "choice--wrong" : ""
                }`}
                key={choice.id}
                onClick={() => choose(choice)}
                disabled={Boolean(selectedId)}
              >
                <span>{choice.en}</span>
                {correctChoice && <Check size={19} aria-hidden="true" />}
                {wrongChoice && <X size={19} aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {selectedId && (
          <div
            className={`feedback ${isCorrect ? "feedback--correct" : "feedback--gentle"}`}
            aria-live="polite"
          >
            <span className="feedback__icon">
              {isCorrect ? <Check size={21} /> : <Brain size={21} />}
            </span>
            <div>
              <strong>
                {isCorrect
                  ? encouragement[index % encouragement.length]
                  : "Almost. This one will visit again."}
              </strong>
              {!isCorrect && (
                <div className="feedback-answer">
                  <span>
                    <b>{word.es}</b> means <b>{word.en}</b>.
                  </span>
                  <SpeakerButton
                    text={word.es}
                    label={`Hear the Spanish word ${word.es}`}
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
