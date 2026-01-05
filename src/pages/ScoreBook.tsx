import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import {
  fetchClassSubjects,
  fetchClasses,
  fetchStudentsByClass,
  fetchScores,
  type ClassSubjectItem,
  type ClassItem,
  type StudentItem,
  type StudentScoreItem,
  type PointDetail,
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
  const [scores, setScores] = useState<StudentScoreItem[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
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

  const selectedClass = classes.find((cls) => cls.id === selectedClassId);
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId);

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

  // Fetch scores when both class and subject are selected
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId || !schoolYear || !selectedClass || !selectedSubject) {
      setScores([]);
      return;
    }

    const loadScores = async () => {
      setIsLoadingScores(true);
      setError(null);
      try {
        const scoresData = await fetchScores(
          {
            subjectCode: selectedSubject.subjectCode,
            classRoomId: selectedClassId,
            classRoomIds: [selectedClassId],
            gradeLevelCode: selectedClass.gradeLevelCode || "",
            scoreBookType: 1,
            schoolLevelCode: "03", // TODO: Get from user context or API
            schoolYearId: schoolYear.schoolYearId,
            semester: 1,
            batchNumberId: "00000000-0000-0000-0000-000000000000",
          },
          schoolYear.code
        );
        setScores(scoresData);
      } catch (err) {
        console.error("Failed to fetch scores:", err);
        const errorMessage = err instanceof Error ? err.message : "Không thể tải điểm số";
        setError(errorMessage);
        toast.error(errorMessage);
        setScores([]);
      } finally {
        setIsLoadingScores(false);
      }
    };

    loadScores();
  }, [selectedClassId, selectedSubjectId, schoolYear, selectedClass, selectedSubject]);

  // Compute column structure for scores table
  const scoreColumns = (() => {
    if (scores.length === 0) return { groups: [], allPointCodes: [] };

    const groupMap = new Map<string, Set<string>>();
    scores.forEach((score) => {
      score.pointDetails.forEach((detail) => {
        if (!groupMap.has(detail.pointGroupCode)) {
          groupMap.set(detail.pointGroupCode, new Set());
        }
        groupMap.get(detail.pointGroupCode)!.add(detail.pointCode);
      });
    });

    const groups = Array.from(groupMap.entries()).map(([groupCode, pointCodes]) => ({
      groupCode,
      pointCodes: Array.from(pointCodes),
    }));

    const allPointCodes: Array<{ groupCode: string; pointCode: string }> = [];
    groups.forEach(({ groupCode, pointCodes }) => {
      pointCodes.forEach((pointCode) => {
        allPointCodes.push({ groupCode, pointCode });
      });
    });

    return { groups, allPointCodes };
  })();

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Sổ điểm học sinh</h1>
        <p className="text-muted-foreground">Nhập điểm học sinh theo lớp</p>
      </div>

      {/* Classes Grid */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Chọn lớp</h2>
          <p className="text-sm text-muted-foreground">Chọn lớp để xem danh sách môn học và học sinh</p>
        </div>
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
      </div>

      {/* Subjects List - Only shown when a class is selected */}
      {selectedClassId && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Danh sách môn học</h2>
            <p className="text-sm text-muted-foreground">
              {selectedClass
                ? `Danh sách các môn học có thể nhập điểm cho lớp ${selectedClass.className}`
                : "Danh sách các môn học có thể nhập điểm"}
            </p>
          </div>
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
              {subjects
                .filter((subject) => !subject.isDisabled)
                .map((subject) => (
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
        </div>
      )}

      {/* Scores Table - Only shown when both class and subject are selected */}
      {selectedClassId && selectedSubjectId && (
        <Card>
          <CardHeader>
            <CardTitle>Bảng điểm</CardTitle>
            <CardDescription>
              {selectedClass && selectedSubject
                ? `Bảng điểm lớp ${selectedClass.className} - Môn ${selectedSubject.subjectName}`
                : "Bảng điểm"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingScores ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-3" />
                <span className="text-sm text-muted-foreground">Đang tải bảng điểm...</span>
              </div>
            ) : scores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Không có dữ liệu điểm</div>
            ) : (
              <Table>
                  <TableHeader>
                    {/* Group headers row */}
                    <TableRow>
                      <TableHead rowSpan={2} className="bg-muted/50">
                        STT
                      </TableHead>
                      <TableHead rowSpan={2} className="bg-muted/50">
                        Họ và tên
                      </TableHead>
                      {scoreColumns.groups.map(({ groupCode, pointCodes }) => (
                        <TableHead
                          key={`group-${groupCode}`}
                          colSpan={pointCodes.length}
                          className="text-center bg-muted/50"
                        >
                          {groupCode}
                        </TableHead>
                      ))}
                      <TableHead rowSpan={2} className="text-center bg-muted/50">
                        ĐTB
                      </TableHead>
                    </TableRow>
                    {/* Point code headers row */}
                    <TableRow>
                      {scoreColumns.allPointCodes.map(({ groupCode, pointCode }) => (
                        <TableHead key={`point-${groupCode}-${pointCode}`} className="text-center bg-muted/30">
                          {pointCode}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map((score, index) => {
                      // Create a map for quick lookup of point details
                      const pointDetailMap = new Map<string, PointDetail>();
                      score.pointDetails.forEach((detail) => {
                        pointDetailMap.set(`${detail.pointGroupCode}-${detail.pointCode}`, detail);
                      });

                      return (
                        <TableRow key={score.studentId}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell>{score.studentName}</TableCell>
                          {scoreColumns.allPointCodes.map(({ groupCode, pointCode }) => {
                            const detail = pointDetailMap.get(`${groupCode}-${pointCode}`);
                            return (
                              <TableCell key={`${score.studentId}-${groupCode}-${pointCode}`} className="text-center">
                                {detail?.pointValue || ""}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-medium">
                            {score.pointAverageSubject || ""}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
