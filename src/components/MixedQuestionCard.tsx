import {
  ArrowRight,
  Check,
  Headphones,
  MessageCircle,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { normalizeSentence } from "../engine/activityEngine";
import type { ActivityQuestion, ActivityToken } from "../types";
import { SpeakerButton } from "./SpeakerButton";

type MixedQuestionCardProps = {
  question: ActivityQuestion;
  onResult: (isCorrect: boolean, userAnswer: string) => void;
  onContinue: () => void;
  initialSelectedTokenIds?: string[];
  onDraftChange?: (selectedTokenIds: string[]) => void;
  isLast: boolean;
};

export function MixedQuestionCard({
  question,
  onResult,
  onContinue,
  initialSelectedTokenIds = [],
  onDraftChange,
  isLast,
}: MixedQuestionCardProps) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>();
  const [selectedTokens, setSelectedTokens] = useState<ActivityToken[]>(
    () => {
      const selectedIds = new Set(initialSelectedTokenIds);
      return question.tokens?.filter((token) => selectedIds.has(token.id)) ?? [];
    },
  );
  const [answered, setAnswered] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const submittedRef = useRef(false);
  const continuingRef = useRef(false);
  const builtSentence = selectedTokens.map((token) => token.text).join(" ");
  const isSentence = question.kind === "sentence-builder";
  const isCorrect = isSentence
    ? answered &&
      normalizeSentence(builtSentence) === normalizeSentence(question.answer)
    : selectedChoiceId === question.correctChoiceId;

  const choose = (choiceId: string) => {
    if (answered || submittedRef.current) return;
    submittedRef.current = true;
    const correct = choiceId === question.correctChoiceId;
    setSelectedChoiceId(choiceId);
    setAnswered(true);
    const selectedText =
      question.choices?.find((choice) => choice.id === choiceId)?.text ?? "";
    onResult(correct, selectedText);
  };

  const addToken = (token: ActivityToken) => {
    if (answered) return;
    const next = [...selectedTokens, token];
    setSelectedTokens(next);
    onDraftChange?.(next.map((item) => item.id));
  };

  const removeToken = (token: ActivityToken) => {
    if (answered) return;
    const next = selectedTokens.filter((item) => item.id !== token.id);
    setSelectedTokens(next);
    onDraftChange?.(next.map((item) => item.id));
  };

  const checkSentence = () => {
    if (
      answered ||
      submittedRef.current ||
      selectedTokens.length === 0
    ) {
      return;
    }
    submittedRef.current = true;
    const correct =
      normalizeSentence(builtSentence) === normalizeSentence(question.answer);
    setAnswered(true);
    onResult(correct, builtSentence);
  };

  const selectedIds = new Set(selectedTokens.map((token) => token.id));
  const availableTokens =
    question.tokens?.filter((token) => !selectedIds.has(token.id)) ?? [];
  const continueOnce = () => {
    if (continuingRef.current) return;
    continuingRef.current = true;
    setContinuing(true);
    onContinue();
  };

  return (
    <section className="mixed-question-card">
      <div className="mixed-question-card__heading">
        <span className="card-label">{question.skill ?? "Practice"}</span>
        {(question.audioText || question.kind === "listening-choice") && (
          <SpeakerButton
            text={question.audioText ?? question.prompt}
            label="Play Spanish audio"
          />
        )}
      </div>

      {question.kind === "listening-choice" ? (
        <div className="mixed-listening-prompt">
          <Headphones size={25} aria-hidden="true" />
          <h2>Listen, then choose the meaning.</h2>
        </div>
      ) : (
        <h2>{question.prompt}</h2>
      )}

      {question.dialogueTurns && (
        <div className="dialogue-transcript">
          {question.dialogueTurns.map((turn) => (
            <article
              className={turn.isLearnerTurn ? "is-learner" : ""}
              key={turn.id}
            >
              <div>
                <small>{turn.speaker}</small>
                <span>{turn.text}</span>
              </div>
              <SpeakerButton
                text={turn.text}
                label={`Hear ${turn.speaker}'s line`}
              />
            </article>
          ))}
        </div>
      )}

      {question.storySentences && (
        <div className="challenge-story">
          {question.storySentences
            .slice()
            .sort((first, second) => first.position - second.position)
            .map((sentence) => (
              <div key={sentence.id}>
                <span>{sentence.es}</span>
                <SpeakerButton
                  text={sentence.es}
                  label="Hear this story sentence"
                />
              </div>
            ))}
        </div>
      )}

      {isSentence ? (
        <>
          <div
            className={`sentence-builder__answer ${
              answered
                ? isCorrect
                  ? "sentence-builder__answer--correct"
                  : "sentence-builder__answer--wrong"
                : ""
            }`}
          >
            {selectedTokens.length === 0 && (
              <span className="sentence-builder__placeholder">
                Build your Spanish sentence
              </span>
            )}
            {selectedTokens.map((token) => (
              <button
                key={token.id}
                type="button"
                onClick={() => removeToken(token)}
                disabled={answered}
              >
                {token.text}
              </button>
            ))}
          </div>
          <div className="sentence-builder__tiles">
            {availableTokens.map((token) => (
              <button
                key={token.id}
                type="button"
                onClick={() => addToken(token)}
                disabled={answered}
              >
                {token.text}
              </button>
            ))}
          </div>
          {!answered && (
            <div className="sentence-builder__actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setSelectedTokens([]);
                  onDraftChange?.([]);
                }}
                disabled={selectedTokens.length === 0}
              >
                <RotateCcw size={17} />
                Clear
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={checkSentence}
                disabled={selectedTokens.length === 0}
              >
                Check
                <Check size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="choice-grid mixed-choice-grid">
          {question.choices?.map((choice) => {
            const chosen = selectedChoiceId === choice.id;
            const correctChoice =
              answered && choice.id === question.correctChoiceId;
            const wrongChoice = chosen && !correctChoice;
            return (
              <button
                className={`choice ${
                  correctChoice ? "choice--correct" : ""
                } ${wrongChoice ? "choice--wrong" : ""}`}
                key={choice.id}
                type="button"
                onClick={() => choose(choice.id)}
                disabled={answered}
              >
                <span>{choice.text}</span>
                {correctChoice && <Check size={19} aria-hidden="true" />}
                {wrongChoice && <X size={19} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      {answered && (
        <div
          className={`feedback ${
            isCorrect ? "feedback--correct" : "feedback--gentle"
          }`}
          aria-live="polite"
        >
          <span className="feedback__icon">
            {isCorrect ? <Sparkles size={21} /> : <MessageCircle size={21} />}
          </span>
          <div>
            <strong>{isCorrect ? "Lovely work!" : "Here is the correction:"}</strong>
            <span>{isCorrect ? question.explanation : question.explanation}</span>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={continueOnce}
            disabled={continuing}
          >
            {isLast ? "See result" : "Continue"}
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
