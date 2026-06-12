import { ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { MixedQuestionCard } from "../components/MixedQuestionCard";
import { SessionResults } from "../components/SessionResults";
import {
  createSessionId,
  scoreToStars,
} from "../engine/activityEngine";
import { generateUnitChallenge } from "../engine/challengeEngine";
import { getWorldProgress } from "../engine/game";
import { ModeShell } from "../screens/LearnMode";
import { useGame } from "../state/GameContext";
import { createProgressEventId } from "../state/progressEvents";
import type {
  ActivitySkill,
  Course,
  VocabularyWord,
  World,
} from "../types";
import {
  getQuestionConcepts,
  getNewlyCollectedWords,
  getSessionScore,
} from "./activityHelpers";

type UnitChallengeActivityProps = {
  course: Course;
  world: World;
  previouslyLearnedWords: VocabularyWord[];
  onBack: () => void;
  onComplete: () => void;
};

type SkillResult = {
  correct: number;
  total: number;
};

const skillLabels: Record<ActivitySkill, string> = {
  vocabulary: "Vocabulary",
  listening: "Listening",
  "sentence-building": "Sentence building",
  grammar: "Grammar",
  dialogue: "Dialogue",
  story: "Story comprehension",
};

export function UnitChallengeActivity({
  course,
  world,
  previouslyLearnedWords,
  onBack,
  onComplete,
}: UnitChallengeActivityProps) {
  const { completeActivity, recordActivityAnswer, state } = useGame();
  const [sessionId] = useState(() =>
    createSessionId(world.id, "unit-challenge"),
  );
  const [questions] = useState(() =>
    generateUnitChallenge(
      world,
      previouslyLearnedWords,
      `${world.id}:challenge:${Date.now()}`,
    ),
  );
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [skillResults, setSkillResults] = useState<
    Partial<Record<ActivitySkill, SkillResult>>
  >({});
  const [finished, setFinished] = useState(false);
  const [sessionStartXp] = useState(() => state.xp);
  const [initialCollectedIds] = useState(
    () => new Set(getWorldProgress(state, world.id).collectedWordIds),
  );
  const question = questions[index];
  const currentWordIds = useMemo(
    () => new Set(questions.flatMap((item) => item.sourceWordIds)),
    [questions],
  );
  const currentWords = world.words.filter((word) =>
    currentWordIds.has(word.id),
  );
  const answeredQuestionIds = useRef(new Set<string>());
  const completionStarted = useRef(false);

  const recordResult = (isCorrect: boolean) => {
    if (!question || answeredQuestionIds.current.has(question.id)) return;
    answeredQuestionIds.current.add(question.id);
    recordActivityAnswer({
      kind: "answer",
      id: createProgressEventId(sessionId, "answer", question.id),
      activityType: "unit-challenge",
      concepts: getQuestionConcepts(course.worlds, world, question),
      isCorrect,
    });
    setCorrectCount((current) => current + (isCorrect ? 1 : 0));

    const skill = question.skill ?? "vocabulary";
    setSkillResults((current) => {
      const previous = current[skill] ?? { correct: 0, total: 0 };
      return {
        ...current,
        [skill]: {
          correct: previous.correct + (isCorrect ? 1 : 0),
          total: previous.total + 1,
        },
      };
    });
  };

  const continueSession = () => {
    if (completionStarted.current) return;
    if (index >= questions.length - 1) {
      const score = getSessionScore(correctCount, questions.length);
      completionStarted.current = true;
      completeActivity({
        kind: "activity-completion",
        id: createProgressEventId(
          sessionId,
          "completion",
          "unit-challenge",
        ),
        worldId: world.id,
        activityType: "unit-challenge",
        words: currentWords,
        score,
      });
      setFinished(true);
      return;
    }
    setIndex((current) => current + 1);
  };

  if (!question) {
    return (
      <ModeShell
        world={world}
        title="Unit Challenge"
        subtitle="This unit needs more material"
        onBack={onBack}
        icon={<Trophy size={19} />}
      >
        <section className="activity-empty">
          <h2>No challenge available yet</h2>
          <button className="primary-button" onClick={onBack}>
            Back to activities
          </button>
        </section>
      </ModeShell>
    );
  }

  if (finished) {
    const score = getSessionScore(correctCount, questions.length);
    const rankedSkills = Object.entries(skillResults)
      .map(([skill, result]) => ({
        skill: skill as ActivitySkill,
        percentage: result
          ? Math.round((result.correct / result.total) * 100)
          : 0,
      }))
      .sort((first, second) => second.percentage - first.percentage);
    const strengths = rankedSkills
      .filter((result) => result.percentage >= 70)
      .map((result) => skillLabels[result.skill]);
    const weakAreas = rankedSkills
      .filter((result) => result.percentage < 70)
      .map((result) => skillLabels[result.skill]);

    return (
      <ModeShell
        world={world}
        title="Challenge complete"
        subtitle="A balanced look at your unit skills"
        onBack={onBack}
        icon={<Trophy size={19} />}
      >
        <div className="challenge-results-stack">
          <section className="challenge-analysis">
            <article>
              <span>
                <ShieldCheck size={21} aria-hidden="true" />
              </span>
              <div>
                <small>Strengths</small>
                <strong>
                  {strengths.length > 0
                    ? strengths.join(", ")
                    : "You kept going across every skill"}
                </strong>
              </div>
            </article>
            <article>
              <span>
                <Target size={21} aria-hidden="true" />
              </span>
              <div>
                <small>Good next focus</small>
                <strong>
                  {weakAreas.length > 0
                    ? weakAreas.join(", ")
                    : "Keep the whole unit fresh"}
                </strong>
              </div>
            </article>
          </section>
          <SessionResults
            title={`${score}%`}
            message={`You completed a ${questions.length}-question mixed challenge. Completion never requires a perfect score.`}
            stars={scoreToStars(score)}
            starsLabel="Challenge stars"
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
      title="Unit Challenge"
      subtitle="Vocabulary, listening, grammar, dialogue, and story"
      onBack={onBack}
      icon={<Trophy size={19} />}
      current={index + 1}
      total={questions.length}
    >
      <div className="challenge-banner">
        <Sparkles size={17} aria-hidden="true" />
        <span>Mixed challenge</span>
        <strong>{questions.length} questions maximum</strong>
      </div>
      <MixedQuestionCard
        key={question.id}
        question={question}
        onResult={recordResult}
        onContinue={continueSession}
        isLast={index === questions.length - 1}
      />
    </ModeShell>
  );
}
