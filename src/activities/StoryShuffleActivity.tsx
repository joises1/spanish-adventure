import {
  ArrowDown,
  ArrowUp,
  Check,
  Languages,
  ListOrdered,
  Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import { SessionResults } from "../components/SessionResults";
import { SpeakerButton } from "../components/SpeakerButton";
import {
  scoreToStars,
} from "../engine/activityEngine";
import { getWorldProgress } from "../engine/game";
import { generateStoryShuffleQuestion } from "../engine/narrativeEngine";
import {
  getSnapshotNumber,
  getSnapshotStringArray,
} from "../engine/sessionRecovery";
import { ModeShell } from "../screens/LearnMode";
import { useGame } from "../state/GameContext";
import { createProgressEventId } from "../state/progressEvents";
import { useRecoverableSession } from "../state/SessionContext";
import type {
  CourseId,
  StorySentence,
  VocabularyWord,
  World,
} from "../types";
import { getNewlyCollectedWords } from "./activityHelpers";

type StoryShuffleActivityProps = {
  courseId: CourseId;
  world: World;
  previouslyLearnedWords: VocabularyWord[];
  onBack: () => void;
  onBackToMap: () => void;
  onComplete: () => void;
};

export function StoryShuffleActivity({
  courseId,
  world,
  previouslyLearnedWords,
  onBack,
  onBackToMap,
  onComplete,
}: StoryShuffleActivityProps) {
  const { completeActivity, state } = useGame();
  const recovery = useRecoverableSession({
    courseId,
    world,
    activityType: "story-shuffle",
  });
  const sessionId = recovery.sessionId;
  const [question] = useState(() =>
    generateStoryShuffleQuestion(
      world,
      previouslyLearnedWords,
      recovery.seed,
    ),
  );
  const [sentences, setSentences] = useState<StorySentence[]>(() => {
    const source = question?.storySentences ?? [];
    const restoredIds = getSnapshotStringArray(
      recovery.restored,
      "sentenceIds",
    );
    const byId = new Map(source.map((sentence) => [sentence.id, sentence]));
    const restored = restoredIds
      .map((id) => byId.get(id))
      .filter((sentence): sentence is StorySentence => Boolean(sentence));
    return restored.length === source.length ? restored : source;
  });
  const [attempts, setAttempts] = useState(() =>
    getSnapshotNumber(recovery.restored, "attempts"),
  );
  const [message, setMessage] = useState(
    "Use the sequence clues to rebuild the story.",
  );
  const [finished, setFinished] = useState(
    () => recovery.restored?.status === "completed",
  );
  const [finalScore, setFinalScore] = useState(() =>
    getSnapshotNumber(recovery.restored, "finalScore"),
  );
  const [orderChecked, setOrderChecked] = useState(false);
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
  const currentWords =
    question?.sourceWordIds
      .map((wordId) => world.words.find((word) => word.id === wordId))
      .filter((word): word is VocabularyWord => Boolean(word)) ?? [];
  const completionStarted = useRef(false);
  const snapshotPayload = (
    nextSentences = sentences,
    nextAttempts = attempts,
    score = finalScore,
  ) => ({
    sentenceIds: nextSentences.map((sentence) => sentence.id),
    attempts: nextAttempts,
    finalScore: score,
    sessionStartXp,
    initialCollectedIds: [...initialCollectedIds],
  });

  const moveSentence = (sentenceIndex: number, direction: -1 | 1) => {
    const target = sentenceIndex + direction;
    if (target < 0 || target >= sentences.length || finished) return;
    setOrderChecked(false);
    const next = [...sentences];
    [next[sentenceIndex], next[target]] = [
      next[target],
      next[sentenceIndex],
    ];
    setSentences(next);
    recovery.checkpoint({
      index: 0,
      total: 1,
      meaningful: true,
      payload: snapshotPayload(next),
    });
  };

  const finishStory = (score: number, orderedSentences = sentences) => {
    if (!question || completionStarted.current) return;
    void orderedSentences;
    completionStarted.current = true;
    setFinalScore(score);
    completeActivity({
      kind: "activity-completion",
      id: createProgressEventId(sessionId, "completion", "story-shuffle"),
      worldId: world.id,
      activityType: "story-shuffle",
      words: currentWords,
      score,
      rewardXp: score >= 80 ? 10 : 2,
    });
    recovery.checkpoint({
      index: 0,
      total: 1,
      correctCount: 1,
      answeredCount: attempts + 1,
      meaningful: false,
      status: "completed",
      payload: snapshotPayload(orderedSentences, attempts, score),
    });
    setFinished(true);
  };

  const checkStory = () => {
    if (!question || orderChecked || completionStarted.current) return;
    setOrderChecked(true);
    const correct = sentences.every(
      (sentence, sentenceIndex) =>
        sentence.id === question.orderedItemIds?.[sentenceIndex],
    );
    if (correct) {
      finishStory(attempts === 0 ? 100 : attempts === 1 ? 80 : 60);
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    recovery.checkpoint({
      index: 0,
      total: 1,
      answeredCount: nextAttempts,
      meaningful: true,
      payload: snapshotPayload(sentences, nextAttempts),
    });
    setMessage(
      "Not quite yet. Look for Primero, Después, and Al final.",
    );
  };

  const revealAndFinish = () => {
    if (!question) return;
    const ordered = [...sentences].sort(
      (first, second) => first.position - second.position,
    );
    setSentences(ordered);
    finishStory(60, ordered);
  };

  if (!question) {
    return (
      <ModeShell
        world={world}
        title="Story Shuffle"
        subtitle="This unit needs vocabulary for a story"
        onBack={onBack}
        onBackToMap={onBackToMap}
        icon={<ListOrdered size={19} />}
      >
        <section className="activity-empty">
          <h2>No story available yet</h2>
          <button className="primary-button" onClick={onBack}>
            Back to activities
          </button>
        </section>
      </ModeShell>
    );
  }

  if (finished) {
    const score = finalScore;
    return (
      <ModeShell
        world={world}
        title="Story complete"
        subtitle="The whole mini-story makes sense"
        onBack={onBack}
        onBackToMap={onBackToMap}
        icon={<ListOrdered size={19} />}
      >
        <div className="story-results-stack">
          <section className="story-translation">
            <span className="eyebrow">
              <Languages size={15} aria-hidden="true" />
              English translation revealed
            </span>
            {sentences
              .slice()
              .sort((first, second) => first.position - second.position)
              .map((sentence) => (
                <article key={sentence.id}>
                  <strong>{sentence.es}</strong>
                  <span>{sentence.en}</span>
                </article>
              ))}
          </section>
          <SessionResults
            title={`${score}%`}
            message={`You rebuilt a coherent ${sentences.length}-sentence story in ${attempts + 1} attempt${attempts === 0 ? "" : "s"}.`}
            stars={scoreToStars(score)}
            starsLabel="Story stars"
            xpGained={Math.max(0, state.xp - sessionStartXp)}
            learnedWords={getNewlyCollectedWords(
              currentWords,
              initialCollectedIds,
            )}
            onContinue={onComplete}
          />
        </div>
      </ModeShell>
    );
  }

  return (
    <ModeShell
      world={world}
      title="Story Shuffle"
      subtitle="Build one clear beginning, middle, and ending"
      onBack={onBack}
      onBackToMap={onBackToMap}
      icon={<ListOrdered size={19} />}
      current={1}
      total={1}
    >
      <section className="story-shuffle-card">
        <div className="story-shuffle-card__heading">
          <div>
            <span className="card-label">Mini-story</span>
            <h2>{question.prompt}</h2>
          </div>
          <span>
            <Sparkles size={15} aria-hidden="true" />
            {attempts === 0 ? "Full stars available" : `${attempts} attempts`}
          </span>
        </div>

        <p className="story-shuffle-message" aria-live="polite">
          {message}
        </p>

        <div className="story-sentence-list">
          {sentences.map((sentence, sentenceIndex) => (
            <article key={sentence.id}>
              <span className="story-sentence-list__number">
                {sentenceIndex + 1}
              </span>
              <div>
                <span>{sentence.es}</span>
                <SpeakerButton
                  text={sentence.es}
                  label="Hear this story sentence"
                />
              </div>
              <span className="story-sentence-list__controls">
                <button
                  type="button"
                  onClick={() => moveSentence(sentenceIndex, -1)}
                  disabled={sentenceIndex === 0}
                  aria-label="Move sentence up"
                >
                  <ArrowUp size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSentence(sentenceIndex, 1)}
                  disabled={sentenceIndex === sentences.length - 1}
                  aria-label="Move sentence down"
                >
                  <ArrowDown size={17} />
                </button>
              </span>
            </article>
          ))}
        </div>

        <div className="story-shuffle-actions">
          {attempts >= 2 && (
            <button
              className="secondary-button"
              type="button"
              onClick={revealAndFinish}
              disabled={completionStarted.current}
            >
              Reveal order and finish
            </button>
          )}
          <button
            className="primary-button"
            type="button"
            onClick={checkStory}
            disabled={orderChecked || completionStarted.current}
          >
            Check story
            <Check size={18} />
          </button>
        </div>
      </section>
    </ModeShell>
  );
}
