import { DialogueActivity } from "../activities/DialogueActivity";
import { ExploreActivity } from "../activities/ExploreActivity";
import { ListeningActivity } from "../activities/ListeningActivity";
import { MatchingActivity } from "../activities/MatchingActivity";
import { SentenceBuilderActivity } from "../activities/SentenceBuilderActivity";
import { StoryShuffleActivity } from "../activities/StoryShuffleActivity";
import { UnitChallengeActivity } from "../activities/UnitChallengeActivity";
import { getCompletedPreviousWords } from "../engine/courseScope";
import { getActivityAvailability } from "../engine/activityAvailability";
import { ModeShell } from "./LearnMode";
import { useGame } from "../state/GameContext";
import type { ActivityType, Course, World } from "../types";

type ActivityScreenProps = {
  course: Course;
  world: World;
  activityType: ActivityType;
  onBack: () => void;
  onComplete: () => void;
};

export function ActivityScreen({
  course,
  world,
  activityType,
  onBack,
  onComplete,
}: ActivityScreenProps) {
  const { state } = useGame();
  const previouslyLearnedWords = getCompletedPreviousWords(
    world,
    course.worlds,
    state,
  );
  const availability = getActivityAvailability(world, activityType);

  if (!availability.available) {
    return (
      <ModeShell
        world={world}
        title="Activity unavailable"
        subtitle="This unit needs more structured learning material"
        onBack={onBack}
        icon={<Sparkles size={19} />}
      >
        <section className="activity-empty">
          <h2>Not ready for this unit</h2>
          <p>{availability.reason}</p>
          <button className="primary-button" type="button" onClick={onBack}>
            Back to activities
          </button>
        </section>
      </ModeShell>
    );
  }

  switch (activityType) {
    case "explore":
      return (
        <ExploreActivity
          world={world}
          onBack={onBack}
          onComplete={onComplete}
        />
      );
    case "matching":
      return (
        <MatchingActivity
          world={world}
          onBack={onBack}
          onComplete={onComplete}
        />
      );
    case "listening":
      return (
        <ListeningActivity
          world={world}
          onBack={onBack}
          onComplete={onComplete}
        />
      );
    case "sentence-builder":
      return (
        <SentenceBuilderActivity
          world={world}
          onBack={onBack}
          onComplete={onComplete}
        />
      );
    case "dialogue":
      return (
        <DialogueActivity
          world={world}
          previouslyLearnedWords={previouslyLearnedWords}
          onBack={onBack}
          onComplete={onComplete}
        />
      );
    case "story-shuffle":
      return (
        <StoryShuffleActivity
          world={world}
          previouslyLearnedWords={previouslyLearnedWords}
          onBack={onBack}
          onComplete={onComplete}
        />
      );
    case "unit-challenge":
      return (
        <UnitChallengeActivity
          course={course}
          world={world}
          previouslyLearnedWords={previouslyLearnedWords}
          onBack={onBack}
          onComplete={onComplete}
        />
      );
    default:
      return null;
  }
}
import { Sparkles } from "lucide-react";
