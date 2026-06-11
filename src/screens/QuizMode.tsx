import {
  ArrowRight,
  Brain,
  Check,
  CircleHelp,
  PartyPopper,
  RotateCcw,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SpeakerButton } from "../components/SpeakerButton";
import {
  createChoices,
  createQuizQueue,
  getReviewWords,
} from "../engine/game";
import { useGame } from "../state/GameContext";
import type { VocabularyWord, World } from "../types";
import { ModeShell } from "./LearnMode";

type QuizModeProps = {
  world: World;
  onBack: () => void;
  review?: boolean;
};

const encouragement = [
  "Nice one!",
  "Good job!",
  "You got it!",
  "Muy bien!",
];

export function QuizMode({ world, onBack, review = false }: QuizModeProps) {
  const { state, recordAnswer } = useGame();
  const initialQueue = useMemo(
    () => (review ? getReviewWords(state, world) : createQuizQueue(state, world)),
    // The queue is intentionally fixed for this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [review, world.id],
  );
  const [queue, setQueue] = useState(initialQueue);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
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
    recordAnswer(world.id, word, correct);
  };

  const next = () => {
    if (index >= queue.length - 1) {
      setFinished(true);
      return;
    }
    setSelectedId(undefined);
    setIndex((current) => current + 1);
  };

  const restart = () => {
    const nextQueue = review
      ? getReviewWords(state, world)
      : createQuizQueue(state, world);
    setQueue(nextQueue);
    setIndex(0);
    setSelectedId(undefined);
    setSessionCorrect(0);
    setFinished(false);
  };

  if (finished) {
    const percentage = Math.round((sessionCorrect / queue.length) * 100);
    return (
      <ModeShell
        world={world}
        title={review ? "Review complete" : "Quiz complete"}
        subtitle="A little practice goes a long way"
        onBack={onBack}
        icon={<PartyPopper size={19} />}
      >
        <div className="results-card">
          <span className="results-card__icon">
            <PartyPopper size={35} />
          </span>
          <span className="eyebrow">Session result</span>
          <h2>{percentage}%</h2>
          <p>
            You matched {sessionCorrect} of {queue.length} Spanish words to
            their English meanings.
          </p>
          <div className="results-actions">
            <button className="secondary-button" onClick={onBack}>
              Back to world
            </button>
            <button className="primary-button" onClick={restart}>
              <RotateCcw size={18} />
              Practice again
            </button>
          </div>
        </div>
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
