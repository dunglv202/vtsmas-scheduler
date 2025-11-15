// Simple in-memory cache with expiration
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  public getKey(prefix: string, ...args: (string | undefined)[]): string {
    return `${prefix}:${args.filter(Boolean).join(":")}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttl || this.defaultTTL),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new ApiCache();

export interface SchoolYear {
  code: string;
  schoolYearId: string;
  tenantId: string;
  currentYear: boolean;
  startDate: string;
  endDate: string;
  firstSemesterStartDate: string;
  firstSemesterEndDate: string;
  secondSemesterStartDate: string;
  secondSemesterEndDate: string;
  principalName: string | null;
  principalId: string | null;
  isActive: boolean;
  description: string | null;
  sort: number;
  id: string;
}

export async function fetchSchoolYears(): Promise<SchoolYear[]> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  const response = await fetch("https://gateway.vtsmas.vn/api/danh-muc-truong/nam-hoc-nha-truong/tat-ca", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Accept-Language": "vi",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch school years: ${response.status} ${response.statusText}. ${errorText}`);
  }

  if (response.status === 204) {
    return [];
  }

  const responseText = await response.text();
  if (!responseText.trim()) {
    return [];
  }

  return JSON.parse(responseText) as SchoolYear[];
}

export interface SubjectItem {
  cateCodeType: string;
  cateCode: string;
  cateName: string;
  parentCateCode: string | null;
  parentCateName: string | null;
  acronymName: string;
  ref1: string | null;
  ref2: string | null;
  ref3: string | null;
  sort: number;
  codeOther: string | null;
  isMoetCode: boolean;
}

export async function fetchSubjects(schoolLevelCode: string = "03"): Promise<SubjectItem[]> {
  const cacheKey = apiCache.getKey("subjects", schoolLevelCode);
  const cached = apiCache.get<SubjectItem[]>(cacheKey);
  if (cached) {
    return cached;
  }
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  const response = await fetch(
    `https://gateway.vtsmas.vn/api/cau-hinh/danh-muc/loai-danh-muc/DM_MON_HOC/${schoolLevelCode}?IsSort=true`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Accept-Language": "vi",
      },
    }
  );

  if (response.status === 204) {
    apiCache.set(cacheKey, []);
    return [];
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch subjects: ${response.status} ${response.statusText}. ${errorText}`);
  }

  const responseText = await response.text();

  if (!responseText.trim()) {
    apiCache.set(cacheKey, []);
    return [];
  }

  const result = JSON.parse(responseText) as SubjectItem[];
  apiCache.set(cacheKey, result, 60 * 60 * 1000);
  return result;
}
import { getStoredTokens } from "./auth";

export interface CurriculumItem {
  id: string;
  name: string;
  period: number;
  subjectCode: string;
  subjectName: string;
  gradeCode: string;
  gradeName: string;
  classId: string;
  className: string;
  schoolYearId: string;
  schoolYearCode: string;
  weekNumber: number;
  weekValue: string;
  note: string;
  [key: string]: unknown;
}

export interface CurriculumResponse {
  totalCount: number;
  items: CurriculumItem[];
}

export interface CurriculumFilter {
  subjectCode?: string;
  gradeCode?: string;
  classId?: string;
  schoolYearId?: string;
  divisiveConfigurationId?: string;
}

export async function fetchCurriculum(filter?: CurriculumFilter): Promise<CurriculumResponse> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  // Build filter items
  const filterItems: Array<{
    value: string;
    propertyName: string;
    comparison: number;
  }> = [];

  if (filter?.subjectCode) {
    filterItems.push({
      value: filter.subjectCode,
      propertyName: "subjectCode",
      comparison: 0,
    });
  }

  if (filter?.gradeCode) {
    filterItems.push({
      value: filter.gradeCode,
      propertyName: "gradeCode",
      comparison: 0,
    });
  }

  if (filter?.classId) {
    filterItems.push({
      value: filter.classId,
      propertyName: "classId",
      comparison: 0,
    });
  }

  if (filter?.schoolYearId) {
    filterItems.push({
      value: filter.schoolYearId,
      propertyName: "schoolYearId",
      comparison: 0,
    });
  }

  if (filter?.divisiveConfigurationId) {
    filterItems.push({
      value: filter.divisiveConfigurationId,
      propertyName: "divisiveConfigurationId",
      comparison: 0,
    });
  }

  const requestBody = {
    filterItems,
    sortThenByItems: [
      {
        sort: "period",
        sortDirection: 0,
        isSortByLastWord: true,
      },
    ],
    skipCount: 0,
    sort: "period",
    maxResultCount: 200,
    sortDirection: 0,
  };

  const response = await fetch("https://gateway.vtsmas.vn/api/can-bo/phan-phoi-chuong-trinh/phan-trang", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens.access_token}`,
      "Accept-Language": "vi",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch curriculum: ${response.status} ${response.statusText}. ${errorText}`);
  }

  return response.json();
}

export interface ClassItem {
  id: string;
  className: string;
  gradeLevelCode: string;
  gradeLevel: string;
  schoolLevel: string;
  schoolLevelCode: string;
  schoolYearId: string;
  schoolYearCode: string;
  [key: string]: unknown;
}

export interface ClassResponse {
  totalCount: number;
  items: ClassItem[];
}

export interface ClassFilter {
  schoolLevelCode?: string;
  schoolYearId?: string;
}

export async function fetchClasses(filter?: ClassFilter): Promise<ClassResponse> {
  const cacheKey = apiCache.getKey("classes", filter?.schoolLevelCode, filter?.schoolYearId);
  const cached = apiCache.get<ClassResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  // Build filter items
  const filterItems: Array<{
    value: string;
    propertyName: string;
    comparison: number;
  }> = [];

  if (filter?.schoolLevelCode) {
    filterItems.push({
      value: filter.schoolLevelCode,
      propertyName: "schoolLevelCode",
      comparison: 0,
    });
  }

  if (filter?.schoolYearId) {
    filterItems.push({
      value: filter.schoolYearId,
      propertyName: "schoolYearId",
      comparison: 0,
    });
  }

  const requestBody = {
    params: {
      filterItems,
      sort: "gradeLevelCode",
      sortDirection: 0,
      sortThenByItems: [
        {
          sort: "sortOrder",
          sortDirection: 1,
          isSortByLastWord: false,
          sortValueFilter: 0,
          isSortFilter: true,
        },
        {
          sort: "sortOrder",
          sortDirection: 0,
          isSortByLastWord: false,
        },
        {
          sort: "className",
          sortDirection: 0,
          isSortByLastWord: false,
        },
      ],
      skipCount: 0,
      maxResultCount: 1000,
    },
    syncDataParam: {
      isSyncData: false,
    },
  };

  const response = await fetch("https://gateway.vtsmas.vn/api/hoc-sinh/lop-hoc/phan-trang", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens.access_token}`,
      "Accept-Language": "vi",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch classes: ${response.status} ${response.statusText}. ${errorText}`);
  }

  const result = await response.json();
  apiCache.set(cacheKey, result, 60 * 60 * 1000);
  return result;
}

export interface TeachingScheduleDetail {
  id: string;
  teachingScheduleId: string;
  classId: string;
  className: string;
  employeeId: string;
  employeeName: string | null;
  gradeCode: string;
  gradeName: string;
  dayOfWeek: number;
  dateStudy: string;
  period: number;
  subjectName: string;
  subjectCode: string;
  distributeProgramId: string;
  distributeProgramName: string;
  distributeProgramPeriod: number;
  beforeDistributeProgramPeriod: number | null;
  divisiveConfigurationId: string | null;
  divisiveConfigurationName: string | null;
  section: number;
  description?: string;
  status?: number;
  isRegisterLearningTool?: boolean;
  toolName?: string | null;
  totalTool?: string | null;
  toolType?: number | null;
  employeeSubstituteId?: string | null;
  employeeSubstituteName?: string | null;
  [key: string]: unknown;
}

export interface TeachingScheduleResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  phoneNumber: string;
  schoolYearId: string;
  schoolYearCode: string;
  schoolLevelCode: string;
  schoolLevel: string | null;
  dateFrom: string;
  dateTo: string;
  weeklyValue: string | null;
  isApproved: boolean;
  tenantId: string;
  teachingScheduleDetailDtos: TeachingScheduleDetail[];
}

export async function fetchTeachingSchedule(
  dateFrom: string | Date,
  dateTo: string | Date,
  employeeId: string,
  schoolYearId: string,
  schoolLevelCode: string = "03"
): Promise<TeachingScheduleResponse | null> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  // Format dates as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // If dateFrom/dateTo are Date objects, convert them
  const fromDate = dateFrom instanceof Date ? formatDate(dateFrom) : dateFrom;
  const toDate = dateTo instanceof Date ? formatDate(dateTo) : dateTo;

  const response = await fetch(
    `https://gateway.vtsmas.vn/api/can-bo/lich-bao-giang/theo-tuan/${fromDate}/${toDate}/${employeeId}/${schoolYearId}/${schoolLevelCode}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Accept-Language": "vi",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch teaching schedule: ${response.status} ${response.statusText}. ${errorText}`);
  }

  // Handle 204 No Content or empty response body
  if (response.status === 204) {
    return null;
  }

  const responseText = await response.text();

  // Handle empty response body (no content)
  if (!responseText.trim()) {
    return null;
  }

  return JSON.parse(responseText) as TeachingScheduleResponse;
}

export interface CreateTeachingScheduleDetailRequest {
  dayOfWeek: number;
  section: number;
  period: number;
  classId: string;
  className: string;
  gradeCode: string;
  gradeName: string;
  subjectCode: string;
  subjectName: string;
  description: string | null;
  divisiveConfigurationId: string | null;
  divisiveConfigurationName: string | null;
  distributeProgramId: string;
  distributeProgramPeriod: string;
  isRegisterLearningTool: boolean;
  toolName: string | null;
  totalTool: string | null;
  toolType: number | null;
  distributeProgramName: string;
  status: number;
  employeeSubstituteId: string;
  teachingScheduleId: string;
  dateStudy: string;
  employeeId: string;
  employeeName: string;
  employeeSubstituteName: string;
}

export interface CreateTeachingScheduleRequest {
  employeeName: string;
  employeeId: string;
  employeeCode: string;
  phoneNumber: string;
  schoolYearId: string;
  schoolLevelCode: string;
  schoolYearCode: string;
  dateFrom: string;
  dateTo: string;
  teachingScheduleDetails: Array<{
    dayOfWeek: number;
    section: number;
    period: number;
    classId: string;
    className: string;
    gradeCode: string;
    gradeName: string;
    subjectCode: string;
    subjectName: string;
    description: string | null;
    divisiveConfigurationId: string | null;
    divisiveConfigurationName: string | null;
    distributeProgramId: string;
    distributeProgramPeriod: string;
    isRegisterLearningTool: boolean;
    toolName: string | null;
    totalTool: string | null;
    toolType: number | null;
    distributeProgramName: string;
    status: number;
    employeeSubstituteId: string | null;
    dateStudy: string;
  }>;
}

export async function createTeachingScheduleDetail(payload: CreateTeachingScheduleDetailRequest): Promise<void> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  const response = await fetch("https://gateway.vtsmas.vn/api/can-bo/lich-bao-giang/tao/tung-chi-tiet", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      "Accept-Language": "vi",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create teaching schedule detail: ${response.status} ${response.statusText}. ${errorText}`
    );
  }
}

export async function createTeachingSchedule(
  payload: CreateTeachingScheduleRequest
): Promise<TeachingScheduleResponse | null> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  const response = await fetch("https://gateway.vtsmas.vn/api/can-bo/lich-bao-giang/tao", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      "Accept-Language": "vi",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok && response.status !== 204) {
    const errorText = await response.text();
    throw new Error(`Failed to create teaching schedule: ${response.status} ${response.statusText}. ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  return JSON.parse(text) as TeachingScheduleResponse;
}

export async function deleteTeachingScheduleDetails(
  teachingScheduleId: string,
  scheduleDetailIds: string[]
): Promise<void> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  if (scheduleDetailIds.length === 0) {
    throw new Error("No schedule detail IDs provided for deletion.");
  }

  const response = await fetch(`https://gateway.vtsmas.vn/api/can-bo/lich-bao-giang/xoa/${teachingScheduleId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      "Accept-Language": "vi",
    },
    body: JSON.stringify(scheduleDetailIds),
  });

  if (!response.ok && response.status !== 204) {
    const errorText = await response.text();
    throw new Error(
      `Failed to delete teaching schedule details: ${response.status} ${response.statusText}. ${errorText}`
    );
  }
}

export interface LessonFeedbackRequest {
  schoolYearId: string;
  schoolLevelCode: string;
  classId: string;
  dateFrom: string;
  dateTo: string;
  dateStudy: string;
}

export interface LessonFeedbackStudent {
  studentId: string;
  studentName: string;
  name: string;
}

export interface LessonFeedbackDetail {
  id: string;
  creatorId: string;
  schoolYearId: string;
  schoolYearCode: string;
  schoolLevelCode: string;
  lessonAssessmentBookId: string;
  classId: string;
  className: string;
  dayOfWeek: number;
  section: number;
  dateStudy: string;
  period: number;
  subjectName: string;
  subjectCode: string;
  distributeProgramName: string;
  distributeProgramPeriod: number;
  divisiveConfigurationId: string | null;
  divisiveConfigurationName: string | null;
  status: number;
  studentSkipCount: number;
  studentNames: LessonFeedbackStudent[];
  teachingAssignmentId: string;
  teachingAssignmentName: string;
  configLessonAssessmentBookId: string;
  teachingComment: string;
  userFullName: string;
}

export interface LessonFeedbackResponse {
  id: string;
  classId: string;
  className: string;
  schoolYearId: string;
  schoolYearCode: string;
  schoolLevelCode: string;
  dateFrom: string;
  dateTo: string;
  weeklyValue: string | null;
  lessonAssessmentBookDetails: LessonFeedbackDetail[];
}

export async function fetchLessonFeedback(payload: LessonFeedbackRequest): Promise<LessonFeedbackResponse | null> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  const response = await fetch("https://gateway.vtsmas.vn/api/can-bo/so-dau-bai/theo-ngay", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      "Accept-Language": "vi",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 204) {
      return null;
    }
    const errorText = await response.text();
    throw new Error(`Failed to fetch lecture feedback: ${response.status} ${response.statusText}. ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  return JSON.parse(text) as LessonFeedbackResponse;
}

export interface EmployeeInfo {
  id: string;
  name: string;
  code: string;
  identificationCode: string | null;
  alias: string | null;
  fullName: string;
  phone: string;
  imageSrc: string;
  signatureSrc: string;
  facultyId: string;
  facultyName: string;
  birthDate: string;
  homeTown: string | null;
  contractTypeCode: string;
  contractTypeName: string;
  subjectTaughtCode: string;
  subjectTaughtName: string;
  birthPlace: string | null;
  genderCode: string;
  genderName: string;
  joinedDate: string;
  isLeader: boolean;
  isNew: boolean;
  identityNumber: string;
  identityIssuedDate: string | null;
  identityIssuedPlace: string | null;
  email: string;
  nation: string;
  nationName: string;
  religion: string;
  religionName: string;
  healthStatus: string | null;
  mainLevelTeachingCode: string;
  mainLevelTeachingName: string;
  statusCode: string;
  statusName: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  communeCode: string | null;
  communeName: string | null;
  insuranceNumber: string | null;
  tenantId: string;
  employeeId: string;
  [key: string]: unknown;
}

export async function fetchEmployeeInfo(employeeId: string, schoolYearId: string): Promise<EmployeeInfo> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  const response = await fetch(`https://gateway.vtsmas.vn/api/can-bo/v2/${employeeId}/${schoolYearId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Accept-Language": "vi",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch employee info: ${response.status} ${response.statusText}. ${errorText}`);
  }

  if (response.status === 204) {
    throw new Error("No employee information found");
  }

  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error("Empty response from employee info API");
  }

  return JSON.parse(responseText) as EmployeeInfo;
}

export interface ApprovalHistoryItem {
  id: string;
  isApprove: boolean;
  teachingScheduleId: string;
  approverId: string;
  approverName: string;
  approveDate: string;
  note: string;
  tenantId: string;
  modId: number;
}

export async function fetchApprovalHistory(weekTeachingScheduleId: string): Promise<ApprovalHistoryItem[]> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  const response = await fetch(
    `https://gateway.vtsmas.vn/api/can-bo/lich-bao-giang/lich-su-phe-duyet/${weekTeachingScheduleId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Accept-Language": "vi",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch approval history: ${response.status} ${response.statusText}. ${errorText}`);
  }

  // Handle 204 No Content or empty response body
  if (response.status === 204) {
    return [];
  }

  const responseText = await response.text();

  // Handle empty response body (no content)
  if (!responseText.trim()) {
    return [];
  }

  return JSON.parse(responseText) as ApprovalHistoryItem[];
}

export interface StudentItem {
  id: string;
  studentCode: string;
  fullName: string;
  dateOfBirth: string;
  genderCode: string;
  imageSrc: string;
  classId: string;
  className: string;
  isExemptedFull: boolean;
  statusCode: string;
  status: string;
  fullNameOther: string | null;
  ethnicCode: string;
  policyTargetCode: string;
  priorityEncourageCode: string | null;
  syncCode: string;
  syncCodeClass: string | null;
  identifyNumber: string;
  studentClassId: string;
  sortOrder: number;
  name: string;
  sortOrderByClass: number;
  gradeCode: string;
  enrolmentDate: string;
}

export async function fetchStudentsByClass(classId: string, schoolYearId: string): Promise<StudentItem[]> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  const response = await fetch(
    `https://gateway.vtsmas.vn/api/hoc-sinh/lay-hoc-sinh-theo-lop/${classId}/${schoolYearId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Accept-Language": "vi",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch students: ${response.status} ${response.statusText}. ${errorText}`);
  }

  // Handle 204 No Content or empty response body
  if (response.status === 204) {
    return [];
  }

  const responseText = await response.text();

  // Handle empty response body (no content)
  if (!responseText.trim()) {
    return [];
  }

  return JSON.parse(responseText) as StudentItem[];
}

export interface DivisiveConfigurationItem {
  id: string;
  name: string;
  subjectCode: string;
  subjectName: string;
  gradeCodes: string[];
  schoolYearId: string;
  schoolYearCode: string;
  schoolLevelCode: string;
  schoolLevelName: string;
  tenantId: string;
  acronymName: string;
  numberLessionSemester1: number;
  numberLessionSemester2: number;
  modId: number;
}

export interface DivisiveConfigurationFilter {
  schoolLevelCode: string;
  gradeCode: string;
  schoolYearId: string;
}

export async function fetchDivisiveConfiguration(
  filter: DivisiveConfigurationFilter
): Promise<DivisiveConfigurationItem[]> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  const url = new URL("https://gateway.vtsmas.vn/api/danh-muc-truong/cau-hinh-phan-mon/danh-sach");
  url.searchParams.append("schoolLevelCode", filter.schoolLevelCode);
  url.searchParams.append("gradeCode", filter.gradeCode);
  url.searchParams.append("schoolYearId", filter.schoolYearId);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      "Accept-Language": "vi",
    },
    body: JSON.stringify([]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch divisive configuration: ${response.status} ${response.statusText}. ${errorText}`);
  }

  // Handle 204 No Content or empty response body
  if (response.status === 204) {
    return [];
  }

  const responseText = await response.text();

  // Handle empty response body (no content)
  if (!responseText.trim()) {
    return [];
  }

  return JSON.parse(responseText) as DivisiveConfigurationItem[];
}

export interface LessonRatingConfig {
  id: string;
  schoolYearId: string;
  schoolYearCode: string;
  schoolLevelCode: string;
  name: string;
  point: number;
  note: string;
}

export async function fetchLessonRatingConfigs(
  schoolYearId: string,
  schoolLevelCode: string
): Promise<LessonRatingConfig[]> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  const url = `https://gateway.vtsmas.vn/api/can-bo/so-dau-bai/danh-sach-cau-hinh-so-dau-bai-v2/${schoolYearId}/${schoolLevelCode}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      "Accept-Language": "vi",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch lesson rating configs: ${response.status} ${response.statusText}. ${errorText}`);
  }

  if (response.status === 204) {
    return [];
  }

  const responseText = await response.text();
  if (!responseText.trim()) {
    return [];
  }

  return JSON.parse(responseText) as LessonRatingConfig[];
}

export interface SaveLessonFeedbackRequest {
  id?: string;
  dateFrom: string;
  dateTo: string;
  schoolYearId: string;
  schoolLevelCode: string;
  lessonAssessmentBookId?: string;
  classId: string;
  className: string;
  dayOfWeek: number;
  section: number;
  dateStudy: string;
  period: number;
  subjectName: string;
  subjectCode: string;
  distributeProgramName: string;
  distributeProgramPeriod: number;
  divisiveConfigurationId: string | null;
  divisiveConfigurationName: string | null;
  status: number;
  studentSkipCount: number;
  studentNames: Array<{
    studentName: string;
    name: string;
    studentId: string;
  }>;
  teachingAssignmentId: string;
  teachingAssignmentName: string;
  configLessonAssessmentBookId: string;
  teachingComment: string;
}

export async function saveLessonFeedback(payload: SaveLessonFeedbackRequest): Promise<void> {
  const tokens = getStoredTokens();
  if (!tokens?.access_token) {
    throw new Error("No access token found. Please login first.");
  }

  const url = "https://gateway.vtsmas.vn/api/can-bo/so-dau-bai/them-sua-so-dau-bai";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      "Accept-Language": "vi",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save lesson feedback: ${response.status} ${response.statusText}. ${errorText}`);
  }
}
