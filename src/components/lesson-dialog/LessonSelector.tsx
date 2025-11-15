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
  // For manual period input when no lessons exist
  manualPeriod?: string;
  onManualPeriodChange?: (value: string) => void;
}

export function LessonSelector({
  lessons,
  selectedLessonId,
  isLoading,
  error,
  selectedClassId,
  selectedSubjectCode,
  onChange,
  manualPeriod,
  onManualPeriodChange,
}: LessonSelectorProps) {
  const hasLessons = lessons.length > 0;
  // Show number input when no lessons exist (curriculum not planned)
  const showNumberInput = !isLoading && selectedClassId && selectedSubjectCode && !hasLessons;

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
      {showNumberInput ? (
        <input
          type="number"
          min="1"
          value={manualPeriod || ""}
          onChange={(e) => onManualPeriodChange?.(e.target.value)}
          placeholder="Nhập số tiết"
          disabled={!selectedClassId || !selectedSubjectCode || isLoading}
          className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      ) : (
        <Combobox
          options={options}
          value={selectedLessonId}
          onValueChange={onChange}
          placeholder={placeholder}
          disabled={!selectedClassId || !selectedSubjectCode || isLoading}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
