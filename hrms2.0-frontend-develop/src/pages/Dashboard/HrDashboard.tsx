/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Briefcase,
  TrendingUp,
  Users,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserPlus,
  Plane,
  AlertCircle,
  Building2,
  Award,
  DollarSign,
  Activity,
  BarChart3,
  CheckCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import StatCard from "./StatCard";
import { motion } from "framer-motion";
import Avatar from "avatox";
import AnalyticsSection from "../../components/hr/dashboard/AnalyticsSection";
import useAuthStore from "../../stores/auth/auth.store";
import { useNavigate } from "react-router-dom";
import { useFetchData } from "../../hooks/useFetchData";
import BackToTop from "../../components/common/BackToTop";
import Chatbot from "../../components/common/ChatBot";
import { useDepartmentStore } from "../../stores/workforce/department/department.store";
import { useDTRStore } from "../../stores/global/dtr/dtr.store";
import { useLeaveStore } from "../../stores/global/leave/leave.store";
import { useReportStore } from "../../stores/global/report/report.store";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// Helper function to check if avatar is a valid image URL
const isValidImageUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== "string" || url.trim() === "") return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:image/") ||
    url.startsWith("/")
  );
};

function HRDashboard() {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const { account } = useAuthStore();
  const navigate = useNavigate();

  const { filteredApplicants, filteredEmployee } = useFetchData();
  const { departments } = useDepartmentStore();
  const { allDTRs } = useDTRStore();
  const { leaves } = useLeaveStore();
  const { reports } = useReportStore();

  const today = new Date().toISOString().split("T")[0];

  /* ---------------- Employee Statistics ---------------- */
  const activeEmployees = useMemo(() => {
    return filteredEmployee.filter((emp) => (emp as any).status === "active").length;
  }, [filteredEmployee]);

  const presentToday = useMemo(() => {
    return allDTRs.filter((dtr) => dtr.date === today).length;
  }, [allDTRs, today]);

  /* ---------------- Leave Statistics ---------------- */
  const pendingLeaves = useMemo(() => {
    return leaves.filter((leave) => leave.status === "pending").length;
  }, [leaves]);

  const approvedLeavesToday = useMemo(() => {
    return leaves.filter(
      (leave) =>
        leave.status === "approved" &&
        leave.startDate <= today &&
        leave.endDate >= today
    ).length;
  }, [leaves, today]);

  /* ---------------- Applicant Statistics ---------------- */
  const unreviewedApplicants = useMemo(() => {
    return filteredApplicants.filter((app) => app.status === "Unreviewed")
      .length;
  }, [filteredApplicants]);

  /* ---------------- Department Distribution ---------------- */
  const departmentData = useMemo(() => {
    return departments.map((dept: any) => ({
      name: dept.name,
      value: dept.members?.length || 0,
    }));
  }, [departments]);

  const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  /* ---------------- Position Distribution ---------------- */
  const positionData = useMemo(() => {
    const positionMap = new Map<string, number>();
    filteredEmployee.forEach((emp) => {
      const position = Array.isArray(emp.position)
        ? emp.position[0]
        : emp.position || "Unknown";
      positionMap.set(position, (positionMap.get(position) || 0) + 1);
    });
    return Array.from(positionMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredEmployee]);

  /* ---------------- Attendance Trend (Last 7 Days) ---------------- */
  const attendanceTrend = useMemo(() => {
    return Array.from({ length: 7 })
      .map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const present = allDTRs.filter((dtr) => dtr.date === dateStr).length;
        const total = filteredEmployee.length;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(0) : 0;
        return {
          date: date.toLocaleDateString("en-US", { weekday: "short" }),
          present,
          total,
          percentage: Number(percentage),
        };
      })
      .reverse();
  }, [allDTRs, filteredEmployee]);

  /* ---------------- Recent Activities ---------------- */
  const recentActivities = useMemo(() => {
    const activities: Array<{
      type: string;
      title: string;
      date: string;
      employee: string;
      icon: any;
      color: string;
    }> = [];

    // Recent hires (new employees)
    filteredEmployee
      .slice(0, 3)
      .forEach((emp) => {
        activities.push({
          type: "New Hire",
          title: `${emp.firstName} ${emp.lastName} joined`,
          date: (emp as any).createdAt || today,
          employee: `${emp.firstName} ${emp.lastName}`,
          icon: UserPlus,
          color: "blue",
        });
      });

    // Recent leave requests
    leaves
      .filter((leave) => leave.status === "pending")
      .slice(0, 3)
      .forEach((leave) => {
        const emp = filteredEmployee.find((e) => e._id === leave.employeeId);
        activities.push({
          type: "Leave Request",
          title: `${leave.type} - ${leave.startDate}`,
          date: (leave as any).createdAt || leave.startDate,
          employee: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
          icon: Plane,
          color: "yellow",
        });
      });

    // Recent reports
    reports.slice(0, 2).forEach((report) => {
      const emp = filteredEmployee.find((e) => e._id === report.employeeId);
      activities.push({
        type: "Report",
        title: report.type,
        date: (report as any).createdAt || today,
        employee: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
        icon: AlertCircle,
        color: "red",
      });
    });

    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [filteredEmployee, leaves, reports, today]);

  /* ---------------- Applicant Pipeline ---------------- */
  const applicantPipeline = useMemo(() => {
    return [
      {
        status: "Unreviewed",
        count: filteredApplicants.filter((a) => a.status === "Unreviewed")
          .length,
        color: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
      },
      {
        status: "Under Review",
        count: filteredApplicants.filter((a) => a.status === "Under Review")
          .length,
        color: "bg-blue-500/20 text-blue-400 border border-blue-500/40",
      },
      {
        status: "Accepted",
        count: filteredApplicants.filter((a) => a.status === "Accepted").length,
        color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
      },
      {
        status: "Rejected",
        count: filteredApplicants.filter((a) => a.status === "Rejected").length,
        color: "bg-red-500/20 text-red-400 border border-red-500/40",
      },
    ];
  }, [filteredApplicants]);

  const stats = [
    {
      title: "Total Employees",
      value: filteredEmployee.length,
      subtitle: `${activeEmployees} active`,
      icon: Users,
      color: "blue" as const,
      link: "/employees",
    },
    {
      title: "Present Today",
      value: presentToday,
      subtitle: `${approvedLeavesToday} on leave`,
      icon: UserCheck,
      color: "green" as const,
      link: "/dtr-management",
    },
    {
      title: "Pending Leaves",
      value: pendingLeaves,
      subtitle: `${leaves.length} total requests`,
      icon: Plane,
      color: "yellow" as const,
      link: "/leave-management",
    },
    {
      title: "Total Applicants",
      value: filteredApplicants.length,
      subtitle: `${unreviewedApplicants} unreviewed`,
      icon: UserPlus,
      color: "purple" as const,
      link: "/hr-applicant-management",
    },
    {
      title: "Departments",
      value: departments.length,
      subtitle: "active departments",
      icon: Building2,
      color: "blue" as const,
      link: "/departments",
    },
    {
      title: "Open Reports",
      value: reports.filter((r) => r.status === "open").length,
      subtitle: `${reports.length} total`,
      icon: AlertCircle,
      color: "red" as const,
      link: "/report-management",
    },
  ];

  const actions = [
    {
      icon: <Users className="w-5 h-5 text-blue-600 mb-1.5" />,
      label: "Manage Employees",
      onClick: () => navigate("/employees"),
    },
    {
      icon: <UserPlus className="w-5 h-5 text-green-600 mb-1.5" />,
      label: "Review Applicants",
      onClick: () => navigate("/hr-applicant-management"),
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-purple-600 mb-1.5" />,
      label: "Approve Leaves",
      onClick: () => navigate("/leave-management"),
    },
    {
      icon: <Briefcase className="w-5 h-5 text-orange-600 mb-1.5" />,
      label: "Job Postings",
      onClick: () => navigate("/hr-job-management"),
    },
    {
      icon: <DollarSign className="w-5 h-5 text-emerald-600 mb-1.5" />,
      label: "Payroll",
      onClick: () => navigate("/payroll"),
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-indigo-600 mb-1.5" />,
      label: "View Analytics",
      onClick: () => {
        setShowAnalytics(!showAnalytics);
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth",
        });
      },
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const fullName = `${account?.firstName ?? ""} ${account?.lastName ?? ""}`;

  return (
    <>
      <motion.div
        className="space-y-4 pb-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div
          className="flex flex-row sm:flex-row items-center justify-between theme-card p-4 gap-4"
          variants={itemVariants}
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">
              Welcome back, {account?.firstName}!
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm truncate">
              {Array.isArray(account?.position)
                ? account.position[0] ?? "HR Manager"
                : account?.position || "HR Manager"}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              {filteredEmployee.length} employees • {departments.length}{" "}
              departments
            </p>
          </div>
          <div className="flex-shrink-0">
            <Avatar
              src={
                isValidImageUrl(account?.profilePicture)
                  ? account?.profilePicture
                  : undefined
              }
              name={fullName}
              className="!h-12 !w-12 sm:!h-14 sm:!w-14 !text-lg sm:!text-xl border-2 border-slate-600 shadow-lg"
            />
          </div>
        </motion.div>

        {showAnalytics ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnalyticsSection />
          </motion.div>
        ) : (
          <>
            {/* Stat Cards */}
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
              variants={itemVariants}
            >
              {stats.map((stat, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <StatCard
                    {...stat}
                    onClick={() => stat.link && navigate(stat.link)}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Charts Row */}
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
              variants={itemVariants}
            >
              {/* Attendance Trend */}
              <motion.div
                className="theme-card p-4 flex flex-col"
                variants={itemVariants}
                style={{ minHeight: "300px" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Company Attendance (Last 7 Days)
                  </h3>
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid rgb(71 85 105)",
                          backgroundColor: "rgb(30 41 59)",
                          boxShadow: "0 25px 50px -12px rgb(59 130 246 / 0.2)",
                        }}
                        labelStyle={{ color: "#e2e8f0" }}
                      />
                      <Bar dataKey="present" fill="#60a5fa" name="Present" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Average attendance:{" "}
                  <span className="font-semibold text-slate-300">
                    {attendanceTrend.length > 0
                      ? (
                        attendanceTrend.reduce(
                          (sum, day) => sum + (day.percentage || 0),
                          0
                        ) / attendanceTrend.length
                      ).toFixed(1)
                      : "0.0"}
                    %
                  </span>
                </div>
              </motion.div>

              {/* Department Distribution */}
              <motion.div
                className="theme-card p-4 flex flex-col"
                variants={itemVariants}
                style={{ minHeight: "300px" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Department Distribution
                  </h3>
                  <Building2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 w-full min-h-0 relative">
                  {departmentData && departmentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={departmentData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            percent > 0
                              ? `${name}: ${(percent * 100).toFixed(0)}%`
                              : ""
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {departmentData.map((_entry: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid rgb(71 85 105)",
                            backgroundColor: "rgb(30 41 59)",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                      No departments found
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Total employees:{" "}
                  <span className="font-semibold text-slate-300">{filteredEmployee?.length || 0}</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Applicant Pipeline & Position Distribution */}
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
              variants={itemVariants}
            >
              {/* Applicant Pipeline */}
              <motion.div
                className="theme-card p-4"
                variants={itemVariants}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Recruitment Pipeline
                  </h3>
                  <UserPlus className="w-5 h-5 text-purple-400" />
                </div>
                <div className="space-y-2">
                  {applicantPipeline.map((stage, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${stage.color}`}
                        >
                          {stage.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">
                          {stage.count}
                        </span>
                        <div className="w-24 bg-slate-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${stage.status === "Accepted"
                              ? "bg-green-600"
                              : stage.status === "Rejected"
                                ? "bg-red-600"
                                : stage.status === "Unreviewed"
                                  ? "bg-yellow-600"
                                  : "bg-blue-600"
                              }`}
                            style={{
                              width: `${Math.min(
                                (stage.count / filteredApplicants.length) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  Total applicants:{" "}
                  <span className="font-semibold text-slate-300">
                    {filteredApplicants.length}
                  </span>
                </div>
              </motion.div>

              {/* Position Distribution */}
              <motion.div
                className="theme-card p-4"
                variants={itemVariants}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Employee Positions
                  </h3>
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  {positionData
                    .sort((a, b) => b.value - a.value)
                    .map((position, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs font-semibold text-slate-500 w-6">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-medium text-slate-200 truncate">
                            {position.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-blue-400">
                            {position.value}
                          </span>
                          <div className="w-16 bg-slate-600 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(
                                  (position.value / filteredEmployee.length) *
                                  100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Recent Activities & Employee List */}
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
              variants={itemVariants}
            >
              {/* Recent Activities */}
              <motion.div
                className="theme-card p-4"
                variants={itemVariants}
              >
                <h3 className="text-sm font-semibold mb-3 text-slate-300 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent HR Activities
                </h3>
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {recentActivities.map((activity, idx) => {
                    const Icon = activity.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-2 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
                      >
                        <div
                          className={`p-2 rounded-lg ${activity.color === "blue"
                            ? "bg-blue-500/20 text-blue-400"
                            : activity.color === "yellow"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                            }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {activity.type}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {activity.employee}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {activity.title}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            {new Date(activity.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {recentActivities.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">
                      No recent activities
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Recent Employees */}
              <motion.div
                className="theme-card p-4"
                variants={itemVariants}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Recent Employees
                  </h3>
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {filteredEmployee.slice(0, 8).map((emp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                      onClick={() => navigate("/employees")}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar
                          src={
                            isValidImageUrl(emp.profilePicture)
                              ? emp.profilePicture
                              : undefined
                          }
                          name={`${emp.firstName} ${emp.lastName}`}
                          className="!h-8 !w-8 !text-xs"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {Array.isArray(emp.position)
                              ? emp.position[0]
                              : emp.position || "Employee"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-medium ${(emp as any).status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-600/50 text-slate-300"
                          }`}
                      >
                        {(emp as any).status || "active"}
                      </span>
                    </div>
                  ))}
                  {filteredEmployee.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">
                      No employees found
                    </p>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              className="theme-card p-4"
              variants={itemVariants}
            >
              <h3 className="text-sm sm:text-base font-semibold text-white mb-3">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {actions.map((action, index) => (
                  <motion.button
                    key={index}
                    onClick={action.onClick}
                    className="flex flex-col items-center p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 hover:shadow-lg transition-all relative group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    variants={itemVariants}
                  >
                    {action.icon}
                    <span className="text-xs font-medium text-slate-200 text-center">
                      {action.label}
                    </span>
                    {action.label === "View Analytics" && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {showAnalytics ? (
                          <ChevronUp className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Fixed Position Components */}
      <Chatbot />
      <BackToTop />
    </>
  );
}

export default HRDashboard;
