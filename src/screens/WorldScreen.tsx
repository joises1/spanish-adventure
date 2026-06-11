import {
  ArrowLeft,
  BookOpen,
  Brain,
  CircleHelp,
  Layers3,
  Star,
} from "lucide-react";
import { ProgressBar } from "../components/ProgressBar";
import {
  getAccuracy,
  getCompletion,
  getReviewWords,
  getStars,
} from "../engine/game";
import { useGame } from "../state/GameContext";
import type { Mode, World } from "../types";

type WorldScreenProps = {
  world: World;
  onBack: () => void;
  onOpenMode: (mode: Mode) => void;
};

const modes = [
  {
    id: "learn" as const,
    name: "Learn",
    description: "Meet each Spanish word with its English meaning.",
    icon: BookOpen,
  },
  {
    id: "flashcards" as const,
    name: "Flashcards",
    description: "Say the meaning, then flip to check.",
    icon: Layers3,
  },
  {
    id: "quiz" as const,
    name: "Quick Quiz",
    description: "Choose the English meaning and get instant feedback.",
    icon: CircleHelp,
  },
  {
    id: "review" as const,
    name: "Review",
    description: "Revisit words that have been a little tricky.",
    icon: Brain,
  },
];

export function WorldScreen({
  world,
  onBack,
  onOpenMode,
}: WorldScreenProps) {
  const { state } = useGame();
  const completion = getCompletion(state, world);
  const accuracy = getAccuracy(state, world);
  const stars = getStars(state, world);
  const reviewCount = getReviewWords(state, world).filter(
    (word) => (state.words[word.id]?.incorrect ?? 0) > 0,
  ).length;

  return (
    <main className="world-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" />
        Back to map
      </button>

      <section
        className="world-banner"
        style={
          {
            "--world-color": world.color,
            "--world-accent": world.accent,
          } as React.CSSProperties
        }
      >
        <div className="world-banner__icon" aria-hidden="true">
          {world.icon}
        </div>
        <div className="world-banner__copy">
          <span className="eyebrow">World {world.unit}</span>
          <h1>{world.name}</h1>
          <p className="world-banner__spanish">{world.spanishName}</p>
          <p>{world.description}</p>
        </div>
        <div className="world-banner__progress">
          <strong>{completion}%</strong>
          <span>explored</span>
          <ProgressBar value={completion} color={world.accent} />
          <div className="banner-stars" aria-label={`${stars} out of 3 stars`}>
            {[0, 1, 2].map((index) => (
              <Star
                key={index}
                size={20}
                fill={index < stars ? "currentColor" : "none"}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="world-summary">
        <div>
          <strong>{world.words.length}</strong>
          <span>core words</span>
        </div>
        <div>
          <strong>{accuracy || "—"}{accuracy ? "%" : ""}</strong>
          <span>quiz accuracy</span>
        </div>
        <div>
          <strong>{reviewCount}</strong>
          <span>waiting to review</span>
        </div>
      </section>

      <section className="mode-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Pick your pace</span>
            <h2>How would you like to explore?</h2>
          </div>
        </div>
        <div className="mode-grid">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                className="mode-card"
                key={mode.id}
                onClick={() => onOpenMode(mode.id)}
              >
                <span className="mode-card__icon">
                  <Icon size={25} aria-hidden="true" />
                </span>
                <span>
                  <strong>{mode.name}</strong>
                  <small>{mode.description}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
