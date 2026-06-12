import { useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { getCourse } from "./data/courses";
import { CourseLandingScreen } from "./screens/CourseLandingScreen";
import { FlashcardMode } from "./screens/FlashcardMode";
import { LearnMode } from "./screens/LearnMode";
import { MapScreen } from "./screens/MapScreen";
import { QuizMode } from "./screens/QuizMode";
import { WhatYouLearnedScreen } from "./screens/WhatYouLearnedScreen";
import { WorldScreen } from "./screens/WorldScreen";
import { useCourse } from "./state/CourseContext";
import type { CourseId, Mode, World } from "./types";

type Screen =
  | { name: "course" }
  | { name: "map" }
  | { name: "learned" }
  | { name: "world"; world: World }
  | { name: "mode"; world: World; mode: Mode };

function App() {
  const { selectedCourseId, selectCourse } = useCourse();
  const [screen, setScreen] = useState<Screen>({ name: "course" });
  const course = getCourse(selectedCourseId ?? "b1");

  const openWorld = (world: World) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setScreen({ name: "world", world });
  };

  const openMode = (world: World, mode: Mode) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setScreen({ name: "mode", world, mode });
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
          onSwitchCourse={() => setScreen({ name: "course" })}
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

      {screen.name === "world" && (
        <WorldScreen
          world={screen.world}
          onBack={showMap}
          onOpenMode={(mode) => openMode(screen.world, mode)}
        />
      )}

      {screen.name === "mode" && screen.mode === "learn" && (
        <LearnMode
          world={screen.world}
          onBack={() => setScreen({ name: "world", world: screen.world })}
          onComplete={showMap}
        />
      )}

      {screen.name === "mode" && screen.mode === "flashcards" && (
        <FlashcardMode
          world={screen.world}
          onBack={() => setScreen({ name: "world", world: screen.world })}
          onComplete={showMap}
        />
      )}

      {screen.name === "mode" && screen.mode === "quiz" && (
        <QuizMode
          world={screen.world}
          onBack={() => setScreen({ name: "world", world: screen.world })}
          onComplete={showMap}
        />
      )}

      {screen.name === "mode" && screen.mode === "review" && (
        <QuizMode
          world={screen.world}
          onBack={() => setScreen({ name: "world", world: screen.world })}
          onComplete={showMap}
          review
        />
      )}
    </div>
  );
}

export default App;
