import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";
import type { ReactNode } from "react";

/** Dashboard-style empty state card (dashed border, centered icon + copy + optional action). */
export default function EmptyState({
  icon: Icon = SearchX,
  title,
  message,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-8 w-8 text-slate-400" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {message && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
