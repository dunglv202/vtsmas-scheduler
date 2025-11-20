import type { LessonFeedbackDetail, LessonRatingConfig } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

interface FeedbackSectionProps {
  shouldShow: boolean;
  isLoading: boolean;
  feedback: LessonFeedbackDetail | null;
  error: string | null;
  ratingConfigs: LessonRatingConfig[];
}

export function FeedbackSection({ shouldShow, isLoading, feedback, error, ratingConfigs }: FeedbackSectionProps) {
  if (!shouldShow) {
    return null;
  }

  // Find the rating name from configLessonAssessmentBookId
  const ratingName = feedback?.configLessonAssessmentBookId
    ? ratingConfigs.find((config) => config.id === feedback.configLessonAssessmentBookId)?.name
    : null;

  return (
    <section className="rounded-md border border-border bg-card p-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Sổ ghi đầu bài</h3>
      {isLoading ? (
        <div className="h-24 w-full bg-muted rounded-md flex items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : feedback ? (
        <>
          {feedback.distributeProgramName && (
            <p className="text-sm">
              <span className="font-medium">Tiết {feedback.distributeProgramPeriod}:</span>{" "}
              {feedback.distributeProgramName}
            </p>
          )}
          {ratingName && <p className="text-sm text-muted-foreground">Đánh giá giờ học: {ratingName}</p>}
          {feedback.teachingComment && (
            <p className="text-sm text-muted-foreground">Nhận xét: {feedback.teachingComment}</p>
          )}
        </>
      ) : null}
    </section>
  );
}
