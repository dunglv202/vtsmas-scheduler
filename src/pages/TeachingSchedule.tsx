import { useState, Fragment } from "react";
import { LessonDialog, type LessonInfo, type ScheduleCell } from "@/components/LessonDialog";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBREVIATIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PERIODS = ["Morning", "Afternoon", "Evening"];
const LECTURES_PER_PERIOD = 5;

// Get current week's dates (Monday to Sunday)
function getCurrentWeekDates(): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  // Calculate Monday of current week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date);
  }
  return weekDates;
}

// Format date as MM/DD
function formatDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${month}/${day}`;
}

export default function TeachingSchedule() {
  const [selectedCell, setSelectedCell] = useState<ScheduleCell | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [schedule, setSchedule] = useState<Record<string, LessonInfo>>({});
  const [weekDates] = useState<Date[]>(getCurrentWeekDates());

  const handleCellClick = (day: string, period: string, lecture: number) => {
    setSelectedCell({ day, period, lecture });
    setIsDialogOpen(true);
  };

  const handleSaveLesson = (lessonInfo: LessonInfo) => {
    if (selectedCell) {
      const key = `${selectedCell.day}-${selectedCell.period}-${selectedCell.lecture}`;
      setSchedule((prev) => ({
        ...prev,
        [key]: lessonInfo,
      }));
    }
    setIsDialogOpen(false);
    setSelectedCell(null);
  };

  const getCellKey = (day: string, period: string, lecture: number) => {
    return `${day}-${period}-${lecture}`;
  };

  const getCellLesson = (day: string, period: string, lecture: number) => {
    return schedule[getCellKey(day, period, lecture)];
  };

  // Generate rows: 3 periods × 5 lectures = 15 rows
  const rows: Array<{ period: string; lecture: number }> = [];
  PERIODS.forEach((period) => {
    for (let lecture = 1; lecture <= LECTURES_PER_PERIOD; lecture++) {
      rows.push({ period, lecture });
    }
  });

  return (
    <div className="w-full">
      <div className="p-4 mb-4">
        <h1 className="text-3xl font-bold text-center">Teaching Schedule</h1>
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
              {row.lecture === 1 && <div className="font-semibold text-gray-700">{row.period}</div>}
              <div className="text-xs text-gray-600">L{row.lecture}</div>
            </div>

            {/* Day cells */}
            {DAYS.map((day, dayIndex) => {
              const lesson = getCellLesson(day, row.period, row.lecture);
              return (
                <div
                  key={`${day}-${rowIndex}`}
                  onClick={() => handleCellClick(day, row.period, row.lecture)}
                  className={`
                    p-2 min-h-[80px] border-r border-b border-gray-300 cursor-pointer
                    hover:bg-blue-50 transition-colors
                    ${lesson ? "bg-blue-100" : "bg-white"}
                    ${dayIndex === DAYS.length - 1 ? "border-r-0" : ""}
                  `}
                >
                  {lesson && (
                    <div className="text-xs space-y-1">
                      {lesson.lesson && <div className="font-semibold text-gray-800">{lesson.lesson}</div>}
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
          selectedCell ? getCellLesson(selectedCell.day, selectedCell.period, selectedCell.lecture) : undefined
        }
        cellInfo={selectedCell}
      />
    </div>
  );
}
