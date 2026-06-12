import type { ActivityType, World } from "../types";
import { ExploreActivity } from "../activities/ExploreActivity";
import { ListeningActivity } from "../activities/ListeningActivity";
import { MatchingActivity } from "../activities/MatchingActivity";
import { SentenceBuilderActivity } from "../activities/SentenceBuilderActivity";

type ActivityScreenProps = {
  world: World;
  activityType: ActivityType;
  onBack: () => void;
  onComplete: () => void;
};

export function ActivityScreen({
  world,
  activityType,
  onBack,
  onComplete,
}: ActivityScreenProps) {
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
    default:
      return null;
  }
}
