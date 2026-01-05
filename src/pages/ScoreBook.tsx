import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import {
  fetchClassSubjects,
  fetchClasses,
  fetchScores,
  fetchScoreBookTemplates,
  type ClassSubjectItem,
  type ClassItem,
  type StudentScoreItem,
  type ScoreBookTemplate,
} from "@/lib/api";
import { useEffect, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ScoreBook() {
  const { schoolYear } = useSchoolYear();
  const [subjects, setSubjects] = useState<ClassSubjectItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [scores, setScores] = useState<StudentScoreItem[]>([]);
  const [scoreBookTemplate, setScoreBookTemplate] = useState<ScoreBookTemplate | null>(null);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedScores, setEditedScores] = useState<Map<string, Map<string, string>>>(new Map());

  // Clear subject and scores when class changes
  useEffect(() => {
    setSelectedSubjectId("");
    setScores([]);
  }, [selectedClassId]);

  // Fetch subjects only when a class is selected
  useEffect(() => {
    if (!selectedClassId || !schoolYear) {
      setSubjects([]);
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

  // Clear scores and template when subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setScores([]);
      setScoreBookTemplate(null);
    }
  }, [selectedSubjectId]);

  // Fetch score book template when both class and subject are selected
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId || !schoolYear || !selectedClass || !selectedSubject) {
      setScoreBookTemplate(null);
      return;
    }

    const loadTemplate = async () => {
      try {
        const templates = await fetchScoreBookTemplates("03", schoolYear.schoolYearId); // TODO: Get schoolLevelCode from user context
        const semester = 1; // TODO: Make this configurable
        const scoreBookType = 1;

        // Find matching template
        const matchingTemplate = templates.find((template) => {
          const gradeMatch = template.gradeCodes.includes(selectedClass.gradeLevelCode || "");
          const subjectMatch = template.subjectCodes.includes(selectedSubject.subjectCode);
          const semesterMatch = template.semester === semester;
          const typeMatch = template.scoreBookType === scoreBookType;
          return gradeMatch && subjectMatch && semesterMatch && typeMatch;
        });

        setScoreBookTemplate(matchingTemplate || null);
      } catch (err) {
        console.error("Failed to fetch score book template:", err);
        setScoreBookTemplate(null);
      }
    };

    loadTemplate();
  }, [selectedClassId, selectedSubjectId, schoolYear, selectedClass, selectedSubject]);

  // Fetch scores only when both class and subject are selected
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId || !schoolYear || !selectedClass || !selectedSubject) {
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

  // Build table structure from score book template
  // Sort point groups by sortOrder, and points within each group by sortOrder
  const tableStructure = (() => {
    if (!scoreBookTemplate) return { groups: [], allPoints: [] };

    const groups = scoreBookTemplate.pointGroupSortOrders
      .sort((a, b) => a.sortOrder - b.sortOrder) // Sort point groups by sortOrder
      .map(({ pointGroup }) => ({
        groupCode: pointGroup.pointGroupCode,
        groupName: pointGroup.pointGroupName,
        points: pointGroup.points
          .sort((a, b) => a.sortOrder - b.sortOrder) // Sort points within group by sortOrder
          .map((point) => ({
            pointCode: point.pointCode,
            pointName: point.pointName,
            pointGroupCode: pointGroup.pointGroupCode,
          })),
        showGroupHeader: pointGroup.points.length > 1, // Only show group header if more than one point
      }));

    const allPoints: Array<{
      groupCode: string;
      pointCode: string;
      pointName: string;
    }> = [];
    groups.forEach(({ groupCode, points }) => {
      points.forEach((point) => {
        allPoints.push({
          groupCode,
          pointCode: point.pointCode,
          pointName: point.pointName,
        });
      });
    });

    return { groups, allPoints };
  })();

  // Create a map for quick lookup of score values by student
  const scoreValueMap = new Map<string, Map<string, string>>();
  scores.forEach((score) => {
    const studentScoreMap = new Map<string, string>();
    score.pointDetails.forEach((detail) => {
      studentScoreMap.set(`${detail.pointGroupCode}-${detail.pointCode}`, detail.pointValue || "");
    });
    scoreValueMap.set(score.studentId, studentScoreMap);
  });

  // Get the value for a score cell (either from edited scores or original scores)
  const getScoreValue = (studentId: string, groupCode: string, pointCode: string): string => {
    if (isEditMode && editedScores.has(studentId)) {
      const editedMap = editedScores.get(studentId)!;
      const key = `${groupCode}-${pointCode}`;
      if (editedMap.has(key)) {
        return editedMap.get(key)!;
      }
    }
    const studentScoreMap = scoreValueMap.get(studentId);
    return studentScoreMap?.get(`${groupCode}-${pointCode}`) || "";
  };

  // Handle score value change in edit mode
  const handleScoreChange = (studentId: string, groupCode: string, pointCode: string, value: string) => {
    setEditedScores((prev: Map<string, Map<string, string>>) => {
      const newMap = new Map(prev);
      if (!newMap.has(studentId)) {
        newMap.set(studentId, new Map());
      }
      const studentMap = newMap.get(studentId)!;
      studentMap.set(`${groupCode}-${pointCode}`, value);
      return newMap;
    });
  };

  // Handle discard changes
  const handleDiscardChanges = () => {
    setEditedScores(new Map());
    setIsEditMode(false);
  };

  // Handle save changes
  const handleSaveChanges = () => {
    // TODO: Implement API call to save changes
    toast.success("Đã lưu thay đổi");
    setEditedScores(new Map());
    setIsEditMode(false);
  };

  // Handle publish
  const handlePublish = () => {
    // TODO: Implement API call to publish
    toast.success("Đã xuất bản");
    setEditedScores(new Map());
    setIsEditMode(false);
  };

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
        <div className="mt-10">
          {isLoadingScores ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="mr-3" />
              <span className="text-sm text-muted-foreground">Đang tải bảng điểm...</span>
            </div>
          ) : !scoreBookTemplate ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải cấu hình bảng điểm...</div>
          ) : scores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Không có dữ liệu điểm</div>
          ) : (
            <div className="space-y-4">
              {/* Table caption and edit mode controls */}
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">
                  {selectedClass && selectedSubject
                    ? `Bảng điểm lớp ${selectedClass.className} - Môn ${selectedSubject.subjectName}`
                    : "Bảng điểm"}
                </div>
                <div className="flex items-center gap-2">
                  {isEditMode ? (
                    <div key="edit-mode-buttons" className="flex items-center gap-2">
                      <Button variant="destructive" onClick={handleDiscardChanges}>
                        Hủy thay đổi
                      </Button>
                      <Button variant="secondary" onClick={handleSaveChanges}>
                        Lưu thay đổi
                      </Button>
                      <Button onClick={handlePublish}>Xuất bản</Button>
                    </div>
                  ) : (
                    <Button key="edit-button" variant="outline" onClick={() => setIsEditMode(true)}>
                      Chỉnh sửa
                    </Button>
                  )}
                </div>
              </div>
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
                    {tableStructure.groups.map(({ groupCode, groupName, points, showGroupHeader }) =>
                      showGroupHeader ? (
                        <TableHead
                          key={`group-${groupCode}`}
                          colSpan={points.length}
                          className="text-center bg-muted/50"
                        >
                          {groupName}
                        </TableHead>
                      ) : (
                        // For single-point groups, show point name with rowSpan={2}
                        points.map((point) => (
                          <TableHead
                            key={`single-${groupCode}-${point.pointCode}`}
                            rowSpan={2}
                            className="text-center bg-muted/50"
                          >
                            {point.pointName}
                          </TableHead>
                        ))
                      )
                    )}
                  </TableRow>
                  {/* Point code headers row */}
                  <TableRow>
                    {tableStructure.groups.map(
                      ({ groupCode, points, showGroupHeader }) =>
                        showGroupHeader
                          ? points.map((point) => (
                              <TableHead
                                key={`point-${groupCode}-${point.pointCode}`}
                                className="text-center bg-muted/30"
                              >
                                {point.pointName}
                              </TableHead>
                            ))
                          : null // Single-point groups already rendered in first row with rowSpan={2}
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((score: StudentScoreItem, index: number) => {
                    return (
                      <TableRow key={score.studentId}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell>{score.studentName}</TableCell>
                        {tableStructure.allPoints.map(({ groupCode, pointCode }) => {
                          const value = getScoreValue(score.studentId, groupCode, pointCode);
                          return (
                            <TableCell
                              key={`${score.studentId}-${groupCode}-${pointCode}`}
                              className="text-center p-1.5"
                            >
                              <Input
                                type="text"
                                value={value}
                                readOnly={!isEditMode}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                  handleScoreChange(score.studentId, groupCode, pointCode, e.target.value)
                                }
                                className={cn(
                                  "w-12 h-8 text-center",
                                  isEditMode
                                    ? "border border-input bg-background focus:border-ring focus:ring-ring/50 focus:ring-[3px]"
                                    : "border-0 bg-transparent cursor-default shadow-none"
                                )}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
