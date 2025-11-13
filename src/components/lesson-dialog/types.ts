export interface LessonEquipment {
  name?: string;
  quantity?: string;
  type?: string;
}

export interface LessonInfo {
  lesson?: string;
  lessonId?: string;
  class?: string;
  classId?: string;
  description?: string;
  subject?: string;
  subjectCode?: string;
  lessonPeriod?: number;
  gradeCode?: string;
  gradeName?: string;
  lectureType?: string;
  equipment?: LessonEquipment;
  scheduleDetailId?: string; // ID of the teaching schedule detail (for deletion)
}

export interface ScheduleCell {
  day: string;
  session: string;
  period: number;
  lesson?: LessonInfo;
}

