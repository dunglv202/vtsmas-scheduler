import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus } from "lucide-react";

interface ExtrasAccordionProps {
  lectureType: string;
  setLectureType: (value: string) => void;
  equipmentName: string;
  setEquipmentName: (value: string) => void;
  equipmentQuantity: string;
  setEquipmentQuantity: (value: string) => void;
  equipmentType: string;
  setEquipmentType: (value: string) => void;
  extrasAccordionValue?: string;
  setExtrasAccordionValue: (value: string | undefined) => void;
}

export function ExtrasAccordion({
  lectureType,
  setLectureType,
  equipmentName,
  setEquipmentName,
  equipmentQuantity,
  setEquipmentQuantity,
  equipmentType,
  setEquipmentType,
  extrasAccordionValue,
  setExtrasAccordionValue,
}: ExtrasAccordionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      value={extrasAccordionValue}
      onValueChange={(value: string | undefined) => setExtrasAccordionValue(value)}
    >
      <AccordionItem value="extras" className="border-b-0">
        <AccordionTrigger className="py-4 focus:ring-0 focus:outline-none">
          <span>Thông tin bổ sung</span>
          {extrasAccordionValue === "extras" ? (
            <Minus className="h-4 w-4 shrink-0" />
          ) : (
            <Plus className="h-4 w-4 shrink-0" />
          )}
        </AccordionTrigger>
        <AccordionContent className="pt-0">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Loại tiết dạy</label>
              <Select
                value={lectureType || undefined}
                onValueChange={(value) => setLectureType(value || "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn loại tiết dạy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dạy chính">Dạy chính</SelectItem>
                  <SelectItem value="Dạy thay">Dạy thay</SelectItem>
                  <SelectItem value="Dạy bù">Dạy bù</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tên thiết bị</label>
                  <input
                    type="text"
                    value={equipmentName}
                    onChange={(event) => setEquipmentName(event.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    placeholder="Ví dụ: Máy chiếu"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Số lượng</label>
                  <input
                    type="number"
                    min="0"
                    value={equipmentQuantity}
                    onChange={(event) => setEquipmentQuantity(event.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Loại thiết bị</label>
                  <Select
                    value={equipmentType || undefined}
                    onValueChange={(value) => setEquipmentType(value || "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn loại thiết bị" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tại lớp">Tại lớp</SelectItem>
                      <SelectItem value="tự làm">Tự làm</SelectItem>
                      <SelectItem value="Phòng trực ban">Phòng trực ban</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

