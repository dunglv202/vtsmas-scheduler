import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  fetchCurriculum,
  fetchClasses,
  fetchTeachingSchedule,
  fetchSubjects,
  fetchLessonFeedback,
  type CurriculumItem,
  type ClassItem,
  type TeachingScheduleDetail,
  type TeachingScheduleResponse,
  type SubjectItem,
  type LessonFeedbackDetail,
} from "@/lib/api";

export interface LessonInfo {
  lesson?: string;
  class?: string;
  description?: string;
  subject?: string;
  subjectCode?: string;
  lessonPeriod?: number; // distributeProgramPeriod from API
}

export interface ScheduleCell {
  day: string;
  session: string; // Morning, Afternoon, Evening
  period: number; // 1-5, the period within a session
  lesson?: LessonInfo;
}

interface LessonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lessonInfo: LessonInfo) => void;
  initialData?: LessonInfo;
  cellInfo: ScheduleCell | null;
  weekDates?: Date[];
}

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const DAY_LABEL_MAP: Record<(typeof DAY_ORDER)[number], string> = {
  Monday: "Thứ Hai",
  Tuesday: "Thứ Ba",
  Wednesday: "Thứ Tư",
  Thursday: "Thứ Năm",
  Friday: "Thứ Sáu",
  Saturday: "Thứ Bảy",
  Sunday: "Chủ Nhật",
};

const SESSION_LABEL_MAP: Record<string, string> = {
  Morning: "Buổi sáng",
  Afternoon: "Buổi chiều",
  Evening: "Buổi tối",
};

const translateDay = (day: string): string => {
  return DAY_LABEL_MAP[day as (typeof DAY_ORDER)[number]] ?? day;
};

const translateSession = (session: string): string => {
  return SESSION_LABEL_MAP[session] ?? session;
};

export function LessonDialog({ isOpen, onClose, onSave, initialData, cellInfo, weekDates }: LessonDialogProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(initialData?.subjectCode || "");
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
  const hasInitializedRef = useRef(false);
  const hasInitializedSubjectRef = useRef(false);
  const previousInitialDataRef = useRef<LessonInfo | undefined>(undefined);

  // Helper function to normalize session number
  // API uses section field: 0 = Morning, 1 = Afternoon, 2 = Evening
  const normalizeSession = (sessionNumber: number): number => {
    // Section values: 0 = Morning, 1 = Afternoon, 2 = Evening
    // Return as is since they're already normalized
    return sessionNumber;
  };

  // Helper function to get session name (Morning/Afternoon/Evening)
  // API uses section field: 0 = Morning, 1 = Afternoon, 2 = Evening
  const getSessionName = (sessionNumber: number, dateStudy?: string): string => {
    const sessionMap: Record<number, string> = {
      0: "Morning",
      1: "Afternoon",
      2: "Evening",
    };

    // If session is in the map, return the localized label
    if (sessionMap[sessionNumber] !== undefined) {
      const sessionName = sessionMap[sessionNumber];
      return translateSession(sessionName);
    }

    // If we have dateStudy, try to determine from time
    if (dateStudy) {
      const date = new Date(dateStudy);
      const hour = date.getHours();
      if (hour < 12) {
        return translateSession("Morning");
      } else if (hour < 17) {
        return translateSession("Afternoon");
      } else {
        return translateSession("Evening");
      }
    }

    return `Buổi ${sessionNumber}`;
  };

  // Helper function to format period number for display
  const formatPeriodLabel = (num: number): string => {
    return `Tiết ${num}`;
  };

  // Helper function to format date
  const formatDate = (dateString: string): { day: string; month: string; weekday: string } => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const weekday = weekdays[date.getDay()];
    return { day, month, weekday };
  };

  // Fetch classes when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Reset initialization flag when dialog opens or initialData changes
      if (previousInitialDataRef.current !== initialData) {
        hasInitializedRef.current = false;
        hasInitializedSubjectRef.current = false;
        previousInitialDataRef.current = initialData;
      }
      setIsLoadingClasses(true);
      setClassError(null);
      // TODO: Replace with actual filter values from props or context
      // For now, using example values from the API documentation
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
      // Reset when dialog closes
      hasInitializedRef.current = false;
      hasInitializedSubjectRef.current = false;
      previousInitialDataRef.current = undefined;
      setSelectedClassId("");
      setSelectedLesson("");
      setSelectedSubjectCode("");
      setNotes("");
      setLessons([]);
      setSubjects([]);
      setSubjectError(null);
      setIsLoadingSubjects(false);
      setFeedback(null);
      setFeedbackError(null);
      setIsLoadingFeedback(false);
      setPreviousLecture(null);
      setIsLoadingPreviousLecture(false);
    }
  }, [isOpen, initialData]);

  // Initialize form with initialData when classes are loaded (only once per initialData change)
  useEffect(() => {
    if (isOpen && classes.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // Match the saved class name to find the class ID
      if (initialData?.class) {
        const matchedClass = classes.find((cls) => cls.className === initialData.class);
        if (matchedClass) {
          setSelectedClassId(matchedClass.id);
        }
      }
      // Set notes from initialData
      setNotes(initialData?.description || "");
      // Don't reset lesson here - it will be handled by the lesson-fetching useEffect
      // when the class is set, and then restored from initialData after lessons load
    }
  }, [isOpen, initialData, classes]);

  // Fetch subjects when dialog opens
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

  // Fetch lessons when class and subject are selected
  useEffect(() => {
    if (!isOpen || !selectedClassId || !selectedSubjectCode) {
      setLessons([]);
      setSelectedLesson("");
      setIsLoadingLessons(false);
      return;
    }

    const selectedClass = classes.find((cls) => cls.id === selectedClassId);
    if (!selectedClass) {
      setLessons([]);
      setSelectedLesson("");
      setIsLoadingLessons(false);
      return;
    }

    setIsLoadingLessons(true);
    setLessonError(null);
    setLessons([]);
    setSelectedLesson("");

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
            let matchedLesson = null;

            if (initialData.lessonPeriod !== undefined) {
              matchedLesson = response.items.find((lesson) => lesson.period === initialData.lessonPeriod);
            }

            if (!matchedLesson && initialData.lesson) {
              const normalize = (str: string) => str.trim().toLowerCase();
              const normalizedInitialLesson = normalize(initialData.lesson);

              matchedLesson = response.items.find((lesson) => {
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
              });
            }

            if (matchedLesson) {
              setSelectedLesson(matchedLesson.id);
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

  // Fetch previous lecture for the selected class
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

      const sessionNameToNumber: Record<string, number> = {
        Morning: 0,
        Afternoon: 1,
        Evening: 2,
      };
      cellSession = sessionNameToNumber[cellInfo.session] ?? null;
    }

    const schoolYearId = "6570c704-45a0-11ef-82f8-fa163e7dd11b";
    const employeeId = "3a1c68da-2f33-aae3-a9d2-4cd8b7aba805";

    Promise.all([
      fetchTeachingSchedule(previousWeekFrom, previousWeekTo, employeeId, schoolYearId, "03"),
      fetchTeachingSchedule(currentWeekFrom, currentWeekTo, employeeId, schoolYearId, "03"),
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
                const normalizedLectureSession = normalizeSession(detail.section);
                const normalizedCellSession = normalizeSession(cellSession);

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

              const normalizedSessionA = normalizeSession(a.section);
              const normalizedSessionB = normalizeSession(b.section);
              if (normalizedSessionB !== normalizedSessionA) {
                return normalizedSessionB - normalizedSessionA;
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

  // Fetch lecture feedback matching the selected slot
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

    const sessionNameToNumber: Record<string, number> = {
      Morning: 0,
      Afternoon: 1,
      Evening: 2,
    };
    const cellSession = sessionNameToNumber[cellInfo.session];

    const dayNameToOffset: Record<string, number> = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
      Saturday: 5,
      Sunday: 6,
    };

    const dayOffset = dayNameToOffset[cellInfo.day];
    if (dayOffset === undefined) {
      setFeedback(null);
      setIsLoadingFeedback(false);
      return;
    }

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

    const cellDate =
      weekDates && weekDates[dayOffset]
        ? new Date(weekDates[dayOffset].getFullYear(), weekDates[dayOffset].getMonth(), weekDates[dayOffset].getDate())
        : (() => {
            const fallback = new Date(baseWeek.monday);
            fallback.setDate(baseWeek.monday.getDate() + dayOffset);
            return fallback;
          })();
    cellDate.setHours(0, 0, 0, 0);

    const cellWeek = getWeekRange(cellDate);
    const dateStudy = formatDateForAPI(cellDate);
    const dateFrom = formatDateForAPI(cellWeek.monday);
    const dateTo = formatDateForAPI(cellWeek.sunday);

    if (dateFrom && dateTo) {
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
          setFeedbackError(
            error instanceof Error
              ? `Không thể tải nhận xét tiết dạy: ${error.message}`
              : "Không thể tải nhận xét tiết dạy"
          );
          setIsLoadingFeedback(false);
        });
    } else {
      setFeedback(null);
      setIsLoadingFeedback(false);
    }
  }, [isOpen, selectedClassId, selectedSubjectCode, cellInfo, classes, weekDates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Find the selected class to get its display name
    const selectedClassItem = classes.find((cls) => cls.id === selectedClassId);
    const className = selectedClassItem?.className || "";

    // Find the selected lesson to get its display name
    const selectedLessonItem = lessons.find((lesson) => lesson.id === selectedLesson);
    const lessonDisplayName = selectedLessonItem
      ? `${selectedLessonItem.period} - ${selectedLessonItem.name}`
      : selectedLesson;

    const selectedSubjectItem = subjects.find((subject) => subject.cateCode === selectedSubjectCode);
    const subjectName = selectedSubjectItem?.cateName || "";

    onSave({
      lesson: lessonDisplayName,
      class: className,
      description: notes,
      subject: subjectName,
      subjectCode: selectedSubjectCode,
    });
  };

  const getDialogTitle = () => {
    if (!cellInfo) return "Thêm tiết học";
    const dayLabel = translateDay(cellInfo.day);
    const sessionLabel = translateSession(cellInfo.session);
    return `${dayLabel} - ${sessionLabel} - Tiết ${cellInfo.period}`;
  };

  const shouldShowFeedback = Boolean(feedback) || Boolean(feedbackError);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[500px] max-h-[95vh] flex flex-col overflow-hidden outline-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>Điền thông tin tiết học cho khung giờ này.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto px-1 scrollbar-surface">
          {shouldShowFeedback && (
            <section className="rounded-md border border-border bg-card p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Nhận xét tiết dạy</h3>
                <p className="text-xs text-muted-foreground">Dữ liệu lấy từ sổ đầu bài tuần.</p>
              </div>
              {isLoadingFeedback ? (
                <div className="h-24 w-full bg-muted rounded-md" />
              ) : feedbackError ? (
                <p className="text-sm text-destructive">{feedbackError}</p>
              ) : feedback ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="font-medium text-foreground">Tiết {feedback.distributeProgramPeriod}</div>
                    <div className="text-muted-foreground text-xs">{feedback.distributeProgramName}</div>
                  </div>
                  {feedback.teachingComment && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Nhận xét của giáo viên
                      </div>
                      <div className="text-sm text-foreground">{feedback.teachingComment}</div>
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Class Selection - Radio buttons styled as rectangular buttons */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Lớp</label>
              {isLoadingClasses ? (
                <div className="h-24 w-full bg-muted rounded-md" />
              ) : classError ? (
                <div className="text-sm text-destructive">{classError}</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {classes.map((classItem) => (
                    <button
                      key={classItem.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedClassId(classItem.id);
                      }}
                      className={`
                        flex-1 min-w-[100px] px-4 py-2 border-2 rounded-md cursor-pointer text-center text-sm
                        transition-all duration-200
                        ${
                          selectedClassId === classItem.id
                            ? "bg-primary text-primary-foreground border-primary font-semibold"
                            : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
                        }
                      `}
                    >
                      {classItem.className}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subject Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Môn học</label>
              {isLoadingSubjects ? (
                <div className="h-24 w-full bg-muted rounded-md" />
              ) : subjectError ? (
                <div className="text-sm text-destructive">{subjectError}</div>
              ) : (
                <select
                  id="subject"
                  value={selectedSubjectCode}
                  onChange={(e) => setSelectedSubjectCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                >
                  <option value="">Chọn môn học</option>
                  {subjects.map((subject) => (
                    <option key={subject.cateCode} value={subject.cateCode}>
                      {subject.cateName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Lesson Selection - Dropdown */}
            <div className="space-y-2">
              <label htmlFor="lesson" className="text-sm font-medium">
                Tiết học
              </label>
              <select
                id="lesson"
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background disabled:bg-muted disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedClassId
                    ? "Chọn lớp trước"
                    : !selectedSubjectCode
                    ? "Chọn môn học trước"
                    : isLoadingLessons
                    ? "Đang tải tiết học..."
                    : lessons.length > 0
                    ? "Chọn tiết học"
                    : "Không có tiết học"}
                </option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.period} - {lesson.name}
                  </option>
                ))}
              </select>
              {lessonError && <p className="text-sm text-destructive">{lessonError}</p>}
            </div>

            {/* Previous Lecture Section */}
            {selectedClassId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Tiết dạy trước</label>
                {isLoadingPreviousLecture ? (
                  <div className="h-23 w-full bg-muted rounded-md" />
                ) : previousLecture ? (
                  <div className="flex gap-3 p-2.5 border border-border rounded-md bg-muted h-23 items-center">
                    {/* Left: Calendar-style date */}
                    {(() => {
                      const { day, month, weekday } = formatDate(previousLecture.dateStudy);
                      return (
                        <div className="shrink-0 w-18 h-18 bg-background border-2 border-border rounded-md flex flex-col items-center justify-center shadow-sm gap-0.5">
                          <div className="text-xs font-semibold text-muted-foreground uppercase leading-tight">
                            {weekday}
                          </div>
                          <div className="text-xl font-bold text-foreground leading-none">{day}</div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase leading-tight">
                            {month}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Right: Details */}
                    <div className="flex-1 flex flex-col justify-center space-y-1">
                      <div className="text-sm font-semibold text-foreground">
                        {previousLecture.className} -{" "}
                        {getSessionName(previousLecture.section, previousLecture.dateStudy)} - Tiết{" "}
                        {previousLecture.period}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatPeriodLabel(previousLecture.distributeProgramPeriod)} -{" "}
                        {previousLecture.distributeProgramName}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-3 border border-border rounded-md bg-muted h-24 flex items-center">
                    Không tìm thấy tiết dạy trước
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Ghi chú
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background min-h-[100px]"
                placeholder="Ghi chú thêm (không bắt buộc)"
                spellCheck={false}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit">Lưu</Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
