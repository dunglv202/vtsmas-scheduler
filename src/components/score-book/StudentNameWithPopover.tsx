import { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { StudentItem } from "@/lib/api";

interface StudentNameWithPopoverProps {
  studentName: string;
  student: StudentItem | undefined;
}

export function StudentNameWithPopover({ studentName, student }: StudentNameWithPopoverProps) {
  const [open, setOpen] = useState(false);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Only show popover if we have student details
  if (!student) {
    return <span>{studentName}</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className="cursor-pointer hover:text-primary transition-colors"
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          {studentName}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-64"
        side="right"
        align="center"
        sideOffset={8}
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

