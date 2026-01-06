import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { ClassItem } from "@/lib/api";

interface ClassSelectorProps {
  classes: ClassItem[];
  selectedClassId: string;
  isLoading: boolean;
  error: string | null;
  onSelectClass: (classId: string) => void;
}

export function ClassSelector({ classes, selectedClassId, isLoading, error, onSelectClass }: ClassSelectorProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Chọn lớp</h2>
        <p className="text-sm text-muted-foreground">Chọn lớp để xem danh sách môn học và học sinh</p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner className="mr-3" />
          <span className="text-sm text-muted-foreground">Đang tải danh sách lớp...</span>
        </div>
      ) : error && !classes.length ? (
        <div className="text-center py-8">
          <p className="text-destructive">{error}</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Không có lớp học nào</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {classes.map((cls) => (
            <div
              key={cls.id}
              onClick={() => onSelectClass(cls.id)}
              className={cn(
                "p-4 rounded-lg border bg-card text-card-foreground cursor-pointer transition-all duration-300",
                selectedClassId === cls.id
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "hover:bg-primary/10 hover:border-primary/50"
              )}
            >
              <div className="font-medium text-lg">{cls.className}</div>
              {(cls.teacherName || cls.homeroomTeacherName) && (
                <div
                  className={cn(
                    "text-sm mt-1",
                    selectedClassId === cls.id ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                >
                  GVCN: {cls.teacherName || cls.homeroomTeacherName}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

