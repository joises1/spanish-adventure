import { Flame, Map, RotateCcw, Sparkles } from "lucide-react";
import { useGame } from "../state/GameContext";
import { VoiceSettings } from "./VoiceSettings";

type AppHeaderProps = {
  onMap: () => void;
  compact?: boolean;
};

export function AppHeader({ onMap, compact = false }: AppHeaderProps) {
  const { resetProgress, state } = useGame();

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
          <div className="stat-pill" title="Experience points">
            <Sparkles size={17} aria-hidden="true" />
            <strong>{state.xp}</strong>
            <span>XP</span>
          </div>
          <div
            className="stat-pill stat-pill--warm"
            title="Daily learning streak"
          >
            <Flame size={17} aria-hidden="true" />
            <strong>{state.streak}</strong>
            <span>day streak</span>
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
            <span>Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
}
