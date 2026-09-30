/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Briefcase,
  Users,
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
  LayoutDashboard,
  LineChart,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import StatCard from "../../components/ui/StatCard";
import EmptyState from "../../components/ui/EmptyState";
import {
  SectionHeader,
  formatLongDate,
  greeting,
  percentChange,
  pct,
  toLocalISODate,
} from "../../components/ui/dashboardUi";
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
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

const firstPosition = (position: unknown, fallback: string): string => {
  const p = Array.isArray(position) ? position[0] : position;
  return typeof p === "string" && p.trim() ? p : fallback;
};

const safeDateLabel = (value: string | null | undefined): string => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/** A DTR counts as "present" only when someone actually clocked in for work. */
const hasClockedIn = (dtr: any): boolean =>
  Array.isArray(dtr?.sessions) &&
  dtr.sessions.some(
    (s: any) =>
      Array.isArray(s?.fullDTR) &&
      s.fullDTR.some((f: any) => f?.type === "work" && f?.startTime && f.startTime !== "--")
  );

const COLORS = ["#2563eb", "#7c3aed", "#0ea5e9", "#14b8a6", "#f59e0b", "#94a3b8"];

const PIPELINE = [
  { status: "Unreviewed", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  { status: "Under Review", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 ring-blue-200" },
  { status: "Accepted", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { status: "Rejected", dot: "bg-red-500", badge: "bg-red-50 text-red-700 ring-red-200" },
] as const;

const ACTIVITY_STYLES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  yellow: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
};

const card = "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

const VIEW_ORDER = ["overview", "analytics"] as const;

/** First-load skeleton: mirrors the overview layout so content doesn't jump. */
function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="h-10 w-10 rounded-2xl bg-slate-100" />
            <div className="mt-4 h-3 w-20 rounded bg-slate-100" />
            <div className="mt-2 h-7 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="card-dashboard animate-pulse lg:col-span-3" style={{ minHeight: 320 }}>
          <div className="h-4 w-48 rounded bg-slate-100" />
          <div className="mt-6 h-44 rounded-xl bg-slate-100" />
        </div>
        <div className="card-dashboard animate-pulse lg:col-span-2" style={{ minHeight: 320 }}>
          <div className="h-4 w-40 rounded bg-slate-100" />
          <div className="mx-auto mt-6 h-44 w-44 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function HRDashboard() {
  const [view, setView] = useState<"overview" | "analytics">("overview");
  const [refreshing, setRefreshing] = useState(false);
  // First-load skeleton (avoids the zero-flash while stores resolve).
  const [initializing, setInitializing] = useState(true);
  const { account } = useAuthStore();
  const navigate = useNavigate();

  const { filteredApplicants, filteredEmployee, refetchAll } = useFetchData();
  const { departments, fetchAllDepartments } = useDepartmentStore();
  const { allDTRs, loadAllDTRs } = useDTRStore();
  const { leaves, fetchAllLeaves } = useLeaveStore();
  const { reports, fetchAllReports } = useReportStore();

  const today = toLocalISODate();

  // The dashboard used to rely on other pages having loaded these stores first.
  const loadDashboardData = useCallback(async () => {
    await Promise.allSettled([
      loadAllDTRs(),
      fetchAllLeaves(),
      fetchAllReports(),
      fetchAllDepartments(),
    ]);
  }, [loadAllDTRs, fetchAllLeaves, fetchAllReports, fetchAllDepartments]);

  useEffect(() => {
    void loadDashboardData().finally(() => setInitializing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refetchAll(), loadDashboardData()]);
    } finally {
      setRefreshing(false);
    }
  };

  /* ---------------- Employee Statistics ---------------- */
  // Employees carry `archived`, not `status` (the old check always yielded 0).
  const activeEmployees = useMemo(
    () => filteredEmployee.filter((emp) => !emp.archived).length,
    [filteredEmployee]
  );

  const presentOn = useCallback(
    (date: string) =>
      new Set(
        allDTRs.filter((d) => d.date === date && hasClockedIn(d)).map((d) => d.userId)
      ).size,
    [allDTRs]
  );

  const presentToday = useMemo(() => presentOn(today), [presentOn, today]);

  /* ---------------- Leave Statistics ---------------- */
  const pendingLeaves = useMemo(
    () => leaves.filter((leave) => leave.status === "pending").length,
    [leaves]
  );

  const approvedLeavesToday = useMemo(
    () =>
      leaves.filter(
        (leave) =>
          leave.status === "approved" && leave.startDate <= today && leave.endDate >= today
      ).length,
    [leaves, today]
  );

  /* ---------------- Applicant Statistics ---------------- */
  const unreviewedApplicants = useMemo(
    () => filteredApplicants.filter((app) => app.status === "Unreviewed").length,
    [filteredApplicants]
  );

  const applicantPipeline = useMemo(
    () =>
      PIPELINE.map((stage) => ({
        ...stage,
        count: filteredApplicants.filter((a) => a.status === stage.status).length,
      })),
    [filteredApplicants]
  );

  /* ---------------- Department Distribution ---------------- */
  const departmentData = useMemo(
    () =>
      departments.map((dept: any) => ({
        name: dept.name,
        value: dept.members?.length || 0,
      })),
    [departments]
  );
  const departmentTotal = departmentData.reduce((sum, d) => sum + d.value, 0);

  /* ---------------- Position Distribution ---------------- */
  const positionData = useMemo(() => {
    const positionMap = new Map<string, number>();
    filteredEmployee.forEach((emp) => {
      const position = firstPosition(emp.position, "Unknown");
      positionMap.set(position, (positionMap.get(position) || 0) + 1);
    });
    return Array.from(positionMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredEmployee]);

  /* ---------------- Attendance Trend (Last 7 Days, oldest -> newest) ---------------- */
  const attendanceTrend = useMemo(() => {
    const total = activeEmployees;
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const present = presentOn(toLocalISODate(date));
      return {
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        present,
        total,
        percentage: Math.round(pct(present, total)),
      };
    });
  }, [presentOn, activeEmployees]);

  const averageAttendance = attendanceTrend.length
    ? attendanceTrend.reduce((sum, day) => sum + day.percentage, 0) / attendanceTrend.length
    : 0;
  const hasAttendance = attendanceTrend.some((d) => d.present > 0);

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

    filteredEmployee.slice(0, 3).forEach((emp) => {
      activities.push({
        type: "New hire",
        title: "Joined the company",
        date: (emp as any).createdAt || "",
        employee: `${emp.firstName} ${emp.lastName}`,
        icon: UserPlus,
        color: "blue",
      });
    });

    leaves
      .filter((leave) => leave.status === "pending")
      .slice(0, 3)
      .forEach((leave) => {
        const emp = filteredEmployee.find((e) => e._id === leave.employeeId);
        activities.push({
          type: "Leave request",
          title: `${leave.type} · ${leave.startDate}`,
          date: (leave as any).createdAt || leave.startDate,
          employee: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
          icon: Plane,
          color: "yellow",
        });
      });

    reports.slice(0, 2).forEach((report) => {
      const emp = filteredEmployee.find((e) => e._id === report.employeeId);
      activities.push({
        type: "Report filed",
        title: report.type,
        date: report.createdAt || "",
        employee: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
        icon: AlertCircle,
        color: "red",
      });
    });

    const time = (d: string) => {
      const t = new Date(d).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    return activities.sort((a, b) => time(b.date) - time(a.date)).slice(0, 8);
  }, [filteredEmployee, leaves, reports]);

  const openReports = reports.filter((r) => r.status === "open").length;

  /* Only link to pages the HR menu actually exposes. */
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
      ...percentChange(
        presentToday,
        attendanceTrend[attendanceTrend.length - 2]?.present,
        "vs yesterday"
      ),
      icon: UserCheck,
      color: "green" as const,
      link: "/workforce-dtr-tracking",
    },
    {
      title: "Pending Leaves",
      value: pendingLeaves,
      subtitle: `${leaves.length} total requests`,
      icon: Plane,
      color: "yellow" as const,
      link: "/leave",
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
      link: "/department",
    },
    {
      title: "Open Reports",
      value: openReports,
      subtitle: `${reports.length} total`,
      icon: AlertCircle,
      color: "red" as const,
      link: "/report",
    },
  ];

  const actions = [
    { icon: Users, label: "Manage employees", to: "/employees" },
    { icon: UserPlus, label: "Review applicants", to: "/hr-applicant-management" },
    { icon: CheckCircle, label: "Approve leaves", to: "/leave" },
    { icon: Briefcase, label: "Job postings", to: "/hr-job-management" },
    { icon: DollarSign, label: "Payroll", to: "/hr-payroll-management" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  };

  const fullName = `${account?.firstName ?? ""} ${account?.lastName ?? ""}`.trim();

  return (
    <>
      <motion.div
        className="dash-light space-y-6 pb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero */}
        <motion.section className={card} variants={itemVariants}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar
                src={isValidImageUrl(account?.profilePicture) ? account?.profilePicture : undefined}
                name={fullName || "User"}
                className="!h-14 !w-14 !text-xl ring-2 ring-white shadow-md"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                  {formatLongDate()}
                </p>
                <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {greeting()}, {account?.firstName ?? "there"}!
                </h2>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {firstPosition(account?.position, "HR Manager")} · {filteredEmployee.length}{" "}
                  employees · {departments.length} departments
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                role="tablist"
                aria-label="Dashboard view"
                className="inline-flex rounded-xl bg-slate-100 p-1"
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  const idx = VIEW_ORDER.indexOf(view);
                  const next =
                    VIEW_ORDER[
                      (idx + (e.key === "ArrowRight" ? 1 : VIEW_ORDER.length - 1)) %
                        VIEW_ORDER.length
                    ];
                  setView(next);
                }}
              >
                {(
                  [
                    { id: "overview", label: "Overview", icon: LayoutDashboard },
                    { id: "analytics", label: "Analytics", icon: LineChart },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    tabIndex={view === tab.id ? 0 : -1}
                    aria-selected={view === tab.id}
                    onClick={() => setView(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                      view === tab.id
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh data"
                aria-label="Refresh data"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.to)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </button>
            ))}
          </div>
        </motion.section>

        {view === "analytics" ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <AnalyticsSection />
          </motion.div>
        ) : initializing ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* KPI cards */}
            <motion.div
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6"
              variants={itemVariants}
            >
              {stats.map((stat) => (
                <motion.div key={stat.title} variants={itemVariants}>
                  <StatCard {...stat} onClick={() => navigate(stat.link)} />
                </motion.div>
              ))}
            </motion.div>

            {/* Charts */}
            <motion.div className="grid grid-cols-1 gap-6 lg:grid-cols-5" variants={itemVariants}>
              <section className={`${card} flex flex-col lg:col-span-3`} style={{ minHeight: 320 }}>
                <SectionHeader
                  icon={BarChart3}
                  title="Attendance · last 7 days"
                  tint="blue"
                  actionLabel="DTR tracking"
                  onAction={() => navigate("/workforce-dtr-tracking")}
                />
                <div className="relative min-h-[200px] w-full flex-1">
                  {!hasAttendance && (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                      <span className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-400">
                        No clock-ins recorded this week
                      </span>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attendanceTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[0, (max: number) => Math.max(max, 1)]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                      />
                      <Tooltip
                        cursor={{ stroke: "#cbd5e1", strokeDasharray: 4 }}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                        formatter={(value: number, _n, item: any) => [
                          `${value} of ${item?.payload?.total ?? 0} employees`,
                          "Present",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="present"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        fill="url(#attFill)"
                        dot={{ r: 3, fill: "#fff", stroke: "#2563eb", strokeWidth: 2 }}
                        activeDot={{ r: 5 }}
                      />
                      {hasAttendance && averageAttendance > 0 && (
                        <ReferenceLine
                          y={(averageAttendance / 100) * Math.max(activeEmployees, 1)}
                          stroke="#94a3b8"
                          strokeDasharray="5 4"
                          label={{
                            value: `avg ${averageAttendance.toFixed(0)}%`,
                            position: "insideTopRight",
                            fontSize: 11,
                            fill: "#64748b",
                          }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Average attendance{" "}
                  <span className="font-semibold text-slate-800">{averageAttendance.toFixed(1)}%</span>
                  <span className="text-slate-400"> · of {activeEmployees} active employees</span>
                </p>
              </section>

              <section className={`${card} flex flex-col lg:col-span-2`} style={{ minHeight: 320 }}>
                <SectionHeader
                  icon={Building2}
                  title="Department distribution"
                  tint="green"
                  actionLabel="Departments"
                  onAction={() => navigate("/department")}
                />
                {departmentTotal > 0 ? (
                  <div className="flex flex-1 flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
                    <div className="relative h-44 w-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={departmentData}
                            dataKey="value"
                            innerRadius={56}
                            outerRadius={80}
                            paddingAngle={departmentData.filter((d) => d.value > 0).length > 1 ? 3 : 0}
                            stroke="none"
                          >
                            {departmentData.map((_e, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-slate-900">{departmentTotal}</span>
                        <span className="text-[11px] text-slate-500">members</span>
                      </div>
                    </div>
                    <ul className="w-full min-w-0 flex-1 space-y-1">
                      {departmentData.map((d, i) => (
                        <li key={d.name + i}>
                          <button
                            type="button"
                            onClick={() => navigate("/department")}
                            aria-label={`View ${d.name} department`}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: COLORS[i % COLORS.length] }}
                            />
                            <span className="min-w-0 flex-1 truncate text-slate-700">{d.name}</span>
                            <span className="font-semibold text-slate-900 tabular-nums">{d.value}</span>
                            <span className="w-9 text-right text-slate-400 tabular-nums">
                              {Math.round(pct(d.value, departmentTotal))}%
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <EmptyState
                    title={departments.length ? "No members yet" : "No departments found"}
                    message={
                      departments.length
                        ? "Assign members to departments to see the distribution."
                        : "Create a department to get started."
                    }
                  />
                )}
                <p className="mt-3 text-xs text-slate-500">
                  Total employees{" "}
                  <span className="font-semibold text-slate-800">{filteredEmployee.length}</span>
                </p>
              </section>
            </motion.div>

            {/* Pipeline & positions */}
            <motion.div className="grid grid-cols-1 gap-6 lg:grid-cols-2" variants={itemVariants}>
              <section className={card}>
                <SectionHeader
                  icon={UserPlus}
                  title="Recruitment pipeline"
                  tint="purple"
                  actionLabel="Applicants"
                  onAction={() => navigate("/hr-applicant-management")}
                />
                <div
                  className="mb-4 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                  role="img"
                  aria-label="Applicants by stage"
                >
                  {applicantPipeline.map((s) => (
                    <div
                      key={s.status}
                      className={s.dot}
                      style={{ width: `${pct(s.count, filteredApplicants.length)}%` }}
                    />
                  ))}
                </div>
                <ul className="space-y-1.5">
                  {applicantPipeline.map((s) => (
                    <li key={s.status}>
                      <button
                        type="button"
                        onClick={() => navigate("/hr-applicant-management")}
                        aria-label={`View ${s.count} ${s.status} applicants`}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                      >
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.badge}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          {s.status}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 tabular-nums">
                            {Math.round(pct(s.count, filteredApplicants.length))}%
                          </span>
                          <span className="w-6 text-right text-base font-bold text-slate-900 tabular-nums">
                            {s.count}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-slate-500">
                  Total applicants{" "}
                  <span className="font-semibold text-slate-800">{filteredApplicants.length}</span>
                </p>
              </section>

              <section className={card}>
                <SectionHeader
                  icon={Award}
                  title="Employee positions"
                  tint="amber"
                  actionLabel="Employees"
                  onAction={() => navigate("/employees")}
                  right={
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 tabular-nums">
                      {positionData.length} roles
                    </span>
                  }
                />
                {positionData.length ? (
                  <ul className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
                    {positionData.map((p, idx) => (
                      <li key={p.name}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="w-5 text-slate-400 tabular-nums">#{idx + 1}</span>
                            <span className="truncate font-medium text-slate-700">{p.name}</span>
                          </span>
                          <span className="font-semibold text-slate-900 tabular-nums">{p.value}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            style={{ width: `${pct(p.value, filteredEmployee.length)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="No employees found"
                    message="Registered employees will appear here with their role breakdown."
                  />
                )}
              </section>
            </motion.div>

            {/* Activity & employees */}
            <motion.div className="grid grid-cols-1 gap-6 lg:grid-cols-2" variants={itemVariants}>
              <section className={card}>
                <SectionHeader icon={Activity} title="Recent HR activity" tint="indigo" />
                {recentActivities.length ? (
                  <ul className="max-h-[340px] space-y-1 overflow-y-auto pr-1">
                    {recentActivities.map((a, idx) => {
                      const Icon = a.icon;
                      const when = safeDateLabel(a.date);
                      return (
                        <li
                          key={idx}
                          className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50"
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ACTIVITY_STYLES[a.color]}`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {a.employee}
                            </p>
                            <p className="truncate text-xs text-slate-500" title={`${a.type} · ${a.title} · ${a.date}`}>
                              {a.type} · {a.title}
                            </p>
                          </div>
                          {when && <span className="shrink-0 text-[11px] text-slate-400">{when}</span>}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState
                    title="No recent activity"
                    message="Hires, leave requests, and reports will show up here."
                  />
                )}
              </section>

              <section className={card}>
                <SectionHeader
                  icon={Users}
                  title="Recent employees"
                  tint="blue"
                  actionLabel="View all"
                  onAction={() => navigate("/employees")}
                />
                {filteredEmployee.length ? (
                  <ul className="max-h-[340px] space-y-1 overflow-y-auto pr-1">
                    {filteredEmployee.slice(0, 8).map((emp) => (
                      <li key={emp._id}>
                        <button
                          type="button"
                          onClick={() => navigate("/employees")}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <Avatar
                              src={isValidImageUrl(emp.profilePicture) ? emp.profilePicture : undefined}
                              name={`${emp.firstName} ${emp.lastName}`}
                              className="!h-9 !w-9 !text-xs"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-slate-800">
                                {emp.firstName} {emp.lastName}
                              </span>
                              <span className="block truncate text-xs text-slate-500">
                                {firstPosition(emp.position, "Employee")}
                              </span>
                            </span>
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              emp.archived
                                ? "bg-slate-100 text-slate-500"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {emp.archived ? "Archived" : "Active"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="No employees found"
                    message="New hires will appear here as they join."
                    action={
                      <button
                        type="button"
                        onClick={() => navigate("/employees")}
                        className="font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                      >
                        Manage employees
                      </button>
                    }
                  />
                )}
              </section>
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
