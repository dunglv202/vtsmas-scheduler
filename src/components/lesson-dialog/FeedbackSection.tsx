import type { LessonFeedbackDetail } from "@/lib/api";

interface FeedbackSectionProps {
  shouldShow: boolean;
  isLoading: boolean;
  feedback: LessonFeedbackDetail | null;
  error: string | null;
}

export function FeedbackSection({ shouldShow, isLoading, feedback, error }: FeedbackSectionProps) {
  if (!shouldShow) {
    return null;
  }

  return (
    <section className="rounded-md border border-border bg-card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Nhận xét tiết dạy</h3>
        <p className="text-xs text-muted-foreground">Dữ liệu lấy từ sổ đầu bài tuần.</p>
      </div>
      {isLoading ? (
        <div className="h-24 w-full bg-muted rounded-md" />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : feedback ? (
        <div className="space-y-3 text-sm">
          <div>
            <div className="font-medium text-foreground">Tiết {feedback.distributeProgramPeriod}</div>
            <div className="text-muted-foreground text-xs">{feedback.distributeProgramName}</div>
          </div>
          {feedback.teachingComment && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nhận xét của giáo viên
              </div>
              <div className="text-sm text-foreground">{feedback.teachingComment}</div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
