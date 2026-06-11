import { Check, Flag, Lock, MapPin, Star } from "lucide-react";
import { useEffect, useMemo } from "react";
import { getCompletion, getStars } from "../engine/game";
import { useGame } from "../state/GameContext";
import type { World } from "../types";

type LessonMapProps = {
  worlds: World[];
  highlightedWorldId?: string;
  onOpenWorld: (world: World) => void;
};

type TrailPoint = {
  x: number;
  y: number;
};

const NODE_GAP = 184;
const TRAIL_PADDING = 180;
const xPositions = [28, 70, 34, 76, 25, 65, 38, 73];

const createSmoothPath = (points: TrailPoint[]) => {
  if (points.length === 0) return "";

  return points.slice(0, -1).reduce((path, point, index) => {
    const previous = points[index - 1] ?? point;
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const firstControl = {
      x: point.x + (next.x - previous.x) / 6,
      y: point.y + (next.y - previous.y) / 6,
    };
    const secondControl = {
      x: next.x - (afterNext.x - point.x) / 6,
      y: next.y - (afterNext.y - point.y) / 6,
    };

    return `${path} C ${firstControl.x} ${firstControl.y}, ${secondControl.x} ${secondControl.y}, ${next.x} ${next.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
};

export function LessonMap({
  worlds,
  highlightedWorldId,
  onOpenWorld,
}: LessonMapProps) {
  const { state } = useGame();
  const trailHeight = (worlds.length - 1) * NODE_GAP + TRAIL_PADDING * 2;
  const progress = useMemo(
    () =>
      worlds.map((world) => ({
        completion: getCompletion(state, world),
        stars: getStars(state, world),
      })),
    [state, worlds],
  );
  const firstUnclearedIndex = progress.findIndex(({ stars }) => stars === 0);
  const allWorldsCleared = firstUnclearedIndex === -1;
  const currentIndex =
    allWorldsCleared ? worlds.length - 1 : firstUnclearedIndex;
  const points = worlds.map((_, index) => ({
    x: xPositions[index % xPositions.length],
    y: trailHeight - TRAIL_PADDING - index * NODE_GAP,
  }));
  const path = createSmoothPath(points);

  useEffect(() => {
    const destinationId =
      highlightedWorldId ?? worlds[currentIndex]?.id ?? worlds[0]?.id;
    const destination = document.getElementById(`lesson-node-${destinationId}`);
    if (!destination) return;

    const timer = window.setTimeout(() => {
      destination.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [currentIndex, highlightedWorldId, worlds]);

  return (
    <section
      className="lesson-map"
      style={{ "--trail-height": `${trailHeight}px` } as React.CSSProperties}
      aria-label="Spanish adventure lesson map"
    >
      <div className="lesson-map__sky" aria-hidden="true">
        <span className="map-cloud map-cloud--one" />
        <span className="map-cloud map-cloud--two" />
        <span className="map-cloud map-cloud--three" />
        <span className="map-spark map-spark--one">★</span>
        <span className="map-spark map-spark--two">★</span>
        <span className="map-spark map-spark--three">✦</span>
        <span className="spanish-flag spanish-flag--one" />
        <span className="spanish-flag spanish-flag--two" />
      </div>

      <div className="lesson-map__summit" aria-hidden="true">
        <span className="summit-badge">
          <Flag size={22} />
        </span>
        <strong>¡La cima!</strong>
        <small>Your Spanish summit</small>
      </div>

      <svg
        className="lesson-map__path"
        viewBox={`0 0 100 ${trailHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="lesson-map__path-shadow" d={path} />
        <path className="lesson-map__path-line" d={path} />
      </svg>

      {worlds.map((world, index) => {
        const { completion, stars } = progress[index];
        const hasProgress = completion > 0 || stars > 0;
        const isCurrent = !allWorldsCleared && index === currentIndex;
        const isCompleted = stars > 0 && !isCurrent;
        const isLocked = index > currentIndex && !hasProgress;
        const point = points[index];
        const stateClass = isLocked
          ? "lesson-node--locked"
          : isCurrent
            ? "lesson-node--current"
            : isCompleted
              ? "lesson-node--completed"
              : "lesson-node--open";

        return (
          <article
            className={`lesson-node ${stateClass} ${
              highlightedWorldId === world.id
                ? "lesson-node--highlighted"
                : ""
            }`}
            id={`lesson-node-${world.id}`}
            key={world.id}
            style={
              {
                "--node-x": `${point.x}%`,
                "--node-y": `${point.y}px`,
                "--node-color": world.color,
                "--node-accent": world.accent,
              } as React.CSSProperties
            }
          >
            <div className="lesson-node__marker">
              <button
                className="lesson-node__button"
                type="button"
                onClick={() => onOpenWorld(world)}
                disabled={isLocked}
                aria-label={
                  isLocked
                    ? `World ${world.unit}, ${world.name}, locked`
                    : `Open world ${world.unit}, ${world.name}`
                }
              >
                <span className="lesson-node__number">{world.unit}</span>
                <span className="lesson-node__icon" aria-hidden="true">
                  {isLocked ? (
                    <Lock size={25} />
                  ) : isCompleted ? (
                    <Check size={28} strokeWidth={3} />
                  ) : (
                    world.icon
                  )}
                </span>
              </button>

              {isCurrent && (
                <span className="lesson-node__current-tag">
                  <MapPin size={13} />
                  Current
                </span>
              )}
            </div>

            <div className="lesson-node__label">
              <span>World {world.unit}</span>
              <strong>{world.name}</strong>
              <small>
                {isLocked ? "Keep climbing to unlock" : world.spanishName}
              </small>
              {!isLocked && (
                <div
                  className="lesson-node__stars"
                  aria-label={`${stars} out of 3 stars`}
                >
                  {[0, 1, 2].map((starIndex) => (
                    <Star
                      key={starIndex}
                      size={15}
                      fill={starIndex < stars ? "currentColor" : "none"}
                    />
                  ))}
                  <em>{completion}%</em>
                </div>
              )}
            </div>
          </article>
        );
      })}

      <div className="lesson-map__start" aria-hidden="true">
        <span>START</span>
        <strong>¡Vamos!</strong>
      </div>
      <div
        className="lesson-map__hills lesson-map__hills--back"
        aria-hidden="true"
      />
      <div
        className="lesson-map__hills lesson-map__hills--front"
        aria-hidden="true"
      />
    </section>
  );
}
