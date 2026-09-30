import { Calendar, Download } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ModalHeader } from "../modals/ModalHeader";
import { ModalFooter } from "../modals/ModalFooter";
import { modalVariants } from "../../../utils/global/motionVariants";
import { getMyProgressReportsApi } from "../../../api/global/progress/progress.api";
import { useUserStore } from "../../../stores/workforce/user/user.store";

interface ProgressExportModalProps {
    open: boolean;
    onClose: () => void;
}

export default function ProgressExportModal({ open, onClose }: ProgressExportModalProps) {
    const { user } = useUserStore();
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [exportLoading, setExportLoading] = useState(false);

    const stripHtml = (html: string) => {
        if (!html) return "";
        const htmlWithSpaces = html.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, ' $&');
        const doc = new DOMParser().parseFromString(htmlWithSpaces, 'text/html');
        return doc.body.textContent || "";
    };

    const handleExport = async () => {
        if (!startDate || !endDate) {
            alert("Please select both start and end dates");
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert("Start date must be before end date");
            return;
        }

        setExportLoading(true);
        try {
            // Fetch Progress Reports for the date range
            const reports = await getMyProgressReportsApi({
                startDate,
                endDate,
            });

            if (reports.length === 0) {
                alert("No progress reports found for the selected date range.");
                setExportLoading(false);
                return;
            }

            // Create Workbook
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet("Daily Progress Reports");

            // Define Columns
            sheet.columns = [
                { header: "Date", key: "date", width: 15 },
                { header: "Period", key: "period", width: 12 },
                { header: "Status", key: "status", width: 12 },
                { header: "Accomplishments", key: "accomplishments", width: 40 },
                { header: "Challenges", key: "challenges", width: 40 },
                { header: "Plan for Next", key: "planForNext", width: 40 },
                { header: "Tasks", key: "tasks", width: 60 },
                { header: "Submitted At", key: "submittedAt", width: 20 },
            ];

            // Style Header Row
            const headerRow = sheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
            headerRow.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF2563EB" }, // blue-600
            };
            headerRow.alignment = { vertical: "middle", horizontal: "center" };

            // Add Data
            reports.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach((report) => {
                const tasksString = report.tasks
                    .map((t) => `• [${t.status.toUpperCase()}] (${t.priority.toUpperCase()}) ${t.description}`)
                    .join("\n");

                const row = sheet.addRow({
                    date: report.date,
                    period: report.period.charAt(0).toUpperCase() + report.period.slice(1),
                    status: report.status.toUpperCase(),
                    accomplishments: stripHtml(report.accomplishments),
                    challenges: stripHtml(report.challenges || ""),
                    planForNext: stripHtml(report.planForNext || ""),
                    tasks: tasksString,
                    submittedAt: report.submittedAt ? new Date(report.submittedAt).toLocaleString() : "N/A",
                });

                // Style rows
                row.alignment = { vertical: "top", wrapText: true };
            });

            // Auto-filter and freeze header
            sheet.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: 1, column: 8 },
            };
            sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

            // Generate and download Excel file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const fileNameStr = `DailyProgress_${user?.lastName || "Report"}_${startDate}_to_${endDate}.xlsx`;
            saveAs(blob, fileNameStr);

            onClose();
        } catch (error) {
            console.error("Error exporting Progress Reports:", error);
            alert("Failed to export progress reports. Please try again.");
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
                    >
                        <ModalHeader
                            title="Export Progress Reports"
                            subtitle="Select a date range to export your reports to Excel."
                            onClose={onClose}
                        />

                        <div className="p-6 space-y-6">
                            <section className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Date Range Selection
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black uppercase text-slate-500 ml-1">From</span>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            max={new Date().toISOString().split("T")[0]}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black uppercase text-slate-500 ml-1">To</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            min={startDate}
                                            max={new Date().toISOString().split("T")[0]}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                                        />
                                    </div>
                                </div>
                            </section>

                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                    <Download className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-blue-900">Excel Export</h4>
                                    <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                                        The exported file will include detailed task descriptions, accomplishments, and status for the selected period.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <ModalFooter
                            onCancelClick={onClose}
                            onPrimaryClick={handleExport}
                            primaryButtonText={exportLoading ? "Exporting..." : "Download Excel"}
                            loading={exportLoading}
                            disabled={!startDate || !endDate}
                            showCancel={true}
                        />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
