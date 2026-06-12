import { ArrowRight, BookOpenCheck, Sparkles, Star } from "lucide-react";
import { useRef, useState } from "react";
import type { VocabularyWord } from "../types";

type SessionResultsProps = {
  title: string;
  message: string;
  stars: number;
  xpGained: number;
  learnedWords: VocabularyWord[];
  onContinue: () => void;
  onPracticeAgain?: () => void;
  starsLabel?: string;
};

export function SessionResults({
  title,
  message,
  stars,
  xpGained,
  learnedWords,
  onContinue,
  onPracticeAgain,
  starsLabel = "World stars",
}: SessionResultsProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const actionStarted = useRef(false);
  const runOnce = (action: () => void) => {
    if (actionStarted.current) return;
    actionStarted.current = true;
    setIsLeaving(true);
    action();
  };

  return (
    <section className="results-card session-results">
      <span className="results-card__icon">
        <Sparkles size={35} aria-hidden="true" />
      </span>
      <span className="eyebrow">Adventure complete</span>
      <h2>{title}</h2>
      <p>{message}</p>

      <div className="session-results__rewards">
        <div>
          <span className="session-results__reward-icon session-results__reward-icon--stars">
            <Star size={20} fill="currentColor" aria-hidden="true" />
          </span>
          <strong>{stars} / 3</strong>
          <small>{starsLabel}</small>
        </div>
        <div>
          <span className="session-results__reward-icon session-results__reward-icon--xp">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <strong>+{xpGained}</strong>
          <small>XP gained</small>
        </div>
        <div>
          <span className="session-results__reward-icon session-results__reward-icon--words">
            <BookOpenCheck size={20} aria-hidden="true" />
          </span>
          <strong>{learnedWords.length}</strong>
          <small>Words added</small>
        </div>
      </div>

      {learnedWords.length > 0 && (
        <div className="session-results__additions">
          <strong>Added to What You Learned</strong>
          <div>
            {learnedWords.slice(0, 5).map((word) => (
              <span key={word.id}>{word.es}</span>
            ))}
            {learnedWords.length > 5 && (
              <span>+{learnedWords.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      <div className="results-actions">
        {onPracticeAgain && (
          <button
            className="secondary-button"
            onClick={() => runOnce(onPracticeAgain)}
            disabled={isLeaving}
          >
            Practice again
          </button>
        )}
        <button
          className="primary-button"
          onClick={() => runOnce(onContinue)}
          disabled={isLeaving}
        >
          Continue to map
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
