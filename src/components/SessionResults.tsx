import { ArrowRight, BookOpenCheck, Sparkles, Star } from "lucide-react";
import type { VocabularyWord } from "../types";

type SessionResultsProps = {
  title: string;
  message: string;
  stars: number;
  xpGained: number;
  unlockedWords: VocabularyWord[];
  onContinue: () => void;
  onPracticeAgain?: () => void;
};

export function SessionResults({
  title,
  message,
  stars,
  xpGained,
  unlockedWords,
  onContinue,
  onPracticeAgain,
}: SessionResultsProps) {
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
          <small>World stars</small>
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
          <strong>{unlockedWords.length}</strong>
          <small>Words unlocked</small>
        </div>
      </div>

      {unlockedWords.length > 0 && (
        <div className="session-results__unlocks">
          <strong>New in your dictionary</strong>
          <div>
            {unlockedWords.slice(0, 5).map((word) => (
              <span key={word.id}>{word.es}</span>
            ))}
            {unlockedWords.length > 5 && (
              <span>+{unlockedWords.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      <div className="results-actions">
        {onPracticeAgain && (
          <button className="secondary-button" onClick={onPracticeAgain}>
            Practice again
          </button>
        )}
        <button className="primary-button" onClick={onContinue}>
          Continue to map
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
