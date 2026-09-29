import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../stores/auth/auth.store";

const IsUnAuthenticated = () => {
  const { account } = useAuthStore();

  if (account && account.archived !== true && String(account.archived) !== "true") {
    const positions: string[] = Array.isArray(account.position)
      ? account.position.map((p) => String(p).toLowerCase().trim())
      : [String(account.position || "").toLowerCase().trim()];

    const hasRole = (keyword: string) => positions.some((p) => p.includes(keyword));

    if (hasRole("hr") || hasRole("admin") || hasRole("operation manager") || hasRole("operations manager")) {
      return <Navigate to="/hr-dashboard" replace />;
    }
    if (hasRole("workforce")) {
      return <Navigate to="/workforce-dashboard" replace />;
    }
    if (hasRole("team leader") || hasRole("teamleader")) {
      return <Navigate to="/teamLeader-dashboard" replace />;
    }
    if (hasRole("intern")) {
      return <Navigate to="/intern-dashboard" replace />;
    }
    if (hasRole("frontline")) {
      return <Navigate to="/frontline-agent-dashboard" replace />;
    }
    if (hasRole("specialized")) {
      return <Navigate to="/specialized-agent-dashboard" replace />;
    }
    if (hasRole("supervisory")) {
      return <Navigate to="/supervisory-management-dashboard" replace />;
    }
    if (hasRole("support") || hasRole("back-office") || hasRole("backoffice")) {
      return <Navigate to="/support-backoffice-dashboard" replace />;
    }

    return <Navigate to="/employee-dashboard" replace />;
  }

  return (
    <div>
      <Outlet />
    </div>
  );
};

export default IsUnAuthenticated;
