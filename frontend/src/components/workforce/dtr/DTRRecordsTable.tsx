import { useMemo } from "react";
import { format, parseISO, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DTRDocLite } from "../../../types/global/dtr/dtr.type";
import { formatTime12 } from "../../../pages/Public/clockUi";
import { fmtDuration as fmt, summarizeDay } from "../../../utils/dtr/dtr.summary";

const Chip = ({ children, cls }: { children: string; cls: string }) => (
  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>
);

type Props = {
  dtrs: DTRDocLite[];
  selectedDate: string;
  onSelect: (date: string) => void;
  loading?: boolean;
};

/** One row per day of the selected month: time in/out, hours, tags. Click a row to open that day. */
export default function DTRRecordsTable({ dtrs, selectedDate, onSelect, loading }: Props) {
  const monthKey = selectedDate.slice(0, 7);
  const today = format(new Date(), "yyyy-MM-dd");

  const rows = useMemo(
    () =>
      dtrs
        .filter((d) => d.date?.startsWith(monthKey))
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((d) => summarizeDay(d))
        .filter((r) => r.hasEntries),
    [dtrs, monthKey]
  );

  const totals = useMemo(
    () => ({ days: rows.length, work: rows.reduce((n, r) => n + r.workMin, 0), late: rows.filter((r) => r.late).length }),
    [rows]
  );

  const shift = (dir: 1 | -1) => {
    const base = parseISO(`${monthKey}-01`);
    const next = format(dir === 1 ? addMonths(base, 1) : subMonths(base, 1), "yyyy-MM");
    onSelect(next === today.slice(0, 7) ? today : `${next}-01`);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Attendance records</h3>
          <p className="text-sm text-slate-500">
            {totals.days} day{totals.days === 1 ? "" : "s"} · {fmt(totals.work)} worked
            {totals.late > 0 ? ` · ${totals.late} late` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} aria-label="Previous month" className="rounded-xl border border-slate-300 p-2 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </button>
          <span className="min-w-[8.5rem] text-center text-sm font-semibold text-slate-800">
            {format(parseISO(`${monthKey}-01`), "MMMM yyyy")}
          </span>
          <button
            onClick={() => shift(1)}
            disabled={monthKey >= today.slice(0, 7)}
            aria-label="Next month"
            className="rounded-xl border border-slate-300 p-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-500">
          {loading ? "Loading records…" : "No time records this month. Use the arrows to check another month."}
        </p>
      ) : (
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 sm:px-6">Date</th>
                <th className="px-3 py-2.5">Time in</th>
                <th className="px-3 py-2.5">Time out</th>
                <th className="px-3 py-2.5">Worked</th>
                <th className="hidden px-3 py-2.5 sm:table-cell">Breaks</th>
                <th className="px-3 py-2.5 sm:pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr
                  key={r.date}
                  onClick={() => onSelect(r.date)}
                  className={`cursor-pointer transition-colors hover:bg-blue-50/50 ${r.date === selectedDate ? "bg-blue-50" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-900 sm:px-6">
                    {format(parseISO(r.date), "EEE, MMM d")}
                    {r.date === today && <span className="ml-2 text-xs font-normal text-blue-600">Today</span>}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-slate-700">{formatTime12(r.timeIn)}</td>
                  <td className="px-3 py-3 tabular-nums text-slate-700">{r.active ? "—" : formatTime12(r.timeOut)}</td>
                  <td className="px-3 py-3 tabular-nums text-slate-700">{fmt(r.workMin)}</td>
                  <td className="hidden px-3 py-3 tabular-nums text-slate-500 sm:table-cell">{fmt(r.breakMin)}</td>
                  <td className="space-x-1 px-3 py-3 sm:pr-6">
                    {r.active && <Chip cls="bg-emerald-50 text-emerald-700">Working</Chip>}
                    {r.late && <Chip cls="bg-amber-50 text-amber-700">Late</Chip>}
                    {r.overtime && <Chip cls="bg-violet-50 text-violet-700">Overtime</Chip>}
                    {!r.active && !r.late && !r.overtime && <Chip cls="bg-slate-100 text-slate-600">On time</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
