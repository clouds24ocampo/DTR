/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";

import DTRDetails from "../../components/workforce/dtr/DTRDetails";
import DTRRecordsTable from "../../components/workforce/dtr/DTRRecordsTable";
import DTRStats, { DTRStat } from "../../components/workforce/dtr/DTRStats";
import { useDTRStore } from "../../stores/global/dtr/dtr.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import Chatbot from "../../components/common/ChatBot";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
  format,
  differenceInMinutes,
  parse
} from "date-fns";
import {
  Clock,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock3
} from "lucide-react";

/**
 * DTR.tsx — Self-only DTR view.
 *
 * Shows ONLY the logged-in user's DTR for the selected date.
 * Uses the cookie/session on the server via /api/dtr/me/date/:date.
 */
export default function DTR() {
  // user hydration helpers (names vary across codebases)
  const userStore = useUserStore() as any;
  const { user } = useUserStore();
  const { fetchMe, fetchCurrentUser, getMe, loadingUser, loadingMe } =
    (userStore ?? {}) as Record<string, unknown>;
  const userLoadFn = useMemo(
    () =>
      (fetchMe || fetchCurrentUser || getMe) as
      | undefined
      | (() => Promise<unknown>),
    [fetchMe, fetchCurrentUser, getMe]
  );

  const { ownDTR, loadMyDTRByDate, loading, userDTRs, loadUserDTRs } = useDTRStore();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [now, setNow] = useState(new Date());

  // Update "now" every minute for real-time stats
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Parse date components
  const [year, month, day] = selectedDate.split("-").map(Number);

  // Calculate days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // Ensure day is valid for the selected month
  useEffect(() => {
    if (day > daysInMonth) {
      const newDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
      setSelectedDate(newDate);
    }
  }, [year, month, day, daysInMonth]);

  // Ensure logged-in user is present
  useEffect(() => {
    if (!user && userLoadFn) {
      userLoadFn().catch((err) => console.error("Failed to load user:", err));
    }
  }, [user, userLoadFn]);

  // Load my DTR for the date (auto-create if missing)
  useEffect(() => {
    if (user?._id && selectedDate) {
      loadMyDTRByDate(selectedDate, { autoCreate: true }).catch((err) =>
        console.error("Error fetching my DTR:", err)
      );
    }
  }, [user?._id, selectedDate, loadMyDTRByDate]);

  // Load user DTR history for stats
  useEffect(() => {
    if (user?._id) {
      loadUserDTRs(user._id).catch((err) =>
        console.error("Error fetching user DTR history:", err)
      );
    }
  }, [user?._id, loadUserDTRs]);

  // Weekly Stats Calculation
  const weeklyStats = useMemo<DTRStat[]>(() => {
    if (!userDTRs || !selectedDate) return [];

    try {
      const dateObj = parseISO(selectedDate);
      const start = startOfWeek(dateObj, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(dateObj, { weekStartsOn: 1 });

      const weekDTRs = userDTRs.filter((d) => {
        if (!d.date) return false;
        const dDate = parseISO(d.date);
        return isWithinInterval(dDate, { start, end });
      });

      let totalMinutes = 0;
      let lateCount = 0;
      let overtimeCount = 0;

      const todayStr = format(now, "yyyy-MM-dd");

      weekDTRs.forEach((d) => {
        const isDtrToday = d.date === todayStr;

        d.sessions.forEach((s) => {
          // Sum finished work minutes
          if (s.DTRTotalWork) {
            const [h, m] = s.DTRTotalWork.split(":").map(Number);
            totalMinutes += (h || 0) * 60 + (m || 0);
          }

          // Add real-time minutes for active work entries
          if (isDtrToday) {
            const activeWork = s.fullDTR.find(
              (e) => (e.type || "").toLowerCase() === "work" && e.status === "active"
            );
            if (activeWork && activeWork.startTime) {
              try {
                const startTimeDate = parse(activeWork.startTime, "HH:mm", now);
                const elapsed = differenceInMinutes(now, startTimeDate);
                if (elapsed > 0) {
                  totalMinutes += elapsed;
                }
              } catch (e) {
                console.error("Error parsing active work start time:", e);
              }
            }
          }

          // Count tags
          s.fullDTR.forEach((e) => {
            if (e.startTag?.toLowerCase().includes("late")) lateCount++;
            if (e.endTag?.toLowerCase().includes("overtime")) overtimeCount++;
          });
        });
      });

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const formattedTotal = `${hours}h ${minutes}m`;

      const weekLabel = `${format(start, "MMM dd")} - ${format(end, "MMM dd")}`;

      return [
        {
          title: "Total Work",
          value: formattedTotal,
          icon: Clock,
          color: "blue",
          description: `Total rendered for ${weekLabel}`,
        },
        {
          title: "Days Present",
          value: weekDTRs.length,
          icon: CalendarCheck,
          color: "green",
          description: "Unique days with time entries",
        },
        {
          title: "Overtime",
          value: overtimeCount,
          icon: TrendingUp,
          color: "purple",
          description: "Total overtime segments this week",
        },
        {
          title: "Tardy/Late",
          value: lateCount,
          icon: AlertCircle,
          color: lateCount > 0 ? "orange" : "yellow",
          description: "Clock-in delay occurrences",
        },
      ];
    } catch (err) {
      console.error("Error calculating weekly stats:", err);
      return [];
    }
  }, [userDTRs, selectedDate, now]);

  // Date navigation functions
  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(currentDate.toISOString().split("T")[0]);
  };

  const goToNextDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const today = new Date().toISOString().split("T")[0];
    const nextDateStr = currentDate.toISOString().split("T")[0];
    if (nextDateStr <= today) {
      setSelectedDate(nextDateStr);
    }
  };

  const isNextDisabled = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return selectedDate >= today;
  }, [selectedDate]);

  const isUserLoading = Boolean(loadingUser ?? loadingMe);

  return (
    <motion.div
      className="w-full space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page header */}
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={Clock3}
          tint="blue"
          eyebrow="Timekeeping"
          title="My DTR"
          subtitle={
            user
              ? "View and manage your daily time record"
              : isUserLoading
                ? "Loading your account…"
                : "Could not detect your account. Try refreshing."
          }
        />
      </motion.div>

      {/* Stats Dashboard */}
      {user && weeklyStats.length > 0 && (
        <motion.div variants={itemVariants}>
          <DTRStats stats={weeklyStats} />
        </motion.div>
      )}

      {/* Month at a glance: click a row to open that day */}
      {user && (
        <motion.div variants={itemVariants}>
          <DTRRecordsTable dtrs={userDTRs} selectedDate={selectedDate} onSelect={setSelectedDate} />
        </motion.div>
      )}

      {/* DTR panel */}
      <motion.div className="w-full" variants={itemVariants}>
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 shadow-sm">
            {user ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      DTR for {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-sm text-slate-500">{user.position}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousDay}
                    className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-blue-500"
                    aria-label="Previous day"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </button>

                  <input
                    type="date"
                    value={selectedDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  />

                  <button
                    onClick={goToNextDay}
                    disabled={isNextDisabled}
                    className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Next day"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 py-1">Loading…</div>
            )}
          </div>

          {/* Scrollable content area */}
          <motion.div
            className="p-4 sm:p-6 overflow-y-auto max-h-[70vh]"
            variants={itemVariants}
          >
            {user ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <DTRDetails
                  dtr={ownDTR}
                  selectedDate={selectedDate}
                  loading={loading}
                  userId={user?._id}
                />
              </motion.div>
            ) : (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <EmptyState
                  icon={Clock}
                  title="Sign in required"
                  message="Please log in to view your DTR"
                />
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
      <Chatbot />
    </motion.div>
  );
}
