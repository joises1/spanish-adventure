import { ArrowRight, Check, Sparkles } from "lucide-react";
import { courses } from "../data/courses";
import type { CourseId } from "../types";

type CourseLandingScreenProps = {
  selectedCourseId: CourseId | null;
  onSelectCourse: (courseId: CourseId) => void;
};

export function CourseLandingScreen({
  selectedCourseId,
  onSelectCourse,
}: CourseLandingScreenProps) {
  return (
    <main className="course-landing">
      <section className="course-landing__intro">
        <span className="course-landing__mark" aria-hidden="true">
          <Sparkles size={28} />
        </span>
        <span className="eyebrow">Choose your Spanish adventure</span>
        <h1>Where would you like to begin?</h1>
        <p>
          Pick a course for today. Each one keeps its own map progress,
          completed sessions, stars, and learning collection.
        </p>
      </section>

      <section className="course-bubbles" aria-label="Spanish courses">
        {courses.map((course) => {
          const isSelected = course.id === selectedCourseId;
          return (
            <button
              className={`course-bubble course-bubble--${course.id} ${
                isSelected ? "course-bubble--selected" : ""
              }`}
              type="button"
              key={course.id}
              onClick={() => onSelectCourse(course.id)}
              style={
                {
                  "--course-color": course.color,
                  "--course-accent": course.accent,
                } as React.CSSProperties
              }
            >
              {isSelected && (
                <span className="course-bubble__saved">
                  <Check size={13} aria-hidden="true" />
                  Last played
                </span>
              )}
              <span className="course-bubble__icon" aria-hidden="true">
                {course.icon}
              </span>
              <span className="course-bubble__level">{course.level}</span>
              <strong>{course.name}</strong>
              <p>{course.description}</p>
              <span className="course-bubble__meta">
                {course.worlds.length} worlds · 10-item sessions
              </span>
              <span className="course-bubble__action">
                Enter course
                <ArrowRight size={18} aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </section>
    </main>
  );
}
