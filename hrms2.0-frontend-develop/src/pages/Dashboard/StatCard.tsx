import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  color: "blue" | "green" | "yellow" | "red" | "purple";
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  subtitle,
  change,
  changeType,
  icon: Icon,
  color,
  onClick
}: StatCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case "blue":
        return "bg-blue-500/20 text-blue-400 border-blue-500/40";
      case "green":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "yellow":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "red":
        return "bg-red-500/20 text-red-400 border-red-500/40";
      case "purple":
        return "bg-purple-500/20 text-purple-400 border-purple-500/40";
      default:
        return "bg-slate-600/50 text-slate-300 border-slate-500/50";
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case "positive":
        return "text-emerald-400";
      case "negative":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div
      className={`h-full theme-card p-4 ${onClick ? "cursor-pointer hover:shadow-blue-500/30 transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-xl font-bold text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
          {change && (
            <p className={`text-xs mt-1 ${getChangeColor()}`}>{change}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg border ${getColorClasses()}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
