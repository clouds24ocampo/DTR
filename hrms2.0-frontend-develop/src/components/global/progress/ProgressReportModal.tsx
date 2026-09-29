import { X, Plus, Trash2, Save, Send, Sunrise, Sunset, Upload, FileText, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RichTextEditor } from "../../hr/document/RichTextEditor";
import type { IProgressReportDoc } from "../../../api/global/progress/progress.api";
import type {
    ProgressPeriod,
    ProgressTask,
    TaskPriority,
    TaskStatus,
    ProgressAttachment,
} from "../../../types/global/progress/progress.types";
import { uploadFileInChunks } from "../../../utils/global/chunkUploader";

type CreatePayload = {
    date: string;
    period: ProgressPeriod;
    tasks: ProgressTask[];
    accomplishments: string;
    challenges?: string;
    planForNext?: string;
    attachments?: ProgressAttachment[];
    status?: "draft" | "submitted";
};

type UpdatePayload = {
    tasks: ProgressTask[];
    accomplishments: string;
    challenges?: string;
    planForNext?: string;
    attachments?: ProgressAttachment[];
    status?: "draft" | "submitted";
};

type Props =
    | {
        mode: "create";
        open: boolean;
        onClose: () => void;
        onCreate: (payload: CreatePayload) => Promise<void>;
        loading: boolean;
        displayName?: string;
        report?: never;
        onUpdate?: never;
    }
    | {
        mode: "edit";
        open: boolean;
        onClose: () => void;
        onUpdate: (reportId: string, payload: UpdatePayload) => Promise<void>;
        loading: boolean;
        displayName?: string;
        report: IProgressReportDoc;
        onCreate?: never;
    };

const emptyTask: ProgressTask = {
    description: "",
    status: "not-started",
    priority: "medium",
    completionPercentage: 0,
    notes: "",
};

export default function ProgressReportModal(props: Props) {
    const { mode, open, onClose, loading, displayName = "Employee" } = props;

    // Form state
    const [date, setDate] = useState("");
    const [period, setPeriod] = useState<ProgressPeriod>("morning");
    const [tasks, setTasks] = useState<ProgressTask[]>([{ ...emptyTask }]);
    const [accomplishments, setAccomplishments] = useState("");
    const [challenges, setChallenges] = useState("");
    const [planForNext, setPlanForNext] = useState("");
    const [attachments, setAttachments] = useState<ProgressAttachment[]>([]);
    const [formError, setFormError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize form when editing
    useEffect(() => {
        if (mode === "edit" && props.report) {
            const r = props.report;
            setDate(r.date);
            setPeriod(r.period);
            setTasks(r.tasks.length > 0 ? r.tasks : [{ ...emptyTask }]);
            setAccomplishments(r.accomplishments);
            setChallenges(r.challenges || "");
            setPlanForNext(r.planForNext || "");
            setAttachments(r.attachments || []);
        } else if (mode === "create") {
            // Reset for create mode
            const today = new Date().toISOString().split("T")[0];
            setDate(today);
            const currentHour = new Date().getHours();
            setPeriod(currentHour < 12 ? "morning" : "afternoon");
            setTasks([{ ...emptyTask }]);
            setAccomplishments("");
            setChallenges("");
            setPlanForNext("");
            setAttachments([]);
        }
        setFormError("");
    }, [mode, props.report, open]);

    // Handle global paste events
    useEffect(() => {
        if (!open) return;

        const handlePaste = async (e: ClipboardEvent) => {
            if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
                e.preventDefault();
                await handleFiles(Array.from(e.clipboardData.files));
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [open]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFiles = async (files: File[]) => {
        const validFiles = files.filter(file => {
            const validTypes = [
                "image/jpeg",
                "image/png",
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ];
            const maxSize = 10 * 1024 * 1024; // 10MB

            if (!validTypes.includes(file.type)) {
                setFormError(`File type not supported: ${file.name}`);
                return false;
            }
            if (file.size > maxSize) {
                setFormError(`File too large (max 10MB): ${file.name}`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        setUploading(true);
        setFormError("");

        try {
            const newAttachments: ProgressAttachment[] = [];

            for (const file of validFiles) {
                const url = await uploadFileInChunks(
                    file,
                    "hrms/admin/progress-reports"
                );

                newAttachments.push({
                    name: file.name,
                    url,
                    type: file.type,
                    size: file.size
                });
            }

            setAttachments(prev => [...prev, ...newAttachments]);
        } catch (error) {
            console.error("Upload failed:", error);
            setFormError("Failed to upload one or more files. Please try again.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const addTask = () => {
        setTasks([...tasks, { ...emptyTask }]);
    };

    const removeTask = (index: number) => {
        if (tasks.length > 1) {
            setTasks(tasks.filter((_, i) => i !== index));
        }
    };

    const updateTask = (index: number, field: keyof ProgressTask, value: any) => {
        const updated = tasks.map((task, i) => {
            if (i !== index) return task;

            const updatedTask = { ...task, [field]: value };

            // Auto-calculate completion based on status and priority
            if (field === "status" || field === "priority") {
                const status = field === "status" ? value as TaskStatus : task.status;
                const priority = field === "priority" ? value as TaskPriority : task.priority;

                if (status === "completed") {
                    updatedTask.completionPercentage = 100;
                } else if (status === "not-started") {
                    updatedTask.completionPercentage = 0;
                } else {
                    // in-progress or blocked
                    switch (priority) {
                        case "high":
                            updatedTask.completionPercentage = 75;
                            break;
                        case "medium":
                            updatedTask.completionPercentage = 50;
                            break;
                        case "low":
                            updatedTask.completionPercentage = 25;
                            break;
                        default:
                            updatedTask.completionPercentage = 50;
                    }
                }
            }

            return updatedTask;
        });
        setTasks(updated);
    };

    const validateForm = (): boolean => {
        if (!date) {
            setFormError("Please select a date");
            return false;
        }
        if (!accomplishments.trim()) {
            setFormError("Please describe your accomplishments");
            return false;
        }
        if (tasks.some(t => !t.description.trim())) {
            setFormError("All tasks must have a description");
            return false;
        }
        setFormError("");
        return true;
    };

    const handleSubmit = async (isDraft: boolean = false) => {
        if (!validateForm()) return;

        const payload = {
            tasks,
            accomplishments,
            challenges: challenges.trim() || undefined,
            planForNext: planForNext.trim() || undefined,
            attachments,
            status: (isDraft ? "draft" : "submitted") as "draft" | "submitted",
        };

        try {
            if (mode === "create") {
                await props.onCreate({
                    date,
                    period,
                    ...payload,
                });
            } else {
                const reportId = props.report._id || (props.report as any).id;
                await props.onUpdate(reportId, payload);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save progress report:", error);
            setFormError("Failed to save report. Please try again.");
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm !mt-0">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white text-on-light rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-100 flex flex-col"
            >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                                {mode === "create" ? "New Progress Report" : "Edit Progress Report"}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400">
                                {displayName} • {mode === "edit" ? new Date(date).toLocaleDateString() : "Today"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Error Message */}
                    <AnimatePresence>
                        {formError && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm font-bold"
                            >
                                {formError}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Date & Period Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                disabled={mode === "edit"}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-700 disabled:bg-slate-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Period
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {(["morning", "afternoon"] as const).map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPeriod(p)}
                                        disabled={mode === "edit"}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-black text-xs uppercase tracking-wider transition-all disabled:cursor-not-allowed ${period === p
                                            ? p === "morning"
                                                ? "bg-amber-50 border-amber-500 text-amber-700"
                                                : "bg-indigo-50 border-indigo-500 text-indigo-700"
                                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                            }`}
                                    >
                                        {p === "morning" ? (
                                            <Sunrise className="w-4 h-4" />
                                        ) : (
                                            <Sunset className="w-4 h-4" />
                                        )}
                                        {p === "morning" ? "First Session" : "Second Session"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tasks Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                Tasks Worked On
                            </label>
                            <button
                                type="button"
                                onClick={addTask}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-100 transition-colors border border-blue-100"
                            >
                                <Plus className="w-4 h-4" />
                                Add Task
                            </button>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence>
                                {tasks.map((task, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1 space-y-3">
                                                {/* Task Description */}
                                                <input
                                                    type="text"
                                                    placeholder="Task description..."
                                                    value={task.description}
                                                    onChange={(e) => updateTask(idx, "description", e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-bold text-slate-700"
                                                />

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    {/* Status */}
                                                    <select
                                                        value={task.status}
                                                        onChange={(e) => updateTask(idx, "status", e.target.value as TaskStatus)}
                                                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                                                    >
                                                        <option value="not-started">Not Started</option>
                                                        <option value="in-progress">In Progress</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="blocked">Blocked</option>
                                                    </select>

                                                    {/* Priority */}
                                                    <select
                                                        value={task.priority}
                                                        onChange={(e) => updateTask(idx, "priority", e.target.value as TaskPriority)}
                                                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                                                    >
                                                        <option value="low">Low Priority</option>
                                                        <option value="medium">Medium Priority</option>
                                                        <option value="high">High Priority</option>
                                                    </select>

                                                    {/* Completion % */}
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={task.completionPercentage || 0}
                                                            readOnly
                                                            disabled
                                                            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 outline-none cursor-not-allowed"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                                            %
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {tasks.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeTask(idx)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Remove Task"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Accomplishments */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                            Key Accomplishments *
                        </label>
                        <RichTextEditor
                            value={accomplishments}
                            onChange={setAccomplishments}
                            placeholder="Describe what you accomplished during this period..."
                            error={!!formError && !accomplishments.trim()}
                            autoHideToolbar
                            className="min-h-[100px] text-xs"
                        />
                    </div>

                    {/* Challenges */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                            Challenges Faced (Optional)
                        </label>
                        <RichTextEditor
                            value={challenges}
                            onChange={setChallenges}
                            placeholder="Any obstacles or difficulties encountered..."
                            autoHideToolbar
                            className="min-h-[100px] text-xs"
                        />
                    </div>

                    {/* Plans for Next Period */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                            Plans for Next Period (Optional)
                        </label>
                        <RichTextEditor
                            value={planForNext}
                            onChange={setPlanForNext}
                            placeholder="What you plan to work on next..."
                            autoHideToolbar
                            className="min-h-[100px] text-xs"
                        />
                    </div>

                    {/* Attachments */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                            Attachments (Optional)
                        </label>

                        <div className={attachments.length > 0 ? "grid grid-cols-1 md:grid-cols-2 gap-4" : ""}>
                            {/* Drag & Drop Area */}
                            <div
                                className={`relative group border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center flex flex-col items-center justify-center ${dragActive
                                        ? "border-blue-500 bg-blue-50/50"
                                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                                    } ${attachments.length > 0 ? 'h-full min-h-[200px]' : ''}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".jpg,.jpeg,.png,.pdf,.docx"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            handleFiles(Array.from(e.target.files));
                                        }
                                    }}
                                />

                                <div className="flex flex-col items-center gap-3">
                                    <div className={`p-3 rounded-full transition-colors ${dragActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-500"
                                        }`}>
                                        {uploading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <Upload className="w-6 h-6" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">
                                            {uploading ? "Uploading files..." : "Click to upload or drag and drop"}
                                        </p>
                                        <p className="text-xs text-slate-400 font-medium mt-1">
                                            PDF, DOCX, PNG, JPG (max 10MB)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Attachments List */}
                            {attachments.length > 0 && (
                                <div className="grid grid-cols-1 gap-3 content-start">
                                    {attachments.map((file, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg group hover:border-blue-200 transition-colors"
                                        >
                                            <div className="h-10 w-10 flex-shrink-0 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                                                {file.type.includes("image") ? (
                                                    <img
                                                        src={file.url}
                                                        alt={file.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
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
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(idx)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-full sm:w-auto justify-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => handleSubmit(true)}
                            disabled={loading || uploading}
                            className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            Save Draft
                        </button>
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={loading || uploading}
                            className="w-full sm:w-auto justify-center flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                            Submit Report
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
