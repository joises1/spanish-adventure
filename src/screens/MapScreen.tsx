import { Compass, Lock, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { LessonMap } from "../components/LessonMap";
import { worlds } from "../data/worlds";
import type { World } from "../types";

type MapScreenProps = {
  onOpenWorld: (world: World) => void;
};

export function MapScreen({ onOpenWorld }: MapScreenProps) {
  const [query, setQuery] = useState("");
  const [highlightedWorldId, setHighlightedWorldId] = useState<string>();
  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return worlds.filter((world) =>
      `${world.name} ${world.spanishName}`.toLowerCase().includes(normalized),
    ).slice(0, 6);
  }, [query]);

  const jumpToWorld = (world: World) => {
    setHighlightedWorldId(world.id);
    setQuery("");
  };

  return (
    <main className="adventure-map-page">
      <section className="adventure-toolbar">
        <div className="adventure-toolbar__copy">
          <span className="eyebrow">
            <Compass size={16} aria-hidden="true" />
            Your Spanish trail
          </span>
          <h1>Climb from world to world</h1>
          <p>
            Earn a star to light the next stop. Previously played worlds stay
            open, and every little visit still counts.
          </p>
        </div>

        <div className="adventure-toolbar__actions">
          <div className="trail-tip">
            <Sparkles size={17} aria-hidden="true" />
            <span>Start at the bottom and adventure upward</span>
          </div>

          <div className="map-search">
            <label className="search-box">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Find a world on the trail</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a world..."
              />
            </label>

            {query && (
              <div className="map-search__results">
                {searchResults.map((world) => (
                  <button
                    type="button"
                    key={world.id}
                    onClick={() => jumpToWorld(world)}
                  >
                    <span aria-hidden="true">{world.icon}</span>
                    <span>
                      <strong>{world.name}</strong>
                      <small>World {world.unit}</small>
                    </span>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <span className="map-search__empty">
                    <Lock size={15} />
                    No world found
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <LessonMap
        worlds={worlds}
        highlightedWorldId={highlightedWorldId}
        onOpenWorld={onOpenWorld}
      />
    </main>
  );
}
