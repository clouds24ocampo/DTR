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
    const lastWorkDone = [...allEntries]
      .filter(
        (e) => (e.type || "").toLowerCase() === "work" && e.status === "done"
      )
      .pop();
    return lastWorkDone?.endTime || (allEntries.some(e => e.status === "active") ? "In progress" : "Not ended");
  }, [allEntries]);

  /** Per-session display total work: use stored value, or recompute from entries when cross-midnight made it 0 */
  const sessionDisplayWork = (s: { DTRTotalWork?: string; fullDTR?: Array<{ type?: string; status?: string; startTime?: string; endTime?: string }> }) => {
    const stored = s.DTRTotalWork || "00:00";
    const [ah, am] = stored.split(":").map(Number);
    if (ah * 60 + am > 0) return stored;
    let computed = 0;
    (s.fullDTR || []).forEach((e: { type?: string; status?: string; startTime?: string; endTime?: string }) => {
      if ((e.type || "").toLowerCase() !== "work" || e.status !== "done" || !e.startTime || !e.endTime) return;
      computed += durationMinutesBetween(e.startTime, e.endTime);
    });
    return computed > 0 ? minutesToHHMM(computed) : stored;
  };

  const dailyTotals = useMemo(() => {
    if (!dtr) return { actual: "0h 0m", scheduled: "0h 0m" };
    let actual = 0;
    let scheduled = 0;
    dtr.sessions.forEach(s => {
      const [ah, am] = (s.DTRTotalWork || "00:00").split(":").map(Number);
      actual += ah * 60 + am;
      const [sh, sm] = (s.workCredits || "00:00").split(":").map(Number);
      scheduled += sh * 60 + sm;
    });
    // Cross-date fix: if backend reported 0 actual but we have done work entries spanning midnight, recompute from entries
    if (actual === 0) {
      let computedActual = 0;
      dtr.sessions.forEach(s => {
        (s.fullDTR || []).forEach((e: { type?: string; status?: string; startTime?: string; endTime?: string; duration?: string }) => {
          if ((e.type || "").toLowerCase() !== "work" || e.status !== "done" || !e.startTime || !e.endTime) return;
          const mins = durationMinutesBetween(e.startTime, e.endTime);
          computedActual += mins;
        });
      });
      if (computedActual > 0) actual = computedActual;
    }
    return {
      actual: `${Math.floor(actual / 60)}h ${actual % 60}m`,
      scheduled: `${Math.floor(scheduled / 60)}h ${scheduled % 60}m`,
    };
  }, [dtr]);

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
                <span className="text-2xl font-black text-green-600">
                  {dailyTotals.actual}
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
        {dtr.sessions.map((s, idx) => (
          <motion.div
            key={`sess-${idx}-${s.scheduledStartTime}-${s.scheduledEndTime}`}
            className="rounded-lg border border-gray-200 p-4"
            variants={itemVariants}
            whileHover={{ scale: 1.01, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="text-sm font-medium text-green-900">
                  Actual Work
                </div>
                <div className="text-xl font-bold text-green-700 line-clamp-1">
                  {formatCreditsToHoursMinutes(sessionDisplayWork(s))}
                </div>
                <div className="text-xs text-green-700/80">
                  {formatCreditsToHoursMinutes(s.workCredits)} scheduled
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <div className="text-sm font-medium text-amber-900">
                  Actual Break
                </div>
                <div className="text-xl font-bold text-amber-700 line-clamp-1">
                  {formatCreditsToHoursMinutes(s.DTRTotalBreak)}
                </div>
                <div className="text-xs text-amber-700/80">
                  {formatCreditsToHoursMinutes(s.breakCredits)} scheduled (
                  {pluralize(s.breakCount, "break")})
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                <div className="text-sm font-medium text-purple-900">
                  Actual Meal
                </div>
                <div className="text-xl font-bold text-purple-700 line-clamp-1">
                  {formatCreditsToHoursMinutes(s.DTRTotalMeal)}
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
        ))}
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
                      <span className="ml-2 text-xs text-amber-600 font-medium">• Ongoing</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Duration and Status */}
              <div className="mt-2 sm:mt-0 pl-7 sm:pl-0 text-left sm:text-right w-full sm:w-auto">
                <div className={`text-sm italic ${isActive ? 'text-amber-600' : 'text-gray-700'}`}>
                  {isActive
                    ? "Currently Active"
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
                <div className={`text-xs capitalize mt-1 px-2 py-0.5 rounded-full inline-block ${isActive
                  ? 'bg-amber-100 text-amber-700 font-medium'
                  : entry.status === 'done'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                  }`}>
                  {entry.status}
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
