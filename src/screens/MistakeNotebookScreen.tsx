import {
  ArrowLeft,
  BookMarked,
  Brain,
  CheckCircle2,
  Play,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SpeakerButton } from "../components/SpeakerButton";
import { findWordWorld } from "../engine/courseScope";
import { useGame } from "../state/GameContext";
import type {
  Course,
  MasterySkill,
  MistakeRecord,
  MistakeStatus,
} from "../types";

type MistakeNotebookScreenProps = {
  course: Course;
  onBack: () => void;
  onReplay: (selectedConceptIds?: string[]) => void;
};

type StatusFilter = "unresolved" | "improved" | "resolved" | "all";
type SkillFilter = MasterySkill | "all";

const statusLabels: Record<MistakeStatus, string> = {
  new: "New",
  practicing: "Practicing",
  improved: "Improved",
  resolved: "Resolved",
};

const skillLabels: Record<MasterySkill, string> = {
  vocabulary: "Vocabulary",
  listening: "Listening",
  "sentence-building": "Sentence building",
  grammar: "Grammar",
  dialogue: "Dialogue / context",
};

const matchesStatus = (
  status: MistakeStatus,
  filter: StatusFilter,
) => {
  if (filter === "all") return true;
  if (filter === "unresolved") {
    return status === "new" || status === "practicing";
  }
  return status === filter;
};

export function MistakeNotebookScreen({
  course,
  onBack,
  onReplay,
}: MistakeNotebookScreenProps) {
  const { state } = useGame();
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("unresolved");
  const [skillFilter, setSkillFilter] = useState<SkillFilter>("all");
  const [courseFilter, setCourseFilter] = useState<"all" | Course["id"]>(
    course.id,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const entries = useMemo(() => {
    const mistakeConceptIds = new Set([
      ...Object.keys(state.mistakes),
      ...Object.entries(state.words)
        .filter(([, record]) => record.incorrect > 0)
        .map(([wordId]) => wordId),
    ]);

    return [...mistakeConceptIds]
      .map((conceptId) => {
        const match = findWordWorld(course.worlds, conceptId);
        if (!match) return null;
        const saved = state.mistakes[conceptId];
        const legacyRecord = state.words[conceptId];
        const mistake: MistakeRecord = saved ?? {
          conceptId,
          courseId: course.id,
          worldId: match.world.id,
          unit: match.world.unit,
          activityType: "multiple-choice",
          skill: "vocabulary",
          status: "practicing",
          userAnswer: "Not recorded",
          correctAnswer: match.word.en,
          explanation: `${match.word.es} means ${match.word.en}.`,
          incorrectCount: legacyRecord?.incorrect ?? 1,
          consecutiveErrors: legacyRecord?.incorrect ?? 1,
          consecutiveSuccesses: 0,
          successfulReviews: 0,
          reopenErrors: 0,
          reopenedCount: 0,
          lastIncorrectAt:
            legacyRecord?.lastSeen ?? new Date(0).toISOString(),
          lastPracticedAt:
            legacyRecord?.lastSeen ?? new Date(0).toISOString(),
          example: match.word.example,
        };
        return { mistake, ...match };
      })
      .filter((entry) => Boolean(entry))
      .sort(
        (first, second) =>
          new Date(second!.mistake.lastPracticedAt).getTime() -
          new Date(first!.mistake.lastPracticedAt).getTime(),
      );
  }, [course.id, course.worlds, state.mistakes, state.words]);

  const filteredEntries = entries.filter((entry) => {
    if (!entry) return false;
    return (
      matchesStatus(entry.mistake.status, statusFilter) &&
      (skillFilter === "all" || entry.mistake.skill === skillFilter) &&
      (courseFilter === "all" ||
        entry.mistake.courseId === courseFilter)
    );
  });
  const unresolvedCount = entries.filter(
    (entry) =>
      entry &&
      entry.mistake.status !== "resolved" &&
      entry.mistake.status !== "improved",
  ).length;
  const visibleSelectedCount = filteredEntries.filter(
    (entry) => entry && selectedIds.has(entry.mistake.conceptId),
  ).length;

  const toggleSelected = (conceptId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(conceptId)) next.delete(conceptId);
      else next.add(conceptId);
      return next;
    });
  };

  const replaySelected = () => {
    const visibleSelected = filteredEntries
      .filter(
        (entry) => entry && selectedIds.has(entry.mistake.conceptId),
      )
      .map((entry) => entry!.mistake.conceptId);
    onReplay(visibleSelected.length > 0 ? visibleSelected : undefined);
  };

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
            Corrections move from new to practicing, improved, and resolved as
            later answers show recovery.
          </p>
        </div>
        <strong>{unresolvedCount} active</strong>
      </section>

      <section className="mistake-filters" aria-label="Mistake filters">
        <label>
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            <option value="unresolved">Unresolved</option>
            <option value="improved">Improved</option>
            <option value="resolved">Resolved</option>
            <option value="all">All states</option>
          </select>
        </label>
        <label>
          <span>Course</span>
          <select
            value={courseFilter}
            onChange={(event) =>
              setCourseFilter(
                event.target.value as "all" | Course["id"],
              )
            }
          >
            <option value={course.id}>{course.shortName}</option>
            <option value="all">All visible</option>
          </select>
        </label>
        <label>
          <span>Skill</span>
          <select
            value={skillFilter}
            onChange={(event) =>
              setSkillFilter(event.target.value as SkillFilter)
            }
          >
            <option value="all">All skills</option>
            {Object.entries(skillLabels).map(([skill, label]) => (
              <option value={skill} key={skill}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {filteredEntries.length > 0 ? (
        <>
          <button
            className="mistake-replay-button"
            type="button"
            onClick={replaySelected}
          >
            <Play size={19} fill="currentColor" aria-hidden="true" />
            {visibleSelectedCount > 0
              ? `Practice selected (${visibleSelectedCount})`
              : "Focused replay"}
            <small>Up to 10 short questions</small>
          </button>
          <section className="mistake-entry-list">
            {filteredEntries.map((entry) => {
              if (!entry) return null;
              const { mistake, word, world } = entry;
              const selected = selectedIds.has(mistake.conceptId);
              return (
                <article
                  key={mistake.conceptId}
                  className={selected ? "is-selected" : ""}
                >
                  <div className="mistake-entry__select">
                    <label>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelected(mistake.conceptId)}
                      />
                      Select for practice
                    </label>
                    <span
                      className={`mistake-status mistake-status--${mistake.status}`}
                    >
                      {mistake.status === "resolved" && (
                        <CheckCircle2 size={12} aria-hidden="true" />
                      )}
                      {statusLabels[mistake.status]}
                    </span>
                  </div>
                  <div className="mistake-entry__heading">
                    <span>
                      <Brain size={19} aria-hidden="true" />
                    </span>
                    <div>
                      <small>
                        Unit {mistake.unit || world.unit} /{" "}
                        {skillLabels[mistake.skill]}
                      </small>
                      <strong>{word.es}</strong>
                    </div>
                    <SpeakerButton
                      text={word.es}
                      label={`Hear ${word.es}`}
                    />
                  </div>
                  <div className="mistake-entry__answers">
                    <div>
                      <small>Your answer</small>
                      <span>{mistake.userAnswer}</span>
                    </div>
                    <div>
                      <small>Correct answer</small>
                      <strong>{mistake.correctAnswer}</strong>
                    </div>
                  </div>
                  <p className="mistake-entry__explanation">
                    {mistake.explanation}
                  </p>
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
                    {mistake.incorrectCount} grouped{" "}
                    {mistake.incorrectCount === 1 ? "mistake" : "mistakes"} /{" "}
                    {mistake.consecutiveSuccesses} later successes
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
          <h2>No mistakes match these filters</h2>
          <p>Resolved and improved concepts remain available in other views.</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setSkillFilter("all");
            }}
          >
            Show all
          </button>
        </section>
      )}
    </main>
  );
}
