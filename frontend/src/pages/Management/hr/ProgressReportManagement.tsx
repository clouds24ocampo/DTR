import {
    Filter,
    Calendar,
    CheckCircle,
    Eye,
    Trash2,
    ShieldCheck,
    AlertCircle,
    User,
    Sunrise,
    Sunset,
    ListChecks,
    X,
    FileText,
    Image as ImageIcon,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Maximize2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants, itemVariants } from "../../../utils/global/pageMotion";
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import SearchToolbar from "../../../components/ui/SearchToolbar";
import ErrorBanner from "../../../components/ui/ErrorBanner";
import EmptyState from "../../../components/ui/EmptyState";
import SkeletonGrid from "../../../components/ui/SkeletonGrid";
import { useProgressReportStore } from "../../../stores/global/progress/progress.store";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import type { IProgressReportDoc } from "../../../api/global/progress/progress.api";
import type {
    ProgressPeriod,
    ProgressStatus,
} from "../../../types/global/progress/progress.types";
import type { Role } from "../../../types/workforce/user/user.type";

/** Normalize role string for case-insensitive matching (backend may differ in casing/spacing). */
function normalizeRoleKey(r: unknown): string {
    const s = typeof r === "string" ? r : r != null ? String(r) : "";
    return s.trim().toLowerCase();
}

/** Find the canonical Role from ALL_ROLES that matches the given position string. */
function canonicalRole(position: unknown): Role | null {
    const key = normalizeRoleKey(position);
    if (!key || key === "—") return null;
    const found = ALL_ROLES.find((role) => normalizeRoleKey(role) === key);
    return found ?? null;
}

/** Backend may return position as Role[] (array). Return all canonical roles for this user. */
function getCanonicalRoles(position: unknown): Role[] {
    if (position == null) return [];
    if (Array.isArray(position)) {
        const roles: Role[] = [];
        for (const p of position) {
            const c = canonicalRole(p);
            if (c && !roles.includes(c)) roles.push(c);
        }
        return roles;
    }
    const c = canonicalRole(position);
    return c ? [c] : [];
}

/** All available roles for filter dropdown */
const ALL_ROLES: Role[] = [
    "Employee",
    "Team Leader - Field",
    "Team Leader - Operation",
    "Workforce",
    "HR",
    "Operation Manager",
    "Intern",
    "Trainee",
    "Provisionary",
    "Instructor",
    "Student",
    "Marketer",
    "Employee - Field",
    "Employee - Operation",
    "Frontline / Agent Roles",
    "Specialized Agent Roles",
    "Supervisory & Management Roles",
    "Support & Back-Office Roles",
];

type GroupedReport = {
    employeeId: string;
    employeeName?: string;
    date: string;
    morning?: IProgressReportDoc;
    afternoon?: IProgressReportDoc;
};

const StatusBadge = ({ status }: { status: ProgressStatus }) => {
    const configs: Record<
        ProgressStatus,
        { bg: string; text: string; border: string; label: string }
    > = {
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
        <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl ${bg} ${color} border ${border}`}
        >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider">
                {period === "morning" ? "First Session" : "Second Session"}
            </span>
        </div>
    );
};

export default function ProgressReportManagement() {
    const {
        progressReports,
        fetchAllProgressReports,
        reviewProgressReport,
        deleteProgressReport,
        fetchAllLoading,
        reviewLoading,
        deleteLoading,
        error,
        clearError,
    } = useProgressReportStore();

    const { otherUsers, fetchOtherUsers, user } = useUserStore();

    useEffect(() => {
        if (otherUsers.length === 0) {
            fetchOtherUsers();
        }
    }, [otherUsers.length, fetchOtherUsers]);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<ProgressStatus | "all">("all");
    const [periodFilter, setPeriodFilter] = useState<ProgressPeriod | "all">("all");
    const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
    const [monthFilter, setMonthFilter] = useState<string>("all");
    const [dayFilter, setDayFilter] = useState<string>("all");
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const [selectedReport, setSelectedReport] = useState<IProgressReportDoc | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewNotes, setReviewNotes] = useState("");
    const [selectedGroup, setSelectedGroup] = useState<GroupedReport | null>(null);
    const [viewPeriod, setViewPeriod] = useState<ProgressPeriod>("morning");
    const [deleteSelection, setDeleteSelection] = useState<GroupedReport | null>(null);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [reportToDeleteId, setReportToDeleteId] = useState<string | null>(null);
    const [showAIAnalyzerModal, setShowAIAnalyzerModal] = useState(false);
    const [aiPeriodType, setAiPeriodType] = useState<"date" | "week" | "month">("month");
    const [aiSelectedDate, setAiSelectedDate] = useState("");
    const [aiSelectedMonth, setAiSelectedMonth] = useState("");
    const [aiSelectedWeek, setAiSelectedWeek] = useState("");
    const [aiRoleFilter, setAiRoleFilter] = useState<Role | "all">("all");
    const [aiRoleSearch, setAiRoleSearch] = useState("");
    const [aiRoleDropdownOpen, setAiRoleDropdownOpen] = useState(false);
    const aiRoleDropdownRef = useRef<HTMLDivElement>(null);
    const [aiEmployeeFilter, setAiEmployeeFilter] = useState<string[]>([]);
    const [aiSummary, setAiSummary] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [showSummaryExpanded, setShowSummaryExpanded] = useState(false);

    useEffect(() => {
        fetchAllProgressReports().catch((err) => {
            console.error("Failed to fetch progress reports:", err);
        });
    }, [fetchAllProgressReports]);

    /** Ensure initial display is cleared: no filters applied (resets any restored/persisted filter state). */
    useEffect(() => {
        setSearchTerm("");
        setStatusFilter("all");
        setPeriodFilter("all");
        setRoleFilter("all");
        setMonthFilter("all");
        setDayFilter("");
    }, []);

    const employeeIdToRole = useMemo(() => {
        const map = new Map<string, Role>();
        otherUsers.forEach((u) => map.set(u._id, u.position));
        return map;
    }, [otherUsers]);

    const filterOptions = useMemo(() => {
        const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        const now = new Date();
        const months: { value: string; label: string }[] = [];
        for (let i = 0; i < 24; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const key = `${y}-${String(m).padStart(2, "0")}`;
            months.push({ value: key, label: `${monthNames[m - 1]} ${y}` });
        }
        return {
            roles: ALL_ROLES.map((role) => ({ value: role, label: role })),
            months,
        };
    }, []);

    const filteredReports = useMemo(() => {
        return progressReports.filter((report) => {
            const matchesSearch =
                report.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.accomplishments.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.challenges?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "all" || report.status === statusFilter;
            const matchesPeriod = periodFilter === "all" || report.period === periodFilter;
            const reportRole = report.employeeId ? employeeIdToRole.get(report.employeeId) : undefined;
            const matchesRole =
                roleFilter === "all" ||
                otherUsers.length === 0 ||
                getCanonicalRoles(reportRole).includes(roleFilter);
            const d = new Date(report.date);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const matchesMonth = monthFilter === "all" || monthKey === monthFilter;
            const matchesDay = dayFilter === "" || report.date === dayFilter;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesPeriod &&
                matchesRole &&
                matchesMonth &&
                matchesDay
            );
        });
    }, [
        progressReports,
        searchTerm,
        statusFilter,
        periodFilter,
        roleFilter,
        monthFilter,
        dayFilter,
        employeeIdToRole,
        otherUsers.length,
    ]);

    const clearAllFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setPeriodFilter("all");
        setRoleFilter("all");
        setMonthFilter("all");
        setDayFilter("");
    };

    const activeFiltersCount = [
        searchTerm,
        statusFilter !== "all",
        periodFilter !== "all",
        roleFilter !== "all",
        monthFilter !== "all",
        dayFilter !== "",
    ].filter(Boolean).length;

    const getReportsForAIPeriod = useMemo(() => {
        // Use date string parts (YYYY-MM-DD) to avoid timezone shifts from new Date()
        const monthKeyFromDate = (dateStr: string) => dateStr.substring(0, 7); // "2026-02-09" -> "2026-02"
        const weekOfMonthFromDate = (dateStr: string) => {
            const day = parseInt(dateStr.substring(8, 10), 10) || 1;
            return Math.ceil(day / 7);
        };
        return (type: "date" | "week" | "month", dateVal: string, monthVal: string, weekVal: string): IProgressReportDoc[] => {
            if (type === "date" && dateVal) {
                return progressReports.filter((r) => r.date === dateVal || r.date?.startsWith?.(dateVal));
            }
            if (type === "month" && monthVal) {
                return progressReports.filter((r) => r.date && monthKeyFromDate(r.date) === monthVal);
            }
            if (type === "week" && monthVal && weekVal) {
                const w = parseInt(weekVal, 10);
                return progressReports.filter(
                    (r) => r.date && monthKeyFromDate(r.date) === monthVal && weekOfMonthFromDate(r.date) === w
                );
            }
            return [];
        };
    }, [progressReports]);

    const reportsForAIPeriod = useMemo(
        () => getReportsForAIPeriod(aiPeriodType, aiSelectedDate, aiSelectedMonth, aiSelectedWeek),
        [getReportsForAIPeriod, aiPeriodType, aiSelectedDate, aiSelectedMonth, aiSelectedWeek]
    );

    const aiEmployeeOptions = useMemo(() => {
        const active = otherUsers.filter((u) => !u.archived);
        return active
            .map((u) => {
                const roles = getCanonicalRoles(u.position);
                const primaryRole = roles[0] ?? "—";
                return {
                    value: u._id,
                    label: [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ").trim() || u.username || "Unknown",
                    role: primaryRole,
                    position: u.position,
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [otherUsers]);

    /** Employees to show in the list: all when "All Roles", otherwise only those whose position includes the selected role (supports backend position as array). */
    const aiEmployeeOptionsByRole = useMemo(() => {
        if (aiRoleFilter === "all") return aiEmployeeOptions;
        return aiEmployeeOptions.filter((o) => getCanonicalRoles(o.position).includes(aiRoleFilter));
    }, [aiEmployeeOptions, aiRoleFilter]);

    /** Role options with user count for searchable dropdown. Count by canonical role; backend position may be array so count user under each role they have. */
    const aiRoleOptionsWithCount = useMemo(() => {
        const countByRole = new Map<Role, number>();
        aiEmployeeOptions.forEach((o) => {
            getCanonicalRoles(o.position).forEach((r) => countByRole.set(r, (countByRole.get(r) ?? 0) + 1));
        });
        return [
            { value: "all" as const, label: "All Roles", count: aiEmployeeOptions.length },
            ...filterOptions.roles.map(({ value }) => ({
                value: value as Role,
                label: value,
                count: countByRole.get(value as Role) ?? 0,
            })),
        ];
    }, [aiEmployeeOptions, filterOptions.roles]);

    const aiRoleOptionsFiltered = useMemo(() => {
        const q = aiRoleSearch.trim().toLowerCase();
        if (!q) return aiRoleOptionsWithCount;
        return aiRoleOptionsWithCount.filter((r) => r.label.toLowerCase().includes(q));
    }, [aiRoleOptionsWithCount, aiRoleSearch]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (aiRoleDropdownRef.current && !aiRoleDropdownRef.current.contains(e.target as Node)) {
                setAiRoleDropdownOpen(false);
            }
        };
        if (aiRoleDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [aiRoleDropdownOpen]);

    useEffect(() => {
        const validIds = new Set(aiEmployeeOptionsByRole.map((o) => o.value));
        const filtered = aiEmployeeFilter.filter((id) => validIds.has(id));
        if (filtered.length !== aiEmployeeFilter.length) {
            setAiEmployeeFilter(filtered);
        }
    }, [aiEmployeeFilter, aiEmployeeOptionsByRole]);

    const generateAISummary = async () => {
        let reports = reportsForAIPeriod;
        if (aiRoleFilter !== "all") {
            reports = reports.filter((r) => (r.employeeId ? getCanonicalRoles(employeeIdToRole.get(r.employeeId)).includes(aiRoleFilter) : false));
        }
        if (aiEmployeeFilter.length > 0) {
            const employeeIds = new Set(aiEmployeeFilter);
            reports = reports.filter((r) => r.employeeId && employeeIds.has(r.employeeId));
        }
        if (reports.length === 0) {
            if (reportsForAIPeriod.length === 0) {
                setAiError("No progress reports for the selected period. Choose a different date, week, or month.");
            } else if (aiEmployeeFilter.length > 0) {
                setAiError("No progress reports for the selected employee(s) in this period. Try selecting different employees or leave all unchecked for all.");
            } else {
                setAiError("No progress reports for the selected role in this period. Try \"All Roles\" or another role.");
            }
            setAiSummary("");
            return;
        }
        const reportText = reports
            .map(
                (r) =>
                    `Employee: ${r.employeeName || "Unknown"}\nDate & Period: ${r.date} — ${r.period}\nAccomplishments: ${r.accomplishments}\n${r.challenges ? `Challenges: ${r.challenges}\n` : ""}${r.planForNext ? `Plan for next: ${r.planForNext}` : ""}`
            )
            .join("\n\n---\n\n");
        const prompt = `You are summarizing workplace progress reports. Base your summary strictly on these three elements for each entry: (1) employee name, (2) date and period, and (3) employee accomplishments.

Produce a clear, concise summary (2-4 paragraphs) that:
1. Organizes or references content by employee name and date/period where relevant.
2. Focuses on employee accomplishments—what each person achieved in their reported period.
3. Optionally notes common challenges or next steps if present in the data.

Keep the tone professional and factual. Raw report entries (employee, date/period, accomplishments):\n\n${reportText}`;

        setAiError(null);
        setAiLoading(true);
        setAiSummary("");

        const groqKey = (import.meta.env.VITE_GROQ_API_KEY ?? "").trim();
        const googleKey = (import.meta.env.VITE_GOOGLE_AI_STUDIO_API_KEY ?? "").trim();
        const provider = (import.meta.env.VITE_AI_SUMMARY_PROVIDER ?? (groqKey ? "groq" : googleKey ? "google" : "browser")).toLowerCase();

        try {
            let text = "";

            // 1) Groq (free tier, no credit card) — https://console.groq.com
            if ((provider === "groq" || !text) && groqKey) {
                const model = (import.meta.env.VITE_GROQ_MODEL ?? "llama-3.1-8b-instant").trim();
                const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${groqKey}`,
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: "system", content: "You summarize workplace progress reports based on employee name, date/period, and accomplishments. Be clear, concise, and professional." },
                            { role: "user", content: prompt },
                        ],
                        temperature: 0.3,
                        max_tokens: 1024,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                    text = data?.choices?.[0]?.message?.content?.trim() ?? "";
                } else {
                    const errMsg = data?.error?.message ?? data?.error ?? `Groq API error: ${res.status}`;
                    if (provider === "groq") throw new Error(String(errMsg));
                }
            }

            // 2) Google AI Studio (Gemini)
            if ((provider === "google" || !text) && googleKey) {
                const model = (import.meta.env.VITE_GOOGLE_AI_STUDIO_MODEL ?? "gemini-2.0-flash").trim();
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(googleKey)}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ role: "user", parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
                        }),
                    }
                );
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                    text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
                } else {
                    const errMsg = data?.error?.message ?? data?.error ?? `API error: ${res.status}`;
                    if (res.status === 404 && String(errMsg).includes("not found")) {
                        throw new Error(`Model "${model}" not available. Try VITE_GOOGLE_AI_STUDIO_MODEL=gemini-1.5-flash-latest. ${errMsg}`);
                    }
                    if (provider === "google") throw new Error(String(errMsg));
                }
            }

            // 3) Browser Summarizer API (Chrome 138+, no API key)
            if ((provider === "browser" || !text) && typeof globalThis !== "undefined" && "Summarizer" in globalThis) {
                const SummarizerApi = (globalThis as Record<string, unknown>).Summarizer as undefined | {
                    create(opts: { sharedContext: string; type: string; length: string }): Promise<{ summarize(t: string): Promise<string>; destroy(): void }>;
                };
                if (SummarizerApi?.create) {
                    try {
                        const summarizer = await SummarizerApi.create({
                            sharedContext: "Summarize workplace progress reports by employee name, date/period, and accomplishments. Focus on what each person achieved. Professional tone.",
                            type: "key-points",
                            length: "medium",
                        });
                        try {
                            text = (await summarizer.summarize(reportText))?.trim() ?? "";
                        } finally {
                            summarizer.destroy?.();
                        }
                    } catch {
                        // ignore and keep text empty so we fall through to error
                    }
                }
            }

            if (!text) {
                throw new Error(
                    "No AI summarizer available. Add a free API key: Groq (recommended, free at console.groq.com) as VITE_GROQ_API_KEY, or Google AI Studio as VITE_GOOGLE_AI_STUDIO_API_KEY. In Chrome 138+ you can also use the built-in summarizer (no key)."
                );
            }
            setAiSummary(text);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to generate summary.";
            setAiError(message);
        } finally {
            setAiLoading(false);
        }
    };

    const groupedReports = useMemo(() => {
        const map = new Map<string, GroupedReport>();
        filteredReports.forEach((r) => {
            const d = new Date(r.date);
            const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
                d.getDate()
            ).padStart(2, "0")}`;
            const key = `${r.employeeId || r.employeeName || ""}|${dayKey}`;
            const existing = map.get(key) || {
                employeeId: r.employeeId || "",
                employeeName: r.employeeName,
                date: r.date,
            };
            if (r.period === "morning") {
                existing.morning = r;
            } else {
                existing.afternoon = r;
            }
            existing.employeeName = r.employeeName || existing.employeeName;
            existing.employeeId = r.employeeId || existing.employeeId;
            existing.date = r.date;
            map.set(key, existing as GroupedReport);
        });
        return Array.from(map.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [filteredReports]);

    useEffect(() => {
        if (selectedGroup) {
            const updatedGroup = groupedReports.find(
                (g) =>
                    g.employeeId === selectedGroup.employeeId &&
                    g.date === selectedGroup.date
            );
            if (updatedGroup) {
                setSelectedGroup(updatedGroup);
            }
        }
    }, [groupedReports]);

    const handleViewGroup = (group: GroupedReport) => {
        setSelectedGroup(group);
        setViewPeriod(group.morning ? "morning" : "afternoon");
        setShowViewModal(true);
    };


    const handleReview = (report: IProgressReportDoc) => {
        setSelectedReport(report);
        setReviewNotes("");
        setShowReviewModal(true);
    };

    const handleSubmitReview = async (status: "reviewed" | "archived", targetReportId?: string) => {
        const reportId = targetReportId || selectedReport?._id || (selectedReport as any)?.id;
        if (!reportId) return;

        try {
            await reviewProgressReport(reportId, {
                reviewedBy: "HR Admin", // This should come from current user
                reviewNotes: reviewNotes.trim() || undefined,
                status,
            });
            await fetchAllProgressReports();
            setShowReviewModal(false);
            setSelectedReport(null);
            setReviewNotes("");
        } catch (error) {
            console.error("Failed to review report:", error);
        }
    };

    const handleDeleteClick = (group: GroupedReport) => {
        if (group.morning && group.afternoon) {
            setDeleteSelection(group);
        } else if (group.morning) {
            handleDelete((group.morning._id || (group.morning as any).id) as string);
        } else if (group.afternoon) {
            handleDelete((group.afternoon._id || (group.afternoon as any).id) as string);
        }
    };

    const handleDelete = (reportId: string) => {
        setReportToDeleteId(reportId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!reportToDeleteId) return;
        try {
            await deleteProgressReport(reportToDeleteId);
            await fetchAllProgressReports();
            if (deleteSelection) {
                setDeleteSelection(null);
            }
            setShowDeleteConfirmModal(false);
            setReportToDeleteId(null);
        } catch (error) {
            console.error("Failed to delete report:", error);
        }
    };

    const stats = {
        total: progressReports.length,
        pending: progressReports.filter((r) => r.status === "submitted").length,
        reviewed: progressReports.filter((r) => r.status === "reviewed").length,
        archived: progressReports.filter((r) => r.status === "archived").length,
    };

    return (
        <motion.div
            className="w-full space-y-8 pb-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Area */}
            <motion.div className="space-y-6" variants={itemVariants}>
                <PageHeader
                    icon={FileText}
                    tint="blue"
                    eyebrow="Reports"
                    title="Progress Report Management"
                    subtitle="Review and manage employee daily progress reports. Track productivity and provide feedback."
                    actions={
                        <button
                            type="button"
                            onClick={() => {
                                setShowAIAnalyzerModal(true);
                                setAiError(null);
                                setAiSummary("");
                            }}
                            className="flex items-center justify-center space-x-2 px-4 py-2.5 border border-violet-300 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors text-sm font-medium shadow-sm"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>AI Analyzer</span>
                        </button>
                    }
                />

                <ErrorBanner message={error} onDismiss={clearError} />

                {/* Stats */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Reports"
                        value={stats.total}
                        subtitle="All submitted reports"
                        icon={FileText}
                        color="blue"
                    />
                    <StatCard
                        title="Pending Review"
                        value={stats.pending}
                        subtitle="Awaiting feedback"
                        icon={ListChecks}
                        color="yellow"
                    />
                    <StatCard
                        title="Reviewed"
                        value={stats.reviewed}
                        subtitle="Feedback provided"
                        icon={CheckCircle}
                        color="green"
                    />
                    <StatCard
                        title="Archived"
                        value={stats.archived}
                        subtitle="Archived reports"
                        icon={ShieldCheck}
                        color="purple"
                    />
                </div>
            </motion.div>

            {/* Toolbar (search + filters) */}
            <motion.div variants={itemVariants}>
                <SearchToolbar
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search by employee name or accomplishments..."
                >
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                        <Filter className="h-4 w-4 text-slate-500" aria-hidden />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as ProgressStatus | "all")}
                            className="cursor-pointer bg-transparent text-sm font-medium text-slate-700 outline-none"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="submitted">Submitted</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                    <div className="hidden items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 md:flex">
                        <select
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value as ProgressPeriod | "all")}
                            className="cursor-pointer bg-transparent text-sm font-medium text-slate-700 outline-none"
                        >
                            <option value="all">All Periods</option>
                            <option value="morning">First Session</option>
                            <option value="afternoon">Second Session</option>
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowMoreFilters(!showMoreFilters)}
                        className="flex items-center justify-center space-x-2 px-3 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors relative"
                    >
                        <Filter className="w-4 h-4" />
                        <span className="text-sm">More Filters</span>
                        {activeFiltersCount > 3 && (
                            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                                {activeFiltersCount - 3}
                            </span>
                        )}
                        {showMoreFilters ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>
                    {activeFiltersCount > 0 && (
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="flex items-center justify-center space-x-1 px-3 py-2.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            <X className="w-4 h-4" />
                            <span>Clear All</span>
                        </button>
                    )}
                </SearchToolbar>
            </motion.div>

            {/* Main Content Area */}
            <motion.div className="space-y-4" variants={itemVariants}>
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
                    {/* Filters */}
                    <div className="pb-5 border-b border-slate-200/80 bg-white">
                        <div className="space-y-4">
                            {/* Loading / Info */}
                            <div className="flex items-center justify-between text-sm text-slate-500">
                                {fetchAllLoading ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        <span>Loading progress reports...</span>
                                    </div>
                                ) : (
                                    <span>
                                        Showing {filteredReports.length} of {progressReports.length}{" "}
                                        {progressReports.length === 1 ? "report" : "reports"}
                                        {activeFiltersCount > 0 && " (filtered)"}
                                    </span>
                                )}
                                {activeFiltersCount > 0 && !fetchAllLoading && (
                                    <div className="flex items-center space-x-2 text-blue-600">
                                        <Filter className="w-4 h-4" />
                                        <span>Filters applied</span>
                                    </div>
                                )}
                            </div>

                            {/* Expanded Filter Options */}
                            {showMoreFilters && (
                                <motion.div
                                    className="border-t border-slate-200 pt-4 mt-4"
                                    variants={itemVariants}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl">
                                        {/* Role */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Role
                                            </label>
                                            <select
                                                value={roleFilter}
                                                onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
                                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-8"
                                            >
                                                <option value="all">All Roles</option>
                                                {filterOptions.roles.map(({ value, label }) => (
                                                    <option key={value} value={value}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Month */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Month
                                            </label>
                                            <select
                                                value={monthFilter}
                                                onChange={(e) => setMonthFilter(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-8"
                                            >
                                                <option value="all">All Months</option>
                                                {filterOptions.months.map(({ value, label }) => (
                                                    <option key={value} value={value}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Custom Date */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Custom Date
                                            </label>
                                            <input
                                                type="date"
                                                value={dayFilter}
                                                onChange={(e) => setDayFilter(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Reports Table */}
                    <div className="overflow-hidden">
                        <div className="min-w-full divide-y divide-slate-100">
                            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/50">
                                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User className="w-3 h-3" /> Employee
                                </div>
                                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar className="w-3 h-3" /> Date & Period
                                </div>
                                <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Accomplishments
                                </div>
                                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <ListChecks className="w-3 h-3" /> Tasks
                                </div>
                                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Status
                                </div>
                                <div className="col-span-1 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">
                                    Actions
                                </div>
                            </div>

                            <div className="divide-y divide-slate-50 min-h-[400px]">
                                {fetchAllLoading ? (
                                    <div className="py-6">
                                        <SkeletonGrid count={6} />
                                    </div>
                                ) : (
                                    <AnimatePresence mode="popLayout">
                                        {groupedReports.map((group, idx) => {
                                            const base = group.morning || group.afternoon!;
                                            const completedTasks =
                                                (group.morning?.tasks.filter((t) => t.status === "completed").length ||
                                                    0) +
                                                (group.afternoon?.tasks.filter((t) => t.status === "completed").length ||
                                                    0);
                                            const totalTasks =
                                                (group.morning?.tasks.length || 0) +
                                                (group.afternoon?.tasks.length || 0);
                                            const completionRate =
                                                totalTasks > 0
                                                    ? Math.round((completedTasks / totalTasks) * 100)
                                                    : 0;
                                            const accomplishmentsPreview = [
                                                group.morning?.accomplishments,
                                                group.afternoon?.accomplishments,
                                            ]
                                                .filter(Boolean)
                                                .join(" • ");

                                            return (
                                                <motion.div
                                                    key={`${group.employeeId}-${group.date}-${idx}`}
                                                    layout
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="border-b border-slate-50 last:border-0"
                                                >
                                                    {/* Desktop View */}
                                                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-6 group hover:bg-slate-50/80 transition-all duration-200 items-center">
                                                        {/* Employee */}
                                                        <div className="col-span-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-black text-xs overflow-hidden">
                                                                    {(() => {
                                                                        const employee =
                                                                            otherUsers.find(
                                                                                (u) =>
                                                                                    u._id ===
                                                                                    base.employeeId
                                                                            ) ||
                                                                            (user?._id ===
                                                                                base.employeeId
                                                                                ? user
                                                                                : undefined);
                                                                        if (
                                                                            employee?.profilePicture
                                                                        ) {
                                                                            return (
                                                                                <img
                                                                                    src={
                                                                                        employee.profilePicture
                                                                                    }
                                                                                    alt={
                                                                                        base.employeeName
                                                                                    }
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            );
                                                                        }
                                                                        return (
                                                                            base.employeeName?.[0] ||
                                                                            "E"
                                                                        );
                                                                    })()}
                                                                </div>
                                                                <p className="text-sm font-black text-slate-800 tracking-tight truncate">
                                                                    {base.employeeName || "Unknown"}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Date & Period */}
                                                        <div className="col-span-2">
                                                            <div className="space-y-2">
                                                                <p className="text-sm font-black text-slate-800 tracking-tight">
                                                                    {new Date(base.date).toLocaleDateString(
                                                                        "en-US",
                                                                        {
                                                                            month: "short",
                                                                            day: "numeric",
                                                                            year: "numeric",
                                                                        }
                                                                    )}
                                                                </p>
                                                                <div className="flex flex-col items-start gap-1.5">
                                                                    {group.morning && (
                                                                        <PeriodBadge period="morning" />
                                                                    )}
                                                                    {group.afternoon && (
                                                                        <PeriodBadge period="afternoon" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Accomplishments */}
                                                        <div className="col-span-3">
                                                            <div
                                                                className="text-xs font-bold text-slate-600 leading-relaxed line-clamp-2 rich-text-display"
                                                                title={accomplishmentsPreview.replace(/<[^>]+>/g, '')}
                                                                dangerouslySetInnerHTML={{ __html: accomplishmentsPreview }}
                                                            />
                                                        </div>

                                                        {/* Tasks */}
                                                        <div className="col-span-2">
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                                    <span className="text-xs font-black text-slate-700">
                                                                        {completedTasks}/{totalTasks} Tasks
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                    <div
                                                                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all"
                                                                        style={{ width: `${completionRate}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Status */}
                                                        <div className="col-span-2">
                                                            <div className="flex flex-col items-start gap-1.5">
                                                                {group.morning && (
                                                                    <StatusBadge status={group.morning.status} />
                                                                )}
                                                                {group.afternoon && (
                                                                    <StatusBadge status={group.afternoon.status} />
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="row-span-1 flex flex-col items-end gap-1.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                            <button
                                                                onClick={() => handleViewGroup(group)}
                                                                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                                                                title="View Details"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>

                                                            <button
                                                                onClick={() => handleDeleteClick(group)}
                                                                disabled={deleteLoading}
                                                                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all disabled:opacity-50"
                                                                title="Delete Report"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                    </div>

                                                    {/* Mobile View */}
                                                    <div className="md:hidden p-5 space-y-4 hover:bg-slate-50/80 transition-all duration-200">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-sm shadow-blue-200 overflow-hidden">
                                                                    {(() => {
                                                                        const employee =
                                                                            otherUsers.find((u) => u._id === base.employeeId) ||
                                                                            (user?._id === base.employeeId ? user : undefined);
                                                                        if (employee?.profilePicture) {
                                                                            return (
                                                                                <img
                                                                                    src={employee.profilePicture}
                                                                                    alt={base.employeeName}
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            );
                                                                        }
                                                                        return base.employeeName?.[0] || "E";
                                                                    })()}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-800 tracking-tight">
                                                                        {base.employeeName || "Unknown"}
                                                                    </p>
                                                                    <p className="text-xs font-bold text-slate-400">
                                                                        {new Date(base.date).toLocaleDateString("en-US", {
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

                                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                                <div
                                                                    className="text-xs font-bold text-slate-600 line-clamp-2 leading-relaxed rich-text-display"
                                                                    dangerouslySetInnerHTML={{ __html: accomplishmentsPreview }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                                            <button
                                                                onClick={() => handleViewGroup(group)}
                                                                className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> View
                                                            </button>
                                                            {group.morning && group.morning.status === "submitted" && (
                                                                <button
                                                                    onClick={() =>
                                                                        handleReview(group.morning as IProgressReportDoc)
                                                                    }
                                                                    disabled={reviewLoading}
                                                                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Review
                                                                </button>
                                                            )}
                                                            {group.afternoon && group.afternoon.status === "submitted" && (
                                                                <button
                                                                    onClick={() =>
                                                                        handleReview(group.afternoon as IProgressReportDoc)
                                                                    }
                                                                    disabled={reviewLoading}
                                                                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Review
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() =>
                                                                    group.morning
                                                                        ? handleDelete(
                                                                            (group.morning._id ||
                                                                                (group.morning as any).id) as string
                                                                        )
                                                                        : group.afternoon
                                                                            ? handleDelete(
                                                                                (group.afternoon._id ||
                                                                                    (group.afternoon as any).id) as string
                                                                            )
                                                                            : null
                                                                }
                                                                disabled={deleteLoading}
                                                                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>

                                )}

                                {!fetchAllLoading && filteredReports.length === 0 && (
                                    <EmptyState
                                        icon={FileText}
                                        title="No Reports Found"
                                        message="No progress reports match your current search."
                                        action={
                                            activeFiltersCount > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={clearAllFilters}
                                                    className="font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                                >
                                                    Clear all filters
                                                </button>
                                            ) : undefined
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Delete Selection Modal */}
            <AnimatePresence>
                {deleteSelection && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm !mt-0">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-slate-100 p-6"
                        >
                            <h3 className="text-lg font-black text-slate-800 mb-4">
                                Delete Report
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Which report do you want to delete for {deleteSelection.employeeName}?
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() =>
                                        handleDelete(
                                            (deleteSelection.morning?._id ||
                                                (deleteSelection.morning as any)?.id) as string
                                        )
                                    }
                                    className="w-full flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-bold hover:bg-amber-100 transition-colors group"
                                >
                                    <span className="flex items-center gap-2">
                                        <Sunrise className="w-4 h-4" />
                                        First Session Report
                                    </span>
                                    <Trash2 className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                </button>

                                <button
                                    onClick={() =>
                                        handleDelete(
                                            (deleteSelection.afternoon?._id ||
                                                (deleteSelection.afternoon as any)?.id) as string
                                        )
                                    }
                                    className="w-full flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 font-bold hover:bg-indigo-100 transition-colors group"
                                >
                                    <span className="flex items-center gap-2">
                                        <Sunset className="w-4 h-4" />
                                        Second Session Report
                                    </span>
                                    <Trash2 className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                </button>

                                <button
                                    onClick={() => setDeleteSelection(null)}
                                    className="w-full p-3 text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors mt-2"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Modal */}
            <AnimatePresence>
                {showViewModal && selectedGroup && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm !mt-0">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-100"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 gap-4">
                                <div className="overflow-hidden">
                                    <h3 className="text-lg font-black text-slate-800 truncate">
                                        Progress Report Details
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 truncate">
                                        {(selectedGroup.morning?.employeeName ||
                                            selectedGroup.afternoon?.employeeName) || "Unknown"} •{" "}
                                        {new Date(selectedGroup.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex bg-slate-200/50 p-1 rounded-xl">
                                        <button
                                            onClick={() => setViewPeriod("morning")}
                                            disabled={!selectedGroup.morning}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewPeriod === "morning"
                                                ? "bg-white text-amber-600 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                                } disabled:opacity-50`}
                                        >
                                            <Sunrise className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">First Session</span>
                                        </button>
                                        <button
                                            onClick={() => setViewPeriod("afternoon")}
                                            disabled={!selectedGroup.afternoon}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewPeriod === "afternoon"
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
                                        className="p-2 hover:bg-slate-200 rounded-xl shrink-0"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {(() => {
                                    const current =
                                        viewPeriod === "morning"
                                            ? selectedGroup.morning
                                            : selectedGroup.afternoon;
                                    if (!current) return null;
                                    return (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs font-black text-slate-400 uppercase mb-1">
                                                        Date
                                                    </p>
                                                    <p className="text-sm font-bold text-slate-700">
                                                        {new Date(current.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-400 uppercase mb-1">
                                                        Period
                                                    </p>
                                                    <PeriodBadge period={current.period} />
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs font-black text-slate-400 uppercase mb-2">
                                                    Accomplishments
                                                </p>
                                                <div
                                                    className="text-sm text-slate-700 leading-relaxed rich-text-display"
                                                    dangerouslySetInnerHTML={{ __html: current.accomplishments || "" }}
                                                />
                                            </div>

                                            {current.challenges && (
                                                <div>
                                                    <p className="text-xs font-black text-slate-400 uppercase mb-2">
                                                        Challenges
                                                    </p>
                                                    <div
                                                        className="text-sm text-slate-700 leading-relaxed rich-text-display"
                                                        dangerouslySetInnerHTML={{ __html: current.challenges || "" }}
                                                    />
                                                </div>
                                            )}

                                            {current.planForNext && (
                                                <div>
                                                    <p className="text-xs font-black text-slate-400 uppercase mb-2">
                                                        Plans for Next Period
                                                    </p>
                                                    <div
                                                        className="text-sm text-slate-700 leading-relaxed rich-text-display"
                                                        dangerouslySetInnerHTML={{ __html: current.planForNext || "" }}
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <p className="text-xs font-black text-slate-400 uppercase mb-3">
                                                    Tasks ({current.tasks.length})
                                                </p>
                                                <div className="space-y-2">
                                                    {current.tasks.map((task, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                                                        >
                                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                                <div className="space-y-2 w-full">
                                                                    <p className="text-sm font-bold text-slate-800">
                                                                        {task.description}
                                                                    </p>
                                                                    <div className="flex flex-wrap items-center gap-3">
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
                                                                    <div className="w-full sm:w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full ${task.completionPercentage === 100 ? "bg-emerald-500" : "bg-blue-500"
                                                                                }`}
                                                                            style={{ width: `${task.completionPercentage}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {task.notes && (
                                                                <div className="w-full pt-3 border-t border-slate-200 mt-2">
                                                                    <p className="text-xs text-slate-500 italic">
                                                                        Note: {task.notes}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Attachments */}
                                            {current.attachments && current.attachments.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-black text-slate-400 uppercase mb-3">
                                                        Attachments ({current.attachments.length})
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {current.attachments.map((file, idx) => (
                                                            <a
                                                                key={idx}
                                                                href={file.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl group hover:border-blue-200 hover:shadow-sm transition-all"
                                                            >
                                                                <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-blue-500 transition-colors">
                                                                    {file.type.includes("image") ? (
                                                                        <ImageIcon className="w-4 h-4" />
                                                                    ) : (
                                                                        <FileText className="w-4 h-4" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-blue-600 transition-colors">
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

                                            {current.reviewedBy && (
                                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                                    <p className="text-xs font-black text-emerald-700 uppercase mb-2">
                                                        Review Information
                                                    </p>
                                                    <p className="text-sm text-emerald-700">
                                                        Reviewed by: {current.reviewedBy}
                                                    </p>
                                                    {current.reviewNotes && (
                                                        <p className="text-sm text-emerald-600 mt-2 italic">
                                                            "{current.reviewNotes}"
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {current.status === "submitted" && (
                                                <div className="pt-6 border-t border-slate-100">
                                                    <h4 className="text-sm font-black text-slate-800 mb-4">Review Report</h4>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                                                Review Notes (Optional)
                                                            </label>
                                                            <textarea
                                                                rows={3}
                                                                placeholder="Add any feedback or comments..."
                                                                value={reviewNotes}
                                                                onChange={(e) => setReviewNotes(e.target.value)}
                                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-medium text-slate-700 resize-none"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => handleSubmitReview("archived", current._id || (current as any).id)}
                                                                disabled={reviewLoading}
                                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all shadow-sm disabled:opacity-50"
                                                            >
                                                                <AlertCircle className="w-4 h-4" />
                                                                Archive
                                                            </button>
                                                            <button
                                                                onClick={() => handleSubmitReview("reviewed", current._id || (current as any).id)}
                                                                disabled={reviewLoading}
                                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                                Approve
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Review Modal */}
            <AnimatePresence>
                {showReviewModal && selectedReport && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm !mt-0">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-100"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="text-lg font-black text-slate-800">
                                    Review Progress Report
                                </h3>
                                <button
                                    onClick={() => setShowReviewModal(false)}
                                    className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <div>
                                    <p className="text-sm font-bold text-slate-700 mb-2">
                                        Employee: {selectedReport.employeeName}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Date: {new Date(selectedReport.date).toLocaleDateString()} •{" "}
                                        {selectedReport.period}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                        Review Notes (Optional)
                                    </label>
                                    <textarea
                                        rows={4}
                                        placeholder="Add any feedback or comments..."
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-medium text-slate-700 resize-none"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    <button
                                        onClick={() => handleSubmitReview("archived")}
                                        disabled={reviewLoading}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        <AlertCircle className="w-4 h-4" />
                                        Archive
                                    </button>
                                    <button
                                        onClick={() => handleSubmitReview("reviewed")}
                                        disabled={reviewLoading}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Approve
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirmModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm !mt-0">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6 text-center">
                                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
                                    <Trash2 className="w-6 h-6" strokeWidth={3} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800 mb-2">Delete Report?</h3>
                                <p className="text-sm text-slate-500 font-medium mb-6">
                                    Are you sure you want to delete this report? This action cannot be undone.
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirmModal(false)}
                                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        disabled={deleteLoading}
                                        className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-700 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {deleteLoading ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* AI Analyzer Modal - theme follows system (light/dark) */}
            <AnimatePresence>
                {showAIAnalyzerModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm !mt-0">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-600 flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">AI Analyzer</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAIAnalyzerModal(false)}
                                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors text-slate-600 dark:text-slate-300"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Select a date, week, or month and optionally a role to generate an AI-summarized version of the progress reports.
                                </p>

                                <div ref={aiRoleDropdownRef} className="relative">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Role (optional)</label>
                                    <div
                                        className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-500 rounded-xl focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center gap-2"
                                        onClick={() => {
                                                setAiRoleDropdownOpen((o) => {
                                                    if (!o) setAiRoleSearch("");
                                                    return !o;
                                                });
                                            }}
                                    >
                                        <input
                                            type="text"
                                            value={aiRoleDropdownOpen ? aiRoleSearch : (aiRoleFilter === "all" ? "All Roles" : aiRoleFilter)}
                                            onChange={(e) => {
                                                setAiRoleSearch(e.target.value);
                                                setAiRoleDropdownOpen(true);
                                            }}
                                            onFocus={() => setAiRoleDropdownOpen(true)}
                                            placeholder="Search or select role..."
                                            className="flex-1 min-w-0 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                                        />
                                        <ChevronDown className={`shrink-0 w-4 h-4 text-slate-500 transition-transform ${aiRoleDropdownOpen ? "rotate-180" : ""}`} />
                                    </div>
                                    <AnimatePresence>
                                        {aiRoleDropdownOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute z-50 mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 shadow-lg max-h-56 overflow-y-auto"
                                            >
                                                {aiRoleOptionsFiltered.length === 0 ? (
                                                    <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No roles match &quot;{aiRoleSearch}&quot;</p>
                                                ) : (
                                                    aiRoleOptionsFiltered.map(({ value, label, count }) => (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() => {
                                                                setAiRoleFilter(value);
                                                                setAiRoleSearch("");
                                                                setAiRoleDropdownOpen(false);
                                                            }}
                                                            className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-600/50 ${value === aiRoleFilter ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300" : "text-slate-700 dark:text-slate-300"}`}
                                                        >
                                                            <span>{label}</span>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">({count} user{count !== 1 ? "s" : ""})</span>
                                                        </button>
                                                    ))
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Employees to include (optional)
                                    </label>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                        Leave all unchecked to summarize all employees; check specific employees to limit the summary.
                                        {aiRoleFilter === "all" ? (
                                            <span className="block mt-1 font-medium text-slate-600 dark:text-slate-300">
                                                Showing all {aiEmployeeOptionsByRole.length} user{aiEmployeeOptionsByRole.length !== 1 ? "s" : ""}.
                                            </span>
                                        ) : (
                                            <span className="block mt-1 font-medium text-slate-600 dark:text-slate-300">
                                                Showing only role: {aiRoleFilter} ({aiEmployeeOptionsByRole.length} user{aiEmployeeOptionsByRole.length !== 1 ? "s" : ""})
                                            </span>
                                        )}
                                    </p>
                                    {aiEmployeeOptionsByRole.length === 0 ? (
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {aiRoleFilter === "all"
                                                ? "No active users loaded. Users are loaded when you open this page."
                                                : `No users with role "${aiRoleFilter}". Try "All Roles" or another role.`}
                                        </p>
                                    ) : (
                                        <div className="border border-slate-300 dark:border-slate-500 rounded-xl bg-white dark:bg-slate-700 max-h-48 overflow-y-auto">
                                            <div className="p-2 border-b border-slate-200 dark:border-slate-600 flex gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() => setAiEmployeeFilter(aiEmployeeOptionsByRole.map((o) => o.value))}
                                                    className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                                                >
                                                    Select all
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAiEmployeeFilter([])}
                                                    className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:underline"
                                                >
                                                    Clear
                                                </button>
                                                {aiEmployeeFilter.length > 0 && (
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        {aiEmployeeFilter.length} selected
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {aiEmployeeOptionsByRole.map(({ value, label, role }) => (
                                                    <label
                                                        key={value}
                                                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-600/50 cursor-pointer text-sm text-slate-700 dark:text-slate-300"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={aiEmployeeFilter.includes(value)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setAiEmployeeFilter((prev) => [...prev, value]);
                                                                } else {
                                                                    setAiEmployeeFilter((prev) => prev.filter((id) => id !== value));
                                                                }
                                                            }}
                                                            className="rounded border-slate-300 dark:border-slate-500 text-primary-600 focus:ring-primary-500 dark:accent-primary-400"
                                                        />
                                                        <span className="flex-1">{label}</span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0" title={role}>
                                                            {role}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Period type</label>
                                    <div className="flex gap-4">
                                        {(["date", "week", "month"] as const).map((type) => (
                                            <label key={type} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                                                <input
                                                    type="radio"
                                                    name="aiPeriodType"
                                                    checked={aiPeriodType === type}
                                                    onChange={() => setAiPeriodType(type)}
                                                    className="text-primary-600 focus:ring-primary-500 dark:accent-primary-400"
                                                />
                                                <span className="text-sm font-medium capitalize">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {aiPeriodType === "date" && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date</label>
                                        <input
                                            type="date"
                                            value={aiSelectedDate}
                                            onChange={(e) => setAiSelectedDate(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-500 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                )}

                                {aiPeriodType === "week" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Month</label>
                                            <select
                                                value={aiSelectedMonth}
                                                onChange={(e) => setAiSelectedMonth(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-500 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                                            >
                                                <option value="">Select month</option>
                                                {filterOptions.months.map(({ value, label }) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Week of month</label>
                                            <select
                                                value={aiSelectedWeek}
                                                onChange={(e) => setAiSelectedWeek(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-500 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                                            >
                                                <option value="">Select week</option>
                                                {[1, 2, 3, 4, 5].map((w) => (
                                                    <option key={w} value={String(w)}>Week {w}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {aiPeriodType === "month" && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Month</label>
                                        <select
                                            value={aiSelectedMonth}
                                            onChange={(e) => setAiSelectedMonth(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-500 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                                        >
                                            <option value="">Select month</option>
                                            {filterOptions.months.map(({ value, label }) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={generateAISummary}
                                    disabled={aiLoading || (aiPeriodType === "date" && !aiSelectedDate) || (aiPeriodType === "month" && !aiSelectedMonth) || (aiPeriodType === "week" && (!aiSelectedMonth || !aiSelectedWeek))}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {aiLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Generating summary...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Generate summary
                                        </>
                                    )}
                                </button>

                                {aiError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                                        {aiError}
                                    </div>
                                )}

                                {aiSummary && (
                                    <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                                        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                                Summary
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setShowSummaryExpanded(true)}
                                                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 transition-colors"
                                                title="Expand summary"
                                            >
                                                <Maximize2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-h-64 overflow-y-auto prose prose-slate dark:prose-invert prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 max-w-none">
                                            <ReactMarkdown>{aiSummary}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Expanded Summary Preview Modal */}
            <AnimatePresence>
                {showSummaryExpanded && aiSummary && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm !mt-0">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-600 flex flex-col"
                        >
                            <div className="p-4 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 shrink-0">
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Summary</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowSummaryExpanded(false)}
                                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors text-slate-600 dark:text-slate-300"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 text-slate-700 dark:text-slate-300 prose prose-slate dark:prose-invert prose-p:my-3 prose-headings:my-4 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 max-w-none">
                                <ReactMarkdown>{aiSummary}</ReactMarkdown>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
