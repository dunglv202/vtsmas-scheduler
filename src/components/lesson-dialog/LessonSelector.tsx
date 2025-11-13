import type { CurriculumItem } from "@/lib/api";

interface LessonSelectorProps {
  lessons: CurriculumItem[];
  selectedLessonId: string;
  isLoading: boolean;
  error: string | null;
  selectedClassId: string;
  selectedSubjectCode: string;
  onChange: (value: string) => void;
}

export function LessonSelector({
  lessons,
  selectedLessonId,
  isLoading,
  error,
  selectedClassId,
  selectedSubjectCode,
  onChange,
}: LessonSelectorProps) {
  const placeholder = !selectedClassId
    ? "Chọn lớp trước"
    : !selectedSubjectCode
    ? "Chọn môn học trước"
    : isLoading
    ? "Đang tải tiết học..."
    : lessons.length > 0
    ? "Chọn tiết học"
    : "Không có tiết học";

  return (
    <div className="space-y-2">
      <label htmlFor="lesson" className="text-sm font-medium">
        Tiết học
      </label>
      <select
        id="lesson"
        value={selectedLessonId}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background disabled:bg-muted disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {lessons.map((lesson) => (
          <option key={lesson.id} value={lesson.id}>
            {lesson.period} - {lesson.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

