import type { TeachingScheduleDetail } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { formatDateForPreviousLecture, formatPeriodLabel, getSessionName } from "./utils";

interface PreviousLectureCardProps {
  previousLecture: TeachingScheduleDetail | null;
  isLoading: boolean;
}

export function PreviousLectureCard({ previousLecture, isLoading }: PreviousLectureCardProps) {
  if (isLoading) {
    return (
      <div className="h-23 w-full bg-muted rounded-md flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!previousLecture) {
    return (
      <div className="text-sm text-muted-foreground p-3 border border-border rounded-md bg-muted h-23 flex items-center">
        Không tìm thấy tiết dạy trước
      </div>
    );
  }

  const { day, month, weekday } = formatDateForPreviousLecture(previousLecture.dateStudy);

  return (
    <div className="flex gap-3 p-2.5 border border-border rounded-md bg-muted h-23 items-center">
      <div className="shrink-0 w-18 h-18 bg-background border-2 border-border rounded-md flex flex-col items-center justify-center shadow-sm gap-0.5">
        <div className="text-xs font-semibold text-muted-foreground uppercase leading-tight">{weekday}</div>
        <div className="text-xl font-bold text-foreground leading-none">{day}</div>
        <div className="text-xs font-semibold text-muted-foreground uppercase leading-tight">{month}</div>
      </div>
      <div className="flex-1 flex flex-col justify-center space-y-1">
        <div className="text-sm font-semibold text-foreground">
          {previousLecture.className} - {getSessionName(previousLecture.section, previousLecture.dateStudy)} - Tiết{" "}
          {previousLecture.period}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatPeriodLabel(previousLecture.distributeProgramPeriod)} - {previousLecture.distributeProgramName}
        </div>
      </div>
    </div>
  );
}
