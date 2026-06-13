import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { courses } from "../data/courses";
import {
  canResumeSession,
  getSessionStorageKey,
  parseSessionSnapshot,
  type SafeSessionSnapshot,
} from "../engine/sessionRecovery";
import type { CourseId } from "../types";
import type { ActivityType, World } from "../types";
import { createSessionId } from "../engine/activityEngine";
import { useCourse } from "./CourseContext";
import { browserStorage } from "./storage";

type SessionContextValue = {
  activeSession: SafeSessionSnapshot | null;
  getSession: (courseId: CourseId) => SafeSessionSnapshot | null;
  saveSession: (snapshot: SafeSessionSnapshot) => void;
  clearSession: (courseId: CourseId) => void;
  resumeSession: SafeSessionSnapshot | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const loadSession = (courseId: CourseId) => {
  const result = browserStorage.read(getSessionStorageKey(courseId));
  return result.ok ? parseSessionSnapshot(result.value, courses) : null;
};

export function SessionProvider({ children }: PropsWithChildren) {
  const { selectedCourseId } = useCourse();
  const [sessions, setSessions] = useState<
    Record<CourseId, SafeSessionSnapshot | null>
  >(() => ({
    "a1-a2": loadSession("a1-a2"),
    b1: loadSession("b1"),
  }));

  const saveSession = useCallback((snapshot: SafeSessionSnapshot) => {
    setSessions((current) => ({
      ...current,
      [snapshot.courseId]: snapshot,
    }));
    browserStorage.write(
      getSessionStorageKey(snapshot.courseId),
      JSON.stringify(snapshot),
    );
  }, []);

  const clearSession = useCallback((courseId: CourseId) => {
    setSessions((current) => ({ ...current, [courseId]: null }));
    browserStorage.remove(getSessionStorageKey(courseId));
  }, []);

  const getSession = useCallback(
    (courseId: CourseId) => sessions[courseId],
    [sessions],
  );
  const activeSession = selectedCourseId
    ? sessions[selectedCourseId]
    : null;
  const resumeSession = canResumeSession(activeSession)
    ? activeSession
    : null;

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!canResumeSession(activeSession)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [activeSession]);

  const value = useMemo(
    () => ({
      activeSession,
      getSession,
      saveSession,
      clearSession,
      resumeSession,
    }),
    [
      activeSession,
      clearSession,
      getSession,
      resumeSession,
      saveSession,
    ],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSessions = () => {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSessions must be used inside SessionProvider");
  return value;
};

type RecoverableSessionOptions = {
  courseId: CourseId;
  activityType: ActivityType;
  world?: World;
};

type SessionCheckpoint = {
  index: number;
  total: number;
  correctCount?: number;
  answeredCount?: number;
  meaningful?: boolean;
  status?: SafeSessionSnapshot["status"];
  payload?: Record<string, unknown>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useRecoverableSession = ({
  courseId,
  activityType,
  world,
}: RecoverableSessionOptions) => {
  const { getSession, saveSession, clearSession } = useSessions();
  const [identity] = useState(() => {
    const saved = getSession(courseId);
    const matches =
      saved?.activityType === activityType &&
      saved.worldId === world?.id &&
      saved.unit === world?.unit;
    const restored = matches ? saved : null;
    const startedAt = restored?.startedAt ?? new Date().toISOString();
    return {
      restored,
      sessionId:
        restored?.sessionId ??
        createSessionId(world?.id ?? courseId, activityType),
      seed:
        restored?.seed ??
        `${courseId}:${world?.id ?? "review"}:${activityType}:${startedAt}`,
      startedAt,
    };
  });

  const checkpoint = useCallback(
    ({
      index,
      total,
      correctCount = 0,
      answeredCount = 0,
      meaningful = true,
      status = "active",
      payload = {},
    }: SessionCheckpoint) => {
      const now = new Date().toISOString();
      saveSession({
        version: 1,
        courseId,
        worldId: world?.id,
        unit: world?.unit,
        activityType,
        sessionId: identity.sessionId,
        seed: identity.seed,
        status,
        meaningful,
        index,
        total,
        correctCount,
        answeredCount,
        startedAt: identity.startedAt,
        updatedAt: now,
        payload,
      });
    },
    [
      activityType,
      courseId,
      identity.seed,
      identity.sessionId,
      identity.startedAt,
      saveSession,
      world?.id,
      world?.unit,
    ],
  );

  return {
    ...identity,
    checkpoint,
    clear: () => clearSession(courseId),
  };
};
