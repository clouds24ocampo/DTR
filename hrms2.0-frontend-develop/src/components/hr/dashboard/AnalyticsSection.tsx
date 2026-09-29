import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
import {
  TrendingUp,
  Users,
  Calendar,
  Clock,
  UserPlus,
  Briefcase,
} from "lucide-react";
import { useMemo } from "react";
import { useDTRStore } from "../../../stores/global/dtr/dtr.store";
import { useLeaveStore } from "../../../stores/global/leave/leave.store";
import { useDepartmentStore } from "../../../stores/workforce/department/department.store";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import useAuthStore from "../../../stores/auth/auth.store";

export default function AnalyticsSection() {
  /* ---------------- Real Data Hooks ---------------- */
  const { otherUsers } = useUserStore();
  const { account: currentUser } = useAuthStore();
  const { allDTRs } = useDTRStore();
  const { leaves } = useLeaveStore();
  const { departments } = useDepartmentStore();

  // Combine employees
  const allEmployees = useMemo(() => {
    return currentUser ? [...otherUsers, currentUser] : otherUsers;
  }, [otherUsers, currentUser]);

  const activeEmployees = allEmployees.filter((u: any) => !u.archived);

  /* ---------------- Attendance Data (Last 6 Months) ---------------- */
  const attendanceData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        month: d.toLocaleString("default", { month: "short" }),
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
      };
    });

    return last6Months.map(({ month, monthIdx, year }) => {
      // Filter DTRs for this month
      const monthDTRs = allDTRs.filter((dtr) => {
        const d = new Date(dtr.date);
        return d.getMonth() === monthIdx && d.getFullYear() === year;
      });

      // Calculate attendance rate
      const daysInMonth = new Set(monthDTRs.map((d) => d.date)).size;
      const totalPresent = monthDTRs.reduce((acc, dtr) => {
        // Count only if sessions exist
        return acc + (dtr.sessions && dtr.sessions.length > 0 ? 1 : 0);
      }, 0);

      const avgDailyPresent = daysInMonth > 0 ? totalPresent / daysInMonth : 0;
      const totalActive = activeEmployees.length || 1;
      const rate = Math.min(100, Math.round((avgDailyPresent / totalActive) * 100));

      return {
        month,
        attendance: rate,
        target: 95,
      };
    });
  }, [allDTRs, activeEmployees]);

  /* ---------------- Department Data ---------------- */
  const departmentData = useMemo(() => {
    if (!departments.length) return [];

    // Sort by member count
    const sortedDetails = departments
      .map((dept: any) => {
        const count = dept.members?.length || 0;
        return {
          name: dept.name,
          employees: count
        };
      })
      .sort((a, b) => b.employees - a.employees)
      .slice(0, 5); // Take top 5

    const totalTracked = sortedDetails.reduce((a, b) => a + b.employees, 0);

    return sortedDetails.map(d => ({
      ...d,
      percentage: totalTracked > 0 ? Math.round((d.employees / totalTracked) * 100) : 0
    }));
  }, [departments]);

  /* ---------------- Leave Analysis (Last 6 Months) ---------------- */
  const leaveData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        month: d.toLocaleString("default", { month: "short" }),
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
      };
    });

    return last6Months.map(({ month, monthIdx, year }) => {
      const monthLeaves = leaves.filter((l) => {
        const d = new Date(l.startDate);
        return d.getMonth() === monthIdx && d.getFullYear() === year && l.status === 'approved';
      });

      const sick = monthLeaves.filter(l => l.type.toLowerCase().includes('sick')).length;
      const vacation = monthLeaves.filter(l => l.type.toLowerCase().includes('vacation')).length;
      const personal = monthLeaves.filter(l => !l.type.toLowerCase().includes('sick') && !l.type.toLowerCase().includes('vacation')).length;

      return { month, sick, vacation, personal };
    });
  }, [leaves]);

  /* ---------------- Recruitment/New Hires Trend (Last 4 Quarters) ---------------- */
  const recruitmentData = useMemo(() => {
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const currentYear = new Date().getFullYear();

    return quarters.map(q => {
      const qIdx = quarters.indexOf(q);
      const startMonth = qIdx * 3;
      const endMonth = startMonth + 2;

      const count = allEmployees.filter((u: any) => {
        const d = new Date(u.createdAt || new Date()); // Fallback if no createdAt
        return d.getFullYear() === currentYear && d.getMonth() >= startMonth && d.getMonth() <= endMonth;
      }).length;

      return {
        quarter: q,
        hires: count
      };
    });
  }, [allEmployees]);

  /* ---------------- Work Hours by Day ---------------- */
  const workHoursData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    // Analyze last 30 days DTRs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDTRs = allDTRs.filter(d => new Date(d.date) >= thirtyDaysAgo);

    const dayStats = days.reduce((acc, day) => {
      acc[day] = { totalHours: 0, count: 0 };
      return acc;
    }, {} as Record<string, { totalHours: number, count: number }>);

    recentDTRs.forEach(dtr => {
      const dayName = new Date(dtr.date).toLocaleDateString('en-US', { weekday: 'short' });
      if (dayStats[dayName]) {
        let dailyHours = 0;
        dtr.sessions?.forEach((session: any) => {
          session.fullDTR
            ?.filter((entry: any) => entry.type === "work" && entry.status === "done")
            .forEach((entry: any) => {
              if (entry.startTime && entry.endTime) {
                const start = new Date(`1970-01-01T${entry.startTime}:00`);
                const end = new Date(`1970-01-01T${entry.endTime}:00`);
                const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                dailyHours += Math.max(0, hours);
              }
            });
        });

        if (dailyHours > 0) {
          dayStats[dayName].totalHours += dailyHours;
          dayStats[dayName].count += 1;
        }
      }
    });

    return days.map(day => ({
      day,
      hours: dayStats[day].count > 0 ? Math.round(dayStats[day].totalHours / dayStats[day].count) : 0
    }));
  }, [allDTRs]);

  /* ---------------- KPI Calculations ---------------- */

  const avgTenure = useMemo(() => {
    if (!activeEmployees.length) return "0 yrs";
    const totalDays = activeEmployees.reduce((acc, u: any) => {
      const start = new Date(u.createdAt || new Date());
      const now = new Date();
      const diff = now.getTime() - start.getTime();
      return acc + (diff / (1000 * 60 * 60 * 24));
    }, 0);
    const avgDays = totalDays / activeEmployees.length;
    return `${(avgDays / 365).toFixed(1)} yrs`;
  }, [activeEmployees]);

  const totalOvertime = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return allDTRs
      .filter(d => new Date(d.date) >= thirtyDaysAgo)
      .reduce((acc, dtr) => {
        let dailyHours = 0;
        dtr.sessions?.forEach((session: any) => {
          session.fullDTR
            ?.filter((entry: any) => entry.type === "work" && entry.status === "done")
            .forEach((entry: any) => {
              if (entry.startTime && entry.endTime) {
                const start = new Date(`1970-01-01T${entry.startTime}:00`);
                const end = new Date(`1970-01-01T${entry.endTime}:00`);
                const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                dailyHours += Math.max(0, hours);
              }
            });
        });
        return acc + Math.max(0, dailyHours - 9);
      }, 0);
  }, [allDTRs]);

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  const kpiCards = [
    {
      title: "Active Employees",
      value: activeEmployees.length,
      change: "Current",
      trend: "up",
      icon: Users,
      color: "blue",
    },
    {
      title: "Avg. Tenure",
      value: avgTenure,
      change: "stable",
      trend: "up",
      icon: Calendar,
      color: "green",
    },
    {
      title: "New Hires (This Year)",
      value: recruitmentData.reduce((a, b) => a + b.hires, 0),
      change: "YTD",
      trend: "up",
      icon: UserPlus,
      color: "yellow",
    },
    {
      title: "Overtime Hours (30d)",
      value: `${Math.round(totalOvertime)}h`,
      change: "estimated",
      trend: "down",
      icon: Clock,
      color: "purple",
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

  return (
    <motion.div
      className="bg-gradient-to-br from-neutral-50 to-primary-50 rounded-lg shadow-lg border border-neutral-200 p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-primary-400" />
            Workforce Analytics
          </h2>
          <p className="text-sm text-neutral-700 mt-1">
            Comprehensive insights into your workforce metrics
          </p>
        </div>
        <div className="bg-primary-100 text-primary-500 px-4 py-2 rounded-lg text-sm font-semibold">
          Last 6 Months
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={itemVariants}
      >
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          const colorClasses = {
            blue: "bg-primary-100 text-primary-400",
            green: "bg-accent-green-100 text-accent-green-600",
            yellow: "bg-accent-yellow-100 text-accent-yellow-600",
            purple: "bg-accent-purple-100 text-accent-purple-600",
          }[kpi.color];

          return (
            <motion.div
              key={index}
              className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${colorClasses}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs font-semibold ${kpi.trend === "up"
                    ? "text-accent-green-600"
                    : "text-accent-red-600"
                    }`}
                >
                  {kpi.change}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">
                  {kpi.value}
                </p>
                <p className="text-xs text-neutral-600 mt-1">{kpi.title}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <motion.div
          className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200"
          variants={itemVariants}
        >
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Attendance Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="attendance"
                stroke="#3B82F6"
                fill="#93C5FD"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="target"
                stroke="#10B981"
                fill="#6EE7B7"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Department Distribution */}
        <motion.div
          className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200"
          variants={itemVariants}
        >
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Department Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="employees"
              >
                {departmentData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Leave Analysis */}
        <motion.div
          className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200"
          variants={itemVariants}
        >
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Leave Analysis
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={leaveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="sick" fill="#EF4444" radius={[8, 8, 0, 0]} />
              <Bar dataKey="vacation" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="personal" fill="#F59E0B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recruitment Trend */}
        <motion.div
          className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200"
          variants={itemVariants}
        >
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-accent-yellow-600" />
            Recruitment Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={recruitmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="quarter" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="hires"
                name="New Hires"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: "#10B981", r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Work Hours Analysis */}
      <motion.div
        className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200"
        variants={itemVariants}
      >
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          Average Work Hours by Day
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={workHoursData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="day" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFF",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="hours" fill="#8B5CF6" radius={[8, 8, 0, 0]}>
              {workHoursData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.hours > 44 ? "#EF4444" : "#8B5CF6"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}
