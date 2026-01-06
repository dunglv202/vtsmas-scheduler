import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { useEffect, useState, useRef, useMemo, type ChangeEvent, type ClipboardEvent } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Settings2 } from "lucide-react";

// Component for student name with popover on hover
interface StudentNameWithPopoverProps {
  studentName: string;
  student: StudentItem | undefined;
}

function StudentNameWithPopover({ studentName, student }: StudentNameWithPopoverProps) {
  const [open, setOpen] = useState(false);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpen = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (!open) {
      openTimeoutRef.current = setTimeout(() => {
        setOpen(true);
      }, 500); // 500ms delay to open
    }
  };

  const handleClose = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    // Add delay before closing to allow moving mouse to popover
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 100); // 100ms delay before closing
  };

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Only show popover if we have student details
  if (!student) {
    return <span>{studentName}</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className="cursor-pointer hover:text-primary transition-colors"
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          {studentName}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-64"
        side="right"
        align="center"
        sideOffset={8}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {student.imageSrc && (
              <img
                src={student.imageSrc}
                alt={student.fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{student.fullName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Mã học sinh: {student.studentCode}</p>
            </div>
          </div>
          {student.identifyNumber && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">CMND/CCCD:</span> {student.identifyNumber}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);

  // Clear subject and scores when class changes
  useEffect(() => {
    setSelectedSubjectId("");
    setScores([]);
    setStudents([]);
    setScoreBookTemplate(null);
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
        // Default to "03" for initial fetch, will use selected class's value when available
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

  const selectedClass = classes.find((cls) => cls.id === selectedClassId);
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId);

  // Clear scores and template when subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setScores([]);
      setScoreBookTemplate(null);
    }
  }, [selectedSubjectId]);

  // Fetch score book template and students when both class and subject are selected
  // This builds the table layout
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId || !schoolYear || !selectedClass || !selectedSubject) {
      setScoreBookTemplate(null);
      setStudents([]);
      return;
    }

    const loadTemplateAndStudents = async () => {
      try {
        const schoolLevelCode = selectedClass.schoolLevelCode || "03";

        // Fetch both template and students in parallel
        const [templates, studentsData] = await Promise.all([
          fetchScoreBookTemplates(schoolLevelCode, schoolYear.schoolYearId),
          fetchStudentsByClass(selectedClassId, schoolYear.schoolYearId),
        ]);

        const semester = 1; // TODO: Make this configurable
        const scoreBookType = 1;

        // Find all matching templates
        const matchingTemplates = templates.filter((template) => {
          const gradeMatch = template.gradeCodes.includes(selectedClass.gradeLevelCode || "");
          const subjectMatch = template.subjectCodes.includes(selectedSubject.subjectCode);
          const semesterMatch = template.semester === semester;
          const typeMatch = template.scoreBookType === scoreBookType;
          return gradeMatch && subjectMatch && semesterMatch && typeMatch;
        });

        // If multiple templates match, use the one with the latest appliedDate
        let matchingTemplate = null;
        if (matchingTemplates.length > 0) {
          matchingTemplate = matchingTemplates.reduce((latest, current) => {
            const latestDate = new Date(latest.appliedDate);
            const currentDate = new Date(current.appliedDate);
            return currentDate > latestDate ? current : latest;
          });
        }

        // Sort students by sortOrderByClass or sortOrder
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
  // Sort point groups by sortOrder, and points within each group by sortOrder
  // Apply score limits from selected subject based on batchNumberCode (per group)
  const tableStructure = (() => {
    if (!scoreBookTemplate) return { groups: [], allPoints: [] };

    // Get score limits from selected subject
    const semester = 1; // TODO: Make this configurable
    const getScoreLimit = (batchNumberCode: string): number | null => {
      if (!selectedSubject) return null;

      switch (batchNumberCode) {
        case "TX":
          // Use regularReviewScore for semester 1, regularReviewScoreHKII for semester 2
          return semester === 1 ? selectedSubject.regularReviewScore : selectedSubject.regularReviewScoreHKII;
        case "GHK":
          return selectedSubject.midtermAssessmentScore;
        case "CHK":
          return selectedSubject.finalAssessmentScore;
        default:
          return null; // No limit for unknown batchNumberCode
      }
    };

    // Process each point group separately and apply limits per group
    const groups = scoreBookTemplate.pointGroupSortOrders
      .sort((a, b) => a.sortOrder - b.sortOrder) // Sort point groups by sortOrder
      .map(({ pointGroup }) => {
        // Group points within this group by batchNumberCode
        const pointsByBatchNumber = new Map<string, ScoreBookPoint[]>();

        pointGroup.points.forEach((point) => {
          const batchCode = point.batchNumberCode;
          if (!pointsByBatchNumber.has(batchCode)) {
            pointsByBatchNumber.set(batchCode, []);
          }
          pointsByBatchNumber.get(batchCode)!.push(point);
        });

        // Apply limits per batchNumberCode within this group
        const limitedPoints: ScoreBookPoint[] = [];
        pointsByBatchNumber.forEach((points, batchCode) => {
          const limit = getScoreLimit(batchCode);
          const sortedPoints = points.sort((a, b) => a.sortOrder - b.sortOrder);

          if (limit !== null && limit > 0) {
            // Limit to the specified number for this batchNumberCode within this group
            limitedPoints.push(...sortedPoints.slice(0, limit));
          } else {
            // No limit, include all points for this batchNumberCode
            limitedPoints.push(...sortedPoints);
          }
        });

        // Sort all limited points by sortOrder to maintain order
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
          showGroupHeader: finalPoints.length > 1, // Only show group header if more than one point
        };
      })
      .filter((group) => group.points.length > 0); // Remove groups with no points after filtering

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
  })();

  // Initialize visible columns when table structure changes (all columns visible by default)
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
      .filter((group) => group.points.length > 0); // Remove groups with no visible points

    const filteredAllPoints = tableStructure.allPoints.filter((point) =>
      visibleColumns.has(`${point.groupCode}-${point.pointCode}`)
    );

    return { groups: filteredGroups, allPoints: filteredAllPoints };
  }, [tableStructure, visibleColumns]);

  // Create a map for quick lookup of score values by student
  const scoreValueMap = new Map<string, Map<string, string>>();
  scores.forEach((score) => {
    const studentScoreMap = new Map<string, string>();
    score.pointDetails.forEach((detail) => {
      studentScoreMap.set(`${detail.pointGroupCode}-${detail.pointCode}`, detail.pointValue || "");
    });
    scoreValueMap.set(score.studentId, studentScoreMap);
  });

  // Get raw score value without calculating averages (used internally)
  const getRawScoreValue = (studentId: string, groupCode: string, pointCode: string): string => {
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

  // Calculate weighted average for pointType=2 based on ALL base scores across all groups
  // Base scores use pointType=1, so we aggregate pointType=1 here
  const calculateAverageScore = (studentId: string): string => {
    if (!scoreBookTemplate || !tableStructure || tableStructure.allPoints.length === 0) {
      return "";
    }

    // Get all base points (pointType=1) from the table structure (which includes filtered/limited points)
    const basePoints = tableStructure.allPoints.filter(
      (point) => point.pointType === 1 && point.pointWeight !== undefined && point.pointWeight > 0
    );

    if (basePoints.length === 0) {
      return "";
    }

    // Get current score values (edited or original) for all base points
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
    // Round to 1 decimal place and format with 1 digit after decimal point
    return average.toFixed(1);
  };

  // Get the value for a score cell (either from edited scores or original scores)
  // For pointType=2, calculate weighted average
  const getScoreValue = (studentId: string, groupCode: string, pointCode: string, pointType?: number): string => {
    // If pointType=2, calculate average
    if (pointType === 2) {
      return calculateAverageScore(studentId);
    }

    return getRawScoreValue(studentId, groupCode, pointCode);
  };

  // Helper function to normalize numeric values for comparison
  const normalizeNumericValue = (value: string): number | null => {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const num = parseFloat(trimmed);
    return isNaN(num) ? null : num;
  };

  // Determine the change type for a score value (for highlighting)
  const getScoreChangeType = (
    studentId: string,
    groupCode: string,
    pointCode: string,
    pointType?: number
  ): "modified" | "new" | "removed" | null => {
    // pointType=2 is calculated, so no change highlighting
    if (pointType === 2) return null;
    if (!isEditMode) return null;
    const originalValue = scoreValueMap.get(studentId)?.get(`${groupCode}-${pointCode}`) || "";
    const currentValue = getScoreValue(studentId, groupCode, pointCode, pointType);

    // Compare numeric values if both are numbers
    const originalNum = normalizeNumericValue(originalValue);
    const currentNum = normalizeNumericValue(currentValue);

    if (originalNum !== null && currentNum !== null) {
      // Both are numbers, compare numerically
      if (originalNum === currentNum) return null;
      return "modified";
    }

    // If one is a number and the other isn't, or both are strings, compare as strings
    if (currentValue === originalValue) return null;

    const hadValue = originalValue.trim() !== "";
    const hasValue = currentValue.trim() !== "";

    if (!hadValue && hasValue) return "new"; // Was empty, now has value (green)
    if (hadValue && !hasValue) return "removed"; // Had value, now empty (red)
    if (hadValue && hasValue) return "modified"; // Had value, now different value (blue)

    return null;
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

  // Handle input blur to format numeric values to 1 decimal place
  const handleScoreBlur = (
    studentId: string,
    groupCode: string,
    pointCode: string,
    pointType: number,
    value: string
  ) => {
    // Only format numeric fields (not comment fields with pointType=4)
    if (pointType === 4) return;

    const trimmed = value.trim();
    if (trimmed === "") return;

    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      // Format to 1 decimal place
      const formatted = num.toFixed(1);
      handleScoreChange(studentId, groupCode, pointCode, formatted);
    }
  };

  // Handle paste event to fill multiple cells
  const handlePaste = (
    e: ClipboardEvent<HTMLInputElement>,
    startStudentId: string,
    startGroupCode: string,
    startPointCode: string
  ) => {
    if (!isEditMode) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");

    // Parse the pasted data (tab-separated, newline-separated rows)
    // Format numeric values to 1 decimal place
    const rows = pastedData
      .split(/\r?\n/)
      .map((row) =>
        row.split(/\t/).map((cell) => {
          const trimmed = cell.trim();
          if (trimmed === "") return trimmed;
          const num = parseFloat(trimmed);
          if (!isNaN(num)) {
            return num.toFixed(1);
          }
          return trimmed;
        })
      )
      .filter((row) => row.some((cell) => cell.length > 0)); // Remove empty rows

    if (rows.length === 0) return;

    // Find the starting index in the visible columns
    const startColumnIndex = filteredTableStructure.allPoints.findIndex(
      (point) => point.groupCode === startGroupCode && point.pointCode === startPointCode
    );

    if (startColumnIndex === -1) return;

    // Find the starting student index
    const startStudentIndex = students.findIndex((student) => student.id === startStudentId);
    if (startStudentIndex === -1) return;

    // Update editedScores with pasted values
    setEditedScores((prev: Map<string, Map<string, string>>) => {
      const newMap = new Map(prev);

      rows.forEach((row, rowIndex) => {
        const studentIndex = startStudentIndex + rowIndex;
        if (studentIndex >= students.length) return; // Skip if beyond student list

        const student = students[studentIndex];
        if (!newMap.has(student.id)) {
          newMap.set(student.id, new Map());
        }
        const studentMap = newMap.get(student.id)!;

        row.forEach((value, colIndex) => {
          const pointIndex = startColumnIndex + colIndex;
          if (pointIndex >= filteredTableStructure.allPoints.length) return; // Skip if beyond columns

          const point = filteredTableStructure.allPoints[pointIndex];
          studentMap.set(`${point.groupCode}-${point.pointCode}`, value);
        });
      });

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
    // TODO: Save changes temporarily in the future
    toast.info("Tính năng lưu tạm sẽ được thêm sau");
  };

  // Handle publish
  const handlePublish = async () => {
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
      // Create a map of point metadata from template for quick lookup
      const pointMetadataMap = new Map<string, ScoreBookPoint>();
      scoreBookTemplate.pointGroupSortOrders.forEach(({ pointGroup }) => {
        pointGroup.points.forEach((point) => {
          const key = `${point.pointGroupCode}-${point.pointCode}`;
          pointMetadataMap.set(key, point);
        });
      });

      // Build studentPoints array - only include students with changes
      // Iterate over students list (not scores) to maintain order
      const studentPoints = students
        .map((student) => {
          // Get current values (edited or original)
          const currentScoreMap = new Map<string, string>();

          // Start with original scores if they exist
          const scoreData = scores.find((s) => s.studentId === student.id);
          if (scoreData) {
            scoreData.pointDetails.forEach((detail) => {
              const key = `${detail.pointGroupCode}-${detail.pointCode}`;
              currentScoreMap.set(key, detail.pointValue || "");
            });
          }

          // Override with edited scores if any
          if (editedScores.has(student.id)) {
            const editedMap = editedScores.get(student.id)!;
            editedMap.forEach((value, key) => {
              currentScoreMap.set(key, value);
            });
          }

          // Build pointDetails array - only include changed points
          const pointDetails: Array<{
            periodCode: string;
            pointType: number;
            pointCode: string;
            pointDescription: string;
            pointGroupCode: string;
            pointValue: string;
            pointWeight: number;
          }> = [];

          // Check all points from template to find new/modified/deleted ones
          pointMetadataMap.forEach((pointMetadata, key) => {
            const originalValue = scoreValueMap.get(student.id)?.get(key) || "";
            const currentValue = currentScoreMap.get(key) || "";

            // Only include if there's a change
            if (originalValue !== currentValue) {
              // For deleted points, ensure pointValue is empty string
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

          // Only include this student if they have at least one changed point
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

      // If no changes, show message and return
      if (studentPoints.length === 0) {
        toast.info("Không có thay đổi nào để xuất bản");
        return;
      }

      // Build the request payload
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
        semester: 1, // TODO: Make this configurable
        studentPoints,
        batchNumberId: "00000000-0000-0000-0000-000000000000",
      };

      await publishScores(publishRequest, schoolYear.code);
      toast.success("Đã xuất bản điểm số");
      setEditedScores(new Map());
      setIsEditMode(false);

      // Refresh scores to get updated data
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
                  {/* Column visibility configuration */}
                  <Popover open={isColumnConfigOpen} onOpenChange={setIsColumnConfigOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" title="Cấu hình cột">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-4">
                        <div className="font-semibold">Hiển thị cột</div>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2 pr-4">
                            {tableStructure.groups.map((group) => (
                              <div key={group.groupCode} className="space-y-1">
                                <div className="font-medium text-sm text-muted-foreground">{group.groupName}</div>
                                {group.points.map((point) => {
                                  const columnKey = `${point.pointGroupCode}-${point.pointCode}`;
                                  const isVisible = visibleColumns.has(columnKey);
                                  return (
                                    <div
                                      key={columnKey}
                                      className="flex items-center space-x-2 hover:bg-muted/50 p-1 rounded cursor-pointer"
                                      onClick={() => {
                                        const newVisibleColumns = new Set(visibleColumns);
                                        if (isVisible) {
                                          newVisibleColumns.delete(columnKey);
                                        } else {
                                          newVisibleColumns.add(columnKey);
                                        }
                                        setVisibleColumns(newVisibleColumns);
                                      }}
                                    >
                                      <Checkbox
                                        id={columnKey}
                                        checked={isVisible}
                                        onCheckedChange={(checked: boolean) => {
                                          const newVisibleColumns = new Set(visibleColumns);
                                          if (checked) {
                                            newVisibleColumns.add(columnKey);
                                          } else {
                                            newVisibleColumns.delete(columnKey);
                                          }
                                          setVisibleColumns(newVisibleColumns);
                                        }}
                                      />
                                      <Label htmlFor={columnKey} className="text-sm cursor-pointer flex-1">
                                        {point.pointName}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const allColumnKeys = new Set(
                                tableStructure.allPoints.map((point) => `${point.groupCode}-${point.pointCode}`)
                              );
                              setVisibleColumns(allColumnKeys);
                            }}
                          >
                            Chọn tất cả
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setVisibleColumns(new Set());
                            }}
                          >
                            Bỏ chọn tất cả
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {isEditMode ? (
                    <div key="edit-mode-buttons" className="flex items-center gap-2">
                      <Button variant="secondary" onClick={handleSaveChanges}>
                        Lưu thay đổi
                      </Button>
                      <Button onClick={handlePublish}>Xuất bản</Button>
                      <Button
                        variant="outline"
                        onClick={handleDiscardChanges}
                        className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        Hủy thay đổi
                      </Button>
                    </div>
                  ) : (
                    <Button key="edit-button" variant="outline" onClick={() => setIsEditMode(true)}>
                      Chỉnh sửa
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="h-[calc(100vh-300px)]">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
                    {/* Group headers row */}
                    <TableRow>
                      <TableHead rowSpan={2} className="bg-muted/50">
                        STT
                      </TableHead>
                      <TableHead rowSpan={2} className="bg-muted/50">
                        Họ và tên
                      </TableHead>
                      {filteredTableStructure.groups.map(({ groupCode, groupName, points, showGroupHeader }) =>
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
                      {filteredTableStructure.groups.map(
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
                    {students.map((student, index) => {
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell>
                            <StudentNameWithPopover studentName={student.fullName} student={student} />
                          </TableCell>
                          {filteredTableStructure.allPoints.map(({ groupCode, pointCode, pointType }) => {
                            const value = getScoreValue(student.id, groupCode, pointCode, pointType);
                            const changeType = getScoreChangeType(student.id, groupCode, pointCode, pointType);
                            const isCommentField = pointType === 4;
                            const isAverageField = pointType === 2;
                            return (
                              <TableCell key={`${student.id}-${groupCode}-${pointCode}`} className="text-center p-1.5">
                                <Input
                                  type="text"
                                  value={value}
                                  readOnly={!isEditMode || isAverageField}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    handleScoreChange(student.id, groupCode, pointCode, e.target.value)
                                  }
                                  onBlur={(e) =>
                                    handleScoreBlur(student.id, groupCode, pointCode, pointType, e.target.value)
                                  }
                                  onPaste={(e: ClipboardEvent<HTMLInputElement>) =>
                                    handlePaste(e, student.id, groupCode, pointCode)
                                  }
                                  className={cn(
                                    "h-8",
                                    isCommentField ? "w-64 text-left" : "w-12 text-center",
                                    isAverageField && "font-bold",
                                    isEditMode && !isAverageField
                                      ? "border border-input bg-background focus:border-ring focus:ring-ring/50 focus:ring-[3px]"
                                      : "border-0 bg-transparent cursor-default shadow-none",
                                    changeType === "modified" &&
                                      "bg-blue-50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600",
                                    changeType === "new" &&
                                      "bg-green-50 dark:bg-green-950/30 border-green-400 dark:border-green-600",
                                    changeType === "removed" &&
                                      "bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-600"
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
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
