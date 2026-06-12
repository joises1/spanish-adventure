import { DialogueActivity } from "../activities/DialogueActivity";
import { ExploreActivity } from "../activities/ExploreActivity";
import { ListeningActivity } from "../activities/ListeningActivity";
import { MatchingActivity } from "../activities/MatchingActivity";
import { SentenceBuilderActivity } from "../activities/SentenceBuilderActivity";
import { StoryShuffleActivity } from "../activities/StoryShuffleActivity";
import { UnitChallengeActivity } from "../activities/UnitChallengeActivity";
import { getCompletedPreviousWords } from "../engine/courseScope";
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
