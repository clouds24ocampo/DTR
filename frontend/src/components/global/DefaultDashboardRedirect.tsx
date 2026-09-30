import { Navigate } from "react-router-dom";
import useAuthStore from "../../stores/auth/auth.store";

const DefaultDashboardRedirect = () => {
  const { account } = useAuthStore();

  if (!account || account.archived === true || String(account.archived) === "true") {
    return <Navigate to="/login" replace />;
  }

  // Normalize position list
  const positions: string[] = Array.isArray(account.position)
    ? account.position.map((p) => String(p).toLowerCase().trim())
    : [String(account.position || "").toLowerCase().trim()];

  const hasRole = (keyword: string) => positions.some((p) => p.includes(keyword));

  // HR / Super Admin / Management -> HR Dashboard
  if (hasRole("hr") || hasRole("admin") || hasRole("operation manager") || hasRole("operations manager")) {
    return <Navigate to="/hr-dashboard" replace />;
  }

  // Workforce Management
  if (hasRole("workforce")) {
    return <Navigate to="/workforce-dashboard" replace />;
  }

  // Team Leader
  if (hasRole("team leader") || hasRole("teamleader")) {
    return <Navigate to="/teamLeader-dashboard" replace />;
  }

  // Intern
  if (hasRole("intern")) {
    return <Navigate to="/intern-dashboard" replace />;
  }

  // Frontline / Agent
  if (hasRole("frontline")) {
    return <Navigate to="/frontline-agent-dashboard" replace />;
  }

  // Specialized Agent
  if (hasRole("specialized")) {
    return <Navigate to="/specialized-agent-dashboard" replace />;
  }

  // Supervisory
  if (hasRole("supervisory")) {
    return <Navigate to="/supervisory-management-dashboard" replace />;
  }

  // Support / Back-Office
  if (hasRole("support") || hasRole("back-office") || hasRole("backoffice")) {
    return <Navigate to="/support-backoffice-dashboard" replace />;
  }

  // Safe default for any authenticated account: never bounce back to login
  return <Navigate to="/employee-dashboard" replace />;
};

export default DefaultDashboardRedirect;
