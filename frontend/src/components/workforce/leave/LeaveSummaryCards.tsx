import { CheckCircle2, Clock, MinusCircle, XCircle } from "lucide-react";
import { useMemo } from "react";
import { ILeaveRequestDoc, LeaveStatus } from "../../../types/global/leave/leave.type";
import { motion } from "framer-motion";

interface Props {
  leaves: ILeaveRequestDoc[];
  selectedStatus: LeaveStatus | "all";
  onStatusClick: (status: LeaveStatus | "all") => void;
}

export default function LeaveSummaryCards({
  leaves,
  selectedStatus,
  onStatusClick,
}: Props) {
  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, canceled: 0 } as Record<
      LeaveStatus,
      number
    >;
    for (const l of leaves) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leaves]);

  const summaryData = [
    {
      id: "pending",
      label: "Awaiting Review",
      count: counts.pending,
      sublabel: "Needs Attention",
      icon: Clock,
      color: "amber",
      gradient: "from-amber-500 to-orange-500"
    },
    {
      id: "approved",
      label: "Validated",
      count: counts.approved,
      sublabel: "Active Approvals",
      icon: CheckCircle2,
      color: "emerald",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      id: "rejected",
      label: "Declined",
      count: counts.rejected,
      sublabel: "Non-approved",
      icon: XCircle,
      color: "rose",
      gradient: "from-rose-500 to-red-600"
    },
    {
      id: "canceled",
      label: "Revoked",
      count: counts.canceled,
      sublabel: "Archived Requests",
      icon: MinusCircle,
      color: "slate",
      gradient: "from-slate-500 to-slate-700"
    }
  ];

  const handleCardClick = (status: LeaveStatus) => {
    onStatusClick(selectedStatus === status ? "all" : status);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {summaryData.map((card) => {
        const isActive = selectedStatus === card.id;
        const Icon = card.icon;

        return (
          <motion.div
            key={card.id}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick(card.id as LeaveStatus)}
            className={`relative overflow-hidden group cursor-pointer rounded-lg border transition-all duration-300 ${isActive
              ? "bg-white border-transparent shadow-xl ring-2 ring-offset-2 ring-indigo-500"
              : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md shadow-sm"
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
                    className="w-2 h-2 rounded-full bg-indigo-500"
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
