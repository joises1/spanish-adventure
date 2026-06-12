import { useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { FlashcardMode } from "./screens/FlashcardMode";
import { DictionaryScreen } from "./screens/DictionaryScreen";
import { LearnMode } from "./screens/LearnMode";
import { MapScreen } from "./screens/MapScreen";
import { QuizMode } from "./screens/QuizMode";
import { WorldScreen } from "./screens/WorldScreen";
import type { Mode, World } from "./types";

type Screen =
  | { name: "map" }
  | { name: "dictionary" }
  | { name: "world"; world: World }
  | { name: "mode"; world: World; mode: Mode };

function App() {
  const [screen, setScreen] = useState<Screen>({ name: "map" });

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

  return (
    <div className="app">
      <AppHeader onMap={showMap} compact={screen.name !== "map"} />

      {screen.name === "map" && (
        <MapScreen
          onOpenWorld={openWorld}
          onOpenDictionary={() => setScreen({ name: "dictionary" })}
        />
      )}

      {screen.name === "dictionary" && <DictionaryScreen onBack={showMap} />}

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
