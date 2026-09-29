/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    ChevronDown,
    Filter,
    Plus,
    Search,
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
    Activity,
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
            draft: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", label: "Draft" },
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
        if (!rating) return <span className="text-gray-400 text-sm italic">Not rated</span>;

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
                            className={`w-3.5 h-3.5 ${i < config.stars ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-100"}`}
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
        } catch (error) {
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
                            <p className="font-semibold text-gray-900 truncate">
                                {row.employeeName}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
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
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                            {row.reviewPeriod?.label || "—"}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500">
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
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{row.reviewerName}</span>
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
                                <span className="text-sm font-semibold text-gray-900">
                                    {score.toFixed(1)}%
                                </span>
                            </>
                        ) : (
                            <span className="text-sm text-gray-400">—</span>
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
                <div className="text-sm text-gray-900">
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
            <motion.div
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                variants={itemVariants}
            >
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center space-x-2">
                        <span>Performance Management</span>
                    </h1>
                    <p className="text-gray-600 mt-1 text-sm sm:text-base">
                        Track and manage employee performance reviews and KPIs
                    </p>
                </div>

                <button
                    onClick={handleCreateReview}
                    className="hidden md:flex items-center justify-center w-full sm:w-auto space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Review</span>
                </button>

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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                variants={itemVariants}
            >
                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 bg-blue-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Reviews</p>
                            <p className="text-3xl font-extrabold text-gray-900 mt-1">
                                {stats.total}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-gray-500">
                        <Activity className="w-3.5 h-3.5 mr-1 text-blue-500" />
                        <span>All time appraisals</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 bg-emerald-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed</p>
                            <p className="text-3xl font-extrabold text-gray-900 mt-1">
                                {stats.completed}
                            </p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl">
                            <Trophy className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-gray-500">
                        <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                        <span>Successfully finalized</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 bg-amber-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending</p>
                            <p className="text-3xl font-extrabold text-gray-900 mt-1">
                                {stats.pending}
                            </p>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-xl">
                            <Calendar className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" />
                        <span>Awaiting action</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 bg-purple-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Avg. Score</p>
                            <p className="text-3xl font-extrabold text-gray-900 mt-1">
                                {stats.avgScore}%
                            </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-gray-500">
                        <Star className="w-3.5 h-3.5 mr-1 text-purple-500 fill-purple-500" />
                        <span>Team performance</span>
                    </div>
                </div>
            </motion.div>

            {/* Filters + Table Section */}
            <motion.div
                className="bg-white rounded-xl shadow-sm border border-gray-200 mt-5 overflow-hidden"
                variants={itemVariants}
            >
                <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50/30">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                            <div className="relative flex-1 min-w-[280px]">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search employees, reviewers, or periods..."
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange("search", e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                                />
                            </div>

                            <div className="flex gap-2">
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange("status", e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[140px] shadow-sm hover:border-gray-400 transition-colors"
                                >
                                    <option value="all">All Status</option>
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="acknowledged">Acknowledged</option>
                                </select>

                                <button
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all shadow-sm ${showAdvancedFilters
                                        ? "bg-blue-50 border-blue-200 text-blue-700"
                                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                        }`}
                                >
                                    <Filter className="w-4 h-4" />
                                    <span>More Filters</span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
                                </button>
                            </div>
                        </div>

                        {hasActiveFilters && (
                            <button
                                onClick={clearAllFilters}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <X className="w-4 h-4" />
                                <span>Clear Filters</span>
                            </button>
                        )}
                    </div>

                    {/* Advanced Filters Panel */}
                    <AnimatePresence>
                        {showAdvancedFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 mt-4 border-t border-gray-200">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Review Period</label>
                                        <select
                                            value={filters.period}
                                            onChange={(e) => handleFilterChange("period", e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="all">All Periods</option>
                                            {uniquePeriods.map((p) => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Rating Category</label>
                                        <select
                                            value={filters.rating}
                                            onChange={(e) => handleFilterChange("rating", e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                        <div className="text-xs text-gray-500 font-medium">
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
                    <div className="overflow-x-auto">
                        <div className="min-w-[800px] sm:min-w-full">
                            <DataTable
                                data={filteredReviews}
                                columns={columns}
                                onRowClick={handleRowClick}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Empty State */}
                {!fetchLoading && filteredReviews.length === 0 && (
                    <motion.div
                        className="text-center py-12 px-4"
                        variants={itemVariants}
                    >
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
                            <Trophy className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {hasActiveFilters
                                ? "No reviews match your filters"
                                : performanceReviews.length === 0
                                    ? "No performance reviews yet"
                                    : "No reviews found"}
                        </h3>
                        <p className="text-gray-500 mb-6 text-sm sm:text-base">
                            {hasActiveFilters
                                ? "Try adjusting your filters to see more results."
                                : performanceReviews.length === 0
                                    ? "Get started by creating your first performance review."
                                    : "No reviews match the current criteria."}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                onClick={clearAllFilters}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Clear all filters
                            </button>
                        ) : (
                            <button
                                onClick={handleCreateReview}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
                            >
                                Create First Review
                            </button>
                        )}
                    </motion.div>
                )}
            </motion.div>

            <Chatbot />
        </motion.div>
    );
}
