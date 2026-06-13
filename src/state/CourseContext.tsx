import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { CourseId } from "../types";
import { browserStorage } from "./storage";

const SELECTED_COURSE_KEY = "spanish-adventure-selected-course-v1";

const loadSelectedCourse = (): CourseId | null => {
  const result = browserStorage.read(SELECTED_COURSE_KEY);
  if (!result.ok) return null;
  return result.value === "a1-a2" || result.value === "b1"
    ? result.value
    : null;
};

type CourseContextValue = {
  selectedCourseId: CourseId | null;
  selectCourse: (courseId: CourseId) => void;
};

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({ children }: PropsWithChildren) {
  const [selectedCourseId, setSelectedCourseId] =
    useState<CourseId | null>(loadSelectedCourse);

  const selectCourse = useCallback((courseId: CourseId) => {
    browserStorage.write(SELECTED_COURSE_KEY, courseId);
    setSelectedCourseId(courseId);
  }, []);

  const value = useMemo(
    () => ({ selectedCourseId, selectCourse }),
    [selectCourse, selectedCourseId],
  );

  return (
    <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
  );
}

// The hook intentionally shares this module with its provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useCourse = () => {
  const value = useContext(CourseContext);
  if (!value) {
    throw new Error("useCourse must be used inside CourseProvider");
  }
  return value;
};
