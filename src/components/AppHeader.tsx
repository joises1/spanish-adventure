import {
  Flame,
  Map,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { worlds } from "../data/worlds";
import {
  getCompletion,
  getCurrentWorldIndex,
  getStars,
  getXpMilestone,
} from "../engine/game";
import { useGame } from "../state/GameContext";
import { VoiceSettings } from "./VoiceSettings";

type AppHeaderProps = {
  onMap: () => void;
  compact?: boolean;
};

type InfoPanel = "xp" | "level" | "streak";

export function AppHeader({ onMap, compact = false }: AppHeaderProps) {
  const { resetProgress, state } = useGame();
  const [activePanel, setActivePanel] = useState<InfoPanel>();
  const statsRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        statsRef.current &&
        !statsRef.current.contains(event.target as Node)
      ) {
        setActivePanel(undefined);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePanel(undefined);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const togglePanel = (panel: InfoPanel) => {
    setActivePanel((current) => (current === panel ? undefined : panel));
  };

  const handleReset = () => {
    setActivePanel(undefined);
    const confirmed = window.confirm(
      "Reset all progress? This clears your XP, streak, stars, and review history.",
    );

    if (!confirmed) return;

    resetProgress();
    onMap();
  };

  return (
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

        <div className="header-stats" ref={statsRef}>
          <button
            className="toolbar-chip toolbar-chip--xp"
            title={`${state.xp} experience points`}
            aria-label={`${state.xp} experience points`}
            aria-expanded={activePanel === "xp"}
            aria-controls="toolbar-info-panel"
            type="button"
            onClick={() => togglePanel("xp")}
          >
            <Star size={18} fill="currentColor" aria-hidden="true" />
            <span className="toolbar-chip__copy">
              <strong>{state.xp}</strong>
              <small>XP</small>
            </span>
          </button>
          <button
            className="toolbar-chip toolbar-chip--level"
            title={`Current level ${level}`}
            aria-label={`Current level ${level}`}
            aria-expanded={activePanel === "level"}
            aria-controls="toolbar-info-panel"
            type="button"
            onClick={() => togglePanel("level")}
          >
            <Trophy size={18} aria-hidden="true" />
            <span className="toolbar-chip__copy">
              <strong>{level}</strong>
              <small>Level</small>
            </span>
          </button>
          <button
            className="toolbar-chip toolbar-chip--streak"
            title={`${state.streak} day streak`}
            aria-label={`${state.streak} day streak`}
            aria-expanded={activePanel === "streak"}
            aria-controls="toolbar-info-panel"
            type="button"
            onClick={() => togglePanel("streak")}
          >
            <Flame size={18} fill="currentColor" aria-hidden="true" />
            <span className="toolbar-chip__copy">
              <strong>{state.streak}</strong>
              <small>Streak</small>
            </span>
          </button>
          <div onClick={() => setActivePanel(undefined)}>
            <VoiceSettings />
          </div>
          <button
            className="reset-button"
            type="button"
            onClick={handleReset}
            title="Reset all saved progress"
            aria-label="Reset all saved progress"
          >
            <RotateCcw size={16} aria-hidden="true" />
            <span className="toolbar-action__label">Reset</span>
          </button>

          {activePanel && (
            <section
              className={`toolbar-info-panel toolbar-info-panel--${activePanel}`}
              id="toolbar-info-panel"
              aria-label={`${activePanel} details`}
            >
              <button
                className="toolbar-info-panel__close"
                type="button"
                onClick={() => setActivePanel(undefined)}
                aria-label="Close progress panel"
              >
                <X size={15} aria-hidden="true" />
              </button>

              {activePanel === "xp" && (
                <>
                  <span className="toolbar-info-panel__icon">
                    <Star size={20} fill="currentColor" aria-hidden="true" />
                  </span>
                  <div>
                    <small>Experience points</small>
                    <h2>{state.xp} XP</h2>
                    <p>
                      Earn XP by learning words and answering quiz questions.
                    </p>
                  </div>
                  <div className="toolbar-info-panel__progress">
                    <span>
                      <strong>{xpMilestone.remaining} XP</strong> to the{" "}
                      {xpMilestone.target} XP milestone
                    </span>
                    <div className="progress">
                      <span
                        style={{ width: `${xpMilestone.percentage}%` }}
                      />
                    </div>
                  </div>
                </>
              )}

              {activePanel === "level" && (
                <>
                  <span className="toolbar-info-panel__icon">
                    <Trophy size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <small>Adventure level</small>
                    <h2>Level {level}</h2>
                    <p>{currentWorld?.name} is your current stop.</p>
                  </div>
                  <div className="toolbar-info-panel__progress">
                    <span>
                      <strong>{currentCompletion}%</strong> explored ·{" "}
                      {completedWorlds} worlds starred
                    </span>
                    <div className="progress">
                      <span style={{ width: `${currentCompletion}%` }} />
                    </div>
                  </div>
                </>
              )}

              {activePanel === "streak" && (
                <>
                  <span className="toolbar-info-panel__icon">
                    <Flame size={20} fill="currentColor" aria-hidden="true" />
                  </span>
                  <div>
                    <small>Daily streak</small>
                    <h2>
                      {state.streak} {state.streak === 1 ? "day" : "days"}
                    </h2>
                    <p>
                      {state.streak > 1
                        ? "A lovely rhythm. A little Spanish today keeps it glowing."
                        : "Your adventure has begun. Come back tomorrow to grow it."}
                    </p>
                  </div>
                  <div className="toolbar-info-panel__encouragement">
                    <Sparkles size={15} aria-hidden="true" />
                    Gentle consistency beats cramming.
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </header>
  );
}
