import { useCallback, useEffect, useRef, useState } from "react";
import { AdaptiveReviewActivity } from "./activities/AdaptiveReviewActivity";
import { AppHeader } from "./components/AppHeader";
import { courses, getCourse } from "./data/courses";
import {
  createHistoryState,
  getResumeRoute,
  isSessionRoute,
  parseRouteHash,
  readHistoryState,
  resolveInitialRoute,
  routeCourseId,
  routeToHash,
  type AppRoute,
} from "./engine/navigation";
import { shouldWarnBeforeAbandon } from "./engine/sessionRecovery";
import { ActivityScreen } from "./screens/ActivityScreen";
import { CourseLandingScreen } from "./screens/CourseLandingScreen";
import { MapScreen } from "./screens/MapScreen";
import { MistakeNotebookScreen } from "./screens/MistakeNotebookScreen";
import { WhatYouLearnedScreen } from "./screens/WhatYouLearnedScreen";
import { WorldScreen } from "./screens/WorldScreen";
import { useCourse } from "./state/CourseContext";
import { useSessions } from "./state/SessionContext";
import { browserStorage } from "./state/storage";
import type { ActivityType, CourseId, World } from "./types";

const LAST_ROUTE_KEY = "spanish-adventure-last-route-v1";

const loadSavedRoute = () => {
  const result = browserStorage.read(LAST_ROUTE_KEY);
  if (!result.ok || !result.value) return null;
  try {
    return JSON.parse(result.value) as unknown;
  } catch {
    return null;
  }
};

function App() {
  const { selectedCourseId, selectCourse } = useCourse();
  const {
    activeSession,
    clearSession,
    resumeSession,
  } = useSessions();
  const initialHistory = readHistoryState(window.history.state, courses);
  const [route, setRoute] = useState<AppRoute>(() =>
    resolveInitialRoute(
      window.location.hash,
      initialHistory?.route ?? loadSavedRoute(),
      selectedCourseId,
      courses,
    ),
  );
  const routeRef = useRef(route);
  const historyIndexRef = useRef(initialHistory?.index ?? 0);
  const suppressPopRef = useRef(false);
  const courseId = routeCourseId(route) ?? selectedCourseId ?? "b1";
  const course = getCourse(courseId);
  const world =
    "worldId" in route
      ? course.worlds.find((candidate) => candidate.id === route.worldId)
      : undefined;

  useEffect(() => {
    routeRef.current = route;
    const routeCourse = routeCourseId(route);
    if (routeCourse && routeCourse !== selectedCourseId) {
      selectCourse(routeCourse);
    }
    browserStorage.write(LAST_ROUTE_KEY, JSON.stringify(route));
  }, [route, selectCourse, selectedCourseId]);

  useEffect(() => {
    const currentHistory = readHistoryState(window.history.state, courses);
    if (!currentHistory) {
      window.history.replaceState(
        createHistoryState(route, historyIndexRef.current),
        "",
        routeToHash(route),
      );
    } else if (window.location.hash !== routeToHash(route)) {
      window.history.replaceState(
        createHistoryState(route, currentHistory.index),
        "",
        routeToHash(route),
      );
    }
  }, [route]);

  const confirmLeave = useCallback(
    (target: AppRoute) => {
      if (
        !isSessionRoute(routeRef.current) ||
        routeToHash(routeRef.current) === routeToHash(target) ||
        !shouldWarnBeforeAbandon(activeSession)
      ) {
        return true;
      }
      return window.confirm(
        "Leave this unfinished activity? Your last safe checkpoint will remain available from the map.",
      );
    },
    [activeSession],
  );

  const acceptRoute = useCallback(
    (target: AppRoute, index: number) => {
      const current = routeRef.current;
      if (
        isSessionRoute(current) &&
        activeSession?.status === "completed"
      ) {
        clearSession(activeSession.courseId);
      }
      historyIndexRef.current = index;
      routeRef.current = target;
      setRoute(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [activeSession, clearSession],
  );

  const navigate = useCallback(
    (target: AppRoute, replace = false) => {
      if (!confirmLeave(target)) return false;
      const nextIndex = replace
        ? historyIndexRef.current
        : historyIndexRef.current + 1;
      const method = replace ? "replaceState" : "pushState";
      window.history[method](
        createHistoryState(target, nextIndex),
        "",
        routeToHash(target),
      );
      acceptRoute(target, nextIndex);
      return true;
    },
    [acceptRoute, confirmLeave],
  );

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const targetHistory =
        readHistoryState(event.state, courses) ??
        (() => {
          const parsed = parseRouteHash(window.location.hash, courses);
          return parsed
            ? createHistoryState(parsed, historyIndexRef.current - 1)
            : null;
        })();
      if (!targetHistory) {
        const fallback: AppRoute = selectedCourseId
          ? { name: "map", courseId: selectedCourseId }
          : { name: "course" };
        if (!confirmLeave(fallback)) {
          window.history.replaceState(
            createHistoryState(
              routeRef.current,
              historyIndexRef.current,
            ),
            "",
            routeToHash(routeRef.current),
          );
          return;
        }
        window.history.replaceState(
          createHistoryState(fallback, historyIndexRef.current),
          "",
          routeToHash(fallback),
        );
        acceptRoute(fallback, historyIndexRef.current);
        return;
      }
      if (suppressPopRef.current) {
        suppressPopRef.current = false;
        return;
      }
      if (!confirmLeave(targetHistory.route)) {
        const delta = historyIndexRef.current - targetHistory.index;
        suppressPopRef.current = true;
        window.history.go(delta);
        return;
      }
      acceptRoute(targetHistory.route, targetHistory.index);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [acceptRoute, confirmLeave, selectedCourseId]);

  const chooseCourse = (nextCourseId: CourseId) => {
    selectCourse(nextCourseId);
    navigate({ name: "map", courseId: nextCourseId });
  };

  const openWorld = (selectedWorld: World) =>
    navigate({
      name: "world",
      courseId: course.id,
      worldId: selectedWorld.id,
    });

  const openActivity = (
    selectedWorld: World,
    activityType: ActivityType,
  ) => {
    const existing = activeSession;
    if (
      existing?.status === "active" &&
      existing.meaningful &&
      (existing.worldId !== selectedWorld.id ||
        existing.activityType !== activityType)
    ) {
      const replace = window.confirm(
        "Start this activity and replace your saved unfinished checkpoint?",
      );
      if (!replace) return;
      clearSession(course.id);
    } else if (existing?.status === "completed") {
      clearSession(course.id);
    }
    navigate({
      name: "activity",
      courseId: course.id,
      worldId: selectedWorld.id,
      activityType,
    });
  };

  const completeSessionToMap = () => {
    clearSession(course.id);
    navigate({ name: "map", courseId: course.id });
  };

  const resumeLastActivity = () => {
    const resumeRoute = getResumeRoute(resumeSession, courses);
    if (resumeRoute) navigate(resumeRoute);
  };

  return (
    <div className="app">
      {route.name !== "course" && (
        <AppHeader
          course={course}
          worlds={course.worlds}
          onMap={() => navigate({ name: "map", courseId: course.id })}
          onOpenLearned={() =>
            navigate({ name: "learned", courseId: course.id })
          }
          onOpenMistakes={() =>
            navigate({ name: "mistakes", courseId: course.id })
          }
          onOpenDailyReview={() =>
            navigate({
              name: "review",
              courseId: course.id,
              mode: "daily",
            })
          }
          onSwitchCourse={() => navigate({ name: "course" })}
          onReturnToCourseSelection={() => navigate({ name: "course" })}
          compact={route.name !== "map"}
        />
      )}

      {route.name === "course" && (
        <CourseLandingScreen
          selectedCourseId={selectedCourseId}
          onSelectCourse={chooseCourse}
        />
      )}

      {route.name === "map" && (
        <MapScreen
          course={course}
          worlds={course.worlds}
          onOpenWorld={openWorld}
          resumeSession={resumeSession}
          onResumeSession={resumeLastActivity}
        />
      )}

      {route.name === "learned" && (
        <WhatYouLearnedScreen
          course={course}
          worlds={course.worlds}
          onBack={() => navigate({ name: "map", courseId: course.id })}
        />
      )}

      {route.name === "mistakes" && (
        <MistakeNotebookScreen
          course={course}
          onBack={() => navigate({ name: "map", courseId: course.id })}
          onReplay={(selectedConceptIds) =>
            navigate({
              name: "review",
              courseId: course.id,
              mode: "mistakes",
              selectedConceptIds,
            })
          }
        />
      )}

      {route.name === "world" && world && (
        <WorldScreen
          world={world}
          onBack={() => navigate({ name: "map", courseId: course.id })}
          onOpenActivity={(activityType) =>
            openActivity(world, activityType)
          }
        />
      )}

      {route.name === "activity" && world && (
        <ActivityScreen
          course={course}
          world={world}
          activityType={route.activityType}
          onBack={() =>
            navigate({
              name: "world",
              courseId: course.id,
              worldId: world.id,
            })
          }
          onBackToMap={() =>
            navigate({ name: "map", courseId: course.id })
          }
          onComplete={completeSessionToMap}
        />
      )}

      {route.name === "review" && (
        <AdaptiveReviewActivity
          course={course}
          mode={route.mode}
          selectedConceptIds={route.selectedConceptIds}
          onBack={() =>
            navigate(
              route.mode === "mistakes"
                ? { name: "mistakes", courseId: course.id }
                : { name: "map", courseId: course.id },
            )
          }
          onBackToMap={() =>
            navigate({ name: "map", courseId: course.id })
          }
          onComplete={completeSessionToMap}
        />
      )}
    </div>
  );
}

export default App;
