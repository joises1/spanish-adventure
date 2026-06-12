import {
  ArrowLeft,
  BookOpen,
  Lock,
  Search,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SpeakerButton } from "../components/SpeakerButton";
import { worlds } from "../data/worlds";
import { useGame } from "../state/GameContext";

type DictionaryScreenProps = {
  onBack: () => void;
};

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const leadingArticles = /^(el|la|los|las|un|una|unos|unas)\s+/i;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const getSortKey = (value: string) =>
  normalize(value.replace(leadingArticles, "")).replace(/[^a-z]/g, "");

const entries = worlds
  .flatMap((world) =>
    world.words.map((word) => ({
      word,
      worldName: world.name,
      worldUnit: world.unit,
      sortKey: getSortKey(word.es),
    })),
  )
  .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

export function DictionaryScreen({ onBack }: DictionaryScreenProps) {
  const { state } = useGame();
  const [query, setQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("ALL");
  const unlockedIds = useMemo(
    () =>
      new Set(
        Object.values(state.worlds).flatMap(
          (worldProgress) => worldProgress.learnedWordIds,
        ),
      ),
    [state.worlds],
  );
  const unlockedCount = unlockedIds.size;
  const filteredEntries = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    return entries.filter((entry) => {
      const firstLetter = entry.sortKey.charAt(0).toUpperCase();
      const matchesLetter =
        selectedLetter === "ALL" || firstLetter === selectedLetter;
      if (!matchesLetter) return false;
      if (!normalizedQuery) return true;
      if (!unlockedIds.has(entry.word.id)) return false;

      return normalize(
        `${entry.word.es} ${entry.word.en} ${entry.worldName}`,
      ).includes(normalizedQuery);
    });
  }, [query, selectedLetter, unlockedIds]);

  return (
    <main className="dictionary-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" />
        Back to map
      </button>

      <section className="dictionary-hero">
        <span className="dictionary-hero__icon" aria-hidden="true">
          <BookOpen size={32} />
        </span>
        <div>
          <span className="eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            Your growing collection
          </span>
          <h1>A-Z Dictionary</h1>
          <p>
            Every lesson uncovers more Spanish. Locked words are waiting along
            the trail.
          </p>
        </div>
        <div className="dictionary-progress">
          <strong>{unlockedCount}</strong>
          <span>of {entries.length} words unlocked</span>
          <div className="progress" aria-hidden="true">
            <span
              style={{
                width: `${Math.round((unlockedCount / entries.length) * 100)}%`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="dictionary-tools" aria-label="Dictionary filters">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search unlocked dictionary words</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search unlocked words..."
          />
        </label>

        <div className="dictionary-alphabet" aria-label="Filter by letter">
          <button
            className={selectedLetter === "ALL" ? "is-active" : ""}
            type="button"
            onClick={() => setSelectedLetter("ALL")}
          >
            All
          </button>
          {alphabet.map((letter) => (
            <button
              className={selectedLetter === letter ? "is-active" : ""}
              type="button"
              key={letter}
              onClick={() => setSelectedLetter(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
      </section>

      <section className="dictionary-list" aria-live="polite">
        {filteredEntries.map(({ word, worldName, worldUnit, sortKey }) => {
          const isUnlocked = unlockedIds.has(word.id);
          return (
            <article
              className={`dictionary-entry ${
                isUnlocked ? "" : "dictionary-entry--locked"
              }`}
              key={word.id}
            >
              <span className="dictionary-entry__letter" aria-hidden="true">
                {sortKey.charAt(0).toUpperCase()}
              </span>
              {isUnlocked ? (
                <>
                  <div className="dictionary-entry__content">
                    <div className="dictionary-entry__term">
                      <div>
                        <strong>{word.es}</strong>
                        <span>{word.en}</span>
                      </div>
                      <SpeakerButton
                        text={word.es}
                        label={`Hear the Spanish word ${word.es}`}
                      />
                    </div>
                    {word.example && (
                      <div className="dictionary-entry__example">
                        <div>
                          <em>{word.example.es}</em>
                          <span>{word.example.en}</span>
                        </div>
                        <SpeakerButton
                          text={word.example.es}
                          label="Hear the Spanish example sentence"
                        />
                      </div>
                    )}
                    <small>
                      World {worldUnit}: {worldName}
                    </small>
                  </div>
                </>
              ) : (
                <div className="dictionary-entry__locked-content">
                  <Lock size={18} aria-hidden="true" />
                  <div>
                    <strong>Undiscovered word</strong>
                    <span>Complete lessons in World {worldUnit} to reveal it.</span>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {filteredEntries.length === 0 && (
          <div className="dictionary-empty">
            <Search size={25} aria-hidden="true" />
            <strong>No unlocked word matches that search yet.</strong>
            <span>Keep exploring and your dictionary will grow.</span>
          </div>
        )}
      </section>
    </main>
  );
}
