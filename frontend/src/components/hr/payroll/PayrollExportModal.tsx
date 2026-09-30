import { Calendar, Users, User, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePayrollStore } from "../../../stores/hr/payroll/payroll.store";
import { InfoIcon } from "../../common/InfoIcon";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ModalHeader } from "../../global/modals/ModalHeader";
import { ModalFooter } from "../../global/modals/ModalFooter";
import { RadioGroup } from "../../common/Radio";
import { modalVariants } from "../../../utils/global/motionVariants";
import { getPayrolls } from "../../../api/hr/payroll/payroll.api";

interface PayrollExportModalProps {
  open: boolean;
  onClose: () => void;
  selectedEmployee: string;
  selectedEmp: any;
  employees: any[];
}

export default function PayrollExportModal({
  open,
  onClose,
  selectedEmployee,
  selectedEmp,
  employees,
}: PayrollExportModalProps) {
  const { loading } = usePayrollStore();
  const [exportLoading, setExportLoading] = useState(false);
  const [exportType, setExportType] = useState<"single" | "all">("single");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // Start of current month
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date(); // Today
    return date.toISOString().split("T")[0];
  });

  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date must be before end date");
      return;
    }

    if (exportType === "single" && !selectedEmployee) {
      alert("Please select an employee first");
      return;
    }

    setExportLoading(true);
    try {
      // Fetch Payrolls
      // We use the API directly to avoid messing with the store state which drives the UI
      let payrolls = [];
      if (exportType === "single") {
        payrolls = await getPayrolls({ employeeId: selectedEmployee, startDate, endDate });
      } else {
        payrolls = await getPayrolls({ startDate, endDate });
      }

      // Create Workbook
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Payroll Records");

      // Define Columns
      sheet.columns = [
        { header: "Period Start", key: "periodStart", width: 15 },
        { header: "Period End", key: "periodEnd", width: 15 },
        { header: "Employee Name", key: "employeeName", width: 25 },
        { header: "Position", key: "position", width: 20 },
        { header: "Regular Hours", key: "regularHours", width: 15 },
        { header: "Untagged Excess Hours", key: "untaggedExcessHours", width: 20 },
        { header: "Hourly Rate", key: "hourlyRate", width: 15, style: { numFmt: '"₱"#,##0.00' } },
        { header: "Overtime Hours", key: "overtimeHours", width: 15 },
        { header: "Late Count", key: "lateCount", width: 12 },
        { header: "Late Deduction", key: "lateDeduction", width: 15, style: { numFmt: '"₱"#,##0.00' } },
        { header: "Gross Pay", key: "grossPay", width: 15, style: { numFmt: '"₱"#,##0.00' } },
        { header: "Net Pay", key: "netPay", width: 15, style: { numFmt: '"₱"#,##0.00' } },
        { header: "Status", key: "status", width: 12 },
      ];

      // Style header row
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Process Data
      payrolls.forEach((p: any) => {
        const emp = p.employee;
        const employeeName = emp
          ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
          : "Unknown";
        const position = "N/A"; // API populate might not return position, assuming simplified user obj
        
        // If we have the full list of employees passed as props, we can lookup position
        const foundEmp = employees.find(e => e._id === (emp._id || emp));
        const finalPosition = foundEmp?.position || position;

        sheet.addRow([
          new Date(p.periodStart).toLocaleDateString(),
          new Date(p.periodEnd).toLocaleDateString(),
          employeeName,
          finalPosition,
          p.regularHours.toFixed(2),
          p.hourlyRate.toFixed(2),
          p.overtimeHours.toFixed(2),
          p.lateCount,
          p.lateDeductionAmount.toFixed(2),
          p.grossPay.toFixed(2),
          p.netPay.toFixed(2),
          p.status
        ]);
      });

      // Apply Protection if password is set
      if (password) {
        await sheet.protect(password, {
          selectLockedCells: true,
          selectUnlockedCells: true,
          formatCells: false,
          formatColumns: false,
          formatRows: false,
          insertColumns: false,
          insertRows: false,
          insertHyperlinks: false,
          deleteColumns: false,
          deleteRows: false,
          sort: false,
          autoFilter: false,
          pivotTables: false,
        });

        // Also protect workbook structure
        workbook.views = [{
          x: 0, y: 0, width: 10000, height: 10000,
          firstSheet: 0, activeTab: 1, visibility: 'visible'
        }];
      }

      // Generate and download Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const fileNameStr =
        exportType === "single"
          ? `Payroll_${selectedEmp?.firstName || "Employee"}_${startDate}_to_${endDate}.xlsx`
          : `Payroll_ALL_${startDate}_to_${endDate}.xlsx`;

      saveAs(blob, fileNameStr);

      onClose();
    } catch (error) {
      console.error("Error exporting Payroll:", error);
      alert("Failed to export Payroll data. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm !mt-0">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white rounded-lg shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <ModalHeader
            title="Export Payroll Records"
            subtitle="Select export options and period"
            onClose={onClose}
          />

          <div className="p-6 overflow-y-auto space-y-8 flex-1">
            {/* Export Type Selection */}
            <section className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Export Scope
              </label>
              <RadioGroup
                name="exportType"
                selectedValue={exportType}
                onChange={(val) => setExportType(val as "single" | "all")}
                options={[
                  {
                    value: "single",
                    label: "Current Employee",
                    description: "Export payroll for the selected employee only",
                    icon: <User className="w-5 h-5" />,
                  },
                  {
                    value: "all",
                    label: "All Employees",
                    description: "Export payroll for all employees",
                    icon: <Users className="w-5 h-5" />,
                  },
                ]}
              />
            </section>

            {/* Date Range Selection */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Period Range
                </label>
                <InfoIcon
                  description="Choose the period start and end dates. Payrolls falling within this range will be exported."
                  title="Period Range"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  />
                </div>
              </div>
            </section>

            {/* Security Settings */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Security (Optional)
                </label>
                <InfoIcon
                  description="Set a password to lock the Excel file for editing. Viewing will still be possible."
                  title="Excel Protection"
                />
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password to lock editing"
                  className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </section>
          </div>

          <ModalFooter
            primaryButtonText={exportLoading ? "Preparing Export..." : "Generate Export"}
            primaryButtonLoadingText="Exporting..."
            onPrimaryClick={handleExport}
            onCancelClick={onClose}
            loading={exportLoading || loading}
            showCancel={true}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
