import {
  ArrowLeft,
  BookMarked,
  Brain,
  Play,
  Sparkles,
} from "lucide-react";
import { SpeakerButton } from "../components/SpeakerButton";
import { findWordWorld } from "../engine/courseScope";
import { useGame } from "../state/GameContext";
import type { Course } from "../types";

type MistakeNotebookScreenProps = {
  course: Course;
  onBack: () => void;
  onReplay: () => void;
};

export function MistakeNotebookScreen({
  course,
  onBack,
  onReplay,
}: MistakeNotebookScreenProps) {
  const { state } = useGame();
  const mistakeConceptIds = new Set([
    ...Object.keys(state.mistakes),
    ...Object.entries(state.words)
      .filter(([, record]) => record.incorrect > 0)
      .map(([wordId]) => wordId),
  ]);
  const entries = [...mistakeConceptIds]
    .map((conceptId) => {
      const match = findWordWorld(course.worlds, conceptId);
      if (!match) return null;
      const saved = state.mistakes[conceptId];
      const legacyRecord = state.words[conceptId];
      const mistake = saved ?? {
        conceptId,
        worldId: match.world.id,
        activityType: "multiple-choice" as const,
        incorrectCount: legacyRecord?.incorrect ?? 1,
        lastIncorrectAt:
          legacyRecord?.lastSeen ?? new Date(0).toISOString(),
        correctedAnswer: match.word.en,
        example: match.word.example,
      };
      return { mistake, ...match };
    })
    .filter((entry) => Boolean(entry))
    .sort(
      (first, second) =>
        new Date(second!.mistake.lastIncorrectAt).getTime() -
        new Date(first!.mistake.lastIncorrectAt).getTime(),
    );

  return (
    <main className="mistake-notebook-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" />
        Back to map
      </button>

      <section className="mistake-notebook-hero">
        <span>
          <BookMarked size={31} aria-hidden="true" />
        </span>
        <div>
          <span className="eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            {course.shortName}
          </span>
          <h1>Mistake Notebook</h1>
          <p>
            Corrections are saved without punishment, so tricky concepts become
            useful practice.
          </p>
        </div>
        <strong>{entries.length} concepts</strong>
      </section>

      {entries.length > 0 ? (
        <>
          <button
            className="mistake-replay-button"
            type="button"
            onClick={onReplay}
          >
            <Play size={19} fill="currentColor" aria-hidden="true" />
            Focused replay
            <small>Up to 10 short questions</small>
          </button>
          <section className="mistake-entry-list">
            {entries.map((entry) => {
              if (!entry) return null;
              const { mistake, word, world } = entry;
              return (
                <article key={mistake.conceptId}>
                  <div className="mistake-entry__heading">
                    <span>
                      <Brain size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <small>{world.name}</small>
                      <strong>{word.es}</strong>
                    </div>
                    <SpeakerButton
                      text={word.es}
                      label={`Hear ${word.es}`}
                    />
                  </div>
                  <div className="mistake-entry__correction">
                    <small>Correct meaning</small>
                    <strong>{mistake.correctedAnswer}</strong>
                  </div>
                  {mistake.example && (
                    <div className="mistake-entry__example">
                      <div>
                        <span>{mistake.example.es}</span>
                        <small>{mistake.example.en}</small>
                      </div>
                      <SpeakerButton
                        text={mistake.example.es}
                        label="Hear the correction example"
                      />
                    </div>
                  )}
                  <footer>
                    Practiced incorrectly {mistake.incorrectCount}{" "}
                    {mistake.incorrectCount === 1 ? "time" : "times"}
                  </footer>
                </article>
              );
            })}
          </section>
        </>
      ) : (
        <section className="learned-empty">
          <span aria-hidden="true">
            <BookMarked size={35} />
          </span>
          <h2>Your notebook is clear</h2>
          <p>
            Incorrect concepts will appear here with their correction and
            example.
          </p>
          <button className="primary-button" type="button" onClick={onBack}>
            Explore the map
          </button>
        </section>
      )}
    </main>
  );
}
