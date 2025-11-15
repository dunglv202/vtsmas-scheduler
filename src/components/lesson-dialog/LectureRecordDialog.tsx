import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentCombobox } from "./StudentCombobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchStudentsByClass, type StudentItem } from "@/lib/api";
import { translateDay } from "./utils";
import type { ScheduleCell } from "./types";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import React from "react";

interface LectureRecordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  classId?: string;
  schoolYearId?: string;
  className?: string;
  subjectName?: string;
  lessonName?: string;
  cellInfo?: ScheduleCell | null;
  weekDates?: Date[];
  teacherName?: string;
}

interface StudentChipWithPopoverProps {
  student: StudentItem;
  onRemove: () => void;
}

function StudentChipWithPopover({ student, onRemove }: StudentChipWithPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const openTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpen = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (!open) {
      openTimeoutRef.current = setTimeout(() => {
        setOpen(true);
      }, 500); // 500ms delay to open
    }
  };

  const handleClose = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    // Add delay before closing to allow moving mouse to popover
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 100); // 100ms delay before closing
  };

  React.useEffect(() => {
    return () => {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="flex items-center gap-1 px-2 py-1 bg-accent rounded-md text-sm cursor-pointer hover:bg-accent/80 transition-colors"
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          <span>{student.fullName}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1 hover:bg-accent-foreground/20 rounded p-0.5"
            aria-label={`Xóa ${student.fullName}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-64"
        side="top"
        align="start"
        sideOffset={2}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {student.imageSrc && (
              <img
                src={student.imageSrc}
                alt={student.fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{student.fullName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Mã học sinh: {student.studentCode}</p>
            </div>
          </div>
          {student.identifyNumber && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">CMND/CCCD:</span> {student.identifyNumber}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function LectureRecordDialog({
  isOpen,
  onClose,
  onSave,
  classId,
  schoolYearId,
  className,
  subjectName,
  lessonName,
  cellInfo,
  weekDates,
  teacherName,
}: LectureRecordDialogProps) {
  // Get date and weekday from cellInfo and weekDates
  const lessonDate = React.useMemo(() => {
    if (!cellInfo || !weekDates) return null;
    const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dayIndex = DAY_ORDER.indexOf(cellInfo.day);
    if (dayIndex >= 0 && weekDates[dayIndex]) {
      return weekDates[dayIndex];
    }
    return null;
  }, [cellInfo, weekDates]);

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const weekday = cellInfo ? translateDay(cellInfo.day) : "";
  // Map session to short format: Sáng, Chiều, Tối
  const sessionName = React.useMemo(() => {
    if (!cellInfo) return "";
    const sessionMap: Record<string, string> = {
      Morning: "Sáng",
      Afternoon: "Chiều",
      Evening: "Tối",
    };
    return sessionMap[cellInfo.session] || "";
  }, [cellInfo]);

  const [lessonTitle, setLessonTitle] = useState<string>("");
  const [rating, setRating] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<StudentItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  // Fetch students when classId and schoolYearId are available
  useEffect(() => {
    if (!isOpen || !classId || !schoolYearId) {
      setStudents([]);
      setStudentsError(null);
      return;
    }

    const loadStudents = async () => {
      setStudentsError(null);
      try {
        const fetchedStudents = await fetchStudentsByClass(classId, schoolYearId);
        setStudents(fetchedStudents);
      } catch (error) {
        console.error("Failed to fetch students:", error);
        setStudentsError(error instanceof Error ? error.message : "Không thể tải danh sách học sinh");
        setStudents([]);
      }
    };

    loadStudents();
  }, [isOpen, classId, schoolYearId]);

  // Reset form when dialog closes, and autofill lesson title when opening
  useEffect(() => {
    if (!isOpen) {
      setLessonTitle("");
      setRating("");
      setComment("");
      setSelectedStudentId("");
      setSelectedStudents([]);
    } else if (lessonName) {
      // Autofill lesson title from schedule when dialog opens
      setLessonTitle(lessonName);
    }
  }, [isOpen, lessonName]);

  // Handle student selection
  const handleStudentSelect = (studentId: string) => {
    if (!studentId) return;

    const student = students.find((s) => s.id === studentId);
    if (student && !selectedStudents.find((s) => s.id === studentId)) {
      setSelectedStudents([...selectedStudents, student]);
      setSelectedStudentId(""); // Clear selection to allow selecting again
    }
  };

  // Handle student removal
  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter((s) => s.id !== studentId));
  };

  // Get available students (not already selected)
  const availableStudents = students.filter((student) => !selectedStudents.find((s) => s.id === student.id));

  // Build lesson time display: "Thứ Sáu - Sáng - Tiết 3 - 14/11/2025"
  const lessonTimeDisplay = React.useMemo(() => {
    const parts: string[] = [];
    if (weekday) parts.push(weekday);
    if (sessionName) parts.push(sessionName);
    if (cellInfo?.period) parts.push(`Tiết ${cellInfo.period}`);
    if (lessonDate) parts.push(formatDate(lessonDate));
    return parts.join(" - ");
  }, [weekday, sessionName, cellInfo?.period, lessonDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to save the record
    console.log("Lesson Title:", lessonTitle);
    console.log("Rating:", rating);
    console.log("Comment:", comment);
    console.log(
      "Absent Students:",
      selectedStudents.map((s) => ({ id: s.id, name: s.fullName }))
    );
    // Call onSave callback to trigger feedback refetch
    onSave?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-min! outline-0 p-0 gap-0 h-[85vh] flex flex-col pb-6"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Sổ ghi đầu bài</DialogTitle>
          <DialogDescription>Điền thông tin đánh giá tiết học.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-5">
          <div className="space-y-4 pb-6">
            {(lessonTimeDisplay || className || subjectName || teacherName) && (
              <section className="rounded-md border border-border bg-card p-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Thông tin tiết học</h3>
                {lessonTimeDisplay && (
                  <p className="text-sm">
                    <span className="font-medium">Tiết học:</span> {lessonTimeDisplay}
                  </p>
                )}
                {className && <p className="text-sm text-muted-foreground">Lớp: {className}</p>}
                {subjectName && <p className="text-sm text-muted-foreground">Môn học: {subjectName}</p>}
                {teacherName && <p className="text-sm text-muted-foreground">Giáo viên: {teacherName}</p>}
              </section>
            )}
            <form id="lesson-record-form" onSubmit={handleSubmit} className="space-y-4 sm:w-120">
              <div className="space-y-2 px-1">
                <label htmlFor="lessonTitle" className="text-sm font-medium">
                  Tên bài học
                </label>
                <input
                  id="lessonTitle"
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  placeholder="Nhập tên bài học"
                />
              </div>

              <div className="space-y-2 px-1">
                <label className="text-sm font-medium">Xếp loại giờ học</label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn xếp loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tốt">Tốt</SelectItem>
                    <SelectItem value="Khá">Khá</SelectItem>
                    <SelectItem value="Trung bình">Trung bình</SelectItem>
                    <SelectItem value="Yếu">Yếu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 px-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Học sinh vắng mặt</label>
                  {selectedStudents.length > 0 && (
                    <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                      {selectedStudents.length}
                    </span>
                  )}
                </div>
                {!classId ? (
                  <p className="text-sm text-muted-foreground">Vui lòng chọn lớp trong dialog chính</p>
                ) : (
                  <>
                    <StudentCombobox
                      options={availableStudents.map((student) => ({
                        value: student.id,
                        label: `${student.fullName} (${student.studentCode})`,
                      }))}
                      value={selectedStudentId}
                      onValueChange={handleStudentSelect}
                      placeholder="Chọn học sinh"
                      className="hover:bg-background hover:text-muted-foreground dark:hover:bg-input/30"
                    />
                    {studentsError && <p className="text-sm text-destructive">{studentsError}</p>}
                    {selectedStudents.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedStudents.map((student) => (
                          <StudentChipWithPopover
                            key={student.id}
                            student={student}
                            onRemove={() => handleRemoveStudent(student.id)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2 px-1">
                <label htmlFor="comment" className="text-sm font-medium">
                  Nhận xét
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
                  placeholder="Nhập nhận xét về tiết học"
                  spellCheck={false}
                />
              </div>

              <DialogFooter className="p-0">
                <Button type="button" variant="outline" onClick={onClose}>
                  Hủy
                </Button>
                <Button type="submit" disabled={!rating}>
                  Lưu
                </Button>
              </DialogFooter>
            </form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
