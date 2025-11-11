import { useState, useEffect, Fragment } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LessonInfo {
  subject?: string;
  class?: string;
  room?: string;
  notes?: string;
}

interface ScheduleCell {
  day: string;
  period: string;
  lecture: number;
  lesson?: LessonInfo;
}

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
        <h1 className="text-4xl font-bold text-center">Teaching Schedule</h1>
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
                      {lesson.subject && <div className="font-semibold text-gray-800">{lesson.subject}</div>}
                      {lesson.class && <div className="text-gray-600">Class: {lesson.class}</div>}
                      {lesson.room && <div className="text-gray-600">Room: {lesson.room}</div>}
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

interface LessonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lessonInfo: LessonInfo) => void;
  initialData?: LessonInfo;
  cellInfo: ScheduleCell | null;
}

function LessonDialog({ isOpen, onClose, onSave, initialData, cellInfo }: LessonDialogProps) {
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [classRoom, setClassRoom] = useState(initialData?.class || "");
  const [room, setRoom] = useState(initialData?.room || "");
  const [notes, setNotes] = useState(initialData?.notes || "");

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      setSubject(initialData?.subject || "");
      setClassRoom(initialData?.class || "");
      setRoom(initialData?.room || "");
      setNotes(initialData?.notes || "");
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      subject,
      class: classRoom,
      room,
      notes,
    });
  };

  const getDialogTitle = () => {
    if (!cellInfo) return "Add Lesson";
    return `${cellInfo.day} - ${cellInfo.period} - Lecture ${cellInfo.lecture}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>Fill in the lesson information for this time slot.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="subject" className="text-sm font-medium">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter subject name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="class" className="text-sm font-medium">
              Class
            </label>
            <input
              id="class"
              type="text"
              value={classRoom}
              onChange={(e) => setClassRoom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter class name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="room" className="text-sm font-medium">
              Room
            </label>
            <input
              id="room"
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter room number"
            />
          </div>

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
