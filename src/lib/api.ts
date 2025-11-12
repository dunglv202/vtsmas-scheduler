// Simple in-memory cache with expiration
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  private getKey(prefix: string, ...args: (string | undefined)[]): string {
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
  dateFrom: string,
  dateTo: string,
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
