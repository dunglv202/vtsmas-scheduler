interface NotesFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function NotesField({ value, onChange }: NotesFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="notes" className="text-sm font-medium">
        Ghi chú
      </label>
      <textarea
        id="notes"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
        placeholder="Ghi chú thêm (không bắt buộc)"
        spellCheck={false}
      />
    </div>
  );
}

