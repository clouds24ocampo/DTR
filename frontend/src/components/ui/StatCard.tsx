import { ArrowUpRight, LucideIcon } from "lucide-react";

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

// Icon tile tint per color (tile + matching ambient glow).
const ACCENTS: Record<StatCardProps["color"], { tile: string; glow: string; ring: string }> = {
  blue: { tile: "bg-blue-50 text-blue-600", glow: "bg-blue-400/10", ring: "group-hover:border-blue-200" },
  green: { tile: "bg-emerald-50 text-emerald-600", glow: "bg-emerald-400/10", ring: "group-hover:border-emerald-200" },
  yellow: { tile: "bg-amber-50 text-amber-600", glow: "bg-amber-400/10", ring: "group-hover:border-amber-200" },
  red: { tile: "bg-red-50 text-red-600", glow: "bg-red-400/10", ring: "group-hover:border-red-200" },
  purple: { tile: "bg-violet-50 text-violet-600", glow: "bg-violet-400/10", ring: "group-hover:border-violet-200" },
};

const CHANGE_STYLES = {
  positive: "bg-emerald-50 text-emerald-700",
  negative: "bg-red-50 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
} as const;

export default function StatCard({
  title,
  value,
  subtitle,
  change,
  changeType = "neutral",
  icon: Icon,
  color,
  onClick,
}: StatCardProps) {
  const accent = ACCENTS[color] ?? ACCENTS.blue;

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && (e.key === "Enter" || e.key === " ") && onClick()}
      className={`group relative flex h-full gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 ${accent.ring} ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(15,23,42,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          : ""
      }`}
    >
      {/* Ambient glow overlay behind the icon */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full ${accent.glow} blur-2xl`}
      />

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-bold leading-none tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {change && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${CHANGE_STYLES[changeType]}`}
              >
                {change}
              </span>
            )}
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-3">
        {onClick ? (
          <ArrowUpRight
            className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500"
            aria-hidden
          />
        ) : (
          <span className="h-4 w-4" aria-hidden />
        )}
        <span className="relative flex h-14 w-14 items-center justify-center opacity-80">
          <span
            aria-hidden
            className={`absolute inset-0 rounded-2xl ${accent.tile} opacity-40 blur-[6px]`}
          />
          <span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${accent.tile} bg-opacity-60 shadow-sm ring-1 ring-inset ring-white/50`}>
            <Icon className="h-7 w-7 opacity-70" strokeWidth={1.75} aria-hidden />
          </span>
        </span>
      </div>
    </div>
  );
}
