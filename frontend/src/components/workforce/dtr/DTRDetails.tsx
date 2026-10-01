import { type Duration } from "date-fns";
import { Clock, Info } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { DTRDocLite } from "../../../types/global/dtr/dtr.type";
import {
  pluralize,
  getDtrIcon,
  getDtrTypeClasses,
  durationMinutesBetween,
  minutesToHHMM,
} from "../../../utils/dtr/dtr.utils";
import { formatTime } from "../../../utils/global/timeDateFormat";
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants, itemVariants } from "../../../utils/global/pageMotion";
import DeclinedEntriesPanel from "./DeclinedEntriesPanel";
import { DeclinedEntryMapModal } from "./DeclinedEntryMapModal";
import { fetchDeclinedEntriesByUserAndDate } from "../../../api/global/declined-entry/declined-entry.api";
import type { DeclinedEntryDocLite } from "../../../types/global/declined-entry/declined-entry.type";

function getStartTagClasses(tag: string): string {
  const tagLower = tag.toLowerCase();
  if (tagLower.includes("late")) {
    return "bg-red-100 text-red-700";
  }
  if (tagLower.includes("good") || tagLower.includes("continued")) {
    return "bg-green-100 text-green-700";
  }
  return "bg-red-100 text-red-700";
}

function getEndTagClasses(tag: string, entryType?: string): string {
  const tagLower = tag.toLowerCase();
  const entryTypeLower = (entryType || "").toLowerCase();

  if (tagLower.includes("undertime")) {
    // Undertime on work entries should be red
    if (entryTypeLower === "work") {
      return "bg-red-100 text-red-700";
    }
    return "bg-green-100 text-green-700";
  }
  if (tagLower.includes("overtime")) {
    // Overtime on work entries should be green
    if (entryTypeLower === "work") {
      return "bg-green-100 text-green-700";
    }
    return "bg-orange-100 text-orange-700";
  }
  if (tagLower.includes("auto-ended")) {
    return "bg-red-100 text-red-700";
  }
  return "bg-red-100 text-red-700";
}

function formatDurationToReadable(duration: string): string {
  if (!duration || duration === "00:00") return "0 minutes";
  const [hours, minutes] = duration.split(":").map((n) => Number(n) || 0);
  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes === 0) return "0 minutes";
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes !== 1 ? "s" : ""}`;
  }

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (m === 0) {
    return `${h} hour${h !== 1 ? "s" : ""}`;
  }
  return `${h} hour${h !== 1 ? "s" : ""} and ${m} minute${m !== 1 ? "s" : ""}`;
}

// Convert Duration object from date-fns to human-readable format
function formatDurationObjectToReadable(duration: Duration): string {
  const hours = duration.hours || 0;
  const minutes = duration.minutes || 0;
  const seconds = duration.seconds || 0;

  // Round up seconds to minutes if >= 30 seconds
  const totalMinutes = hours * 60 + minutes + (seconds >= 30 ? 1 : 0);

  if (totalMinutes === 0) return "0 minutes";
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes !== 1 ? "s" : ""}`;
  }

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (m === 0) {
    return `${h} hour${h !== 1 ? "s" : ""}`;
  }
  return `${h} hour${h !== 1 ? "s" : ""} and ${m} minute${m !== 1 ? "s" : ""}`;
}

// Format credits to "00 hours and 00 minutes" or "00 minutes" format
function formatCreditsToHoursMinutes(credits: string): string {
  if (!credits || credits === "—" || credits === "--") return "00 minutes";

  const [hours, minutes] = credits.split(":").map((n) => Number(n) || 0);

  const paddedHours = String(hours).padStart(2, "0");
  const paddedMinutes = String(minutes).padStart(2, "0");

  // If no hours, show only minutes
  if (hours === 0) {
    return `${paddedMinutes} minutes`;
  }

  return `${paddedHours} hours and ${paddedMinutes} minutes`;
}

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function computeActiveElapsed(
  startTime?: string,
  dtrDate?: string,
  now: Date = new Date()
): { totalSeconds: number; totalMinutes: number } {
  if (!startTime) return { totalSeconds: 0, totalMinutes: 0 };
  const [h, m] = startTime.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return { totalSeconds: 0, totalMinutes: 0 };

  let startYear = now.getFullYear();
  let startMonth = now.getMonth();
  let startDay = now.getDate();

  if (dtrDate && /^\d{4}-\d{2}-\d{2}/.test(dtrDate)) {
    const [y, mon, d] = dtrDate.split("T")[0].split("-").map(Number);
    if (!isNaN(y) && !isNaN(mon) && !isNaN(d)) {
      startYear = y;
      startMonth = mon - 1;
      startDay = d;
    }
  }

  const startDate = new Date(startYear, startMonth, startDay, h, m, 0, 0);
  const diffMs = now.getTime() - startDate.getTime();

  if (diffMs <= 0) return { totalSeconds: 0, totalMinutes: 0 };

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  return { totalSeconds, totalMinutes };
}

function formatActiveDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

export default function DTRDetails({
  dtr,
  selectedDate,
  loading,
  userId,
}: {
  dtr: DTRDocLite | null;
  selectedDate: string;
  loading: boolean;
  userId?: string;
}) {
  const [declinedEntries, setDeclinedEntries] = useState<DeclinedEntryDocLite[]>([]);
  const [selectedDeclinedEntry, setSelectedDeclinedEntry] = useState<DeclinedEntryDocLite | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showTripStatusModal, setShowTripStatusModal] = useState(false);
  const [selectedTripEntry, setSelectedTripEntry] = useState<any>(null);

  // Live timer ticker: updates every second so elapsed time and totals count live
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isDateToday = useMemo(() => {
    const todayStr = getLocalDateString(now);
    return selectedDate.split("T")[0] === todayStr;
  }, [selectedDate, now]);

  // Fetch declined entries when userId and date are available
  useEffect(() => {
    if (userId && selectedDate) {
      fetchDeclinedEntriesByUserAndDate({
        userId,
        date: selectedDate,
      })
        .then((response) => {
          if (response.declinedEntries) {
            setDeclinedEntries(response.declinedEntries);
          }
        })
        .catch((error) => {
          console.error("Error fetching declined entries:", error);
          setDeclinedEntries([]);
        });
    } else {
      setDeclinedEntries([]);
    }
  }, [userId, selectedDate]);

  const handleDeclinedEntryClick = (entry: DeclinedEntryDocLite) => {
    setSelectedDeclinedEntry(entry);
    setShowMapModal(true);
  };
  const allEntries = useMemo(() => {
    if (!dtr) return [];
    return dtr.sessions
      .flatMap((s) => s.fullDTR.map((e) => ({ ...e, _session: s })))
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [dtr]);

  const scheduledStart = useMemo(() => {
    if (!dtr || !dtr.sessions.length) return "";
    const starts = dtr.sessions.map((s) => s.scheduledStartTime);
    return starts.sort()[0];
  }, [dtr]);

  const scheduledEnd = useMemo(() => {
    if (!dtr || !dtr.sessions.length) return "";
    const ends = dtr.sessions.map((s) => s.scheduledEndTime);
    return ends.sort().slice(-1)[0];
  }, [dtr]);

  const actualStart = useMemo(
    () => (allEntries[0]?.startTime ? allEntries[0].startTime : "Not started"),
    [allEntries]
  );

  const actualEnd = useMemo(() => {
    const hasActive = allEntries.some((e) => e.status === "active");
    if (hasActive) {
      const activeEntry = allEntries.find((e) => e.status === "active");
      const typeLabel = (activeEntry?.type || "work").replace("-", " ");
      return `In progress (${typeLabel})`;
    }
    const lastWorkDone = [...allEntries]
      .filter(
        (e) => (e.type || "").toLowerCase() === "work" && e.status === "done"
      )
      .pop();
    return lastWorkDone?.endTime || "Not ended";
  }, [allEntries]);

  /** Per-session display total work: use stored value + recomputed + live active work */
  const sessionDisplayWork = (s: { DTRTotalWork?: string; fullDTR?: Array<{ type?: string; status?: string; startTime?: string; endTime?: string }> }) => {
    const stored = s.DTRTotalWork || "00:00";
    const [ah, am] = stored.split(":").map(Number);
    let workMin = (ah || 0) * 60 + (am || 0);

    if (workMin === 0 && Array.isArray(s.fullDTR)) {
      s.fullDTR.forEach((e) => {
        if ((e.type || "").toLowerCase() !== "work" || e.status !== "done" || !e.startTime || !e.endTime) return;
        workMin += durationMinutesBetween(e.startTime, e.endTime);
      });
    }

    if (isDateToday && Array.isArray(s.fullDTR)) {
      const activeWork = s.fullDTR.find(
        (e) => (e.type || "").toLowerCase() === "work" && e.status === "active" && e.startTime
      );
      if (activeWork && activeWork.startTime) {
        const { totalMinutes } = computeActiveElapsed(activeWork.startTime, dtr?.date || selectedDate, now);
        workMin += totalMinutes;
      }
    }

    return minutesToHHMM(workMin);
  };

  /** Per-session display total break: stored value + live active break */
  const sessionDisplayBreak = (s: { DTRTotalBreak?: string; fullDTR?: Array<{ type?: string; status?: string; startTime?: string; endTime?: string }> }) => {
    const stored = s.DTRTotalBreak || "00:00";
    const [bh, bm] = stored.split(":").map(Number);
    let breakMin = (bh || 0) * 60 + (bm || 0);

    if (isDateToday && Array.isArray(s.fullDTR)) {
      const activeBreak = s.fullDTR.find((e) => {
        const t = (e.type || "").toLowerCase();
        return (t === "break" || t === "bio-break" || t === "clinic break") && e.status === "active" && e.startTime;
      });
      if (activeBreak && activeBreak.startTime) {
        const { totalMinutes } = computeActiveElapsed(activeBreak.startTime, dtr?.date || selectedDate, now);
        breakMin += totalMinutes;
      }
    }

    return minutesToHHMM(breakMin);
  };

  /** Per-session display total meal: stored value + live active meal */
  const sessionDisplayMeal = (s: { DTRTotalMeal?: string; fullDTR?: Array<{ type?: string; status?: string; startTime?: string; endTime?: string }> }) => {
    const stored = s.DTRTotalMeal || "00:00";
    const [mh, mm] = stored.split(":").map(Number);
    let mealMin = (mh || 0) * 60 + (mm || 0);

    if (isDateToday && Array.isArray(s.fullDTR)) {
      const activeMeal = s.fullDTR.find(
        (e) => (e.type || "").toLowerCase() === "meal" && e.status === "active" && e.startTime
      );
      if (activeMeal && activeMeal.startTime) {
        const { totalMinutes } = computeActiveElapsed(activeMeal.startTime, dtr?.date || selectedDate, now);
        mealMin += totalMinutes;
      }
    }

    return minutesToHHMM(mealMin);
  };

  const dailyTotals = useMemo(() => {
    if (!dtr) return { actual: "0h 0m", scheduled: "0h 0m", isLive: false };
    let actual = 0;
    let scheduled = 0;
    let isLive = false;

    dtr.sessions.forEach(s => {
      const [ah, am] = (s.DTRTotalWork || "00:00").split(":").map(Number);
      let sessionActual = (ah || 0) * 60 + (am || 0);
      const [sh, sm] = (s.workCredits || "00:00").split(":").map(Number);
      scheduled += (sh || 0) * 60 + (sm || 0);

      // Cross-date fix: if stored was 0, compute from done work entries
      if (sessionActual === 0 && Array.isArray(s.fullDTR)) {
        s.fullDTR.forEach((e) => {
          if ((e.type || "").toLowerCase() !== "work" || e.status !== "done" || !e.startTime || !e.endTime) return;
          sessionActual += durationMinutesBetween(e.startTime, e.endTime);
        });
      }

      // Add real-time active work minutes
      if (isDateToday && Array.isArray(s.fullDTR)) {
        const activeWork = s.fullDTR.find(
          (e) => (e.type || "").toLowerCase() === "work" && e.status === "active" && e.startTime
        );
        if (activeWork && activeWork.startTime) {
          const { totalMinutes } = computeActiveElapsed(activeWork.startTime, dtr.date || selectedDate, now);
          sessionActual += totalMinutes;
          isLive = true;
        }
      }

      actual += sessionActual;
    });

    return {
      actual: `${Math.floor(actual / 60)}h ${actual % 60}m`,
      scheduled: `${Math.floor(scheduled / 60)}h ${scheduled % 60}m`,
      isLive,
    };
  }, [dtr, isDateToday, selectedDate, now]);

  if (!dtr) {
    return (
      <motion.div
        className="text-center py-12"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No DTR Records
        </h3>
        <p className="text-gray-600">
          No time records found for {selectedDate}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="mb-6 p-4 bg-gray-50 rounded-lg"
        variants={itemVariants}
      >
        <h4 className="font-medium text-gray-900 mb-2">Daily Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Actual Time Range
              </span>
              <span className="text-lg font-bold text-gray-900">
                {actualStart === "Not started"
                  ? actualStart
                  : formatTime(actualStart)}{" "}
                – {actualEnd}
              </span>
              <span className="text-xs text-gray-500">
                Scheduled: {scheduledStart ? formatTime(scheduledStart) : "--"}{" "}
                - {scheduledEnd ? formatTime(scheduledEnd) : "--"}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Total Actual Work
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-green-600 tabular-nums flex items-center gap-2">
                  {dailyTotals.actual}
                  {dailyTotals.isLive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold border border-emerald-300 flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Live
                    </span>
                  )}
                </span>
                <span className="text-xs text-blue-600 font-medium">
                  / {dailyTotals.scheduled} scheduled
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="flex flex-col gap-6 mb-6"
        variants={containerVariants}
      >
        {dtr.sessions.map((s, idx) => {
          const hasActiveWork = isDateToday && Array.isArray(s.fullDTR) && s.fullDTR.some(
            (e) => (e.type || "").toLowerCase() === "work" && e.status === "active"
          );
          const hasActiveBreak = isDateToday && Array.isArray(s.fullDTR) && s.fullDTR.some((e) => {
            const t = (e.type || "").toLowerCase();
            return (t === "break" || t === "bio-break" || t === "clinic break") && e.status === "active";
          });
          const hasActiveMeal = isDateToday && Array.isArray(s.fullDTR) && s.fullDTR.some(
            (e) => (e.type || "").toLowerCase() === "meal" && e.status === "active"
          );

          return (
            <motion.div
              key={`sess-${idx}-${s.scheduledStartTime}-${s.scheduledEndTime}`}
              className="rounded-lg border border-gray-200 p-4"
              variants={itemVariants}
              whileHover={{ scale: 1.01, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="text-sm font-medium text-green-900 flex items-center justify-between">
                    <span>Actual Work</span>
                    {hasActiveWork && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-bold text-green-700 line-clamp-1 tabular-nums">
                    {formatCreditsToHoursMinutes(sessionDisplayWork(s))}
                  </div>
                  <div className="text-xs text-green-700/80">
                    {formatCreditsToHoursMinutes(s.workCredits)} scheduled
                  </div>
                </div>

                <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                  <div className="text-sm font-medium text-amber-900 flex items-center justify-between">
                    <span>Actual Break</span>
                    {hasActiveBreak && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-bold text-amber-700 line-clamp-1 tabular-nums">
                    {formatCreditsToHoursMinutes(sessionDisplayBreak(s))}
                  </div>
                  <div className="text-xs text-amber-700/80">
                    {formatCreditsToHoursMinutes(s.breakCredits)} scheduled (
                    {pluralize(s.breakCount, "break")})
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <div className="text-sm font-medium text-purple-900 flex items-center justify-between">
                    <span>Actual Meal</span>
                    {hasActiveMeal && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-bold text-purple-700 line-clamp-1 tabular-nums">
                    {formatCreditsToHoursMinutes(sessionDisplayMeal(s))}
                  </div>
                  <div className="text-xs text-purple-700/80">
                    {formatCreditsToHoursMinutes(s.mealCredits)} scheduled{" "}
                    {s.startMealTime ? `(${formatTime(s.startMealTime)})` : ""}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="text-sm font-medium text-blue-900">
                    Scheduled Span
                  </div>
                  <div className="text-xl font-bold text-blue-700 line-clamp-1">
                    {formatTime(s.scheduledStartTime)} –{" "}
                    {formatTime(s.scheduledEndTime)}
                  </div>
                  <div className="text-xs text-blue-700/80">Shift schedule</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        className="flex flex-col gap-4"
        variants={itemVariants}
      >
        <h4 className="font-semibold text-gray-900">Daily Time Entries</h4>
        {allEntries.reverse().map((entry, index) => {
          const Icon = getDtrIcon(entry.type);
          const isActive = entry.status === "active";

          return (
            <motion.div
              key={`${entry.type}-${entry.startTime}-${index}`}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-3 sm:gap-0 ${getDtrTypeClasses(
                entry.type
              )}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.01, x: 4 }}
            >
              <div className="flex items-start space-x-3 w-full sm:w-auto">
                <div className="mt-0.5 sm:mt-0 flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium capitalize flex flex-wrap items-center gap-2">
                    <span>{entry.type.replace("-", " ")}</span>

                    {/* Start Tag - Timing Status */}
                    {entry.startTag && entry.startTag !== "--" && (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${getStartTagClasses(entry.startTag)} ${entry.startTag.includes("On trip cancelled") ? "cursor-help hover:ring-1 hover:ring-green-300" : ""}`}
                        onClick={() => {
                          if (entry.startTag?.includes("On trip cancelled")) {
                            setSelectedTripEntry(entry);
                            setShowTripStatusModal(true);
                          }
                        }}
                      >
                        {entry.startTag}
                        {entry.startTag.includes("On trip cancelled") && <Info className="w-3 h-3" />}
                      </span>
                    )}

                    {/* End Tag - Completion Status */}
                    {entry.endTag && entry.endTag !== "--" && (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${entry.endTag.toLowerCase().includes("auto-ended")
                          ? `${getEndTagClasses(entry.endTag, entry.type)} shadow-sm`
                          : getEndTagClasses(entry.endTag, entry.type)
                          }`}
                      >
                        {entry.endTag}
                      </span>
                    )}

                    {/* Issue Badge - Critical */}
                    {entry.issue && (
                      <span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-200 font-medium capitalize">
                        ⚠ Issue: {entry.issue}
                      </span>
                    )}

                    {/* Reason Badge - Informational */}
                    {entry.reason && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200 font-medium">
                        ℹ Reason: {entry.reason}
                      </span>
                    )}

                    {/* Trip Details */}
                    {entry.type !== "work" && entry.tripType && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200 font-medium">
                        Trip Type: {entry.tripType}
                      </span>
                    )}

                    {entry.type !== "work" && entry.tripReason && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200 font-medium">
                        Trip Reason: {entry.tripReason}
                      </span>
                    )}

                    {entry.type !== "work" && entry.tripCategory && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200 font-medium">
                        {entry.tripCategory} {entry.halfDayType ? `(${entry.halfDayType})` : ""}
                      </span>
                    )}

                    {entry.type === "on trip" && entry.approvalStatus && (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1.5 ${entry.approvalStatus === "approved" ? "bg-green-50 text-green-700 border-green-200" :
                          entry.approvalStatus === "rejected" ? "bg-red-50 text-red-700 border-red-200 cursor-help hover:ring-1 hover:ring-red-300" :
                            "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }`}
                        onClick={() => {
                          if (entry.approvalStatus === "rejected") {
                            setSelectedTripEntry(entry);
                            setShowTripStatusModal(true);
                          }
                        }}
                      >
                        {entry.approvalStatus === "pending" ? "⏳ Pending Approval" :
                          entry.approvalStatus === "approved" ? "✓ Approved" : "✕ Rejected"}
                        {entry.approvalStatus === "rejected" && <Info className="w-3 h-3" />}
                      </span>
                    )}
                  </div>

                  {/* Time Range */}
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">{formatTime(entry.startTime)}</span>
                    {entry.endTime && (
                      <>
                        <span className="mx-1.5">→</span>
                        <span className="font-medium">{formatTime(entry.endTime)}</span>
                      </>
                    )}
                    {!entry.endTime && isActive && (
                      <span className="ml-2 text-xs text-emerald-600 font-medium inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Ongoing
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Duration and Status */}
              <div className="mt-2 sm:mt-0 pl-7 sm:pl-0 text-left sm:text-right w-full sm:w-auto">
                <div className={`text-sm tabular-nums ${isActive ? 'font-semibold text-emerald-600' : 'text-gray-700 italic'}`}>
                  {isActive
                    ? (() => {
                        const elapsed = computeActiveElapsed(entry.startTime, dtr?.date || selectedDate, now);
                        return (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            {formatActiveDuration(elapsed.totalSeconds)} elapsed
                          </span>
                        );
                      })()
                    : (() => {
                        if (typeof entry.duration === "object") {
                          return formatDurationObjectToReadable(entry.duration);
                        }
                        // Cross-date fix: if stored duration is zero but we have start and end spanning midnight, compute for display
                        const raw = entry.duration ?? "00:00";
                        if ((!raw || raw === "00:00") && entry.startTime && entry.endTime) {
                          const mins = durationMinutesBetween(entry.startTime, entry.endTime);
                          if (mins > 0) {
                            return formatDurationToReadable(minutesToHHMM(mins));
                          }
                        }
                        return formatDurationToReadable(raw);
                      })()}
                </div>
                <div className={`text-xs capitalize mt-1 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 font-medium ${isActive
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : entry.status === 'done'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                  }`}>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  {isActive ? "Active (In progress)" : entry.status}
                </div>
              </div>
            </motion.div>
          );
        })}
        {allEntries.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-8">
            No time entries recorded for this date.
          </div>
        )}
      </motion.div>

      {/* Declined Entries Panel */}
      {userId && (
        <DeclinedEntriesPanel
          declinedEntries={declinedEntries}
          onEntryClick={handleDeclinedEntryClick}
        />
      )}

      {/* Declined Entry Map Modal */}
      <DeclinedEntryMapModal
        isOpen={showMapModal}
        onClose={() => {
          setShowMapModal(false);
          setSelectedDeclinedEntry(null);
        }}
        declinedEntry={selectedDeclinedEntry}
      />

      {/* Trip Status Modal */}
      {selectedTripEntry && (
        <TripStatusModal
          isOpen={showTripStatusModal}
          onClose={() => {
            setShowTripStatusModal(false);
            setSelectedTripEntry(null);
          }}
          entry={selectedTripEntry}
        />
      )}

      {loading && (
        <motion.div
          className="mt-4 text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Loading DTR…
        </motion.div>
      )}
    </motion.div>
  );
}

function TripStatusModal({
  isOpen,
  onClose,
  entry,
}: {
  isOpen: boolean;
  onClose: () => void;
  entry: any;
}) {
  const isConverted = entry.startTag?.includes("On trip cancelled");
  const isRejected = entry.approvalStatus === "rejected";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm !mt-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 border border-gray-100"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${isConverted ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"}`}>
                <Info className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Trip Request Info
              </h3>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 italic text-sm text-gray-700">
                {isConverted ? (
                  <p>
                    "Your trip credit was declined by the workforce, but your rendered time was tagged as regular work (Time In) instead."
                  </p>
                ) : isRejected ? (
                  <p>
                    "Your trip request was rejected. Please contact your supervisor for more details about this decision."
                  </p>
                ) : (
                  <p>Trip request detail information.</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">Original Time:</span>
                  <span className="text-gray-900 font-bold">{formatTime(entry.startTime)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">Status:</span>
                  <span className={`font-bold ${isConverted ? "text-blue-600" : "text-red-600"}`}>
                    {isConverted ? "Converted to Work" : "Rejected"}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors mt-2"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
