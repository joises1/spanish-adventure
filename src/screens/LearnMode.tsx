import { ArrowLeft, ArrowRight, BookOpen, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { ProgressBar } from "../components/ProgressBar";
import { SessionResults } from "../components/SessionResults";
import { SpeakerButton } from "../components/SpeakerButton";
import {
  createLearningQueue,
  getStars,
  getWorldProgress,
} from "../engine/game";
import { useGame } from "../state/GameContext";
import type { World } from "../types";

type LearnModeProps = {
  world: World;
  onBack: () => void;
  onComplete: () => void;
};

export function LearnMode({ world, onBack, onComplete }: LearnModeProps) {
  const { markLearned, state } = useGame();
  const [queue] = useState(() => createLearningQueue(world));
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [sessionStartXp] = useState(() => state.xp);
  const [initialUnlockedIds] = useState(
    () => new Set(getWorldProgress(state, world.id).learnedWordIds),
  );
  const word = queue[index];

  useEffect(() => {
    markLearned(world.id, word);
  }, [markLearned, word, world.id]);

  const move = (direction: number) => {
    setIndex((current) =>
      Math.min(queue.length - 1, Math.max(0, current + direction)),
    );
  };

  const unlockedWords = queue.filter(
    (queueWord, queueIndex) =>
      !initialUnlockedIds.has(queueWord.id) &&
      queue.findIndex((item) => item.id === queueWord.id) === queueIndex,
  );

  if (finished) {
    return (
      <ModeShell
        world={world}
        title="Learn complete"
        subtitle="Ten new connections made"
        onBack={onBack}
        icon={<BookOpen size={19} />}
      >
        <SessionResults
          title="Lovely work!"
          message="You explored ten Spanish words and added every new discovery to your dictionary."
          stars={getStars(state, world)}
          xpGained={Math.max(0, state.xp - sessionStartXp)}
          unlockedWords={unlockedWords}
          onContinue={onComplete}
        />
      </ModeShell>
    );
  }

  return (
    <ModeShell
      world={world}
      title="Learn"
      subtitle="Spanish to English, ten words at a time"
      onBack={onBack}
      icon={<BookOpen size={19} />}
      current={index + 1}
      total={queue.length}
    >
      <article className="learn-card">
        <span className="card-label">Spanish</span>
        <div className="spoken-heading">
          <h2>{word.es}</h2>
          <SpeakerButton
            text={word.es}
            label={`Hear the Spanish word ${word.es}`}
          />
        </div>
        <div className="meaning-divider">
          <span />
          <Check size={17} aria-hidden="true" />
          <span />
        </div>
        <span className="card-label">English meaning</span>
        <h3>{word.en}</h3>
        {word.example && (
          <div className="example-box">
            <div className="spoken-sentence">
              <strong>{word.example.es}</strong>
              <SpeakerButton
                text={word.example.es}
                label="Hear the Spanish example sentence"
              />
            </div>
            <span>{word.example.en}</span>
          </div>
        )}
        {!word.example && (
          <p className="gentle-note">
            Say the Spanish word aloud, then connect it to the meaning.
          </p>
        )}
      </article>

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
            index === queue.length - 1 ? setFinished(true) : move(1)
          }
        >
          {index === queue.length - 1 ? "Finish session" : "Next word"}
          <ArrowRight size={18} />
        </button>
      </div>
    </ModeShell>
  );
}

type ModeShellProps = {
  world: World;
  title: string;
  subtitle: string;
  onBack: () => void;
  icon: React.ReactNode;
  current?: number;
  total?: number;
  children: React.ReactNode;
};

export function ModeShell({
  world,
  title,
  subtitle,
  onBack,
  icon,
  current,
  total = world.words.length,
  children,
}: ModeShellProps) {
  const progress = current ? Math.round((current / total) * 100) : 0;

  return (
    <main className="mode-page">
      <div className="mode-page__top">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          {world.name}
        </button>
        <div className="mode-title">
          <span>{icon}</span>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        {current && (
          <div className="mode-counter">
            <span>
              {current} of {total}
            </span>
            <ProgressBar value={progress} color={world.accent} />
          </div>
        )}
      </div>
      <div className="mode-stage">{children}</div>
    </main>
  );
}
