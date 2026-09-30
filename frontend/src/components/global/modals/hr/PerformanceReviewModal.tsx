/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Calculator, Info, User, Trophy, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import {
    backdropVariants,
    modalVariants,
} from "../../../../utils/global/motionVariants";
import { ModalHeader } from "../ModalHeader";
import { ModalFooter } from "../ModalFooter";
import { useFetchData } from "../../../../hooks/useFetchData";
import useAuthStore from "../../../../stores/auth/auth.store";
import { createPerformanceReview, updatePerformanceReview } from "../../../../api/hr/performance.api";

interface PerformanceReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    review?: any;
    onSuccess: () => void;
}

const initialKPI = {
    name: "",
    description: "",
    targetValue: 100,
    actualValue: 0,
    weight: 0,
    rating: 3,
    comments: "",
};

export const PerformanceReviewModal: React.FC<PerformanceReviewModalProps> = ({
    isOpen,
    onClose,
    review,
    onSuccess,
}) => {
    const isEdit = !!review;
    const { filteredEmployee } = useFetchData();
    const { account: currentUser } = useAuthStore();

    const [formData, setFormData] = useState<any>({
        employee: "",
        employeeName: "",
        reviewer: "",
        reviewerName: "",
        reviewPeriod: {
            start: "",
            end: "",
            label: "",
        },
        kpis: [{ ...initialKPI }],
        strengths: "",
        areasForImprovement: "",
        goals: "",
        reviewerComments: "",
        status: "draft",
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (review) {
            const empId = review.employeeId || (typeof review.employee === 'string' ? review.employee : review.employee?._id);
            const revId = review.reviewerId || (typeof review.reviewer === 'string' ? review.reviewer : review.reviewer?._id);

            setFormData({
                ...review,
                employee: empId,
                reviewer: revId,
                reviewPeriod: {
                    ...review.reviewPeriod,
                    start: review.reviewPeriod?.start ? new Date(review.reviewPeriod.start).toISOString().split('T')[0] : "",
                    end: review.reviewPeriod?.end ? new Date(review.reviewPeriod.end).toISOString().split('T')[0] : "",
                    label: review.reviewPeriod?.label || "",
                }
            });
        } else {
            setFormData({
                employee: "",
                employeeName: "",
                reviewer: currentUser?._id || "",
                reviewerName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "",
                reviewPeriod: {
                    start: "",
                    end: "",
                    label: "",
                },
                kpis: [{ ...initialKPI }],
                strengths: "",
                areasForImprovement: "",
                goals: "",
                reviewerComments: "",
                status: "draft",
            });
        }
    }, [review, isOpen, currentUser]);

    const handleKpiChange = (index: number, field: string, value: any) => {
        const updatedKpis = [...formData.kpis];
        updatedKpis[index] = { ...updatedKpis[index], [field]: value };
        setFormData((prev: any) => ({ ...prev, kpis: updatedKpis }));
    };

    const addKpi = () => {
        setFormData((prev: any) => ({
            ...prev,
            kpis: [...prev.kpis, { ...initialKPI }],
        }));
    };

    const removeKpi = (index: number) => {
        if (formData.kpis.length === 1) {
            toast.error("At least one KPI is required");
            return;
        }
        const updatedKpis = formData.kpis.filter((_: any, i: number) => i !== index);
        setFormData((prev: any) => ({ ...prev, kpis: updatedKpis }));
    };

    const calculateOverallScore = () => {
        let totalWeight = 0;
        let weightedScore = 0;

        formData.kpis.forEach((kpi: any) => {
            const weight = Number(kpi.weight) || 0;
            const rating = Number(kpi.rating) || 0;
            totalWeight += weight;
            weightedScore += (rating / 5) * 100 * (weight / 100);
        });

        if (totalWeight === 0) return 0;
        return weightedScore * (100 / totalWeight);
    };

    const overallScore = useMemo(() => calculateOverallScore(), [formData.kpis]);

    const getOverallRating = (score: number) => {
        if (score >= 90) return "outstanding";
        if (score >= 80) return "exceeds";
        if (score >= 60) return "meets";
        if (score >= 40) return "needs-improvement";
        return "unsatisfactory";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.employee) return toast.error("Please select an employee");
        if (!formData.reviewPeriod.start || !formData.reviewPeriod.end || !formData.reviewPeriod.label) {
            return toast.error("Please complete the review period details");
        }

        const totalWeight = formData.kpis.reduce((sum: number, kpi: any) => sum + (Number(kpi.weight) || 0), 0);
        if (totalWeight !== 100 && formData.kpis.length > 0) {
            return toast.error(`Total KPI weight must be 100%. Current: ${totalWeight}%`);
        }

        setLoading(true);

        const payload = {
            ...formData,
            overallScore: parseFloat(overallScore.toFixed(2)),
            overallRating: getOverallRating(overallScore),
        };

        try {
            const result = isEdit
                ? await updatePerformanceReview(review._id, payload)
                : await createPerformanceReview(payload);

            if (result.success) {
                toast.success(isEdit ? "Review updated" : "Review created");
                onSuccess();
                onClose();
            } else {
                toast.error(result.message || "Failed to save review");
            }
        } catch {
            toast.error("An error occurred while saving");
        } finally {
            setLoading(false);
        }
    };

    const handleEmployeeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const empId = e.target.value;
        const emp = filteredEmployee.find((ems: any) => ems._id === empId);
        if (emp) {
            setFormData((prev: any) => ({
                ...prev,
                employee: empId,
                employeeName: `${emp.firstName} ${emp.lastName}`
            }));
        } else {
            setFormData((prev: any) => ({ ...prev, employee: "", employeeName: "" }));
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 !mt-0"
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={onClose}
            >
                <motion.div
                    className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100"
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={(e) => e.stopPropagation()}
                >
                    <ModalHeader
                        title={isEdit ? "Update Performance Review" : "Create New Performance Review"}
                        subtitle={isEdit ? `Modifying appraisal for ${formData.employeeName}` : "Setup a new employee performance appraisal"}
                        onClose={onClose}
                    />

                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-gray-50/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                {/* Employee Selection */}
                                <div className="card-dashboard space-y-4">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4 text-blue-500" />
                                        Appraisal Participants
                                    </h3>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                                            Target Employee
                                        </label>
                                        <select
                                            value={formData.employee}
                                            onChange={handleEmployeeSelect}
                                            disabled={isEdit}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100"
                                            required
                                        >
                                            <option value="">Select Employee</option>
                                            {filteredEmployee.map((emp: any) => (
                                                <option key={emp._id} value={emp._id}>
                                                    {emp.firstName} {emp.lastName} ({emp.idNumber})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Review Period */}
                                <div className="card-dashboard space-y-4">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <Calendar className="w-4 h-4 text-blue-500" />
                                        Review Timeline
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                                                Start Date
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.reviewPeriod.start}
                                                onChange={(e) => setFormData((prev: any) => ({
                                                    ...prev,
                                                    reviewPeriod: { ...prev.reviewPeriod, start: e.target.value }
                                                }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                                                End Date
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.reviewPeriod.end}
                                                onChange={(e) => setFormData((prev: any) => ({
                                                    ...prev,
                                                    reviewPeriod: { ...prev.reviewPeriod, end: e.target.value }
                                                }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                                            Period Label (e.g. Q1 2024)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Annual Review 2024"
                                            value={formData.reviewPeriod.label}
                                            onChange={(e) => setFormData((prev: any) => ({
                                                ...prev,
                                                reviewPeriod: { ...prev.reviewPeriod, label: e.target.value }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* KPIs Section */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-amber-500" />
                                            Key Performance Indicators (KPIs)
                                        </h3>
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-300 ${formData.kpis.reduce((sum: number, kpi: any) => sum + (Number(kpi.weight) || 0), 0) === 100
                                                        ? "bg-emerald-500"
                                                        : "bg-amber-500"
                                                        }`}
                                                    style={{ width: `${Math.min(formData.kpis.reduce((sum: number, kpi: any) => sum + (Number(kpi.weight) || 0), 0), 100)}%` }}
                                                />
                                            </div>
                                            <span className={`text-[10px] font-bold ${formData.kpis.reduce((sum: number, kpi: any) => sum + (Number(kpi.weight) || 0), 0) === 100
                                                ? "text-emerald-600"
                                                : "text-amber-600"
                                                }`}>
                                                {formData.kpis.reduce((sum: number, kpi: any) => sum + (Number(kpi.weight) || 0), 0)}% / 100% Weight
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addKpi}
                                        className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add KPI
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.kpis.map((kpi: any, index: number) => (
                                        <div key={index} className="card-dashboard p-6 relative group">
                                            <button
                                                type="button"
                                                onClick={() => removeKpi(index)}
                                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>

                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                <div className="md:col-span-4">
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                                        KPI Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={kpi.name}
                                                        onChange={(e) => handleKpiChange(index, "name", e.target.value)}
                                                        placeholder="e.g. Sales Target"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                        required
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                                        Weight (%)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={kpi.weight}
                                                        onChange={(e) => handleKpiChange(index, "weight", parseInt(e.target.value))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        min="0"
                                                        max="100"
                                                        required
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                                        Target
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={kpi.targetValue}
                                                        onChange={(e) => handleKpiChange(index, "targetValue", parseInt(e.target.value))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        required
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                                        Actual
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={kpi.actualValue}
                                                        onChange={(e) => handleKpiChange(index, "actualValue", parseInt(e.target.value))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                                        Rating (1-5)
                                                    </label>
                                                    <select
                                                        value={kpi.rating}
                                                        onChange={(e) => handleKpiChange(index, "rating", parseInt(e.target.value))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    >
                                                        <option value="1">1 - Poor</option>
                                                        <option value="2">2 - Fair</option>
                                                        <option value="3">3 - Good</option>
                                                        <option value="4">4 - Very Good</option>
                                                        <option value="5">5 - Excellent</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-12">
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                                        Comments / Appraisal Note
                                                    </label>
                                                    <textarea
                                                        value={kpi.comments}
                                                        onChange={(e) => handleKpiChange(index, "comments", e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                            Strengths
                                        </label>
                                        <textarea
                                            value={formData.strengths}
                                            onChange={(e) => setFormData((prev: any) => ({ ...prev, strengths: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            rows={3}
                                            placeholder="What did the employee do exceptionally well?"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                            Areas for Improvement
                                        </label>
                                        <textarea
                                            value={formData.areasForImprovement}
                                            onChange={(e) => setFormData((prev: any) => ({ ...prev, areasForImprovement: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            rows={3}
                                            placeholder="Where can the employee grow?"
                                        />
                                    </div>
                                </div>

                                <div className="card-dashboard p-6 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <Calculator className="w-5 h-5 text-blue-500" />
                                            Outcome Summary
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-100">
                                                <span className="text-sm text-slate-500">Overall Score</span>
                                                <span className="text-xl font-bold text-blue-600">{overallScore.toFixed(1)}%</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-100">
                                                <span className="text-sm text-slate-500">Calculated Rating</span>
                                                <span className="capitalize font-semibold text-slate-900">{getOverallRating(overallScore).replace('-', ' ')}</span>
                                            </div>
                                            <div className="bg-blue-50 p-3 rounded-lg flex gap-2">
                                                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                                <p className="text-xs text-blue-700">
                                                    Overall score is calculated based on weighted average of KPI ratings. Ensure total weight equals 100%.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                            Status
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData((prev: any) => ({ ...prev, status: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                                        >
                                            <option value="draft">Draft - Keep private</option>
                                            <option value="pending">Pending - Review in progress</option>
                                            <option value="completed">Completed - Finalized</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <ModalFooter
                            primaryButtonText={isEdit ? "Update Review" : "Save Review"}
                            primaryButtonLoadingText="Saving..."
                            onPrimaryClick={() => { }}
                            onCancelClick={onClose}
                            loading={loading}
                            showCancel={true}
                        />
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
