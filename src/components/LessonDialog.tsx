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
import { DivisiveConfigurationSelector } from "./lesson-dialog/DivisiveConfigurationSelector";
import { LessonSelector } from "./lesson-dialog/LessonSelector";
import { PreviousLectureCard } from "./lesson-dialog/PreviousLectureCard";
import { NotesField } from "./lesson-dialog/NotesField";
import { ExtrasAccordion } from "./lesson-dialog/ExtrasAccordion";
import { FeedbackSection } from "./lesson-dialog/FeedbackSection";
import { useLessonDialog } from "./lesson-dialog/useLessonDialog";
import type { LessonInfo, ScheduleCell } from "./lesson-dialog/types";
import { BookmarkIcon } from "lucide-react";
import type { ApprovalHistoryItem } from "@/lib/api";
import { LectureRecordDialog } from "./lesson-dialog/LectureRecordDialog";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import React from "react";
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
  approvalHistory?: ApprovalHistoryItem[];
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
  approvalHistory = [],
}: LessonDialogProps) {
  const { schoolYear } = useSchoolYear();
  // Check if the latest approval is true
  const isApproved = React.useMemo(() => {
    if (!approvalHistory || approvalHistory.length === 0) return false;
    // Sort by approveDate descending to get the latest
    const sorted = [...approvalHistory].sort(
      (a, b) => new Date(b.approveDate).getTime() - new Date(a.approveDate).getTime()
    );
    return sorted[0]?.isApprove === true;
  }, [approvalHistory]);

  // Check if schedule is already added (exists in the schedule)
  const addedSchedule = Boolean(initialData?.scheduleDetailId);

  const [isRecordDialogOpen, setIsRecordDialogOpen] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const {
    dialogTitle,
    classState,
    subjectState,
    divisiveConfigurationState,
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
    isBookmarked,
    handleToggleBookmark,
    refetchFeedback,
  } = useLessonDialog({
    isOpen,
    initialData,
    cellInfo,
    weekDates,
    teachingScheduleId,
    employeeName,
    onSave,
  });

  // Scroll to top when feedback is updated after refetch
  const prevFeedbackLoadingRef = React.useRef(feedbackState.isLoading);
  React.useEffect(() => {
    // If feedback was loading and now it's not, scroll to top
    if (prevFeedbackLoadingRef.current && !feedbackState.isLoading) {
      // Use setTimeout to ensure DOM is updated after React re-render
      setTimeout(() => {
        // Find the viewport element and scroll to top
        const viewport = scrollAreaRef.current?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
        if (viewport) {
          viewport.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 100);
    }
    prevFeedbackLoadingRef.current = feedbackState.isLoading;
  }, [feedbackState.isLoading]);

  // Compute lecture attributes from lecture state (not from feedback)
  const lectureLessonName = React.useMemo(() => {
    if (lessonState.lessons.length > 0 && lessonState.selectedLessonId) {
      const selectedLesson = lessonState.lessons.find((lesson) => lesson.id === lessonState.selectedLessonId);
      return selectedLesson?.name || "";
    }
    return "";
  }, [lessonState.lessons, lessonState.selectedLessonId]);

  const lectureDistributeProgramPeriod = React.useMemo(() => {
    if (lessonState.lessons.length > 0 && lessonState.selectedLessonId) {
      const selectedLesson = lessonState.lessons.find((lesson) => lesson.id === lessonState.selectedLessonId);
      return selectedLesson?.period;
    } else if (lessonState.manualPeriod) {
      const periodNumber = parseInt(lessonState.manualPeriod, 10);
      return isNaN(periodNumber) ? undefined : periodNumber;
    }
    return cellInfo?.period;
  }, [lessonState.lessons, lessonState.selectedLessonId, lessonState.manualPeriod, cellInfo?.period]);

  const lectureDivisiveConfigurationId = React.useMemo(() => {
    if (divisiveConfigurationState.selectedDivisiveConfigurationId === "__DEFAULT__") {
      return null;
    }
    return divisiveConfigurationState.selectedDivisiveConfigurationId || null;
  }, [divisiveConfigurationState.selectedDivisiveConfigurationId]);

  const lectureDivisiveConfigurationName = React.useMemo(() => {
    if (divisiveConfigurationState.selectedDivisiveConfigurationId === "__DEFAULT__") {
      return "Chính";
    }
    const selectedConfig = divisiveConfigurationState.divisiveConfigurationList.find(
      (item) => item.id === divisiveConfigurationState.selectedDivisiveConfigurationId
    );
    return selectedConfig?.name || "Chính";
  }, [
    divisiveConfigurationState.divisiveConfigurationList,
    divisiveConfigurationState.selectedDivisiveConfigurationId,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-min! outline-0 p-0 gap-0 h-[85vh] flex flex-col pb-6"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>Điền thông tin tiết học cho khung giờ này.</DialogDescription>
        </DialogHeader>

        <div ref={scrollAreaRef} className="flex-1 min-h-0">
          <ScrollArea className="h-full px-5">
            <div className="space-y-6 pb-6">
              <FeedbackSection
                shouldShow={shouldShowFeedback}
                isLoading={feedbackState.isLoading}
                feedback={feedbackState.feedback}
                error={feedbackState.feedbackError}
              />

              <form id="lesson-form" onSubmit={handleSubmit} className="space-y-4 sm:w-120">
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

                <div className="space-y-2 px-1">
                  <label className="text-sm font-medium">Phân môn</label>
                  <DivisiveConfigurationSelector
                    divisiveConfigurationList={divisiveConfigurationState.divisiveConfigurationList}
                    selectedDivisiveConfigurationId={divisiveConfigurationState.selectedDivisiveConfigurationId}
                    isLoading={divisiveConfigurationState.isLoading}
                    error={divisiveConfigurationState.error}
                    onChange={divisiveConfigurationState.onChange}
                    disabled={!classState.selectedClassId || !subjectState.selectedSubjectCode}
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
                  manualPeriod={lessonState.manualPeriod}
                  onManualPeriodChange={lessonState.onManualPeriodChange}
                />

                {classState.selectedClassId && (
                  <div className="space-y-2 px-1">
                    <label className="text-sm font-medium">Tiết dạy trước</label>
                    <PreviousLectureCard
                      previousLecture={previousLectureState.previousLecture}
                      isLoading={previousLectureState.isLoading}
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

                <DialogFooter className="p-0">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={handleToggleBookmark}
                    title={isBookmarked ? "Xóa mẫu đã lưu" : "Lưu mẫu"}
                  >
                    <BookmarkIcon className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} />
                  </Button>
                  {!isApproved && (
                    <>
                      {addedSchedule && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleUnschedule}
                          disabled={isUnscheduling || isSaving}
                        >
                          {isUnscheduling ? "Đang xóa..." : "Hủy lịch"}
                        </Button>
                      )}
                      <Button
                        type="submit"
                        disabled={
                          isSaving ||
                          isUnscheduling ||
                          (lessonState.lessons.length > 0
                            ? !lessonState.selectedLessonId
                            : !lessonState.manualPeriod.trim())
                        }
                      >
                        {isSaving ? "Đang lưu..." : "Lưu"}
                      </Button>
                    </>
                  )}
                  {addedSchedule && (
                    <Button type="button" onClick={() => setIsRecordDialogOpen(true)}>
                      Sổ ghi đầu bài
                    </Button>
                  )}
                </DialogFooter>
              </form>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>

      <LectureRecordDialog
        isOpen={isRecordDialogOpen}
        onClose={() => setIsRecordDialogOpen(false)}
        onSave={() => {
          refetchFeedback();
        }}
        classId={classState.selectedClassId}
        schoolYearId={schoolYear?.schoolYearId || ""}
        schoolLevelCode={classState.classes.find((c) => c.id === classState.selectedClassId)?.schoolLevelCode || ""}
        className={classState.classes.find((c) => c.id === classState.selectedClassId)?.className || ""}
        subjectName={subjectState.subjects.find((s) => s.cateCode === subjectState.selectedSubjectCode)?.cateName || ""}
        subjectCode={subjectState.selectedSubjectCode || ""}
        lessonName={lectureLessonName}
        teachingAssignmentId={feedbackState.feedback?.teachingAssignmentId || teachingScheduleId || ""}
        feedbackId={feedbackState.feedback?.id}
        distributeProgramPeriod={lectureDistributeProgramPeriod}
        divisiveConfigurationId={lectureDivisiveConfigurationId}
        divisiveConfigurationName={lectureDivisiveConfigurationName}
        feedback={feedbackState.feedback}
        cellInfo={cellInfo}
        weekDates={weekDates}
        teacherName={employeeName || ""}
      />
    </Dialog>
  );
}
