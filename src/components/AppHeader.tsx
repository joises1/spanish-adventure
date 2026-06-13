import {
  BookMarked,
  BookOpenCheck,
  CalendarCheck,
  Flame,
  Map,
  Menu,
  Repeat2,
  Sparkles,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getCompletion,
  getCurrentWorldIndex,
  getStars,
  getXpMilestone,
} from "../engine/game";
import { useGame } from "../state/GameContext";
import type { Course, World } from "../types";
import { ProgressDataTools } from "./ProgressDataTools";
import { VoiceSettings } from "./VoiceSettings";

type AppHeaderProps = {
  course: Course;
  worlds: World[];
  onMap: () => void;
  onOpenLearned: () => void;
  onOpenMistakes: () => void;
  onOpenDailyReview: () => void;
  onSwitchCourse: () => void;
  onReturnToCourseSelection: () => void;
  compact?: boolean;
};

export function AppHeader({
  course,
  worlds,
  onMap,
  onOpenLearned,
  onOpenMistakes,
  onOpenDailyReview,
  onSwitchCourse,
  onReturnToCourseSelection,
  compact = false,
}: AppHeaderProps) {
  const { state } = useGame();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const currentWorldIndex = getCurrentWorldIndex(state, worlds);
  const currentWorld = worlds[currentWorldIndex] ?? worlds[0];
  const level = currentWorld?.unit ?? 1;
  const completedWorlds = worlds.filter(
    (world) => getStars(state, world) > 0,
  ).length;
  const currentCompletion = currentWorld
    ? getCompletion(state, currentWorld)
    : 0;
  const xpMilestone = getXpMilestone(state.xp);
  const learnedWordCount = Object.values(state.worlds).reduce(
    (total, progress) => total + (progress.collectedWordIds?.length ?? 0),
    0,
  );

  useEffect(() => {
    if (!isDrawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDrawerOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isDrawerOpen]);

  const openLearned = () => {
    setIsDrawerOpen(false);
    onOpenLearned();
  };

  const openMistakes = () => {
    setIsDrawerOpen(false);
    onOpenMistakes();
  };

  const openDailyReview = () => {
    setIsDrawerOpen(false);
    onOpenDailyReview();
  };

  return (
    <>
      <header className={`app-header ${compact ? "app-header--compact" : ""}`}>
        <div className="app-header__inner">
          <button className="brand" onClick={onMap} aria-label="Go to world map">
            <span className="brand__mark">
              <Map size={20} aria-hidden="true" />
            </span>
            <span>
              <strong>Spanish Adventure</strong>
              <small>Explore at your own pace</small>
            </span>
          </button>

          <button
            className="menu-button"
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-expanded={isDrawerOpen}
            aria-controls="adventure-side-drawer"
          >
            <Menu size={20} aria-hidden="true" />
            <span>Menu</span>
          </button>
        </div>
      </header>

      {isDrawerOpen && (
        <div className="side-drawer-shell">
          <button
            className="side-drawer-backdrop"
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close adventure menu"
          />
          <aside
            className="side-drawer"
            id="adventure-side-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Adventure menu"
          >
            <div className="side-drawer__heading">
              <div>
                <span className="eyebrow">
                  <Sparkles size={13} aria-hidden="true" />
                  {course.shortName}
                </span>
                <h2>Trail menu</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close adventure menu"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <section className="side-drawer__stats" aria-label="Progress">
              <article className="drawer-stat drawer-stat--xp">
                <span>
                  <Star size={18} fill="currentColor" aria-hidden="true" />
                </span>
                <div>
                  <small>Experience</small>
                  <strong>{state.xp} XP</strong>
                  <em>{xpMilestone.remaining} to next milestone</em>
                </div>
              </article>
              <article className="drawer-stat drawer-stat--level">
                <span>
                  <Trophy size={18} aria-hidden="true" />
                </span>
                <div>
                  <small>Level {level}</small>
                  <strong>{currentWorld?.name}</strong>
                  <em>
                    {currentCompletion}% explored / {completedWorlds} starred
                  </em>
                </div>
              </article>
              <article className="drawer-stat drawer-stat--streak">
                <span>
                  <Flame size={18} fill="currentColor" aria-hidden="true" />
                </span>
                <div>
                  <small>Daily streak</small>
                  <strong>
                    {state.streak} {state.streak === 1 ? "day" : "days"}
                  </strong>
                  <em>A little Spanish keeps it glowing</em>
                </div>
              </article>
            </section>

            <button
              className="drawer-course-button"
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                onSwitchCourse();
              }}
            >
              <span aria-hidden="true">{course.icon}</span>
              <div>
                <strong>Switch Course</strong>
                <small>Currently studying {course.shortName}</small>
              </div>
              <Repeat2 size={17} aria-hidden="true" />
            </button>

            <button
              className="drawer-course-return-button"
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                onReturnToCourseSelection();
              }}
            >
              <Map size={17} aria-hidden="true" />
              <span>
                <strong>Return to Course Selection</strong>
                <small>See A1-A2 Beginner and B1 Intermediate</small>
              </span>
            </button>

            <button
              className="drawer-learned-button"
              type="button"
              onClick={openLearned}
            >
              <span>
                <BookOpenCheck size={22} aria-hidden="true" />
              </span>
              <div>
                <strong>What You Learned</strong>
                <small>{learnedWordCount} words from completed sessions</small>
              </div>
            </button>

            <div className="drawer-review-grid">
              <button type="button" onClick={openDailyReview}>
                <CalendarCheck size={20} aria-hidden="true" />
                <span>
                  <strong>Daily Review</strong>
                  <small>5-10 adaptive questions</small>
                </span>
              </button>
              <button type="button" onClick={openMistakes}>
                <BookMarked size={20} aria-hidden="true" />
                <span>
                  <strong>Mistake Notebook</strong>
                  <small>
                    {
                      Object.values(state.mistakes).filter(
                        (mistake) => mistake.status !== "resolved",
                      ).length
                    }{" "}
                    active corrections
                  </small>
                </span>
              </button>
            </div>

            <VoiceSettings embedded />

            <ProgressDataTools
              course={course}
              onProgressChanged={() => {
                setIsDrawerOpen(false);
                onMap();
              }}
            />
          </aside>
        </div>
      )}
    </>
  );
}
