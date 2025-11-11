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
  type CurriculumItem,
  type ClassItem,
  type TeachingScheduleDetail,
  type TeachingScheduleResponse,
} from "@/lib/api";

export interface LessonInfo {
  lesson?: string;
  class?: string;
  notes?: string;
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
}

export function LessonDialog({ isOpen, onClose, onSave, initialData, cellInfo }: LessonDialogProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState(initialData?.lesson || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [lessons, setLessons] = useState<CurriculumItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [isLoadingPreviousLecture, setIsLoadingPreviousLecture] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [previousLecture, setPreviousLecture] = useState<TeachingScheduleDetail | null>(null);
  const hasInitializedRef = useRef(false);

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

    // If session is in the map, return it
    if (sessionMap[sessionNumber] !== undefined) {
      return sessionMap[sessionNumber];
    }

    // If we have dateStudy, try to determine from time
    if (dateStudy) {
      const date = new Date(dateStudy);
      const hour = date.getHours();
      if (hour < 12) {
        return "Morning";
      } else if (hour < 17) {
        return "Afternoon";
      } else {
        return "Evening";
      }
    }

    return `Session ${sessionNumber}`;
  };

  // Helper function to format period number as ordinal (1st, 2nd, 3rd, etc.)
  const formatPeriodNumber = (num: number): string => {
    const suffix = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
  };

  // Helper function to format date
  const formatDate = (dateString: string): { day: string; month: string } => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    return { day, month };
  };

  // Fetch classes when dialog opens
  useEffect(() => {
    if (isOpen) {
      hasInitializedRef.current = false;
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
          setClassError(error instanceof Error ? error.message : "Failed to load classes");
          setIsLoadingClasses(false);
        });
    } else {
      // Reset when dialog closes
      hasInitializedRef.current = false;
      setSelectedClassId("");
      setSelectedLesson("");
      setNotes("");
      setLessons([]);
    }
  }, [isOpen]);

  // Initialize form with initialData when classes are loaded (only once)
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
      setNotes(initialData?.notes || "");
    }
  }, [isOpen, initialData, classes]);

  // Fetch lessons when a class is selected
  useEffect(() => {
    if (isOpen && selectedClassId && classes.length > 0) {
      setIsLoadingLessons(true);
      setLessonError(null);
      setLessons([]);
      setSelectedLesson(""); // Reset lesson selection when class changes

      // Find the selected class to get gradeCode
      const selectedClass = classes.find((cls) => cls.id === selectedClassId);
      if (!selectedClass) {
        setIsLoadingLessons(false);
        return;
      }

      // TODO: Replace with actual filter values from props or context
      // For now, using example values from the API documentation
      const schoolYearId = "6570c704-45a0-11ef-82f8-fa163e7dd11b";
      fetchCurriculum({
        subjectCode: "22",
        gradeCode: selectedClass.gradeLevelCode,
        classId: selectedClassId,
        schoolYearId,
      })
        .then((response) => {
          setLessons(response.items);
          setIsLoadingLessons(false);

          // After lessons are loaded, match the saved lesson if initialData exists
          if (initialData?.lesson) {
            const matchedLesson = response.items.find((lesson) => {
              const displayName = `${lesson.period} - ${lesson.name}`;
              return displayName === initialData.lesson;
            });
            if (matchedLesson) {
              setSelectedLesson(matchedLesson.id);
            }
          }
        })
        .catch((error) => {
          setLessonError(error instanceof Error ? error.message : "Failed to load lessons");
          setIsLoadingLessons(false);
        });

      // Fetch previous lecture for the selected class
      setIsLoadingPreviousLecture(true);
      // Calculate date range: 2 weeks (previous week Monday to current week Sunday)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Calculate Monday of current week
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const currentWeekMonday = new Date(today);
      currentWeekMonday.setDate(today.getDate() + mondayOffset);

      // Calculate Sunday of current week (6 days after Monday)
      const currentWeekSunday = new Date(currentWeekMonday);
      currentWeekSunday.setDate(currentWeekMonday.getDate() + 6);

      // Calculate Monday of previous week (7 days before current week Monday)
      const previousWeekMonday = new Date(currentWeekMonday);
      previousWeekMonday.setDate(currentWeekMonday.getDate() - 7);

      // Calculate Sunday of previous week (6 days after previous week Monday)
      const previousWeekSunday = new Date(previousWeekMonday);
      previousWeekSunday.setDate(previousWeekMonday.getDate() + 6);

      const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      // Prepare date ranges for both weeks
      const previousWeekFrom = formatDateForAPI(previousWeekMonday);
      const previousWeekTo = formatDateForAPI(previousWeekSunday);
      const currentWeekFrom = formatDateForAPI(currentWeekMonday);
      const currentWeekTo = formatDateForAPI(currentWeekSunday);

      // Calculate the date and session of the scheduling cell
      let cellDate: Date | null = null;
      let cellSession: number | null = null;
      if (cellInfo) {
        // Map day names to their index in the week (Monday = 0, Tuesday = 1, ..., Sunday = 6)
        const dayNameToIndex: Record<string, number> = {
          Monday: 0,
          Tuesday: 1,
          Wednesday: 2,
          Thursday: 3,
          Friday: 4,
          Saturday: 5,
          Sunday: 6,
        };
        const cellDayIndex = dayNameToIndex[cellInfo.day];
        if (cellDayIndex !== undefined) {
          // Calculate the date for the cell's day in the current week
          cellDate = new Date(currentWeekMonday);
          cellDate.setDate(currentWeekMonday.getDate() + cellDayIndex);
          // Set time to end of day to include lectures on the same day
          cellDate.setHours(23, 59, 59, 999);
        }

        // Map session name to session number (API uses "section" field for session: 0=Morning, 1=Afternoon, 2=Evening)
        const sessionNameToNumber: Record<string, number> = {
          Morning: 0,
          Afternoon: 1,
          Evening: 2,
        };
        cellSession = sessionNameToNumber[cellInfo.session] ?? null;
      }

      // TODO: Get employeeId from user context or props
      // For now, using example employeeId from the API documentation
      const employeeId = "3a1c68da-2f33-aae3-a9d2-4cd8b7aba805";

      // Call API twice: once for previous week and once for current week
      Promise.all([
        fetchTeachingSchedule(previousWeekFrom, previousWeekTo, employeeId, schoolYearId, "03"),
        fetchTeachingSchedule(currentWeekFrom, currentWeekTo, employeeId, schoolYearId, "03"),
      ])
        .then(([previousWeekResponse, currentWeekResponse]: [TeachingScheduleResponse, TeachingScheduleResponse]) => {
          // Combine lectures from both weeks
          const allLectures = [
            ...previousWeekResponse.teachingScheduleDetailDtos,
            ...currentWeekResponse.teachingScheduleDetailDtos,
          ];

          // Find lectures for this class, excluding those after the cell date and session
          let classLectures = allLectures.filter((detail: TeachingScheduleDetail) => {
            if (detail.classId !== selectedClassId) {
              return false;
            }
            // Exclude lectures after the scheduling cell date and session
            if (cellDate) {
              const lectureDate = new Date(detail.dateStudy);
              const lectureDateOnly = new Date(
                lectureDate.getFullYear(),
                lectureDate.getMonth(),
                lectureDate.getDate()
              );
              const cellDateOnly = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());

              // If lecture is on a later date, exclude it
              if (lectureDateOnly > cellDateOnly) {
                return false;
              }

              // If lecture is on the same date, check the session and period
              if (lectureDateOnly.getTime() === cellDateOnly.getTime() && cellSession !== null && cellInfo) {
                // API uses "section" field for session: 0 = Morning, 1 = Afternoon, 2 = Evening
                const normalizedLectureSession = normalizeSession(detail.section);
                const normalizedCellSession = normalizeSession(cellSession);

                // Exclude lectures in sessions after the cell's session
                // Afternoon (1) is after Morning (0), Evening (2) is after both
                // Session takes precedence: Afternoon period 1 is after Morning period 5
                if (normalizedLectureSession > normalizedCellSession) {
                  return false;
                }

                // If same session, check period number
                if (normalizedLectureSession === normalizedCellSession) {
                  // API uses "period" field for period in session
                  const lecturePeriod = detail.period || 0;
                  const cellPeriod = cellInfo.period || 0;

                  // Exclude lectures with higher period number in the same session
                  if (lecturePeriod > cellPeriod) {
                    return false;
                  }

                  // Exclude lectures in the exact same timeslot (same day, same session, same period)
                  if (lecturePeriod === cellPeriod) {
                    return false;
                  }
                }
              }
            }
            return true;
          });

          if (classLectures.length > 0) {
            // Sort by dateStudy, then by session, then by period to get the previous
            const sortedLectures = classLectures.sort((a: TeachingScheduleDetail, b: TeachingScheduleDetail) => {
              const dateA = new Date(a.dateStudy).getTime();
              const dateB = new Date(b.dateStudy).getTime();

              // First compare by date (descending - most recent first)
              if (dateB !== dateA) {
                return dateB - dateA;
              }

              // If same date, compare by normalized session (descending - later session first)
              // Afternoon (1) is after Morning (0), Evening (2) is after both
              // API uses "section" field for session: 0 = Morning, 1 = Afternoon, 2 = Evening
              const normalizedSessionA = normalizeSession(a.section);
              const normalizedSessionB = normalizeSession(b.section);
              if (normalizedSessionB !== normalizedSessionA) {
                return normalizedSessionB - normalizedSessionA;
              }

              // If same date and session, compare by period (descending - higher period first)
              // API uses "period" field for period in session
              return (b.period || 0) - (a.period || 0);
            });

            const previous = sortedLectures[0];
            // API provides period number directly in the "period" field
            setPreviousLecture(previous);
          } else {
            setPreviousLecture(null);
          }
          setIsLoadingPreviousLecture(false);
        })
        .catch((error: unknown) => {
          console.error("Failed to fetch previous lecture:", error);
          setPreviousLecture(null);
          setIsLoadingPreviousLecture(false);
        });
    }
  }, [isOpen, selectedClassId, classes, initialData, cellInfo]);

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

    onSave({
      lesson: lessonDisplayName,
      class: className,
      notes,
    });
  };

  const getDialogTitle = () => {
    if (!cellInfo) return "Add Lesson";
    return `${cellInfo.day} - ${cellInfo.session} - Period ${cellInfo.period}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>Fill in the lesson information for this time slot.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Class Selection - Radio buttons styled as rectangular buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Class</label>
            {isLoadingClasses ? (
              <div className="text-sm text-gray-500">Loading classes...</div>
            ) : classError ? (
              <div className="text-sm text-red-600">{classError}</div>
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
                      flex-1 min-w-[100px] px-4 py-2 border-2 rounded-md cursor-pointer text-center
                      transition-all duration-200
                      ${
                        selectedClassId === classItem.id
                          ? "bg-blue-500 text-white border-blue-500 font-semibold"
                          : "bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                      }
                    `}
                  >
                    {classItem.className}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lesson Selection - Dropdown */}
          <div className="space-y-2">
            <label htmlFor="lesson" className="text-sm font-medium">
              Lesson
            </label>
            <select
              id="lesson"
              value={selectedLesson}
              onChange={(e) => setSelectedLesson(e.target.value)}
              disabled={isLoadingLessons || !selectedClassId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedClassId
                  ? "Select a class first"
                  : isLoadingLessons
                  ? "Loading lessons..."
                  : "Select a lesson"}
              </option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.period} - {lesson.name}
                </option>
              ))}
            </select>
            {lessonError && <p className="text-sm text-red-600">{lessonError}</p>}
          </div>

          {/* Previous Lecture Section */}
          {selectedClassId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Previous Lecture</label>
              {isLoadingPreviousLecture ? (
                <div className="text-sm text-gray-500 p-3">Loading previous lecture...</div>
              ) : previousLecture ? (
                <div className="flex gap-3 p-3 border border-gray-300 rounded-md bg-gray-50">
                  {/* Left: Calendar-style date */}
                  {(() => {
                    const { day, month } = formatDate(previousLecture.dateStudy);
                    return (
                      <div className="shrink-0 w-16 h-16 bg-white border-2 border-gray-300 rounded-md flex flex-col items-center justify-center shadow-sm">
                        <div className="text-2xl font-bold text-gray-800">{day}</div>
                        <div className="text-xs font-semibold text-gray-600 uppercase">{month}</div>
                      </div>
                    );
                  })()}

                  {/* Right: Details */}
                  <div className="flex-1 flex flex-col justify-center space-y-1">
                    <div className="text-sm font-semibold text-gray-800">
                      {previousLecture.className} - {getSessionName(previousLecture.section, previousLecture.dateStudy)}{" "}
                      - Period {previousLecture.period}
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatPeriodNumber(previousLecture.distributeProgramPeriod)} -{" "}
                      {previousLecture.distributeProgramName}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 p-3 border border-gray-300 rounded-md bg-gray-50">
                  No previous lecture found
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="Additional notes (optional)"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
