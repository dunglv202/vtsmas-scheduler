import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import React from "react";

interface LectureRecordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export function LectureRecordDialog({ isOpen, onClose, onSave }: LectureRecordDialogProps) {
  const [rating, setRating] = useState<string>("");
  const [comment, setComment] = useState<string>("");

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setRating("");
      setComment("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to save the record
    console.log("Rating:", rating);
    console.log("Comment:", comment);
    // Call onSave callback to trigger feedback refetch
    onSave?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-min! outline-0 p-0 gap-0 h-[85vh] flex flex-col pb-6"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Sổ ghi đầu bài</DialogTitle>
          <DialogDescription>Điền thông tin đánh giá tiết học.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-5">
          <div className="space-y-6 pb-6">
            <form id="lesson-record-form" onSubmit={handleSubmit} className="space-y-4 sm:w-120">
              <div className="space-y-2 px-1">
                <label className="text-sm font-medium">Xếp loại giờ học</label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn xếp loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tốt">Tốt</SelectItem>
                    <SelectItem value="Khá">Khá</SelectItem>
                    <SelectItem value="Trung bình">Trung bình</SelectItem>
                    <SelectItem value="Yếu">Yếu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 px-1">
                <label htmlFor="comment" className="text-sm font-medium">
                  Nhận xét
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
                  placeholder="Nhập nhận xét về tiết học"
                  spellCheck={false}
                />
              </div>

              <DialogFooter className="p-0">
                <Button type="button" variant="outline" onClick={onClose}>
                  Hủy
                </Button>
                <Button type="submit" disabled={!rating}>
                  Lưu
                </Button>
              </DialogFooter>
            </form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

