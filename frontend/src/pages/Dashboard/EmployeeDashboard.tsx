import {
  Calendar,
  Clock,
  FileText,
  Plane,
  TrendingUp,
  AlertCircle,
  Timer,
  BarChart3,
  Activity,
  Bell,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDTRStore } from "../../stores/global/dtr/dtr.store";
import { useLeaveStore } from "../../stores/global/leave/leave.store";
import { useReportStore } from "../../stores/global/report/report.store";
import { useScheduleStore } from "../../stores/global/schedule/schedule.store";
import { useNotificationStore } from "../../stores/global/notification/notification.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import Avatar from "avatox";
import useAuthStore from "../../stores/auth/auth.store";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import StatCard from "../../components/ui/StatCard";

import {
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  YAxis,
} from "recharts";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { account } = useAuthStore();
  const { allDTRs } = useDTRStore();
  const { schedules } = useScheduleStore();
  const { reports } = useReportStore();
  const { leaves } = useLeaveStore();
  const { notifications } = useNotificationStore();

  const today = new Date().toISOString().split("T")[0];

  // Filter data for current employee
  const todaysSchedule = schedules.find(
    (s) => s.userId === user?._id && s.date === today
  );
  const todaysDTR = allDTRs.find(
    (dtr) => dtr.userId === user?._id && dtr.date === today
  );
  const myReports = reports.filter((r) => r.employeeId === user?._id);
  const myLeaves = leaves.filter((l) => l.employeeId === user?._id);
  const myNotifications = notifications?.filter((n) => n.userId === user?._id) || [];

  // Calculate weekly hours
  const weeklyHours = useMemo(() => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split("T")[0];

    return allDTRs
      .filter((dtr) => dtr.userId === user?._id && dtr.date >= weekStart)
      .reduce((total, dtr) => {
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
  }, [allDTRs, user]);

  // Calculate monthly attendance rate
  const monthlyAttendanceRate = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const monthStart = startOfMonth.toISOString().split("T")[0];

    const currentDay = new Date().getDate();

    const attendedDays = allDTRs.filter(
      (dtr) => dtr.userId === user?._id && dtr.date >= monthStart
    ).length;

    return ((attendedDays / currentDay) * 100).toFixed(1);
  }, [allDTRs, user]);

  // 7-day attendance trend with hours
  const attendanceTrend = useMemo(() => {
    return Array.from({ length: 7 })
      .map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dtr = allDTRs.find(
          (d) => d.userId === user?._id && d.date === dateStr
        );
        const hasRecord = !!dtr;
        const hours =
          dtr?.sessions?.reduce((sum, session) => {
            const fullDTR = session.fullDTR || [];
            const workEntries = fullDTR.filter(
              (entry) => entry.type === "work" && entry.status === "done"
            );
            const sessionHours = workEntries.reduce((h, entry) => {
              const [startHour, startMin] = entry.startTime.split(":").map(Number);
              const [endHour, endMin] = (entry.endTime || "00:00")
                .split(":")
                .map(Number);
              const start = startHour + startMin / 60;
              const end = endHour + endMin / 60;
              return h + (end - start);
            }, 0);
            return sum + sessionHours;
          }, 0) || 0;

        return {
          date: date.toLocaleDateString("en-US", { weekday: "short" }),
          hours: parseFloat(hours.toFixed(2)),
          present: hasRecord ? 1 : 0,
        };
      })
      .reverse();
  }, [allDTRs, user]);

  // Leave status breakdown
  const leaveStatusData = useMemo(() => {
    const pending = myLeaves.filter((l) => l.status === "pending").length;
    const approved = myLeaves.filter((l) => l.status === "approved").length;
    const rejected = myLeaves.filter((l) => l.status === "rejected").length;
    const canceled = myLeaves.filter((l) => l.status === "canceled").length;

    return [
      { name: "Approved", value: approved, color: "#10b981" },
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "Rejected", value: rejected, color: "#ef4444" },
      { name: "Canceled", value: canceled, color: "#6b7280" },
    ].filter((item) => item.value > 0);
  }, [myLeaves]);



  // Recent activities (combined timeline)
  const recentActivities = useMemo(() => {
    const activities: Array<{
      type: string;
      title: string;
      date: string;
      status: string;
      icon: any;
      color: string;
    }> = [];

    // Add leaves
    myLeaves.slice(0, 3).forEach((leave) => {
      activities.push({
        type: "Leave Request",
        title: `${leave.type} - ${leave.startDate}`,
        date: leave.startDate,
        status: leave.status,
        icon: Plane,
        color: "green",
      });
    });

    // Add reports
    myReports.slice(0, 3).forEach((report) => {
      activities.push({
        type: "Report",
        title: `${report.type} - ${report.assignedTo}`,
        date: today,
        status: report.status,
        icon: AlertCircle,
        color: "purple",
      });
    });

    // Sort by date descending
    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [myLeaves, myReports, today]);

  // Upcoming schedules (next 3 days)
  const upcomingSchedules = useMemo(() => {
    const upcoming = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const schedule = schedules.find(
        (s) => s.userId === user?._id && s.date === dateStr
      );
      if (schedule) {
        upcoming.push({
          date: dateStr,
          dayName: date.toLocaleDateString("en-US", { weekday: "long" }),
          sessions: schedule.sessions || [],
        });
      }
    }
    return upcoming;
  }, [schedules, user]);

  const displayName =
    [account?.firstName, account?.middleName, account?.lastName]
      .filter(Boolean)
      .join(" ") ||
    [user?.firstName, user?.middleName, user?.lastName]
      .filter(Boolean)
      .join(" ") ||
    "Employee";

  const fullName = `${account?.firstName ?? ""} ${account?.lastName ?? ""}`;

  // Pending items count
  const pendingLeaves = myLeaves.filter((l) => l.status === "pending").length;
  const pendingReports = myReports.filter((r) => r.status === "open").length;
  const unreadNotifications = myNotifications.filter((n) => !n.read).length;

  // Statistics cards
  const stats = [
    {
      title: "Today's Schedule",
      value: todaysSchedule ? todaysSchedule.sessions?.length ?? 0 : "—",
      subtitle: todaysSchedule ? "sessions" : "No schedule",
      icon: Calendar,
      color: "blue" as const,
      link: "/schedule",
    },
    {
      title: "DTR Sessions Today",
      value: todaysDTR ? todaysDTR.sessions?.length ?? 0 : "—",
      subtitle: todaysDTR ? "completed" : "Not started",
      icon: Clock,
      color: "yellow" as const,
      link: "/dtr",
    },
    {
      title: "Hours This Week",
      value: weeklyHours.toFixed(1),
      subtitle: "hours worked",
      icon: Timer,
      color: "purple" as const,
      link: "/dtr",
    },
    {
      title: "Attendance Rate",
      value: `${monthlyAttendanceRate}%`,
      subtitle: "this month",
      icon: Activity,
      color: "green" as const,
      link: "/dtr",
    },
    {
      title: "Leave Requests",
      value: myLeaves.length,
      subtitle: `${pendingLeaves} pending`,
      icon: Plane,
      color: "blue" as const,
      link: "/leave",
    },
    {
      title: "Reports Submitted",
      value: myReports.length,
      subtitle: `${pendingReports} pending`,
      icon: FileText,
      color: "red" as const,
      link: "/report",
    },
  ];

  return (
    <div className="dash-light space-y-4 sm:space-y-6 pb-4">
      {/* Container Motion Wrapper */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4 sm:space-y-6"
      >
        {/* Welcome Banner */}
        <motion.div
          className="flex flex-row sm:flex-row items-start sm:items-center justify-between card-dashboard p-3 sm:p-4 gap-3 sm:gap-0"
          variants={itemVariants}
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">
              Welcome back, {displayName}!
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm truncate">
              {Array.isArray(account?.position)
                ? account.position[0] ??
                (Array.isArray(user?.position)
                  ? user.position[0] ?? "Employee"
                  : user?.position || "Employee")
                : account?.position ||
                (Array.isArray(user?.position)
                  ? user.position[0] ?? "Employee"
                  : user?.position || "Employee")}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Avatar
            src={account?.profilePicture || user?.profilePicture}
            name={fullName}
            className="!h-10 !w-10 sm:!h-12 sm:!w-12 !text-xl sm:!text-2xl border-2 border-slate-600 shadow-md flex-shrink-0"
          />
        </motion.div>

        {/* Stat Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3"
          variants={itemVariants}
        >
          {stats.map((stat, index) => (
            <motion.div key={index} variants={itemVariants} className="h-full">
              <StatCard
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                color={stat.color}
                onClick={() => navigate(stat.link)}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Row */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4"
          variants={itemVariants}
        >
          {/* Attendance & Hours Chart */}
          <motion.div
            className="card-dashboard p-3 sm:p-4"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-slate-300">
                Work Hours Trend (Last 7 Days)
              </h3>
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={200} minHeight={180}>
                <BarChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: "12px",
                      borderRadius: "8px",
                      border: "1px solid rgb(71 85 105)",
                      backgroundColor: "rgb(30 41 59)",
                    }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar dataKey="hours" fill="#60a5fa" name="Hours" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Total this week:{" "}
              <span className="font-semibold text-slate-300">{weeklyHours.toFixed(1)} hours</span>
            </div>
          </motion.div>

          {/* Leave Status Chart */}
          <motion.div
            className="card-dashboard p-3 sm:p-4"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-slate-300">
                Leave Requests Status
              </h3>
              <Plane className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="w-full overflow-x-auto">
              {leaveStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200} minHeight={180}>
                  <PieChart>
                    <Pie
                      data={leaveStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                      }
                      outerRadius={60}
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
                <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">
                  No leave requests yet
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Total requests: <span className="font-semibold text-slate-300">{myLeaves.length}</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Upcoming Schedule & Notifications */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4"
          variants={itemVariants}
        >
          {/* Upcoming Schedule */}
          <motion.div
            className="card-dashboard p-3 sm:p-4"
            variants={itemVariants}
          >
            <h3 className="text-sm sm:text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming Schedule
            </h3>
            <div className="space-y-2">
              {upcomingSchedules.map((schedule, idx) => (
                <div
                  key={idx}
                  className="border border-slate-600 rounded-lg p-2 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200">
                      {schedule.dayName}
                    </span>
                    <span className="text-xs text-slate-500">{schedule.date}</span>
                  </div>
                  <div className="space-y-1">
                    {schedule.sessions.map((session: any, sIdx: number) => (
                      <div
                        key={sIdx}
                        className="text-xs text-slate-400 flex items-center gap-2"
                      >
                        <Clock className="w-3 h-3" />
                        <span>
                          {session.startTime} - {session.endTime}
                        </span>
                        {session.location && (
                          <span className="text-slate-500">• {session.location}</span>
                        )}
                      </div>
                    ))}
                    {schedule.sessions.length === 0 && (
                      <p className="text-xs text-slate-500">No sessions scheduled</p>
                    )}
                  </div>
                </div>
              ))}
              {upcomingSchedules.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">
                  No upcoming schedules found.
                </p>
              )}
            </div>
            <Link
              to="/schedule"
              className="text-blue-400 text-xs mt-2 inline-block hover:underline"
            >
              View full schedule →
            </Link>
          </motion.div>

          {/* Recent Notifications */}
          <motion.div
            className="card-dashboard p-3 sm:p-4"
            variants={itemVariants}
          >
            <h3 className="text-sm sm:text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Recent Notifications
              {unreadNotifications > 0 && (
                <span className="ml-auto bg-red-500/80 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadNotifications}
                </span>
              )}
            </h3>
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {myNotifications.slice(0, 5).map((notification, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-2 transition-colors ${!notification.read ? "border-blue-500/40 bg-blue-500/20" : "border-slate-600 hover:bg-slate-700/50"
                    }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {notification.body || ""}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))}
              {myNotifications.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">
                  No notifications yet.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Recent Activities & Report Status */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4"
          variants={itemVariants}
        >
          {/* Recent Activities Timeline */}
          <motion.div
            className="card-dashboard p-3 sm:p-4"
            variants={itemVariants}
          >
            <h3 className="text-sm sm:text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recent Activities
            </h3>
            <div className="space-y-2">
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
                        : "bg-purple-500/20 text-purple-400"
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {activity.type}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">
                          {new Date(activity.date).toLocaleDateString()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${activity.status === "approved" || activity.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : activity.status === "pending"
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
                  No recent activities.
                </p>
              )}
            </div>
          </motion.div>

          {/* Reports Summary */}
          <motion.div
            className="card-dashboard p-3 sm:p-4"
            variants={itemVariants}
          >
            <h3 className="text-sm sm:text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Recent Reports
            </h3>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full border border-slate-600 text-xs">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="p-1.5 text-left font-semibold text-slate-300">Type</th>
                      <th className="p-1.5 text-left font-semibold text-slate-300">Assigned To</th>
                      <th className="p-1.5 text-left font-semibold text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myReports.slice(0, 5).map((r) => (
                      <tr key={r.id} className="border-t border-slate-600 hover:bg-slate-700/50 transition-colors">
                        <td className="p-1.5 text-slate-200">{r.type}</td>
                        <td className="p-1.5 text-slate-200">{r.assignedTo}</td>
                        <td className="p-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${r.status === "closed"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : r.status === "open"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-blue-500/20 text-blue-400"
                              }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {myReports.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center text-slate-500 py-3">
                          No reports found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Link
                to="/report"
                className="text-blue-400 text-xs mt-2 inline-block hover:underline"
              >
                View all →
              </Link>
            </div>
          </motion.div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="card-dashboard p-3 sm:p-4"
          variants={itemVariants}
        >
          <h3 className="text-sm sm:text-base font-semibold mb-3 text-white">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => navigate("/dtr")}
              className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-shadow text-slate-200"
            >
              <Clock className="w-6 h-6 text-blue-400" />
              <span className="text-xs font-medium">Clock In/Out</span>
            </button>
            <button
              onClick={() => navigate("/leave")}
              className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-shadow text-slate-200"
            >
              <Plane className="w-6 h-6 text-emerald-400" />
              <span className="text-xs font-medium">Request Leave</span>
            </button>
            <button
              onClick={() => navigate("/report")}
              className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-shadow text-slate-200"
            >
              <AlertCircle className="w-6 h-6 text-purple-400" />
              <span className="text-xs font-medium">File Report</span>
            </button>
            <button
              onClick={() => navigate("/schedule")}
              className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-shadow text-slate-200"
            >
              <Calendar className="w-6 h-6 text-amber-400" />
              <span className="text-xs font-medium">View Schedule</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

