import {
    Calendar,
    Clock,
    FileText,
    Plane,
    ClipboardList,
    TrendingUp,
    AlertCircle,
    BarChart3,
    Activity
} from "lucide-react";
import { useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDTRStore } from "../../stores/global/dtr/dtr.store";
import { useLeaveStore } from "../../stores/global/leave/leave.store";
import { useReportStore } from "../../stores/global/report/report.store";
import { useScheduleStore } from "../../stores/global/schedule/schedule.store";
import { useProgressReportStore } from "../../stores/global/progress/progress.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import Avatar from "avatox";
import useAuthStore from "../../stores/auth/auth.store";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import StatCard from "../../components/ui/StatCard";

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

/** Parse "HH:MM" or "H:MM" to decimal hours */
function parseDurationToHours(duration: string | undefined): number {
    if (!duration || typeof duration !== "string") return 0;
    const parts = duration.trim().split(":");
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours + minutes / 60;
}

/** Format decimal hours as human-readable, e.g. "50 hours and 30 minutes" */
function formatHoursToHumanReadable(decimalHours: number): string {
    if (decimalHours <= 0) return "0 hours";
    const wholeHours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - wholeHours) * 60);
    const hoursStr = wholeHours > 0 ? (wholeHours === 1 ? "1 hour" : `${wholeHours} hours`) : "";
    const minutesStr = minutes > 0 ? (minutes === 1 ? "1 minute" : `${minutes} minutes`) : "";
    if (hoursStr && minutesStr) return `${hoursStr} and ${minutesStr}`;
    return hoursStr || minutesStr || "0 hours";
}

function computeDTRHours(dtr: {
    sessions?: Array<{
        DTRTotalWork?: string;
        fullDTR?: Array<{ type: string; status: string; startTime: string; endTime?: string }>;
    }>;
}) {
    const sessions = dtr.sessions || [];
    return sessions.reduce((sum, session) => {
        // Prefer backend-computed total work (DTRTotalWork) when present
        const dtrTotalWork = session.DTRTotalWork;
        if (dtrTotalWork) {
            return sum + parseDurationToHours(dtrTotalWork);
        }
        // Fallback: compute from fullDTR work entries
        const fullDTR = session.fullDTR || [];
        const workEntries = fullDTR.filter((entry) => entry.type === "work" && entry.status === "done");
        const hours = workEntries.reduce((h, entry) => {
            const [startHour, startMin] = entry.startTime.split(":").map(Number);
            const [endHour, endMin] = (entry.endTime || "00:00").split(":").map(Number);
            const start = startHour + startMin / 60;
            const end = endHour + endMin / 60;
            return h + (end - start);
        }, 0);
        return sum + hours;
    }, 0);
}

export default function InternDashboard() {
    const navigate = useNavigate();
    const { user } = useUserStore();
    const { account } = useAuthStore();
    const { allDTRs, userDTRs, loadUserDTRs } = useDTRStore();
    const { schedules } = useScheduleStore();
    const { reports } = useReportStore();
    const { leaves } = useLeaveStore();
    const { progressReports, fetchMyProgressReports } = useProgressReportStore();

    const today = new Date().toISOString().split("T")[0];

    // Prefer current user's DTRs (loaded by loadUserDTRs); fallback to allDTRs filtered by user
    const myDTRs = useMemo(
        () =>
            userDTRs.length > 0
                ? userDTRs
                : (allDTRs || []).filter((d) => d.userId === user?._id),
        [userDTRs, allDTRs, user?._id]
    );

    useEffect(() => {
        if (user?._id) loadUserDTRs(user._id).catch(console.error);
    }, [user?._id, loadUserDTRs]);

    useEffect(() => {
        fetchMyProgressReports().catch(console.error);
    }, [fetchMyProgressReports]);

    // Filter data for current intern
    const todaysSchedule = schedules.find(
        (s) => s.userId === user?._id && s.date === today
    );
    const todaysDTR = myDTRs.find((dtr) => dtr.date === today);
    const myReports = reports.filter((r) => r.employeeId === user?._id);
    const myLeaves = leaves.filter((l) => l.employeeId === user?._id);
    const myProgressReports = progressReports.filter(
        (p) => p.employeeId === user?._id
    );

    // Calculate weekly hours
    const weeklyHours = useMemo(() => {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const weekStart = startOfWeek.toISOString().split("T")[0];

        return myDTRs
            .filter((dtr) => dtr.date >= weekStart)
            .reduce((total, dtr) => total + computeDTRHours(dtr), 0);
    }, [myDTRs]);

    // Calculate total hours rendered (all-time) from DTRTotalWork when available
    const totalHoursRendered = useMemo(() => {
        return myDTRs.reduce((total, dtr) => total + computeDTRHours(dtr), 0);
    }, [myDTRs]);

    // 7-day attendance trend
    const attendanceTrend = useMemo(() => {
        return Array.from({ length: 7 })
            .map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split("T")[0];
                const dtr = myDTRs.find((d) => d.date === dateStr);
                const hasRecord = !!dtr;
                const hours = dtr ? computeDTRHours(dtr) : 0;

                return {
                    date: date.toLocaleDateString("en-US", { weekday: "short" }),
                    hours: parseFloat(hours.toFixed(2)),
                    present: hasRecord ? 1 : 0,
                };
            })
            .reverse();
    }, [myDTRs]);

    // Task completion statistics
    const taskStats = useMemo(() => {
        const allTasks = myProgressReports.flatMap((report) => report.tasks || []);
        const completed = allTasks.filter((t) => t.status === "completed").length;
        const inProgress = allTasks.filter((t) => t.status === "in-progress").length;
        const notStarted = allTasks.filter((t) => t.status === "not-started").length;
        const blocked = allTasks.filter((t) => t.status === "blocked").length;

        return [
            { name: "Completed", value: completed, color: "#10b981", id: "completed" },
            { name: "In Progress", value: inProgress, color: "#3b82f6", id: "in-progress" },
            { name: "Not Started", value: notStarted, color: "#6b7280", id: "not-started" },
            { name: "Blocked", value: blocked, color: "#ef4444", id: "blocked" },
        ];
    }, [myProgressReports]);

    // Only include segments with value > 0 in the pie chart to avoid duplicate React keys (e.g. label-360-360)
    const taskStatsForChart = useMemo(
        () => taskStats.filter((entry) => entry.value > 0),
        [taskStats]
    );

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

        // Add progress reports
        myProgressReports.slice(0, 3).forEach((report) => {
            activities.push({
                type: "Progress Report",
                title: `${report.period} report - ${report.date}`,
                date: report.submittedAt || report.createdAt,
                status: report.status,
                icon: ClipboardList,
                color: "blue",
            });
        });

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
            .slice(0, 5);
    }, [myProgressReports, myLeaves, myReports, today]);

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
        "Intern";

    const fullName = `${account?.firstName ?? ""} ${account?.lastName ?? ""}`;

    // Statistics cards
    const stats = [
        {
            title: "Today's Schedule",
            value: todaysSchedule ? todaysSchedule.sessions?.length ?? 0 : "—",
            icon: Calendar,
            color: "blue" as const,
            link: "/schedule",
        },
        {
            title: "DTR Sessions Today",
            value: todaysDTR ? todaysDTR.sessions?.length ?? 0 : "—",
            icon: Clock,
            color: "yellow" as const,
            link: "/dtr",
        },
        {
            title: "Total Hours Rendered",
            value: formatHoursToHumanReadable(totalHoursRendered),
            subtitle: undefined,
            icon: Clock,
            color: "green" as const,
            link: "/dtr",
        },
        {
            title: "Progress Reports",
            value: myProgressReports.length,
            icon: ClipboardList,
            color: "blue" as const,
            link: "/daily-progress",
        },
        {
            title: "Leave Requests",
            value: myLeaves.length,
            icon: Plane,
            color: "green" as const,
            link: "/leave",
        },
        {
            title: "Reports Submitted",
            value: myReports.length,
            icon: FileText,
            color: "red" as const,
            link: "/report",
        },
    ];

    // Calculate completion rate
    const completionRate = useMemo(() => {
        const total = taskStats.reduce((sum, stat) => sum + stat.value, 0);
        const completed = taskStats.find((s) => s.name === "Completed")?.value || 0;
        return total > 0 ? ((completed / total) * 100).toFixed(1) : "0";
    }, [taskStats]);

    return (
        <div className="dash-light space-y-4 sm:space-y-6 pb-4">
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
                            Intern - {Array.isArray(account?.department) ? account.department[0] : account?.department || "Department"}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                            Keep up the great work on your internship journey!
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
                    {/* Attendance Chart */}
                    <motion.div
                        className="card-dashboard p-3 sm:p-4"
                        variants={itemVariants}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm sm:text-base font-semibold text-slate-300">
                                Attendance Trend (Last 7 Days)
                            </h3>
                            <Activity className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="w-full overflow-x-auto">
                            <ResponsiveContainer width="100%" height={200} minHeight={180}>
                                <LineChart data={attendanceTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                                    <Tooltip
                                        contentStyle={{
                                            fontSize: "12px",
                                            borderRadius: "8px",
                                            border: "1px solid rgb(71 85 105)",
                                            backgroundColor: "rgb(30 41 59)",
                                        }}
                                        labelStyle={{ color: "#e2e8f0" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="hours"
                                        stroke="#60a5fa"
                                        strokeWidth={2}
                                        name="Hours"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                            Total this week: <span className="font-semibold text-slate-300">{formatHoursToHumanReadable(weeklyHours)}</span>
                        </div>
                    </motion.div>

                    {/* Task Completion Chart */}
                    <motion.div
                        className="card-dashboard p-3 sm:p-4"
                        variants={itemVariants}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm sm:text-base font-semibold text-slate-300">
                                Task Completion Status
                            </h3>
                            <BarChart3 className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="w-full overflow-x-auto">
                            <ResponsiveContainer width="100%" height={200} minHeight={180}>
                                <PieChart>
                                    <Pie
                                        data={taskStatsForChart}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) =>
                                            percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                                        }
                                        outerRadius={60}
                                        fill="#8884d8"
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {taskStatsForChart.map((entry) => (
                                            <Cell key={entry.id} fill={entry.color} />
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
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                            Completion Rate: <span className="font-semibold text-emerald-400">{completionRate}%</span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Progress Reports & Upcoming Schedule */}
                <motion.div
                    className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4"
                    variants={itemVariants}
                >
                    {/* Recent Progress Reports */}
                    <motion.div
                        className="card-dashboard p-3 sm:p-4"
                        variants={itemVariants}
                    >
                        <h3 className="text-sm sm:text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4" />
                            Recent Progress Reports
                        </h3>
                        <div className="overflow-x-auto">
                            <div className="inline-block min-w-full align-middle">
                                <table className="min-w-full border border-slate-600 text-xs">
                                    <thead className="bg-slate-700/50">
                                        <tr>
                                            <th className="p-1.5 text-left font-semibold text-slate-300">Date</th>
                                            <th className="p-1.5 text-left font-semibold text-slate-300">Period</th>
                                            <th className="p-1.5 text-left font-semibold text-slate-300">Status</th>
                                            <th className="p-1.5 text-left font-semibold text-slate-300">Tasks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myProgressReports.slice(0, 5).map((report, idx) => (
                                            <tr key={`${report._id}-${idx}`} className="border-t border-slate-600 hover:bg-slate-700/50 transition-colors">
                                                <td className="p-1.5 text-slate-200">{report.date}</td>
                                                <td className="p-1.5 capitalize text-slate-200">{report.period}</td>
                                                <td className="p-1.5">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-xs ${report.status === "reviewed"
                                                            ? "bg-emerald-500/20 text-emerald-400"
                                                            : report.status === "submitted"
                                                                ? "bg-blue-500/20 text-blue-400"
                                                                : "bg-slate-600/50 text-slate-300"
                                                            }`}
                                                    >
                                                        {report.status}
                                                    </span>
                                                </td>
                                                <td className="p-1.5 text-slate-200">{report.tasks?.length || 0}</td>
                                            </tr>
                                        ))}
                                        {myProgressReports.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center text-slate-500 py-3">
                                                    No progress reports yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <Link
                                to="/daily-progress"
                                className="text-blue-400 text-xs mt-2 inline-block hover:underline"
                            >
                                View all →
                            </Link>
                        </div>
                    </motion.div>

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
                </motion.div>

                {/* Recent Activities & Leave Status */}
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
                                            className={`p-2 rounded-lg ${activity.color === "blue"
                                                ? "bg-blue-500/20 text-blue-400"
                                                : activity.color === "green"
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
                                                    className={`px-2 py-0.5 rounded-full text-xs ${activity.status === "approved" || activity.status === "reviewed"
                                                        ? "bg-emerald-500/20 text-emerald-400"
                                                        : activity.status === "pending" || activity.status === "submitted"
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

                    {/* Leave Requests Summary */}
                    <motion.div
                        className="card-dashboard p-3 sm:p-4"
                        variants={itemVariants}
                    >
                        <h3 className="text-sm sm:text-base font-semibold mb-3 text-slate-300 flex items-center gap-2">
                            <Plane className="w-4 h-4" />
                            Leave Requests
                        </h3>
                        <div className="overflow-x-auto">
                            <div className="inline-block min-w-full align-middle">
                                <table className="min-w-full border border-slate-600 text-xs">
                                    <thead className="bg-slate-700/50">
                                        <tr>
                                            <th className="p-1.5 text-left font-semibold text-slate-300">Type</th>
                                            <th className="p-1.5 text-left font-semibold text-slate-300">Dates</th>
                                            <th className="p-1.5 text-left font-semibold text-slate-300">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myLeaves.slice(0, 5).map((leave, idx) => (
                                            <tr key={`${leave.id ?? leave._id}-${idx}`} className="border-t border-slate-600 hover:bg-slate-700/50 transition-colors">
                                                <td className="p-1.5 capitalize text-slate-200">{leave.type}</td>
                                                <td className="p-1.5 text-slate-200">
                                                    {leave.startDate} → {leave.endDate}
                                                    {leave.halfDay ? " • Half" : ""}
                                                </td>
                                                <td className="p-1.5">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-xs ${leave.status === "approved"
                                                            ? "bg-emerald-500/20 text-emerald-400"
                                                            : leave.status === "pending"
                                                                ? "bg-amber-500/20 text-amber-400"
                                                                : leave.status === "rejected"
                                                                    ? "bg-red-500/20 text-red-400"
                                                                    : "bg-slate-600/50 text-slate-300"
                                                            }`}
                                                    >
                                                        {leave.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {myLeaves.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="text-center text-slate-500 py-3">
                                                    No leave requests found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <Link
                                to="/leave"
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
                            onClick={() => navigate("/daily-progress")}
                            className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-shadow text-slate-200"
                        >
                            <ClipboardList className="w-6 h-6 text-blue-400" />
                            <span className="text-xs font-medium">Submit Progress</span>
                        </button>
                        <button
                            onClick={() => navigate("/report")}
                            className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-shadow text-slate-200"
                        >
                            <AlertCircle className="w-6 h-6 text-purple-400" />
                            <span className="text-xs font-medium">File Report</span>
                        </button>
                        <button
                            onClick={() => navigate("/leave")}
                            className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-shadow text-slate-200"
                        >
                            <Plane className="w-6 h-6 text-emerald-400" />
                            <span className="text-xs font-medium">Request Leave</span>
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
