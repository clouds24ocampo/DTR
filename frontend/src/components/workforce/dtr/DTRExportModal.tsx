import { Calendar, Users, User, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDTRStore } from "../../../stores/global/dtr/dtr.store";
import { InfoIcon } from "../../common/InfoIcon";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ModalHeader } from "../../global/modals/ModalHeader";
import { ModalFooter } from "../../global/modals/ModalFooter";
import { RadioGroup } from "../../common/Radio";
import { modalVariants } from "../../../utils/global/motionVariants";


interface DTRExportModalProps {
  open: boolean;
  onClose: () => void;
  selectedEmployee: string;
  selectedEmp: any;
  employees: any[];
}

export default function DTRExportModal({
  open,
  onClose,
  selectedEmployee,
  selectedEmp,
  employees,
}: DTRExportModalProps) {
  const { loadDTRsByUserAndDate, loadDateDTRs, loading } = useDTRStore();
  const [exportLoading, setExportLoading] = useState(false);
  const [exportType, setExportType] = useState<"single" | "all">("single");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
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
      // Generate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates: string[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        dates.push(`${year}-${month}-${day}`);
      }

      // Helper function to convert HH:mm to total minutes
      const timeToMinutes = (timeStr: string): number => {
        if (!timeStr || timeStr === "N/A" || timeStr === "--") return 0;
        const parts = timeStr.split(":");
        if (parts.length !== 2) return 0;
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        return hours * 60 + minutes;
      };

      // Helper function to add time strings (HH:mm format)
      const addTimes = (time1: string, time2: string): string => {
        const totalMins = timeToMinutes(time1) + timeToMinutes(time2);
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
      };

      // Helper function to convert HH:mm to decimal hours
      const timeToDecimalHours = (timeStr: string): number => {
        const minutes = timeToMinutes(timeStr);
        return Math.round((minutes / 60) * 100) / 100; // Round to 2 decimal places
      };

      const formatTo12Hour = (timeStr: string): string => {
        if (!timeStr || ["N/A", "Not started", "In progress", "--"].includes(timeStr)) return timeStr;
        const parts = timeStr.split(":");
        if (parts.length < 2) return timeStr;
        let hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12;
        const mins = String(minutes).padStart(2, "0");
        return `${hours}:${mins} ${ampm}`;
      };

      const formatDuration = (val: string | number): string => {
        if (typeof val === "string" && ["N/A", "Not started", "In progress", "--"].includes(val)) return val;

        let totalMins = 0;
        if (typeof val === "string" && val.includes(":")) {
          totalMins = timeToMinutes(val);
        } else {
          const dec = typeof val === "string" ? parseFloat(val) : val;
          totalMins = Math.round((dec || 0) * 60);
        }

        if (totalMins <= 0) return "none";

        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;

        if (hours === 0) return `${mins} minutes`;
        if (mins === 0) return `${hours} hours`;
        return `${hours} hours and ${mins} minutes`;
      };

      const getDTRRowData = (dtr: any, date: string, emp: any) => {
        const employeeName = emp
          ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
          : "Unknown";
        const position = Array.isArray(emp?.position) ? emp.position[0] ?? "N/A" : emp?.position || "N/A";

        if (dtr) {
          // Get scheduled times
          const scheduledStart = dtr.sessions?.[0]?.scheduledStartTime || "N/A";
          const scheduledEnd = dtr.sessions?.[dtr.sessions.length - 1]?.scheduledEndTime || "N/A";

          // Get actual times from entries
          const allEntries = dtr.sessions
            ?.flatMap((s: any) => s.fullDTR || [])
            .sort((a: any, b: any) => (a.startTime || "").localeCompare(b.startTime || "")) || [];

          const actualStart = allEntries[0]?.startTime || "Not started";
          const lastWorkDone = [...allEntries]
            .filter((e: any) => (e.type || "").toLowerCase() === "work" && e.status === "done")
            .pop();
          const actualEnd = lastWorkDone?.endTime || "In progress";

          // Calculate totals by summing all sessions
          let totalWorkTime = "00:00";
          let totalBreakTime = "00:00";
          let totalMealTime = "00:00";
          let totalWorkCredits = "0";

          if (dtr.sessions && dtr.sessions.length > 0) {
            dtr.sessions.forEach((s: any) => {
              if (s.DTRTotalWork) totalWorkTime = addTimes(totalWorkTime, s.DTRTotalWork);
              if (s.DTRTotalBreak) totalBreakTime = addTimes(totalBreakTime, s.DTRTotalBreak);
              if (s.DTRTotalMeal) totalMealTime = addTimes(totalMealTime, s.DTRTotalMeal);
              // Sum work credits (they're strings, need to parse)
              const credits = parseFloat(s.workCredits || "0") || 0;
              totalWorkCredits = String((parseFloat(totalWorkCredits) || 0) + credits);
            });
          }

          // Calculate total worked hours (convert work time to decimal hours)
          const totalWorkedHours = timeToDecimalHours(totalWorkTime);

          // Determine status: Present if work was done, Absent if no work
          const hasWorkDone = totalWorkTime !== "00:00" && actualStart !== "Not started";
          const status = hasWorkDone ? "Present" : "Absent";

          return [
            date,
            employeeName,
            position,
            formatTo12Hour(scheduledStart),
            formatTo12Hour(scheduledEnd),
            formatTo12Hour(actualStart),
            formatTo12Hour(actualEnd),
            formatDuration(totalWorkTime),
            formatDuration(totalBreakTime),
            formatDuration(totalMealTime),
            formatDuration(totalWorkedHours),
            formatDuration(totalWorkCredits),
            status,
          ];
        } else {
          return [
            date,
            employeeName,
            position,
            "N/A",
            "N/A",
            "Not started",
            "N/A",
            "none",
            "none",
            "none",
            "none",
            "none",
            "Absent",
          ];
        }
      };

      // Create Workbook
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("DTR Records");

      // Define Columns
      sheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Employee Name", key: "employeeName", width: 25 },
        { header: "Position", key: "position", width: 20 },
        { header: "Scheduled Start", key: "scheduledStart", width: 15 },
        { header: "Scheduled End", key: "scheduledEnd", width: 15 },
        { header: "Actual Start", key: "actualStart", width: 15 },
        { header: "Actual End", key: "actualEnd", width: 15 },
        { header: "Work Time", key: "workTime", width: 25 },
        { header: "Break Time", key: "breakTime", width: 25 },
        { header: "Meal Time", key: "mealTime", width: 25 },
        { header: "Total Worked Hours", key: "totalWorkedHours", width: 25 },
        { header: "Total Work Credits", key: "totalWorkCredits", width: 25 },
        { header: "Status", key: "status", width: 12 },
      ];

      // Style header row
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      if (exportType === "single") {
        const dtrDataMap = new Map<string, any>();
        for (const date of dates) {
          try {
            const result = await loadDTRsByUserAndDate({
              userId: selectedEmployee,
              date: date,
            });
            if (result && result.length > 0) {
              dtrDataMap.set(date, result[0]);
            }
          } catch (error) {
            console.error(`Error fetching DTR for ${date}:`, error);
          }
        }

        dates.forEach((date) => {
          const dtr = dtrDataMap.get(date);
          sheet.addRow(getDTRRowData(dtr, date, selectedEmp));
        });
      } else {
        for (const date of dates) {
          try {
            const dayDTRs = await loadDateDTRs(date);
            const dtrMap = new Map<string, any>();
            if (dayDTRs) {
              dayDTRs.forEach((d: any) => {
                let uId = "";
                if (d.userId && typeof d.userId === "object" && "_id" in d.userId) {
                  uId = String(d.userId._id);
                } else {
                  uId = String(d.userId || "");
                }

                if (uId) {
                  dtrMap.set(uId.toString(), d);
                }
              });
            }

            employees.forEach((emp) => {
              const empId = String(emp._id || "");
              if (empId) {
                const dtr = dtrMap.get(empId);
                sheet.addRow(getDTRRowData(dtr, date, emp));
              }
            });
          } catch (error) {
            console.error(`Error fetching batch DTR for ${date}:`, error);
          }
        }
      }

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
          ? `DTR_${selectedEmp?.firstName || "Employee"}_${selectedEmp?.lastName || ""}_${startDate}_to_${endDate}.xlsx`
          : `DTR_ALL_EMPLOYEES_${startDate}_to_${endDate}.xlsx`;

      saveAs(blob, fileNameStr);

      onClose();
    } catch (error) {
      console.error("Error exporting DTR:", error);
      alert("Failed to export DTR data. Please try again.");
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
            title="Export DTR Records"
            subtitle="Select export options and date range"
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
                    description: "Export records for the selected employee only",
                    icon: <User className="w-5 h-5" />,
                  },
                  {
                    value: "all",
                    label: "All Employees",
                    description: "Export records for all active employees",
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
                  Date Range
                </label>
                <InfoIcon
                  description="Choose the start and end dates for the report. All days including absences will be included."
                  title="Date Range"
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
                    max={new Date().toISOString().split("T")[0]}
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
