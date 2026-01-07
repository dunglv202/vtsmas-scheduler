import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WeekNumberCalendar } from "@/components/WeekNumberCalendar";
import { Filter, RefreshCw } from "lucide-react";
import type { ClassItem } from "@/lib/api";

// Format week range for display (e.g., "1-7 Thg 9, 2025" or "28 Thg 8 - 3 Thg 9, 2025")
function formatWeekRange(weekDates: Date[]): string {
  const monday = weekDates[0];
  const sunday = weekDates[6];
  const months = [
    "Thg 1",
    "Thg 2",
    "Thg 3",
    "Thg 4",
    "Thg 5",
    "Thg 6",
    "Thg 7",
    "Thg 8",
    "Thg 9",
    "Thg 10",
    "Thg 11",
    "Thg 12",
  ];

  // If both dates are in the same month, use compact format: "1-7 Thg 9, 2025"
  if (monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()) {
    return `${monday.getDate()}-${sunday.getDate()} ${months[sunday.getMonth()]}, ${sunday.getFullYear()}`;
  }

  // Otherwise, use full format: "28 Thg 8 - 3 Thg 9, 2025"
  const mondayStr = `${monday.getDate()} ${months[monday.getMonth()]}`;
  const sundayStr = `${sunday.getDate()} ${months[sunday.getMonth()]}, ${sunday.getFullYear()}`;

  return `${mondayStr} - ${sundayStr}`;
}

interface ScheduleToolbarProps {
  weekDates: Date[];
  selectedClasses: Set<string>;
  classes: ClassItem[];
  isLoadingClasses: boolean;
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  calendarMonth: Date;
  setCalendarMonth: (month: Date) => void;
  isCalendarOpen: boolean;
  setIsCalendarOpen: (open: boolean) => void;
  scheduleError: string | null;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onReload: () => void;
  onDateSelect: (date: Date | undefined) => void;
  onToggleClassFilter: (className: string) => void;
  onClearClassFilter: () => void;
}

export function ScheduleToolbar({
  weekDates,
  selectedClasses,
  classes,
  isLoadingClasses,
  isFilterOpen,
  setIsFilterOpen,
  calendarMonth,
  setCalendarMonth,
  isCalendarOpen,
  setIsCalendarOpen,
  scheduleError,
  onPreviousWeek,
  onNextWeek,
  onToday,
  onReload,
  onDateSelect,
  onToggleClassFilter,
  onClearClassFilter,
}: ScheduleToolbarProps) {
  return (
    <div className="p-2 md:p-4 mb-4">
      <h1 className="text-xl md:text-3xl font-bold text-center mb-3 md:mb-4">Thời khóa biểu giảng dạy</h1>

      {/* Filters and Week Selector */}
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
        {/* Class Filter */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-1 md:gap-2 w-auto md:w-40 justify-center relative px-2 md:px-4">
              <Filter className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline truncate">Lọc theo lớp</span>
              {selectedClasses.size > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 md:px-2 py-0.5 text-xs shrink-0">
                  {selectedClasses.size}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Lọc theo lớp</h4>
                {selectedClasses.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={onClearClassFilter} className="h-7 text-xs">
                    Xóa
                  </Button>
                )}
              </div>
              {isLoadingClasses ? (
                <div className="text-sm text-muted-foreground py-2">Đang tải danh sách lớp...</div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-1 pr-4">
                    {classes.map((classItem) => {
                      const isSelected = selectedClasses.has(classItem.className);
                      return (
                        <button
                          key={classItem.id}
                          type="button"
                          onClick={() => onToggleClassFilter(classItem.className)}
                          className={`
                            w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                            ${
                              isSelected
                                ? "bg-accent text-accent-foreground font-medium"
                                : "hover:bg-accent text-foreground"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`
                                w-4 h-4 border-2 rounded flex items-center justify-center
                                ${isSelected ? "bg-primary border-primary" : "border-border"}
                              `}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3 text-primary-foreground"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span>{classItem.className}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Week Navigation - Mobile: Stack vertically, Desktop: Horizontal */}
        <div className="flex items-center gap-1 md:gap-2 w-full md:w-auto justify-center flex-wrap">
          <Button
            onClick={onPreviousWeek}
            variant="outline"
            aria-label="Tuần trước"
            size="sm"
            className="text-xs md:text-sm px-2 md:px-4 shrink-0"
          >
            <span className="hidden md:inline">← </span>Trước
          </Button>

          <div className="flex-1 md:flex-initial min-w-0">
            <WeekNumberCalendar
              selectedDate={weekDates[0]}
              onDateSelect={onDateSelect}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              isOpen={isCalendarOpen}
              onOpenChange={setIsCalendarOpen}
              triggerLabel={formatWeekRange(weekDates)}
            />
          </div>

          <Button
            onClick={onNextWeek}
            variant="outline"
            aria-label="Tuần sau"
            size="sm"
            className="text-xs md:text-sm px-2 md:px-4 shrink-0"
          >
            Sau<span className="hidden md:inline"> →</span>
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 md:gap-2 w-full md:w-auto justify-center">
          <Button
            onClick={onToday}
            variant="default"
            size="sm"
            className="text-xs md:text-sm px-2 md:px-4 flex-1 md:flex-initial"
          >
            Hôm nay
          </Button>

          <Button
            onClick={onReload}
            variant="outline"
            aria-label="Tải lại thời khóa biểu"
            size="sm"
            className="px-2 md:px-4"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {scheduleError && <div className="text-center text-xs md:text-sm text-destructive mt-2">Lỗi: {scheduleError}</div>}
    </div>
  );
}

