import { useState } from "react";
import { AdaptiveReviewActivity } from "./activities/AdaptiveReviewActivity";
import { AppHeader } from "./components/AppHeader";
import { getCourse } from "./data/courses";
import { ActivityScreen } from "./screens/ActivityScreen";
import { CourseLandingScreen } from "./screens/CourseLandingScreen";
import { MapScreen } from "./screens/MapScreen";
import { MistakeNotebookScreen } from "./screens/MistakeNotebookScreen";
import { WhatYouLearnedScreen } from "./screens/WhatYouLearnedScreen";
import { WorldScreen } from "./screens/WorldScreen";
import { useCourse } from "./state/CourseContext";
import type { ActivityType, CourseId, World } from "./types";

type Screen =
  | { name: "course" }
  | { name: "map" }
  | { name: "learned" }
  | { name: "mistakes" }
  | {
      name: "review";
      mode: "daily" | "mistakes";
      selectedConceptIds?: string[];
    }
  | { name: "world"; world: World }
  | { name: "activity"; world: World; activityType: ActivityType };

function App() {
  const { selectedCourseId, selectCourse } = useCourse();
  const [screen, setScreen] = useState<Screen>({ name: "course" });
  const course = getCourse(selectedCourseId ?? "b1");

  const openWorld = (world: World) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setScreen({ name: "world", world });
  };

  const openActivity = (world: World, activityType: ActivityType) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setScreen({ name: "activity", world, activityType });
  };

  const showMap = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setScreen({ name: "map" });
  };

  const chooseCourse = (courseId: CourseId) => {
    selectCourse(courseId);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setScreen({ name: "map" });
  };

  return (
    <div className="app">
      {screen.name !== "course" && (
        <AppHeader
          course={course}
          worlds={course.worlds}
          onMap={showMap}
          onOpenLearned={() => setScreen({ name: "learned" })}
          onOpenMistakes={() => setScreen({ name: "mistakes" })}
          onOpenDailyReview={() => setScreen({ name: "review", mode: "daily" })}
          onSwitchCourse={() => setScreen({ name: "course" })}
          onReturnToCourseSelection={() => setScreen({ name: "course" })}
          compact={screen.name !== "map"}
        />
      )}

      {screen.name === "course" && (
        <CourseLandingScreen
          selectedCourseId={selectedCourseId}
          onSelectCourse={chooseCourse}
        />
      )}

      {screen.name === "map" && (
        <MapScreen
          course={course}
          worlds={course.worlds}
          onOpenWorld={openWorld}
        />
      )}

      {screen.name === "learned" && (
        <WhatYouLearnedScreen
          course={course}
          worlds={course.worlds}
          onBack={showMap}
        />
      )}

      {screen.name === "mistakes" && (
        <MistakeNotebookScreen
          course={course}
          onBack={showMap}
          onReplay={(selectedConceptIds) =>
            setScreen({
              name: "review",
              mode: "mistakes",
              selectedConceptIds,
            })
          }
        />
      )}

      {screen.name === "world" && (
        <WorldScreen
          world={screen.world}
          onBack={showMap}
          onOpenActivity={(activityType) =>
            openActivity(screen.world, activityType)
          }
        />
      )}

      {screen.name === "activity" && (
        <ActivityScreen
          course={course}
          world={screen.world}
          activityType={screen.activityType}
          onBack={() => setScreen({ name: "world", world: screen.world })}
          onComplete={showMap}
        />
      )}

      {screen.name === "review" && (
        <AdaptiveReviewActivity
          course={course}
          mode={screen.mode}
          selectedConceptIds={screen.selectedConceptIds}
          onBack={() =>
            setScreen(
              screen.mode === "mistakes"
                ? { name: "mistakes" }
                : { name: "map" },
            )
          }
          onComplete={showMap}
        />
      )}
    </div>
  );
}

export default App;
