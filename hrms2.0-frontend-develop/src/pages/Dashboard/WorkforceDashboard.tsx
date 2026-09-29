/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AlertTriangle,
  Building2,
  FileText,
  Layers,
  UserCheck,
  Users,
  ArrowRight,
  ExternalLink,
  Clock,
  Calendar,
  Activity,
  Plus,
  CheckCircle2,
  XCircle,
  BarChart3,
  LineChart as LineChartIcon,
  Briefcase,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { useLeaveStore } from "../../stores/global/leave/leave.store";
import { useReportStore } from "../../stores/global/report/report.store";
import { useDepartmentStore } from "../../stores/workforce/department/department.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import { useWorkplaceStore } from "../../stores/workforce/workplace/workplace.store";
import { useDTRStore } from "../../stores/global/dtr/dtr.store";
import type { DepartmentDoc } from "../../types/workforce/department/department.type";
import type {
  IWorkplace,
  Workstation,
  WorkplaceStationDay,
} from "../../types/workforce/workplace/workplace.type";
import useAuthStore from "../../stores/auth/auth.store";
import Avatar from "avatox";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import Chatbot from "../../components/common/ChatBot";
import StatCard from "./StatCard";

function WorkforceDashboard() {
  const navigate = useNavigate();
  const { otherUsers, fetchOtherUsers } = useUserStore();
  const { workplaces, fetchAllWorkplaces } = useWorkplaceStore();
  const { reports, fetchAllReports } = useReportStore();
  const { departments: deptState, fetchAllDepartments } = useDepartmentStore();
  const { leaves, fetchAllLeaves } = useLeaveStore();
  const { allDTRs, loadAllDTRs } = useDTRStore();
  const [selectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "quarter" | "year">("month");

  const { account } = useAuthStore();

  useEffect(() => {
    fetchAllWorkplaces();
    fetchOtherUsers();
    fetchAllReports();
    fetchAllDepartments();
    fetchAllLeaves();
    loadAllDTRs();
  }, [
    fetchAllWorkplaces,
    fetchOtherUsers,
    fetchAllReports,
    fetchAllDepartments,
    fetchAllLeaves,
    loadAllDTRs,
  ]);

  // Calculate date range for filtering
  const getDateRange = useMemo(() => {
    const now = new Date();
    const ranges = {
      today: 0,
      week: 7,
      month: 30,
      quarter: 90,
      year: 365,
    };
    const days = ranges[dateRange];
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    return { start: startDate, end: now };
  }, [dateRange]);

  /* ---------------- Workplaces Stats ---------------- */
  const safeWorkplaces = useMemo<IWorkplace[]>(() => {
    if (Array.isArray(workplaces)) return workplaces as IWorkplace[];
    const alt = (workplaces as any)?.data ?? (workplaces as any)?.items;
    return Array.isArray(alt) ? (alt as IWorkplace[]) : [];
  }, [workplaces]);

  const totalWorkstations = useMemo(
    () =>
      safeWorkplaces.reduce(
        (sum, wp) => sum + (wp.workstations?.length ?? 0),
        0
      ),
    [safeWorkplaces]
  );

  const assignedWorkstations = useMemo(() => {
    return safeWorkplaces.reduce((sum, wp) => {
      const count = (wp.workstations ?? []).filter((ws: Workstation) =>
        (ws.dates ?? []).some(
          (d: WorkplaceStationDay) =>
            d?.date === selectedDate && (d.assignedUsers?.length ?? 0) > 0
        )
      ).length;
      return sum + count;
    }, 0);
  }, [safeWorkplaces, selectedDate]);

  const workplaceUtilizationRate = totalWorkstations > 0
    ? Math.round((assignedWorkstations / totalWorkstations) * 100 * 100) / 100
    : 0;

  /* ---------------- Department Stats ---------------- */
  const safeDepartments = useMemo(() => {
    const raw: any = deptState as any;
    const list: DepartmentDoc[] = Array.isArray(raw)
      ? raw
      : raw?.departments || raw?.items || [];
    return list.map((d) => ({
      _id: String(d._id),
      name: String(d.name),
      head: d.head ? String(d.head) : null,
      members: Array.isArray(d.members) ? d.members.map(String) : [],
    }));
  }, [deptState]);

  // Enhanced Employee Metrics
  const activeEmployees = useMemo(() => otherUsers.filter((u) => !u.archived).length, [otherUsers]);
  const archivedEmployees = useMemo(() => otherUsers.filter((u) => u.archived).length, [otherUsers]);

  // Attendance Analytics
  const attendanceAnalytics = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayDTRs = allDTRs.filter((dtr) => dtr.date === today);
    const presentToday = new Set(todayDTRs.map((d) => d.userId)).size;
    const absentToday = Math.max(0, activeEmployees - presentToday);

    // Filter DTRs by date range
    const filteredDTRs = allDTRs.filter((dtr) => {
      try {
        const dtrDate = new Date(dtr.date);
        dtrDate.setHours(0, 0, 0, 0);
        const start = new Date(getDateRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(getDateRange.end);
        end.setHours(23, 59, 59, 999);
        return dtrDate >= start && dtrDate <= end;
      } catch {
        return false;
      }
    });

    const employeesWithDTR = new Set(filteredDTRs.map((d) => d.userId)).size;
    const attendanceRate = activeEmployees > 0
      ? Math.round((employeesWithDTR / activeEmployees) * 100 * 100) / 100
      : 0;

    // Daily attendance trend
    const uniqueDates = new Set(filteredDTRs.map((d) => d.date));
    const dailyAttendance: Record<string, { date: string; present: number; absent: number }> = {};

    uniqueDates.forEach((date) => {
      const dtrsForDate = filteredDTRs.filter((d) => d.date === date);
      const presentCount = new Set(dtrsForDate.map((d) => d.userId)).size;
      dailyAttendance[date] = {
        date,
        present: presentCount,
        absent: Math.max(0, activeEmployees - presentCount),
      };
    });

    const attendanceTrend = Object.values(dailyAttendance)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map((item) => ({
        date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        present: item.present,
        absent: item.absent,
      }));

    // Employees currently on leave today
    const onLeaveToday = leaves.filter((l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const todayDate = new Date(today);
      return l.status === "approved" && start <= todayDate && end >= todayDate;
    }).length;

    return {
      presentToday,
      absentToday,
      onLeaveToday,
      attendanceRate,
      attendanceTrend,
      employeesWithDTR,
    };
  }, [allDTRs, otherUsers, activeEmployees, leaves, getDateRange, selectedDate]);

  // Leave Analytics
  const leaveAnalytics = useMemo(() => {
    const filteredLeaves = leaves.filter((leave) => {
      const leaveDate = new Date(leave.startDate);
      return leaveDate >= getDateRange.start && leaveDate <= getDateRange.end;
    });

    const totalLeaves = filteredLeaves.length;
    const approvedLeaves = filteredLeaves.filter((l) => l.status === "approved").length;
    const leaveApprovalRate = totalLeaves > 0
      ? Math.round((approvedLeaves / totalLeaves) * 100 * 100) / 100
      : 0;

    // Leave by type
    const leaveByType = filteredLeaves.reduce(
      (acc, leave) => {
        acc[leave.type] = (acc[leave.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Average leave duration
    const totalDays = filteredLeaves.reduce((sum, leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);
    const avgLeaveDuration = totalLeaves > 0 ? Math.round((totalDays / totalLeaves) * 10) / 10 : 0;

    // Upcoming leaves (next 7 days)
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingLeaves = leaves.filter((l) => {
      const start = new Date(l.startDate);
      return l.status === "approved" && start >= today && start <= nextWeek;
    }).slice(0, 5);

    // Leave trend by month
    const monthlyLeaves = filteredLeaves.reduce((acc, leave) => {
      const month = new Date(leave.startDate).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      if (!acc[month]) {
        acc[month] = { month, count: 0 };
      }
      acc[month].count += 1;
      return acc;
    }, {} as Record<string, { month: string; count: number }>);

    const leaveTrend = Object.values(monthlyLeaves)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    return {
      totalLeaves,
      approvedLeaves,
      leaveApprovalRate,
      leaveByType,
      avgLeaveDuration,
      upcomingLeaves,
      leaveTrend,
    };
  }, [leaves, getDateRange]);

  // Report Analytics
  const reportAnalytics = useMemo(() => {
    const filteredReports = reports.filter((report) => {
      const reportDate = new Date(report.createdAt || new Date());
      return reportDate >= getDateRange.start && reportDate <= getDateRange.end;
    });

    const totalReports = filteredReports.length;
    const closedReports = filteredReports.filter((r) => r.status === "closed").length;
    const reportResolutionRate = totalReports > 0
      ? Math.round((closedReports / totalReports) * 100 * 100) / 100
      : 0;

    // Report by type
    const reportByType = filteredReports.reduce(
      (acc, report) => {
        acc[report.type] = (acc[report.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Report by priority
    const reportByPriority = filteredReports.reduce(
      (acc, report) => {
        const priority = report.priority || "--";
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Average resolution time
    const resolvedReports = filteredReports.filter((r) => r.status === "closed" && r.updatedAt);
    const totalResolutionTime = resolvedReports.reduce((sum, report) => {
      const created = new Date(report.createdAt);
      const updated = new Date(report.updatedAt!);
      const days = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    const avgResolutionTime = resolvedReports.length > 0
      ? Math.round((totalResolutionTime / resolvedReports.length) * 10) / 10
      : 0;

    // Report trend
    const monthlyReports = filteredReports.reduce((acc, report) => {
      const month = new Date(report.createdAt || new Date()).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      if (!acc[month]) {
        acc[month] = { month, open: 0, "in-progress": 0, resolved: 0, closed: 0 };
      }
      const statusKey = report.status === "resolved" ? "resolved" : report.status === "in-progress" ? "in-progress" : report.status === "closed" ? "closed" : "open";
      acc[month][statusKey] = (acc[month][statusKey] || 0) + 1;
      return acc;
    }, {} as Record<string, { month: string; open: number; "in-progress": number; resolved: number; closed: number }>);

    const reportTrend = Object.values(monthlyReports)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    return {
      totalReports,
      closedReports,
      reportResolutionRate,
      reportByType,
      reportByPriority,
      avgResolutionTime,
      reportTrend,
    };
  }, [reports, getDateRange]);

  // Department Analytics
  const departmentAnalytics = useMemo(() => {
    const filteredLeaves = leaves.filter((leave) => {
      const leaveDate = new Date(leave.startDate);
      return leaveDate >= getDateRange.start && leaveDate <= getDateRange.end;
    });

    const filteredReports = reports.filter((report) => {
      const reportDate = new Date(report.createdAt || new Date());
      return reportDate >= getDateRange.start && reportDate <= getDateRange.end;
    });

    const deptStats = safeDepartments.map((dept) => {
      const deptMemberIds = dept.members.map(String);
      const deptLeaves = filteredLeaves.filter((l) =>
        deptMemberIds.includes(String(l.employeeId))
      ).length;
      const deptReports = filteredReports.filter((r) =>
        deptMemberIds.includes(String(r.employeeId))
      ).length;

      return {
        name: dept.name,
        members: dept.members.length,
        leaves: deptLeaves,
        reports: deptReports,
        activityScore: dept.members.length + deptLeaves + deptReports,
      };
    });

    return deptStats.sort((a, b) => b.activityScore - a.activityScore);
  }, [safeDepartments, leaves, reports, getDateRange]);

  // Workplace Utilization by Workplace
  const workplaceUtilization = useMemo(() => {
    return safeWorkplaces.map((wp) => {
      const total = wp.workstations?.length || 0;
      const assigned = (wp.workstations ?? []).filter((ws: Workstation) =>
        (ws.dates ?? []).some(
          (d: WorkplaceStationDay) =>
            d?.date === selectedDate && (d.assignedUsers?.length ?? 0) > 0
        )
      ).length;
      const utilization = total > 0 ? Math.round((assigned / total) * 100 * 100) / 100 : 0;
      return {
        name: wp.name,
        total,
        assigned,
        utilization,
      };
    }).sort((a, b) => b.utilization - a.utilization);
  }, [safeWorkplaces, selectedDate]);

  // Workforce Health Score (composite metric)
  const workforceHealthScore = useMemo(() => {
    const attendanceWeight = 0.3;
    const leaveWeight = 0.2;
    const reportWeight = 0.2;
    const utilizationWeight = 0.3;

    const attendanceScore = attendanceAnalytics.attendanceRate;
    const leaveScore = 100 - (leaveAnalytics.leaveApprovalRate > 0 ? 0 : 20); // Penalty if no leaves processed
    const reportScore = reportAnalytics.reportResolutionRate;
    const utilizationScore = workplaceUtilizationRate;

    const score = Math.round(
      attendanceScore * attendanceWeight +
      leaveScore * leaveWeight +
      reportScore * reportWeight +
      utilizationScore * utilizationWeight
    );

    return Math.min(100, Math.max(0, score));
  }, [attendanceAnalytics.attendanceRate, leaveAnalytics.leaveApprovalRate, reportAnalytics.reportResolutionRate, workplaceUtilizationRate]);

  const stats = [
    {
      title: "Total Employees",
      value: activeEmployees,
      subtitle: `${archivedEmployees} archived`,
      icon: Users,
      color: "blue" as const,
      link: "/employees",
      trend: null as number | null,
    },
    {
      title: "Attendance Rate",
      value: `${attendanceAnalytics.attendanceRate}%`,
      subtitle: `${attendanceAnalytics.presentToday} present today`,
      icon: UserCheck,
      color: "green" as const,
      link: "/employees",
      trend: null as number | null,
    },
    {
      title: "Total Workplaces",
      value: safeWorkplaces.length,
      subtitle: `${totalWorkstations} workstations`,
      icon: Building2,
      color: "purple" as const,
      link: "/workforce-workplace-management",
      trend: null as number | null,
    },
    {
      title: "Workplace Utilization",
      value: `${workplaceUtilizationRate}%`,
      subtitle: `${assignedWorkstations}/${totalWorkstations} assigned`,
      icon: Layers,
      color: "yellow" as const,
      link: "/workforce-workplace-management",
      trend: null as number | null,
    },
    {
      title: "Leave Approval Rate",
      value: `${leaveAnalytics.leaveApprovalRate}%`,
      subtitle: `${leaveAnalytics.approvedLeaves}/${leaveAnalytics.totalLeaves} approved`,
      icon: FileText,
      color: "green" as const,
      link: "/workforce-leave-management",
      trend: null as number | null,
    },
    {
      title: "Report Resolution",
      value: `${reportAnalytics.reportResolutionRate}%`,
      subtitle: `${reportAnalytics.closedReports}/${reportAnalytics.totalReports} closed`,
      icon: AlertTriangle,
      color: "blue" as const,
      link: "/workforce-report-management",
      trend: null as number | null,
    },
    {
      title: "Workforce Health",
      value: `${workforceHealthScore}%`,
      subtitle: "Overall score",
      icon: Activity,
      color: (workforceHealthScore >= 80 ? "green" : workforceHealthScore >= 60 ? "yellow" : "red") as "green" | "yellow" | "red",
      link: "#",
      trend: null as number | null,
    },
    {
      title: "Departments",
      value: safeDepartments.length,
      subtitle: `${safeDepartments.reduce((sum, d) => sum + d.members.length, 0)} members`,
      icon: Building2,
      color: "purple" as const,
      link: "/workforce-department-management",
      trend: null as number | null,
    },
  ];

  /* ---------------- Leave Stats ---------------- */
  const leaveStats = [
    {
      status: "Pending",
      count: leaves.filter((l) => l.status === "pending").length,
      color: "bg-yellow-100 text-yellow-700",
      link: "/leave-management?status=pending",
      icon: FileText,
    },
    {
      status: "Approved",
      count: leaves.filter((l) => l.status === "approved").length,
      color: "bg-green-100 text-green-700",
      link: "/leave-management?status=approved",
      icon: UserCheck,
    },
    {
      status: "Rejected",
      count: leaves.filter((l) => l.status === "rejected").length,
      color: "bg-red-100 text-red-700",
      link: "/leave-management?status=rejected",
      icon: AlertTriangle,
    },
  ];

  /* ---------------- Employees by Position ---------------- */
  const positionCounts = useMemo(() => {
    const map = new Map<string, number>();
    otherUsers.forEach((e) => {
      // Handle position as array (get first position/active role)
      const positionValue = Array.isArray(e.position) ? e.position[0] : e.position;
      const pos = (positionValue ?? "Unknown").toLowerCase();
      map.set(pos, (map.get(pos) || 0) + 1);
    });
    return Array.from(map.entries()).map(([position, count]) => ({
      name: position.charAt(0).toUpperCase() + position.slice(1),
      value: count,
    }));
  }, [otherUsers]);

  const PIE_COLORS = ["#2563eb", "#facc15", "#111827", "#60a5fa", "#fbbf24"];

  const departmentStats = [
    {
      title: "Departments",
      value: safeDepartments.length,
      link: "/department-management",
      icon: Building2,
    },
    {
      title: "With Head",
      value: safeDepartments.filter((d) => !!d.head).length,
      link: "/department-management",
      icon: UserCheck,
    },
    {
      title: "Members",
      value: safeDepartments.reduce((sum, d) => sum + d.members.length, 0),
      link: "/department-management",
      icon: Users,
    },
    {
      title: "Active",
      value: safeDepartments.filter((d) => d.members.length > 0).length,
      link: "/department-management",
      icon: Layers,
    },
  ];

  /* ---------------- Report Categories ---------------- */
  const reportCategories = [
    {
      status: "Open",
      count: reports.filter((r) => r.status === "open").length,
      color: "bg-red-100 text-red-700",
      link: "/report-management?status=open",
      icon: AlertTriangle,
    },
    {
      status: "In Progress",
      count: reports.filter((r) => r.status === "in-progress").length,
      color: "bg-yellow-100 text-yellow-700",
      link: "/report-management?status=in-progress",
      icon: FileText,
    },
    {
      status: "Closed",
      count: reports.filter((r) => r.status === "closed").length,
      color: "bg-green-100 text-green-700",
      link: "/report-management?status=closed",
      icon: FileText,
    },
  ];

  const fullName = `${account?.firstName ?? ""} ${account?.lastName ?? ""}`;

  return (
    <div className="space-y-4 pb-4">
      {/* Container Motion Wrapper */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Welcome Banner */}
        <motion.div
          className="flex flex-row sm:flex-row items-center justify-between theme-card p-4 gap-4"
          variants={itemVariants}
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-white truncate mb-0.5">
              Welcome back, {account?.firstName}!
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm truncate font-medium">
              {Array.isArray(account?.position) ? account.position[0] ?? "Workforce Manager" : account?.position || "Workforce Manager"}
            </p>
          </div>
          <div>
            <Avatar
              src={account?.profilePicture}
              name={fullName}
              className="!h-10 !w-10 sm:!h-12 sm:!w-12 !text-lg sm:!text-xl border-2 border-slate-600 shadow-md flex-shrink-0"
            />
          </div>
        </motion.div>

        {/* Date Range Selector & Quick Actions */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-between gap-3"
          variants={itemVariants}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              onClick={() => navigate("/workforce-leave-management?action=create")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/80 text-white rounded-lg hover:bg-blue-500 border border-slate-600 transition-colors text-sm font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-4 h-4" />
              Create Leave
            </motion.button>
            <motion.button
              onClick={() => navigate("/workforce-report-management?action=create")}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/80 text-white rounded-lg hover:bg-emerald-500 border border-slate-600 transition-colors text-sm font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-4 h-4" />
              Create Report
            </motion.button>
            <motion.button
              onClick={() => navigate("/workforce-workplace-management")}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/80 text-white rounded-lg hover:bg-purple-500 border border-slate-600 transition-colors text-sm font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Briefcase className="w-4 h-4" />
              Assign Workstation
            </motion.button>
          </div>
        </motion.div>

        {/* Enhanced Stat Cards */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          variants={itemVariants}
        >
          {stats.map((stat, index) => (
            <motion.div key={index} variants={itemVariants}>
              <StatCard
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                color={stat.color}
                onClick={() => stat.link !== "#" && navigate(stat.link)}
                change={stat.trend !== null ? `${stat.trend > 0 ? '+' : ''}${stat.trend}%` : undefined}
                changeType={stat.trend !== null ? (stat.trend > 0 ? 'positive' : stat.trend < 0 ? 'negative' : 'neutral') : undefined}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Attendance Overview Section */}
        <motion.div
          className="theme-card p-4"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-semibold text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Attendance Overview
            </h3>
            <Link
              to="/employees"
              className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-emerald-500/20 rounded-lg border border-emerald-500/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-emerald-400">Present Today</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-white">{attendanceAnalytics.presentToday}</p>
              <p className="text-xs text-emerald-400 mt-0.5">
                {activeEmployees > 0
                  ? Math.round((attendanceAnalytics.presentToday / activeEmployees) * 100)
                  : 0}% of active employees
              </p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-red-400">Absent Today</span>
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-xl font-bold text-white">{attendanceAnalytics.absentToday}</p>
              <p className="text-xs text-red-400 mt-0.5">
                {activeEmployees > 0
                  ? Math.round((attendanceAnalytics.absentToday / activeEmployees) * 100)
                  : 0}% of active employees
              </p>
            </div>
            <div className="p-3 bg-amber-500/20 rounded-lg border border-amber-500/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-amber-400">On Leave Today</span>
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-bold text-white">{attendanceAnalytics.onLeaveToday}</p>
              <p className="text-xs text-amber-400 mt-0.5">Approved leaves</p>
            </div>
          </div>
          {attendanceAnalytics.attendanceTrend.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceAnalytics.attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: "8px",
                      border: "1px solid rgb(71 85 105)",
                      backgroundColor: "rgb(30 41 59)",
                    }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" />
                  <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Charts Row 1: Attendance Trend + Leave Trends */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-3"
          variants={itemVariants}
        >
          {/* Leave Trends */}
          <motion.div
            className="theme-card p-4"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-slate-300 flex items-center gap-2">
                <LineChartIcon className="w-4 h-4 text-blue-400" />
                Leave Trends
              </h3>
              <Link
                to="/workforce-leave-management"
                className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {leaveAnalytics.leaveTrend.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={leaveAnalytics.leaveTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: "8px",
                      border: "1px solid rgb(71 85 105)",
                      backgroundColor: "rgb(30 41 59)",
                    }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                    <Area type="monotone" dataKey="count" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                <p>No leave data available</p>
              </div>
            )}
          </motion.div>

          {/* Workplace Utilization Chart */}
          <motion.div
            className="theme-card p-4"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-slate-300 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Workplace Utilization
              </h3>
              <Link
                to="/workforce-workplace-management"
                className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {workplaceUtilization.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workplaceUtilization.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: "8px",
                        border: "1px solid rgb(71 85 105)",
                        backgroundColor: "rgb(30 41 59)",
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Bar dataKey="utilization" fill="#8b5cf6" name="Utilization %" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                <p>No workplace data available</p>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Charts Row 2: Department Performance + Report Status Timeline */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-3"
          variants={itemVariants}
        >
          {/* Department Performance */}
          <motion.div
            className="theme-card p-4"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-slate-300 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Department Performance
              </h3>
              <Link
                to="/workforce-department-management"
                className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {departmentAnalytics.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentAnalytics.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: "8px",
                        border: "1px solid rgb(71 85 105)",
                        backgroundColor: "rgb(30 41 59)",
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="members" fill="#3b82f6" name="Members" />
                    <Bar dataKey="leaves" fill="#f59e0b" name="Leaves" />
                    <Bar dataKey="reports" fill="#ef4444" name="Reports" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                <p>No department data available</p>
              </div>
            )}
          </motion.div>

          {/* Report Status Timeline */}
          <motion.div
            className="theme-card p-4"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Report Status Timeline
              </h3>
              <Link
                to="/workforce-report-management"
                className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {reportAnalytics.reportTrend.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportAnalytics.reportTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: "8px",
                        border: "1px solid rgb(71 85 105)",
                        backgroundColor: "rgb(30 41 59)",
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="open"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      name="Open"
                    />
                    <Area
                      type="monotone"
                      dataKey="in-progress"
                      stackId="1"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      name="In Progress"
                    />
                    <Area
                      type="monotone"
                      dataKey="resolved"
                      stackId="1"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      name="Resolved"
                    />
                    <Area
                      type="monotone"
                      dataKey="closed"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      name="Closed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                <p>No report data available</p>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Employees by Position + Department Overview */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4"
          variants={itemVariants}
        >
          {/* Employees by Position */}
          <motion.div
            className="theme-card p-3 sm:p-4 hover:shadow-blue-500/20 transition-shadow duration-300 cursor-pointer group"
            variants={itemVariants}
            onClick={() => navigate("/employees")}
            whileHover={{ y: -2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-slate-300">
                Employees by Position
              </h3>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300 transition-colors" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <ResponsiveContainer width="100%" height={200} minHeight={180}>
                  <PieChart>
                    <Pie
                      data={positionCounts}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={70}
                      label
                    >
                      {positionCounts.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        fontSize: "12px",
                        borderRadius: "8px",
                        border: "1px solid rgb(71 85 105)",
                        backgroundColor: "rgb(30 41 59)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center space-y-2">
                {positionCounts.length > 0 ? (
                  positionCounts.map((entry, index) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full shadow-sm"
                          style={{
                            backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                          }}
                        />
                        <span className="text-slate-300 text-xs sm:text-sm">
                          {entry.name}
                        </span>
                      </div>
                      <span className="font-bold text-white text-xs sm:text-sm">{entry.value}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-xs text-center py-4">
                    No position data available
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Department Overview */}
          <motion.div
            className="theme-card p-3 sm:p-4"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-slate-300">
                Department Insights
              </h3>
              <Link
                to="/workforce-department-management"
                className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
              {departmentStats.map((stat) => (
                <motion.div
                  key={stat.title}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={stat.link}
                    className="p-3 bg-slate-700/50 rounded-lg flex flex-col items-center hover:bg-slate-700 transition-all duration-300 cursor-pointer group border border-slate-600 hover:border-slate-500"
                  >
                    <div className="p-1.5 bg-slate-600/50 rounded-lg mb-1.5 group-hover:bg-blue-500/20 transition-colors">
                      <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-white mb-0.5">
                      {stat.value}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium text-center">
                      {stat.title}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
            {/* Top Departments by Activity */}
            {departmentAnalytics.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-2">Top Active Departments</h4>
                <div className="space-y-1.5">
                  {departmentAnalytics.slice(0, 3).map((dept, index) => (
                    <div
                      key={dept.name}
                      className="p-2 bg-slate-700/50 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-200">{dept.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {dept.members} members • {dept.leaves} leaves • {dept.reports} reports
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500">Activity Score</p>
                          <p className="text-xs font-bold text-white">{dept.activityScore}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Leave Overview */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4"
          variants={itemVariants}
        >
          <motion.div
            className="theme-card p-3 sm:p-4"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-slate-300">
                Leave Overview
              </h3>
              <Link
                to="/workforce-leave-management"
                className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
              {leaveStats.map((stat) => (
                <motion.div
                  key={stat.status}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={stat.link}
                    className={`flex items-center gap-2 p-2 sm:p-3 rounded-lg hover:shadow-sm transition-all duration-300 cursor-pointer relative overflow-hidden group border border-slate-600 hover:bg-slate-700/50 ${stat.status === "Pending" ? "bg-amber-500/20 text-amber-400" : stat.status === "Approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${stat.status === "Pending"
                        ? "bg-amber-500"
                        : stat.status === "Approved"
                          ? "bg-emerald-500"
                          : "bg-red-500"
                        } group-hover:w-1.5 transition-all duration-300`}
                    />
                    <div className="p-1.5 rounded-lg group-hover:scale-105 transition-transform duration-300 opacity-80">
                      <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg sm:text-xl font-extrabold">{stat.count}</p>
                      <p className="text-[10px] sm:text-xs font-semibold truncate">{stat.status}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Leave Type Breakdown */}
            <div className="mb-3 sm:mb-4">
              <h4 className="text-xs font-semibold text-slate-400 mb-2">Leave Type Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(leaveAnalytics.leaveByType).map(([type, count]) => (
                  <div
                    key={type}
                    className="p-2 bg-slate-700/50 rounded-lg border border-slate-600"
                  >
                    <p className="text-[10px] text-slate-400 mb-0.5 capitalize">{type}</p>
                    <p className="text-lg font-bold text-white">{count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 sm:mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/40">
                <p className="text-[10px] text-blue-400 mb-0.5">Average Leave Duration</p>
                <p className="text-base font-bold text-white">{leaveAnalytics.avgLeaveDuration} days</p>
              </div>
              <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/40">
                <p className="text-[10px] text-emerald-400 mb-0.5">Approval Rate</p>
                <p className="text-base font-bold text-white">{leaveAnalytics.leaveApprovalRate}%</p>
              </div>
            </div>

            {/* Upcoming Leaves */}
            {leaveAnalytics.upcomingLeaves.length > 0 && (
              <div className="mb-3 sm:mb-4">
                <h4 className="text-xs font-semibold text-slate-400 mb-2">Upcoming Leaves (Next 7 Days)</h4>
                <div className="space-y-1.5">
                  {leaveAnalytics.upcomingLeaves.map((leave) => {
                    const emp = otherUsers.find((u) => u._id === leave.employeeId);
                    return (
                      <div
                        key={leave._id || leave.id}
                        onClick={() => navigate(`/workforce-leave-management?leaveId=${leave._id || leave.id}`)}
                        className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-slate-200">
                              {emp ? `${emp.firstName} ${emp.lastName}` : "Unknown"}
                            </p>
                            <p className="text-[10px] text-slate-400 capitalize">{leave.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400">{leave.startDate}</p>
                            <p className="text-[10px] text-slate-500">→ {leave.endDate}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Leave List */}
            <div className="mt-3 sm:mt-4">
              <div className="overflow-x-auto rounded-lg border border-slate-600">
                <table className="min-w-full border-collapse text-xs">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="p-1.5 sm:p-2 text-left font-semibold text-slate-300">Employee</th>
                      <th className="p-1.5 sm:p-2 text-left font-semibold text-slate-300">Type</th>
                      <th className="p-1.5 sm:p-2 text-left font-semibold text-slate-300">Dates</th>
                      <th className="p-1.5 sm:p-2 text-left font-semibold text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.length > 0 ? (
                      leaves.slice(0, 5).map((l) => {
                        const emp = otherUsers.find((u) => u._id === l.employeeId);
                        const statusColors = {
                          pending: "bg-amber-500/20 text-amber-400 border-amber-500/40",
                          approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
                          rejected: "bg-red-500/20 text-red-400 border-red-500/40",
                        };
                        return (
                          <tr
                            key={l._id || l.id}
                            onClick={() => navigate(`/workforce-leave-management?leaveId=${l._id || l.id}`)}
                            className="border-t border-slate-600 hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer group"
                          >
                            <td className="p-1.5 sm:p-2 text-slate-200 font-medium group-hover:text-blue-400 transition-colors">
                              {emp ? `${emp.firstName} ${emp.lastName}` : "Unknown"}
                            </td>
                            <td className="p-1.5 sm:p-2 text-slate-400">{l.type}</td>
                            <td className="p-1.5 sm:p-2 text-slate-400 text-[10px] sm:text-xs">
                              {l.startDate} → {l.endDate}
                            </td>
                            <td className="p-1.5 sm:p-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[l.status as keyof typeof statusColors] ||
                                  "bg-slate-600/50 text-slate-300 border-slate-500"
                                  }`}
                              >
                                {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center py-2">
                            <FileText className="w-6 h-6 text-slate-400 mb-1" />
                            <p>No leaves found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Report Section */}
          <motion.div
            className="theme-card p-3 sm:p-4"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-slate-300">
                Reports Overview
              </h3>
              <Link
                to="/workforce-report-management"
                className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
              {reportCategories.map((cat) => (
                <motion.div
                  key={cat.status}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={cat.link}
                    className={`flex items-center gap-2 p-2 sm:p-3 rounded-lg hover:shadow-sm transition-all duration-300 cursor-pointer relative overflow-hidden group border border-slate-600 hover:bg-slate-700/50 ${cat.status === "Open" ? "bg-red-500/20 text-red-400" : cat.status === "In Progress" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${cat.status === "Open"
                        ? "bg-red-500"
                        : cat.status === "In Progress"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                        } group-hover:w-1.5 transition-all duration-300`}
                    />
                    <div className="p-1.5 rounded-lg group-hover:scale-105 transition-transform duration-300 opacity-80">
                      <cat.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs font-semibold truncate">{cat.status}</p>
                      <p className="text-lg sm:text-xl font-extrabold">{cat.count}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Report Type & Priority Breakdown */}
            <div className="mb-3 sm:mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Report Type Breakdown</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(reportAnalytics.reportByType).map(([type, count]) => (
                      <div
                        key={type}
                        className="p-1.5 bg-slate-700/50 rounded-lg border border-slate-600"
                      >
                        <p className="text-[10px] text-slate-400 mb-0.5 capitalize">{type}</p>
                        <p className="text-base font-bold text-white">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Priority Distribution</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(reportAnalytics.reportByPriority).map(([priority, count]) => (
                      <div
                        key={priority}
                        className={`p-1.5 rounded-lg border ${priority === "high"
                          ? "bg-red-500/20 border-red-500/40"
                          : priority === "medium"
                            ? "bg-amber-500/20 border-amber-500/40"
                            : priority === "low"
                              ? "bg-emerald-500/20 border-emerald-500/40"
                              : "bg-slate-700/50 border-slate-600"
                          }`}
                      >
                        <p className="text-[10px] text-slate-400 mb-0.5 capitalize">{priority === "--" ? "Not Set" : priority}</p>
                        <p className="text-base font-bold text-white">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Report Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 sm:mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/40">
                <p className="text-[10px] text-blue-400 mb-0.5">Average Resolution Time</p>
                <p className="text-base font-bold text-white">
                  {reportAnalytics.avgResolutionTime > 0
                    ? `${reportAnalytics.avgResolutionTime} days`
                    : "N/A"}
                </p>
              </div>
              <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/40">
                <p className="text-[10px] text-emerald-400 mb-0.5">Resolution Rate</p>
                <p className="text-base font-bold text-white">{reportAnalytics.reportResolutionRate}%</p>
              </div>
            </div>

            {/* Report List */}
            <div className="mt-3 sm:mt-4">
              <div className="overflow-x-auto rounded-lg border border-slate-600">
                <table className="min-w-full border-collapse text-xs">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="p-1.5 sm:p-2 text-left font-semibold text-slate-300">Employee</th>
                      <th className="p-1.5 sm:p-2 text-left font-semibold text-slate-300">Type</th>
                      <th className="p-1.5 sm:p-2 text-left font-semibold text-slate-300">Assigned To</th>
                      <th className="p-1.5 sm:p-2 text-left font-semibold text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length > 0 ? (
                      reports.slice(0, 5).map((r) => {
                        const emp = otherUsers.find((u) => u._id === r.employeeId);
                        const statusColors = {
                          open: "bg-red-500/20 text-red-400 border-red-500/40",
                          "in-progress": "bg-amber-500/20 text-amber-400 border-amber-500/40",
                          closed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
                        };

                        return (
                          <tr
                            key={r.id}
                            onClick={() => navigate(`/workforce-report-management?reportId=${r.id}`)}
                            className="border-t border-slate-600 hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer group"
                          >
                            <td className="p-1.5 sm:p-2 text-slate-200 font-medium group-hover:text-blue-400 transition-colors">
                              {emp ? `${emp.firstName} ${emp.lastName}` : "Unknown"}
                            </td>
                            <td className="p-1.5 sm:p-2 text-slate-400">{r.type}</td>
                            <td className="p-1.5 sm:p-2 text-slate-400">{r.assignedTo || "Unassigned"}</td>
                            <td className="p-1.5 sm:p-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[r.status as keyof typeof statusColors] ||
                                  "bg-slate-600/50 text-slate-300 border-slate-500"
                                  }`}
                              >
                                {r.status === "in-progress"
                                  ? "In Progress"
                                  : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center py-2">
                            <AlertTriangle className="w-6 h-6 text-slate-400 mb-1" />
                            <p>No reports found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
      <Chatbot />
    </div>
  );
}

export default WorkforceDashboard;
