import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchCurriculum, type CurriculumItem } from "@/lib/api";

export interface LessonInfo {
  lesson?: string;
  class?: string;
  notes?: string;
}

export interface ScheduleCell {
  day: string;
  period: string;
  lecture: number;
  lesson?: LessonInfo;
}

// Sample data - these should ideally come from an API
const CLASSES = ["Class A", "Class B", "Class C", "Class D", "Class E", "Class F"];

interface LessonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lessonInfo: LessonInfo) => void;
  initialData?: LessonInfo;
  cellInfo: ScheduleCell | null;
}

export function LessonDialog({ isOpen, onClose, onSave, initialData, cellInfo }: LessonDialogProps) {
  const [selectedClass, setSelectedClass] = useState(initialData?.class || "");
  const [selectedLesson, setSelectedLesson] = useState(initialData?.lesson || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [lessons, setLessons] = useState<CurriculumItem[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);

  // Fetch lessons when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingLessons(true);
      setLessonError(null);
      // TODO: Replace with actual filter values from props or context
      // For now, using example values from the API documentation
      fetchCurriculum({
        subjectCode: "22",
        gradeCode: "06",
        classId: "3a1bc7f1-035c-84f8-6afd-d9fe14c8b361",
        schoolYearId: "6570c704-45a0-11ef-82f8-fa163e7dd11b",
      })
        .then((response) => {
          setLessons(response.items);
          setIsLoadingLessons(false);
        })
        .catch((error) => {
          setLessonError(error instanceof Error ? error.message : "Failed to load lessons");
          setIsLoadingLessons(false);
        });
    }
  }, [isOpen]);

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      setSelectedClass(initialData?.class || "");
      // Match the saved lesson display string to find the lesson ID
      if (initialData?.lesson && lessons.length > 0) {
        const matchedLesson = lessons.find((lesson) => {
          const displayName = `${lesson.period} - ${lesson.name}`;
          return displayName === initialData.lesson;
        });
        setSelectedLesson(matchedLesson?.id || "");
      } else {
        setSelectedLesson("");
      }
      setNotes(initialData?.notes || "");
    }
  }, [isOpen, initialData, lessons]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Find the selected lesson to get its display name
    const selectedLessonItem = lessons.find((lesson) => lesson.id === selectedLesson);
    const lessonDisplayName = selectedLessonItem 
      ? `${selectedLessonItem.period} - ${selectedLessonItem.name}`
      : selectedLesson;
    
    onSave({
      lesson: lessonDisplayName,
      class: selectedClass,
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
          {/* Class Selection - Radio buttons styled as rectangular buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Class</label>
            <div className="flex flex-wrap gap-2">
              {CLASSES.map((className) => (
                <label
                  key={className}
                  className={`
                    flex-1 min-w-[100px] px-4 py-2 border-2 rounded-md cursor-pointer text-center
                    transition-all duration-200
                    ${
                      selectedClass === className
                        ? "bg-blue-500 text-white border-blue-500 font-semibold"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="class"
                    value={className}
                    checked={selectedClass === className}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="hidden"
                  />
                  {className}
                </label>
              ))}
            </div>
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
              disabled={isLoadingLessons}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {isLoadingLessons ? "Loading lessons..." : "Select a lesson"}
              </option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.period} - {lesson.name}
                </option>
              ))}
            </select>
            {lessonError && (
              <p className="text-sm text-red-600">{lessonError}</p>
            )}
          </div>

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

