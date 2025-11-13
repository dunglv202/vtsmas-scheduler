import type { ClassItem } from "@/lib/api";

interface ClassSelectorProps {
  classes: ClassItem[];
  selectedClassId: string;
  isLoading: boolean;
  error: string | null;
  onSelect: (classId: string) => void;
}

export function ClassSelector({ classes, selectedClassId, isLoading, error, onSelect }: ClassSelectorProps) {
  if (isLoading) {
    return <div className="h-24 w-full bg-muted rounded-md" />;
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {classes.map((classItem) => (
        <button
          key={classItem.id}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelect(classItem.id);
          }}
          className={`
            px-2 py-1.5 border-2 rounded-md cursor-pointer text-center text-xs
            transition-all duration-200
            ${
              selectedClassId === classItem.id
                ? "bg-primary text-primary-foreground border-primary font-semibold"
                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
            }
          `}
        >
          {classItem.className}
        </button>
      ))}
    </div>
  );
}

