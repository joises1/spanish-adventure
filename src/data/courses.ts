import type { Course, CourseId } from "../types";
import { beginnerWorlds } from "./beginnerWorlds";
import { worlds as intermediateWorlds } from "./worlds";

export const courses: Course[] = [
  {
    id: "a1-a2",
    level: "A1–A2",
    name: "Beginner",
    shortName: "A1–A2 Beginner",
    description:
      "Build a friendly foundation with greetings, food, family, everyday verbs, and easy travel.",
    icon: "🌱",
    color: "#8dcc87",
    accent: "#377449",
    worlds: beginnerWorlds,
  },
  {
    id: "b1",
    level: "B1",
    name: "Intermediate",
    shortName: "B1 Intermediate",
    description:
      "Explore the complete vocabulary adventure with all current thematic worlds and richer expressions.",
    icon: "🧭",
    color: "#9a7bd0",
    accent: "#55407d",
    worlds: intermediateWorlds,
  },
];

export const getCourse = (courseId: CourseId) =>
  courses.find((course) => course.id === courseId) ?? courses[1];
