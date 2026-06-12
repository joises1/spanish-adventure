import { Check, Puzzle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { SessionResults } from "../components/SessionResults";
import {
  createActivitySession,
  scoreToStars,
  shuffle,
} from "../engine/activityEngine";
import { getWorldProgress } from "../engine/game";
import { ModeShell } from "../screens/LearnMode";
import { useGame } from "../state/GameContext";
import type { ActivityQuestion, World } from "../types";
import {
  getNewlyCollectedWords,
  getQuestionWords,
  getSessionScore,
  getSessionWords,
} from "./activityHelpers";

type MatchCard = {
  id: string;
  questionId: string;
  side: "es" | "en";
  text: string;
};

type MatchingActivityProps = {
  world: World;
  onBack: () => void;
  onComplete: () => void;
};

export function MatchingActivity({
  world,
  onBack,
  onComplete,
}: MatchingActivityProps) {
  const { completeActivity, recordActivityAnswer, state } = useGame();
  const [session] = useState(() => createActivitySession("matching", world));
  const [matchedIds, setMatchedIds] = useState(() => new Set<string>());
  const [selected, setSelected] = useState<MatchCard>();
  const [feedback, setFeedback] = useState("Choose one card from each side.");
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [sessionStartXp] = useState(() => state.xp);
  const [initialCollectedIds] = useState(
    () => new Set(getWorldProgress(state, world.id).collectedWordIds),
  );
  const sessionWords = getSessionWords(world, session.questions);
  const questionById = useMemo(
    () =>
      new Map<string, ActivityQuestion>(
        session.questions.map((question) => [question.id, question]),
      ),
    [session.questions],
  );
  const [cards] = useState<MatchCard[]>(() =>
    shuffle(
      session.questions.flatMap((question) => [
        {
          id: `${question.id}:es`,
          questionId: question.id,
          side: "es" as const,
          text: question.prompt,
        },
        {
          id: `${question.id}:en`,
          questionId: question.id,
          side: "en" as const,
          text: question.answer,
        },
      ]),
    ),
  );

  const chooseCard = (card: MatchCard) => {
    if (matchedIds.has(card.questionId)) return;
    if (!selected || selected.side === card.side) {
      setSelected(card);
      setFeedback(
        card.side === "es"
          ? "Now choose the English meaning."
          : "Now choose the Spanish match.",
      );
      return;
    }

    const spanishCard = selected.side === "es" ? selected : card;
    const spanishQuestion = questionById.get(spanishCard.questionId);
    if (!spanishQuestion) return;
    const isMatch = selected.questionId === card.questionId;
    recordActivityAnswer(
      world.id,
      "matching",
      getQuestionWords(world, spanishQuestion),
      isMatch,
    );

    if (!isMatch) {
      setMistakes((current) => current + 1);
      setFeedback("Not this pair. Take a breath and try another match.");
      setSelected(undefined);
      return;
    }

    const nextMatchedIds = new Set(matchedIds);
    nextMatchedIds.add(card.questionId);
    setMatchedIds(nextMatchedIds);
    setSelected(undefined);
    setFeedback("Perfect pair!");

    if (nextMatchedIds.size === session.questions.length) {
      const score = getSessionScore(
        session.questions.length,
        session.questions.length + mistakes,
      );
      completeActivity(world.id, "matching", sessionWords, score);
      setFinished(true);
    }
  };

  if (session.questions.length === 0) {
    return (
      <ModeShell
        world={world}
        title="Match"
        subtitle="This unit has no matching pairs yet"
        onBack={onBack}
        icon={<Puzzle size={19} />}
      >
        <section className="activity-empty">
          <h2>No pairs available</h2>
          <button className="primary-button" onClick={onBack}>
            Back to activities
          </button>
        </section>
      </ModeShell>
    );
  }

  if (finished) {
    const score = getSessionScore(
      session.questions.length,
      session.questions.length + mistakes,
    );
    return (
      <ModeShell
        world={world}
        title="Match complete"
        subtitle="Every pair found"
        onBack={onBack}
        icon={<Puzzle size={19} />}
      >
        <SessionResults
          title={`${score}%`}
          message={`You connected ${session.questions.length} Spanish and English pairs.`}
          stars={scoreToStars(score)}
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

  return (
    <ModeShell
      world={world}
      title="Match"
      subtitle="Connect Spanish with English"
      onBack={onBack}
      icon={<Puzzle size={19} />}
      current={matchedIds.size + 1}
      total={session.questions.length}
    >
      <section className="matching-board">
        <div className="matching-board__status" aria-live="polite">
          <Sparkles size={17} aria-hidden="true" />
          <span>{feedback}</span>
          <strong>
            {matchedIds.size}/{session.questions.length}
          </strong>
        </div>
        <div className="matching-grid">
          {cards.map((card) => {
            const isMatched = matchedIds.has(card.questionId);
            const isSelected = selected?.id === card.id;
            return (
              <button
                key={card.id}
                className={`match-card match-card--${card.side} ${
                  isSelected ? "match-card--selected" : ""
                } ${isMatched ? "match-card--matched" : ""}`}
                type="button"
                onClick={() => chooseCard(card)}
                disabled={isMatched}
                aria-pressed={isSelected}
              >
                <small>{card.side === "es" ? "ES" : "EN"}</small>
                <span>{card.text}</span>
                {isMatched && <Check size={17} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </section>
    </ModeShell>
  );
}
