import { Activity, Bell, CalendarClock, CalendarDays, Clock3, FileText, Plane, Timer } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addDays, endOfWeek, format, parseISO, startOfWeek, subDays } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { useDTRStore } from "../../stores/global/dtr/dtr.store";
import { useLeaveStore } from "../../stores/global/leave/leave.store";
import { useReportStore } from "../../stores/global/report/report.store";
import { useScheduleStore } from "../../stores/global/schedule/schedule.store";
import { useNotificationStore } from "../../stores/global/notification/notification.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import useAuthStore from "../../stores/auth/auth.store";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import { fmtDuration, summarizeDay } from "../../utils/dtr/dtr.summary";
import { formatTime12 } from "../Public/clockUi";
import StatCard from "../../components/ui/StatCard";
import PageHeader from "../../components/ui/PageHeader";

const YMD = "yyyy-MM-dd";
const CHART_DAYS = 7;
const RECENT_LIMIT = 5;

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
  pending: "bg-amber-50 text-amber-700",
  open: "bg-amber-50 text-amber-700",
  "in-progress": "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  canceled: "bg-slate-100 text-slate-600",
};

const StatusChip = ({ status }: { status: string }) => (
  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600"}`}>
    {status}
  </span>
);

const Panel = ({ title, icon: Icon, to, linkLabel, children }: { title: string; icon: typeof Clock3; to: string; linkLabel: string; children: ReactNode }) => (
  <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-slate-400" />
        {title}
      </h3>
      <Link to={to} className="text-xs font-medium text-blue-600 hover:text-blue-700">
        {linkLabel}
      </Link>
    </div>
    {children}
  </div>
);

const Empty = ({ text }: { text: string }) => <p className="py-6 text-center text-sm text-slate-400">{text}</p>;

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { account } = useAuthStore();
  const { userDTRs, loadUserDTRs } = useDTRStore();
  const { schedules, fetchMySchedulesByDate } = useScheduleStore();
  const { leaves, fetchLeavesByEmployeeId } = useLeaveStore();
  const { reports, fetchMyReports } = useReportStore();
  const { notifications, fetchNotifications } = useNotificationStore();

  const userId = user?._id ?? account?._id;
  const [now, setNow] = useState(new Date());
  const today = format(now, YMD);

  // Minute tick keeps the running work segment live.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Everything on this page comes from the signed-in employee's own records.
  useEffect(() => {
    if (!userId) return;
    loadUserDTRs(userId).catch(() => undefined);
    fetchLeavesByEmployeeId(userId).catch(() => undefined);
    fetchMyReports().catch(() => undefined);
    fetchNotifications().catch(() => undefined);
  }, [userId, loadUserDTRs, fetchLeavesByEmployeeId, fetchMyReports, fetchNotifications]);

  useEffect(() => {
    if (userId) fetchMySchedulesByDate(today).catch(() => undefined);
  }, [userId, today, fetchMySchedulesByDate]);

  const nowHHMM = format(now, "HH:mm");
  const days = useMemo(() => (userDTRs ?? []).map((d) => summarizeDay(d, d.date === today ? nowHHMM : undefined)).filter((d) => d.hasEntries), [userDTRs, today, nowHHMM]);
  const todayRec = days.find((d) => d.date === today);

  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), YMD);
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), YMD);
  const weekMin = days.filter((d) => d.date >= weekStart && d.date <= weekEnd).reduce((n, d) => n + d.workMin, 0);

  const monthStart = today.slice(0, 8) + "01";
  const monthDays = days.filter((d) => d.date >= monthStart);
  const lateDays = monthDays.filter((d) => d.late).length;

  const chart = useMemo(
    () =>
      Array.from({ length: CHART_DAYS }, (_, i) => {
        const date = format(subDays(now, CHART_DAYS - 1 - i), YMD);
        const rec = days.find((d) => d.date === date);
        return { label: format(parseISO(date), "EEE"), hours: Number(((rec?.workMin ?? 0) / 60).toFixed(2)) };
      }),
    [days, now]
  );

  const mySchedule = schedules.find((s) => s.userId === userId && s.date === today);
  const shift = mySchedule?.sessions?.[0];

  const myLeaves = useMemo(() => [...leaves].sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt))), [leaves]);
  const myReports = useMemo(() => [...reports].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), [reports]);
  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
  const openReports = reports.filter((r) => r.status === "open" || r.status === "in-progress").length;
  const unread = (notifications ?? []).filter((n) => !n.read);

  const name = [account?.firstName, account?.lastName].filter(Boolean).join(" ") || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "there";
  const position = Array.isArray(account?.position) ? account?.position.join(", ") : account?.position;

  const status = !todayRec
    ? { value: "Not started", sub: "No time in yet today" }
    : todayRec.active
      ? { value: "Working", sub: `Since ${formatTime12(todayRec.timeIn)}` }
      : { value: "Timed out", sub: `${formatTime12(todayRec.timeIn)} – ${formatTime12(todayRec.timeOut)}` };

  return (
    <motion.div className="w-full space-y-6 pb-8" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={CalendarDays}
          tint="blue"
          eyebrow={format(now, "EEEE, MMMM d, yyyy")}
          title={`Welcome back, ${name}`}
          subtitle={position}
          actions={
            <Link to="/dtr" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Clock3 className="h-4 w-4" /> My DTR
            </Link>
          }
        />
      </motion.div>

      <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" variants={itemVariants}>
        <StatCard
          title="Today's schedule"
          value={shift ? `${formatTime12(shift.scheduledStartTime)}` : "—"}
          subtitle={shift ? `to ${formatTime12(shift.scheduledEndTime)}` : "No schedule"}
          icon={CalendarClock}
          color="blue"
          onClick={() => navigate("/schedule")}
        />
        <StatCard title="Today's status" value={status.value} subtitle={status.sub} icon={Activity} color={todayRec?.active ? "green" : "yellow"} onClick={() => navigate("/dtr")} />
        <StatCard title="Hours this week" value={fmtDuration(weekMin)} subtitle={`${format(parseISO(weekStart), "MMM d")} – ${format(addDays(parseISO(weekStart), 6), "MMM d")}`} icon={Timer} color="purple" onClick={() => navigate("/dtr")} />
        <StatCard title="Days present" value={monthDays.length} subtitle={lateDays > 0 ? `${lateDays} late this month` : "this month"} icon={CalendarDays} color={lateDays > 0 ? "red" : "green"} onClick={() => navigate("/dtr")} />
      </motion.div>

      <motion.div className="grid grid-cols-1 gap-4 lg:grid-cols-3" variants={itemVariants}>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Hours worked · last {CHART_DAYS} days</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v: number) => [`${v} h`, "Worked"]} />
                <Bar dataKey="hours" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <Panel title="Notifications" icon={Bell} to="/notifications" linkLabel={unread.length ? `${unread.length} unread` : "View all"}>
          {unread.length === 0 ? (
            <Empty text="You're all caught up." />
          ) : (
            <ul className="space-y-3">
              {unread.slice(0, RECENT_LIMIT).map((n) => (
                <li key={n._id}>
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-slate-500">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </motion.div>

      <motion.div className="grid grid-cols-1 gap-4 lg:grid-cols-3" variants={itemVariants}>
        <Panel title="Recent attendance" icon={Clock3} to="/dtr" linkLabel="View all">
          {days.length === 0 ? (
            <Empty text="No attendance yet." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {[...days].sort((a, b) => b.date.localeCompare(a.date)).slice(0, RECENT_LIMIT).map((d) => (
                <li key={d.date} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-slate-800">{format(parseISO(d.date), "EEE, MMM d")}</span>
                  <span className="tabular-nums text-slate-500">
                    {formatTime12(d.timeIn)} – {d.active ? "now" : formatTime12(d.timeOut)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Leave requests" icon={Plane} to="/leave" linkLabel={pendingLeaves ? `${pendingLeaves} pending` : "View all"}>
          {myLeaves.length === 0 ? (
            <Empty text="No leave requests yet." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {myLeaves.slice(0, RECENT_LIMIT).map((l) => (
                <li key={l._id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="min-w-0 truncate text-slate-800">
                    <span className="font-medium capitalize">{l.type}</span> · {format(parseISO(l.startDate), "MMM d")}
                  </span>
                  <StatusChip status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="My reports" icon={FileText} to="/report" linkLabel={openReports ? `${openReports} open` : "View all"}>
          {myReports.length === 0 ? (
            <Empty text="No reports submitted." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {myReports.slice(0, RECENT_LIMIT).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="min-w-0 truncate text-slate-800">
                    <span className="font-medium capitalize">{r.type}</span> · {format(parseISO(r.createdAt), "MMM d")}
                  </span>
                  <StatusChip status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </motion.div>
    </motion.div>
  );
}
