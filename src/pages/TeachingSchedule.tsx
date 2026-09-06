import { LessonDialog, type LessonInfo, type ScheduleCell } from "@/components/LessonDialog";
import { ScheduleGrid } from "@/components/teaching-schedule/ScheduleGrid";
import { ScheduleToolbar } from "@/components/teaching-schedule/ScheduleToolbar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import { useEmployee } from "@/contexts/EmployeeContext";
import {
  fetchClasses,
  fetchTeachingSchedule,
  fetchApprovalHistory,
  type ClassItem,
  type TeachingScheduleDetail,
  type ApprovalHistoryItem,
} from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

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

// Format date as YYYY-MM-DD for API
function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parse a YYYY-MM-DD string into a local Date.
// Built with date components instead of new Date(string) so the result is
// independent of the browser timezone (UTC parsing can shift the day back one).
function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return isNaN(date.getTime()) ? null : date;
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
  const { schoolYear, getSchoolYearForDate } = useSchoolYear();
  const { employee } = useEmployee();
  const [selectedCell, setSelectedCell] = useState<ScheduleCell | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [schedule, setSchedule] = useState<Record<string, LessonInfo>>({});
  // Keep the selected week range in the URL (?from=YYYY-MM-DD&to=YYYY-MM-DD) so a
  // shared link opens the same week for whoever follows it.
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Read the week start from ?from=YYYY-MM-DD; normalize to its Monday so the
    // anchor date is always the week start. Falls back to today.
    const from = parseDateParam(searchParams.get("from"));
    if (from) {
      const mondayOffset = from.getDay() === 0 ? -6 : 1 - from.getDay();
      return new Date(from.getFullYear(), from.getMonth(), from.getDate() + mondayOffset);
    }
    return new Date();
  });
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Monday–Sunday of the week containing the selected date
  const weekDates = useMemo(() => getWeekDatesFromDate(selectedDate), [selectedDate]);
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
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);

  // Keep the calendar popover on the month of the selected date
  useEffect(() => {
    setCalendarMonth(selectedDate);
  }, [selectedDate]);

  // Sync the visible week range into the URL as ?from=YYYY-MM-DD&to=YYYY-MM-DD.
  // replace: true keeps the back/forward history clean; the guard prevents
  // redundant updates.
  useEffect(() => {
    const from = formatDateForAPI(weekDates[0]);
    const to = formatDateForAPI(weekDates[6]);
    if (searchParams.get("from") !== from || searchParams.get("to") !== to) {
      setSearchParams({ ...Object.fromEntries(searchParams), from, to }, { replace: true });
    }
  }, [weekDates, searchParams, setSearchParams]);

  // The school year the selected week belongs to. Falls back to the primary
  // (latest) school year when the week sits outside every known school year
  // (e.g. the summer gap) or while the year list is still loading.
  const activeSchoolYear = useMemo(() => {
    if (!weekDates || weekDates.length === 0) return schoolYear;
    return getSchoolYearForDate(weekDates[0]) ?? schoolYear;
  }, [weekDates, schoolYear, getSchoolYearForDate]);

  // Fetch classes for filter
  useEffect(() => {
    if (!schoolYear) return;

    const loadClasses = async () => {
      setIsLoadingClasses(true);
      try {
        const response = await fetchClasses({
          schoolLevelCode: "03", // TODO: Get from user context or API
          schoolYearId: schoolYear.schoolYearId,
        });
        setClasses(response.items);
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      } finally {
        setIsLoadingClasses(false);
      }
    };
    loadClasses();
  }, [schoolYear]);

  // Check if the latest approval is true
  const isApproved = useMemo(() => {
    if (!approvalHistory || approvalHistory.length === 0) return false;
    // Sort by approveDate descending to get the latest
    const sorted = [...approvalHistory].sort(
      (a, b) => new Date(b.approveDate).getTime() - new Date(a.approveDate).getTime()
    );
    return sorted[0]?.isApprove === true;
  }, [approvalHistory]);

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

  const handleCellClick = (day: string, session: string, period: number) => {
    // Check if trying to create new schedule on an empty cell
    const cellLesson = getCellLesson(day, session, period);

    // If cell is empty (no existing schedule) and week is approved, show error
    if (!cellLesson && isApproved) {
      toast.error("Lịch dạy tuần đã được phê duyệt, không thể thêm lịch mới");
      return;
    }

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

  // Reload schedule for current week
  const handleReload = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  // Fetch teaching schedule from API
  useEffect(() => {
    if (!activeSchoolYear || !employee?.employeeId) return;

    const loadSchedule = async () => {
      setIsLoadingSchedule(true);
      setScheduleError(null);
      // Clear approval history when week changes - will be fetched for the new week
      setApprovalHistory([]);

      try {
        // Get Monday and Sunday of current week
        const monday = weekDates[0];
        const sunday = weekDates[6];

        // Format dates for API
        const fromDate = formatDateForAPI(monday);
        const toDate = formatDateForAPI(sunday);

        const employeeId = employee.employeeId;
        const schoolYearId = activeSchoolYear.schoolYearId;
        const schoolLevelCode = "03"; // TODO: Get from user context or API

        const response = await fetchTeachingSchedule(fromDate, toDate, employeeId, schoolYearId, schoolLevelCode);

        if (response) {
          setTeachingScheduleId(response.id);
          setEmployeeName(response.employeeName);

          // Fetch approval history for this week's schedule
          try {
            const history = await fetchApprovalHistory(response.id);
            setApprovalHistory(history);
          } catch (error) {
            console.error("Failed to fetch approval history:", error);
            setApprovalHistory([]);
          }
        } else {
          setTeachingScheduleId(null);
          setEmployeeName(null);
          // No schedule for this week, so no approval history
          setApprovalHistory([]);
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
            const toolTypeLabel = typeof detail.toolType === "number" ? TOOL_TYPE_TO_LABEL[detail.toolType] : undefined;
            const toolNameValue =
              detail.toolName !== undefined && detail.toolName !== null ? String(detail.toolName).trim() : "";
            const totalToolValue =
              detail.totalTool !== undefined && detail.totalTool !== null ? String(detail.totalTool).trim() : "";
            const equipment =
              detail.isRegisterLearningTool && (toolNameValue || totalToolValue || toolTypeLabel)
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
              scheduleDetailId: detail.id,
            };
          });
        }

        setSchedule(scheduleMap);
      } catch (error) {
        console.error("Failed to fetch teaching schedule:", error);
        setTeachingScheduleId(null);
        setEmployeeName(null);
        setApprovalHistory([]);
        setScheduleError(
          error instanceof Error ? `Không thể tải thời khóa biểu: ${error.message}` : "Không thể tải thời khóa biểu"
        );
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    loadSchedule();
  }, [weekDates, refreshCounter, activeSchoolYear, employee?.employeeId]);

  return (
    <div className="w-full">
      <ScheduleToolbar
        weekDates={weekDates}
        selectedClasses={selectedClasses}
        classes={classes}
        isLoadingClasses={isLoadingClasses}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        calendarMonth={calendarMonth}
        setCalendarMonth={setCalendarMonth}
        isCalendarOpen={isCalendarOpen}
        setIsCalendarOpen={setIsCalendarOpen}
        scheduleError={scheduleError}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        onReload={handleReload}
        onDateSelect={handleDateSelect}
        onToggleClassFilter={toggleClassFilter}
        onClearClassFilter={clearClassFilter}
      />

      <ScrollArea className="w-[calc(100vw-2rem)] md:w-full h-[calc(100vh-200px)]">
        <ScheduleGrid
          weekDates={weekDates}
          schedule={schedule}
          selectedClasses={selectedClasses}
          isLoadingSchedule={isLoadingSchedule}
          onCellClick={handleCellClick}
        />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

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
        approvalHistory={approvalHistory}
      />
    </div>
  );
}
