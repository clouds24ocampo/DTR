/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    ChevronDown,
    Filter,
    Plus,
    X,
    Trophy,
    BarChart3,
    TrendingUp,
    Star,
    Calendar,
    User,
    FileText,
    Trash2,
    Edit,
    CheckCircle,
    Clock,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useFetchData } from "../../../hooks/useFetchData";
import { DataTable } from "../../../components/common/DataTable";
import { formatDate } from "../../../utils/global/dateFormatter";
import { AnimatePresence, motion } from "framer-motion";
import {
    containerVariants,
    itemVariants,
} from "../../../utils/global/pageMotion";
import Chatbot from "../../../components/common/ChatBot";
import { fetchPerformanceReviews, deletePerformanceReview } from "../../../api/hr/performance.api";
import { PerformanceReviewModal } from "../../../components/global/modals/hr/PerformanceReviewModal";
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import SearchToolbar from "../../../components/ui/SearchToolbar";
import EmptyState from "../../../components/ui/EmptyState";
import SkeletonGrid from "../../../components/ui/SkeletonGrid";

interface FilterState {
    search: string;
    status: string;
    period: string;
    rating: string;
}

interface PerformanceReview {
    _id: string;
    employee: any;
    employeeName: string;
    reviewer: any;
    reviewerName: string;
    reviewPeriod: {
        label: string;
        start: string;
        end: string;
    };
    overallScore?: number;
    overallRating?: string;
    status: "draft" | "pending" | "completed" | "acknowledged";
    createdAt: string;
    updatedAt?: string;
    kpis?: any[];
}

export default function PerformanceManagement() {
    const { filteredEmployee, loading: employeesLoading } = useFetchData();
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [isOpenSideBar, setIsOpenSideBar] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
    const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);

    const loadReviews = async () => {
        setReviewsLoading(true);
        const response = await fetchPerformanceReviews();
        if (response && response.success) {
            setPerformanceReviews(response.data);
        }
        setReviewsLoading(false);
    };

    useEffect(() => {
        loadReviews();
    }, []);

    const fetchLoading = employeesLoading || reviewsLoading;

    const [filters, setFilters] = useState<FilterState>({
        search: "",
        status: "all",
        period: "all",
        rating: "all",
    });

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const clearAllFilters = () => {
        setFilters({
            search: "",
            status: "all",
            period: "all",
            rating: "all",
        });
    };

    const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
        if (key === "search") return value.trim() !== "";
        return value !== "all";
    });

    // Filter performance reviews
    const filteredReviews = useMemo(() => {
        let result = [...performanceReviews];

        // Search filter
        if (filters.search.trim()) {
            const searchLower = filters.search.toLowerCase().trim();
            result = result.filter((review) => {
                const employeeName = (review.employeeName || "").toLowerCase();
                const reviewerName = (review.reviewerName || "").toLowerCase();
                const periodLabel = (review.reviewPeriod?.label || "").toLowerCase();

                return (
                    employeeName.includes(searchLower) ||
                    reviewerName.includes(searchLower) ||
                    periodLabel.includes(searchLower)
                );
            });
        }

        // Status filter
        if (filters.status !== "all") {
            result = result.filter((review) => review.status === filters.status);
        }

        // Period filter
        if (filters.period !== "all") {
            result = result.filter(
                (review) => review.reviewPeriod?.label === filters.period
            );
        }

        // Rating filter
        if (filters.rating !== "all") {
            result = result.filter((review) => review.overallRating === filters.rating);
        }

        return result;
    }, [performanceReviews, filters]);

    // Extract unique periods for filter
    const uniquePeriods = useMemo(() => {
        return [
            ...new Set(
                performanceReviews
                    .map((review) => review.reviewPeriod?.label)
                    .filter(Boolean)
            ),
        ].sort();
    }, [performanceReviews]);

    const getStatusBadge = (status: string) => {
        const configs: Record<
            string,
            { bg: string; text: string; border: string; label: string }
        > = {
            draft: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", label: "Draft" },
            pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Pending Approval" },
            completed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Completed" },
            acknowledged: {
                bg: "bg-blue-50",
                text: "text-blue-700",
                border: "border-blue-200",
                label: "Acknowledged",
            },
        };

        const config = configs[status] || configs.draft;

        return (
            <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} shadow-sm`}
            >
                {config.label}
            </span>
        );
    };

    const getRatingBadge = (rating?: string) => {
        if (!rating) return <span className="text-slate-400 text-sm italic">Not rated</span>;

        const configs: Record<
            string,
            { bg: string; text: string; border: string; label: string; stars: number }
        > = {
            outstanding: {
                bg: "bg-purple-50",
                text: "text-purple-700",
                border: "border-purple-200",
                label: "Outstanding",
                stars: 5,
            },
            exceeds: {
                bg: "bg-indigo-50",
                text: "text-indigo-700",
                border: "border-indigo-200",
                label: "Exceeds Expectations",
                stars: 4,
            },
            meets: {
                bg: "bg-blue-50",
                text: "text-blue-700",
                border: "border-blue-200",
                label: "Meets Expectations",
                stars: 3,
            },
            "needs-improvement": {
                bg: "bg-amber-50",
                text: "text-amber-700",
                border: "border-amber-200",
                label: "Needs Improvement",
                stars: 2,
            },
            unsatisfactory: {
                bg: "bg-rose-50",
                text: "text-rose-700",
                border: "border-rose-200",
                label: "Unsatisfactory",
                stars: 1,
            },
        };

        const config = configs[rating] || configs.meets;

        return (
            <div className="flex flex-col gap-1.5">
                <span
                    className={`inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border ${config.bg} ${config.text} ${config.border}`}
                >
                    {config.label}
                </span>
                <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < config.stars ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-gray-100"}`}
                        />
                    ))}
                </div>
            </div>
        );
    };

    // Statistics Cards
    const stats = useMemo(() => {
        const total = performanceReviews.length;
        const completed = performanceReviews.filter((r) => r.status === "completed")
            .length;
        const pending = performanceReviews.filter((r) => r.status === "pending")
            .length;
        const avgScore =
            performanceReviews.length > 0
                ? (
                    performanceReviews.reduce(
                        (sum, r) => sum + (r.overallScore || 0),
                        0
                    ) / performanceReviews.length
                ).toFixed(1)
                : "0";

        return { total, completed, pending, avgScore };
    }, [performanceReviews]);

    const handleRowClick = (review: PerformanceReview) => {
        setSelectedReview(review);
        setIsModalOpen(true);
    };

    const handleDeleteReview = async (reviewId: string) => {
        if (!window.confirm("Are you sure you want to delete this performance review?")) return;

        try {
            const result = await deletePerformanceReview(reviewId);
            if (result.success) {
                toast.success("Review deleted successfully");
                loadReviews();
            } else {
                toast.error(result.message || "Failed to delete review");
            }
        } catch {
            toast.error("An error occurred while deleting");
        }
    };

    const handleCreateReview = () => {
        setSelectedReview(null);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        loadReviews();
    };

    const columns = [
        {
            key: "employee",
            header: "Employee",
            render: (_value: any, row: PerformanceReview) => {
                const empId = typeof row.employee === 'string' ? row.employee : row.employee?._id;
                const employee = filteredEmployee.find((emp) => emp._id === empId);

                // Get initials from found employee or fallback to employeeName
                let initials = "";
                if (employee) {
                    initials = ((employee.firstName[0] || "") + (employee.lastName[0] || "")).toUpperCase();
                } else if (row.employeeName) {
                    const names = row.employeeName.split(" ");
                    initials = (
                        (names[0]?.charAt(0) || "") +
                        (names[names.length - 1]?.charAt(0) || "")
                    ).toUpperCase();
                }

                return (
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
                            {employee?.profilePicture ? (
                                <img
                                    src={employee.profilePicture}
                                    alt={row.employeeName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-white font-semibold text-sm">
                                    {initials}
                                </span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 truncate">
                                {row.employeeName}
                            </p>
                            <p className="text-sm text-slate-500 truncate">
                                {employee?.position || "—"}
                            </p>
                        </div>
                    </div>
                );
            },
        },
        {
            key: "period",
            header: "Review Period",
            render: (_value: any, row: PerformanceReview) => (
                <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">
                            {row.reviewPeriod?.label || "—"}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">
                        {row.reviewPeriod?.start && row.reviewPeriod?.end
                            ? `${formatDate(row.reviewPeriod.start)} - ${formatDate(
                                row.reviewPeriod.end
                            )}`
                            : "—"}
                    </p>
                </div>
            ),
        },
        {
            key: "reviewer",
            header: "Reviewer",
            render: (_value: any, row: PerformanceReview) => (
                <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-900">{row.reviewerName}</span>
                </div>
            ),
        },
        {
            key: "score",
            header: "Overall Score",
            render: (_value: any, row: PerformanceReview) => {
                const score = row.overallScore;
                return (
                    <div className="flex items-center space-x-2">
                        {score !== undefined ? (
                            <>
                                <BarChart3 className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-semibold text-slate-900">
                                    {score.toFixed(1)}%
                                </span>
                            </>
                        ) : (
                            <span className="text-sm text-slate-400">—</span>
                        )}
                    </div>
                );
            },
        },
        {
            key: "rating",
            header: "Rating",
            render: (_value: any, row: PerformanceReview) =>
                getRatingBadge(row.overallRating),
        },
        {
            key: "status",
            header: "Status",
            render: (_value: any, row: PerformanceReview) =>
                getStatusBadge(row.status),
        },
        {
            key: "date",
            header: "Last Updated",
            render: (_value: any, row: PerformanceReview) => (
                <div className="text-sm text-slate-900">
                    {formatDate(row.updatedAt || row.createdAt)}
                </div>
            ),
        },
        {
            key: "actions",
            header: "Actions",
            render: (_value: any, row: PerformanceReview) => (
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => handleRowClick(row)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Review"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDeleteReview(row._id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Review"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <motion.div
            className="space-y-6 pb-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <Toaster />

            <PerformanceReviewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                review={selectedReview}
            />

            {/* Header Section */}
            <motion.div variants={itemVariants}>
                <PageHeader
                    icon={Trophy}
                    tint="blue"
                    eyebrow="Growth"
                    title="Performance Management"
                    subtitle="Track and manage employee performance reviews and KPIs"
                    actions={
                        <button
                            onClick={handleCreateReview}
                            className="hidden md:flex items-center justify-center w-full sm:w-auto space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Review</span>
                        </button>
                    }
                />

                <button
                    onClick={() => {
                        handleCreateReview();
                        setIsOpenSideBar((prev) => !prev);
                    }}
                    className={`fixed bottom-6 right-6 flex items-center justify-center w-12 h-12 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white transition-transform duration-300 hover:scale-110 sm:hidden z-50 ${isOpenSideBar ? "rotate-45" : "rotate-0"
                        }`}
                >
                    <Plus className="w-4 h-4" />
                </button>
            </motion.div>

            {/* Statistics Cards */}
            <motion.div
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                variants={itemVariants}
            >
                <StatCard
                    title="Total Reviews"
                    value={stats.total}
                    subtitle="All time appraisals"
                    icon={FileText}
                    color="blue"
                />
                <StatCard
                    title="Completed"
                    value={stats.completed}
                    subtitle="Successfully finalized"
                    icon={CheckCircle}
                    color="green"
                />
                <StatCard
                    title="Pending"
                    value={stats.pending}
                    subtitle="Awaiting action"
                    icon={Clock}
                    color="yellow"
                />
                <StatCard
                    title="Avg. Score"
                    value={`${stats.avgScore}%`}
                    subtitle="Team performance"
                    icon={TrendingUp}
                    color="purple"
                />
            </motion.div>

            {/* Toolbar (search + filters) */}
            <motion.div variants={itemVariants}>
                <SearchToolbar
                    value={filters.search}
                    onChange={(value) => handleFilterChange("search", value)}
                    placeholder="Search employees, reviewers, or periods..."
                >
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                        <Filter className="h-4 w-4 text-slate-500" aria-hidden />
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange("status", e.target.value)}
                            className="cursor-pointer bg-transparent text-sm font-medium text-slate-700 outline-none"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="acknowledged">Acknowledged</option>
                        </select>
                    </div>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-all shadow-sm ${showAdvancedFilters
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        <span>More Filters</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
                    </button>
                    {hasActiveFilters && (
                        <button
                            onClick={clearAllFilters}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <X className="w-4 h-4" />
                            <span>Clear Filters</span>
                        </button>
                    )}
                </SearchToolbar>
            </motion.div>

            {/* Filters + Table Section */}
            <motion.div
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] mt-5 overflow-hidden"
                variants={itemVariants}
            >
                <div className="pb-5 border-b border-slate-200/80">

                    {/* Advanced Filters Panel */}
                    <AnimatePresence>
                        {showAdvancedFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-200">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Review Period</label>
                                        <select
                                            value={filters.period}
                                            onChange={(e) => handleFilterChange("period", e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="all">All Periods</option>
                                            {uniquePeriods.map((p) => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Rating Category</label>
                                        <select
                                            value={filters.rating}
                                            onChange={(e) => handleFilterChange("rating", e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="all">All Ratings</option>
                                            <option value="outstanding">Outstanding (5.0)</option>
                                            <option value="exceeds">Exceeds Expectations (4.0)</option>
                                            <option value="meets">Meets Expectations (3.0)</option>
                                            <option value="needs-improvement">Needs Improvement (2.0)</option>
                                            <option value="unsatisfactory">Unsatisfactory (1.0)</option>
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Results Info */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-xs text-slate-500 font-medium">
                            {fetchLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    <span>Syncing records...</span>
                                </div>
                            ) : (
                                <span>Showing {filteredReviews.length} results found</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Data Table Section */}
                <motion.div variants={itemVariants}>
                    {fetchLoading ? (
                        <SkeletonGrid count={5} columns="sm:grid-cols-2 lg:grid-cols-3" />
                    ) : (
                        <div className="overflow-x-auto">
                            <div className="min-w-[800px] sm:min-w-full">
                                <DataTable
                                    data={filteredReviews}
                                    columns={columns}
                                    onRowClick={handleRowClick}
                                />
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Empty State */}
                {!fetchLoading && filteredReviews.length === 0 && (
                    <motion.div variants={itemVariants}>
                        <EmptyState
                            icon={Trophy}
                            title={
                                hasActiveFilters
                                    ? "No reviews match your filters"
                                    : performanceReviews.length === 0
                                        ? "No performance reviews yet"
                                        : "No reviews found"
                            }
                            message={
                                hasActiveFilters
                                    ? "Try adjusting your filters to see more results."
                                    : performanceReviews.length === 0
                                        ? "Get started by creating your first performance review."
                                        : "No reviews match the current criteria."
                            }
                            action={
                                hasActiveFilters ? (
                                    <button
                                        onClick={clearAllFilters}
                                        className="font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                    >
                                        Clear all filters
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCreateReview}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-sm"
                                    >
                                        Create First Review
                                    </button>
                                )
                            }
                        />
                    </motion.div>
                )}
            </motion.div>

            <Chatbot />
        </motion.div>
    );
}
