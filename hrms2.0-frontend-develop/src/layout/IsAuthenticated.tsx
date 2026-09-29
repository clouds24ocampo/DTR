import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
import Header from "../components/global/Header";
import Sidebar from "../components/global/Sidebar";
import useAuthStore from "../stores/auth/auth.store";
import SplashScreen from "../components/common/login/SplashScreen";

const PAGE_TITLES: Record<string, string> = {
  // Dashboards
  dashboard: "Dashboard",
  "hr-dashboard": "HR Dashboard",
  "employee-dashboard": "Employee Dashboard",
  "teamLeader-dashboard": "Team Leader Dashboard",
  "user-dashboard": "User Dashboard",
  "workforce-dashboard": "Workforce Dashboard",
  "frontline-agent-dashboard": "Frontline Agent Dashboard",
  "specialized-agent-dashboard": "Specialized Agent Dashboard",
  "supervisory-management-dashboard": "Supervisory Management Dashboard",
  "support-backoffice-dashboard": "Support Backoffice Dashboard",

  // Main Features
  department: "Department",
  schedule: "Schedule",
  "station-assignment": "Station Assignment",
  messages: "Messages",
  dtr: "DTR",
  leave: "Leave",
  report: "Report",
  "daily-progress": "Daily Progress",
  profile: "Profile",
  payroll: "My Payroll",

  // HR Management
  "hr-job-management": "Job Management",
  "hr-applicant-management": "Applicant Management",
  "hr-document-management": "Document Management",
  "hr-document-page": "Document Creation",
  "hr-document-edit": "Document Edit",
  "hr-progress-reports": "Progress Report Management",
  "hr-payroll-management": "Payroll Management",
  employees: "Employees Management",
  "employee-details": "Employee Details",

  // Workforce Management
  "workforce-progress-reports": "Progress Report Management",
  "workforce-schedule-management": "Schedule Management",
  "schedule-management": "Schedule Management",
  "workforce-dtr-tracking": "DTR Tracking",
  "dtr-tracking": "DTR Tracking",
  "workforce-workplace-management": "Workplace Management",
  workplace: "Workplace & Workstation",
  "workforce-leave-management": "Leave Management",
  "workforce-leave-calendar": "Leave Calendar",
  "leave-management": "Leave Management",
  "workforce-report-management": "Report Management",
  "report-management": "Report Management",
  "workforce-department-management": "Department Management",
  "workforce-analytics-management": "Analytics Management",
  analytics: "Analytics",
  "change-schedule": "Change Schedule"
};

const IsAuthenticated = () => {
  const { account, isSwitching, setIsSwitching, showSplash, setShowSplash, setAccount } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen((s) => !s), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const handleSplashComplete = useCallback(() => {
    if (isSwitching) {
      setIsSwitching(false);
      navigate("/"); // Navigate to refresh the dashboard view
    } else {
      setShowSplash(false);
    }
  }, [isSwitching, setIsSwitching, setShowSplash, navigate]);

  useEffect(() => {
    if (account?.archived === true || String(account?.archived) === "true") {
      setAccount(null);
    }
  }, [account, setAccount]);

  if (!account || account.archived === true || String(account.archived) === "true") return <Navigate to="/login" />;

  const activeTab =
    location.pathname.split("/").filter(Boolean).pop() || "dashboard";
  const pageTitle = PAGE_TITLES[activeTab] || "Dashboard";

  if (showSplash || isSwitching) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden relative theme-page-bg">
      <Sidebar
        activeTab={activeTab}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      {/* Main Section */}
      <div className="flex flex-col flex-1 w-full min-w-0 min-h-0">
        <Header title={pageTitle} onMenuClick={toggleSidebar} />
        <main
          className={`${activeTab === "messages" ? "" : "p-4 sm:p-6 md:p-8"
            } flex-1 overflow-auto min-h-0 text-slate-100`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default IsAuthenticated;
