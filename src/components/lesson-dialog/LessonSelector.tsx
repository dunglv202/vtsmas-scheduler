import type { CurriculumItem } from "@/lib/api";
import { Combobox } from "@/components/ui/combobox";

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

  const options = lessons.map((lesson) => ({
    value: lesson.id,
    label: `${lesson.period} - ${lesson.name}`,
  }));

  return (
    <div className="space-y-2 px-1">
      <label htmlFor="lesson" className="text-sm font-medium">
        Tiết học
      </label>
      <Combobox
        options={options}
        value={selectedLessonId}
        onValueChange={onChange}
        placeholder={placeholder}
        disabled={!selectedClassId || !selectedSubjectCode || isLoading}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
