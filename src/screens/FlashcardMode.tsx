import { ArrowLeft, ArrowRight, Layers3, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { SessionResults } from "../components/SessionResults";
import { SpeakerButton } from "../components/SpeakerButton";
import {
  createSessionId,
} from "../engine/activityEngine";
import {
  createLearningQueue,
  getStars,
  getWorldProgress,
} from "../engine/game";
import { useGame } from "../state/GameContext";
import { createProgressEventId } from "../state/progressEvents";
import type { World } from "../types";
import { ModeShell } from "./LearnMode";

type FlashcardModeProps = {
  world: World;
  onBack: () => void;
  onComplete: () => void;
};

export function FlashcardMode({
  world,
  onBack,
  onComplete,
}: FlashcardModeProps) {
  const { completeSession, markLearned, state } = useGame();
  const [sessionId] = useState(() =>
    createSessionId(world.id, "explore"),
  );
  const [queue] = useState(() => createLearningQueue(world));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sessionStartXp] = useState(() => state.xp);
  const [initialCollectedIds] = useState(
    () => new Set(getWorldProgress(state, world.id).collectedWordIds),
  );
  const word = queue[index];

  useEffect(() => {
    if (!word) return;
    markLearned(
      createProgressEventId(sessionId, "seen", word.id),
      world.id,
      word,
    );
  }, [markLearned, sessionId, word, world.id]);

  const move = (direction: number) => {
    setFlipped(false);
    setIndex((current) =>
      Math.min(queue.length - 1, Math.max(0, current + direction)),
    );
  };

  const newlyLearnedWords = queue.filter(
    (queueWord, queueIndex) =>
      !initialCollectedIds.has(queueWord.id) &&
      queue.findIndex((item) => item.id === queueWord.id) === queueIndex,
  );
  const finishSession = () => {
    completeSession({
      kind: "session-completion",
      id: createProgressEventId(sessionId, "completion", "flashcards"),
      worldId: world.id,
      words: queue,
    });
    setFinished(true);
  };

  if (finished) {
    return (
      <ModeShell
        world={world}
        title="Flashcards complete"
        subtitle="A quick round, beautifully done"
        onBack={onBack}
        icon={<Layers3 size={19} />}
      >
        <SessionResults
          title="Cards conquered!"
          message="Ten words are now a little more familiar, and new ones have joined your dictionary."
          stars={getStars(state, world)}
          xpGained={Math.max(0, state.xp - sessionStartXp)}
          learnedWords={newlyLearnedWords}
          onContinue={onComplete}
        />
      </ModeShell>
    );
  }

  return (
    <ModeShell
      world={world}
      title="Flashcards"
      subtitle="Think of the English meaning, then flip"
      onBack={onBack}
      icon={<Layers3 size={19} />}
      current={index + 1}
      total={queue.length}
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
          onClick={() =>
            index === queue.length - 1 ? finishSession() : move(1)
          }
        >
          {index === queue.length - 1 ? "Finish session" : "Next card"}
          <ArrowRight size={18} />
        </button>
      </div>
    </ModeShell>
  );
}
