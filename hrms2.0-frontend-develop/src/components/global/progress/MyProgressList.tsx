import {
    Clock,
    Search,
    Filter,
    Target,
    Calendar,
    Sunrise,
    Sunset,
    Eye,
    Edit,
    Trash2,
    ShieldCheck,
    ListChecks,
    X,
    CheckCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import type { IProgressReportDoc } from "../../../api/global/progress/progress.api";
import type { ProgressPeriod, ProgressStatus } from "../../../types/global/progress/progress.types";

export type GroupedMyReport = {
    date: string;
    morning?: IProgressReportDoc;
    afternoon?: IProgressReportDoc;
};

const stripHtml = (html: string) => {
    if (!html) return "";
    // Replace block tags with spaces to ensure separation
    const htmlWithSpaces = html.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, ' $&');
    const doc = new DOMParser().parseFromString(htmlWithSpaces, 'text/html');
    return doc.body.textContent || "";
};

const StatusBadge = ({ status }: { status: ProgressStatus }) => {
    const configs: Record<ProgressStatus, { bg: string; text: string; border: string; label: string }> = {
        draft: {
            bg: "bg-slate-100",
            text: "text-slate-700",
            border: "border-slate-200",
            label: "Draft",
        },
        submitted: {
            bg: "bg-amber-50",
            text: "text-amber-700",
            border: "border-amber-200",
            label: "Submitted",
        },
        reviewed: {
            bg: "bg-emerald-50",
            text: "text-emerald-700",
            border: "border-emerald-200",
            label: "Reviewed",
        },
        archived: {
            bg: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
            label: "Archived",
        },
    };

    const config = configs[status] || configs.draft;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}
        >
            {config.label}
        </span>
    );
};

const PeriodBadge = ({ period }: { period: ProgressPeriod }) => {
    const isMorning = period === "morning";
    const Icon = isMorning ? Sunrise : Sunset;
    const color = isMorning ? "text-amber-600" : "text-indigo-600";
    const bg = isMorning ? "bg-amber-50" : "bg-indigo-50";
    const border = isMorning ? "border-amber-200" : "border-indigo-200";

    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${bg} ${color} border ${border}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider">
                {period === "morning" ? "First Session" : "Second Session"}
            </span>
        </div>
    );
};

type Props = {
    reports: IProgressReportDoc[];
    loading: boolean;
    onView?: (group: GroupedMyReport) => void;
    onEdit?: (report: IProgressReportDoc) => void;
    onDelete?: (reportId: string) => void;
};

export default function MyProgressList({
    reports,
    onView,
    onEdit,
    onDelete,
}: Props) {
    const { user } = useUserStore();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<ProgressStatus | "all">("all");
    const [periodFilter, setPeriodFilter] = useState<ProgressPeriod | "all">("all");
    const [deleteSelection, setDeleteSelection] = useState<GroupedMyReport | null>(null);
    const [editSelection, setEditSelection] = useState<GroupedMyReport | null>(null);

    const filteredReports = useMemo(() => {
        return reports.filter((report) => {
            const matchesSearch =
                stripHtml(report.accomplishments).toLowerCase().includes(searchTerm.toLowerCase()) ||
                stripHtml(report.challenges || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                stripHtml(report.planForNext || "").toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "all" || report.status === statusFilter;
            const matchesPeriod = periodFilter === "all" || report.period === periodFilter;

            return matchesSearch && matchesStatus && matchesPeriod;
        });
    }, [reports, searchTerm, statusFilter, periodFilter]);

    const groupedReports = useMemo(() => {
        const map = new Map<string, GroupedMyReport>();
        filteredReports.forEach((r) => {
            const d = new Date(r.date);
            const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const existing = map.get(dayKey) || {
                date: r.date,
            };
            if (r.period === "morning") {
                existing.morning = r;
            } else {
                existing.afternoon = r;
            }
            existing.date = r.date;
            map.set(dayKey, existing);
        });
        return Array.from(map.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [filteredReports]);

    const handleDeleteClick = (group: GroupedMyReport) => {
        if (group.morning && group.afternoon) {
            setDeleteSelection(group);
        } else if (group.morning) {
            onDelete?.(group.morning._id || (group.morning as any).id);
        } else if (group.afternoon) {
            onDelete?.(group.afternoon._id || (group.afternoon as any).id);
        }
    };

    return (
        <div className="bg-white">
            {/* Header Filters */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="relative group flex-1 max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by accomplishments, challenges, or plans..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 outline-none shadow-sm text-sm font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 w-full lg:w-auto">
                        <div className="grid grid-cols-2 w-full lg:w-auto lg:flex items-center gap-2">
                            <div className="relative w-full lg:w-auto">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer appearance-none shadow-sm transition-all"
                                >
                                    <option value="all">All Status</option>
                                    <option value="draft">Draft</option>
                                    <option value="submitted">Submitted</option>
                                    <option value="reviewed">Reviewed</option>
                                    <option value="archived">Archived</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-slate-400 rotate-45" />
                                </div>
                            </div>

                            <div className="relative w-full lg:w-auto">
                                <select
                                    value={periodFilter}
                                    onChange={(e) => setPeriodFilter(e.target.value as any)}
                                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer appearance-none shadow-sm transition-all"
                                >
                                    <option value="all">All Periods</option>
                                    <option value="morning">First Session</option>
                                    <option value="afternoon">Second Session</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-slate-400 rotate-45" />
                                </div>
                            </div>
                        </div>


                        <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-black uppercase tracking-wider shadow-sm border border-blue-100">
                            {filteredReports.length} Reports
                        </div>
                    </div>
                </div>
            </div>

            {/* Reports List/Table */}
            <div className="overflow-hidden">
                {/* Desktop Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Date & Period
                    </div>
                    <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Target className="w-3 h-3" /> Accomplishments
                    </div>
                    <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ListChecks className="w-3 h-3" /> Tasks
                    </div>
                    <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Status
                    </div>
                    <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Submitted
                    </div>
                    <div className="col-span-1 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">
                        Actions
                    </div>
                </div>

                <div className="divide-y divide-slate-100 min-h-[400px]">
                    <AnimatePresence mode="popLayout">
                        {groupedReports.length > 0 ? (
                            groupedReports.map((group, idx) => {
                                const completedTasks =
                                    (group.morning?.tasks.filter((t) => t.status === "completed").length || 0) +
                                    (group.afternoon?.tasks.filter((t) => t.status === "completed").length || 0);
                                const totalTasks =
                                    (group.morning?.tasks.length || 0) + (group.afternoon?.tasks.length || 0);
                                const completionRate =
                                    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                                return (
                                    <motion.div
                                        key={`${group.date}-${idx}`}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group"
                                    >
                                        {/* Desktop Row */}
                                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-slate-50/80 transition-all duration-200">
                                            <div className="col-span-2 space-y-2">
                                                <p className="text-sm font-black text-slate-800 tracking-tight">
                                                    {new Date(group.date).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </p>
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    {group.morning && <PeriodBadge period="morning" />}
                                                    {group.afternoon && <PeriodBadge period="afternoon" />}
                                                </div>
                                            </div>

                                            <div className="col-span-3 space-y-2">
                                                {group.morning && (
                                                    <div className="flex gap-2">
                                                        <Sunrise className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                                        <p className="text-xs font-bold text-slate-600 leading-relaxed line-clamp-2">
                                                            {stripHtml(group.morning.accomplishments)}
                                                        </p>
                                                    </div>
                                                )}
                                                {group.afternoon && (
                                                    <div className="flex gap-2">
                                                        <Sunset className="w-3 h-3 text-indigo-500 mt-0.5 shrink-0" />
                                                        <p className="text-xs font-bold text-slate-600 leading-relaxed line-clamp-2">
                                                            {stripHtml(group.afternoon.accomplishments)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="col-span-2">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        <span>{completedTasks}/{totalTasks} Tasks</span>
                                                        <span>{completionRate}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${completionRate}%` }}
                                                            className={`h-full rounded-full ${completionRate === 100 ? "bg-emerald-500" : "bg-blue-500"
                                                                }`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-span-2 space-y-2">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    {group.morning && <StatusBadge status={group.morning.status} />}
                                                    {group.afternoon && <StatusBadge status={group.afternoon.status} />}
                                                </div>
                                            </div>

                                            <div className="col-span-2 space-y-2">
                                                {group.morning && (
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {group.morning.submittedAt ? new Date(group.morning.submittedAt).toLocaleString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        }) : "Pending"}
                                                    </div>
                                                )}
                                                {group.afternoon && (
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {group.afternoon.submittedAt ? new Date(group.afternoon.submittedAt).toLocaleString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        }) : "Pending"}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="col-span-1 flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => onView?.(group)}
                                                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteClick(group)}
                                                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"
                                                    title="Delete Draft"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Mobile Card */}
                                        <div className="md:hidden p-5 space-y-4 hover:bg-slate-50/80 transition-all duration-200">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <p className="text-sm font-black text-slate-800 tracking-tight">
                                                            {user?.firstName} {user?.lastName}
                                                        </p>
                                                        <p className="text-xs font-bold text-slate-400">
                                                            {new Date(group.date).toLocaleDateString("en-US", {
                                                                month: "short",
                                                                day: "numeric",
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {group.morning && (
                                                        <StatusBadge status={group.morning.status} />
                                                    )}
                                                    {group.afternoon && (
                                                        <StatusBadge status={group.afternoon.status} />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        {group.morning && (
                                                            <PeriodBadge period="morning" />
                                                        )}
                                                        {group.afternoon && (
                                                            <PeriodBadge period="afternoon" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span className="text-xs font-black text-slate-600">
                                                            {completedTasks}/{totalTasks} Done
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                    <p className="text-xs font-bold text-slate-600 line-clamp-2 leading-relaxed">
                                                        {[stripHtml(group.morning?.accomplishments || ""), stripHtml(group.afternoon?.accomplishments || "")].filter(Boolean).join(" • ")}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                                <button
                                                    onClick={() => onView?.(group)}
                                                    className="flex-1 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> View
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(group)}
                                                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="py-32 text-center space-y-4">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-50 rounded-3xl mb-2 ring-1 ring-slate-100">
                                    <ShieldCheck className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">No reports found</h3>
                                <p className="text-xs font-bold text-slate-400 max-w-xs mx-auto italic">
                                    We couldn't find any progress reports matching your current filters.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Delete Selection Modal */}
            <AnimatePresence>
                {deleteSelection && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm !mt-0">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-lg shadow-2xl w-full max-w-sm border border-slate-100 p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-slate-800">
                                    Delete Report
                                </h3>
                                <button
                                    onClick={() => setDeleteSelection(null)}
                                    className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <p className="text-sm text-slate-500 mb-6">
                                Which report do you want to delete for {new Date(deleteSelection.date).toLocaleDateString()}?
                            </p>

                            <div className="space-y-3">
                                {deleteSelection.morning && (
                                    <button
                                        onClick={() => {
                                            onDelete?.(deleteSelection.morning?._id || (deleteSelection.morning as any)?.id);
                                            setDeleteSelection(null);
                                        }}
                                        className="w-full flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-bold hover:bg-amber-100 transition-colors group"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Sunrise className="w-4 h-4" />
                                            First Session Report
                                        </span>
                                        <Trash2 className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    </button>
                                )}

                                {deleteSelection.afternoon && (
                                    <button
                                        onClick={() => {
                                            onDelete?.(deleteSelection.afternoon?._id || (deleteSelection.afternoon as any)?.id);
                                            setDeleteSelection(null);
                                        }}
                                        className="w-full flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 font-bold hover:bg-indigo-100 transition-colors group"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Sunset className="w-4 h-4" />
                                            Second Session Report
                                        </span>
                                        <Trash2 className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Selection Modal */}
            <AnimatePresence>
                {editSelection && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm !mt-0">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-lg shadow-2xl w-full max-w-sm border border-slate-100 p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-slate-800">
                                    Edit Report
                                </h3>
                                <button
                                    onClick={() => setEditSelection(null)}
                                    className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <p className="text-sm text-slate-500 mb-6">
                                Which report do you want to edit for {new Date(editSelection.date).toLocaleDateString()}?
                            </p>

                            <div className="space-y-3">
                                {editSelection.morning && (
                                    <button
                                        onClick={() => {
                                            onEdit?.(editSelection.morning!);
                                            setEditSelection(null);
                                        }}
                                        className="w-full flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-bold hover:bg-amber-100 transition-colors group"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Sunrise className="w-4 h-4" />
                                            First Session Report
                                        </span>
                                        <Edit className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    </button>
                                )}

                                {editSelection.afternoon && (
                                    <button
                                        onClick={() => {
                                            onEdit?.(editSelection.afternoon!);
                                            setEditSelection(null);
                                        }}
                                        className="w-full flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 font-bold hover:bg-indigo-100 transition-colors group"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Sunset className="w-4 h-4" />
                                            Second Session Report
                                        </span>
                                        <Edit className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}