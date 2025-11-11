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
import { fetchCurriculum, fetchClasses, type CurriculumItem, type ClassItem } from "@/lib/api";

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
  const [classError, setClassError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);

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
      fetchCurriculum({
        subjectCode: "22",
        gradeCode: selectedClass.gradeLevelCode,
        classId: selectedClassId,
        schoolYearId: "6570c704-45a0-11ef-82f8-fa163e7dd11b",
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
    }
  }, [isOpen, selectedClassId, classes, initialData]);

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
