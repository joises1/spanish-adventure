import { Check, Flag, MapPin, Star } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  getCompletion,
  getCurrentWorldIndex,
  getStars,
} from "../engine/game";
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

type StoryWorld = {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  theme: string;
  lessonCount: number;
  landmarks: string[];
};

const NODE_GAP = 184;
const STORY_WORLD_GAP = 116;
const TRAIL_PADDING = 180;
const xPositions = [28, 70, 34, 76, 25, 65, 38, 73];
const storyWorlds: StoryWorld[] = [
  {
    id: "pueblo",
    name: "Pueblo",
    subtitle: "Green hills and village paths",
    icon: "🏡",
    theme: "pueblo",
    lessonCount: 6,
    landmarks: ["🏡", "🌳", "🌻"],
  },
  {
    id: "campo",
    name: "Campo",
    subtitle: "Golden fields and windmill country",
    icon: "🌾",
    theme: "campo",
    lessonCount: 6,
    landmarks: ["🌾", "🌻", "🌀"],
  },
  {
    id: "costa",
    name: "Costa",
    subtitle: "Ocean breezes and sunny beaches",
    icon: "🏖️",
    theme: "costa",
    lessonCount: 6,
    landmarks: ["🌊", "⛵", "☀️"],
  },
  {
    id: "ciudad-antigua",
    name: "Ciudad Antigua",
    subtitle: "Stone streets and historic plazas",
    icon: "🏛️",
    theme: "ciudad",
    lessonCount: 6,
    landmarks: ["🏛️", "🪨", "🕯️"],
  },
  {
    id: "reino-magico",
    name: "Reino Mágico",
    subtitle: "Moonlit paths and enchanted stars",
    icon: "✨",
    theme: "magico",
    lessonCount: 5,
    landmarks: ["🌙", "⭐", "🔮"],
  },
  {
    id: "cielo",
    name: "Cielo",
    subtitle: "Cloud kingdoms and floating islands",
    icon: "☁️",
    theme: "cielo",
    lessonCount: 5,
    landmarks: ["☁️", "🏝️", "🌈"],
  },
];
const transitionScenes = [
  {
    id: "pueblo-campo",
    label: "Village hills become golden fields",
    decorations: ["🌿", "🌾", "🌻"],
  },
  {
    id: "campo-costa",
    label: "Fields meet the sand and sea",
    decorations: ["🌾", "🏖️", "🌊"],
  },
  {
    id: "costa-ciudad",
    label: "The beach path becomes an old stone road",
    decorations: ["🐚", "🪨", "🏛️"],
  },
  {
    id: "ciudad-magico",
    label: "Old streets drift into enchanted night",
    decorations: ["🏮", "✨", "🌙"],
  },
  {
    id: "magico-cielo",
    label: "Stars rise into clouds and floating islands",
    decorations: ["⭐", "☁️", "🏝️"],
  },
];
const createStoryRegions = (lessonCount: number) => {
  let nextLessonIndex = 0;
  const baseLessonCount = Math.floor(lessonCount / storyWorlds.length);
  const largerRegionCount = lessonCount % storyWorlds.length;

  return storyWorlds.map((storyWorld, storyIndex) => {
    const regionLessonCount =
      baseLessonCount + (storyIndex < largerRegionCount ? 1 : 0);
    const startIndex = nextLessonIndex;
    const endIndex = startIndex + regionLessonCount - 1;
    nextLessonIndex = endIndex + 1;

    return { ...storyWorld, startIndex, endIndex };
  });
};

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
  const storyPlan = createStoryRegions(worlds.length);
  const activeStoryBreaks = storyPlan
    .slice(1)
    .map((storyWorld) => storyWorld.startIndex);
  const trailHeight =
    (worlds.length - 1) * NODE_GAP +
    activeStoryBreaks.length * STORY_WORLD_GAP +
    TRAIL_PADDING * 2;
  const progress = useMemo(
    () =>
      worlds.map((world) => ({
        completion: getCompletion(state, world),
        stars: getStars(state, world),
      })),
    [state, worlds],
  );
  const allWorldsCleared = progress.every(({ stars }) => stars > 0);
  const currentIndex = getCurrentWorldIndex(state, worlds);
  const points = worlds.map((_, index) => {
    const completedStoryWorlds = activeStoryBreaks.filter(
      (lessonIndex) => index >= lessonIndex,
    ).length;

    return {
      x: xPositions[index % xPositions.length],
      y:
        trailHeight -
        TRAIL_PADDING -
        index * NODE_GAP -
        completedStoryWorlds * STORY_WORLD_GAP,
    };
  });
  const path = createSmoothPath(points);
  const storyRegions = storyPlan.map(
    (storyWorld, storyIndex) => {
      const top =
        storyWorld.endIndex >= worlds.length - 1
          ? 0
          : (points[storyWorld.endIndex].y +
              points[storyWorld.endIndex + 1].y) /
            2;
      const bottom =
        storyWorld.startIndex === 0
          ? trailHeight
          : (points[storyWorld.startIndex - 1].y +
              points[storyWorld.startIndex].y) /
            2;
      const isComplete = progress
        .slice(storyWorld.startIndex, storyWorld.endIndex + 1)
        .every(({ stars }) => stars > 0);

      return {
        ...storyWorld,
        storyIndex,
        top,
        height: bottom - top,
        isComplete,
      };
    },
  );
  const storyWorldByLessonIndex = new Map(
    storyRegions.flatMap((storyWorld) =>
      Array.from(
        { length: storyWorld.endIndex - storyWorld.startIndex + 1 },
        (_, offset) => [storyWorld.startIndex + offset, storyWorld] as const,
      ),
    ),
  );

  useEffect(() => {
    const destinationId =
      highlightedWorldId ?? worlds[currentIndex]?.id ?? worlds[0]?.id;
    const destination = document.getElementById(`lesson-node-${destinationId}`);
    if (!destination) return;

    const timer = window.setTimeout(() => {
      destination.scrollIntoView({
        behavior: highlightedWorldId ? "smooth" : "auto",
        block: "center",
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [currentIndex, highlightedWorldId, worlds]);

  return (
    <section
      className="lesson-map"
      style={{ "--trail-height": `${trailHeight}px` } as React.CSSProperties}
      aria-label="Spanish adventure lesson map"
    >
      {storyRegions.map((storyWorld) => (
        <section
          className={`story-world story-world--${storyWorld.theme} ${
            storyWorld.storyIndex % 2 === 1 ? "story-world--reverse" : ""
          }`}
          key={storyWorld.id}
          style={
            {
              "--story-top": `${storyWorld.top}px`,
              "--story-height": `${storyWorld.height}px`,
            } as React.CSSProperties
          }
          aria-label={`${storyWorld.name}: ${storyWorld.subtitle}`}
        >
          <div className="story-world__heading">
            <span aria-hidden="true">{storyWorld.icon}</span>
            <div>
              <small>Chapter {storyWorld.storyIndex + 1}</small>
              <strong>{storyWorld.name}</strong>
              <em>{storyWorld.subtitle}</em>
            </div>
          </div>

          <div
            className={`story-world__completion ${
              storyWorld.isComplete ? "story-world__completion--done" : ""
            }`}
            aria-label={
              storyWorld.isComplete
                ? `${storyWorld.name} completed`
                : `${storyWorld.name} completion marker`
            }
          >
            {storyWorld.isComplete ? (
              <Check size={17} strokeWidth={3} aria-hidden="true" />
            ) : (
              <Flag size={17} aria-hidden="true" />
            )}
            <span>{storyWorld.isComplete ? "Complete" : "Finish"}</span>
          </div>

          <div className="story-world__scenery" aria-hidden="true">
            {storyWorld.landmarks.map((landmark, landmarkIndex) => (
              <span
                className={`story-landmark story-landmark--${landmarkIndex + 1}`}
                key={`${storyWorld.id}-${landmarkIndex}`}
              >
                {landmark}
              </span>
            ))}
          </div>
        </section>
      ))}

      {storyRegions.slice(0, -1).map((lowerWorld, transitionIndex) => {
        const scene = transitionScenes[transitionIndex];
        return (
          <div
            className={`story-transition story-transition--${scene.id}`}
            key={scene.id}
            style={
              {
                "--transition-top": `${lowerWorld.top - 110}px`,
              } as React.CSSProperties
            }
            aria-label={scene.label}
          >
            {scene.decorations.map((decoration, decorationIndex) => (
              <span
                className={`story-transition__decoration story-transition__decoration--${decorationIndex + 1}`}
                key={`${scene.id}-${decorationIndex}`}
                aria-hidden="true"
              >
                {decoration}
              </span>
            ))}
          </div>
        );
      })}

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
        const storyWorld = storyWorldByLessonIndex.get(index);
        const { completion, stars } = progress[index];
        const isCurrent = !allWorldsCleared && index === currentIndex;
        const isCompleted = stars > 0 && !isCurrent;
        const isStoryEntrance = index === storyWorld?.startIndex;
        const point = points[index];
        const stateClass = isCurrent
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
              {isStoryEntrance && storyWorld && (
                <span className="lesson-node__world-entrance">
                  <span aria-hidden="true">{storyWorld.icon}</span>
                  Welcome to {storyWorld.name}
                </span>
              )}
              <button
                className="lesson-node__button"
                type="button"
                onClick={() => onOpenWorld(world)}
                aria-label={`Open world ${world.unit}, ${world.name}`}
              >
                <span className="lesson-node__number">{world.unit}</span>
                <span className="lesson-node__icon" aria-hidden="true">
                  {isCompleted ? (
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
              <small>{world.spanishName}</small>
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
            </div>
          </article>
        );
      })}
    </section>
  );
}
