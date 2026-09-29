import { CheckCircle, Clock, TrendingUp, Target } from "lucide-react";
import type { IProgressReportDoc } from "../../../api/global/progress/progress.api";

type Props = {
    reports: IProgressReportDoc[];
};

export default function ProgressSummaryCards({ reports }: Props) {
    const today = new Date().toISOString().split("T")[0];

    const stats = {
        total: reports.length,
        submittedToday: reports.filter(r => r.date === today && r.status === "submitted").length,
        pending: reports.filter(r => r.status === "submitted").length,
        reviewed: reports.filter(r => r.status === "reviewed").length,
    };

    // Calculate average completion rate
    const completionRates = reports
        .flatMap(r => r.tasks)
        .map(t => t.completionPercentage || 0);
    const avgCompletion = completionRates.length > 0
        ? Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length)
        : 0;

    const cards = [
        {
            label: "Total Reports",
            value: stats.total,
            icon: Target,
            gradient: "from-blue-500 to-cyan-500",
            bg: "bg-blue-50",
            iconBg: "bg-blue-500",
            border: "border-blue-100",
        },
        {
            label: "Submitted Today",
            value: stats.submittedToday,
            icon: Clock,
            gradient: "from-amber-500 to-orange-500",
            bg: "bg-amber-50",
            iconBg: "bg-amber-500",
            border: "border-amber-100",
        },
        {
            label: "Reviewed",
            value: stats.reviewed,
            icon: CheckCircle,
            gradient: "from-emerald-500 to-teal-500",
            bg: "bg-emerald-50",
            iconBg: "bg-emerald-500",
            border: "border-emerald-100",
        },
        {
            label: "Avg. Completion",
            value: `${avgCompletion}%`,
            icon: TrendingUp,
            gradient: "from-violet-500 to-purple-500",
            bg: "bg-violet-50",
            iconBg: "bg-violet-500",
            border: "border-violet-100",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, idx) => {
                const Icon = card.icon;
                return (
                    <div
                        key={idx}
                        className={`relative overflow-hidden rounded-lg border ${card.border} ${card.bg} p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200 group`}
                    >
                        {/* Background decoration */}
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.gradient} opacity-5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500`} />

                        <div className="relative flex items-center justify-between">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                    {card.label}
                                </p>
                                <p className="text-3xl font-black text-slate-800 tracking-tight">
                                    {card.value}
                                </p>
                            </div>

                            <div className={`p-3 rounded-lg ${card.iconBg} shadow-sm group-hover:scale-110 transition-transform`}>
                                <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
