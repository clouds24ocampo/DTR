import { CheckCircle2, Clock, MinusCircle, XCircle } from "lucide-react";
import { useMemo } from "react";
import type {
  ILeaveRequestDoc,
  LeaveStatus,
} from "../../../types/global/leave/leave.type";
import { motion } from "framer-motion";

interface Props {
  leaves: ILeaveRequestDoc[];
}

export default function LeaveSummaryCards({ leaves }: Props) {
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
      label: "Pending",
      count: counts.pending,
      sublabel: "Waiting for a decision",
      icon: Clock,
      color: "amber",
      gradient: "from-amber-500 to-orange-500"
    },
    {
      id: "approved",
      label: "Approved",
      count: counts.approved,
      sublabel: "Leave granted",
      icon: CheckCircle2,
      color: "emerald",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      id: "rejected",
      label: "Declined",
      count: counts.rejected,
      sublabel: "Not granted",
      icon: XCircle,
      color: "rose",
      gradient: "from-rose-500 to-red-600"
    },
    {
      id: "canceled",
      label: "Cancelled",
      count: counts.canceled,
      sublabel: "Withdrawn by you",
      icon: MinusCircle,
      color: "slate",
      gradient: "from-slate-500 to-slate-700"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {summaryData.map((card) => {
        const Icon = card.icon;

        return (
          <motion.div
            key={card.id}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`relative overflow-hidden group rounded-lg border transition-all duration-300 bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md shadow-sm`}
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-lg bg-${card.color}-50 text-${card.color}-600 group-hover:bg-${card.color}-100 transition-colors duration-300`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none">
                  {card.label}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-slate-800">
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
