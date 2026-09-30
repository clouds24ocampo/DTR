/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import { useDepartmentStore } from "../../../stores/workforce/department/department.store";
import { usePayrollStore } from "../../../stores/hr/payroll/payroll.store";
import { useDTRStore } from "../../../stores/global/dtr/dtr.store"; // Added
import { calculatePayroll as calculatePayrollApi, updatePayroll as updatePayrollApi } from "../../../api/hr/payroll/payroll.api"; // Added
import { calculateLateDeduction, calculateRegularHours } from "../../../utils/hr/payroll/payrollCalculator"; // Added
import { runTests } from "../../../utils/hr/payroll/testPayrollCalculator"; // Added
import { motion } from "framer-motion";
import { containerVariants } from "../../../utils/global/pageMotion";
import { DepartmentDoc } from "../../../types/workforce/department/department.type";
import { DepartmentLite } from "../../../components/workforce/dtr/EmployeesPanel";
import moment from "moment";
import { Download, Plus, RefreshCw, BarChart3, Wallet } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";

// Redesigned Components
import PayrollMetrics from "../../../components/hr/payroll/redesign/PayrollMetrics";
import PayrollFilters from "../../../components/hr/payroll/redesign/PayrollFilters";
import PayrollTable from "../../../components/hr/payroll/redesign/PayrollTable";
import PayrollPreview from "../../../components/hr/payroll/redesign/PayrollPreview";
import PayrollExportModal from "../../../components/hr/payroll/PayrollExportModal";
import RunPayrollModal from "../../../components/hr/payroll/RunPayrollModal";
import { Payroll } from "../../../types/hr/payroll/payroll.type";
import toast from "react-hot-toast";

type PeriodType = "this_month" | "last_month" | "1st_half" | "2nd_half" | "custom";

export default function PayrollManagement() {
    // Navigation
    const navigate = useNavigate();

    // Stores
    const { user, otherUsers, fetchOtherUsers } = useUserStore();
    const { fetchAllDepartments, departments } = useDepartmentStore();
    const { payrolls, fetchPayrolls, deletePayroll, loading } = usePayrollStore();
    const { loadUserDTRs } = useDTRStore();

    // Run tests for payroll calculator
    useEffect(() => {
        runTests();
    }, []);

    // State
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [periodType, setPeriodType] = useState<PeriodType>("this_month");
    const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment().endOf('month').format('YYYY-MM-DD'));

    // UI State
    const [previewPayroll, setPreviewPayroll] = useState<Payroll | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showRunModal, setShowRunModal] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

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
            case "1st_half":
                newStart = now.startOf('month').format('YYYY-MM-DD');
                newEnd = now.date(15).format('YYYY-MM-DD');
                break;
            case "2nd_half":
                newStart = now.date(16).format('YYYY-MM-DD');
                newEnd = now.endOf('month').format('YYYY-MM-DD');
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

    const allEmployees = useMemo(() => {
        const list = [...(otherUsers ?? [])].filter((u) => !u.archived);
        if (user && !list.some((u) => u._id === user._id)) list.unshift(user);
        return list;
    }, [user, otherUsers]);

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

    // Filtering
    const filteredPayrolls = useMemo(() => {
        return payrolls.filter(p => {
            const emp: any = p.employee;
            const empName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            const matchesSearch = empName.includes(searchTerm.toLowerCase());

            // For department, we need to find the employee's department
            // If p.employee is populated, it might not have department. We use allEmployees lookup or the map directly
            const empId = typeof p.employee === 'string' ? p.employee : p.employee._id;
            const empDeptId = userDeptMap.get(empId);
            const matchesDept = !selectedDepartment || empDeptId === selectedDepartment;

            const matchesStatus = !selectedStatus || p.status === selectedStatus;

            return matchesSearch && matchesDept && matchesStatus;
        });
    }, [payrolls, searchTerm, selectedDepartment, selectedStatus, userDeptMap]);

    // Actions
    const handleRunPayroll = () => {
        setShowRunModal(true);
    };

    const executePayrollRun = async (runStartDate: string, runEndDate: string) => {
        setIsCalculating(true);
        const toastId = toast.loading("Processing payrolls...");

        try {
            // Process in chunks or one by one
            let successCount = 0;
            for (const emp of allEmployees) {
                try {
                    // 1. Initial Calculation (Backend)
                    // We use the API directly to get the result object
                    const payroll = await calculatePayrollApi({ userId: emp._id, startDate: runStartDate, endDate: runEndDate });

                    // 2. Fetch DTRs for Recalculation (Frontend Fix)
                    const dtrs = await loadUserDTRs(emp._id);
                    const periodDTRs = dtrs?.filter(d => d.date >= runStartDate && d.date <= runEndDate) || [];

                    // 3. Calculate Regular Hours & Deductions
                    const { regularHours, excessHours } = calculateRegularHours(periodDTRs);
                    const { deductionAmount, occurrences, totalLateHours, breakdown } = calculateLateDeduction(periodDTRs, payroll.hourlyRate || 0);

                    // 4. Recalculate Finances
                    const hourlyRate = payroll.hourlyRate || 0;
                    const newGrossPay = regularHours * hourlyRate;

                    // Net Pay calculation:
                    // originalNet = originalGross - originalLate - otherDeductions + allowances
                    // We want to preserve 'otherDeductions' and 'allowances' from the backend calculation
                    const originalGross = payroll.grossPay || 0;
                    const originalNet = payroll.netPay || 0;
                    const originalLate = payroll.lateDeductionAmount || 0;
                    const staticAdjustments = originalGross - originalLate - originalNet;

                    const newNetPay = newGrossPay - deductionAmount - staticAdjustments;

                    // Convert breakdown to LateDetail format (remove amount field)
                    const lateDetails = breakdown.map(item => ({
                        date: item.date,
                        session: item.session,
                        lateMinutes: item.lateMinutes,
                        deductionHours: item.deductionHours,
                        actualTime: item.actualTime,
                        scheduledTime: item.scheduledTime
                    }));

                    // 5. Update if different (threshold 0.01 for currency/hours)
                    const hasHoursChanged = Math.abs((payroll.regularHours || 0) - regularHours) > 0.01;
                    const hasLateChanged = Math.abs((payroll.lateDeductionAmount || 0) - deductionAmount) > 0.01 ||
                        (payroll.lateCount || 0) !== occurrences;

                    if (hasHoursChanged || hasLateChanged) {
                        console.log(`[Payroll Fix] ${emp.firstName}: Hours ${payroll.regularHours} -> ${regularHours}, Net ${payroll.netPay} -> ${newNetPay}`);
                        await updatePayrollApi(payroll._id, {
                            regularHours: regularHours,
                            untaggedExcessHours: excessHours,
                            grossPay: newGrossPay,
                            netPay: newNetPay,
                            lateDeductionAmount: deductionAmount,
                            lateCount: occurrences,
                            lateHours: totalLateHours,
                            lateDetails: lateDetails
                        });
                    }

                    successCount++;
                } catch (err) {
                    console.error(`Failed for ${emp.firstName}`, err);
                }
            }
            toast.success(`Processed ${successCount}/${allEmployees.length} payrolls`, { id: toastId });
            await fetchPayrolls(undefined, runStartDate, runEndDate);

            // If the run period matches current filter, refresh view
            if (runStartDate === startDate && runEndDate === endDate) {
                // already fetched above
            } else {
                // Maybe switch view to that period? Or just let user decide.
                // For now, let's update the filter to show the results
                setStartDate(runStartDate);
                setEndDate(runEndDate);
                setPeriodType("custom");
            }

        } catch {
            toast.error("Bulk calculation failed", { id: toastId });
        } finally {
            setIsCalculating(false);
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full min-h-screen p-4 sm:p-6 lg:p-8 space-y-6"
        >
            {/* Header */}
            <PageHeader
                icon={Wallet}
                tint="blue"
                eyebrow="Compensation"
                title="Payroll Management"
                subtitle="Overview of employee compensation, payments, and approvals."
                actions={
                    <>
                        <button
                            onClick={() => navigate('/hr/payroll-analytics')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                        >
                            <BarChart3 className="w-4 h-4" />
                            Analytics
                        </button>
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <button
                            onClick={handleRunPayroll}
                            disabled={isCalculating || loading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {isCalculating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Run Payroll
                        </button>
                    </>
                }
            />

            {/* Metrics */}
            <PayrollMetrics payrolls={filteredPayrolls} />

            {/* Filters */}
            <PayrollFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedDepartment={selectedDepartment}
                onDepartmentChange={setSelectedDepartment}
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
                departments={safeDepartments}
                periodType={periodType}
                onPeriodTypeChange={(val) => setPeriodType(val as PeriodType)}
                startDate={startDate}
                onStartDateChange={setStartDate}
                endDate={endDate}
                onEndDateChange={setEndDate}
            />

            {/* Table */}
            <PayrollTable
                payrolls={filteredPayrolls}
                loading={loading && !isCalculating}
                departments={safeDepartments}
                onView={setPreviewPayroll}
                onEdit={setPreviewPayroll}
                onDelete={deletePayroll}
            />

            {/* Sidebar Preview */}
            <PayrollPreview
                payroll={previewPayroll}
                onClose={() => setPreviewPayroll(null)}
            />

            {/* Export Modal */}
            <PayrollExportModal
                open={showExportModal}
                onClose={() => setShowExportModal(false)}
                selectedEmployee={""} // Not needed for bulk
                selectedEmp={null}
                employees={allEmployees}
            />

            {/* Run Payroll Modal */}
            <RunPayrollModal
                open={showRunModal}
                onClose={() => setShowRunModal(false)}
                onRun={executePayrollRun}
                employeeCount={allEmployees.length}
                initialStartDate={startDate}
                initialEndDate={endDate}
            />
        </motion.div>
    );
}
