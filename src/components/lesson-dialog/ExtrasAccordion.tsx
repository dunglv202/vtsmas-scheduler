import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
        <AccordionTrigger className="py-4">Thông tin bổ sung</AccordionTrigger>
        <AccordionContent className="pt-0">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Loại tiết dạy</label>
              <select
                value={lectureType}
                onChange={(event) => setLectureType(event.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
              >
                <option value="">Chọn loại tiết dạy</option>
                <option value="Dạy chính">Dạy chính</option>
                <option value="Dạy thay">Dạy thay</option>
                <option value="Dạy bù">Dạy bù</option>
              </select>
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
                    className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Loại thiết bị</label>
                  <select
                    value={equipmentType}
                    onChange={(event) => setEquipmentType(event.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  >
                    <option value="">Chọn loại thiết bị</option>
                    <option value="tại lớp">Tại lớp</option>
                    <option value="tự làm">Tự làm</option>
                    <option value="Phòng trực ban">Phòng trực ban</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

