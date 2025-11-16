import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import { useEmployee } from "@/contexts/EmployeeContext";
import {
  fetchClasses,
  fetchStudentsByClass,
  fetchTeachingSchedule,
  type ClassItem,
  type StudentItem,
  type TeachingScheduleResponse,
} from "@/lib/api";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function ClassDetails() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { schoolYear } = useSchoolYear();
  const { employee } = useEmployee();
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [teachingHistory, setTeachingHistory] = useState<TeachingScheduleResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch class details
  useEffect(() => {
    if (!schoolYear || !classId) return;

    const loadClass = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchClasses({
          schoolLevelCode: "03",
          schoolYearId: schoolYear.schoolYearId,
        });
        const foundClass = response.items.find((cls) => cls.id === classId);
        if (foundClass) {
          setClassItem(foundClass);
        } else {
          setError("Không tìm thấy lớp học");
        }
      } catch (err) {
        console.error("Failed to fetch class:", err);
        setError(err instanceof Error ? err.message : "Không thể tải thông tin lớp học");
      } finally {
        setIsLoading(false);
      }
    };

    loadClass();
  }, [schoolYear, classId]);

  // Fetch students
  useEffect(() => {
    if (!schoolYear || !classId) return;

    const loadStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const studentList = await fetchStudentsByClass(classId, schoolYear.schoolYearId);
        setStudents(studentList);
      } catch (err) {
        console.error("Failed to fetch students:", err);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    loadStudents();
  }, [schoolYear, classId]);

  // Fetch teaching history
  useEffect(() => {
    if (!schoolYear || !employee || !classId) return;

    const loadTeachingHistory = async () => {
      setIsLoadingHistory(true);
      try {
        // Get current date range for the school year
        const now = new Date();
        const startOfYear = new Date(schoolYear.startDate);
        const endOfYear = new Date(schoolYear.endDate);

        // Fetch teaching schedule for the entire school year
        const fromDate = startOfYear < now ? startOfYear : now;
        const toDate = endOfYear > now ? now : endOfYear;

        const formatDate = (date: Date): string => {
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const day = date.getDate().toString().padStart(2, "0");
          return `${year}-${month}-${day}`;
        };

        const response = await fetchTeachingSchedule(
          formatDate(fromDate),
          formatDate(toDate),
          employee.employeeId,
          schoolYear.schoolYearId,
          "03"
        );

        if (response) {
          // Filter to only include lessons for this class
          const classLessons = response.teachingScheduleDetailDtos.filter((detail) => detail.classId === classId);
          if (classLessons.length > 0) {
            setTeachingHistory([response]);
          } else {
            setTeachingHistory([]);
          }
        } else {
          setTeachingHistory([]);
        }
      } catch (err) {
        console.error("Failed to fetch teaching history:", err);
        setTeachingHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadTeachingHistory();
  }, [schoolYear, employee, classId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="mr-3" />
        <span className="text-sm text-muted-foreground">Đang tải thông tin lớp học...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => navigate("/classes")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại danh sách lớp
          </Button>
        </div>
      </div>
    );
  }

  if (!classItem) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Không tìm thấy lớp học</p>
          <Button onClick={() => navigate("/classes")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại danh sách lớp
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <Button onClick={() => navigate("/classes")} variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
        <h1 className="text-3xl font-bold">{classItem.className}</h1>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Thông tin lớp học</TabsTrigger>
          <TabsTrigger value="history">Lịch dạy của tôi</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card className="p-6 text-sm">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold mb-4">Thông tin lớp học</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Tên lớp</p>
                    <p className="font-medium">{classItem.className}</p>
                  </div>
                  {classItem.gradeLevel && (
                    <div>
                      <p className="text-muted-foreground">Khối</p>
                      <p className="font-medium">{classItem.gradeLevel}</p>
                    </div>
                  )}
                  {(classItem.teacherName || classItem.homeroomTeacherName) && (
                    <div>
                      <p className="text-muted-foreground">Giáo viên chủ nhiệm</p>
                      <p className="font-medium">{classItem.teacherName || classItem.homeroomTeacherName}</p>
                    </div>
                  )}
                  {classItem.schoolLevel && (
                    <div>
                      <p className="text-muted-foreground">Cấp học</p>
                      <p className="font-medium">{classItem.schoolLevel}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-base font-semibold mb-4">
                  Danh sách học sinh{" "}
                  {!isLoadingStudents && <span className="text-muted-foreground">({students.length})</span>}
                </h3>
                {isLoadingStudents ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner className="mr-3" />
                    <span className="text-sm text-muted-foreground">Đang tải danh sách học sinh...</span>
                  </div>
                ) : students.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        {student.imageSrc ? (
                          <img
                            src={student.imageSrc}
                            alt={student.fullName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                            {student.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{student.fullName}</p>
                          {student.studentCode && <p className="text-muted-foreground">Mã: {student.studentCode}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Chưa có học sinh nào</p>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="p-6 text-sm">
            <h2 className="text-base font-semibold mb-4">Lịch sử giảng dạy của tôi</h2>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-3" />
                <span className="text-sm text-muted-foreground">Đang tải lịch sử giảng dạy...</span>
              </div>
            ) : teachingHistory.length > 0 ? (
              <div className="space-y-4">
                {teachingHistory.map((schedule) => (
                  <div key={schedule.id} className="border rounded-lg p-4">
                    <div className="mb-3">
                      <p className="font-semibold">
                        Từ {new Date(schedule.dateFrom).toLocaleDateString("vi-VN")} đến{" "}
                        {new Date(schedule.dateTo).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {schedule.teachingScheduleDetailDtos
                        .filter((detail) => detail.classId === classId)
                        .map((detail) => (
                          <div key={detail.id} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div>
                              <p className="font-medium">{detail.subjectName}</p>
                              <p className="text-muted-foreground">
                                {new Date(detail.dateStudy).toLocaleDateString("vi-VN")} - Tiết {detail.period}
                              </p>
                            </div>
                            {detail.distributeProgramName && (
                              <p className="text-muted-foreground">{detail.distributeProgramName}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Chưa có lịch sử giảng dạy</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
