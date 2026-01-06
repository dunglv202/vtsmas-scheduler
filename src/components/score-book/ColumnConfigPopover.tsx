import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2 } from "lucide-react";

interface TableGroup {
  groupCode: string;
  groupName: string;
  points: Array<{
    pointGroupCode: string;
    pointCode: string;
    pointName: string;
  }>;
}

interface ColumnConfigPopoverProps {
  tableStructure: { groups: TableGroup[]; allPoints: Array<{ groupCode: string; pointCode: string }> };
  visibleColumns: Set<string>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onToggleColumn: (columnKey: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function ColumnConfigPopover({
  tableStructure,
  visibleColumns,
  isOpen: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onToggleColumn,
  onSelectAll,
  onDeselectAll,
}: ColumnConfigPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" title="Cấu hình cột">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="font-semibold">Hiển thị cột</div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-4">
              {tableStructure.groups.map((group) => (
                <div key={group.groupCode} className="space-y-1">
                  <div className="font-medium text-sm text-muted-foreground">{group.groupName}</div>
                  {group.points.map((point) => {
                    const columnKey = `${point.pointGroupCode}-${point.pointCode}`;
                    const isVisible = visibleColumns.has(columnKey);
                    return (
                      <div
                        key={columnKey}
                        className="flex items-center space-x-2 hover:bg-muted/50 p-1 rounded cursor-pointer"
                        onClick={() => onToggleColumn(columnKey)}
                      >
                        <Checkbox
                          id={columnKey}
                          checked={isVisible}
                          onCheckedChange={(checked: boolean) => {
                            if (checked !== isVisible) {
                              onToggleColumn(columnKey);
                            }
                          }}
                        />
                        <Label htmlFor={columnKey} className="text-sm cursor-pointer flex-1">
                          {point.pointName}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              Chọn tất cả
            </Button>
            <Button variant="outline" size="sm" onClick={onDeselectAll}>
              Bỏ chọn tất cả
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

