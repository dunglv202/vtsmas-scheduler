import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import {
  fetchClassSubjects,
  fetchClasses,
  fetchStudentsByClass,
  type ClassSubjectItem,
  type ClassItem,
  type StudentItem,
} from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ScoreBook() {
  const { schoolYear } = useSchoolYear();
  const [subjects, setSubjects] = useState<ClassSubjectItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch subjects only when a class is selected
  useEffect(() => {
    if (!selectedClassId || !schoolYear) {
      setSubjects([]);
      setSelectedSubjectId(""); // Clear selected subject when class changes
      return;
    }

    const loadSubjects = async () => {
      setIsLoadingSubjects(true);
      setError(null);
      try {
        const subjectsData = await fetchClassSubjects(selectedClassId, schoolYear.schoolYearId, schoolYear.code);
        setSubjects(subjectsData);
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
        const errorMessage = err instanceof Error ? err.message : "Không thể tải danh sách môn học";
        setError(errorMessage);
        toast.error(errorMessage);
        setSubjects([]);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [selectedClassId, schoolYear]);

  // Fetch classes when school year is available
  useEffect(() => {
    if (!schoolYear) return;

    const loadClasses = async () => {
      setIsLoadingClasses(true);
      setError(null);
      try {
        const response = await fetchClasses({
          schoolLevelCode: "03", // TODO: Get from user context or API
          schoolYearId: schoolYear.schoolYearId,
        });
        setClasses(response.items);
      } catch (err) {
        console.error("Failed to fetch classes:", err);
        const errorMessage = err instanceof Error ? err.message : "Không thể tải danh sách lớp học";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoadingClasses(false);
      }
    };

    loadClasses();
  }, [schoolYear]);

  // Fetch students only when both class and subject are selected
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId || !schoolYear) {
      setStudents([]);
      return;
    }

    const loadStudents = async () => {
      setIsLoadingStudents(true);
      setError(null);
      try {
        const studentsData = await fetchStudentsByClass(selectedClassId, schoolYear.schoolYearId);
        setStudents(studentsData);
      } catch (err) {
        console.error("Failed to fetch students:", err);
        const errorMessage = err instanceof Error ? err.message : "Không thể tải danh sách học sinh";
        setError(errorMessage);
        toast.error(errorMessage);
        setStudents([]);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    loadStudents();
  }, [selectedClassId, selectedSubjectId, schoolYear]);

  const selectedClass = classes.find((cls) => cls.id === selectedClassId);
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId);

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Sổ điểm</h1>
        <p className="text-muted-foreground">Nhập điểm cho học sinh theo lớp</p>
      </div>

      {/* Classes Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Chọn lớp</CardTitle>
          <CardDescription>Chọn lớp để xem danh sách môn học và học sinh</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingClasses ? (
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
                  onClick={() => setSelectedClassId(cls.id)}
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
        </CardContent>
      </Card>

      {/* Subjects List - Only shown when a class is selected */}
      {selectedClassId && (
        <Card>
          <CardHeader>
            <CardTitle>Danh sách môn học</CardTitle>
            <CardDescription>
              {selectedClass
                ? `Danh sách các môn học có thể nhập điểm cho lớp ${selectedClass.className}`
                : "Danh sách các môn học có thể nhập điểm"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSubjects ? (
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
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    onClick={() => setSelectedSubjectId(subject.id)}
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
                        {subject.acronymName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Students List - Only shown when both class and subject are selected */}
      {selectedClassId && selectedSubjectId && (
        <Card>
          <CardHeader>
            <CardTitle>Danh sách học sinh</CardTitle>
            <CardDescription>
              {selectedClass && selectedSubject
                ? `Danh sách học sinh lớp ${selectedClass.className} - Môn ${selectedSubject.subjectName}`
                : "Danh sách học sinh"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-3" />
                <span className="text-sm text-muted-foreground">Đang tải danh sách học sinh...</span>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Không có học sinh nào trong lớp này</div>
            ) : (
              <div className="space-y-2">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="p-4 rounded-lg border bg-card text-card-foreground flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {student.imageSrc ? (
                          <img
                            src={student.imageSrc}
                            alt={student.fullName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-lg font-medium">{student.fullName.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{student.fullName}</div>
                        <div className="text-sm text-muted-foreground">Mã học sinh: {student.studentCode}</div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {/* Placeholder for score input - can be extended later */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
