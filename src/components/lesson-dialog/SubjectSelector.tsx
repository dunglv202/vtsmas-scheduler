import type { SubjectItem } from "@/lib/api";

interface SubjectSelectorProps {
  subjects: SubjectItem[];
  selectedSubjectCode: string;
  isLoading: boolean;
  error: string | null;
  onChange: (value: string) => void;
}

export function SubjectSelector({
  subjects,
  selectedSubjectCode,
  isLoading,
  error,
  onChange,
}: SubjectSelectorProps) {
  if (isLoading) {
    return <div className="h-24 w-full bg-muted rounded-md" />;
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  return (
    <select
      id="subject"
      value={selectedSubjectCode}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
    >
      <option value="">Chọn môn học</option>
      {subjects.map((subject) => (
        <option key={subject.cateCode} value={subject.cateCode}>
          {subject.cateName}
        </option>
      ))}
    </select>
  );
}

