import { useState, useEffect, Fragment } from "react";
import { LessonDialog, type LessonInfo, type ScheduleCell } from "@/components/LessonDialog";
import { fetchTeachingSchedule, type TeachingScheduleDetail } from "@/lib/api";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBREVIATIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SESSIONS = ["Morning", "Afternoon", "Evening"];
const PERIODS_PER_SESSION = 5;

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

// Format date as MM/DD
function formatDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${month}/${day}`;
}

// Format date as YYYY-MM-DD for input[type="date"]
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format week range for display (e.g., "Jan 1 - Jan 7, 2024")
function formatWeekRange(weekDates: Date[]): string {
  const monday = weekDates[0];
  const sunday = weekDates[6];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const mondayStr = `${months[monday.getMonth()]} ${monday.getDate()}`;
  const sundayStr = `${months[sunday.getMonth()]} ${sunday.getDate()}, ${sunday.getFullYear()}`;

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
  const [weekDates, setWeekDates] = useState<Date[]>(getCurrentWeekDates());
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Update week dates when selected date changes
  useEffect(() => {
    setWeekDates(getWeekDatesFromDate(selectedDate));
  }, [selectedDate]);

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
    }
    setIsDialogOpen(false);
    setSelectedCell(null);
  };

  const getCellKey = (day: string, session: string, period: number) => {
    return `${day}-${session}-${period}`;
  };

  const getCellLesson = (day: string, session: string, period: number) => {
    return schedule[getCellKey(day, session, period)];
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

        // Map API response to schedule cells
        const scheduleMap: Record<string, LessonInfo> = {};

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
          scheduleMap[key] = {
            lesson: detail.distributeProgramName || detail.subjectName || "",
            class: detail.className || "",
            description: detail.description || "",
            lessonPeriod: detail.distributeProgramPeriod,
          };
        });

        setSchedule(scheduleMap);
      } catch (error) {
        console.error("Failed to fetch teaching schedule:", error);
        setScheduleError(error instanceof Error ? error.message : "Failed to load schedule");
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    loadSchedule();
  }, [weekDates]);

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
        <h1 className="text-3xl font-bold text-center mb-4">Teaching Schedule</h1>

        {/* Week Selector */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button onClick={handlePreviousWeek} variant="outline" aria-label="Previous week">
            ← Prev
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
                <Calendar mode="single" selected={weekDates[0]} onSelect={handleDateSelect} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleNextWeek} variant="outline" aria-label="Next week">
            Next →
          </Button>

          <Button onClick={handleToday} variant="default">
            Today
          </Button>
        </div>

        {isLoadingSchedule && <div className="text-center text-sm text-gray-500 mt-2">Loading schedule...</div>}
        {scheduleError && <div className="text-center text-sm text-red-600 mt-2">Error: {scheduleError}</div>}
      </div>

      <div className="grid grid-cols-8 w-full">
        <div className="bg-gray-100 p-3 font-semibold text-center border-r border-b border-gray-300 sticky top-0 z-10">
          Time
        </div>
        {DAYS.map((day, index) => {
          const date = weekDates[index];
          return (
            <div
              key={day}
              className="bg-gray-100 p-3 font-semibold text-center border-r border-b border-gray-300 sticky top-0 z-10 last:border-r-0"
            >
              <div className="text-sm">{DAY_ABBREVIATIONS[index]}</div>
              <div className="text-xs text-gray-600 mt-1">{formatDate(date)}</div>
            </div>
          );
        })}

        {/* Grid cells */}
        {rows.map((row, rowIndex) => (
          <Fragment key={`row-${rowIndex}`}>
            {/* Row label (first column) */}
            <div className="bg-gray-50 p-2 text-sm text-center border-r border-b border-gray-300 font-medium sticky left-0 z-5">
              {row.period === 1 && <div className="font-semibold text-gray-700">{row.session}</div>}
              <div className="text-xs text-gray-600">P{row.period}</div>
            </div>

            {/* Day cells */}
            {DAYS.map((day, dayIndex) => {
              const lesson = getCellLesson(day, row.session, row.period);
              return (
                <div
                  key={`${day}-${rowIndex}`}
                  onClick={() => handleCellClick(day, row.session, row.period)}
                  className={`
                    p-2 min-h-[80px] border-r border-b border-gray-300 cursor-pointer
                    hover:bg-blue-50 transition-colors
                    ${lesson ? "bg-blue-100" : "bg-white"}
                    ${dayIndex === DAYS.length - 1 ? "border-r-0" : ""}
                  `}
                >
                  {lesson && (
                    <div className="text-xs space-y-1">
                      {lesson.lesson && <div className="font-semibold text-gray-800 line-clamp-2">{lesson.lesson}</div>}
                      {lesson.class && <div className="text-gray-600">Class: {lesson.class}</div>}
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
      />
    </div>
  );
}
