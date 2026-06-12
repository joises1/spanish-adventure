import { ArrowLeft, BookOpenCheck, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { SpeakerButton } from "../components/SpeakerButton";
import { worlds } from "../data/worlds";
import { useGame } from "../state/GameContext";

type WhatYouLearnedScreenProps = {
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

const allEntries = worlds.flatMap((world) =>
  world.words.map((word) => ({
    word,
    worldName: world.name,
    worldUnit: world.unit,
    sortKey: getSortKey(word.es),
  })),
);

export function WhatYouLearnedScreen({
  onBack,
}: WhatYouLearnedScreenProps) {
  const { state } = useGame();
  const [query, setQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("ALL");
  const collectedIds = useMemo(
    () =>
      new Set(
        Object.values(state.worlds).flatMap(
          (worldProgress) => worldProgress.collectedWordIds ?? [],
        ),
      ),
    [state.worlds],
  );
  const completedSessions = Object.values(state.worlds).reduce(
    (total, progress) => total + (progress.completedSessions ?? 0),
    0,
  );
  const learnedEntries = useMemo(
    () =>
      allEntries
        .filter((entry) => collectedIds.has(entry.word.id))
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
    [collectedIds],
  );
  const filteredEntries = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    return learnedEntries.filter((entry) => {
      const firstLetter = entry.sortKey.charAt(0).toUpperCase();
      const matchesLetter =
        selectedLetter === "ALL" || firstLetter === selectedLetter;
      if (!matchesLetter) return false;
      if (!normalizedQuery) return true;

      return normalize(
        `${entry.word.es} ${entry.word.en} ${entry.worldName}`,
      ).includes(normalizedQuery);
    });
  }, [learnedEntries, query, selectedLetter]);

  return (
    <main className="dictionary-page learned-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" />
        Back to map
      </button>

      <section className="dictionary-hero learned-hero">
        <span className="dictionary-hero__icon" aria-hidden="true">
          <BookOpenCheck size={32} />
        </span>
        <div>
          <span className="eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            Your personal collection
          </span>
          <h1>What You Learned</h1>
          <p>
            Words appear here after you finish a learning, flashcard, quiz, or
            review session.
          </p>
        </div>
        <div className="dictionary-progress">
          <strong>{learnedEntries.length}</strong>
          <span>
            words from {completedSessions} completed{" "}
            {completedSessions === 1 ? "session" : "sessions"}
          </span>
        </div>
      </section>

      {learnedEntries.length > 0 ? (
        <>
          <section className="dictionary-tools" aria-label="Collection filters">
            <label className="search-box">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search what you learned</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your learned words..."
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
            {filteredEntries.map(({ word, worldName, worldUnit, sortKey }) => (
              <article className="dictionary-entry" key={word.id}>
                <span className="dictionary-entry__letter" aria-hidden="true">
                  {sortKey.charAt(0).toUpperCase()}
                </span>
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
              </article>
            ))}

            {filteredEntries.length === 0 && (
              <div className="dictionary-empty">
                <Search size={25} aria-hidden="true" />
                <strong>No learned word matches that search.</strong>
                <span>Try another letter or search term.</span>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="learned-empty">
          <span aria-hidden="true">
            <BookOpenCheck size={35} />
          </span>
          <h2>Your first words are waiting</h2>
          <p>
            Finish any 10-item session and the words you practiced will appear
            here.
          </p>
          <button className="primary-button" type="button" onClick={onBack}>
            Explore the map
          </button>
        </section>
      )}
    </main>
  );
}
