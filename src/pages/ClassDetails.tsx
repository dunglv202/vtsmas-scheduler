import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { useSchoolYear } from "@/contexts/SchoolYearContext";
import { useEmployee } from "@/contexts/EmployeeContext";
import {
  fetchClasses,
  fetchStudentsByClass,
  fetchTeachingSchedule,
  fetchSchoolYearDateRange,
  type ClassItem,
  type StudentItem,
  type SchoolYearDateRange,
} from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ClassDetails() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { schoolYear } = useSchoolYear();
  const { employee } = useEmployee();
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [teachingHistory, setTeachingHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("details");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMoreWeeks, setIsLoadingMoreWeeks] = useState(false);
  const [earliestWeekMonday, setEarliestWeekMonday] = useState<Date | null>(null);
  const [hasMoreWeeks, setHasMoreWeeks] = useState(true);
  const [schoolYearDateRange, setSchoolYearDateRange] = useState<SchoolYearDateRange | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { activeStudents, inactiveStudents } = useMemo(() => {
    const isActive = (student: StudentItem) => student.status === "Đang học" || student.statusCode === "01";

    const active = students.filter(isActive);
    const inactive = students.filter((student) => !isActive(student));

    return { activeStudents: active, inactiveStudents: inactive };
  }, [students]);

  const renderStudentCard = (student: StudentItem, options?: { showStatus?: boolean }) => (
    <div key={student.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      {student.imageSrc ? (
        <img src={student.imageSrc} alt={student.fullName} className="w-12 h-12 rounded-full object-cover" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
          {student.fullName.charAt(0).toUpperCase()}
        </div>
      )}
      <div>
        <p className="font-medium">{student.fullName}</p>
        {student.studentCode && <p className="text-muted-foreground text-xs">Mã: {student.studentCode}</p>}
        {options?.showStatus && (
          <p className="text-muted-foreground text-xs mt-1">{student.status || "Không rõ trạng thái"}</p>
        )}
      </div>
    </div>
  );

  // Fetch school year date range for week number calculation
  useEffect(() => {
    if (!schoolYear) return;

    const loadDateRange = async () => {
      try {
        const dateRange = await fetchSchoolYearDateRange(schoolYear.schoolYearId);
        setSchoolYearDateRange(dateRange);
      } catch (error) {
        console.error("Failed to fetch school year date range:", error);
      }
    };
    loadDateRange();
  }, [schoolYear]);

  // Calculate week number based on school year start date
  const calculateWeekNumber = (date: Date, minDate: Date): number | null => {
    const minDateDayOfWeek = minDate.getDay();
    const mondayOffset = minDateDayOfWeek === 0 ? -6 : 1 - minDateDayOfWeek;
    const schoolYearStartMonday = new Date(minDate);
    schoolYearStartMonday.setDate(minDate.getDate() + mondayOffset);
    schoolYearStartMonday.setHours(0, 0, 0, 0);

    const dateDayOfWeek = date.getDay();
    const dateMondayOffset = dateDayOfWeek === 0 ? -6 : 1 - dateDayOfWeek;
    const dateMonday = new Date(date);
    dateMonday.setDate(date.getDate() + dateMondayOffset);
    dateMonday.setHours(0, 0, 0, 0);

    const diffTime = dateMonday.getTime() - schoolYearStartMonday.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    const weekNum = diffWeeks + 1;
    return weekNum >= 1 ? weekNum : null;
  };

  // Get weekday name in Vietnamese
  const getWeekdayName = (date: Date): string => {
    const dayNames = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    return dayNames[date.getDay()];
  };

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

  // Fetch teaching history when history tab is active
  useEffect(() => {
    // Only fetch when history tab is active
    if (activeTab !== "history") {
      return;
    }

    if (!schoolYear || !employee || !classId) {
      setIsLoadingHistory(false);
      return;
    }

    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Get Monday and Sunday for a given date
    const getWeekDates = (date: Date): { monday: Date; sunday: Date } => {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(date);
      monday.setDate(date.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      return { monday, sunday };
    };

    const loadTeachingHistory = async () => {
      setIsLoadingHistory(true);
      try {
        // Get current week and previous week (initial load: 2 weeks)
        const now = new Date();
        const currentWeek = getWeekDates(now);
        const previousWeekStart = new Date(currentWeek.monday);
        previousWeekStart.setDate(currentWeek.monday.getDate() - 7);
        const previousWeek = getWeekDates(previousWeekStart);

        console.log("Fetching teaching history for 2 weeks:", {
          week1: { from: formatDate(currentWeek.monday), to: formatDate(currentWeek.sunday) },
          week2: { from: formatDate(previousWeek.monday), to: formatDate(previousWeek.sunday) },
          employeeId: employee.employeeId,
          classId,
        });

        // Fetch both weeks in parallel
        const [week1Response, week2Response] = await Promise.all([
          fetchTeachingSchedule(
            formatDate(currentWeek.monday),
            formatDate(currentWeek.sunday),
            employee.employeeId,
            schoolYear.schoolYearId,
            "03"
          ),
          fetchTeachingSchedule(
            formatDate(previousWeek.monday),
            formatDate(previousWeek.sunday),
            employee.employeeId,
            schoolYear.schoolYearId,
            "03"
          ),
        ]);

        console.log("Teaching schedule responses:", { week1: week1Response, week2: week2Response });

        // Combine and filter lessons from both weeks
        const allLessons: any[] = [];

        if (week1Response && week1Response.teachingScheduleDetailDtos) {
          week1Response.teachingScheduleDetailDtos
            .filter((detail) => detail.classId === classId)
            .forEach((detail) => {
              allLessons.push({
                ...detail,
                scheduleId: week1Response.id,
                dateFrom: week1Response.dateFrom,
                dateTo: week1Response.dateTo,
              });
            });
        }

        if (week2Response && week2Response.teachingScheduleDetailDtos) {
          week2Response.teachingScheduleDetailDtos
            .filter((detail) => detail.classId === classId)
            .forEach((detail) => {
              allLessons.push({
                ...detail,
                scheduleId: week2Response.id,
                dateFrom: week2Response.dateFrom,
                dateTo: week2Response.dateTo,
              });
            });
        }

        // Sort by dateStudy descending (latest first)
        allLessons.sort((a, b) => {
          const dateA = new Date(a.dateStudy).getTime();
          const dateB = new Date(b.dateStudy).getTime();
          return dateB - dateA;
        });

        console.log("Teaching history loaded:", allLessons.length, "lessons for class", classId);
        setTeachingHistory(allLessons);
        setEarliestWeekMonday(previousWeek.monday); // Track the earliest week loaded
        setHasMoreWeeks(true); // Assume there might be more weeks
      } catch (err) {
        console.error("Failed to fetch teaching history:", err);
        setTeachingHistory([]);
        setHasMoreWeeks(false);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadTeachingHistory();
  }, [schoolYear, employee, classId, activeTab]);

  // Load more weeks handler
  const handleLoadMoreWeeks = async () => {
    if (!schoolYear || !employee || !classId || !earliestWeekMonday || !hasMoreWeeks) return;

    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const getWeekDates = (date: Date): { monday: Date; sunday: Date } => {
      const dayOfWeek = date.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(date);
      monday.setDate(date.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      return { monday, sunday };
    };

    setIsLoadingMoreWeeks(true);
    try {
      const previousWeekStart = new Date(earliestWeekMonday);
      previousWeekStart.setDate(earliestWeekMonday.getDate() - 7);
      const previousWeek = getWeekDates(previousWeekStart);

      console.log("Loading more weeks:", {
        from: formatDate(previousWeek.monday),
        to: formatDate(previousWeek.sunday),
      });

      const response = await fetchTeachingSchedule(
        formatDate(previousWeek.monday),
        formatDate(previousWeek.sunday),
        employee.employeeId,
        schoolYear.schoolYearId,
        "03"
      );

      if (response && response.teachingScheduleDetailDtos && response.teachingScheduleDetailDtos.length > 0) {
        const newLessons = response.teachingScheduleDetailDtos
          .filter((detail) => detail.classId === classId)
          .map((detail) => ({
            ...detail,
            scheduleId: response.id,
            dateFrom: response.dateFrom,
            dateTo: response.dateTo,
          }));

        if (newLessons.length > 0) {
          setTeachingHistory((prev) => {
            const combined = [...prev, ...newLessons];
            combined.sort((a, b) => {
              const dateA = new Date(a.dateStudy).getTime();
              const dateB = new Date(b.dateStudy).getTime();
              return dateB - dateA;
            });
            return combined;
          });
        }
        setEarliestWeekMonday(previousWeek.monday);
      } else {
        setHasMoreWeeks(false);
      }
    } catch (err) {
      console.error("Failed to load more weeks:", err);
      setHasMoreWeeks(false);
    } finally {
      setIsLoadingMoreWeeks(false);
    }
  };

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
    <div className="w-full">
      <div className="mb-6">
        <Button onClick={() => navigate("/classes")} variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
        <h1 className="text-2xl font-bold">{classItem.className}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="details">Thông tin lớp học</TabsTrigger>
          <TabsTrigger value="history">Lịch dạy của tôi</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Thông tin lớp học</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Tên lớp</p>
                <p className="font-medium">{classItem.className}</p>
              </div>
              {classItem.gradeLevel && (
                <div>
                  <p className="text-muted-foreground text-sm">Khối</p>
                  <p className="font-medium">{classItem.gradeLevel}</p>
                </div>
              )}
              {(classItem.teacherName || classItem.homeroomTeacherName) && (
                <div>
                  <p className="text-muted-foreground text-sm">Giáo viên chủ nhiệm</p>
                  <p className="font-medium">{classItem.teacherName || classItem.homeroomTeacherName}</p>
                </div>
              )}
              {classItem.schoolLevel && (
                <div>
                  <p className="text-muted-foreground text-sm">Cấp học</p>
                  <p className="font-medium">{classItem.schoolLevel}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4 mt-8">
              Danh sách học sinh{" "}
              {!isLoadingStudents && <span className="text-muted-foreground">({activeStudents.length})</span>}
            </h3>
            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-3" />
                <span className="text-sm text-muted-foreground">Đang tải danh sách học sinh...</span>
              </div>
            ) : students.length > 0 ? (
              <>
                {activeStudents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {activeStudents.map((student) => renderStudentCard(student))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Không có học sinh đang học.</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Chưa có học sinh nào</p>
            )}
          </div>

          {!isLoadingStudents && inactiveStudents.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4">
                Đã thôi học <span className="text-muted-foreground">({inactiveStudents.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {inactiveStudents.map((student) => renderStudentCard(student, { showStatus: true }))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Lịch sử giảng dạy của tôi</h2>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="mr-3" />
              <span className="text-sm text-muted-foreground">Đang tải lịch sử giảng dạy...</span>
            </div>
          ) : teachingHistory.length > 0 ? (
            <div className="space-y-0">
              {teachingHistory.map((detail, index) => {
                const dateStudy = new Date(detail.dateStudy);
                const weekdayName = getWeekdayName(dateStudy);
                const weekNumber =
                  schoolYearDateRange && calculateWeekNumber(dateStudy, new Date(schoolYearDateRange.minDate));

                return (
                  <div key={detail.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{detail.subjectName}</p>
                          {weekNumber && (
                            <span className="text-muted-foreground text-xs shrink-0">Tuần {weekNumber}</span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs mb-1">
                          {weekdayName}, {dateStudy.toLocaleDateString("vi-VN")} - Tiết {detail.period}
                        </p>
                        {detail.distributeProgramName && (
                          <p className="text-muted-foreground line-clamp-2">
                            {detail.distributeProgramName.length > 64
                              ? `${detail.distributeProgramName.substring(0, 64)}...`
                              : detail.distributeProgramName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {hasMoreWeeks && (
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={handleLoadMoreWeeks}
                    variant="secondary"
                    className="w-full"
                    disabled={isLoadingMoreWeeks}
                  >
                    {isLoadingMoreWeeks ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        Đang tải...
                      </>
                    ) : (
                      "Tải thêm"
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Chưa có lịch sử giảng dạy</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
