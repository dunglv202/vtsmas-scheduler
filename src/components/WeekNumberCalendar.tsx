import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { vi } from "date-fns/locale";
import { useEffect, useState, useMemo } from "react";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import { fetchSchoolYearDateRange, type SchoolYearDateRange } from "@/lib/api";

// Calculate week number based on school year start date
// The first week starts on the Monday of the week containing minDate
// Returns null if the date is before the school year start
function calculateWeekNumber(date: Date, minDate: Date): number | null {
  // Get Monday of the week containing minDate
  const minDateDayOfWeek = minDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const mondayOffset = minDateDayOfWeek === 0 ? -6 : 1 - minDateDayOfWeek;
  const schoolYearStartMonday = new Date(minDate);
  schoolYearStartMonday.setDate(minDate.getDate() + mondayOffset);
  schoolYearStartMonday.setHours(0, 0, 0, 0);

  // Get Monday of the week containing the given date
  const dateDayOfWeek = date.getDay();
  const dateMondayOffset = dateDayOfWeek === 0 ? -6 : 1 - dateDayOfWeek;
  const dateMonday = new Date(date);
  dateMonday.setDate(date.getDate() + dateMondayOffset);
  dateMonday.setHours(0, 0, 0, 0);

  // Calculate difference in weeks
  const diffTime = dateMonday.getTime() - schoolYearStartMonday.getTime();
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));

  // Week numbers start from 1, return null for dates before school year start
  const weekNum = diffWeeks + 1;
  return weekNum >= 1 ? weekNum : null;
}

interface WeekNumberCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date | undefined) => void;
  month: Date;
  onMonthChange: (month: Date) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  className?: string;
}

export function WeekNumberCalendar({
  selectedDate,
  onDateSelect,
  month,
  onMonthChange,
  isOpen,
  onOpenChange,
  triggerLabel,
  className,
}: WeekNumberCalendarProps) {
  const { schoolYear } = useSchoolYear();
  const [schoolYearDateRange, setSchoolYearDateRange] = useState<SchoolYearDateRange | null>(null);

  // Fetch school year date range for week number calculation
  useEffect(() => {
    if (!schoolYear) return;

    const loadDateRange = async () => {
      try {
        const dateRange = await fetchSchoolYearDateRange(schoolYear.schoolYearId);
        setSchoolYearDateRange(dateRange);
      } catch (error) {
        console.error("Failed to fetch school year date range:", error);
      }
    };
    loadDateRange();
  }, [schoolYear]);

  // Calculate week number for the selected date
  const selectedWeekNumber = useMemo(() => {
    if (!schoolYearDateRange) return null;

    const minDate = new Date(schoolYearDateRange.minDate);
    const maxDate = new Date(schoolYearDateRange.maxDate);

    // Get Monday of the week containing selectedDate
    const selectedDateDayOfWeek = selectedDate.getDay();
    const mondayOffset = selectedDateDayOfWeek === 0 ? -6 : 1 - selectedDateDayOfWeek;
    const weekStartDate = new Date(selectedDate);
    weekStartDate.setDate(selectedDate.getDate() + mondayOffset);
    weekStartDate.setHours(0, 0, 0, 0);

    // Check if the week is outside the school year range
    const maxDateDayOfWeek = maxDate.getDay();
    const sundayOffset = maxDateDayOfWeek === 0 ? 0 : 7 - maxDateDayOfWeek;
    const schoolYearEndSunday = new Date(maxDate);
    schoolYearEndSunday.setDate(maxDate.getDate() + sundayOffset);
    schoolYearEndSunday.setHours(23, 59, 59, 999);

    // Don't show week number if the week is outside school year range
    if (weekStartDate < minDate || weekStartDate > schoolYearEndSunday) {
      return null;
    }

    return calculateWeekNumber(weekStartDate, minDate);
  }, [selectedDate, schoolYearDateRange]);

  // Format the trigger label with week number at the end
  const displayLabel = useMemo(() => {
    if (selectedWeekNumber !== null && selectedWeekNumber >= 1) {
      return `${triggerLabel} - Tuần ${selectedWeekNumber}`;
    }
    return triggerLabel;
  }, [triggerLabel, selectedWeekNumber]);

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full md:w-[280px] justify-start text-left font-normal ${className || ""}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          month={month}
          onMonthChange={onMonthChange}
          weekStartsOn={1}
          locale={vi}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
