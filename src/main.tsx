import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CourseProvider } from "./state/CourseContext";
import { GameProvider } from "./state/GameContext";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CourseProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </CourseProvider>
  </StrictMode>,
);
