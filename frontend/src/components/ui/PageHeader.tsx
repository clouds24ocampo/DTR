import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const TINTS = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-violet-50 text-violet-600",
  indigo: "bg-indigo-50 text-indigo-600",
} as const;

/** Dashboard-style page header: optional eyebrow, icon tile, title, subtitle, actions. */
export default function PageHeader({
  icon: Icon,
  tint = "blue",
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  icon?: LucideIcon;
  tint?: keyof typeof TINTS;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3.5">
        {Icon && (
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TINTS[tint]}`}>
            <Icon className="h-6 w-6" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
              {eyebrow}
            </p>
          )}
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 sm:text-base">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
