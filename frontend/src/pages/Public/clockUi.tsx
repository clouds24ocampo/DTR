import { motion } from "framer-motion";
import {
  AlertTriangle,
  Coffee,
  Lock,
  LogIn,
  MapPin,
  Stethoscope,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { DTRDocLite } from "../../types/global/dtr/dtr.type";

/* ------------------------------ time helpers ------------------------------ */

const toMin = (hhmm?: string): number => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "13:05" -> "1:05 PM" ("—" when missing). */
export function formatTime12(hhmm?: string): string {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** minutes -> "4h 30m" / "45m" / "0m". */
const fmtMinutes = (total: number): string => {
  const t = Math.max(0, Math.round(total));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const nowHHMM = (now: Date) => `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

/* -------------------------------- tones ---------------------------------- */

export type Tone = "slate" | "blue" | "emerald" | "amber" | "rose" | "violet" | "sky";

const TONE_CHIP: Record<Tone, string> = {
  slate: "bg-white/5 text-slate-300 ring-white/10",
  blue: "bg-blue-500/15 text-blue-300 ring-blue-400/25",
  emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-400/25",
  rose: "bg-rose-500/15 text-rose-300 ring-rose-400/25",
  violet: "bg-violet-500/15 text-violet-300 ring-violet-400/25",
  sky: "bg-sky-500/15 text-sky-300 ring-sky-400/25",
};

const TONE_DOT: Record<Tone, string> = {
  slate: "bg-slate-400",
  blue: "bg-blue-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  violet: "bg-violet-400",
  sky: "bg-sky-400",
};

function tagTone(tag: string): Tone {
  const t = tag.toLowerCase();
  if (t.startsWith("late") || t.startsWith("undertime")) return "amber";
  if (t.startsWith("early")) return "sky";
  if (t.startsWith("overtime")) return "violet";
  if (t === "good") return "emerald";
  return "slate";
}

const ENTRY_META: Record<string, { label: string; icon: LucideIcon; tone: Tone }> = {
  work: { label: "Time in", icon: LogIn, tone: "blue" },
  break: { label: "Break", icon: Coffee, tone: "amber" },
  meal: { label: "Meal", icon: Utensils, tone: "blue" },
  "bio-break": { label: "Bio break", icon: Users, tone: "slate" },
  "clinic break": { label: "Clinic break", icon: Stethoscope, tone: "slate" },
  "system issue": { label: "System issue", icon: AlertTriangle, tone: "rose" },
  "on trip": { label: "On trip", icon: MapPin, tone: "blue" },
};

/* -------------------------------- clock face ------------------------------ */

export function ClockFace({
  now,
  status,
}: {
  now: Date;
  status: { label: string; tone: Tone; live: boolean };
}) {
  const raw = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const m = raw.match(/^(\d+:\d{2}):(\d{2})\s?(AM|PM)$/i);
  const [, hm, ss, ampm] = m ?? [];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/25 via-slate-900/60 to-slate-900/80 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">Current time</p>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${TONE_CHIP[status.tone]}`}
          >
            <span className="relative flex h-2 w-2">
              {status.live && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${TONE_DOT[status.tone]}`} />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${TONE_DOT[status.tone]}`} />
            </span>
            {status.label}
          </span>
        </div>

        <div className="mt-5 flex items-baseline gap-2 text-white">
          {m ? (
            <>
              <span className="text-6xl font-bold leading-none tracking-tight tabular-nums sm:text-7xl">{hm}</span>
              <span className="flex flex-col text-left">
                <span className="text-xl font-semibold leading-none text-blue-200 tabular-nums">{ss}</span>
                <span className="mt-1 text-sm font-semibold leading-none text-slate-400">{ampm.toUpperCase()}</span>
              </span>
            </>
          ) : (
            <span className="text-5xl font-bold tabular-nums">{raw}</span>
          )}
        </div>

        <p className="mt-3 text-sm text-slate-300">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------ today's activity -------------------------- */

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

export function TodayActivity({
  dtr,
  now,
  timedOut,
}: {
  dtr: DTRDocLite | null;
  now: Date;
  timedOut: boolean;
}) {
  const entries = (dtr?.sessions ?? []).flatMap((s) => s.fullDTR ?? []);
  const nowStr = nowHHMM(now);

  const firstIn = entries.find((e) => e.type === "work");
  const lastEntry = entries[entries.length - 1];
  const timeOut = timedOut && lastEntry?.endTime ? lastEntry.endTime : undefined;

  const sum = (key: "DTRTotalWork" | "DTRTotalBreak" | "DTRTotalMeal") =>
    (dtr?.sessions ?? []).reduce((acc, s) => acc + toMin(s[key]), 0);
  // Entries still running are not in the totals yet: add their live minutes.
  const liveWork = entries
    .filter((e) => e.status === "active" && e.type === "work")
    .reduce((acc, e) => acc + Math.max(0, toMin(nowStr) - toMin(e.startTime)), 0);
  const worked = sum("DTRTotalWork") + liveWork;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Today&apos;s activity</h2>
        {dtr && entries.length > 0 && (
          <span className="text-xs text-slate-400">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
        )}
      </div>

      {!dtr ? (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center">
          <Lock className="h-5 w-5 text-slate-500" />
          <p className="text-sm text-slate-400">Enter your ID and password to see your time in and other actions.</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
          No activity yet today. Choose <span className="font-semibold text-slate-200">Time In</span> to start.
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Time in" value={formatTime12(firstIn?.startTime)} sub={firstIn?.startTag && firstIn.startTag !== "--" ? firstIn.startTag : undefined} />
            <Stat label="Time out" value={timeOut ? formatTime12(timeOut) : "—"} sub={timeOut ? lastEntry?.endTag : "Not yet"} />
            <Stat label="Worked" value={fmtMinutes(worked)} />
            <Stat label="Break / Meal" value={`${fmtMinutes(sum("DTRTotalBreak"))} / ${fmtMinutes(sum("DTRTotalMeal"))}`} />
          </div>

          <ol className="relative mt-5 space-y-1">
            {entries.map((e, i) => {
              const base = ENTRY_META[e.type] ?? { label: e.type, icon: Coffee, tone: "slate" as Tone };
              // A work entry after the first one is a return (e.g. back from a break).
              const meta = e.type === "work" && e !== firstIn ? { ...base, label: "Back to work" } : base;
              const Icon = meta.icon;
              const active = e.status === "active";
              const mins = active
                ? Math.max(0, toMin(nowStr) - toMin(e.startTime))
                : toMin(e.duration);
              const pending = e.approvalStatus === "pending";
              return (
                <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < entries.length - 1 && (
                    <span className="absolute left-[17px] top-9 h-[calc(100%-1.5rem)] w-px bg-white/10" aria-hidden />
                  )}
                  <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${TONE_CHIP[meta.tone]}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold text-white">{meta.label}</p>
                      {active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
                        </span>
                      )}
                      {pending && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-inset ring-amber-400/25">
                          Pending approval
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-300 tabular-nums">
                      {formatTime12(e.startTime)} → {active ? "now" : formatTime12(e.endTime)}
                      <span className="text-slate-500"> · </span>
                      {fmtMinutes(mins)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {e.startTag && e.startTag !== "--" && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONE_CHIP[tagTone(e.startTag)]}`}>
                          In: {e.startTag}
                        </span>
                      )}
                      {e.endTag && e.endTag !== "--" && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONE_CHIP[tagTone(e.endTag)]}`}>
                          Out: {e.endTag}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}

/* ------------------------------- step label ------------------------------- */

export function StepLabel({
  n,
  title,
  done,
  hint,
}: {
  n: number;
  title: string;
  done?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <motion.span
        layout
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset ${
          done ? "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30" : "bg-blue-500/20 text-blue-200 ring-blue-400/30"
        }`}
      >
        {done ? "✓" : n}
      </motion.span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}
