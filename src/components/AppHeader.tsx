import { Flame, Map, RotateCcw, Star, Trophy } from "lucide-react";
import { worlds } from "../data/worlds";
import { getCurrentWorldIndex } from "../engine/game";
import { useGame } from "../state/GameContext";
import { VoiceSettings } from "./VoiceSettings";

type AppHeaderProps = {
  onMap: () => void;
  compact?: boolean;
};

export function AppHeader({ onMap, compact = false }: AppHeaderProps) {
  const { resetProgress, state } = useGame();
  const level = worlds[getCurrentWorldIndex(state, worlds)]?.unit ?? 1;

  const handleReset = () => {
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

        <div className="header-stats">
          <div
            className="toolbar-chip toolbar-chip--xp"
            title={`${state.xp} experience points`}
            aria-label={`${state.xp} experience points`}
            role="status"
          >
            <Star size={18} fill="currentColor" aria-hidden="true" />
            <span className="toolbar-chip__copy">
              <strong>{state.xp}</strong>
              <small>XP</small>
            </span>
          </div>
          <div
            className="toolbar-chip toolbar-chip--level"
            title={`Current level ${level}`}
            aria-label={`Current level ${level}`}
            role="status"
          >
            <Trophy size={18} aria-hidden="true" />
            <span className="toolbar-chip__copy">
              <strong>{level}</strong>
              <small>Level</small>
            </span>
          </div>
          <div
            className="toolbar-chip toolbar-chip--streak"
            title={`${state.streak} day streak`}
            aria-label={`${state.streak} day streak`}
            role="status"
          >
            <Flame size={18} fill="currentColor" aria-hidden="true" />
            <span className="toolbar-chip__copy">
              <strong>{state.streak}</strong>
              <small>Streak</small>
            </span>
          </div>
          <VoiceSettings />
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
        </div>
      </div>
    </header>
  );
}
