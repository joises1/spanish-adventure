import { Compass, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { LessonMap } from "../components/LessonMap";
import type { Course, World } from "../types";

type MapScreenProps = {
  course: Course;
  worlds: World[];
  onOpenWorld: (world: World) => void;
};

export function MapScreen({
  course,
  worlds,
  onOpenWorld,
}: MapScreenProps) {
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedWorldId, setHighlightedWorldId] = useState<string>();
  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return worlds;
    return worlds.filter((world) =>
      `${world.name} ${world.spanishName}`.toLowerCase().includes(normalized),
    );
  }, [query, worlds]);

  const jumpToWorld = (world: World) => {
    setHighlightedWorldId(world.id);
    setQuery("");
    setIsSearchOpen(false);
  };

  return (
    <main className="adventure-map-page">
      <section className="adventure-toolbar">
        <div className="adventure-toolbar__copy">
          <span className="eyebrow">
            <Compass size={16} aria-hidden="true" />
            {course.shortName}
          </span>
          <h1>{course.name} map</h1>
        </div>

        <div className="adventure-toolbar__actions">
          <button
            className="find-world-button"
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-expanded={isSearchOpen}
            aria-controls="find-world-panel"
          >
            <Search size={17} aria-hidden="true" />
            <span>Find world</span>
          </button>
        </div>

        {isSearchOpen && (
          <div
            className="map-search-panel"
            id="find-world-panel"
            role="dialog"
            aria-label="Find a world"
          >
            <div className="map-search-panel__heading">
              <div>
                <strong>Find world</strong>
                <small>Jump to any stop on your trail</small>
              </div>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                aria-label="Close world search"
                title="Close world search"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <label className="search-box">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Find a world on the trail</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type a topic..."
                autoFocus
              />
            </label>

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
                  <Search size={15} />
                  No world found
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      <LessonMap
        worlds={worlds}
        highlightedWorldId={highlightedWorldId}
        onOpenWorld={onOpenWorld}
      />
    </main>
  );
}
