/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Users,
  Calendar,
  FileText,
  AlertTriangle,
  Building2,
  TrendingUp,
  UserCheck,
  Download,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useDTRStore } from "../../../stores/global/dtr/dtr.store";
import { useLeaveStore } from "../../../stores/global/leave/leave.store";
import { useReportStore } from "../../../stores/global/report/report.store";
import { useDepartmentStore } from "../../../stores/workforce/department/department.store";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import { useWorkplaceStore } from "../../../stores/workforce/workplace/workplace.store";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import Chatbot from "../../../components/common/ChatBot";
import ExportModal from "../../../components/workforce/analytics/ExportModal";
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import SkeletonGrid from "../../../components/ui/SkeletonGrid";
import { SectionHeader } from "../../../components/ui/dashboardUi";
import { exportAnalyticsToPDF } from "../../../utils/analytics/exportToPDF";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function AnalyticsManagement() {
  const { otherUsers, fetchOtherUsers } = useUserStore();
  const { workplaces, fetchAllWorkplaces } = useWorkplaceStore();
  const { reports, fetchAllReports } = useReportStore();
  const { departments, fetchAllDepartments } = useDepartmentStore();
  const { leaves, fetchAllLeaves } = useLeaveStore();
  const { allDTRs, loadAllDTRs } = useDTRStore();

  const [dateRange, setDateRange] = useState<"week" | "month" | "quarter" | "year">("month");
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchOtherUsers(),
          fetchAllWorkplaces(),
          fetchAllReports(),
          fetchAllDepartments(),
          fetchAllLeaves(),
          loadAllDTRs(),
        ]);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [
    fetchOtherUsers,
    fetchAllWorkplaces,
    fetchAllReports,
    fetchAllDepartments,
    fetchAllLeaves,
    loadAllDTRs,
  ]);

  // Calculate date range for filtering
  const getDateRange = useMemo(() => {
    const now = new Date();
    const ranges = {
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

  // Overall Workforce Statistics
  const workforceStats = useMemo(() => {
    const totalEmployees = otherUsers.length;
    const activeEmployees = otherUsers.filter((u) => !u.archived).length;
    const archivedEmployees = totalEmployees - activeEmployees;

    const positionCounts = otherUsers.reduce((acc, user) => {
      const pos = user.position || "Unknown";
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEmployees,
      activeEmployees,
      archivedEmployees,
      positionCounts,
    };
  }, [otherUsers]);

  // Attendance & Absence Analytics - Fixed for accuracy
  const attendanceAnalytics = useMemo(() => {
    const activeEmployees = otherUsers.filter((u) => !u.archived);
    const totalEmployees = activeEmployees.length;

    // Filter DTRs by date range and normalize dates
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

    // Get unique employees with DTR in the period
    const employeesWithDTR = new Set(filteredDTRs.map((d) => d.userId)).size;
    const absentEmployees = Math.max(0, totalEmployees - employeesWithDTR);

    // Calculate accurate attendance rate
    const attendanceRate =
      totalEmployees > 0 ? (employeesWithDTR / totalEmployees) * 100 : 0;

    // Group by date for trend - more accurate calculation
    const uniqueDates = new Set(filteredDTRs.map((d) => d.date));
    const dailyAttendance: Record<string, { date: string; present: number; absent: number }> = {};

    uniqueDates.forEach((date) => {
      const dtrsForDate = filteredDTRs.filter((d) => d.date === date);
      const presentCount = new Set(dtrsForDate.map((d) => d.userId)).size;
      dailyAttendance[date] = {
        date,
        present: presentCount,
        absent: Math.max(0, totalEmployees - presentCount),
      };
    });

    const attendanceTrend = Object.values(dailyAttendance)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    return {
      totalDays: uniqueDates.size,
      employeesWithDTR,
      absentEmployees,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      attendanceTrend,
    };
  }, [allDTRs, otherUsers, getDateRange]);

  // Leave Analytics
  const leaveAnalytics = useMemo(() => {
    const filteredLeaves = leaves.filter((leave) => {
      const leaveDate = new Date(leave.startDate);
      return leaveDate >= getDateRange.start && leaveDate <= getDateRange.end;
    });

    const leaveByType = filteredLeaves.reduce(
      (acc, leave) => {
        acc[leave.type] = (acc[leave.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const leaveByStatus = filteredLeaves.reduce(
      (acc, leave) => {
        acc[leave.status] = (acc[leave.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Monthly leave trend
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

    const leaveTrend = Object.values(monthlyLeaves).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    return {
      totalLeaves: filteredLeaves.length,
      leaveByType,
      leaveByStatus,
      leaveTrend,
    };
  }, [leaves, getDateRange]);

  // Department Analytics - Fixed for accuracy
  const departmentAnalytics = useMemo(() => {
    const safeDepartments = Array.isArray(departments)
      ? departments
      : (departments as any)?.departments || (departments as any)?.items || [];

    // Filter leaves and reports by date range
    const filteredLeaves = leaves.filter((leave) => {
      try {
        const leaveDate = new Date(leave.startDate);
        leaveDate.setHours(0, 0, 0, 0);
        const start = new Date(getDateRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(getDateRange.end);
        end.setHours(23, 59, 59, 999);
        return leaveDate >= start && leaveDate <= end;
      } catch {
        return false;
      }
    });

    const filteredReports = reports.filter((report) => {
      try {
        const reportDate = new Date(report.createdAt || new Date());
        reportDate.setHours(0, 0, 0, 0);
        const start = new Date(getDateRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(getDateRange.end);
        end.setHours(23, 59, 59, 999);
        return reportDate >= start && reportDate <= end;
      } catch {
        return false;
      }
    });

    const departmentStats = safeDepartments.map((dept: any) => {
      const members = Array.isArray(dept.members) ? dept.members.length : 0;
      const deptMemberIds = Array.isArray(dept.members)
        ? dept.members.map(String)
        : [];
      const deptLeaves = filteredLeaves.filter((l) =>
        deptMemberIds.includes(String(l.employeeId))
      ).length;
      const deptReports = filteredReports.filter((r) =>
        deptMemberIds.includes(String(r.employeeId))
      ).length;

      return {
        _id: String(dept._id || ""),
        name: String(dept.name || "Unknown"),
        members,
        leaves: deptLeaves,
        reports: deptReports,
      };
    });

    return {
      totalDepartments: safeDepartments.length,
      departmentStats,
    };
  }, [departments, leaves, reports, getDateRange]);

  // Workplace Utilization
  const workplaceAnalytics = useMemo(() => {
    const safeWorkplaces = Array.isArray(workplaces)
      ? workplaces
      : (workplaces as any)?.data || (workplaces as any)?.items || [];

    const totalWorkstations = safeWorkplaces.reduce(
      (sum: number, wp: any) => sum + (wp.workstations?.length || 0),
      0
    );

    const today = new Date().toISOString().split("T")[0];
    const assignedWorkstations = safeWorkplaces.reduce((sum: number, wp: any) => {
      const count = (wp.workstations || []).filter((ws: any) =>
        (ws.dates || []).some(
          (d: any) => d?.date === today && (d.assignedUsers?.length || 0) > 0
        )
      ).length;
      return sum + count;
    }, 0);

    const utilizationRate =
      totalWorkstations > 0
        ? (assignedWorkstations / totalWorkstations) * 100
        : 0;

    return {
      totalWorkplaces: safeWorkplaces.length,
      totalWorkstations,
      assignedWorkstations,
      availableWorkstations: totalWorkstations - assignedWorkstations,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
    };
  }, [workplaces]);

  // Report Analytics
  const reportAnalytics = useMemo(() => {
    const filteredReports = reports.filter((report) => {
      const reportDate = new Date(report.createdAt || new Date());
      return reportDate >= getDateRange.start && reportDate <= getDateRange.end;
    });

    const reportsByStatus = filteredReports.reduce(
      (acc, report) => {
        acc[report.status] = (acc[report.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const reportsByType = filteredReports.reduce(
      (acc, report) => {
        acc[report.type] = (acc[report.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Monthly report trend
    const monthlyReports = filteredReports.reduce((acc, report) => {
      const month = new Date(report.createdAt || new Date()).toLocaleDateString(
        "en-US",
        { month: "short", year: "numeric" }
      );
      if (!acc[month]) {
        acc[month] = { month, count: 0 };
      }
      acc[month].count += 1;
      return acc;
    }, {} as Record<string, { month: string; count: number }>);

    const reportTrend = Object.values(monthlyReports).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    return {
      totalReports: filteredReports.length,
      reportsByStatus,
      reportsByType,
      reportTrend,
    };
  }, [reports, getDateRange]);

  // Prepare chart data
  const positionChartData = useMemo(() => {
    return Object.entries(workforceStats.positionCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [workforceStats.positionCounts]);

  const leaveTypeChartData = useMemo(() => {
    return Object.entries(leaveAnalytics.leaveByType).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [leaveAnalytics.leaveByType]);

  const leaveStatusChartData = useMemo(() => {
    return Object.entries(leaveAnalytics.leaveByStatus).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [leaveAnalytics.leaveByStatus]);

  const reportStatusChartData = useMemo(() => {
    return Object.entries(reportAnalytics.reportsByStatus).map(([name, value]) => ({
      name: name === "in-progress" ? "In Progress" : name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [reportAnalytics.reportsByStatus]);

  const departmentChartData = useMemo(() => {
    return departmentAnalytics.departmentStats
      .sort((a: { members: number }, b: { members: number }) => b.members - a.members)
      .slice(0, 10)
      .map((dept: { name: string; members: number; leaves: number; reports: number }) => ({
        name: dept.name,
        members: dept.members,
        leaves: dept.leaves,
        reports: dept.reports,
      }));
  }, [departmentAnalytics.departmentStats]);

  if (loading) {
    return (
      <div className="w-full space-y-6 pb-8">
        <SkeletonGrid count={4} columns="sm:grid-cols-2 lg:grid-cols-4" />
        <SkeletonGrid count={4} columns="lg:grid-cols-2" />
      </div>
    );
  }

  return (
    <motion.div
      className="w-full space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={TrendingUp}
          eyebrow="Workforce"
          title="Workforce Analytics"
          subtitle="Comprehensive analytics and insights for workforce management"
          actions={
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Date Range Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Period:</label>
                <select
                  value={dateRange}
                  onChange={(e) =>
                    setDateRange(e.target.value as "week" | "month" | "quarter" | "year")
                  }
                  className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-full sm:w-auto bg-white text-slate-700"
                >
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="quarter">Last Quarter</option>
                  <option value="year">Last Year</option>
                </select>
              </div>

              {/* Export Button */}
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap w-full sm:w-auto justify-center"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
            </div>
          }
        />
      </motion.div>

      {/* Key Metrics Cards */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={itemVariants}
      >
        <StatCard
          title="Total Employees"
          value={workforceStats.totalEmployees}
          subtitle={`${workforceStats.activeEmployees} active`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceAnalytics.attendanceRate}%`}
          subtitle={`${attendanceAnalytics.employeesWithDTR} present · ${attendanceAnalytics.absentEmployees} absent`}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="Leave Requests"
          value={leaveAnalytics.totalLeaves}
          subtitle={`${leaveAnalytics.leaveByStatus.approved || 0} approved`}
          icon={FileText}
          color="yellow"
        />
        <StatCard
          title="Total Reports"
          value={reportAnalytics.totalReports}
          subtitle={`${reportAnalytics.reportsByStatus.open || 0} open`}
          icon={AlertTriangle}
          color="purple"
        />
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          variants={itemVariants}
        >
          <SectionHeader icon={UserCheck} title="Attendance Trend" tint="green" />
          <ResponsiveContainer width="100%" height={250} minHeight={200}>
            <AreaChart data={attendanceAnalytics.attendanceTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                stroke="#6B7280"
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => {
                  try {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  } catch {
                    return value;
                  }
                }}
              />
              <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="present"
                stroke="#10B981"
                fill="#6EE7B7"
                strokeWidth={2}
                name="Present"
              />
              <Area
                type="monotone"
                dataKey="absent"
                stroke="#EF4444"
                fill="#FCA5A5"
                strokeWidth={2}
                name="Absent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Employees by Position */}
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          variants={itemVariants}
        >
          <SectionHeader icon={Users} title="Employees by Position" />
          <ResponsiveContainer width="100%" height={250} minHeight={200}>
            <PieChart>
              <Pie
                data={positionChartData}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                label={{ fontSize: 10 }}
              >
                {positionChartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Leave Trends */}
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          variants={itemVariants}
        >
          <SectionHeader icon={Calendar} title="Leave Trends" tint="amber" />
          <ResponsiveContainer width="100%" height={250} minHeight={200}>
            <BarChart data={leaveAnalytics.leaveTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="count" fill="#F59E0B" name="Leave Requests" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Leave by Type */}
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          variants={itemVariants}
        >
          <SectionHeader icon={FileText} title="Leave by Type" tint="amber" />
          <ResponsiveContainer width="100%" height={250} minHeight={200}>
            <PieChart>
              <Pie
                data={leaveTypeChartData}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                label={{ fontSize: 10 }}
              >
                {leaveTypeChartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Department Distribution */}
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          variants={itemVariants}
        >
          <SectionHeader icon={Building2} title="Department Distribution" tint="purple" />
          <ResponsiveContainer width="100%" height={300} minHeight={250}>
            <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: 0, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
                stroke="#6B7280" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fontSize: 9 }}
              />
              <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="members" fill="#3B82F6" name="Members" />
              <Bar dataKey="leaves" fill="#F59E0B" name="Leaves" />
              <Bar dataKey="reports" fill="#EF4444" name="Reports" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Report Trends */}
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          variants={itemVariants}
        >
          <SectionHeader icon={AlertTriangle} title="Report Trends" tint="indigo" />
          <ResponsiveContainer width="100%" height={250} minHeight={200}>
            <LineChart data={reportAnalytics.reportTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#EF4444"
                strokeWidth={2}
                name="Reports"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workplace Utilization */}
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          variants={itemVariants}
        >
          <SectionHeader icon={Building2} title="Workplace Utilization" tint="indigo" />
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Total Workplaces</span>
              <span className="font-bold text-slate-900">
                {workplaceAnalytics.totalWorkplaces}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Total Workstations</span>
              <span className="font-bold text-slate-900">
                {workplaceAnalytics.totalWorkstations}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Assigned</span>
              <span className="font-bold text-green-600">
                {workplaceAnalytics.assignedWorkstations}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Available</span>
              <span className="font-bold text-slate-600">
                {workplaceAnalytics.availableWorkstations}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Utilization Rate</span>
                <span className="font-bold text-indigo-600">
                  {workplaceAnalytics.utilizationRate}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Leave Status */}
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          variants={itemVariants}
        >
          <SectionHeader icon={Calendar} title="Leave Status" tint="amber" />
          <ResponsiveContainer width="100%" height={200} minHeight={150}>
            <PieChart>
              <Pie
                data={leaveStatusChartData}
                dataKey="value"
                nameKey="name"
                outerRadius={60}
                label={{ fontSize: 9 }}
              >
                {leaveStatusChartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Report Status */}
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          variants={itemVariants}
        >
          <SectionHeader icon={AlertTriangle} title="Report Status" tint="indigo" />
          <ResponsiveContainer width="100%" height={200} minHeight={150}>
            <PieChart>
              <Pie
                data={reportStatusChartData}
                dataKey="value"
                nameKey="name"
                outerRadius={60}
                label={{ fontSize: 9 }}
              >
                {reportStatusChartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Export Modal */}
      <ExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        departments={departmentAnalytics.departmentStats.map((d: { _id: string; name: string }) => ({
          _id: d._id,
          name: d.name,
        }))}
        loading={exportLoading}
        onExport={async (options) => {
          setExportLoading(true);
          try {
            // Filter data based on export options
            const exportStartDate = new Date(options.startDate);
            exportStartDate.setHours(0, 0, 0, 0);
            const exportEndDate = new Date(options.endDate);
            exportEndDate.setHours(23, 59, 59, 999);

            // Filter employees by department if selected
            let filteredEmployees = otherUsers.filter((u) => !u.archived);
            if (options.departmentId !== "all") {
              const safeDepartments = Array.isArray(departments)
                ? departments
                : (departments as any)?.departments || (departments as any)?.items || [];
              const selectedDept = safeDepartments.find(
                (d: any) => String(d._id) === options.departmentId
              );
              if (selectedDept) {
                const deptMemberIds = Array.isArray(selectedDept.members)
                  ? selectedDept.members.map(String)
                  : [];
                filteredEmployees = otherUsers.filter((u) =>
                  deptMemberIds.includes(String(u._id))
                );
              }
            }

            // Filter DTRs
            const exportDTRs = allDTRs.filter((dtr) => {
              const dtrDate = new Date(dtr.date);
              return dtrDate >= exportStartDate && dtrDate <= exportEndDate;
            });

            // Filter leaves
            const exportLeaves = leaves.filter((leave) => {
              const leaveDate = new Date(leave.startDate);
              return leaveDate >= exportStartDate && leaveDate <= exportEndDate;
            });

            // Filter reports
            const exportReports = reports.filter((report) => {
              const reportDate = new Date(report.createdAt || new Date());
              return reportDate >= exportStartDate && reportDate <= exportEndDate;
            });

            // Calculate stats for export
            const exportWorkforceStats = {
              totalEmployees: filteredEmployees.length,
              activeEmployees: filteredEmployees.filter((u) => !u.archived).length,
              archivedEmployees: filteredEmployees.filter((u) => u.archived).length,
            };

            const employeesWithDTR = new Set(exportDTRs.map((d) => d.userId)).size;
            const exportAttendanceStats = {
              attendanceRate:
                filteredEmployees.length > 0
                  ? (employeesWithDTR / filteredEmployees.length) * 100
                  : 0,
              employeesWithDTR,
              absentEmployees: Math.max(0, filteredEmployees.length - employeesWithDTR),
            };

            const exportLeaveStats = {
              totalLeaves: exportLeaves.length,
              leaveByType: exportLeaves.reduce(
                (acc, leave) => {
                  acc[leave.type] = (acc[leave.type] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              ),
              leaveByStatus: exportLeaves.reduce(
                (acc, leave) => {
                  acc[leave.status] = (acc[leave.status] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              ),
            };

            const exportReportStats = {
              totalReports: exportReports.length,
              reportsByStatus: exportReports.reduce(
                (acc, report) => {
                  acc[report.status] = (acc[report.status] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              ),
            };

            const departmentName =
              options.departmentId === "all"
                ? "All Departments"
                : departmentAnalytics.departmentStats.find((d: { _id: string; name: string }) => d._id === options.departmentId)
                    ?.name || "Unknown";

            const exportDepartmentStats =
              options.departmentId === "all"
                ? departmentAnalytics.departmentStats
                : departmentAnalytics.departmentStats.filter(
                    (d: { _id: string }) => d._id === options.departmentId
                  );

            await exportAnalyticsToPDF({
              startDate: options.startDate,
              endDate: options.endDate,
              departmentName,
              workforceStats: exportWorkforceStats,
              attendanceStats: exportAttendanceStats,
              leaveStats: exportLeaveStats,
              reportStats: exportReportStats,
              workplaceStats: workplaceAnalytics,
              departmentStats: exportDepartmentStats,
            });

            setShowExportModal(false);
          } catch (error) {
            console.error("Export error:", error);
            alert("Failed to export report. Please try again.");
          } finally {
            setExportLoading(false);
          }
        }}
      />

      <Chatbot />
    </motion.div>
  );
}

