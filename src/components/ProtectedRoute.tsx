import { TOKEN_STORAGE_KEY } from "@/lib/auth";
import type React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute: React.FC = () => {
  const authenticated = !!localStorage.getItem(TOKEN_STORAGE_KEY);
  return authenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
