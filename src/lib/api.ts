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

  return response.json();
}

