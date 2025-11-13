import type { LessonEquipment } from "./types";

export interface LectureTemplate {
  subjectCode: string;
  lectureType: string;
  equipment: LessonEquipment;
}

const TEMPLATE_STORAGE_KEY = "lecture_template";

/**
 * Save lecture template to localStorage
 */
export function saveLectureTemplate(template: LectureTemplate): void {
  try {
    const json = JSON.stringify(template);
    localStorage.setItem(TEMPLATE_STORAGE_KEY, json);
  } catch (error) {
    console.error("Failed to save lecture template:", error);
  }
}

/**
 * Load lecture template from localStorage
 */
export function loadLectureTemplate(): LectureTemplate | null {
  try {
    const json = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!json) {
      return null;
    }
    return JSON.parse(json) as LectureTemplate;
  } catch (error) {
    console.error("Failed to load lecture template:", error);
    return null;
  }
}

/**
 * Check if a template exists in localStorage
 */
export function hasLectureTemplate(): boolean {
  return localStorage.getItem(TEMPLATE_STORAGE_KEY) !== null;
}

/**
 * Clear the saved template from localStorage
 */
export function clearLectureTemplate(): void {
  try {
    localStorage.removeItem(TEMPLATE_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear lecture template:", error);
  }
}

