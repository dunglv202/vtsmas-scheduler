import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { ClassSubjectItem, ClassItem } from "@/lib/api";

interface SubjectSelectorProps {
  subjects: ClassSubjectItem[];
  selectedSubjectId: string;
  selectedClass: ClassItem | undefined;
  isLoading: boolean;
  error: string | null;
  onSelectSubject: (subjectId: string) => void;
}

export function SubjectSelector({
  subjects,
  selectedSubjectId,
  selectedClass,
  isLoading,
  error,
  onSelectSubject,
}: SubjectSelectorProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Danh sách môn học</h2>
        <p className="text-sm text-muted-foreground">
          {selectedClass
            ? `Danh sách các môn học có thể nhập điểm cho lớp ${selectedClass.className}`
            : "Danh sách các môn học có thể nhập điểm"}
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner className="mr-3" />
          <span className="text-sm text-muted-foreground">Đang tải danh sách môn học...</span>
        </div>
      ) : error && !subjects.length ? (
        <div className="text-center py-8">
          <p className="text-destructive">{error}</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Không có môn học nào</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {subjects
            .filter((subject) => !subject.isDisabled)
            .map((subject) => (
              <div
                key={subject.id}
                onClick={() => onSelectSubject(subject.id)}
                className={cn(
                  "p-3 rounded-lg border bg-card text-card-foreground cursor-pointer transition-all duration-300",
                  selectedSubjectId === subject.id
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "hover:bg-primary/10 hover:border-primary/50"
                )}
              >
                <div className="font-medium">{subject.subjectName}</div>
                {subject.acronymName && (
                  <div
                    className={cn(
                      "text-sm mt-1",
                      selectedSubjectId === subject.id ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    Mã: {subject.acronymName}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
