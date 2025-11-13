"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSchoolYears, type SchoolYear } from "@/lib/api";
import { TOKEN_STORAGE_KEY } from "@/lib/auth";

interface SchoolYearContextType {
  schoolYear: SchoolYear | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SchoolYearContext = createContext<SchoolYearContextType | undefined>(undefined);

export function SchoolYearProvider({ children }: { children: ReactNode }) {
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchoolYear = async () => {
    const authenticated = !!localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!authenticated) {
      setSchoolYear(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const schoolYears = await fetchSchoolYears();
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
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also check periodically (in case of same-tab logout)
    const interval = setInterval(() => {
      const authenticated = !!localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!authenticated && schoolYear) {
        setSchoolYear(null);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [schoolYear]);

  return (
    <SchoolYearContext.Provider value={{ schoolYear, isLoading, error, refresh: loadSchoolYear }}>
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

