import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import {
  fetchClassSubjects,
  fetchClasses,
  fetchScores,
  fetchScoreBookTemplates,
  fetchStudentsByClass,
  publishScores,
  type ClassSubjectItem,
  type ClassItem,
  type StudentScoreItem,
  type ScoreBookTemplate,
  type StudentItem,
  type PublishScoreRequest,
  type ScoreBookPoint,
} from "@/lib/api";
import { normalizeVietnamese, normalizeNumericValue, getScoreLimit, formatToDecimal } from "@/lib/scoreBookUtils";

export function useScoreBook() {
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
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>("");

  const selectedClass = classes.find((cls) => cls.id === selectedClassId);
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId);

  // Clear subject and scores when class changes
  useEffect(() => {
    setSelectedSubjectId("");
    setScores([]);
    setStudents([]);
    setScoreBookTemplate(null);
    setSearchTerm("");
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
          schoolLevelCode: "03",
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

  // Clear scores and template when subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setScores([]);
      setScoreBookTemplate(null);
      setSearchTerm("");
    }
  }, [selectedSubjectId]);

  // Fetch score book template and students when both class and subject are selected
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId || !schoolYear || !selectedClass || !selectedSubject) {
      setScoreBookTemplate(null);
      setStudents([]);
      return;
    }

    const loadTemplateAndStudents = async () => {
      try {
        const schoolLevelCode = selectedClass.schoolLevelCode || "03";

        const [templates, studentsData] = await Promise.all([
          fetchScoreBookTemplates(schoolLevelCode, schoolYear.schoolYearId),
          fetchStudentsByClass(selectedClassId, schoolYear.schoolYearId),
        ]);

        const semester = 1;
        const scoreBookType = 1;

        const matchingTemplates = templates.filter((template) => {
          const gradeMatch = template.gradeCodes.includes(selectedClass.gradeLevelCode || "");
          const subjectMatch = template.subjectCodes.includes(selectedSubject.subjectCode);
          const semesterMatch = template.semester === semester;
          const typeMatch = template.scoreBookType === scoreBookType;
          return gradeMatch && subjectMatch && semesterMatch && typeMatch;
        });

        let matchingTemplate = null;
        if (matchingTemplates.length > 0) {
          matchingTemplate = matchingTemplates.reduce((latest, current) => {
            const latestDate = new Date(latest.appliedDate);
            const currentDate = new Date(current.appliedDate);
            return currentDate > latestDate ? current : latest;
          });
        }

        const sortedStudents = [...studentsData].sort((a, b) => {
          const orderA = a.sortOrderByClass ?? a.sortOrder ?? 0;
          const orderB = b.sortOrderByClass ?? b.sortOrder ?? 0;
          return orderA - orderB;
        });
        const isActive = (student: StudentItem) => student.status === "Đang học" || student.statusCode === "01";

        setScoreBookTemplate(matchingTemplate);
        setStudents(sortedStudents.filter(isActive));
      } catch (err) {
        console.error("Failed to fetch template or students:", err);
        setScoreBookTemplate(null);
        setStudents([]);
      }
    };

    loadTemplateAndStudents();
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
        const schoolLevelCode = selectedClass.schoolLevelCode || "03";
        const scoresData = await fetchScores(
          {
            subjectCode: selectedSubject.subjectCode,
            classRoomId: selectedClassId,
            classRoomIds: [selectedClassId],
            gradeLevelCode: selectedClass.gradeLevelCode || "",
            scoreBookType: 1,
            schoolLevelCode,
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
  const tableStructure = useMemo(() => {
    if (!scoreBookTemplate || !selectedSubject) return { groups: [], allPoints: [] };

    const semester = 1;

    const groups = scoreBookTemplate.pointGroupSortOrders
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ pointGroup }) => {
        const pointsByBatchNumber = new Map<string, ScoreBookPoint[]>();

        pointGroup.points.forEach((point) => {
          const batchCode = point.batchNumberCode;
          if (!pointsByBatchNumber.has(batchCode)) {
            pointsByBatchNumber.set(batchCode, []);
          }
          pointsByBatchNumber.get(batchCode)!.push(point);
        });

        const limitedPoints: ScoreBookPoint[] = [];
        pointsByBatchNumber.forEach((points, batchCode) => {
          const limit = getScoreLimit(batchCode, selectedSubject, semester);
          const sortedPoints = points.sort((a, b) => a.sortOrder - b.sortOrder);

          if (limit !== null && limit > 0) {
            limitedPoints.push(...sortedPoints.slice(0, limit));
          } else {
            limitedPoints.push(...sortedPoints);
          }
        });

        const finalPoints = limitedPoints
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((point) => ({
            pointCode: point.pointCode,
            pointName: point.pointName,
            pointGroupCode: pointGroup.pointGroupCode,
            pointType: point.pointType,
            pointWeight: point.pointWeight,
          }));

        return {
          groupCode: pointGroup.pointGroupCode,
          groupName: pointGroup.pointGroupName,
          points: finalPoints,
          showGroupHeader: finalPoints.length > 1,
        };
      })
      .filter((group) => group.points.length > 0);

    const allPoints: Array<{
      groupCode: string;
      pointCode: string;
      pointName: string;
      pointType: number;
      pointWeight: number;
    }> = [];
    groups.forEach(({ groupCode, points }) => {
      points.forEach((point) => {
        allPoints.push({
          groupCode,
          pointCode: point.pointCode,
          pointName: point.pointName,
          pointType: point.pointType,
          pointWeight: point.pointWeight,
        });
      });
    });

    return { groups, allPoints };
  }, [scoreBookTemplate, selectedSubject]);

  // Initialize visible columns when table structure changes
  useEffect(() => {
    if (tableStructure.allPoints.length > 0 && visibleColumns.size === 0) {
      const allColumnKeys = new Set(tableStructure.allPoints.map((point) => `${point.groupCode}-${point.pointCode}`));
      setVisibleColumns(allColumnKeys);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableStructure.allPoints.length]);

  // Filter table structure based on visible columns
  const filteredTableStructure = useMemo(() => {
    if (visibleColumns.size === 0) {
      return tableStructure;
    }

    const filteredGroups = tableStructure.groups
      .map((group) => {
        const filteredPoints = group.points.filter((point) =>
          visibleColumns.has(`${point.pointGroupCode}-${point.pointCode}`)
        );
        return {
          ...group,
          points: filteredPoints,
          showGroupHeader: filteredPoints.length > 1,
        };
      })
      .filter((group) => group.points.length > 0);

    const filteredAllPoints = tableStructure.allPoints.filter((point) =>
      visibleColumns.has(`${point.groupCode}-${point.pointCode}`)
    );

    return { groups: filteredGroups, allPoints: filteredAllPoints };
  }, [tableStructure, visibleColumns]);

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) {
      return students;
    }

    const normalizedSearch = normalizeVietnamese(searchTerm);
    return students.filter((student) => {
      const normalizedName = normalizeVietnamese(student.fullName);
      return normalizedName.includes(normalizedSearch);
    });
  }, [students, searchTerm]);

  // Create a map for quick lookup of score values by student
  const scoreValueMap = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    scores.forEach((score) => {
      const studentScoreMap = new Map<string, string>();
      score.pointDetails.forEach((detail) => {
        studentScoreMap.set(`${detail.pointGroupCode}-${detail.pointCode}`, detail.pointValue || "");
      });
      map.set(score.studentId, studentScoreMap);
    });
    return map;
  }, [scores]);

  // Get raw score value without calculating averages
  const getRawScoreValue = useCallback(
    (studentId: string, groupCode: string, pointCode: string): string => {
      if (isEditMode && editedScores.has(studentId)) {
        const editedMap = editedScores.get(studentId)!;
        const key = `${groupCode}-${pointCode}`;
        if (editedMap.has(key)) {
          return editedMap.get(key)!;
        }
      }
      const studentScoreMap = scoreValueMap.get(studentId);
      return studentScoreMap?.get(`${groupCode}-${pointCode}`) || "";
    },
    [isEditMode, editedScores, scoreValueMap]
  );

  // Calculate weighted average for pointType=2
  const calculateAverageScore = useCallback(
    (studentId: string): string => {
      if (!scoreBookTemplate || !tableStructure || tableStructure.allPoints.length === 0) {
        return "";
      }

      const basePoints = tableStructure.allPoints.filter(
        (point) => point.pointType === 1 && point.pointWeight !== undefined && point.pointWeight > 0
      );

      if (basePoints.length === 0) {
        return "";
      }

      let totalWeightedSum = 0;
      let totalWeight = 0;

      basePoints.forEach((point) => {
        const value = getRawScoreValue(studentId, point.groupCode, point.pointCode);
        const numValue = normalizeNumericValue(value);
        if (numValue !== null && point.pointWeight > 0) {
          totalWeightedSum += numValue * point.pointWeight;
          totalWeight += point.pointWeight;
        }
      });

      if (totalWeight === 0) {
        return "";
      }

      const average = totalWeightedSum / totalWeight;
      return average.toFixed(1);
    },
    [scoreBookTemplate, tableStructure, getRawScoreValue]
  );

  // Get the value for a score cell
  const getScoreValue = useCallback(
    (studentId: string, groupCode: string, pointCode: string, pointType?: number): string => {
      if (pointType === 2) {
        return calculateAverageScore(studentId);
      }
      return getRawScoreValue(studentId, groupCode, pointCode);
    },
    [calculateAverageScore, getRawScoreValue]
  );

  // Determine the change type for a score value
  const getScoreChangeType = useCallback(
    (
      studentId: string,
      groupCode: string,
      pointCode: string,
      pointType?: number
    ): "modified" | "new" | "removed" | null => {
      if (pointType === 2) return null;
      if (!isEditMode) return null;
      const originalValue = scoreValueMap.get(studentId)?.get(`${groupCode}-${pointCode}`) || "";
      const currentValue = getScoreValue(studentId, groupCode, pointCode, pointType);

      const originalNum = normalizeNumericValue(originalValue);
      const currentNum = normalizeNumericValue(currentValue);

      if (originalNum !== null && currentNum !== null) {
        if (originalNum === currentNum) return null;
        return "modified";
      }

      if (currentValue === originalValue) return null;

      const hadValue = originalValue.trim() !== "";
      const hasValue = currentValue.trim() !== "";

      if (!hadValue && hasValue) return "new";
      if (hadValue && !hasValue) return "removed";
      if (hadValue && hasValue) return "modified";

      return null;
    },
    [isEditMode, scoreValueMap, getScoreValue]
  );

  // Handle score value change in edit mode
  const handleScoreChange = useCallback((studentId: string, groupCode: string, pointCode: string, value: string) => {
    setEditedScores((prev: Map<string, Map<string, string>>) => {
      const newMap = new Map(prev);
      if (!newMap.has(studentId)) {
        newMap.set(studentId, new Map());
      }
      const studentMap = newMap.get(studentId)!;
      studentMap.set(`${groupCode}-${pointCode}`, value);
      return newMap;
    });
  }, []);

  // Handle input blur to format numeric values
  const handleScoreBlur = useCallback(
    (studentId: string, groupCode: string, pointCode: string, pointType: number, value: string) => {
      if (pointType === 4) return;

      const formatted = formatToDecimal(value);
      if (formatted !== value) {
        handleScoreChange(studentId, groupCode, pointCode, formatted);
      }
    },
    [handleScoreChange]
  );

  // Handle paste event to fill multiple cells
  const handlePaste = useCallback(
    (
      e: React.ClipboardEvent<HTMLInputElement>,
      startStudentId: string,
      startGroupCode: string,
      startPointCode: string
    ) => {
      if (!isEditMode) return;

      e.preventDefault();
      const pastedData = e.clipboardData.getData("text");

      const rows = pastedData
        .split(/\r?\n/)
        .map((row) =>
          row.split(/\t/).map((cell) => {
            const trimmed = cell.trim();
            if (trimmed === "") return trimmed;
            return formatToDecimal(trimmed);
          })
        )
        .filter((row) => row.some((cell) => cell.length > 0));

      if (rows.length === 0) return;

      const startColumnIndex = filteredTableStructure.allPoints.findIndex(
        (point) => point.groupCode === startGroupCode && point.pointCode === startPointCode
      );

      if (startColumnIndex === -1) return;

      const startStudentIndex = students.findIndex((student) => student.id === startStudentId);
      if (startStudentIndex === -1) return;

      setEditedScores((prev: Map<string, Map<string, string>>) => {
        const newMap = new Map(prev);

        rows.forEach((row, rowIndex) => {
          const studentIndex = startStudentIndex + rowIndex;
          if (studentIndex >= students.length) return;

          const student = students[studentIndex];
          if (!newMap.has(student.id)) {
            newMap.set(student.id, new Map());
          }
          const studentMap = newMap.get(student.id)!;

          row.forEach((value, colIndex) => {
            const pointIndex = startColumnIndex + colIndex;
            if (pointIndex >= filteredTableStructure.allPoints.length) return;

            const point = filteredTableStructure.allPoints[pointIndex];
            studentMap.set(`${point.groupCode}-${point.pointCode}`, value);
          });
        });

        return newMap;
      });
    },
    [isEditMode, filteredTableStructure, students]
  );

  // Handle discard changes
  const handleDiscardChanges = useCallback(() => {
    setEditedScores(new Map());
    setIsEditMode(false);
  }, []);

  // Handle save changes
  const handleSaveChanges = useCallback(() => {
    toast.info("Tính năng lưu tạm sẽ được thêm sau");
  }, []);

  // Handle publish
  const handlePublish = useCallback(async () => {
    if (
      !selectedClassId ||
      !selectedSubjectId ||
      !schoolYear ||
      !selectedClass ||
      !selectedSubject ||
      !scoreBookTemplate
    ) {
      toast.error("Vui lòng chọn lớp và môn học");
      return;
    }

    try {
      const pointMetadataMap = new Map<string, ScoreBookPoint>();
      scoreBookTemplate.pointGroupSortOrders.forEach(({ pointGroup }) => {
        pointGroup.points.forEach((point) => {
          const key = `${point.pointGroupCode}-${point.pointCode}`;
          pointMetadataMap.set(key, point);
        });
      });

      const studentPoints = students
        .map((student) => {
          const currentScoreMap = new Map<string, string>();

          const scoreData = scores.find((s) => s.studentId === student.id);
          if (scoreData) {
            scoreData.pointDetails.forEach((detail) => {
              const key = `${detail.pointGroupCode}-${detail.pointCode}`;
              currentScoreMap.set(key, detail.pointValue || "");
            });
          }

          if (editedScores.has(student.id)) {
            const editedMap = editedScores.get(student.id)!;
            editedMap.forEach((value, key) => {
              currentScoreMap.set(key, value);
            });
          }

          const pointDetails: Array<{
            periodCode: string;
            pointType: number;
            pointCode: string;
            pointDescription: string;
            pointGroupCode: string;
            pointValue: string;
            pointWeight: number;
          }> = [];

          pointMetadataMap.forEach((pointMetadata, key) => {
            const originalValue = scoreValueMap.get(student.id)?.get(key) || "";
            const currentValue = currentScoreMap.get(key) || "";

            if (originalValue !== currentValue) {
              const hasValue = currentValue.trim() !== "";
              const finalValue = hasValue ? currentValue : "";

              pointDetails.push({
                periodCode: pointMetadata.batchNumberCode || "",
                pointType: pointMetadata.pointType,
                pointCode: pointMetadata.pointCode,
                pointDescription: pointMetadata.description || pointMetadata.pointName,
                pointGroupCode: pointMetadata.pointGroupCode,
                pointValue: finalValue,
                pointWeight: pointMetadata.pointWeight,
              });
            }
          });

          if (pointDetails.length === 0) {
            return null;
          }

          return {
            studentId: student.id,
            studentCode: student.studentCode,
            studentName: student.fullName,
            pointDetails,
            teacherComment: scoreData?.teacherComment || null,
          };
        })
        .filter((studentPoint): studentPoint is NonNullable<typeof studentPoint> => studentPoint !== null);

      if (studentPoints.length === 0) {
        toast.info("Không có thay đổi nào để xuất bản");
        return;
      }

      const schoolLevelCode = selectedClass.schoolLevelCode || "03";
      const schoolLevelName = selectedClass.schoolLevel || "Trung học cơ sở";
      const publishRequest: PublishScoreRequest = {
        scoreBookTemplateId: scoreBookTemplate.id,
        scoreBookType: scoreBookTemplate.scoreBookType,
        classRoomId: selectedClassId,
        classRoomName: selectedClass.className || "",
        schoolYearId: schoolYear.schoolYearId,
        schoolYearName: schoolYear.code,
        schoolLevelCode,
        schoolLevelName,
        gradeLevelCode: selectedClass.gradeLevelCode || "",
        gradeLevelName: selectedClass.gradeLevel || "",
        subjectCode: selectedSubject.subjectCode,
        subjectName: selectedSubject.subjectName || "",
        semester: 1,
        studentPoints,
        batchNumberId: "00000000-0000-0000-0000-000000000000",
      };

      await publishScores(publishRequest, schoolYear.code);
      toast.success("Đã xuất bản điểm số");
      setEditedScores(new Map());
      setIsEditMode(false);

      const refreshSchoolLevelCode = selectedClass.schoolLevelCode || "03";
      const scoresData = await fetchScores(
        {
          subjectCode: selectedSubject.subjectCode,
          classRoomId: selectedClassId,
          classRoomIds: [selectedClassId],
          gradeLevelCode: selectedClass.gradeLevelCode || "",
          scoreBookType: 1,
          schoolLevelCode: refreshSchoolLevelCode,
          schoolYearId: schoolYear.schoolYearId,
          semester: 1,
          batchNumberId: "00000000-0000-0000-0000-000000000000",
        },
        schoolYear.code
      );
      setScores(scoresData);
    } catch (err) {
      console.error("Failed to publish scores:", err);
      const errorMessage = err instanceof Error ? err.message : "Không thể xuất bản điểm số";
      toast.error(errorMessage);
    }
  }, [
    selectedClassId,
    selectedSubjectId,
    schoolYear,
    selectedClass,
    selectedSubject,
    scoreBookTemplate,
    students,
    scores,
    editedScores,
    scoreValueMap,
  ]);

  return {
    // State
    classes,
    subjects,
    selectedClassId,
    selectedSubjectId,
    selectedClass,
    selectedSubject,
    students,
    filteredStudents,
    scores,
    scoreBookTemplate,
    tableStructure,
    filteredTableStructure,
    scoreValueMap,
    isLoadingClasses,
    isLoadingSubjects,
    isLoadingScores,
    error,
    isEditMode,
    visibleColumns,
    searchTerm,
    // Actions
    setSelectedClassId,
    setSelectedSubjectId,
    setIsEditMode,
    setVisibleColumns,
    setSearchTerm,
    // Handlers
    getScoreValue,
    getScoreChangeType,
    handleScoreChange,
    handleScoreBlur,
    handlePaste,
    handleDiscardChanges,
    handleSaveChanges,
    handlePublish,
  };
}

