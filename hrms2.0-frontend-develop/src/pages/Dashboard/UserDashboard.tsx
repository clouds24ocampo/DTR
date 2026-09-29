import { Calendar, Clock, FileText, Plane } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDTRStore } from "../../stores/global/dtr/dtr.store";
import { useLeaveStore } from "../../stores/global/leave/leave.store";
import { useReportStore } from "../../stores/global/report/report.store";
import { useScheduleStore } from "../../stores/global/schedule/schedule.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import StatCard from "./StatCard";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

export default function UserDashboard() {
  const { user } = useUserStore();
  const { allDTRs } = useDTRStore();
  const { schedules } = useScheduleStore();
  const { reports } = useReportStore();
  const { leaves } = useLeaveStore();
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];
  const todaysSchedule = schedules.find(
    (s) => s.userId === user?._id && s.date === today
  );
  const todaysDTR = allDTRs.find(
    (dtr) => dtr.userId === user?._id && dtr.date === today
  );
  const myReports = reports.filter((r) => r.employeeId === user?._id);
  const myLeaves = leaves.filter((l) => l.employeeId === user?._id);

  const attendanceTrend = useMemo(() => {
    return Array.from({ length: 7 })
      .map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const hasRecord = allDTRs.some(
          (dtr) => dtr.userId === user?._id && dtr.date === dateStr
        );
        return {
          date: date.toLocaleDateString("en-US", { weekday: "short" }),
          active: hasRecord ? 1 : 0,
        };
      })
      .reverse();
  }, [allDTRs, user]);

  const displayName =
    [user?.firstName, user?.middleName, user?.lastName]
      .filter(Boolean)
      .join(" ") || "Employee";

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
      color: "purple" as const,
      link: "/report",
    },
  ];

  return (
    <motion.div
      className="overflow-y-auto max-h-screen pb-32 space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between theme-card p-4 gap-4 sm:gap-0"
        variants={itemVariants}
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white truncate">Welcome back, {displayName}!</h2>
          <p className="text-slate-400 text-sm truncate">{Array.isArray(user?.position) ? user.position[0] ?? "Employee" : user?.position || "Employee"}</p>
        </div>
        <motion.img
          src={user?.profilePicture || "/path/to/default/profile/pic.png"}
          alt="Profile"
          className="w-12 h-12 rounded-full border-2 border-slate-600 shadow-md flex-shrink-0"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        variants={itemVariants}
      >
        {stats.map((stat, index) => (
          <motion.div key={index} variants={itemVariants}>
            <StatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              onClick={() => navigate(stat.link)}
            />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="theme-card p-4"
        variants={itemVariants}
      >
        <h3 className="text-sm font-semibold mb-2 text-slate-300">
          My Attendance (Last 7 Days)
        </h3>
        <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={200} minHeight={200}>
            <LineChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid rgb(71 85 105)",
                  backgroundColor: "rgb(30 41 59)",
                }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Line
                type="monotone"
                dataKey="active"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-3"
        variants={itemVariants}
      >
        <motion.div
          className="theme-card p-4"
          variants={itemVariants}
        >
          <h3 className="text-sm font-semibold mb-3 text-slate-300">
            Recent Reports
          </h3>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full text-xs border border-slate-600 rounded-lg overflow-hidden">
                <thead className="bg-slate-700/50 text-slate-300 font-medium">
                  <tr>
                    <th className="p-2 text-left rounded-l-md">Type</th>
                    <th className="p-2 text-left">Assigned To</th>
                    <th className="p-2 text-left rounded-r-md">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-600">
                  {myReports.slice(0, 5).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="p-2 font-medium text-slate-200">{r.type}</td>
                      <td className="p-2 text-slate-400">{r.assignedTo}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize
                          ${r.status === 'open' ? 'bg-red-500/20 text-red-400' : 
                            r.status === 'in-progress' ? 'bg-amber-500/20 text-amber-400' : 
                            'bg-emerald-500/20 text-emerald-400'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {myReports.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-slate-500 py-4 italic">
                        No reports found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-right">
              <Link
                to="/report"
                className="text-blue-400 text-xs font-medium hover:underline inline-flex items-center gap-1"
              >
                View all reports →
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="theme-card p-4"
          variants={itemVariants}
        >
          <h3 className="text-sm font-semibold mb-3 text-slate-300">
            Recent Leave Requests
          </h3>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full text-xs border border-slate-600 rounded-lg overflow-hidden">
                <thead className="bg-slate-700/50 text-slate-300 font-medium">
                  <tr>
                    <th className="p-2 text-left rounded-l-md">Type</th>
                    <th className="p-2 text-left">Dates</th>
                    <th className="p-2 text-left rounded-r-md">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-600">
                  {myLeaves.slice(0, 5).map((l, idx) => (
                    <tr key={`${l.id ?? l._id}-${idx}`} className="hover:bg-slate-700/50 transition-colors">
                      <td className="p-2 capitalize font-medium text-slate-200">{l.type}</td>
                      <td className="p-2 text-slate-400">
                        {l.startDate} → {l.endDate}
                        {l.halfDay ? <span className="text-xs text-blue-400 ml-1">• Half-day</span> : ""}
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize
                          ${l.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 
                            l.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 
                            'bg-red-500/20 text-red-400'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {myLeaves.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-slate-500 py-4 italic">
                        No leave requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-right">
              <Link
                to="/leave"
                className="text-blue-400 text-xs font-medium hover:underline inline-flex items-center gap-1"
              >
                View all requests →
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
