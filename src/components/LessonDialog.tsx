import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClassSelector } from "./lesson-dialog/ClassSelector";
import { SubjectSelector } from "./lesson-dialog/SubjectSelector";
import { LessonSelector } from "./lesson-dialog/LessonSelector";
import { PreviousLectureCard } from "./lesson-dialog/PreviousLectureCard";
import { NotesField } from "./lesson-dialog/NotesField";
import { ExtrasAccordion } from "./lesson-dialog/ExtrasAccordion";
import { FeedbackSection } from "./lesson-dialog/FeedbackSection";
import { useLessonDialog } from "./lesson-dialog/useLessonDialog";
import type { LessonInfo, ScheduleCell } from "./lesson-dialog/types";
export type { LessonInfo, LessonEquipment, ScheduleCell } from "./lesson-dialog/types";

interface LessonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lessonInfo: LessonInfo) => void;
  initialData?: LessonInfo;
  cellInfo: ScheduleCell | null;
  weekDates?: Date[];
  teachingScheduleId?: string | null;
  employeeName?: string | null;
}

export function LessonDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
  cellInfo,
  weekDates,
  teachingScheduleId,
  employeeName,
}: LessonDialogProps) {
  const {
    dialogTitle,
    classState,
    subjectState,
    lessonState,
    previousLectureState,
    feedbackState,
    extrasState,
    notes,
    setNotes,
    shouldShowFeedback,
    saveError,
    isSaving,
    handleSubmit,
  } = useLessonDialog({
    isOpen,
    initialData,
    cellInfo,
    weekDates,
    teachingScheduleId,
    employeeName,
    onSave,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[500px] max-h-[95vh] flex flex-col overflow-hidden outline-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>Điền thông tin tiết học cho khung giờ này.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto px-1 scrollbar-surface">
          <FeedbackSection
            shouldShow={shouldShowFeedback}
            isLoading={feedbackState.isLoading}
            feedback={feedbackState.feedback}
            error={feedbackState.feedbackError}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lớp</label>
              <ClassSelector
                classes={classState.classes}
                selectedClassId={classState.selectedClassId}
                isLoading={classState.isLoading}
                error={classState.error}
                onSelect={classState.onSelect}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Môn học</label>
              <SubjectSelector
                subjects={subjectState.subjects}
                selectedSubjectCode={subjectState.selectedSubjectCode}
                isLoading={subjectState.isLoading}
                error={subjectState.error}
                onChange={subjectState.onChange}
              />
            </div>

            <LessonSelector
              lessons={lessonState.lessons}
              selectedLessonId={lessonState.selectedLessonId}
              isLoading={lessonState.isLoading}
              error={lessonState.error}
              selectedClassId={classState.selectedClassId}
              selectedSubjectCode={subjectState.selectedSubjectCode}
              onChange={lessonState.onChange}
            />

            {classState.selectedClassId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Tiết dạy trước</label>
                <PreviousLectureCard
                  previousLecture={previousLectureState.previousLecture}
                  isLoading={previousLectureState.isLoading}
                />
              </div>
            )}

            <NotesField value={notes} onChange={setNotes} />

            <ExtrasAccordion
              lectureType={extrasState.lectureType}
              setLectureType={extrasState.setLectureType}
              equipmentName={extrasState.equipmentName}
              setEquipmentName={extrasState.setEquipmentName}
              equipmentQuantity={extrasState.equipmentQuantity}
              setEquipmentQuantity={extrasState.setEquipmentQuantity}
              equipmentType={extrasState.equipmentType}
              setEquipmentType={extrasState.setEquipmentType}
              extrasAccordionValue={extrasState.extrasAccordionValue}
              setExtrasAccordionValue={extrasState.setExtrasAccordionValue}
            />

            {saveError && (
              <p className="text-sm text-destructive" role="alert">
                {saveError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

