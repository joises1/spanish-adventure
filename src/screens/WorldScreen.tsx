import {
  BookOpenCheck,
  Brain,
  Clock3,
  Play,
  Sparkles,
  Star,
  Target,
  X,
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
    <main className="lesson-launch-page">
      <section
        className="lesson-launch-card"
        style={
          {
            "--world-color": world.color,
            "--world-accent": world.accent,
          } as React.CSSProperties
        }
        aria-labelledby="lesson-launch-title"
      >
        <button
          className="lesson-launch-card__close"
          type="button"
          onClick={onBack}
          aria-label="Close lesson"
          title="Close lesson"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="lesson-launch-card__hero">
          <span className="lesson-launch-card__icon" aria-hidden="true">
            {world.icon}
          </span>
          <div>
            <span className="eyebrow">
              <Sparkles size={14} aria-hidden="true" />
              World {world.unit}
            </span>
            <h1 id="lesson-launch-title">{world.name}</h1>
            <p className="lesson-launch-card__spanish">{world.spanishName}</p>
          </div>
        </div>

        <div className="lesson-launch-goal">
          <span>
            <Target size={22} aria-hidden="true" />
          </span>
          <div>
            <small>Lesson goal</small>
            <strong>Match Spanish words to their English meanings</strong>
            <p>{world.description}</p>
          </div>
        </div>

        <div className="lesson-launch-details">
          <div>
            <Clock3 size={19} aria-hidden="true" />
            <span>
              <strong>About 5 minutes</strong>
              <small>10 friendly questions</small>
            </span>
          </div>
          <div>
            <Brain size={19} aria-hidden="true" />
            <span>
              <strong>{reviewCount || "Fresh"} review</strong>
              <small>
                {reviewCount
                  ? `${reviewCount} tricky words ready`
                  : "Review opens anytime"}
              </small>
            </span>
          </div>
        </div>

        <section className="lesson-rewards" aria-label="Lesson rewards">
          <div className="lesson-rewards__heading">
            <span>
              <Sparkles size={15} aria-hidden="true" />
              Rewards preview
            </span>
            <small>Based on your answers</small>
          </div>
          <div className="lesson-rewards__grid">
            <div>
              <Sparkles size={20} aria-hidden="true" />
              <strong>Up to 100 XP</strong>
            </div>
            <div>
              <Star size={20} fill="currentColor" aria-hidden="true" />
              <strong>Up to 3 stars</strong>
            </div>
            <div>
              <BookOpenCheck size={20} aria-hidden="true" />
              <strong>10 learned words</strong>
            </div>
          </div>
        </section>

        <div className="lesson-launch-progress">
          <div>
            <span>Unit progress</span>
            <strong>{completion}%</strong>
          </div>
          <ProgressBar value={completion} color={world.accent} />
          <small>
            {accuracy ? `${accuracy}% quiz accuracy` : "Ready for your first run"}
            {stars > 0 ? ` / ${stars} stars earned` : ""}
          </small>
        </div>

        <div className="lesson-launch-actions">
          <button
            className="primary-button lesson-start-button"
            type="button"
            onClick={() => onOpenMode("quiz")}
          >
            <Play size={19} fill="currentColor" aria-hidden="true" />
            Start
          </button>
          <button
            className="secondary-button lesson-review-button"
            type="button"
            onClick={() => onOpenMode("review")}
          >
            <Brain size={18} aria-hidden="true" />
            Review
          </button>
          <button
            className="lesson-close-button"
            type="button"
            onClick={onBack}
          >
            Close
          </button>
        </div>
      </section>
    </main>
  );
}
