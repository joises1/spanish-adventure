import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { useRef, useState } from "react";
import { SessionResults } from "../components/SessionResults";
import { SpeakerButton } from "../components/SpeakerButton";
import { createActivitySession } from "../engine/activityEngine";
import { getWorldProgress } from "../engine/game";
import { createSeededRandom } from "../engine/narrativeEngine";
import {
  getSnapshotNumber,
  getSnapshotStringArray,
} from "../engine/sessionRecovery";
import { createProgressEventId } from "../state/progressEvents";
import { useGame } from "../state/GameContext";
import { useRecoverableSession } from "../state/SessionContext";
import type { CourseId, World } from "../types";
import { ModeShell } from "../screens/LearnMode";
import {
  getNewlyCollectedWords,
  getQuestionWords,
  getSessionWords,
} from "./activityHelpers";

type ExploreActivityProps = {
  courseId: CourseId;
  world: World;
  onBack: () => void;
  onBackToMap: () => void;
  onComplete: () => void;
};

export function ExploreActivity({
  courseId,
  world,
  onBack,
  onBackToMap,
  onComplete,
}: ExploreActivityProps) {
  const { completeActivity, recordActivitySeen, state } = useGame();
  const recovery = useRecoverableSession({
    courseId,
    world,
    activityType: "explore",
  });
  const [session] = useState(() => ({
    ...createActivitySession(
      "explore",
      world,
      createSeededRandom(recovery.seed),
    ),
    id: recovery.sessionId,
  }));
  const [index, setIndex] = useState(() =>
    Math.min(
      Math.max(0, recovery.restored?.index ?? 0),
      Math.max(0, session.questions.length - 1),
    ),
  );
  const [finished, setFinished] = useState(
    () => recovery.restored?.status === "completed",
  );
  const [sessionStartXp] = useState(() =>
    getSnapshotNumber(recovery.restored, "sessionStartXp", state.xp),
  );
  const [initialCollectedIds] = useState(
    () => {
      const restoredIds = getSnapshotStringArray(
        recovery.restored,
        "initialCollectedIds",
      );
      return new Set(
        restoredIds.length > 0
          ? restoredIds
          : getWorldProgress(state, world.id).collectedWordIds,
      );
    },
  );
  const recordedIds = useRef(new Set<string>());
  const completionStarted = useRef(false);
  const question = session.questions[index];
  const sessionWords = getSessionWords(world, session.questions);
  const snapshotPayload = {
    sessionStartXp,
    initialCollectedIds: [...initialCollectedIds],
  };

  const recordSeen = () => {
    if (!question || recordedIds.current.has(question.id)) return;
    recordedIds.current.add(question.id);
    recordActivitySeen({
      kind: "seen",
      id: createProgressEventId(session.id, "seen", question.id),
      worldId: world.id,
      activityType: "explore",
      words: getQuestionWords(world, question),
    });
  };

  const moveNext = () => {
    if (completionStarted.current) return;
    recordSeen();
    if (index >= session.questions.length - 1) {
      completionStarted.current = true;
      completeActivity({
        kind: "activity-completion",
        id: createProgressEventId(session.id, "completion", "explore"),
        worldId: world.id,
        activityType: "explore",
        words: sessionWords,
        score: 100,
      });
      recovery.checkpoint({
        index,
        total: session.questions.length,
        correctCount: session.questions.length,
        answeredCount: session.questions.length,
        meaningful: false,
        status: "completed",
        payload: snapshotPayload,
      });
      setFinished(true);
      return;
    }
    const nextIndex = index + 1;
    recovery.checkpoint({
      index: nextIndex,
      total: session.questions.length,
      meaningful: true,
      payload: snapshotPayload,
    });
    setIndex(nextIndex);
  };

  if (!question) {
    return (
      <ModeShell
        world={world}
        title="Explore"
        subtitle="This unit has no vocabulary yet"
        onBack={onBack}
        onBackToMap={onBackToMap}
        icon={<BookOpen size={19} />}
      >
        <section className="activity-empty">
          <h2>Nothing to explore yet</h2>
          <p>This unit needs at least one word before an activity can begin.</p>
          <button className="primary-button" onClick={onBack}>
            Back to activities
          </button>
        </section>
      </ModeShell>
    );
  }

  if (finished) {
    return (
      <ModeShell
        world={world}
        title="Explore complete"
        subtitle="New connections made"
        onBack={onBack}
        onBackToMap={onBackToMap}
        icon={<BookOpen size={19} />}
      >
        <SessionResults
          title="Beautiful exploring!"
          message={`You met ${sessionWords.length} useful Spanish words and phrases.`}
          stars={3}
          starsLabel="Activity stars"
          xpGained={Math.max(0, state.xp - sessionStartXp)}
          learnedWords={getNewlyCollectedWords(
            sessionWords,
            initialCollectedIds,
          )}
          onContinue={onComplete}
        />
      </ModeShell>
    );
  }

  const word = getQuestionWords(world, question)[0];

  return (
    <ModeShell
      world={world}
      title="Explore"
      subtitle="Spanish to English, one discovery at a time"
      onBack={onBack}
      onBackToMap={onBackToMap}
      icon={<BookOpen size={19} />}
      current={index + 1}
      total={session.questions.length}
    >
      <article className="learn-card activity-explore-card">
        <span className="card-label">Spanish</span>
        <div className="spoken-heading">
          <h2>{question.prompt}</h2>
          <SpeakerButton
            text={question.audioText ?? question.prompt}
            label={`Hear ${question.prompt}`}
          />
        </div>
        <div className="meaning-divider">
          <span />
          <BookOpen size={17} aria-hidden="true" />
          <span />
        </div>
        <span className="card-label">English meaning</span>
        <h3>{question.answer}</h3>
        {word?.example && (
          <div className="example-box">
            <div className="spoken-sentence">
              <strong>{word.example.es}</strong>
              <SpeakerButton
                text={word.example.es}
                label="Hear the example sentence"
              />
            </div>
            <span>{word.example.en}</span>
          </div>
        )}
      </article>

      <div className="mode-actions">
        <button
          className="secondary-button"
          onClick={() => {
            const nextIndex = Math.max(0, index - 1);
            recovery.checkpoint({
              index: nextIndex,
              total: session.questions.length,
              meaningful: true,
              payload: snapshotPayload,
            });
            setIndex(nextIndex);
          }}
          disabled={index === 0}
        >
          <ArrowLeft size={18} />
          Previous
        </button>
        <button className="primary-button" onClick={moveNext}>
          {index === session.questions.length - 1
            ? "Finish exploring"
            : "Next discovery"}
          <ArrowRight size={18} />
        </button>
      </div>
    </ModeShell>
  );
}
