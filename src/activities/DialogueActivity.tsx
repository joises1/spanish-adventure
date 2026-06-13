import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { SessionResults } from "../components/SessionResults";
import { SpeakerButton } from "../components/SpeakerButton";
import {
  createSessionId,
  scoreToStars,
} from "../engine/activityEngine";
import { generateDialogueQuestions } from "../engine/narrativeEngine";
import { getWorldProgress } from "../engine/game";
import { ModeShell } from "../screens/LearnMode";
import { useGame } from "../state/GameContext";
import {
  createProgressEventId,
} from "../state/progressEvents";
import type { DialogueTurn, VocabularyWord, World } from "../types";
import {
  getAnswerEvidence,
  getNewlyCollectedWords,
  getQuestionConcepts,
  getSessionScore,
  getSessionWords,
} from "./activityHelpers";

type DialogueActivityProps = {
  world: World;
  previouslyLearnedWords: VocabularyWord[];
  onBack: () => void;
  onComplete: () => void;
};

export function DialogueActivity({
  world,
  previouslyLearnedWords,
  onBack,
  onComplete,
}: DialogueActivityProps) {
  const { completeActivity, recordActivityAnswer, state } = useGame();
  const [sessionId] = useState(() =>
    createSessionId(world.id, "dialogue"),
  );
  const [questions] = useState(() =>
    generateDialogueQuestions(
      world,
      previouslyLearnedWords,
      `${world.id}:dialogue:${Date.now()}`,
    ),
  );
  const [index, setIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>();
  const [orderedTurns, setOrderedTurns] = useState<DialogueTurn[]>(
    () => questions[0]?.dialogueTurns ?? [],
  );
  const [answered, setAnswered] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [sessionStartXp] = useState(() => state.xp);
  const [initialCollectedIds] = useState(
    () => new Set(getWorldProgress(state, world.id).collectedWordIds),
  );
  const question = questions[index];
  const sessionWords = getSessionWords(world, questions);
  const answeredQuestionIds = useRef(new Set<string>());
  const completionStarted = useRef(false);

  const submitResult = (isCorrect: boolean, userAnswer: string) => {
    if (
      !question ||
      answered ||
      answeredQuestionIds.current.has(question.id)
    ) {
      return;
    }
    answeredQuestionIds.current.add(question.id);
    setAnswered(true);
    setIsCurrentCorrect(isCorrect);
    setCorrectCount((current) => current + (isCorrect ? 1 : 0));
    recordActivityAnswer({
      kind: "answer",
      id: createProgressEventId(sessionId, "answer", question.id),
      activityType: "dialogue",
      concepts: getQuestionConcepts([world], world, question),
      isCorrect,
      ...getAnswerEvidence(question, userAnswer),
    });
  };

  const choose = (choiceId: string) => {
    if (answered || !question) return;
    setSelectedChoiceId(choiceId);
    submitResult(
      choiceId === question.correctChoiceId,
      question.choices?.find((choice) => choice.id === choiceId)?.text ?? "",
    );
  };

  const moveTurn = (turnIndex: number, direction: -1 | 1) => {
    if (answered) return;
    const target = turnIndex + direction;
    if (target < 0 || target >= orderedTurns.length) return;
    setOrderedTurns((current) => {
      const next = [...current];
      [next[turnIndex], next[target]] = [next[target], next[turnIndex]];
      return next;
    });
  };

  const checkOrder = () => {
    if (!question?.orderedItemIds || answered) return;
    submitResult(
      orderedTurns.every(
        (turn, turnIndex) => turn.id === question.orderedItemIds?.[turnIndex],
      ),
      orderedTurns.map((turn) => `${turn.speaker}: ${turn.text}`).join(" | "),
    );
  };

  const next = () => {
    if (completionStarted.current) return;
    if (index >= questions.length - 1) {
      const score = getSessionScore(correctCount, questions.length);
      completionStarted.current = true;
      completeActivity({
        kind: "activity-completion",
        id: createProgressEventId(sessionId, "completion", "dialogue"),
        worldId: world.id,
        activityType: "dialogue",
        words: sessionWords,
        score,
      });
      setFinished(true);
      return;
    }
    const nextQuestion = questions[index + 1];
    setIndex((current) => current + 1);
    setSelectedChoiceId(undefined);
    setOrderedTurns(nextQuestion.dialogueTurns ?? []);
    setAnswered(false);
    setIsCurrentCorrect(false);
  };

  if (!question) {
    return (
      <ModeShell
        world={world}
        title="Dialogue"
        subtitle="This unit needs vocabulary for a conversation"
        onBack={onBack}
        icon={<MessageCircle size={19} />}
      >
        <section className="activity-empty">
          <h2>No dialogue available yet</h2>
          <button className="primary-button" onClick={onBack}>
            Back to activities
          </button>
        </section>
      </ModeShell>
    );
  }

  if (finished) {
    const score = getSessionScore(correctCount, questions.length);
    return (
      <ModeShell
        world={world}
        title="Dialogue complete"
        subtitle="A full conversation practiced"
        onBack={onBack}
        icon={<MessageCircle size={19} />}
      >
        <SessionResults
          title={`${score}%`}
          message={`You completed ${questions.length} conversation interactions using this unit's Spanish.`}
          stars={scoreToStars(score)}
          starsLabel="Dialogue stars"
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

  const isOrderQuestion = question.kind === "dialogue-order";

  return (
    <ModeShell
      world={world}
      title="Dialogue"
      subtitle="Practice a natural unit conversation"
      onBack={onBack}
      icon={<MessageCircle size={19} />}
      current={index + 1}
      total={questions.length}
    >
      <section className="dialogue-card">
        <div className="dialogue-card__heading">
          <span className="card-label">
            {question.kind.replace("dialogue-", "").replace("-", " ")}
          </span>
          {question.audioText && (
            <SpeakerButton
              text={question.audioText}
              label="Play the listening line"
            />
          )}
        </div>
        <h2>{question.prompt}</h2>

        {isOrderQuestion ? (
          <div className="dialogue-order-list">
            {orderedTurns.map((turn, turnIndex) => (
              <article key={turn.id}>
                <div>
                  <small>{turn.speaker}</small>
                  <span>{turn.text}</span>
                </div>
                <SpeakerButton
                  text={turn.text}
                  label={`Hear ${turn.speaker}'s line`}
                />
                <span className="dialogue-order-list__controls">
                  <button
                    type="button"
                    onClick={() => moveTurn(turnIndex, -1)}
                    disabled={answered || turnIndex === 0}
                    aria-label="Move line up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTurn(turnIndex, 1)}
                    disabled={
                      answered || turnIndex === orderedTurns.length - 1
                    }
                    aria-label="Move line down"
                  >
                    <ArrowDown size={16} />
                  </button>
                </span>
              </article>
            ))}
          </div>
        ) : (
          <>
            <div className="dialogue-transcript">
              {question.dialogueTurns?.map((turn) => (
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
            <div className="choice-grid dialogue-choice-grid">
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
          </>
        )}

        {isOrderQuestion && !answered && (
          <button
            className="primary-button dialogue-check-button"
            type="button"
            onClick={checkOrder}
          >
            Check conversation
            <Check size={18} />
          </button>
        )}

        {answered && (
          <div
            className={`feedback ${
              isCurrentCorrect ? "feedback--correct" : "feedback--gentle"
            }`}
            aria-live="polite"
          >
            <span className="feedback__icon">
              {isCurrentCorrect ? <Sparkles size={21} /> : <MessageCircle size={21} />}
            </span>
            <div>
              <strong>
                {isCurrentCorrect ? "Natural and correct!" : "A useful correction:"}
              </strong>
              <span>{question.explanation}</span>
            </div>
            <button className="primary-button" onClick={next}>
              {index === questions.length - 1 ? "See result" : "Continue"}
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </section>
    </ModeShell>
  );
}
