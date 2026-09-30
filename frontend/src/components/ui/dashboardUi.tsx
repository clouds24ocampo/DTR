import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export const greeting = (date = new Date()): string => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export const formatLongDate = (date = new Date()): string =>
  date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

/** Local-timezone "YYYY-MM-DD" (toISOString() is UTC and flips the day for PH mornings). */
export const toLocalISODate = (date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Safe percentage (0 when the denominator is 0 or not finite). */
export const pct = (value: number, total: number): number =>
  total > 0 && Number.isFinite(value / total) ? Math.min(100, (value / total) * 100) : 0;

const TINTS = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-violet-50 text-violet-600",
  indigo: "bg-indigo-50 text-indigo-600",
} as const;

/** Section title with a small tinted icon tile, plus an optional "view all" action. */
export function SectionHeader({
  icon: Icon,
  title,
  tint = "blue",
  actionLabel,
  onAction,
  right,
}: {
  icon: LucideIcon;
  title: string;
  tint?: keyof typeof TINTS;
  actionLabel?: string;
  onAction?: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TINTS[tint]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="truncate text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      {right}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          {actionLabel}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** "+12% vs yesterday"-style change for a stat card; undefined when there is no baseline. */
export const percentChange = (
  current: number,
  previous: number | undefined,
  label: string
): { change: string; changeType: "positive" | "negative" | "neutral" } | undefined => {
  if (previous === undefined || previous <= 0) return undefined;
  const p = Math.round(((current - previous) / previous) * 100);
  const sign = p > 0 ? "+" : "";
  return {
    change: `${sign}${p}% ${label}`,
    changeType: p > 0 ? "positive" : p < 0 ? "negative" : "neutral",
  };
};
