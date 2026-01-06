import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StudentNameWithPopover } from "./StudentNameWithPopover";
import { cn } from "@/lib/utils";
import type { StudentItem } from "@/lib/api";
import type { ChangeEvent, ClipboardEvent } from "react";

interface TableGroup {
  groupCode: string;
  groupName: string;
  points: Array<{
    pointCode: string;
    pointName: string;
    pointType: number;
  }>;
  showGroupHeader: boolean;
}

interface ScoreTableProps {
  filteredStudents: StudentItem[];
  filteredTableStructure: {
    groups: TableGroup[];
    allPoints: Array<{
      groupCode: string;
      pointCode: string;
      pointType: number;
    }>;
  };
  isEditMode: boolean;
  getScoreValue: (studentId: string, groupCode: string, pointCode: string, pointType?: number) => string;
  getScoreChangeType: (
    studentId: string,
    groupCode: string,
    pointCode: string,
    pointType?: number
  ) => "modified" | "new" | "removed" | null;
  onScoreChange: (studentId: string, groupCode: string, pointCode: string, value: string) => void;
  onScoreBlur: (studentId: string, groupCode: string, pointCode: string, pointType: number, value: string) => void;
  onPaste: (
    e: ClipboardEvent<HTMLInputElement>,
    startStudentId: string,
    startGroupCode: string,
    startPointCode: string
  ) => void;
}

export function ScoreTable({
  filteredStudents,
  filteredTableStructure,
  isEditMode,
  getScoreValue,
  getScoreChangeType,
  onScoreChange,
  onScoreBlur,
  onPaste,
}: ScoreTableProps) {
  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <Table>
        <TableHeader className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
          {/* Group headers row */}
          <TableRow>
            <TableHead rowSpan={2} className="bg-muted/50">
              STT
            </TableHead>
            <TableHead rowSpan={2} className="bg-muted/50">
              Họ và tên
            </TableHead>
            {filteredTableStructure.groups.map(({ groupCode, groupName, points, showGroupHeader }) =>
              showGroupHeader ? (
                <TableHead key={`group-${groupCode}`} colSpan={points.length} className="text-center bg-muted/50">
                  {groupName}
                </TableHead>
              ) : (
                // For single-point groups, show point name with rowSpan={2}
                points.map((point) => (
                  <TableHead
                    key={`single-${groupCode}-${point.pointCode}`}
                    rowSpan={2}
                    className="text-center bg-muted/50"
                  >
                    {point.pointName}
                  </TableHead>
                ))
              )
            )}
          </TableRow>
          {/* Point code headers row */}
          <TableRow>
            {filteredTableStructure.groups.map(
              ({ groupCode, points, showGroupHeader }) =>
                showGroupHeader
                  ? points.map((point) => (
                      <TableHead
                        key={`point-${groupCode}-${point.pointCode}`}
                        className="text-center bg-muted/30"
                      >
                        {point.pointName}
                      </TableHead>
                    ))
                  : null // Single-point groups already rendered in first row with rowSpan={2}
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredStudents.map((student, index) => {
            return (
              <TableRow key={student.id}>
                <TableCell className="text-center">{index + 1}</TableCell>
                <TableCell>
                  <StudentNameWithPopover studentName={student.fullName} student={student} />
                </TableCell>
                {filteredTableStructure.allPoints.map(({ groupCode, pointCode, pointType }) => {
                  const value = getScoreValue(student.id, groupCode, pointCode, pointType);
                  const changeType = getScoreChangeType(student.id, groupCode, pointCode, pointType);
                  const isCommentField = pointType === 4;
                  const isAverageField = pointType === 2;
                  return (
                    <TableCell key={`${student.id}-${groupCode}-${pointCode}`} className="text-center p-1.5">
                      <Input
                        type="text"
                        value={value}
                        readOnly={!isEditMode || isAverageField}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onScoreChange(student.id, groupCode, pointCode, e.target.value)
                        }
                        onBlur={(e) => onScoreBlur(student.id, groupCode, pointCode, pointType, e.target.value)}
                        onPaste={(e: ClipboardEvent<HTMLInputElement>) =>
                          onPaste(e, student.id, groupCode, pointCode)
                        }
                        className={cn(
                          "h-8",
                          isCommentField ? "w-52 text-left" : "w-14 text-center",
                          isAverageField && "font-bold",
                          isEditMode && !isAverageField
                            ? "border border-input bg-background focus:border-ring focus:ring-ring/50 focus:ring-[3px]"
                            : "border-0 bg-transparent cursor-default shadow-none",
                          changeType === "modified" &&
                            "bg-blue-50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600",
                          changeType === "new" && "bg-green-50 dark:bg-green-950/30 border-green-400 dark:border-green-600",
                          changeType === "removed" && "bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-600"
                        )}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

