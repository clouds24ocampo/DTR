import { AlertTriangle, CheckCircle, Clock, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";
import type { Report as IReport } from "../../../types/global/report/report.types";

interface Props {
  reports: IReport[];
  activeFilter?: string | null;
  onFilterChange?: (filter: string | null) => void;
}

export default function ReportSummaryCards({
  reports,
  activeFilter,
  onFilterChange
}: Props) {
  const openCount = reports.filter((r) => r.status === "open").length;
  const inProgressCount = reports.filter(
    (r) => r.status === "in-progress"
  ).length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;
  const closedCount = reports.filter((r) => r.status === "closed").length;
  const highPriorityCount = reports.filter((r) => r.priority === "high").length;

  const summaryData = [
    {
      id: "status:open",
      label: "Open Cases",
      count: openCount,
      sublabel: "Needs Review",
      icon: AlertTriangle,
      color: "orange",
      gradient: "from-orange-500 to-amber-500"
    },
    {
      id: "status:in-progress",
      label: "In Progress",
      count: inProgressCount,
      sublabel: "Active Handling",
      icon: Clock,
      color: "blue",
      gradient: "from-blue-500 to-indigo-500"
    },
    {
      id: "status:resolved",
      label: "Resolved",
      count: resolvedCount,
      sublabel: "Success Rate",
      icon: CheckCircle,
      color: "emerald",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      id: "status:closed",
      label: "Archived",
      count: closedCount,
      sublabel: "Historical Data",
      icon: ShieldCheck,
      color: "slate",
      gradient: "from-slate-500 to-slate-700"
    },
    {
      id: "priority:high",
      label: "Critical",
      count: highPriorityCount,
      sublabel: "Urgent Priority",
      icon: Zap,
      color: "rose",
      gradient: "from-rose-500 to-red-600"
    }
  ];

  const handleCardClick = (filterId: string) => {
    if (onFilterChange) {
      onFilterChange(activeFilter === filterId ? null : filterId);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {summaryData.map((card) => {
        const isActive = activeFilter === card.id;
        const Icon = card.icon;

        return (
          <motion.div
            key={card.id}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick(card.id)}
            className={`relative overflow-hidden group cursor-pointer rounded-lg border transition-all duration-300 ${isActive
              ? "bg-white border-transparent shadow-xl ring-2 ring-offset-2 ring-blue-500"
              : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-md shadow-sm"
              }`}
          >
            {/* Background Decorative Gradient */}
            {isActive && (
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.gradient}`} />
            )}

            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-lg transition-colors duration-300 ${isActive
                  ? `bg-gradient-to-br ${card.gradient} text-white`
                  : `bg-${card.color}-50 text-${card.color}-600 group-hover:bg-${card.color}-100`
                  }`}>
                  <Icon className="w-5 h-5" />
                </div>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-blue-500"
                  />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  {card.label}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black tracking-tight ${isActive ? "text-slate-800" : "text-slate-800"
                    }`}>
                    {card.count}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 italic">
                    {card.sublabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Hover Indicator */}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r ${card.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
          </motion.div>
        );
      })}
    </div>
  );
}
