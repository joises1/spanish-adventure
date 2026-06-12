import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { useRef, useState } from "react";
import { SessionResults } from "../components/SessionResults";
import { SpeakerButton } from "../components/SpeakerButton";
import { createActivitySession } from "../engine/activityEngine";
import { getWorldProgress } from "../engine/game";
import { useGame } from "../state/GameContext";
import type { World } from "../types";
import { ModeShell } from "../screens/LearnMode";
import {
  getNewlyCollectedWords,
  getQuestionWords,
  getSessionWords,
} from "./activityHelpers";

type ExploreActivityProps = {
  world: World;
  onBack: () => void;
  onComplete: () => void;
};

export function ExploreActivity({
  world,
  onBack,
  onComplete,
}: ExploreActivityProps) {
  const { completeActivity, recordActivitySeen, state } = useGame();
  const [session] = useState(() => createActivitySession("explore", world));
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [sessionStartXp] = useState(() => state.xp);
  const [initialCollectedIds] = useState(
    () => new Set(getWorldProgress(state, world.id).collectedWordIds),
  );
  const recordedIds = useRef(new Set<string>());
  const question = session.questions[index];
  const sessionWords = getSessionWords(world, session.questions);

  const recordSeen = () => {
    if (!question || recordedIds.current.has(question.id)) return;
    recordedIds.current.add(question.id);
    recordActivitySeen(
      world.id,
      "explore",
      getQuestionWords(world, question),
    );
  };

  const moveNext = () => {
    recordSeen();
    if (index >= session.questions.length - 1) {
      completeActivity(world.id, "explore", sessionWords, 100);
      setFinished(true);
      return;
    }
    setIndex((current) => current + 1);
  };

  if (!question) {
    return (
      <ModeShell
        world={world}
        title="Explore"
        subtitle="This unit has no vocabulary yet"
        onBack={onBack}
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
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
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
