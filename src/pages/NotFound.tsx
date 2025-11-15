import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 p-6">
      <div className="text-center space-y-4">
        <h1 className="text-7xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-3xl font-bold">Trang không tìm thấy</h2>
        <p className="text-muted-foreground max-w-md">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển. Vui lòng kiểm tra lại đường dẫn hoặc quay về trang
          chủ.
        </p>
      </div>
      <div className="flex gap-4">
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
        <Button onClick={() => navigate("/")}>
          <Home className="mr-2 h-4 w-4" />
          Về trang chủ
        </Button>
      </div>
    </div>
  );
}
