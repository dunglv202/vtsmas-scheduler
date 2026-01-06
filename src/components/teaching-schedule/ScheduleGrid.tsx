import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import type { LessonInfo } from "@/components/LessonDialog";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBREVIATIONS = ["Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"];
const SESSIONS = ["Morning", "Afternoon", "Evening"];
const SESSION_LABELS: Record<string, string> = {
  Morning: "Buổi sáng",
  Afternoon: "Buổi chiều",
  Evening: "Buổi tối",
};
const PERIODS_PER_SESSION = 5;

// Format date as DD/MM
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}`;
}

// Check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Get cell key for schedule lookup
function getCellKey(day: string, session: string, period: number): string {
  return `${day}-${session}-${period}`;
}

interface ScheduleGridProps {
  weekDates: Date[];
  schedule: Record<string, LessonInfo>;
  selectedClasses: Set<string>;
  isLoadingSchedule: boolean;
  onCellClick: (day: string, session: string, period: number) => void;
}

export function ScheduleGrid({
  weekDates,
  schedule,
  selectedClasses,
  isLoadingSchedule,
  onCellClick,
}: ScheduleGridProps) {
  // Get lesson for a cell, applying class filter
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

  // Generate rows: 3 sessions × 5 periods = 15 rows
  const rows: Array<{ session: string; period: number }> = [];
  SESSIONS.forEach((session) => {
    for (let period = 1; period <= PERIODS_PER_SESSION; period++) {
      rows.push({ session, period });
    }
  });

  return (
    <div className="grid grid-cols-8 w-full min-w-200">
      <div className="bg-muted p-3 font-semibold text-center border-r border-b border-border sticky top-0 z-10">
        Thời gian
      </div>
      {DAYS.map((day, index) => {
        const date = weekDates[index];
        const isToday = isSameDay(date, new Date());
        return (
          <div
            key={day}
            className={cn(
              "p-3 font-semibold text-center border-r border-b border-border sticky top-0 z-10 nth-[8n]:border-r-0",
              isToday ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            <div className="text-sm">{DAY_ABBREVIATIONS[index]}</div>
            <div className={`text-xs mt-1 ${isToday ? "text-primary-foreground" : "text-muted-foreground"}`}>
              {formatDate(date)}
            </div>
          </div>
        );
      })}

      {isLoadingSchedule ? (
        <div className="col-span-8 flex items-center justify-center py-6">
          <Spinner className="mr-3" />
          <span className="text-sm text-muted-foreground">Đang tải thời khóa biểu...</span>
        </div>
      ) : (
        <>
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
                    onClick={() => onCellClick(day, row.session, row.period)}
                    className={`
                      p-2 h-24 border-r border-b border-border cursor-pointer
                      hover:bg-accent transition-colors
                      ${lesson ? "bg-accent/50" : "bg-background"}
                      ${dayIndex === DAYS.length - 1 ? "border-r-0" : ""}
                    `}
                  >
                    {lesson && (
                      <div className="text-xs space-y-1">
                        {lesson.subject && <div className="font-medium text-foreground">{lesson.subject}</div>}
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
        </>
      )}
    </div>
  );
}
