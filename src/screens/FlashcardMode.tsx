import { ArrowLeft, ArrowRight, Layers3, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { SpeakerButton } from "../components/SpeakerButton";
import { useGame } from "../state/GameContext";
import type { World } from "../types";
import { ModeShell } from "./LearnMode";

type FlashcardModeProps = {
  world: World;
  onBack: () => void;
};

export function FlashcardMode({ world, onBack }: FlashcardModeProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const { markLearned } = useGame();
  const word = world.words[index];

  useEffect(() => {
    markLearned(world.id, word);
  }, [markLearned, word, world.id]);

  const move = (direction: number) => {
    setFlipped(false);
    setIndex((current) =>
      Math.min(world.words.length - 1, Math.max(0, current + direction)),
    );
  };

  return (
    <ModeShell
      world={world}
      title="Flashcards"
      subtitle="Think of the English meaning, then flip"
      onBack={onBack}
      icon={<Layers3 size={19} />}
      current={index + 1}
    >
      <div
        className={`flashcard ${flipped ? "flashcard--flipped" : ""}`}
      >
        <span className="flashcard__inner">
          <span
            className="flashcard__face flashcard__front"
            aria-hidden={flipped}
          >
            <span className="card-label">Spanish</span>
            <span className="flashcard__term">
              <strong>{word.es}</strong>
              <SpeakerButton
                text={word.es}
                label={`Hear the Spanish word ${word.es}`}
                tabIndex={flipped ? -1 : 0}
              />
            </span>
            <button
              className="flashcard__flip-button"
              type="button"
              onClick={() => setFlipped(true)}
              tabIndex={flipped ? -1 : 0}
            >
              <RotateCcw size={16} />
              Tap to reveal the meaning
            </button>
          </span>
          <span
            className="flashcard__face flashcard__back"
            aria-hidden={!flipped}
          >
            <span className="card-label">English meaning</span>
            <strong>{word.en}</strong>
            {word.example && (
              <span className="flashcard__example">
                <small>{word.example.es}</small>
                <SpeakerButton
                  text={word.example.es}
                  label="Hear the Spanish example sentence"
                  tabIndex={flipped ? 0 : -1}
                />
              </span>
            )}
            <button
              className="flashcard__flip-button flashcard__flip-button--back"
              type="button"
              onClick={() => setFlipped(false)}
              tabIndex={flipped ? 0 : -1}
            >
              <RotateCcw size={16} />
              See the Spanish again
            </button>
          </span>
        </span>
      </div>

      <div className="mode-actions">
        <button
          className="secondary-button"
          onClick={() => move(-1)}
          disabled={index === 0}
        >
          <ArrowLeft size={18} />
          Previous
        </button>
        <button
          className="primary-button"
          onClick={() => move(1)}
          disabled={index === world.words.length - 1}
        >
          Next card
          <ArrowRight size={18} />
        </button>
      </div>
    </ModeShell>
  );
}
