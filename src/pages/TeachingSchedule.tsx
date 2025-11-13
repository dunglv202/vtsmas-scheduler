import { useState, useEffect, Fragment } from "react";
import { LessonDialog, type LessonInfo, type ScheduleCell } from "@/components/LessonDialog";
import { fetchTeachingSchedule, fetchClasses, type TeachingScheduleDetail, type ClassItem } from "@/lib/api";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Filter } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBREVIATIONS = ["Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"];
const SESSIONS = ["Morning", "Afternoon", "Evening"];
const SESSION_LABELS: Record<string, string> = {
  Morning: "Buổi sáng",
  Afternoon: "Buổi chiều",
  Evening: "Buổi tối",
};
const PERIODS_PER_SESSION = 5;

const STATUS_TO_LECTURE_TYPE: Record<number, string> = {
  3: "Dạy chính",
  1: "Dạy bù",
  4: "Dạy thay",
};

const TOOL_TYPE_TO_LABEL: Record<number, string> = {
  1: "Phòng trực ban",
  2: "tự làm",
  3: "tại lớp",
};

// Get week's dates (Monday to Sunday) from a given date
function getWeekDatesFromDate(date: Date): Date[] {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  // Calculate Monday of the week containing the given date
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0); // Reset time to start of day

  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const weekDate = new Date(monday);
    weekDate.setDate(monday.getDate() + i);
    weekDates.push(weekDate);
  }
  return weekDates;
}

// Get current week's dates (Monday to Sunday)
function getCurrentWeekDates(): Date[] {
  return getWeekDatesFromDate(new Date());
}

// Format date as DD/MM
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}`;
}

// Format week range for display (e.g., "Jan 1 - Jan 7, 2024")
function formatWeekRange(weekDates: Date[]): string {
  const monday = weekDates[0];
  const sunday = weekDates[6];
  const months = ["Thg 1", "Thg 2", "Thg 3", "Thg 4", "Thg 5", "Thg 6", "Thg 7", "Thg 8", "Thg 9", "Thg 10", "Thg 11", "Thg 12"];

  const mondayStr = `${monday.getDate()} ${months[monday.getMonth()]}`;
  const sundayStr = `${sunday.getDate()} ${months[sunday.getMonth()]}, ${sunday.getFullYear()}`;

  return `${mondayStr} - ${sundayStr}`;
}

// Format date as YYYY-MM-DD for API
function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get day name from date (Monday, Tuesday, etc.)
function getDayNameFromDate(date: Date): string {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return dayNames[dayOfWeek];
}

// Map section to session name (0 = Morning, 1 = Afternoon, 2 = Evening)
function getSessionNameFromSection(section: number): string {
  const sessionMap: Record<number, string> = {
    0: "Morning",
    1: "Afternoon",
    2: "Evening",
  };
  return sessionMap[section] || "Morning";
}

export default function TeachingSchedule() {
  const [selectedCell, setSelectedCell] = useState<ScheduleCell | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [schedule, setSchedule] = useState<Record<string, LessonInfo>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>(getCurrentWeekDates());
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [teachingScheduleId, setTeachingScheduleId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Update week dates when selected date changes
  useEffect(() => {
    setWeekDates(getWeekDatesFromDate(selectedDate));
    // Update calendar month to show the month of the selected date
    setCalendarMonth(selectedDate);
  }, [selectedDate]);

  // Fetch classes for filter
  useEffect(() => {
    const loadClasses = async () => {
      setIsLoadingClasses(true);
      try {
        // TODO: Replace with actual filter values from props or context
        const response = await fetchClasses({
          schoolLevelCode: "03",
          schoolYearId: "6570c704-45a0-11ef-82f8-fa163e7dd11b",
        });
        setClasses(response.items);
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      } finally {
        setIsLoadingClasses(false);
      }
    };
    loadClasses();
  }, []);

  const handleCellClick = (day: string, session: string, period: number) => {
    setSelectedCell({ day, session, period });
    setIsDialogOpen(true);
  };

  const handleSaveLesson = (lessonInfo: LessonInfo) => {
    if (selectedCell) {
      const key = `${selectedCell.day}-${selectedCell.session}-${selectedCell.period}`;
      setSchedule((prev) => ({
        ...prev,
        [key]: lessonInfo,
      }));
      setRefreshCounter((prev) => prev + 1);
    }
    setIsDialogOpen(false);
    setSelectedCell(null);
  };

  const getCellKey = (day: string, session: string, period: number) => {
    return `${day}-${session}-${period}`;
  };

  const getCellLesson = (day: string, session: string, period: number): LessonInfo | undefined => {
    const lesson = schedule[getCellKey(day, session, period)];
    // Filter by selected classes
    if (selectedClasses.size > 0 && lesson) {
      if (!lesson.class || !selectedClasses.has(lesson.class)) {
        return undefined; // Hide this cell if class doesn't match filter
      }
    }
    return lesson;
  };

  const toggleClassFilter = (className: string) => {
    setSelectedClasses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(className)) {
        newSet.delete(className);
      } else {
        newSet.add(className);
      }
      return newSet;
    });
  };

  const clearClassFilter = () => {
    setSelectedClasses(new Set());
  };

  // Handle date selection from calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false); // Close the popover after selecting a date
    }
  };

  // Navigate to previous week
  const handlePreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  // Navigate to next week
  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  // Navigate to current week
  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Fetch teaching schedule from API
  useEffect(() => {
    const loadSchedule = async () => {
      setIsLoadingSchedule(true);
      setScheduleError(null);

      try {
        // Get Monday and Sunday of current week
        const monday = weekDates[0];
        const sunday = weekDates[6];

        // Format dates for API
        const fromDate = formatDateForAPI(monday);
        const toDate = formatDateForAPI(sunday);

        // TODO: Get these from user context or props
        // For now, using example values from the API documentation
        const employeeId = "3a1c68da-2f33-aae3-a9d2-4cd8b7aba805";
        const schoolYearId = "6570c704-45a0-11ef-82f8-fa163e7dd11b";
        const schoolLevelCode = "03";

        const response = await fetchTeachingSchedule(fromDate, toDate, employeeId, schoolYearId, schoolLevelCode);

        if (response) {
          setTeachingScheduleId(response.id);
          setEmployeeName(response.employeeName);
        } else {
          setTeachingScheduleId(null);
          setEmployeeName(null);
        }

        // Map API response to schedule cells
        const scheduleMap: Record<string, LessonInfo> = {};

        if (response) {
          response.teachingScheduleDetailDtos.forEach((detail: TeachingScheduleDetail) => {
            // Get day name from dateStudy
            const dateStudy = new Date(detail.dateStudy);
            const dayName = getDayNameFromDate(dateStudy);

            // Get session name from section (0=Morning, 1=Afternoon, 2=Evening)
            const sessionName = getSessionNameFromSection(detail.section);

            // Get period number
            const period = detail.period;

            // Create cell key
            const key = getCellKey(dayName, sessionName, period);

            // Map to LessonInfo
            const statusLectureType =
              typeof detail.status === "number" ? STATUS_TO_LECTURE_TYPE[detail.status] : undefined;
            const toolTypeLabel =
              typeof detail.toolType === "number" ? TOOL_TYPE_TO_LABEL[detail.toolType] : undefined;
            const toolNameValue =
              detail.toolName !== undefined && detail.toolName !== null
                ? String(detail.toolName).trim()
                : "";
            const totalToolValue =
              detail.totalTool !== undefined && detail.totalTool !== null
                ? String(detail.totalTool).trim()
                : "";
            const equipment =
              detail.isRegisterLearningTool &&
              (toolNameValue || totalToolValue || toolTypeLabel)
                ? {
                    name: toolNameValue || undefined,
                    quantity: totalToolValue || undefined,
                    type: toolTypeLabel,
                  }
                : undefined;

            scheduleMap[key] = {
              lesson: detail.distributeProgramName || detail.subjectName || "",
              lessonId: detail.distributeProgramId,
              class: detail.className || "",
              classId: detail.classId,
              description: detail.description || "",
              subject: detail.subjectName || "",
              subjectCode: detail.subjectCode || "",
              lessonPeriod: detail.distributeProgramPeriod,
              gradeCode: detail.gradeCode,
              gradeName: detail.gradeName,
              lectureType: statusLectureType,
              equipment,
            };
          });
        }

        setSchedule(scheduleMap);
      } catch (error) {
        console.error("Failed to fetch teaching schedule:", error);
        setTeachingScheduleId(null);
        setEmployeeName(null);
        setScheduleError(
          error instanceof Error
            ? `Không thể tải thời khóa biểu: ${error.message}`
            : "Không thể tải thời khóa biểu"
        );
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    loadSchedule();
  }, [weekDates, refreshCounter]);

  // Generate rows: 3 sessions × 5 periods = 15 rows
  const rows: Array<{ session: string; period: number }> = [];
  SESSIONS.forEach((session) => {
    for (let period = 1; period <= PERIODS_PER_SESSION; period++) {
      rows.push({ session, period });
    }
  });

  return (
    <div className="w-full">
      <div className="p-4 mb-4">
        <h1 className="text-3xl font-bold text-center mb-4">Thời khóa biểu giảng dạy</h1>

        {/* Filters and Week Selector */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Class Filter */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 w-[160px] justify-center relative">
                <Filter className="h-4 w-4 shrink-0" />
                <span className="truncate">Lọc theo lớp</span>
                {selectedClasses.size > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs shrink-0">
                    {selectedClasses.size}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Lọc theo lớp</h4>
                  {selectedClasses.size > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearClassFilter} className="h-7 text-xs">
                      Xóa
                    </Button>
                  )}
                </div>
                {isLoadingClasses ? (
                  <div className="text-sm text-muted-foreground py-2">Đang tải danh sách lớp...</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {classes.map((classItem) => {
                      const isSelected = selectedClasses.has(classItem.className);
                      return (
                        <button
                          key={classItem.id}
                          type="button"
                          onClick={() => toggleClassFilter(classItem.className)}
                          className={`
                            w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                            ${
                              isSelected
                                ? "bg-accent text-accent-foreground font-medium"
                                : "hover:bg-accent text-foreground"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`
                                w-4 h-4 border-2 rounded flex items-center justify-center
                                ${isSelected ? "bg-primary border-primary" : "border-border"}
                              `}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3 text-primary-foreground"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span>{classItem.className}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Week Selector */}
          <Button onClick={handlePreviousWeek} variant="outline" aria-label="Tuần trước">
            ← Tuần trước
          </Button>

          <div className="flex items-center gap-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatWeekRange(weekDates)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={weekDates[0]}
                  onSelect={handleDateSelect}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleNextWeek} variant="outline" aria-label="Tuần sau">
            Tuần sau →
          </Button>

          <Button onClick={handleToday} variant="default">
            Hôm nay
          </Button>
        </div>

        {isLoadingSchedule && (
          <div className="text-center text-sm text-muted-foreground mt-2">Đang tải thời khóa biểu...</div>
        )}
        {scheduleError && <div className="text-center text-sm text-destructive mt-2">Lỗi: {scheduleError}</div>}
      </div>

      <div className="grid grid-cols-8 w-full">
        <div className="bg-muted p-3 font-semibold text-center border-r border-b border-border sticky top-0 z-10">
          Thời gian
        </div>
        {DAYS.map((day, index) => {
          const date = weekDates[index];
          return (
            <div
              key={day}
              className="bg-muted p-3 font-semibold text-center border-r border-b border-border sticky top-0 z-10 last:border-r-0"
            >
              <div className="text-sm">{DAY_ABBREVIATIONS[index]}</div>
              <div className="text-xs text-muted-foreground mt-1">{formatDate(date)}</div>
            </div>
          );
        })}

        {/* Grid cells */}
        {rows.map((row, rowIndex) => (
          <Fragment key={`row-${rowIndex}`}>
            {/* Row label (first column) */}
            <div className="bg-card p-2 text-sm text-center border-r border-b border-border font-medium sticky left-0 z-5">
              {row.period === 1 && (
                <div className="font-semibold text-foreground">{SESSION_LABELS[row.session] ?? row.session}</div>
              )}
              <div className="text-xs text-muted-foreground">Tiết {row.period}</div>
            </div>

            {/* Day cells */}
            {DAYS.map((day, dayIndex) => {
              const lesson = getCellLesson(day, row.session, row.period);
              return (
                <div
                  key={`${day}-${rowIndex}`}
                  onClick={() => handleCellClick(day, row.session, row.period)}
                  className={`
                    p-2 min-h-[80px] border-r border-b border-border cursor-pointer
                    hover:bg-accent transition-colors
                    ${lesson ? "bg-accent/50" : "bg-background"}
                    ${dayIndex === DAYS.length - 1 ? "border-r-0" : ""}
                  `}
                >
                  {lesson && (
                    <div className="text-xs space-y-1">
                      {lesson.lesson && (
                        <div className="font-semibold text-foreground line-clamp-2">
                          {lesson.lessonPeriod !== undefined && `Tiết ${lesson.lessonPeriod} - `}
                          {lesson.lesson}
                        </div>
                      )}
                      {lesson.class && <div className="text-muted-foreground">Lớp: {lesson.class}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

      {/* Dialog for editing lesson */}
      <LessonDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedCell(null);
        }}
        onSave={handleSaveLesson}
        initialData={
          selectedCell ? getCellLesson(selectedCell.day, selectedCell.session, selectedCell.period) : undefined
        }
        cellInfo={selectedCell}
        weekDates={weekDates}
        teachingScheduleId={teachingScheduleId}
        employeeName={employeeName}
      />
    </div>
  );
}
