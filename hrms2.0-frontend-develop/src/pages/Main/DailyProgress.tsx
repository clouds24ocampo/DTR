import { Download, FileText, ImageIcon, Plus, Sunrise, Sunset, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import MyProgressList, { GroupedMyReport } from "../../components/global/progress/MyProgressList";
import ProgressReportModal from "../../components/global/progress/ProgressReportModal";
import ProgressExportModal from "../../components/global/progress/ProgressExportModal";
import { RichTextEditor } from "../../components/hr/document/RichTextEditor";
import Chatbot from "../../components/common/ChatBot";
import { useProgressReportStore } from "../../stores/global/progress/progress.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import type { IProgressReportDoc } from "../../api/global/progress/progress.api";
import type { TaskPriority, TaskStatus } from "../../types/global/progress/progress.types";

export default function DailyProgress() {
    const { user } = useUserStore();
    const {
        progressReports,
        fetchMyProgressReports,
        createProgressReportFromCookie,
        updateProgressReport,
        deleteProgressReport,
        fetchMineLoading,
        createLoading,
        updateLoading,
        deleteLoading,
        error,
    } = useProgressReportStore();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [currentReport, setCurrentReport] = useState<IProgressReportDoc | null>(null);
    const [viewGroup, setViewGroup] = useState<GroupedMyReport | null>(null);
    const [viewTab, setViewTab] = useState<"morning" | "afternoon">("morning");
    const [editMode, setEditMode] = useState(false);
    const [edited, setEdited] = useState<IProgressReportDoc | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (showViewModal && viewGroup) {
            const active = viewTab === "morning" ? viewGroup.morning : viewGroup.afternoon;
            setEdited(active ? { ...active } as IProgressReportDoc : null);
            setEditMode(false);
        }
    }, [showViewModal, viewGroup, viewTab]);

    const saveEdited = async () => {
        if (!edited) return;
        const payload: any = {
            accomplishments: edited.accomplishments,
            challenges: edited.challenges,
            planForNext: edited.planForNext,
            tasks: edited.tasks,
        };
        await handleUpdate(edited._id || (edited as any).id, payload);
        setEditMode(false);
    };

    // Fetch my progress reports on mount
    useEffect(() => {
        fetchMyProgressReports().catch((err) => {
            console.error("Failed to fetch progress reports:", err);
        });
    }, [fetchMyProgressReports]);

    // Transform reports to include id field
    const myReports = useMemo(() => {
        return progressReports.map((r) => ({
            ...r,
            id: r._id || (r as any).id || String(r._id || ""),
        }));
    }, [progressReports]);

    const handleCreate = async (payload: any) => {
        try {
            await createProgressReportFromCookie(payload);
            await fetchMyProgressReports();
            setShowCreateForm(false);
        } catch (error) {
            console.error("Failed to create progress report:", error);
            throw error;
        }
    };

    const handleUpdate = async (reportId: string, payload: any) => {
        try {
            await updateProgressReport(reportId, payload);
            await fetchMyProgressReports();
            setShowEditForm(false);
            setCurrentReport(null);
        } catch (error) {
            console.error("Failed to update progress report:", error);
            throw error;
        }
    };

    const handleEdit = (report: IProgressReportDoc) => {
        setCurrentReport(report);
        setShowEditForm(true);
    };
    setViewGroup
    const handleView = (group: GroupedMyReport) => {
        setViewGroup(group);
        // Default to morning if exists, else afternoon
        setViewTab(group.morning ? "morning" : "afternoon");
        setShowViewModal(true);
    };

    const handleDelete = (reportId: string) => {
        setReportToDelete(reportId);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!reportToDelete) return;
        try {
            await deleteProgressReport(reportToDelete);
            await fetchMyProgressReports();
            setShowDeleteModal(false);
            setReportToDelete(null);
        } catch (error) {
            console.error("Failed to delete progress report:", error);
        }
    };

    const handleSubmit = async () => {
        if (!viewGroup) return;
        const activeReport = viewTab === "morning" ? viewGroup.morning : viewGroup.afternoon;
        if (!activeReport) return;

        try {
            await updateProgressReport(activeReport._id || (activeReport as any).id, { status: "submitted" });
            await fetchMyProgressReports();
            setShowViewModal(false);
        } catch (error) {
            console.error("Failed to submit progress report:", error);
        }
    };

    const loading = fetchMineLoading;
    const displayName =
        [user?.firstName, user?.middleName, user?.lastName]
            .filter(Boolean)
            .join(" ") || "You";

    return (
        <motion.div
            className="w-full space-y-8 pb-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Area */}
            <motion.div
                className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 px-1"
                variants={itemVariants}
            >
                <div className="space-y-2">


                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-200">
                            Daily Progress Reports
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm sm:text-base">
                            Track your daily accomplishments, tasks, and productivity. Submit first session and second session reports to keep your team updated.
                        </p>
                    </div>
                    {error && (
                        <motion.div
                            className="mt-4 px-4 py-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-3 text-rose-600"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                            <p className="text-xs font-bold">Cloud Sync Warning: {error}</p>
                        </motion.div>
                    )}
                </div>

                {/* Action Buttons - Desktop */}
                <div className="hidden md:flex items-center gap-3">
                    <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                        disabled={loading}
                    >
                        <Download className="w-4 h-4 text-blue-600" strokeWidth={3} />
                        Export to Excel
                    </motion.button>

                    <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] disabled:opacity-50"
                        disabled={createLoading || loading}
                    >
                        <Plus className="w-4 h-4" strokeWidth={3} />
                        Submit New Report
                    </motion.button>
                </div>
            </motion.div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="px-1">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-center">
                            <p className="text-xs font-black text-slate-400 uppercase">Total</p>
                            <p className="text-lg font-black text-slate-800">{myReports.length}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-black text-amber-500 uppercase">Pending</p>
                            <p className="text-lg font-black text-amber-600">
                                {myReports.filter(r => r.status === 'submitted' || r.status === 'draft').length}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-black text-emerald-500 uppercase">Reviewed</p>
                            <p className="text-lg font-black text-emerald-600">
                                {myReports.filter(r => r.status === 'reviewed').length}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Main Content Area */}
            <motion.div className="space-y-4" variants={itemVariants}>
                <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-200/50">
                    {loading ? (
                        <div className="p-32 text-center">
                            <div className="inline-flex items-center justify-center p-4 bg-blue-50 rounded-lg mb-4">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                            <p className="text-slate-600 font-bold tracking-tight">
                                Loading your progress reports...
                            </p>
                        </div>
                    ) : (
                        <MyProgressList
                            reports={myReports as any}
                            loading={deleteLoading}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </motion.div>

            {/* Mobile Floating Trigger */}
            <motion.button
                whileTap={{ scale: 0.9 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                onClick={() => setShowCreateForm(true)}
                disabled={createLoading || loading}
                className="fixed bottom-8 right-8 z-50 flex md:hidden items-center justify-center w-14 h-14 rounded-lg shadow-xl bg-blue-600 text-white transition-all active:bg-blue-700"
            >
                <Plus className="w-6 h-6" strokeWidth={2.5} />
            </motion.button>

            {/* Modals */}
            <ProgressExportModal
                open={showExportModal}
                onClose={() => setShowExportModal(false)}
            />

            <ProgressReportModal
                mode="create"
                open={showCreateForm}
                onClose={() => setShowCreateForm(false)}
                loading={createLoading}
                displayName={displayName}
                onCreate={handleCreate}
            />

            {showEditForm && currentReport && (
                <ProgressReportModal
                    mode="edit"
                    open={showEditForm}
                    onClose={() => {
                        setShowEditForm(false);
                        setCurrentReport(null);
                    }}
                    loading={updateLoading}
                    displayName={displayName}
                    report={currentReport}
                    onUpdate={handleUpdate}
                />
            )}

            {/* View Modal - Grouped version */}
            <AnimatePresence>
                {showViewModal && viewGroup && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm !mt-0">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-lg shadow-2xl w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-100"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-black text-xs overflow-hidden shrink-0">
                                        {user?.profilePicture ? (
                                            <img src={user.profilePicture} alt={displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            (displayName?.[0] || "U")
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-lg font-black text-slate-800 truncate">
                                            Progress Report Details
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1 truncate">
                                            {displayName} • {new Date(viewGroup.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex bg-slate-200/50 p-1 rounded-lg">
                                        <button
                                            onClick={() => setViewTab("morning")}
                                            disabled={!viewGroup.morning}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewTab === "morning"
                                                ? "bg-white text-amber-600 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                                } disabled:opacity-50`}
                                        >
                                            <Sunrise className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">First Session</span>
                                        </button>
                                        <button
                                            onClick={() => setViewTab("afternoon")}
                                            disabled={!viewGroup.afternoon}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewTab === "afternoon"
                                                ? "bg-white text-indigo-600 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                                } disabled:opacity-50`}
                                        >
                                            <Sunset className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Second Session</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowViewModal(false)}
                                        className="p-2 hover:bg-slate-200 rounded-lg shrink-0"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex items-center justify-end mb-3 gap-3">
                                    {(() => {
                                        const activeReport = viewTab === "morning" ? viewGroup.morning : viewGroup.afternoon;
                                        if (!editMode && activeReport?.status === 'draft') {
                                            return (
                                                <button
                                                    onClick={handleSubmit}
                                                    disabled={updateLoading}
                                                    className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                                                >
                                                    Submit Draft
                                                </button>
                                            );
                                        }
                                        return null;
                                    })()}
                                    <button
                                        onClick={() => setEditMode((v) => !v)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${editMode
                                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                    >
                                        {editMode ? "Done" : "Edit"}
                                    </button>
                                </div>
                                {(() => {
                                    const activeReport = viewTab === "morning" ? viewGroup.morning : viewGroup.afternoon;

                                    if (!activeReport) return null;

                                    return (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            <div>
                                                <p className="text-xs font-black text-slate-400 uppercase mb-2">Accomplishments</p>
                                                {editMode && edited ? (
                                                    <RichTextEditor
                                                        value={edited.accomplishments || ""}
                                                        onChange={(val) =>
                                                            setEdited((prev) =>
                                                                prev
                                                                    ? { ...prev, accomplishments: val }
                                                                    : prev
                                                            )
                                                        }
                                                        autoHideToolbar={true}
                                                    />
                                                ) : (
                                                    <div
                                                        className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 text-sm leading-relaxed rich-text-display"
                                                        dangerouslySetInnerHTML={{ __html: activeReport.accomplishments || "" }}
                                                    />
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {activeReport.challenges && (
                                                    <div>
                                                        <p className="text-xs font-black text-slate-400 uppercase mb-2">Challenges</p>
                                                        {editMode && edited ? (
                                                            <RichTextEditor
                                                                value={edited.challenges || ""}
                                                                onChange={(val) =>
                                                                    setEdited((prev) =>
                                                                        prev
                                                                            ? { ...prev, challenges: val }
                                                                            : prev
                                                                    )
                                                                }
                                                                autoHideToolbar={true}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 text-slate-700 text-sm leading-relaxed rich-text-display"
                                                                dangerouslySetInnerHTML={{ __html: activeReport.challenges || "" }}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                                {activeReport.planForNext && (
                                                    <div>
                                                        <p className="text-xs font-black text-slate-400 uppercase mb-2">Plans</p>
                                                        {editMode && edited ? (
                                                            <RichTextEditor
                                                                value={edited.planForNext || ""}
                                                                onChange={(val) =>
                                                                    setEdited((prev) =>
                                                                        prev
                                                                            ? { ...prev, planForNext: val }
                                                                            : prev
                                                                    )
                                                                }
                                                                autoHideToolbar={true}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-slate-700 text-sm leading-relaxed rich-text-display"
                                                                dangerouslySetInnerHTML={{ __html: activeReport.planForNext || "" }}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-xs font-black text-slate-400 uppercase">Tasks</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500">
                                                            {(edited?.tasks || activeReport.tasks || []).length} Tasks
                                                        </div>
                                                        {editMode && edited && (
                                                            <button
                                                                onClick={() =>
                                                                    setEdited((prev) => {
                                                                        if (!prev) return prev;
                                                                        const tasks = [...(prev.tasks || [])];
                                                                        tasks.push({
                                                                            description: "",
                                                                            status: "not-started",
                                                                            priority: "medium",
                                                                            completionPercentage: 0,
                                                                        });
                                                                        return { ...prev, tasks };
                                                                    })
                                                                }
                                                                className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                                Add Task
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    {(edited?.tasks || activeReport.tasks || []).map((task, idx) => (
                                                        <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                            {editMode && edited ? (
                                                                <>
                                                                    <div className="w-full space-y-2">
                                                                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                                                            <RichTextEditor
                                                                                value={task.description || ""}
                                                                                onChange={(val) =>
                                                                                    setEdited((prev) => {
                                                                                        if (!prev) return prev;
                                                                                        const tasks = [...(prev.tasks || [])];
                                                                                        tasks[idx] = { ...tasks[idx], description: val };
                                                                                        return { ...prev, tasks };
                                                                                    })
                                                                                }
                                                                                autoHideToolbar={true}
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                            <select
                                                                                value={task.status}
                                                                                onChange={(e) =>
                                                                                    setEdited((prev) => {
                                                                                        if (!prev) return prev;
                                                                                        const tasks = [...(prev.tasks || [])];
                                                                                        tasks[idx] = { ...tasks[idx], status: e.target.value as TaskStatus };
                                                                                        return { ...prev, tasks };
                                                                                    })
                                                                                }
                                                                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                                            >
                                                                                <option value="not-started">Not Started</option>
                                                                                <option value="in-progress">In Progress</option>
                                                                                <option value="completed">Completed</option>
                                                                                <option value="blocked">Blocked</option>
                                                                            </select>
                                                                            <select
                                                                                value={task.priority}
                                                                                onChange={(e) =>
                                                                                    setEdited((prev) => {
                                                                                        if (!prev) return prev;
                                                                                        const tasks = [...(prev.tasks || [])];
                                                                                        tasks[idx] = { ...tasks[idx], priority: e.target.value as TaskPriority };
                                                                                        return { ...prev, tasks };
                                                                                    })
                                                                                }
                                                                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                                            >
                                                                                <option value="low">Low Priority</option>
                                                                                <option value="medium">Medium Priority</option>
                                                                                <option value="high">High Priority</option>
                                                                            </select>
                                                                            <div className="relative">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    value={task.completionPercentage || 0}
                                                                                    onChange={(e) =>
                                                                                        setEdited((prev) => {
                                                                                            if (!prev) return prev;
                                                                                            const tasks = [...(prev.tasks || [])];
                                                                                            tasks[idx] = {
                                                                                                ...tasks[idx],
                                                                                                completionPercentage: parseInt(e.target.value) || 0,
                                                                                            };
                                                                                            return { ...prev, tasks };
                                                                                        })
                                                                                    }
                                                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                                                />
                                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                                                                            </div>
                                                                            <button
                                                                                onClick={() =>
                                                                                    setEdited((prev) => {
                                                                                        if (!prev) return prev;
                                                                                        const tasks = [...(prev.tasks || [])];
                                                                                        tasks.splice(idx, 1);
                                                                                        return { ...prev, tasks };
                                                                                    })
                                                                                }
                                                                                className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                                                                                title="Delete Task"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="w-full">
                                                                        <div
                                                                            className="text-sm font-bold text-slate-800 mb-1 rich-text-display"
                                                                            dangerouslySetInnerHTML={{ __html: task.description || "" }}
                                                                        />
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${task.priority === "high" ? "bg-rose-100 text-rose-700" :
                                                                                task.priority === "medium" ? "bg-amber-100 text-amber-700" :
                                                                                    "bg-emerald-100 text-emerald-700"
                                                                                }`}>
                                                                                {task.priority}
                                                                            </span>
                                                                            <span className={`text-[10px] font-black uppercase ${task.status === "completed" ? "text-emerald-600" :
                                                                                task.status === "in-progress" ? "text-blue-600" :
                                                                                    "text-slate-400"
                                                                                }`}>
                                                                                {task.status.replace("-", " ")}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col items-end gap-1 shrink-0 w-full sm:w-auto">
                                                                        <span className="text-lg font-black text-slate-700">{task.completionPercentage}%</span>
                                                                        <div className="w-full sm:w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full rounded-full ${task.completionPercentage === 100 ? "bg-emerald-500" : "bg-blue-500"
                                                                                    }`}
                                                                                style={{ width: `${task.completionPercentage}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Attachments */}
                                            {activeReport.attachments && activeReport.attachments.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-black text-slate-400 uppercase mb-3">
                                                        Attachments ({activeReport.attachments.length})
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {activeReport.attachments.map((file, idx) => (
                                                            <a
                                                                key={idx}
                                                                href={file.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg group hover:border-blue-200 hover:shadow-sm transition-all"
                                                            >
                                                                <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-blue-500 transition-colors">
                                                                    {file.type.includes("image") ? (
                                                                        <ImageIcon className="w-4 h-4" />
                                                                    ) : (
                                                                        <FileText className="w-4 h-4" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-slate-700 truncate">
                                                                        {file.name}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                                                    </p>
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {editMode && edited && (
                                                <div className="pt-4 border-t border-slate-100">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button
                                                            onClick={() => {
                                                                const active = viewTab === "morning" ? viewGroup.morning : viewGroup.afternoon;
                                                                setEdited(active ? { ...active } as IProgressReportDoc : null);
                                                                setEditMode(false);
                                                            }}
                                                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={saveEdited}
                                                            disabled={updateLoading}
                                                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                                                        >
                                                            Save Changes
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm !mt-0">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6 text-center">
                                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
                                    <X className="w-6 h-6" strokeWidth={3} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800 mb-2">Delete Report?</h3>
                                <p className="text-sm text-slate-500 font-medium mb-6">
                                    Are you sure you want to delete this report? This action cannot be undone.
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        disabled={deleteLoading}
                                        className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-rose-700 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {deleteLoading ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <Chatbot />
            <style>{`
                .rich-text-display ul, .rich-text-display ol {
                    padding-left: 1.5em;
                    margin: 0.5em 0;
                    list-style: initial;
                }
                .rich-text-display ul { list-style-type: disc; }
                .rich-text-display ol { list-style-type: decimal; }
                .rich-text-display li {
                    margin: 0.2em 0;
                }
                .rich-text-display b, .rich-text-display strong {
                    font-weight: bold;
                }
                .rich-text-display i, .rich-text-display em {
                    font-style: italic;
                }
                .rich-text-display u {
                    text-decoration: underline;
                }
                .rich-text-display p {
                    margin-bottom: 1em;
                    line-height: 1.8;
                }
                .rich-text-display p:last-child {
                    margin-bottom: 0;
                }
            `}</style>
        </motion.div>
    );
}
