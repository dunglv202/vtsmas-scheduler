import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input, InputPassword } from "@/components/ui/input";
import { useEmployee } from "@/contexts/EmployeeContext";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import { login, TOKEN_STORAGE_KEY } from "@/lib/auth";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { refresh: refreshSchoolYear } = useSchoolYear();
  const { refresh: refreshEmployee } = useEmployee();
  const authenticated = !!localStorage.getItem(TOKEN_STORAGE_KEY);

  if (authenticated) {
    return <Navigate to="/teaching-schedule" />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
      // Fetch school year and employee info after successful login
      await refreshSchoolYear();
      await refreshEmployee();
      // Redirect to teaching schedule after successful login
      navigate("/teaching-schedule");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi đăng nhập");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 md:p-10">
      <div>
        <img src="/smas_logo.png" alt="VTSMAS Logo" className="h-10" />
      </div>
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-6">
          <Card className="shadow-none border-none">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Đăng nhập vào tài khoản</CardTitle>
              <CardDescription>Sử dụng thông tin từ vtsmas.vn</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="username">Tên đăng nhập</FieldLabel>
                    <Input id="username" required onChange={(e) => setUsername(e.target.value)} tabIndex={1} />
                  </Field>
                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
                      <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline" tabIndex={4}>
                        Quên mật khẩu?
                      </a>
                    </div>
                    <InputPassword id="password" required onChange={(e) => setPassword(e.target.value)} tabIndex={2} />
                  </Field>
                  {error && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="text-sm text-red-800">{error}</div>
                    </div>
                  )}
                  <Field>
                    <Button type="submit" disabled={isLoading} tabIndex={3}>
                      {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </Button>
                  </Field>
                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    Hoặc tiếp tục với
                  </FieldSeparator>
                  <Field>
                    <Button variant="outline" type="button">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor"
                        />
                      </svg>
                      Đăng nhập bằng Google
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
          <FieldDescription className="px-6 text-center">
            Bằng việc nhấn Tiếp tục, bạn đồng ý với <a href="#">Điều khoản Dịch vụ</a> và{" "}
            <a href="#">Chính sách Quyền riêng tư</a> của chúng tôi.
          </FieldDescription>
        </div>
      </div>
    </div>
  );
}
