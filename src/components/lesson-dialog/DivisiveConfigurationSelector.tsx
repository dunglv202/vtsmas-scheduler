import type { DivisiveConfigurationItem } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DivisiveConfigurationSelectorProps {
  divisiveConfigurationList: DivisiveConfigurationItem[];
  selectedDivisiveConfigurationId: string;
  isLoading: boolean;
  error: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DivisiveConfigurationSelector({
  divisiveConfigurationList,
  selectedDivisiveConfigurationId,
  isLoading,
  error,
  onChange,
  disabled,
}: DivisiveConfigurationSelectorProps) {
  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  const placeholder = isLoading ? "Đang tải phân môn..." : disabled ? "Chọn lớp và môn học trước" : "Chọn phân môn";

  return (
    <Select
      value={selectedDivisiveConfigurationId}
      onValueChange={onChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {divisiveConfigurationList.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

