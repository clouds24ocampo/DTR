import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { DataProvider } from "./contexts/DataContext";
import LoginForm from "./pages/Auth/LoginForm";
import RegisterAdmin from "./pages/Auth/RegisterAdmin";
import PublicClock from "./pages/Public/PublicClock";
import VirtualOffice from "./pages/Public/VirtualOffice";
import ComingSoon from "./pages/Public/ComingSoon";
import FreedomWall from "./pages/Public/FreedomWall";
import Error404 from "./pages/Public/Error404";
import Error500 from "./pages/Public/Error500";

// Dashboard components
import HrDashboard from "./pages/Dashboard/HrDashboard";
import EmployeeDashboard from "./pages/Dashboard/EmployeeDashboard";
import TeamLeaderDashboard from "./pages/Dashboard/TeamLeaderDashboard";
import UserDashboard from "./pages/Dashboard/UserDashboard";
import InternDashboard from "./pages/Dashboard/InternDashboard";

// Feature components
import DTR from "./pages/Main/DTR";
import DailyProgress from "./pages/Main/DailyProgress";
import Department from "./pages/Main/Department";
import Messages from "./pages/Main/Messages";
import Notifications from "./pages/Main/Notifications";
import Report from "./pages/Main/Report";
import Schedule from "./pages/Main/Schedule";
import StationAssignment from "./pages/Main/StationAssignment";
import Leave from "./pages/Main/Leave";
import Profile from "./pages/Main/ProfileSection";
import Payroll from "./pages/Main/Payroll";
// HR Management components
import ApplicantManagement from "./pages/Management/hr/ApplicantManagement";
import DocumentManagement from "./pages/Management/hr/DocumentManagement";
import JobManagement from "./pages/Management/hr/JobManagement";
import DocumentPage from "./components/hr/document/DocumentCreationPage";
import DocumentEditPage from "./components/hr/document/DocumentEditPage";
import EmployeeManagement from "./pages/Management/hr/EmployeeManagement";
import ProgressReportManagement from "./pages/Management/hr/ProgressReportManagement";
import PerformanceManagement from "./pages/Management/hr/PerformanceManagement";

// Workforce Management components
import WorkforceDashboard from "./pages/Dashboard/WorkforceDashboard";
import DTRTracking from "./pages/Management/workforce/DTRTracking";
import LeaveManagement from "./pages/Management/workforce/LeaveManagement";
import LeaveCalendar from "./pages/Management/workforce/LeaveCalendar";
import ReportManagement from "./pages/Management/workforce/ReportManagement";
import ScheduleManagement from "./pages/Management/workforce/ScheduleManagement";
import WorkplaceManagement from "./pages/Management/workforce/WorkplaceManagement";
import DepartmentManagement from "./pages/Management/workforce/DepartmentManagement";
import AnalyticsManagement from "./pages/Management/workforce/AnalyticsManagement";

// Auth components
import IsAuthenticated from "./layout/IsAuthenticated";
import IsUnAuthenticated from "./layout/IsUnAuthenticated";
import DefaultDashboardRedirect from "./components/global/DefaultDashboardRedirect";
import PayrollManagement from "./pages/Management/hr/PayrollManagement";
import PayrollAnalytics from "./pages/Management/hr/PayrollAnalytics";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <IsAuthenticated />,
      children: [
        { path: "/", element: <DefaultDashboardRedirect /> },
        { path: "/hr-dashboard", element: <HrDashboard /> },
        { path: "/department", element: <Department /> },
        {
          path: "/schedule",
          element: <Schedule />,
        },
        {
          path: "/station-assignment",
          element: <StationAssignment />,
        },
        {
          path: "/messages",
          element: <Messages />,
        },
        {
          path: "/notifications",
          element: <Notifications />,
        },
        {
          path: "/dtr",
          element: <DTR />,
        },
        { path: "/leave", element: <Leave /> },
        {
          path: "/report",
          element: <Report />,
        },
        {
          path: "/daily-progress",
          element: <DailyProgress />,
        },
        {
          path: "/profile",
          element: <Profile />,
        },
        {
          path: "/payroll",
          element: <Payroll />,
        },

        // HR Management Routes
        {
          path: "/hr-job-management",
          element: <JobManagement />,
        },
        {
          path: "/hr-applicant-management",
          element: <ApplicantManagement />,
        },
        {
          path: "/hr-document-management",
          element: <DocumentManagement />,
        },
        {
          path: "/hr-document-page",
          element: <DocumentPage />,
        },
        {
          path: "/hr-document-edit",
          element: <DocumentEditPage />,
        },
        {
          path: "/hr-progress-reports",
          element: <ProgressReportManagement />,
        },
        {
          path: "/hr-payroll-management",
          element: <PayrollManagement />,
        },
        {
          path: "/hr/payroll-analytics",
          element: <PayrollAnalytics />,
        },
        {
          path: "/employees",
          element: <EmployeeManagement />,
        },
        {
          path: "/hr-performance-management",
          element: <PerformanceManagement />,
        },

        // Workforce Management Routes
        { path: "/workforce-dashboard", element: <WorkforceDashboard /> },
        {
          path: "/workforce-progress-reports",
          element: <ProgressReportManagement />,
        },

        // Employee Dashboard Route
        { path: "/employee-dashboard", element: <EmployeeDashboard /> },

        // Intern Dashboard Route
        { path: "/intern-dashboard", element: <InternDashboard /> },

        // New Role Dashboard Routes
        { path: "/teamLeader-dashboard", element: <TeamLeaderDashboard /> },
        { path: "/user-dashboard", element: <UserDashboard /> },
        { path: "/frontline-agent-dashboard", element: <EmployeeDashboard /> },
        { path: "/specialized-agent-dashboard", element: <EmployeeDashboard /> },
        { path: "/supervisory-management-dashboard", element: <EmployeeDashboard /> },
        { path: "/support-backoffice-dashboard", element: <EmployeeDashboard /> },
        {
          path: "/workforce-schedule-management",
          element: <ScheduleManagement />,
        },
        {
          path: "/schedule-management",
          element: <ScheduleManagement />,
        },
        {
          path: "/workforce-dtr-tracking",
          element: <DTRTracking />,
        },
        {
          path: "/dtr-tracking",
          element: <DTRTracking />,
        },
        {
          path: "/workforce-workplace-management",
          element: <WorkplaceManagement />,
        },
        {
          path: "/workforce-leave-management",
          element: <LeaveManagement />,
        },
        {
          path: "/workforce-leave-calendar",
          element: <LeaveCalendar />,
        },
        {
          path: "/workforce-report-management",
          element: <ReportManagement />,
        },
        {
          path: "/report-management",
          element: <ReportManagement />,
        },
        {
          path: "/workforce-department-management",
          element: <DepartmentManagement />,
        },
        {
          path: "/workforce-analytics-management",
          element: <AnalyticsManagement />,
        },
      ],
    },
    {
      path: "/",
      element: <IsUnAuthenticated />,
      children: [
        {
          path: "/login",
          element: <LoginForm />,
        },
        {
          path: "/register-admin",
          element: <RegisterAdmin />,
        },
        {
          path: "/register-super-admin",
          element: <RegisterAdmin />,
        },
        {
          path: "/clock",
          element: <PublicClock />,
        },
        {
          path: "/virtual-office",
          element: <VirtualOffice />,
        },
      ],
    },
    // Public pages (no auth required)
    {
      path: "/coming-soon",
      element: <ComingSoon />,
    },
    {
      path: "/freedom-wall",
      element: <FreedomWall />,
    },
    {
      path: "/500",
      element: <Error500 />,
    },
    // Catch-all route for 404
    {
      path: "*",
      element: <Error404 />,
    },
  ]);

  return <RouterProvider router={router} />;
}

export default function MainApp() {
  return (
    <DataProvider>
      <App />
    </DataProvider>
  );
}
