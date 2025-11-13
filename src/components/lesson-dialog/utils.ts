import type { ScheduleCell } from "./types";

export const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const DAY_LABEL_MAP: Record<(typeof DAY_ORDER)[number], string> = {
  Monday: "Thứ Hai",
  Tuesday: "Thứ Ba",
  Wednesday: "Thứ Tư",
  Thursday: "Thứ Năm",
  Friday: "Thứ Sáu",
  Saturday: "Thứ Bảy",
  Sunday: "Chủ Nhật",
};

export const SESSION_LABEL_MAP: Record<string, string> = {
  Morning: "Buổi sáng",
  Afternoon: "Buổi chiều",
  Evening: "Buổi tối",
};

export const SESSION_NAME_TO_NUMBER: Record<string, number> = {
  Morning: 0,
  Afternoon: 1,
  Evening: 2,
};

export const ZERO_GUID = "00000000-0000-0000-0000-000000000000";
export const DEFAULT_SCHOOL_LEVEL_CODE = "03";

export const translateDay = (day: string): string => {
  return DAY_LABEL_MAP[day as (typeof DAY_ORDER)[number]] ?? day;
};

export const translateSession = (session: string): string => {
  return SESSION_LABEL_MAP[session] ?? session;
};

export const normalizeSession = (sessionNumber: number): number => {
  return sessionNumber;
};

export const getSessionName = (sessionNumber: number, dateStudy?: string): string => {
  const sessionMap: Record<number, string> = {
    0: "Morning",
    1: "Afternoon",
    2: "Evening",
  };

  if (sessionMap[sessionNumber] !== undefined) {
    const sessionName = sessionMap[sessionNumber];
    return translateSession(sessionName);
  }

  if (dateStudy) {
    const date = new Date(dateStudy);
    const hour = date.getHours();
    if (hour < 12) {
      return translateSession("Morning");
    } else if (hour < 17) {
      return translateSession("Afternoon");
    } else {
      return translateSession("Evening");
    }
  }

  return `Buổi ${sessionNumber}`;
};

export const formatPeriodLabel = (num: number): string => {
  return `Tiết ${num}`;
};

export const formatDateForPreviousLecture = (dateString: string): { day: string; month: string; weekday: string } => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const weekday = weekdays[date.getDay()];
  return { day, month, weekday };
};

export const formatDateForSchedulePayload = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDateISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const normalizeVietnamese = (value?: string): string | null => {
  if (!value) {
    return null;
  }
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const mapLectureTypeToStatus = (lectureType?: string): number => {
  const normalized = normalizeVietnamese(lectureType);
  switch (normalized) {
    case "day bu":
      return 1;
    case "day thay":
      return 4;
    case "day chinh":
    default:
      return 3;
  }
};

export const mapLectureTypeToDivisiveName = (lectureType?: string): string | null => {
  const normalized = normalizeVietnamese(lectureType);
  switch (normalized) {
    case "day bu":
      return "Bù";
    case "day thay":
      return "Thay";
    case "day chinh":
      return "Chính";
    default:
      return lectureType ? lectureType : "Chính";
  }
};

export const mapEquipmentTypeToToolType = (equipmentType?: string): number | null => {
  const normalized = normalizeVietnamese(equipmentType);
  switch (normalized) {
    case "phong truc ban":
      return 1;
    case "tu lam":
      return 2;
    case "tai lop":
      return 3;
    default:
      return null;
  }
};

export const getDialogTitle = (cellInfo: ScheduleCell | null): string => {
  if (!cellInfo) return "Thêm tiết học";
  const dayLabel = translateDay(cellInfo.day);
  const sessionLabel = translateSession(cellInfo.session);
  return `${dayLabel} - ${sessionLabel} - Tiết ${cellInfo.period}`;
};

export const shouldShowFeedbackSection = (feedback: unknown, feedbackError: string | null) => {
  if (feedbackError) {
    return true;
  }
  return Boolean(feedback);
};
