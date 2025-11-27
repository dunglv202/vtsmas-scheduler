"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchEmployeeInfo, type EmployeeInfo } from "@/lib/api";
import { TOKEN_STORAGE_KEY } from "@/lib/auth";
import { useSchoolYear } from "./SchoolYearContext";

interface EmployeeContextType {
  employee: EmployeeInfo | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(
  undefined
);

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const { schoolYear } = useSchoolYear();
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getEmployeeIdFromToken = (): string | null => {
    try {
      const tokens = JSON.parse(
        localStorage.getItem(TOKEN_STORAGE_KEY) || "{}"
      );
      if (!tokens?.access_token) return null;

      // Decode JWT token (base64url decode the payload)
      const parts = tokens.access_token.split(".");
      if (parts.length !== 3) return null;

      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
      );
      // Try common claim names for employee/user ID
      return (
        payload.sub ||
        payload.employeeId ||
        payload.userId ||
        payload.id ||
        null
      );
    } catch {
      return null;
    }
  };

  const loadEmployee = async () => {
    const authenticated = !!localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!authenticated) {
      setEmployee(null);
      setIsLoading(false);
      return;
    }

    if (!schoolYear) {
      // Wait for school year to be loaded
      setIsLoading(true);
      return;
    }

    // Get employeeId from token or localStorage
    let employeeId =
      getEmployeeIdFromToken() || localStorage.getItem("employeeId");
    if (employeeId) {
      setEmployee({ employeeId } as EmployeeInfo);
    }

    // If still no employeeId, we can't proceed
    if (!employeeId) {
      setError("Không tìm thấy thông tin nhân viên trong token");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const employeeInfo = await fetchEmployeeInfo(
        employeeId,
        schoolYear.schoolYearId
      );
      setEmployee(employeeInfo);
      // Store employeeId for future use
      localStorage.setItem("employeeId", employeeInfo.employeeId);
    } catch (err) {
      console.error("Failed to fetch employee info:", err);
      setError(
        err instanceof Error ? err.message : "Không thể tải thông tin nhân viên"
      );
      setEmployee(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (schoolYear) {
      loadEmployee();
    }
  }, [schoolYear]);

  // Watch for authentication changes
  useEffect(() => {
    const handleStorageChange = () => {
      const authenticated = !!localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!authenticated) {
        setEmployee(null);
        localStorage.removeItem("employeeId");
      } else if (authenticated && schoolYear && !employee) {
        loadEmployee();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also check periodically (in case of same-tab logout)
    const interval = setInterval(() => {
      const authenticated = !!localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!authenticated && employee) {
        setEmployee(null);
        localStorage.removeItem("employeeId");
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [schoolYear, employee]);

  return (
    <EmployeeContext.Provider
      value={{ employee, isLoading, error, refresh: loadEmployee }}
    >
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployee() {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error("useEmployee must be used within an EmployeeProvider");
  }
  return context;
}
