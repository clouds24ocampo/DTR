/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Clock,
  FileText,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Plane,
  BarChart3,
  UserCheck,
  UserX,
  Timer,
  Activity,
  Target,
  Award,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDepartmentStore } from "../../stores/workforce/department/department.store";
import { useDTRStore } from "../../stores/global/dtr/dtr.store";
import { useReportStore } from "../../stores/global/report/report.store";
import { useProgressReportStore } from "../../stores/global/progress/progress.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import { useLeaveStore } from "../../stores/global/leave/leave.store";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import StatCard from "./StatCard";
import Avatar from "avatox";

import {
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Legend,
} from "recharts";

export default function TeamLeaderDashboard() {
  const { user, otherUsers } = useUserStore();
  const { allDTRs } = useDTRStore();
  const { reports } = useReportStore();
  const { progressReports, fetchAllProgressReports } = useProgressReportStore();
  const { departments } = useDepartmentStore();
  const { leaves } = useLeaveStore();
  const navigate = useNavigate();

  const [activeToday, setActiveToday] = useState(0);
  const [openReports, setOpenReports] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  /* ---------------- Department of Current User ---------------- */
  const userDepartment = useMemo(() => {
    if (!user || !departments) return null;
    return departments.find((d: any) => d.members?.includes(user._id)) || null;
  }, [departments, user]);

  /* ---------------- Team Members (Department Members) ---------------- */
  const teamMembers = useMemo(() => {
    if (!userDepartment) return [];
    return otherUsers.filter((emp) =>
      userDepartment.members?.includes(emp._id)
    );
  }, [userDepartment, otherUsers]);

  /* ---------------- Team Leaves ---------------- */
  const teamLeaves = useMemo(() => {
    const teamMemberIds = teamMembers.map((m) => m._id);
    return leaves.filter((leave) => teamMemberIds.includes(leave.employeeId));
  }, [leaves, teamMembers]);

  const pendingLeaves = useMemo(() => {
    return teamLeaves.filter((l) => l.status === "pending").length;
  }, [teamLeaves]);

  /* ---------------- Team Progress Reports ---------------- */
  const teamProgressReports = useMemo(() => {
    const teamMemberIds = teamMembers.map((m) => m._id);
    return progressReports.filter((r) =>
      teamMemberIds.includes(r.employeeId)
    );
  }, [progressReports, teamMembers]);

  const pendingProgressReports = useMemo(() => {
    return teamProgressReports.filter((r) => r.status === "submitted").length;
  }, [teamProgressReports]);

  /* ---------------- Team Reports ---------------- */
  const teamReports = useMemo(() => {
    const teamMemberIds = teamMembers.map((m) => m._id);
    return reports.filter((r) => teamMemberIds.includes(r.employeeId));
  }, [reports, teamMembers]);

  useEffect(() => {
    fetchAllProgressReports().catch(console.error);

    const activeCount = teamMembers.filter((emp) => {
      const empDTR = allDTRs.filter((dtr) => dtr.userId === emp._id);
      return empDTR.some((dtr) => dtr.date === today);
    }).length;
    setActiveToday(activeCount);

    const openReportCount = teamReports.filter(
      (rep) => rep.status === "open"
    ).length;
    setOpenReports(openReportCount);
  }, [user, otherUsers, allDTRs, reports, teamMembers, teamReports, today]);

  /* ---------------- Team Attendance Trend ---------------- */
  const attendanceTrend = useMemo(() => {
    return Array.from({ length: 7 })
      .map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const teamMemberIds = teamMembers.map((m) => m._id);
        const active = allDTRs.filter(
          (dtr) => dtr.date === dateStr && teamMemberIds.includes(dtr.userId)
        ).length;
        const total = teamMembers.length;
        const percentage = total > 0 ? ((active / total) * 100).toFixed(0) : 0;
        return {
          date: date.toLocaleDateString("en-US", { weekday: "short" }),
          active,
          total,
          percentage: Number(percentage),
        };
      })
      .reverse();
  }, [allDTRs, teamMembers]);

  /* ---------------- Team Performance (Hours Worked) ---------------- */
  const teamPerformance = useMemo(() => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split("T")[0];

    return teamMembers.map((member) => {
      const memberDTRs = allDTRs.filter(
        (dtr) => dtr.userId === member._id && dtr.date >= weekStart
      );

      const totalHours = memberDTRs.reduce((total, dtr) => {
        const sessions = dtr.sessions || [];
        const dailyHours = sessions.reduce((sum, session) => {
          const fullDTR = session.fullDTR || [];
          const workEntries = fullDTR.filter(
            (entry) => entry.type === "work" && entry.status === "done"
          );
          const hours = workEntries.reduce((h, entry) => {
            const [startHour, startMin] = entry.startTime.split(":").map(Number);
            const [endHour, endMin] = (entry.endTime || "00:00")
              .split(":")
              .map(Number);
            const start = startHour + startMin / 60;
            const end = endHour + endMin / 60;
            return h + (end - start);
          }, 0);
          return sum + hours;
        }, 0);
        return total + dailyHours;
      }, 0);

      const daysPresent = memberDTRs.length;

      return {
        name: `${member.firstName} ${member.lastName}`,
        hours: parseFloat(totalHours.toFixed(1)),
        days: daysPresent,
        id: member._id,
      };
    });
  }, [teamMembers, allDTRs]);

  /* ---------------- Team Member Status Today ---------------- */
  const teamMemberStatus = useMemo(() => {
    return teamMembers.map((member) => {
      const todayDTR = allDTRs.find(
        (dtr) => dtr.userId === member._id && dtr.date === today
      );
      const todayLeave = teamLeaves.find(
        (leave) =>
          leave.employeeId === member._id &&
          leave.startDate <= today &&
          leave.endDate >= today &&
          leave.status === "approved"
      );

      let status = "absent";
      let statusColor = "bg-red-100 text-red-700";
      let statusIcon = UserX;

      if (todayDTR) {
        status = "present";
        statusColor = "bg-green-100 text-green-700";
        statusIcon = UserCheck;
      } else if (todayLeave) {
        status = "on leave";
        statusColor = "bg-blue-100 text-blue-700";
        statusIcon = Plane;
      }

      return {
        ...member,
        status,
        statusColor,
        statusIcon,
        todayDTR,
      };
    });
  }, [teamMembers, allDTRs, teamLeaves, today]);

  /* ---------------- Report Status Cards ---------------- */
  const reportCategories = useMemo(() => {
    return [
      {
        status: "Open",
        count: teamReports.filter((r) => r.status === "open").length,
        color: "bg-red-100 text-red-700",
        link: "/report-management?status=open",
      },
      {
        status: "In Progress",
        count: teamReports.filter((r) => r.status === "in-progress").length,
        color: "bg-yellow-100 text-yellow-700",
        link: "/report-management?status=in-progress",
      },
      {
        status: "Closed",
        count: teamReports.filter((r) => r.status === "closed").length,
        color: "bg-green-100 text-green-700",
        link: "/report-management?status=closed",
      },
    ];
  }, [teamReports]);

  /* ---------------- Leave Status Breakdown ---------------- */
  const leaveStatusData = useMemo(() => {
    const pending = teamLeaves.filter((l) => l.status === "pending").length;
    const approved = teamLeaves.filter((l) => l.status === "approved").length;
    const rejected = teamLeaves.filter((l) => l.status === "rejected").length;

    return [
      { name: "Approved", value: approved, color: "#10b981" },
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "Rejected", value: rejected, color: "#ef4444" },
    ].filter((item) => item.value > 0);
  }, [teamLeaves]);

  /* ---------------- Recent Team Activities ---------------- */
  const recentActivities = useMemo(() => {
    const activities: Array<{
      type: string;
      title: string;
      date: string;
      status: string;
      employee: string;
      icon: any;
      color: string;
    }> = [];

    // Add recent leaves
    teamLeaves
      .slice(0, 3)
      .sort(
        (a, b) =>
          new Date((a as any).createdAt || b.startDate).getTime() -
          new Date((a as any).createdAt || a.startDate).getTime()
      )
      .forEach((leave) => {
        const emp = teamMembers.find((m) => m._id === leave.employeeId);
        activities.push({
          type: "Leave Request",
          title: `${leave.type} - ${leave.startDate} to ${leave.endDate}`,
          date: (leave as any).createdAt || leave.startDate,
          status: leave.status,
          employee: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
          icon: Plane,
          color: "green",
        });
      });

    // Add recent progress reports
    teamProgressReports
      .slice(0, 3)
      .sort(
        (a, b) =>
          new Date((b as any).createdAt || today).getTime() -
          new Date((a as any).createdAt || today).getTime()
      )
      .forEach((report) => {
        const emp = teamMembers.find((m) => m._id === report.employeeId);
        activities.push({
          type: "Progress Report",
          title: (report as any).title || "Daily Progress",
          date: (report as any).createdAt || today,
          status: report.status,
          employee: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
          icon: TrendingUp,
          color: "blue",
        });
      });

    // Add recent reports
    teamReports
      .slice(0, 2)
      .forEach((report) => {
        const emp = teamMembers.find((m) => m._id === report.employeeId);
        activities.push({
          type: "Report",
          title: `${report.type} - ${report.assignedTo}`,
          date: (report as any).createdAt || today,
          status: report.status,
          employee: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
          icon: AlertCircle,
          color: "purple",
        });
      });

    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [teamLeaves, teamProgressReports, teamReports, teamMembers, today]);

  /* ---------------- Weekly Team Hours ---------------- */
  const weeklyTeamHours = useMemo(() => {
    return teamPerformance.reduce((sum, member) => sum + member.hours, 0);
  }, [teamPerformance]);

  /* ---------------- Average Attendance Rate ---------------- */
  const avgAttendanceRate = useMemo(() => {
    const totalPercentage = attendanceTrend.reduce(
      (sum, day) => sum + day.percentage,
      0
    );
    return (totalPercentage / attendanceTrend.length).toFixed(1);
  }, [attendanceTrend]);

  const stats = [
    {
      title: "Team Members",
      value: teamMembers.length,
      subtitle: `${activeToday} present today`,
      icon: Users,
      color: "blue" as const,
      link: "#",
    },
    {
      title: "Pending Leaves",
      value: pendingLeaves,
      subtitle: `${teamLeaves.length} total requests`,
      icon: Plane,
      color: "yellow" as const,
      link: "/leave-management",
    },
    {
      title: "Open Reports",
      value: openReports,
      subtitle: `${teamReports.length} total reports`,
      icon: FileText,
      color: "purple" as const,
      link: "/report-management",
    },
    {
      title: "Pending Progress",
      value: pendingProgressReports,
      subtitle: `${teamProgressReports.length} total`,
      icon: TrendingUp,
      color: "green" as const,
      link: "/workforce-progress-reports?status=submitted",
    },
    {
      title: "Team Hours (Week)",
      value: weeklyTeamHours.toFixed(1),
      subtitle: "hours worked",
      icon: Timer,
      color: "blue" as const,
      link: "#",
    },
    {
      title: "Attendance Rate",
      value: `${avgAttendanceRate}%`,
      subtitle: "last 7 days",
      icon: Activity,
      color: "green" as const,
      link: "#",
    },
  ];

  return (
    <motion.div
      className="space-y-4 pb-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Banner */}
      <motion.div
        className="flex flex-row sm:flex-row items-center justify-between theme-card p-4"
        variants={itemVariants}
      >
        <div>
          <h2 className="text-xl font-bold text-white">
            Welcome back, {user?.firstName}!
          </h2>
          <p className="text-slate-400 text-sm">
            {Array.isArray(user?.position)
              ? user.position[0] ?? "Team Leader"
              : user?.position || "Team Leader"}
          </p>
          {userDepartment && (
            <p className="text-slate-500 text-xs mt-1">
              {userDepartment.name} • {teamMembers.length} team members
            </p>
          )}
        </div>
        <Avatar
          src={user?.profilePicture}
          name={`${user?.firstName} ${user?.lastName}`}
          className="!h-12 !w-12 !text-xl border-2 border-slate-600 shadow-md"
        />
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3"
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
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        variants={itemVariants}
      >
        {/* Team Attendance Trend */}
        <motion.div
          className="theme-card p-4"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">
              Team Attendance Trend (Last 7 Days)
            </h3>
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid rgb(71 85 105)",
                  backgroundColor: "rgb(30 41 59)",
                }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="active" fill="#60a5fa" name="Present" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 text-xs text-slate-400">
            Average attendance:{" "}
            <span className="font-semibold text-slate-300">{avgAttendanceRate}%</span>
          </div>
        </motion.div>

        {/* Leave Status Breakdown */}
        <motion.div
          className="theme-card p-4"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">
              Team Leave Requests
            </h3>
            <Plane className="w-5 h-5 text-emerald-400" />
          </div>
          {leaveStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={leaveStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                  }
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leaveStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
            <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
              No leave requests yet
            </div>
          )}
          <div className="mt-2 text-xs text-slate-400">
            Total requests:{" "}
            <span className="font-semibold text-slate-300">{teamLeaves.length}</span> •{" "}
            <span className="text-amber-400 font-semibold">
              {pendingLeaves} pending approval
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Team Member Performance & Status */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        variants={itemVariants}
      >
        {/* Team Performance (Hours) */}
        <motion.div
          className="theme-card p-4"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">
              Team Performance (This Week)
            </h3>
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {teamPerformance
              .sort((a, b) => b.hours - a.hours)
              .map((member, idx) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-500 w-6">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-medium text-slate-200 truncate">
                      {member.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-blue-400">
                        {member.hours}h
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {member.days} days
                      </div>
                    </div>
                    <div className="w-16 bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min((member.hours / 40) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            {teamPerformance.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">
                No performance data available
              </p>
            )}
          </div>
        </motion.div>

        {/* Team Member Status Today */}
        <motion.div
          className="theme-card p-4"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">
              Team Status Today
            </h3>
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {teamMemberStatus.map((member) => {
              const StatusIcon = member.statusIcon;
              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-2 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar
                      src={member.profilePicture}
                      name={`${member.firstName} ${member.lastName}`}
                      className="!h-8 !w-8 !text-xs"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {Array.isArray(member.position)
                          ? member.position[0]
                          : member.position || "Employee"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-medium capitalize flex items-center gap-1 ${member.status === "present" ? "bg-emerald-500/20 text-emerald-400" : member.status === "on leave" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {member.status}
                    </span>
                  </div>
                </div>
              );
            })}
            {teamMemberStatus.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">
                No team members found
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Recent Activities & Reports */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        variants={itemVariants}
      >
        {/* Recent Team Activities */}
        <motion.div
          className="theme-card p-4"
          variants={itemVariants}
        >
          <h3 className="text-sm font-semibold mb-3 text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent Team Activities
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
                    className={`p-2 rounded-lg ${activity.color === "green"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : activity.color === "blue"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-purple-500/20 text-purple-400"
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
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500">
                        {new Date(activity.date).toLocaleDateString()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${activity.status === "approved" ||
                          activity.status === "resolved" ||
                          activity.status === "closed"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : activity.status === "pending" ||
                            activity.status === "submitted"
                            ? "bg-amber-500/20 text-amber-400"
                            : activity.status === "rejected"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-slate-600/50 text-slate-300"
                          }`}
                      >
                        {activity.status}
                      </span>
                    </div>
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

        {/* Reports Overview */}
        <motion.div
          className="theme-card p-4"
          variants={itemVariants}
        >
          <h3 className="text-sm font-semibold mb-3 text-slate-300">
            Team Reports Overview
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {reportCategories.map((cat) => (
              <Link
                key={cat.status}
                to={cat.link}
                className={`p-3 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer block border border-transparent hover:border-current ${cat.status === "Open" ? "bg-red-500/20 text-red-400" : cat.status === "In Progress" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}
              >
                <h4 className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  {cat.status}
                </h4>
                <p className="text-lg font-bold mt-1">{cat.count}</p>
              </Link>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-slate-600 rounded-lg overflow-hidden">
              <thead className="bg-slate-700/50 text-slate-300 font-medium">
                <tr>
                  <th className="p-2 text-left rounded-l-md">Employee</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left rounded-r-md">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-600">
                {teamReports.slice(0, 5).map((r) => {
                  const emp = teamMembers.find((u) => u._id === r.employeeId);

                  return (
                    <tr key={r.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="p-2 font-medium text-slate-200">
                        {emp ? emp.firstName + " " + emp.lastName : "Unknown"}
                      </td>
                      <td className="p-2 text-slate-400">{r.type}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize
                        ${r.status === "open"
                              ? "bg-red-500/20 text-red-400"
                              : r.status === "in-progress"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-emerald-500/20 text-emerald-400"
                            }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-3 text-right">
              <Link
                to="/report-management"
                className="text-blue-400 text-xs font-medium hover:underline inline-flex items-center gap-1"
              >
                View all reports →
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="theme-card p-4"
        variants={itemVariants}
      >
        <h3 className="text-sm font-semibold mb-3 text-white">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => navigate("/leave-management")}
            className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-shadow text-slate-200"
          >
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <span className="text-xs font-medium">
              Approve Leaves
            </span>
          </button>
          <button
            onClick={() => navigate("/workforce-progress-reports")}
            className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-shadow text-slate-200"
          >
            <TrendingUp className="w-6 h-6 text-blue-400" />
            <span className="text-xs font-medium">
              Review Progress
            </span>
          </button>
          <button
            onClick={() => navigate("/report-management")}
            className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-shadow text-slate-200"
          >
            <AlertCircle className="w-6 h-6 text-purple-400" />
            <span className="text-xs font-medium">
              Manage Reports
            </span>
          </button>
          <button
            onClick={() => navigate("/dtr-management")}
            className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-shadow text-slate-200"
          >
            <Clock className="w-6 h-6 text-amber-400" />
            <span className="text-xs font-medium">
              Team Attendance
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
