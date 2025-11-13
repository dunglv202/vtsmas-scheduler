import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchCurriculum,
  fetchClasses,
  fetchTeachingSchedule,
  fetchSubjects,
  fetchLessonFeedback,
  createTeachingScheduleDetail,
  deleteTeachingScheduleDetails,
  type CreateTeachingScheduleDetailRequest,
  type CurriculumItem,
  type ClassItem,
  type TeachingScheduleDetail,
  type TeachingScheduleResponse,
  type SubjectItem,
  type LessonFeedbackDetail,
} from "@/lib/api";
import type { LessonInfo, ScheduleCell } from "./types";
import {
  DAY_ORDER,
  DEFAULT_EMPLOYEE_ID,
  SESSION_NAME_TO_NUMBER,
  ZERO_GUID,
  formatDateForSchedulePayload,
  getDialogTitle,
  mapEquipmentTypeToToolType,
  mapLectureTypeToDivisiveName,
  mapLectureTypeToStatus,
  shouldShowFeedbackSection,
} from "./utils";

interface UseLessonDialogParams {
  isOpen: boolean;
  initialData?: LessonInfo;
  cellInfo: ScheduleCell | null;
  weekDates?: Date[];
  teachingScheduleId?: string | null;
  employeeName?: string | null;
  onSave: (lessonInfo: LessonInfo) => void;
}

interface ClassState {
  classes: ClassItem[];
  selectedClassId: string;
  isLoading: boolean;
  error: string | null;
  onSelect: (classId: string) => void;
}

interface SubjectState {
  subjects: SubjectItem[];
  selectedSubjectCode: string;
  isLoading: boolean;
  error: string | null;
  onChange: (value: string) => void;
}

interface LessonState {
  lessons: CurriculumItem[];
  selectedLessonId: string;
  isLoading: boolean;
  error: string | null;
  onChange: (value: string) => void;
}

interface PreviousLectureState {
  previousLecture: TeachingScheduleDetail | null;
  isLoading: boolean;
}

interface FeedbackState {
  feedback: LessonFeedbackDetail | null;
  feedbackError: string | null;
  isLoading: boolean;
}

interface ExtrasState {
  lectureType: string;
  setLectureType: (value: string) => void;
  equipmentName: string;
  setEquipmentName: (value: string) => void;
  equipmentQuantity: string;
  setEquipmentQuantity: (value: string) => void;
  equipmentType: string;
  setEquipmentType: (value: string) => void;
  extrasAccordionValue?: string;
  setExtrasAccordionValue: (value: string | undefined) => void;
}

export interface LessonDialogHookResult {
  dialogTitle: string;
  classState: ClassState;
  subjectState: SubjectState;
  lessonState: LessonState;
  previousLectureState: PreviousLectureState;
  feedbackState: FeedbackState;
  extrasState: ExtrasState;
  notes: string;
  setNotes: (value: string) => void;
  shouldShowFeedback: boolean;
  saveError: string | null;
  isSaving: boolean;
  handleSubmit: (event: React.FormEvent) => Promise<void>;
  isUnscheduling: boolean;
  unscheduleError: string | null;
  handleUnschedule: () => Promise<void>;
  canUnschedule: boolean;
}

export function useLessonDialog({
  isOpen,
  initialData,
  cellInfo,
  weekDates,
  teachingScheduleId,
  employeeName,
  onSave,
}: UseLessonDialogParams): LessonDialogHookResult {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(initialData?.subjectCode || "");
  const [lectureType, setLectureType] = useState<string>(initialData?.lectureType || "");
  const [equipmentName, setEquipmentName] = useState<string>(initialData?.equipment?.name || "");
  const [equipmentQuantity, setEquipmentQuantity] = useState<string>(initialData?.equipment?.quantity || "");
  const [equipmentType, setEquipmentType] = useState<string>(initialData?.equipment?.type || "");
  const hasInitialExtras =
    Boolean(initialData?.lectureType) ||
    Boolean(initialData?.equipment?.name) ||
    Boolean(initialData?.equipment?.quantity) ||
    Boolean(initialData?.equipment?.type);
  const [extrasAccordionValue, setExtrasAccordionValue] = useState<string | undefined>(
    hasInitialExtras ? "extras" : undefined
  );

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [lessons, setLessons] = useState<CurriculumItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingPreviousLecture, setIsLoadingPreviousLecture] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [previousLecture, setPreviousLecture] = useState<TeachingScheduleDetail | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedbackDetail | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUnscheduling, setIsUnscheduling] = useState(false);
  const [unscheduleError, setUnscheduleError] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);
  const hasInitializedSubjectRef = useRef(false);
  const previousInitialDataRef = useRef<LessonInfo | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setSaveError(null);
      setIsSaving(false);
      setUnscheduleError(null);
      setIsUnscheduling(false);
      if (previousInitialDataRef.current !== initialData) {
        hasInitializedRef.current = false;
        hasInitializedSubjectRef.current = false;
        previousInitialDataRef.current = initialData;
      }
      setIsLoadingClasses(true);
      setClassError(null);
      fetchClasses({
        schoolLevelCode: "03",
        schoolYearId: "6570c704-45a0-11ef-82f8-fa163e7dd11b",
      })
        .then((response) => {
          setClasses(response.items);
          setIsLoadingClasses(false);
        })
        .catch((error) => {
          setClassError(
            error instanceof Error
              ? `Không thể tải danh sách lớp học: ${error.message}`
              : "Không thể tải danh sách lớp học"
          );
          setIsLoadingClasses(false);
        });
    } else {
      hasInitializedRef.current = false;
      hasInitializedSubjectRef.current = false;
      previousInitialDataRef.current = undefined;
      setSelectedClassId("");
      setSelectedLessonId("");
      setSelectedSubjectCode("");
      setNotes("");
      setLectureType("");
      setEquipmentName("");
      setEquipmentQuantity("");
      setEquipmentType("");
      setExtrasAccordionValue(undefined);
      setLessons([]);
      setSubjects([]);
      setSubjectError(null);
      setIsLoadingSubjects(false);
      setFeedback(null);
      setFeedbackError(null);
      setIsLoadingFeedback(false);
      setPreviousLecture(null);
      setIsLoadingPreviousLecture(false);
      setSaveError(null);
      setIsSaving(false);
      setUnscheduleError(null);
      setIsUnscheduling(false);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (isOpen && classes.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (initialData?.classId) {
        const matchedClass = classes.find((cls) => cls.id === initialData.classId);
        if (matchedClass) {
          setSelectedClassId(matchedClass.id);
        }
      } else if (initialData?.class) {
        const matchedClass = classes.find((cls) => cls.className === initialData.class);
        if (matchedClass) {
          setSelectedClassId(matchedClass.id);
        }
      }
      setNotes(initialData?.description || "");
      setLectureType(initialData?.lectureType || "");
      setEquipmentName(initialData?.equipment?.name || "");
      setEquipmentQuantity(initialData?.equipment?.quantity || "");
      setEquipmentType(initialData?.equipment?.type || "");
      setExtrasAccordionValue(
        initialData?.lectureType ||
          initialData?.equipment?.name ||
          initialData?.equipment?.quantity ||
          initialData?.equipment?.type
          ? "extras"
          : undefined
      );
    }
  }, [isOpen, initialData, classes]);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingSubjects(true);
      setSubjectError(null);
      fetchSubjects("03")
        .then((items) => {
          setSubjects(items);
          if (!hasInitializedSubjectRef.current) {
            let initialSubjectCode = initialData?.subjectCode || "";
            if (!initialSubjectCode && initialData?.subject) {
              const matchedSubject = items.find(
                (subject) => subject.cateName === initialData.subject || subject.acronymName === initialData.subject
              );
              if (matchedSubject) {
                initialSubjectCode = matchedSubject.cateCode;
              }
            }
            setSelectedSubjectCode(initialSubjectCode);
            hasInitializedSubjectRef.current = true;
          }
          setIsLoadingSubjects(false);
        })
        .catch((error) => {
          setSubjectError(
            error instanceof Error
              ? `Không thể tải danh sách môn học: ${error.message}`
              : "Không thể tải danh sách môn học"
          );
          setIsLoadingSubjects(false);
        });
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen || !selectedClassId || !selectedSubjectCode) {
      setLessons([]);
      setSelectedLessonId("");
      setIsLoadingLessons(false);
      return;
    }

    const selectedClass = classes.find((cls) => cls.id === selectedClassId);
    if (!selectedClass) {
      setLessons([]);
      setSelectedLessonId("");
      setIsLoadingLessons(false);
      return;
    }

    setIsLoadingLessons(true);
    setLessonError(null);
    setLessons([]);
    setSelectedLessonId("");

    const schoolYearId = "6570c704-45a0-11ef-82f8-fa163e7dd11b";
    fetchCurriculum({
      subjectCode: selectedSubjectCode,
      gradeCode: selectedClass.gradeLevelCode,
      classId: selectedClassId,
      schoolYearId,
    })
      .then((response) => {
        setLessons(response.items);
        setIsLoadingLessons(false);

        if (initialData?.class) {
          const matchedClass = classes.find((cls) => cls.id === selectedClassId);
          if (matchedClass && matchedClass.className === initialData.class) {
            let matchedLesson: CurriculumItem | null = null;

            if (initialData.lessonId) {
              matchedLesson = response.items.find((lesson) => lesson.id === initialData.lessonId) || null;
            }

            if (!matchedLesson && initialData.lessonPeriod !== undefined) {
              matchedLesson = response.items.find((lesson) => lesson.period === initialData.lessonPeriod) || null;
            }

            if (!matchedLesson && initialData.lesson) {
              const normalize = (str: string) => str.trim().toLowerCase();
              const normalizedInitialLesson = normalize(initialData.lesson);

              matchedLesson =
                response.items.find((lesson) => {
                  const normalizedLessonName = normalize(lesson.name);
                  const displayName = `${lesson.period} - ${lesson.name}`;
                  if (normalize(displayName) === normalizedInitialLesson) {
                    return true;
                  }
                  if (normalizedLessonName === normalizedInitialLesson) {
                    return true;
                  }
                  if (
                    normalizedLessonName &&
                    (normalizedInitialLesson.includes(normalizedLessonName) ||
                      normalizedLessonName.includes(normalizedInitialLesson))
                  ) {
                    return true;
                  }
                  return false;
                }) || null;
            }

            if (matchedLesson) {
              setSelectedLessonId(matchedLesson.id);
            }
          }
        }
      })
      .catch((error) => {
        setLessonError(
          error instanceof Error
            ? `Không thể tải danh sách tiết học: ${error.message}`
            : "Không thể tải danh sách tiết học"
        );
        setIsLoadingLessons(false);
      });
  }, [isOpen, selectedClassId, selectedSubjectCode, classes, initialData]);

  useEffect(() => {
    if (!isOpen || !selectedClassId) {
      setPreviousLecture(null);
      setIsLoadingPreviousLecture(false);
      return;
    }

    const getWeekRange = (date: Date) => {
      const d = new Date(date);
      const dayOfWeek = d.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setDate(d.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { monday, sunday };
    };

    const formatDateForAPI = (date: Date): string => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const baseWeek =
      weekDates && weekDates.length >= 7
        ? {
            monday: new Date(weekDates[0].getFullYear(), weekDates[0].getMonth(), weekDates[0].getDate(), 0, 0, 0, 0),
            sunday: new Date(
              weekDates[6].getFullYear(),
              weekDates[6].getMonth(),
              weekDates[6].getDate(),
              23,
              59,
              59,
              999
            ),
          }
        : getWeekRange(new Date());

    setIsLoadingPreviousLecture(true);

    const previousWeekStart = new Date(baseWeek.monday);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    previousWeekStart.setHours(0, 0, 0, 0);
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekStart.getDate() + 6);
    previousWeekEnd.setHours(23, 59, 59, 999);

    const previousWeekFrom = formatDateForAPI(previousWeekStart);
    const previousWeekTo = formatDateForAPI(previousWeekEnd);
    const currentWeekFrom = formatDateForAPI(baseWeek.monday);
    const currentWeekTo = formatDateForAPI(baseWeek.sunday);

    let cellDate: Date | null = null;
    let cellSession: number | null = null;
    if (cellInfo) {
      const cellDayIndex = DAY_ORDER.indexOf(cellInfo.day as (typeof DAY_ORDER)[number]);
      if (cellDayIndex >= 0) {
        if (weekDates && weekDates[cellDayIndex]) {
          const source = weekDates[cellDayIndex];
          cellDate = new Date(source.getFullYear(), source.getMonth(), source.getDate(), 23, 59, 59, 999);
        } else {
          const fallback = new Date(baseWeek.monday);
          fallback.setDate(baseWeek.monday.getDate() + cellDayIndex);
          fallback.setHours(23, 59, 59, 999);
          cellDate = fallback;
        }
      }

      cellSession = SESSION_NAME_TO_NUMBER[cellInfo.session] ?? null;
    }

    const schoolYearId = "6570c704-45a0-11ef-82f8-fa163e7dd11b";
    Promise.all([
      fetchTeachingSchedule(previousWeekFrom, previousWeekTo, DEFAULT_EMPLOYEE_ID, schoolYearId, "03"),
      fetchTeachingSchedule(currentWeekFrom, currentWeekTo, DEFAULT_EMPLOYEE_ID, schoolYearId, "03"),
    ])
      .then(
        ([previousWeekResponse, currentWeekResponse]: [
          TeachingScheduleResponse | null,
          TeachingScheduleResponse | null
        ]) => {
          const allLectures = [
            ...(previousWeekResponse?.teachingScheduleDetailDtos || []),
            ...(currentWeekResponse?.teachingScheduleDetailDtos || []),
          ];

          const classLectures = allLectures.filter((detail) => {
            if (detail.classId !== selectedClassId) {
              return false;
            }

            if (cellDate) {
              const lectureDate = new Date(detail.dateStudy);
              const lectureDateOnly = new Date(
                lectureDate.getFullYear(),
                lectureDate.getMonth(),
                lectureDate.getDate()
              );
              const cellDateOnly = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());

              if (lectureDateOnly > cellDateOnly) {
                return false;
              }

              if (lectureDateOnly.getTime() === cellDateOnly.getTime() && cellSession !== null && cellInfo) {
                const normalizedLectureSession = detail.section;
                const normalizedCellSession = cellSession;

                if (normalizedLectureSession > normalizedCellSession) {
                  return false;
                }

                if (normalizedLectureSession === normalizedCellSession) {
                  const lecturePeriod = detail.period || 0;
                  const cellPeriod = cellInfo.period || 0;

                  if (lecturePeriod > cellPeriod) {
                    return false;
                  }

                  if (lecturePeriod === cellPeriod) {
                    return false;
                  }
                }
              }
            }

            return true;
          });

          if (classLectures.length > 0) {
            const sortedLectures = classLectures.sort((a, b) => {
              const dateA = new Date(a.dateStudy).getTime();
              const dateB = new Date(b.dateStudy).getTime();

              if (dateB !== dateA) {
                return dateB - dateA;
              }

              if (b.section !== a.section) {
                return b.section - a.section;
              }

              return (b.period || 0) - (a.period || 0);
            });

            setPreviousLecture(sortedLectures[0]);
          } else {
            setPreviousLecture(null);
          }
          setIsLoadingPreviousLecture(false);
        }
      )
      .catch((error: unknown) => {
        console.error("Failed to fetch previous lecture:", error);
        setPreviousLecture(null);
        setIsLoadingPreviousLecture(false);
      });
  }, [isOpen, selectedClassId, cellInfo, weekDates]);

  useEffect(() => {
    if (!isOpen || !selectedClassId || !selectedSubjectCode || !cellInfo) {
      setFeedback(null);
      setFeedbackError(null);
      setIsLoadingFeedback(false);
      return;
    }

    const selectedClass = classes.find((cls) => cls.id === selectedClassId);
    if (!selectedClass) {
      setFeedback(null);
      setFeedbackError(null);
      setIsLoadingFeedback(false);
      return;
    }

    setIsLoadingFeedback(true);
    setFeedbackError(null);
    setFeedback(null);

    const getWeekRange = (date: Date) => {
      const d = new Date(date);
      const dayOfWeek = d.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setDate(d.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { monday, sunday };
    };

    const formatDateForAPI = (date: Date): string => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const dayNameToOffset: Record<string, number> = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
      Saturday: 5,
      Sunday: 6,
    };

    const dayIndex = dayNameToOffset[cellInfo.day];
    if (dayIndex === undefined) {
      setFeedback(null);
      setIsLoadingFeedback(false);
      return;
    }

    if (!weekDates || !weekDates[dayIndex]) {
      setFeedback(null);
      setFeedbackError(null);
      setIsLoadingFeedback(false);
      return;
    }

    const cellDate = new Date(
      weekDates[dayIndex].getFullYear(),
      weekDates[dayIndex].getMonth(),
      weekDates[dayIndex].getDate()
    );
    cellDate.setHours(0, 0, 0, 0);

    const cellWeek = getWeekRange(cellDate);
    const dateStudy = formatDateForAPI(cellDate);
    const dateFrom = formatDateForAPI(cellWeek.monday);
    const dateTo = formatDateForAPI(cellWeek.sunday);

    const cellSession = SESSION_NAME_TO_NUMBER[cellInfo.session];

    fetchLessonFeedback({
      schoolYearId: "6570c704-45a0-11ef-82f8-fa163e7dd11b",
      schoolLevelCode: selectedClass.schoolLevelCode || "03",
      classId: selectedClassId,
      dateFrom,
      dateTo,
      dateStudy,
    })
      .then((response) => {
        if (!response) {
          setFeedback(null);
          setIsLoadingFeedback(false);
          return;
        }

        const matchedDetail = response.lessonAssessmentBookDetails.find((detail) => {
          const detailDate = new Date(detail.dateStudy);
          const detailDateISO = formatDateForAPI(detailDate);
          return (
            detail.subjectCode === selectedSubjectCode &&
            detail.section === cellSession &&
            detail.period === cellInfo.period &&
            detailDateISO === dateStudy
          );
        });

        setFeedback(matchedDetail ?? null);
        setIsLoadingFeedback(false);
      })
      .catch((error) => {
        console.error("Failed to fetch lecture feedback:", error);
        setFeedback(null);
        setFeedbackError(error instanceof Error ? error.message : "Không thể tải nhận xét tiết dạy");
        setIsLoadingFeedback(false);
      });
  }, [isOpen, selectedClassId, selectedSubjectCode, cellInfo, classes, weekDates]);

  const dialogTitle = useMemo(() => getDialogTitle(cellInfo), [cellInfo]);

  const classState: ClassState = useMemo(
    () => ({
      classes,
      selectedClassId,
      isLoading: isLoadingClasses,
      error: classError,
      onSelect: (classId: string) => {
        setSelectedClassId(classId);
      },
    }),
    [classes, selectedClassId, isLoadingClasses, classError]
  );

  const subjectState: SubjectState = useMemo(
    () => ({
      subjects,
      selectedSubjectCode,
      isLoading: isLoadingSubjects,
      error: subjectError,
      onChange: (value: string) => setSelectedSubjectCode(value),
    }),
    [subjects, selectedSubjectCode, isLoadingSubjects, subjectError]
  );

  const lessonState: LessonState = useMemo(
    () => ({
      lessons,
      selectedLessonId,
      isLoading: isLoadingLessons,
      error: lessonError,
      onChange: (value: string) => setSelectedLessonId(value),
    }),
    [lessons, selectedLessonId, isLoadingLessons, lessonError]
  );

  const previousLectureState: PreviousLectureState = useMemo(
    () => ({
      previousLecture,
      isLoading: isLoadingPreviousLecture,
    }),
    [previousLecture, isLoadingPreviousLecture]
  );

  const feedbackState: FeedbackState = useMemo(
    () => ({
      feedback,
      feedbackError,
      isLoading: isLoadingFeedback,
    }),
    [feedback, feedbackError, isLoadingFeedback]
  );

  const extrasState: ExtrasState = useMemo(
    () => ({
      lectureType,
      setLectureType,
      equipmentName,
      setEquipmentName,
      equipmentQuantity,
      setEquipmentQuantity,
      equipmentType,
      setEquipmentType,
      extrasAccordionValue,
      setExtrasAccordionValue,
    }),
    [
      lectureType,
      equipmentName,
      equipmentQuantity,
      equipmentType,
      extrasAccordionValue,
      setLectureType,
      setEquipmentName,
      setEquipmentQuantity,
      setEquipmentType,
      setExtrasAccordionValue,
    ]
  );

  const shouldShowFeedback = shouldShowFeedbackSection(feedback, feedbackError, isLoadingFeedback);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveError(null);

    if (!cellInfo) {
      setSaveError("Không xác định được vị trí tiết dạy.");
      return;
    }

    const selectedClassItem = classes.find((cls) => cls.id === selectedClassId);
    if (!selectedClassItem) {
      setSaveError("Vui lòng chọn lớp học.");
      return;
    }

    const selectedLessonItem = lessons.find((lesson) => lesson.id === selectedLessonId);
    if (!selectedLessonItem) {
      setSaveError("Vui lòng chọn tiết học.");
      return;
    }
    const lessonDisplayName = `${selectedLessonItem.period} - ${selectedLessonItem.name}`;

    const selectedSubjectItem = subjects.find((subject) => subject.cateCode === selectedSubjectCode);
    if (!selectedSubjectItem) {
      setSaveError("Vui lòng chọn môn học.");
      return;
    }

    const dayIndex = DAY_ORDER.indexOf(cellInfo.day as (typeof DAY_ORDER)[number]);
    if (dayIndex < 0) {
      setSaveError("Không xác định được ngày học.");
      return;
    }

    if (!weekDates || !weekDates[dayIndex]) {
      setSaveError("Không xác định được ngày học cho tiết này.");
      return;
    }

    const selectedDate = weekDates[dayIndex];
    const targetDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    targetDate.setHours(0, 0, 0, 0);

    const dateStudy = formatDateForSchedulePayload(targetDate);
    const dayOfWeek = dayIndex + 1;
    const section = SESSION_NAME_TO_NUMBER[cellInfo.session] ?? 0;
    const trimmedNotes = notes.trim();
    const trimmedEquipmentName = equipmentName.trim();
    const trimmedEquipmentQuantity = equipmentQuantity.trim();
    const isRegisterLearningTool = Boolean(trimmedEquipmentName || trimmedEquipmentQuantity || equipmentType);
    const toolTypeValue = mapEquipmentTypeToToolType(equipmentType);

    if (isRegisterLearningTool && toolTypeValue === null) {
      setSaveError("Vui lòng chọn loại thiết bị.");
      return;
    }

    const payload: CreateTeachingScheduleDetailRequest = {
      dayOfWeek,
      section,
      period: cellInfo.period,
      classId: selectedClassItem.id,
      className: selectedClassItem.className,
      gradeCode: selectedClassItem.gradeLevelCode,
      gradeName: selectedClassItem.gradeLevel,
      subjectCode: selectedSubjectItem.cateCode,
      subjectName: selectedSubjectItem.cateName,
      description: trimmedNotes || null,
      divisiveConfigurationId: null,
      divisiveConfigurationName: mapLectureTypeToDivisiveName(lectureType),
      distributeProgramId: selectedLessonItem.id || ZERO_GUID,
      distributeProgramPeriod: String(selectedLessonItem.period ?? ""),
      distributeProgramName: selectedLessonItem.name,
      isRegisterLearningTool,
      toolName: isRegisterLearningTool ? trimmedEquipmentName || null : null,
      totalTool: isRegisterLearningTool ? trimmedEquipmentQuantity || null : null,
      toolType: isRegisterLearningTool ? toolTypeValue : null,
      status: mapLectureTypeToStatus(lectureType),
      employeeSubstituteId: ZERO_GUID,
      teachingScheduleId: teachingScheduleId || ZERO_GUID,
      dateStudy,
      employeeId: DEFAULT_EMPLOYEE_ID,
      employeeName: employeeName || "",
      employeeSubstituteName: "",
    };

    setIsSaving(true);

    try {
      await createTeachingScheduleDetail(payload);

      const equipmentInfo = isRegisterLearningTool
        ? {
            name: trimmedEquipmentName || undefined,
            quantity: trimmedEquipmentQuantity || undefined,
            type: equipmentType || undefined,
          }
        : undefined;

      onSave({
        lesson: lessonDisplayName,
        lessonId: selectedLessonItem.id,
        class: selectedClassItem.className,
        classId: selectedClassItem.id,
        description: trimmedNotes,
        subject: selectedSubjectItem.cateName,
        subjectCode: selectedSubjectItem.cateCode,
        lessonPeriod: selectedLessonItem.period,
        gradeCode: selectedClassItem.gradeLevelCode,
        gradeName: selectedClassItem.gradeLevel,
        lectureType: lectureType || undefined,
        equipment: equipmentInfo,
      });
    } catch (error) {
      console.error("Failed to create teaching schedule detail:", error);
      setSaveError(error instanceof Error ? error.message : "Không thể lưu tiết dạy. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnschedule = async () => {
    if (!initialData?.scheduleDetailId || !teachingScheduleId) {
      setUnscheduleError("Không thể xóa tiết dạy. Thiếu thông tin cần thiết.");
      return;
    }

    setIsUnscheduling(true);
    setUnscheduleError(null);

    try {
      await deleteTeachingScheduleDetails(teachingScheduleId, [initialData.scheduleDetailId]);
      // After successful deletion, call onSave with empty/cleared data to update the UI
      onSave({
        lesson: undefined,
        class: undefined,
        description: undefined,
        subject: undefined,
        subjectCode: undefined,
        lessonPeriod: undefined,
        scheduleDetailId: undefined,
      });
    } catch (error) {
      console.error("Failed to unschedule lecture:", error);
      setUnscheduleError(error instanceof Error ? error.message : "Không thể xóa tiết dạy. Vui lòng thử lại.");
    } finally {
      setIsUnscheduling(false);
    }
  };

  const canUnschedule = Boolean(initialData?.scheduleDetailId && teachingScheduleId);

  return {
    dialogTitle,
    classState,
    subjectState,
    lessonState,
    previousLectureState,
    feedbackState,
    extrasState,
    notes,
    setNotes,
    shouldShowFeedback,
    saveError,
    isSaving,
    handleSubmit,
    isUnscheduling,
    unscheduleError,
    handleUnschedule,
    canUnschedule,
  };
}
