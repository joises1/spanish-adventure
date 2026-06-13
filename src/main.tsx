import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CourseProvider } from "./state/CourseContext";
import { GameProvider } from "./state/GameContext";
import { SessionProvider } from "./state/SessionContext";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CourseProvider>
      <GameProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </GameProvider>
    </CourseProvider>
  </StrictMode>,
);
