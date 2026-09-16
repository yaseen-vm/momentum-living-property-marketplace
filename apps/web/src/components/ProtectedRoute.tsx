import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "@momentum/shared";
import { useAuthStore } from "../store/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Role[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, roles, redirectTo }: ProtectedRouteProps) {
  const { token, role } = useAuthStore();
  const location = useLocation();

  if (!token || !role) {
    const loginPath = redirectTo ?? (roles?.includes("vendor") ? "/vendor/login" : "/login");
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
