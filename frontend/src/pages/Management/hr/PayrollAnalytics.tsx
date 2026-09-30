/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Clock,
    AlertTriangle,
    Calendar,
    Download,
    Filter,
    BarChart3,
    PieChart,
    Activity,
    Briefcase,
    Award,
    Target
} from "lucide-react";
import { usePayrollStore } from "../../../stores/hr/payroll/payroll.store";
import { useDepartmentStore } from "../../../stores/workforce/department/department.store";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import { DepartmentDoc } from "../../../types/workforce/department/department.type";
import { DepartmentLite } from "../../../components/workforce/dtr/EmployeesPanel";
import moment from "moment";
import { containerVariants } from "../../../utils/global/pageMotion";
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import { SectionHeader } from "../../../components/ui/dashboardUi";

// Chart Components (we'll use simple custom charts for better control)
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar
} from "recharts";

type PeriodType = "this_month" | "last_month" | "last_3_months" | "last_6_months" | "this_year" | "custom";

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];

export default function PayrollAnalytics() {
    const navigate = useNavigate();

    // Stores
    const { payrolls, fetchPayrolls, loading } = usePayrollStore();
    const { fetchAllDepartments, departments } = useDepartmentStore();
    const { fetchOtherUsers } = useUserStore();

    // State
    const [periodType, setPeriodType] = useState<PeriodType>("this_month");
    const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment().endOf('month').format('YYYY-MM-DD'));
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [activeTab, setActiveTab] = useState<"overview" | "trends" | "departments" | "employees">("overview");

    // Initial Fetch
    useEffect(() => {
        fetchOtherUsers();
        fetchAllDepartments();
    }, [fetchOtherUsers, fetchAllDepartments]);

    // Handle Period Change
    useEffect(() => {
        const now = moment();
        let newStart = startDate;
        let newEnd = endDate;

        switch (periodType) {
            case "this_month":
                newStart = now.startOf('month').format('YYYY-MM-DD');
                newEnd = now.endOf('month').format('YYYY-MM-DD');
                break;
            case "last_month": {
                const last = now.subtract(1, 'month');
                newStart = last.startOf('month').format('YYYY-MM-DD');
                newEnd = last.endOf('month').format('YYYY-MM-DD');
                break;
            }
            case "last_3_months":
                newStart = now.subtract(3, 'months').startOf('month').format('YYYY-MM-DD');
                newEnd = moment().endOf('month').format('YYYY-MM-DD');
                break;
            case "last_6_months":
                newStart = now.subtract(6, 'months').startOf('month').format('YYYY-MM-DD');
                newEnd = moment().endOf('month').format('YYYY-MM-DD');
                break;
            case "this_year":
                newStart = now.startOf('year').format('YYYY-MM-DD');
                newEnd = now.endOf('year').format('YYYY-MM-DD');
                break;
        }

        if (newStart !== startDate || newEnd !== endDate) {
            setStartDate(newStart);
            setEndDate(newEnd);
        }
    }, [periodType]);

    // Fetch Payrolls when Date Changes
    useEffect(() => {
        if (startDate && endDate) {
            fetchPayrolls(undefined, startDate, endDate);
        }
    }, [startDate, endDate, fetchPayrolls]);

    // Derived Data
    const safeDepartments: DepartmentLite[] = useMemo(() => {
        const raw: any = departments as any;
        const list: DepartmentDoc[] = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.departments)
                ? raw.departments
                : Array.isArray(raw?.items)
                    ? raw.items
                    : [];
        return list.map((d) => ({
            _id: String(d._id),
            name: String(d.name),
            head: d.head ? String(d.head) : null,
            members: Array.isArray(d.members) ? d.members.map(String) : [],
        }));
    }, [departments]);

    const userDeptMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const dept of safeDepartments) {
            if (dept.head) map.set(dept.head, dept._id);
            for (const memberId of dept.members) {
                map.set(memberId, dept._id);
            }
        }
        return map;
    }, [safeDepartments]);

    // Filter payrolls by department if selected
    const filteredPayrolls = useMemo(() => {
        if (!selectedDepartment) return payrolls;
        return payrolls.filter(p => {
            const empId = typeof p.employee === 'string' ? p.employee : p.employee._id;
            return userDeptMap.get(empId) === selectedDepartment;
        });
    }, [payrolls, selectedDepartment, userDeptMap]);

    // Analytics Calculations
    const analytics = useMemo(() => {
        const totalGrossPay = filteredPayrolls.reduce((sum, p) => sum + p.grossPay, 0);
        const totalNetPay = filteredPayrolls.reduce((sum, p) => sum + p.netPay, 0);
        const totalDeductions = totalGrossPay - totalNetPay;
        const totalLateDeductions = filteredPayrolls.reduce((sum, p) => sum + p.lateDeductionAmount, 0);
        const totalRegularHours = filteredPayrolls.reduce((sum, p) => sum + p.regularHours, 0);
        const totalOvertimeHours = filteredPayrolls.reduce((sum, p) => sum + p.overtimeHours, 0);
        const totalLateCount = filteredPayrolls.reduce((sum, p) => sum + p.lateCount, 0);
        const totalLateHours = filteredPayrolls.reduce((sum, p) => sum + (p.lateHours || 0), 0);

        const avgGrossPay = filteredPayrolls.length > 0 ? totalGrossPay / filteredPayrolls.length : 0;
        const avgNetPay = filteredPayrolls.length > 0 ? totalNetPay / filteredPayrolls.length : 0;
        const avgHourlyRate = filteredPayrolls.length > 0
            ? filteredPayrolls.reduce((sum, p) => sum + p.hourlyRate, 0) / filteredPayrolls.length
            : 0;

        // Status breakdown
        const statusBreakdown = {
            draft: filteredPayrolls.filter(p => p.status === 'draft').length,
            finalized: filteredPayrolls.filter(p => p.status === 'finalized').length,
            paid: filteredPayrolls.filter(p => p.status === 'paid').length,
        };

        // Department breakdown
        const deptBreakdown = safeDepartments.map(dept => {
            const deptPayrolls = filteredPayrolls.filter(p => {
                const empId = typeof p.employee === 'string' ? p.employee : p.employee._id;
                return userDeptMap.get(empId) === dept._id;
            });
            return {
                name: dept.name,
                count: deptPayrolls.length,
                totalGross: deptPayrolls.reduce((sum, p) => sum + p.grossPay, 0),
                totalNet: deptPayrolls.reduce((sum, p) => sum + p.netPay, 0),
                avgGross: deptPayrolls.length > 0 ? deptPayrolls.reduce((sum, p) => sum + p.grossPay, 0) / deptPayrolls.length : 0,
                totalOT: deptPayrolls.reduce((sum, p) => sum + p.overtimeHours, 0),
                totalLate: deptPayrolls.reduce((sum, p) => sum + p.lateCount, 0),
            };
        }).filter(d => d.count > 0);

        // Top earners
        const topEarners = [...filteredPayrolls]
            .sort((a, b) => b.grossPay - a.grossPay)
            .slice(0, 10)
            .map(p => ({
                name: typeof p.employee === 'string' ? 'Unknown' : `${p.employee.firstName} ${p.employee.lastName}`,
                grossPay: p.grossPay,
                netPay: p.netPay,
                overtimeHours: p.overtimeHours,
            }));

        // Employees with most overtime
        const topOvertime = [...filteredPayrolls]
            .sort((a, b) => b.overtimeHours - a.overtimeHours)
            .slice(0, 10)
            .map(p => ({
                name: typeof p.employee === 'string' ? 'Unknown' : `${p.employee.firstName} ${p.employee.lastName}`,
                overtimeHours: p.overtimeHours,
                grossPay: p.grossPay,
            }));

        // Employees with most lates
        const topLates = [...filteredPayrolls]
            .sort((a, b) => b.lateCount - a.lateCount)
            .slice(0, 10)
            .map(p => ({
                name: typeof p.employee === 'string' ? 'Unknown' : `${p.employee.firstName} ${p.employee.lastName}`,
                lateCount: p.lateCount,
                lateHours: p.lateHours || 0,
                lateDeduction: p.lateDeductionAmount,
            }));

        // Monthly trend (if we have multiple months)
        const monthlyTrend = filteredPayrolls.reduce((acc: any[], p) => {
            const month = moment(p.periodStart).format('MMM YYYY');
            const existing = acc.find(item => item.month === month);
            if (existing) {
                existing.grossPay += p.grossPay;
                existing.netPay += p.netPay;
                existing.count += 1;
                existing.overtimeHours += p.overtimeHours;
                existing.lateCount += p.lateCount;
            } else {
                acc.push({
                    month,
                    grossPay: p.grossPay,
                    netPay: p.netPay,
                    count: 1,
                    overtimeHours: p.overtimeHours,
                    lateCount: p.lateCount,
                });
            }
            return acc;
        }, []);

        return {
            totalGrossPay,
            totalNetPay,
            totalDeductions,
            totalLateDeductions,
            totalRegularHours,
            totalOvertimeHours,
            totalLateCount,
            totalLateHours,
            avgGrossPay,
            avgNetPay,
            avgHourlyRate,
            statusBreakdown,
            deptBreakdown,
            topEarners,
            topOvertime,
            topLates,
            monthlyTrend,
        };
    }, [filteredPayrolls, safeDepartments, userDeptMap]);

    // Chart data
    const statusChartData = [
        { name: 'Draft', value: analytics.statusBreakdown.draft, color: COLORS[0] },
        { name: 'Finalized', value: analytics.statusBreakdown.finalized, color: COLORS[1] },
        { name: 'Paid', value: analytics.statusBreakdown.paid, color: COLORS[2] },
    ].filter(item => item.value > 0);

    const deptChartData = analytics.deptBreakdown.map((dept, idx) => ({
        name: dept.name,
        employees: dept.count,
        grossPay: dept.totalGross,
        netPay: dept.totalNet,
        overtime: dept.totalOT,
        lates: dept.totalLate,
        color: COLORS[idx % COLORS.length],
    }));

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full min-h-screen p-4 sm:p-6 lg:p-8 space-y-6"
        >
            {/* Header */}
            <PageHeader
                icon={BarChart3}
                tint="blue"
                eyebrow="Compensation"
                title="Payroll Analytics"
                subtitle="Comprehensive insights into payroll data and trends"
                actions={
                    <>
                        <button
                            onClick={() => navigate('/hr-payroll-management')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-2xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        <button
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-2xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export Report
                        </button>
                    </>
                }
            />

            {/* Filters */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <SectionHeader icon={Filter} title="Filters" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Period</label>
                        <select
                            value={periodType}
                            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="last_3_months">Last 3 Months</option>
                            <option value="last_6_months">Last 6 Months</option>
                            <option value="this_year">This Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    {periodType === "custom" && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                        <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Departments</option>
                            {safeDepartments.map(dept => (
                                <option key={dept._id} value={dept._id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex gap-2">
                    {[
                        { id: "overview", label: "Overview", icon: Activity },
                        { id: "trends", label: "Trends", icon: TrendingUp },
                        { id: "departments", label: "Departments", icon: Briefcase },
                        { id: "employees", label: "Top Performers", icon: Award },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-blue-600 to-yellow-400 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            )}

            {/* Content */}
            {!loading && (
                <>
                    {/* Overview Tab */}
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <StatCard
                                    title="Total Gross Pay"
                                    value={`₱${analytics.totalGrossPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    subtitle={`${filteredPayrolls.length} payroll records`}
                                    icon={DollarSign}
                                    color="blue"
                                />
                                <StatCard
                                    title="Total Net Pay"
                                    value={`₱${analytics.totalNetPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    subtitle="Take-home total"
                                    icon={DollarSign}
                                    color="green"
                                />
                                <StatCard
                                    title="Total Employees"
                                    value={filteredPayrolls.length.toString()}
                                    subtitle="In selected period"
                                    icon={Users}
                                    color="purple"
                                />
                                <StatCard
                                    title="Avg Hourly Rate"
                                    value={`₱${analytics.avgHourlyRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    subtitle="Across employees"
                                    icon={Target}
                                    color="yellow"
                                />
                            </div>

                            {/* Secondary Metrics */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <StatCard
                                    title="Total Deductions"
                                    value={`₱${analytics.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    subtitle="Gross minus net"
                                    icon={TrendingDown}
                                    color="red"
                                />
                                <StatCard
                                    title="Late Deductions"
                                    value={`₱${analytics.totalLateDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    subtitle="Late arrival penalties"
                                    icon={AlertTriangle}
                                    color="yellow"
                                />
                                <StatCard
                                    title="Total Overtime"
                                    value={`${analytics.totalOvertimeHours.toFixed(1)} hrs`}
                                    subtitle="Overtime rendered"
                                    icon={Clock}
                                    color="green"
                                />
                                <StatCard
                                    title="Total Late Count"
                                    value={analytics.totalLateCount.toString()}
                                    subtitle="Late occurrences"
                                    icon={Calendar}
                                    color="blue"
                                />
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Status Distribution */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                    <SectionHeader icon={PieChart} title="Payroll Status Distribution" />
                                    <ResponsiveContainer width="100%" height={300}>
                                        <RechartsPieChart>
                                            <Pie
                                                data={statusChartData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {statusChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </RechartsPieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Average Pay Comparison */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                    <SectionHeader icon={BarChart3} title="Average Pay Breakdown" />
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart
                                            data={[
                                                { name: 'Gross Pay', value: analytics.avgGrossPay },
                                                { name: 'Net Pay', value: analytics.avgNetPay },
                                                { name: 'Deductions', value: analytics.avgGrossPay - analytics.avgNetPay },
                                            ]}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip formatter={(value: any) => `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                                            <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Trends Tab */}
                    {activeTab === "trends" && (
                        <div className="space-y-6">
                            {/* Monthly Trend */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                <SectionHeader icon={TrendingUp} title="Monthly Payroll Trend" />
                                <ResponsiveContainer width="100%" height={400}>
                                    <AreaChart data={analytics.monthlyTrend}>
                                        <defs>
                                            <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip formatter={(value: any) => `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                                        <Legend />
                                        <Area type="monotone" dataKey="grossPay" stroke="#2563eb" fillOpacity={1} fill="url(#colorGross)" name="Gross Pay" />
                                        <Area type="monotone" dataKey="netPay" stroke="#10b981" fillOpacity={1} fill="url(#colorNet)" name="Net Pay" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Overtime & Late Trends */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                    <SectionHeader icon={Clock} title="Overtime Hours Trend" tint="green" />
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={analytics.monthlyTrend}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="overtimeHours" stroke="#10b981" strokeWidth={2} name="OT Hours" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                    <SectionHeader icon={AlertTriangle} title="Late Count Trend" tint="amber" />
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={analytics.monthlyTrend}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="lateCount" stroke="#f59e0b" strokeWidth={2} name="Late Count" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Departments Tab */}
                    {activeTab === "departments" && (
                        <div className="space-y-6">
                            {/* Department Comparison */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                <SectionHeader icon={Briefcase} title="Department Payroll Comparison" />
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={deptChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip formatter={(value: any) => typeof value === 'number' && value > 100 ? `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : value} />
                                        <Legend />
                                        <Bar dataKey="grossPay" fill="#2563eb" name="Gross Pay" radius={[8, 8, 0, 0]} />
                                        <Bar dataKey="netPay" fill="#10b981" name="Net Pay" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Department Details Table */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
                                <div className="border-b border-slate-200/80">
                                    <SectionHeader icon={Briefcase} title="Department Details" />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employees</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Gross</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Net</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Gross</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">OT Hours</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Late Count</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {analytics.deptBreakdown.map((dept, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{dept.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{dept.count}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-900">₱{dept.totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-900">₱{dept.totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-900">₱{dept.avgGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{dept.totalOT.toFixed(1)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{dept.totalLate}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Department Radar Chart */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                <SectionHeader icon={Activity} title="Department Performance Radar" tint="purple" />
                                <ResponsiveContainer width="100%" height={400}>
                                    <RadarChart data={deptChartData.slice(0, 6)}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="name" />
                                        <PolarRadiusAxis />
                                        <Radar name="Employees" dataKey="employees" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
                                        <Radar name="Overtime" dataKey="overtime" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                                        <Legend />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Employees Tab */}
                    {activeTab === "employees" && (
                        <div className="space-y-6">
                            {/* Top Earners */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
                                <div className="border-b border-slate-200/80">
                                    <SectionHeader icon={Award} title="Top Earners" />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rank</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Pay</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Net Pay</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">OT Hours</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {analytics.topEarners.map((emp, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                                                            idx === 1 ? 'bg-slate-100 text-slate-800' :
                                                                idx === 2 ? 'bg-orange-100 text-orange-800' :
                                                                    'bg-blue-100 text-blue-800'
                                                            }`}>
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{emp.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-semibold">₱{emp.grossPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-900">₱{emp.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{emp.overtimeHours.toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Top Overtime Workers */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
                                <div className="border-b border-slate-200/80">
                                    <SectionHeader icon={Clock} title="Most Overtime Hours" tint="green" />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rank</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">OT Hours</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Pay</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {analytics.topOvertime.map((emp, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold bg-green-100 text-green-800">
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{emp.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-semibold">{emp.overtimeHours.toFixed(1)} hrs</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-900">₱{emp.grossPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Most Lates */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
                                <div className="border-b border-slate-200/80">
                                    <SectionHeader icon={AlertTriangle} title="Most Late Occurrences" tint="amber" />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rank</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Late Count</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Late Hours</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Deduction</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {analytics.topLates.map((emp, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold bg-orange-100 text-orange-800">
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{emp.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-semibold">{emp.lateCount}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-900">{emp.lateHours.toFixed(1)} hrs</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-red-600 font-semibold">₱{emp.lateDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </motion.div>
    );
}


