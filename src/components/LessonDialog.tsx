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
    isUnscheduling,
    unscheduleError,
    handleUnschedule,
    canUnschedule,
  } = useLessonDialog({
    isOpen,
    initialData,
    cellInfo,
    weekDates,
    teachingScheduleId,
    employeeName,
    onSave,
  });

  const cardLoading = feedbackState.isLoading || previousLectureState.isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[500px] outline-0 p-0 gap-0 h-[90vh] flex flex-col"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>Điền thông tin tiết học cho khung giờ này.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-5">
          {cardLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="mr-3 size-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm text-muted-foreground">Đang tải...</span>
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              <FeedbackSection
                shouldShow={shouldShowFeedback}
                isLoading={false}
                feedback={feedbackState.feedback}
                error={feedbackState.feedbackError}
              />

              <form id="lesson-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2 px-1">
                  <label className="text-sm font-medium">Lớp</label>
                  <ClassSelector
                    classes={classState.classes}
                    selectedClassId={classState.selectedClassId}
                    isLoading={classState.isLoading}
                    error={classState.error}
                    onSelect={classState.onSelect}
                  />
                </div>

                <div className="space-y-2 px-1">
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
                  <div className="space-y-2 px-1">
                    <label className="text-sm font-medium">Tiết dạy trước</label>
                    <PreviousLectureCard
                      previousLecture={previousLectureState.previousLecture}
                      isLoading={false}
                    />
                  </div>
                )}

                <NotesField value={notes} onChange={setNotes} />

                <div className="-mt-5">
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
                </div>

                {saveError && (
                  <p className="text-sm text-destructive" role="alert">
                    {saveError}
                  </p>
                )}

                {unscheduleError && (
                  <p className="text-sm text-destructive" role="alert">
                    {unscheduleError}
                  </p>
                )}
              </form>
            </div>
          )}
        </ScrollArea>

        {!cardLoading && (
          <DialogFooter className="px-6 pb-6 pt-4 shrink-0">
            {canUnschedule && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleUnschedule}
                disabled={isUnscheduling || isSaving}
              >
                {isUnscheduling ? "Đang xóa..." : "Hủy lịch"}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving || isUnscheduling}>
              Hủy
            </Button>
            <Button type="submit" form="lesson-form" disabled={isSaving || isUnscheduling}>
              {isSaving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
