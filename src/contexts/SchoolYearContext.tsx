"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSchoolYears, type SchoolYear } from "@/lib/api";
import { TOKEN_STORAGE_KEY } from "@/lib/auth";

// Parse a yyyy-MM-dd (optionally yyyy-MM-ddTHH:mm:ss) date string into a
// local-midnight Date. The API returns timestamps even for date-only fields,
// so only the first 10 chars (the date part) are used.
function parseISODate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

interface SchoolYearContextType {
  schoolYear: SchoolYear | null;
  schoolYears: SchoolYear[];
  getSchoolYearForDate: (date: Date) => SchoolYear | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SchoolYearContext = createContext<SchoolYearContextType | undefined>(undefined);

export function SchoolYearProvider({ children }: { children: ReactNode }) {
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchoolYear = async () => {
    const authenticated = !!localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!authenticated) {
      setSchoolYear(null);
      setSchoolYears([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const schoolYears = await fetchSchoolYears();
      setSchoolYears(schoolYears);
      if (schoolYears.length > 0) {
        // Use the first one (latest school year)
        setSchoolYear(schoolYears[0]);
      } else {
        setError("Không tìm thấy năm học");
        setSchoolYear(null);
      }
    } catch (err) {
      console.error("Failed to fetch school year:", err);
      setError(err instanceof Error ? err.message : "Không thể tải thông tin năm học");
      setSchoolYear(null);
      setSchoolYears([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchoolYear();
  }, []);

  // Watch for authentication changes
  useEffect(() => {
    const handleStorageChange = () => {
      const authenticated = !!localStorage.getItem(TOKEN_STORAGE_KEY);
      if (authenticated && !schoolYear) {
        loadSchoolYear();
      } else if (!authenticated) {
        setSchoolYear(null);
        setSchoolYears([]);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also check periodically (in case of same-tab logout)
    const interval = setInterval(() => {
      const authenticated = !!localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!authenticated && schoolYear) {
        setSchoolYear(null);
        setSchoolYears([]);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [schoolYear]);

  // Resolve the school year that contains the given date. Returns null when the
  // list isn't loaded yet or the date falls outside every known school year
  // (e.g. the summer gap between two school years).
  const getSchoolYearForDate = useCallback(
    (date: Date): SchoolYear | null => {
      if (schoolYears.length === 0) return null;
      const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      return (
        schoolYears.find((sy) => {
          const start = parseISODate(sy.startDate).getTime();
          const end = parseISODate(sy.endDate).getTime();
          return target >= start && target <= end;
        }) ?? null
      );
    },
    [schoolYears]
  );

  return (
    <SchoolYearContext.Provider
      value={{ schoolYear, schoolYears, getSchoolYearForDate, isLoading, error, refresh: loadSchoolYear }}
    >
      {children}
    </SchoolYearContext.Provider>
  );
}

export function useSchoolYear() {
  const context = useContext(SchoolYearContext);
  if (context === undefined) {
    throw new Error("useSchoolYear must be used within a SchoolYearProvider");
  }
  return context;
}

