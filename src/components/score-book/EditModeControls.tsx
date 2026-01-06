import { Button } from "@/components/ui/button";

interface EditModeControlsProps {
  isEditMode: boolean;
  onEnterEditMode: () => void;
  onSaveChanges: () => void;
  onPublish: () => void;
  onDiscardChanges: () => void;
}

export function EditModeControls({
  isEditMode,
  onEnterEditMode,
  onSaveChanges,
  onPublish,
  onDiscardChanges,
}: EditModeControlsProps) {
  if (isEditMode) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onSaveChanges}>
          Lưu thay đổi
        </Button>
        <Button onClick={onPublish}>Xuất bản</Button>
        <Button
          variant="outline"
          onClick={onDiscardChanges}
          className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Hủy thay đổi
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" onClick={onEnterEditMode}>
      Chỉnh sửa
    </Button>
  );
}

