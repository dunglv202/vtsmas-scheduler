import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchCurriculum,
  fetchClasses,
  fetchTeachingSchedule,
  fetchSubjects,
  fetchLessonFeedback,
  createTeachingSchedule,
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
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import type { LessonInfo, ScheduleCell } from "./types";
import {
  DAY_ORDER,
  DEFAULT_EMPLOYEE_CODE,
  DEFAULT_EMPLOYEE_ID,
  DEFAULT_EMPLOYEE_NAME,
  DEFAULT_PHONE_NUMBER,
  DEFAULT_SCHOOL_LEVEL_CODE,
  SESSION_NAME_TO_NUMBER,
  ZERO_GUID,
  formatDateForSchedulePayload,
  formatDateISO,
  getDialogTitle,
  mapEquipmentTypeToToolType,
  mapLectureTypeToDivisiveName,
  mapLectureTypeToStatus,
  shouldShowFeedbackSection,
} from "./utils";
import { saveLectureTemplate, loadLectureTemplate, clearLectureTemplate } from "./templateStorage";

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
  isBookmarked: boolean;
  handleToggleBookmark: () => void;
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
  const { schoolYear } = useSchoolYear();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(initialData?.subjectCode || "");
  const [lectureType, setLectureType] = useState<string>(initialData?.lectureType || "Dạy chính");
  const [equipmentName, setEquipmentName] = useState<string>(initialData?.equipment?.name || "");
  const [equipmentQuantity, setEquipmentQuantity] = useState<string>(initialData?.equipment?.quantity || "");
  const [equipmentType, setEquipmentType] = useState<string>(initialData?.equipment?.type || "");
  const [extrasAccordionValue, setExtrasAccordionValue] = useState<string | undefined>(undefined);

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
  const [isBookmarked, setIsBookmarked] = useState(false);
  const hasInitializedRef = useRef(false);
  const hasInitializedSubjectRef = useRef(false);
  const previousInitialDataRef = useRef<LessonInfo | undefined>(undefined);
  const hasLoadedTemplateRef = useRef(false);

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
      if (!schoolYear) {
        setClassError("Vui lòng đợi thông tin năm học được tải...");
        setIsLoadingClasses(false);
        return;
      }

      setIsLoadingClasses(true);
      setClassError(null);
      fetchClasses({
        schoolLevelCode: DEFAULT_SCHOOL_LEVEL_CODE,
        schoolYearId: schoolYear.schoolYearId,
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
      setLectureType("Dạy chính");
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
      setIsBookmarked(false);
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
      } else if (!initialData && classes.length > 0) {
        // Auto-select first class when adding a new lecture
        setSelectedClassId(classes[0].id);
      }
      setNotes(initialData?.description || "");
      setLectureType(initialData?.lectureType || "Dạy chính");
      setEquipmentName(initialData?.equipment?.name || "");
      setEquipmentQuantity(initialData?.equipment?.quantity || "");
      setEquipmentType(initialData?.equipment?.type || "");
      // Always keep accordion collapsed by default
      setExtrasAccordionValue(undefined);
    }
  }, [isOpen, initialData, classes]);

  // Load template when dialog opens for unscheduled slot (no initialData)
  useEffect(() => {
    if (isOpen && !initialData && !hasLoadedTemplateRef.current) {
      hasLoadedTemplateRef.current = true;
      const template = loadLectureTemplate();
      if (template && template.subjectCode) {
        // Subject code is handled in the subject loading effect
        // Only set other template values here
        setLectureType(template.lectureType || "Dạy chính");
        setEquipmentName(template.equipment.name || "");
        setEquipmentQuantity(template.equipment.quantity || "");
        setEquipmentType(template.equipment.type || "");
        // Always keep accordion collapsed by default
        setExtrasAccordionValue(undefined);
      }
    } else if (!isOpen) {
      hasLoadedTemplateRef.current = false;
    }
  }, [isOpen, initialData]);

  // Update bookmark state when template values change or when initialData is loaded
  useEffect(() => {
    if (isOpen) {
      const template = loadLectureTemplate();
      if (template && template.subjectCode) {
        const matches =
          template.subjectCode === selectedSubjectCode &&
          template.lectureType === lectureType &&
          template.equipment.name === equipmentName &&
          template.equipment.quantity === equipmentQuantity &&
          template.equipment.type === equipmentType;
        setIsBookmarked(matches);
      } else {
        setIsBookmarked(false);
      }
    }
  }, [isOpen, selectedSubjectCode, lectureType, equipmentName, equipmentQuantity, equipmentType]);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingSubjects(true);
      setSubjectError(null);
      fetchSubjects(DEFAULT_SCHOOL_LEVEL_CODE)
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
            // If no initialData, try to load from template
            if (!initialSubjectCode && !initialData) {
              const template = loadLectureTemplate();
              if (template && template.subjectCode) {
                initialSubjectCode = template.subjectCode;
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

    if (!schoolYear) {
      setLessonError("Vui lòng đợi thông tin năm học được tải...");
      setIsLoadingLessons(false);
      return;
    }

    fetchCurriculum({
      subjectCode: selectedSubjectCode,
      gradeCode: selectedClass.gradeLevelCode,
      classId: selectedClassId,
      schoolYearId: schoolYear.schoolYearId,
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
  }, [isOpen, selectedClassId, selectedSubjectCode, classes, initialData, schoolYear]);

  useEffect(() => {
    if (!isOpen || !selectedClassId || !selectedSubjectCode || !schoolYear) {
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

    Promise.all([
      fetchTeachingSchedule(
        previousWeekFrom,
        previousWeekTo,
        DEFAULT_EMPLOYEE_ID,
        schoolYear.schoolYearId,
        DEFAULT_SCHOOL_LEVEL_CODE
      ),
      fetchTeachingSchedule(
        currentWeekFrom,
        currentWeekTo,
        DEFAULT_EMPLOYEE_ID,
        schoolYear.schoolYearId,
        DEFAULT_SCHOOL_LEVEL_CODE
      ),
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

            if (detail.subjectCode !== selectedSubjectCode) {
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
  }, [isOpen, selectedClassId, selectedSubjectCode, cellInfo, weekDates, schoolYear]);

  useEffect(() => {
    if (!isOpen || !selectedClassId || !selectedSubjectCode || !cellInfo || !schoolYear) {
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
      schoolYearId: schoolYear.schoolYearId,
      schoolLevelCode: selectedClass.schoolLevelCode || DEFAULT_SCHOOL_LEVEL_CODE,
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

  const shouldShowFeedback = shouldShowFeedbackSection(feedback, feedbackError);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveError(null);

    if (!cellInfo) {
      setSaveError("Không xác định được vị trí tiết dạy.");
      return;
    }

    if (!schoolYear) {
      setSaveError("Vui lòng đợi thông tin năm học được tải...");
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

    if (!teachingScheduleId && (!weekDates || weekDates.length < 7)) {
      setSaveError("Không xác định được tuần học cho lịch này.");
      return;
    }

    const equipmentInfo = isRegisterLearningTool
      ? {
          name: trimmedEquipmentName || undefined,
          quantity: trimmedEquipmentQuantity || undefined,
          type: equipmentType || undefined,
        }
      : undefined;

    const detailForSchedule = {
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
      dateStudy,
    };

    setIsSaving(true);

    try {
      let shouldCreateNewSchedule = !teachingScheduleId;
      let scheduleIdToUse = teachingScheduleId;

      // If updating an existing schedule detail, delete the old one first
      if (initialData?.scheduleDetailId && teachingScheduleId) {
        await deleteTeachingScheduleDetails(teachingScheduleId, [initialData.scheduleDetailId]);
        // After deletion, if this was the only schedule in the week,
        // the schedule becomes empty and we need to create a new one
        // We'll try to create a detail first, and if it fails, we'll create a new schedule
        // But to be safe, we'll check: if we deleted something, we should check if we need a new schedule
        // For now, we'll set a flag to indicate we might need to create a new schedule
        // The API will tell us if the schedule is invalid
        scheduleIdToUse = teachingScheduleId;
      }

      if (shouldCreateNewSchedule) {
        const dateFromISO = formatDateISO(weekDates![0]);
        const dateToISO = formatDateISO(weekDates![6]);

        await createTeachingSchedule({
          employeeName: employeeName || DEFAULT_EMPLOYEE_NAME,
          employeeId: DEFAULT_EMPLOYEE_ID,
          employeeCode: DEFAULT_EMPLOYEE_CODE,
          phoneNumber: DEFAULT_PHONE_NUMBER,
          schoolYearId: schoolYear.schoolYearId,
          schoolLevelCode: DEFAULT_SCHOOL_LEVEL_CODE,
          schoolYearCode: schoolYear.code,
          dateFrom: dateFromISO,
          dateTo: dateToISO,
          teachingScheduleDetails: [
            {
              ...detailForSchedule,
              employeeSubstituteId: null,
            },
          ],
        });
      } else if (scheduleIdToUse) {
        // Try to add detail to existing schedule
        // If this fails because schedule is empty, we'll catch and create new schedule
        try {
          const payload: CreateTeachingScheduleDetailRequest = {
            ...detailForSchedule,
            employeeSubstituteId: ZERO_GUID,
            teachingScheduleId: scheduleIdToUse,
            employeeId: DEFAULT_EMPLOYEE_ID,
            employeeName: employeeName || DEFAULT_EMPLOYEE_NAME,
            employeeSubstituteName: "",
          };

          await createTeachingScheduleDetail(payload);
        } catch (detailError) {
          // If adding detail fails (e.g., schedule is empty), create a new schedule instead
          const dateFromISO = formatDateISO(weekDates![0]);
          const dateToISO = formatDateISO(weekDates![6]);

          await createTeachingSchedule({
            employeeName: employeeName || DEFAULT_EMPLOYEE_NAME,
            employeeId: DEFAULT_EMPLOYEE_ID,
            employeeCode: DEFAULT_EMPLOYEE_CODE,
            phoneNumber: DEFAULT_PHONE_NUMBER,
            schoolYearId: schoolYear.schoolYearId,
            schoolLevelCode: DEFAULT_SCHOOL_LEVEL_CODE,
            schoolYearCode: schoolYear.code,
            dateFrom: dateFromISO,
            dateTo: dateToISO,
            teachingScheduleDetails: [
              {
                ...detailForSchedule,
                employeeSubstituteId: null,
              },
            ],
          });
        }
      }

      // When updating (deleting old and creating new), we don't have the new scheduleDetailId yet
      // It will be fetched when the parent component refreshes the schedule
      const wasUpdating = Boolean(initialData?.scheduleDetailId && teachingScheduleId);

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
        scheduleDetailId: wasUpdating ? undefined : teachingScheduleId ? initialData?.scheduleDetailId : undefined,
      });
    } catch (error) {
      console.error("Failed to save teaching schedule detail:", error);
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

  const handleToggleBookmark = () => {
    if (isBookmarked) {
      // Clear template
      clearLectureTemplate();
      setIsBookmarked(false);
    } else {
      // Save current values as template
      if (selectedSubjectCode) {
        saveLectureTemplate({
          subjectCode: selectedSubjectCode,
          lectureType: lectureType,
          equipment: {
            name: equipmentName,
            quantity: equipmentQuantity,
            type: equipmentType,
          },
        });
        setIsBookmarked(true);
      }
    }
  };

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
    isBookmarked,
    handleToggleBookmark,
  };
}
