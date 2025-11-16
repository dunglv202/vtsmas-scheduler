import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import { fetchClasses, fetchStudentsByClass, type ClassItem, type StudentItem } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface ClassWithDetails extends ClassItem {
  studentCount?: number;
}

interface ClassCardProps {
  classItem: ClassWithDetails;
  schoolYearId: string;
  studentCount: number | undefined;
}

function ClassCard({ classItem, schoolYearId, studentCount }: ClassCardProps) {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current || hasLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoaded) {
            setHasLoaded(true);
            setIsLoadingStudents(true);
            fetchStudentsByClass(classItem.id, schoolYearId)
              .then((studentList) => {
                setStudents(studentList);
              })
              .catch((err) => {
                console.error(`Failed to fetch students for class ${classItem.id}:`, err);
              })
              .finally(() => {
                setIsLoadingStudents(false);
              });
            observer.disconnect();
          }
        });
      },
      { rootMargin: "50px" }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, [classItem.id, schoolYearId, hasLoaded]);

  const displayStudents = students.slice(0, 5); // Show max 5 avatars
  const remainingCount = students.length > 5 ? students.length - 5 : 0;

  return (
    <Card
      ref={cardRef}
      className={cn(
        "p-4 cursor-pointer transition-all duration-300",
        "bg-card text-card-foreground",
        "hover:bg-primary hover:text-primary-foreground",
        "border hover:border-primary",
        "shadow-none",
        "rounded-lg"
      )}
    >
      <div className="text-center space-y-1.5 text-sm">
        <h3 className="font-semibold text-xl">{classItem.className}</h3>
        {(classItem.teacherName || classItem.homeroomTeacherName) && (
          <p className="text-muted-foreground hover:text-primary-foreground/80">
            GVCN: {classItem.teacherName || classItem.homeroomTeacherName}
          </p>
        )}
        {(classItem.totalStudent !== undefined ||
          classItem.studentCount !== undefined ||
          studentCount !== undefined) && (
          <p className="text-muted-foreground hover:text-primary-foreground/80">
            Số học sinh: {classItem.totalStudent ?? classItem.studentCount ?? studentCount ?? 0}
          </p>
        )}
      </div>

      {/* Student avatars section */}
      {(hasLoaded || isLoadingStudents || students.length > 0) && (
        <div>
          {isLoadingStudents ? (
            <div className="flex justify-center">
              <Spinner className="h-4 w-4" />
            </div>
          ) : students.length > 0 ? (
            <div className="flex justify-center">
              <div
                className={cn("flex -space-x-2", "*:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background")}
              >
                {displayStudents.map((student) => {
                  const initials = student.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div
                      key={student.id}
                      data-slot="avatar"
                      className={cn("w-8 h-8 rounded-full overflow-hidden", "ring-2 ring-background", "shrink-0")}
                      title={student.fullName}
                    >
                      {student.imageSrc ? (
                        <img
                          src={student.imageSrc}
                          alt={student.fullName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-xs font-medium">
                          {initials}
                        </div>
                      )}
                    </div>
                  );
                })}
                {remainingCount > 0 && (
                  <div
                    data-slot="avatar"
                    className={cn(
                      "w-8 h-8 rounded-full ring-2 ring-background",
                      "bg-muted flex items-center justify-center text-xs font-medium",
                      "shrink-0"
                    )}
                    title={`+${remainingCount} học sinh khác`}
                  >
                    +{remainingCount}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Card>
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
      <h1 className="text-3xl font-bold mb-12 text-center">Danh sách lớp học</h1>
      {classes.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">Không có lớp học nào</div>
      ) : (
        <div className="flex justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {classes.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                schoolYearId={schoolYear.schoolYearId}
                studentCount={classItem.totalStudent ?? classItem.studentCount ?? studentCounts[classItem.id]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
