import type { SubjectItem } from "@/lib/api";
import { Combobox } from "@/components/ui/combobox";

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
  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  const options = subjects.map((subject) => ({
    value: subject.cateCode,
    label: subject.cateName,
  }));

  return (
    <Combobox
      options={options}
      value={selectedSubjectCode}
      onValueChange={onChange}
      placeholder={isLoading ? "Đang tải môn học..." : "Chọn môn học"}
      disabled={isLoading}
    />
  );
}

