import { Search } from "lucide-react";
import type { ReactNode } from "react";

/** Dashboard-style toolbar card: search field on the left, filters/actions on the right. */
export default function SearchToolbar({
  value,
  onChange,
  placeholder = "Search…",
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="box-border w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
