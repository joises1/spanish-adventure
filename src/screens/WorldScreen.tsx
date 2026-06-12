import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Headphones,
  ListOrdered,
  MessageCircle,
  Puzzle,
  Sparkles,
  Star,
  TextCursorInput,
  Trophy,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { ProgressBar } from "../components/ProgressBar";
import {
  ACTIVITY_DEFINITIONS,
  getActivityProgressKey,
} from "../engine/activityEngine";
import {
  getAccuracy,
  getCompletion,
  getStars,
} from "../engine/game";
import { useGame } from "../state/GameContext";
import type { ActivityType, World } from "../types";

type WorldScreenProps = {
  world: World;
  onBack: () => void;
  onOpenActivity: (activityType: ActivityType) => void;
};

const HUB_ACTIVITY_TYPES: ActivityType[] = [
  "explore",
  "matching",
  "listening",
  "sentence-builder",
  "dialogue",
  "story-shuffle",
  "unit-challenge",
];

const activityIcons: Record<string, ReactNode> = {
  explore: <BookOpen size={23} aria-hidden="true" />,
  matching: <Puzzle size={23} aria-hidden="true" />,
  listening: <Headphones size={23} aria-hidden="true" />,
  "sentence-builder": <TextCursorInput size={23} aria-hidden="true" />,
  dialogue: <MessageCircle size={23} aria-hidden="true" />,
  "story-shuffle": <ListOrdered size={23} aria-hidden="true" />,
  "unit-challenge": <Trophy size={23} aria-hidden="true" />,
};

export function WorldScreen({
  world,
  onBack,
  onOpenActivity,
}: WorldScreenProps) {
  const { state } = useGame();
  const completion = getCompletion(state, world);
  const accuracy = getAccuracy(state, world);
  const stars = getStars(state, world);
  const activities = HUB_ACTIVITY_TYPES.map((type) =>
    ACTIVITY_DEFINITIONS.find((activity) => activity.type === type),
  ).filter((activity) => Boolean(activity));

  return (
    <main
      className="activity-hub-page"
      style={
        {
          "--world-color": world.color,
          "--world-accent": world.accent,
        } as React.CSSProperties
      }
    >
      <section className="activity-hub">
        <button
          className="activity-hub__close"
          type="button"
          onClick={onBack}
          aria-label="Close unit activities"
          title="Close"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <header className="activity-hub__hero">
          <span className="activity-hub__world-icon" aria-hidden="true">
            {world.icon}
          </span>
          <div>
            <span className="eyebrow">
              <Sparkles size={14} aria-hidden="true" />
              World {world.unit} activity hub
            </span>
            <h1>{world.name}</h1>
            <p>
              <strong>{world.spanishName}</strong> {world.description}
            </p>
          </div>
        </header>

        <section className="activity-hub__progress" aria-label="Unit progress">
          <div>
            <span>Unit progress</span>
            <strong>{completion}%</strong>
          </div>
          <ProgressBar value={completion} color={world.accent} />
          <small>
            {accuracy ? `${accuracy}% answer accuracy` : "Choose any activity"}
            {stars > 0 ? ` / ${stars} world stars` : ""}
          </small>
        </section>

        <div className="activity-hub__intro">
          <div>
            <h2>Choose your activity</h2>
            <p>Short rounds, shared progress, no pressure.</p>
          </div>
          <span>
            <Clock3 size={16} aria-hidden="true" />
            2-4 minutes each
          </span>
        </div>

        <section className="activity-card-grid" aria-label="Unit activities">
          {activities.map((activity) => {
            if (!activity) return null;
            const progress =
              state.activities[
                getActivityProgressKey(world.id, activity.type)
              ];
            const completed = (progress?.completedSessions ?? 0) > 0;

            return (
              <button
                className={`activity-card activity-card--${activity.type} ${
                  completed ? "activity-card--completed" : ""
                }`}
                key={activity.type}
                type="button"
                onClick={() =>
                  activity.available && onOpenActivity(activity.type)
                }
                disabled={!activity.available}
                aria-label={`${activity.title}. ${activity.description}${
                  activity.available ? "" : " Coming in the next sprint."
                }`}
              >
                <span className="activity-card__icon">
                  {activityIcons[activity.type]}
                </span>
                <span className="activity-card__copy">
                  <span className="activity-card__title-row">
                    <strong>{activity.title}</strong>
                    {completed && (
                      <CheckCircle2 size={18} aria-label="Completed" />
                    )}
                  </span>
                  <small>{activity.description}</small>
                </span>
                <span className="activity-card__meta">
                  <span>
                    <Clock3 size={13} aria-hidden="true" />
                    {activity.durationMinutes} min
                  </span>
                  <span>
                    <Sparkles size={13} aria-hidden="true" />
                    {activity.xpReward} XP
                  </span>
                  <span>
                    <Star size={13} fill="currentColor" aria-hidden="true" />
                    {progress?.bestStars ?? 0}/3
                  </span>
                </span>
                {!activity.available && (
                  <span className="activity-card__soon">Next sprint</span>
                )}
              </button>
            );
          })}
        </section>
      </section>
    </main>
  );
}
