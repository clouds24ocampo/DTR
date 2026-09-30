import {
  Home,
  Building2,
  Calendar,
  Clock,
  AlertCircle,
  MessageCircleCodeIcon,
  Users,
  Briefcase,
  Newspaper,
  FileText,
  Building,
  LucideIcon,
  BarChart3,
  ClipboardList,
  Banknote,
  Trophy,
} from "lucide-react";

type Section = "main" | "management";

type MenuItem = {
  id: string | string[];
  label: string;
  icon: LucideIcon;
  section?: Section;
};

export const MENU_MAP: Record<string, MenuItem[]> = {
  HR: [
    { id: "/", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/employees",
      label: "Employees",
      icon: Users,
      section: "management",
    },
    {
      id: "/hr-job-management",
      label: "Job",
      icon: Briefcase,
      section: "management",
    },
    {
      id: "/hr-applicant-management",
      label: "Applicant",
      icon: Users,
      section: "management",
    },
    {
      id: ["/hr-document-management", "/hr-document-page"],
      label: "Document",
      icon: Newspaper,
      section: "management",
    },
    {
      id: "/hr-progress-reports",
      label: "Progress Reports",
      icon: ClipboardList,
      section: "management",
    },
    {
      id: "/hr-payroll-management",
      label: "Payroll",
      icon: Banknote,
      section: "management",
    },
    {
      id: "/workforce-dtr-tracking",
      label: "DTR Tracking",
      icon: Clock,
      section: "management",
    },
    {
      id: "/hr-performance-management",
      label: "Performance",
      icon: Trophy,
      section: "management",
    },
  ],
  Workforce: [
    { id: "/workforce-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/employees",
      label: "Employees",
      icon: Users,
      section: "management",
    },
    {
      id: "/workforce-department-management",
      label: "Department",
      icon: Building2,
      section: "management",
    },
    {
      id: "/workforce-workplace-management",
      label: "Workplace",
      icon: Building,
      section: "management",
    },
    {
      id: "/workforce-schedule-management",
      label: "Schedule",
      icon: Calendar,
      section: "management",
    },
    {
      id: "/workforce-dtr-tracking",
      label: "DTR Tracking",
      icon: Clock,
      section: "management",
    },
    {
      id: "/workforce-leave-management",
      label: "Leave",
      icon: FileText,
      section: "management",
    },
    {
      id: "/workforce-report-management",
      label: "Report",
      icon: AlertCircle,
      section: "management",
    },
    {
      id: "/workforce-analytics-management",
      label: "Analytics",
      icon: BarChart3,
      section: "management",
    },
  ],
  "Team Leader - Field": [
    { id: "/teamLeader-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/schedule-management",
      label: "Schedule",
      icon: Calendar,
      section: "management",
    },
    {
      id: "/dtr-tracking",
      label: "DTR Tracking",
      icon: Clock,
      section: "management",
    },
    {
      id: "/report-management",
      label: "Report",
      icon: AlertCircle,
      section: "management",
    },
  ],
  "Team Leader - Operation": [
    { id: "/teamLeader-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/schedule-management",
      label: "Schedule",
      icon: Calendar,
      section: "management",
    },
    {
      id: "/dtr-tracking",
      label: "DTR Tracking",
      icon: Clock,
      section: "management",
    },
    {
      id: "/report-management",
      label: "Report",
      icon: AlertCircle,
      section: "management",
    },
  ],
  Employee: [
    { id: "/employee-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
  Intern: [
    { id: "/intern-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
  Trainee: [
    { id: "/employee-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
  Provisionary: [
    { id: "/employee-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
  Instructor: [
    { id: "/employee-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
  Student: [
    { id: "/employee-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
  Marketer: [
    { id: "/employee-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
  "Employee - Field": [
    { id: "/employee-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
  "Employee - Operation": [
    { id: "/employee-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
  "Frontline / Agent Roles": [
    { id: "/frontline-agent-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/station-assignment",
      label: "Station Assignment",
      icon: Building,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
  "Specialized Agent Roles": [
    { id: "/specialized-agent-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/station-assignment",
      label: "Station Assignment",
      icon: Building,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
  "Supervisory & Management Roles": [
    { id: "/supervisory-management-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
  "Support & Back-Office Roles": [
    { id: "/support-backoffice-dashboard", label: "Dashboard", icon: Home },
    {
      id: "/department",
      label: "Department",
      icon: Building2,
    },
    {
      id: "/schedule",
      label: "Schedule",
      icon: Calendar,
    },
    {
      id: "/dtr",
      label: "DTR",
      icon: Clock,
    },
    {
      id: "/leave",
      label: "Leave",
      icon: FileText,
    },
    {
      id: "/report",
      label: "Report",
      icon: AlertCircle,
    },
    {
      id: "/daily-progress",
      label: "Daily Progress",
      icon: ClipboardList,
    },
    {
      id: "/payroll",
      label: "My Payroll",
      icon: Banknote,
    },
    {
      id: "/messages",
      label: "Messenger",
      icon: MessageCircleCodeIcon,
    },
  ],
};

export const getMenuItems = (position: string): MenuItem[] => {
  if (!position) return MENU_MAP.user || [];

  const normalizedPosition = position.toLowerCase().trim();

  // Check for exact match first
  if (MENU_MAP[position]) {
    return MENU_MAP[position];
  }

  // Fallback to case-insensitive match
  const matchingKey = Object.keys(MENU_MAP).find(
    key => key.toLowerCase().trim() === normalizedPosition
  );

  if (matchingKey) return MENU_MAP[matchingKey];

  // Robust fallback for Team Leader roles (handles dash variations)
  if (/team\s*leader/.test(normalizedPosition)) {
    if (/field/.test(normalizedPosition)) return MENU_MAP["Team Leader - Field"];
    if (/operation/.test(normalizedPosition)) return MENU_MAP["Team Leader - Operation"];
  }

  // Robust fallback for Employee roles
  if (/employee/.test(normalizedPosition)) {
    if (/field/.test(normalizedPosition)) return MENU_MAP["Employee - Field"];
    if (/operation/.test(normalizedPosition)) return MENU_MAP["Employee - Operation"];
  }

  return MENU_MAP.user || [];
};
