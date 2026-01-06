import { Spinner } from "@/components/ui/spinner";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import { fetchClasses, fetchStudentsByClass, type ClassItem } from "@/lib/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ClassWithDetails extends ClassItem {
  studentCount?: number;
}

interface ClassCardProps {
  classItem: ClassWithDetails;
  studentCount: number | undefined;
}

function ClassCard({ classItem }: ClassCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/classes/${classItem.id}`)}
      className={cn(
        "p-4 rounded-lg border bg-card text-card-foreground cursor-pointer transition-all duration-300",
        "hover:bg-primary/10 hover:border-primary/50"
      )}
    >
      <div className="font-medium text-lg">Lớp {classItem.className}</div>
      {(classItem.teacherName || classItem.homeroomTeacherName) && (
        <div className="text-sm mt-1 text-muted-foreground">
          GVCN: {classItem.teacherName || classItem.homeroomTeacherName}
        </div>
      )}
    </div>
  );
}

export default function Classes() {
  const { schoolYear } = useSchoolYear();
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!schoolYear) return;

    const loadClasses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchClasses({
          schoolLevelCode: "03", // TODO: Get from user context or API
          schoolYearId: schoolYear.schoolYearId,
        });
        setClasses(response.items);
      } catch (err) {
        console.error("Failed to fetch classes:", err);
        setError(err instanceof Error ? err.message : "Không thể tải danh sách lớp học");
      } finally {
        setIsLoading(false);
      }
    };

    loadClasses();
  }, [schoolYear]);

  // Fetch student counts for classes that don't have totalStudent
  useEffect(() => {
    if (!schoolYear || classes.length === 0) return;

    const loadStudentCounts = async () => {
      const classesNeedingCounts = classes.filter(
        (cls) => cls.totalStudent === undefined && cls.studentCount === undefined
      );

      if (classesNeedingCounts.length === 0) return;

      try {
        const countPromises = classesNeedingCounts.map(async (cls) => {
          try {
            const students = await fetchStudentsByClass(cls.id, schoolYear.schoolYearId);
            return { classId: cls.id, count: students.length };
          } catch (err) {
            console.error(`Failed to fetch students for class ${cls.id}:`, err);
            return { classId: cls.id, count: 0 };
          }
        });

        const counts = await Promise.all(countPromises);
        const countsMap: Record<string, number> = {};
        counts.forEach(({ classId, count }) => {
          countsMap[classId] = count;
        });
        setStudentCounts(countsMap);
      } catch (err) {
        console.error("Failed to fetch student counts:", err);
      }
    };

    loadStudentCounts();
  }, [classes, schoolYear]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="mr-3" />
        <span className="text-sm text-muted-foreground">Đang tải danh sách lớp học...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-2">Lỗi: {error}</p>
        </div>
      </div>
    );
  }

  if (!schoolYear) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="mb-12">
        <h1 className="text-3xl font-bold mb-2 text-center">Danh sách lớp học</h1>
        <p className="text-muted-foreground text-center">Chọn lớp để xem chi tiết</p>
      </div>
      {classes.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">Không có lớp học nào</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {classes.map((classItem) => (
            <ClassCard
              key={classItem.id}
              classItem={classItem}
              studentCount={classItem.totalStudent ?? classItem.studentCount ?? studentCounts[classItem.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
