import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { itemVariants } from "../../../utils/global/pageMotion";

export type DTRStat = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "blue" | "green" | "purple" | "yellow" | "red" | "orange";
  description?: string;
};

interface DTRStatsProps {
  stats: DTRStat[];
}

export default function DTRStats({ stats }: DTRStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;

        const colorClasses = {
          blue: {
            bg: "bg-blue-50",
            iconBg: "bg-blue-100",
            iconText: "text-blue-600",
            valueText: "text-blue-700",
            border: "border-blue-100",
          },
          green: {
            bg: "bg-green-50",
            iconBg: "bg-green-100",
            iconText: "text-green-600",
            valueText: "text-green-700",
            border: "border-green-100",
          },
          purple: {
            bg: "bg-purple-50",
            iconBg: "bg-purple-100",
            iconText: "text-purple-600",
            valueText: "text-purple-700",
            border: "border-purple-100",
          },
          yellow: {
            bg: "bg-yellow-50",
            iconBg: "bg-yellow-100",
            iconText: "text-yellow-600",
            valueText: "text-yellow-700",
            border: "border-yellow-100",
          },
          red: {
            bg: "bg-red-50",
            iconBg: "bg-red-100",
            iconText: "text-red-600",
            valueText: "text-red-700",
            border: "border-red-100",
          },
          orange: {
            bg: "bg-orange-50",
            iconBg: "bg-orange-100",
            iconText: "text-orange-600",
            valueText: "text-orange-700",
            border: "border-orange-100",
          },
        }[s.color];

        return (
          <motion.div
            key={s.title}
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`relative overflow-hidden rounded-lg border ${colorClasses.border} ${colorClasses.bg} p-5 shadow-sm transition-all duration-200`}
          >
            {/* Background Decorative Element */}
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full ${colorClasses.iconBg} opacity-20`} />

            <div className="relative flex items-center space-x-4">
              <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${colorClasses.iconBg}`}>
                <Icon className={`h-6 w-6 ${colorClasses.iconText}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {s.title}
                </p>
                <h3 className={`truncate text-xl font-bold ${colorClasses.valueText}`}>
                  {s.value}
                </h3>
              </div>
            </div>

            {s.description && (
              <p className="mt-3 text-xs text-gray-500 line-clamp-1">
                {s.description}
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
