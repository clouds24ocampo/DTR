import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
  isToday,
  startOfDay,
  isSameMonth,
} from "date-fns";
import { useLeaveStore } from "../../../stores/global/leave/leave.store";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import {
  ILeaveRequestDoc,
  LeaveStatus,
} from "../../../types/global/leave/leave.type";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import Avatar from "avatox";
import LeaveDetailsModal from "../../../components/workforce/leave/LeaveDetailsModal";

type ViewMode = "day" | "week" | "month";

const DAY_HEADERS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isRelevantStatus(s: LeaveStatus) {
  return s === "approved" || s === "pending";
}

interface LeavePlacement {
  leave: ILeaveRequestDoc;
  row: number;
  startCol: number;
  endCol: number;
}

function computeLeavePlacements(
  leaves: ILeaveRequestDoc[],
  daysToShow: Date[]
): LeavePlacement[] {
  if (daysToShow.length === 0) return [];
  const viewStart = startOfDay(daysToShow[0]);
  const viewEnd = startOfDay(daysToShow[daysToShow.length - 1]);

  const inRange = leaves.filter((l) => {
    const start = startOfDay(parseISO(l.startDate));
    const end = startOfDay(parseISO(l.endDate));
    return start <= viewEnd && end >= viewStart;
  });

  const withCols = inRange
    .map((leave) => {
      const start = startOfDay(parseISO(leave.startDate));
      const end = startOfDay(parseISO(leave.endDate));
      let startCol = daysToShow.findIndex((d) => startOfDay(d) >= start);
      if (startCol < 0) startCol = 0;
      let endCol = startCol;
      for (let i = startCol; i < daysToShow.length; i++) {
        if (startOfDay(daysToShow[i]) <= end) endCol = i;
      }
      return { leave, startCol, endCol, span: endCol - startCol + 1 };
    })
    .filter((x) => x.span >= 1);

  withCols.sort((a, b) => a.startCol - b.startCol || b.span - a.span);

  const rowEnd: number[] = [];
  const placements: LeavePlacement[] = [];

  for (const item of withCols) {
    let row = 0;
    while (row < rowEnd.length && rowEnd[row] >= item.startCol) row++;
    if (row >= rowEnd.length) rowEnd.push(-1);
    rowEnd[row] = item.endCol;
    placements.push({
      leave: item.leave,
      row,
      startCol: item.startCol,
      endCol: item.endCol,
    });
  }

  return placements;
}

function leaveAccentColor(status: LeaveStatus) {
  return status === "approved" ? "bg-emerald-500" : "bg-amber-400";
}

function leaveCardBg(status: LeaveStatus) {
  return status === "approved"
    ? "bg-white border-slate-200"
    : "bg-white border-slate-200";
}

interface LeaveCardProps {
  leave: ILeaveRequestDoc;
  compact?: boolean;
  onDetails: (leave: ILeaveRequestDoc) => void;
  profilePicture?: string;
}

function LeaveCard({ leave, compact = false, onDetails, profilePicture }: LeaveCardProps) {
  return (
    <div
      className={`rounded-md sm:rounded-lg border overflow-hidden shadow-sm cursor-pointer hover:shadow-md active:scale-[0.98] transition-all touch-manipulation ${leaveCardBg(leave.status)}`}
      onClick={() => onDetails(leave)}
      title={`${leave.employeeName} – ${leave.type} (${leave.startDate} → ${leave.endDate})`}
    >
      {/* Colored top accent bar */}
      <div className={`h-0.5 sm:h-1 w-full ${leaveAccentColor(leave.status)}`} />

      <div className={`flex items-center gap-1 sm:gap-2 ${compact ? "px-1.5 sm:px-2 py-0.5 sm:py-1" : "px-1.5 sm:px-2.5 py-1 sm:py-2"}`}>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold text-slate-800 truncate ${compact ? "text-[9px] sm:text-[11px]" : "text-[10px] sm:text-xs"}`}>
            {leave.employeeName}
          </p>
          <p className={`text-slate-500 capitalize truncate mt-0.5 ${compact ? "text-[8px] sm:text-[9px]" : "text-[9px] sm:text-[10px]"}`}>
            {leave.type} leave
          </p>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <Avatar
            src={profilePicture}
            name={leave.employeeName}
            size="sm"
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDetails(leave);
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 sm:p-0.5 rounded min-w-[28px] min-h-[28px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation"
          >
            <MoreHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────

interface MonthViewProps {
  currentDate: Date;
  calendarLeaves: ILeaveRequestDoc[];
  onDetails: (leave: ILeaveRequestDoc) => void;
  profilePictureMap: Record<string, string | undefined>;
}

function MonthView({ currentDate, calendarLeaves, onDetails, profilePictureMap }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const viewStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const allDays = eachDayOfInterval({ start: viewStart, end: addDays(viewStart, 41) });

  const weekRows: Date[][] = [];
  for (let i = 0; i < 42; i += 7) {
    weekRows.push(allDays.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Day header row — fixed height; single letter on mobile */}
      <div
        className="grid shrink-0 border-b border-slate-200"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
      >
        {DAY_HEADERS_SHORT.map((d) => (
          <div
            key={d}
            className="py-1.5 sm:py-2.5 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200 last:border-r-0"
          >
            <span className="sm:hidden">{d.charAt(0)}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>

      {/* Scrollable wrapper — separate from the grid so overflow-y-auto works reliably */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
        <div
          style={{
            display: "grid",
            gridTemplateRows: `repeat(${weekRows.length}, auto)`,
          }}
        >
          {weekRows.map((week, weekIdx) => {
            const placements = computeLeavePlacements(calendarLeaves, week);
            const eventRowCount = placements.length > 0
              ? Math.max(...placements.map((p) => p.row)) + 1
              : 0;

            return (
              <div
                key={weekIdx}
                className="grid border-b border-slate-200 last:border-b-0 min-w-[280px] sm:min-w-0"
                style={{
                  minHeight: "4.5rem",
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                  gridTemplateRows: eventRowCount > 0
                    ? `auto repeat(${eventRowCount}, auto)`
                    : "1fr",
                }}
              >
                {/* 1. Background column cells — rendered FIRST, one per column spanning all event rows */}
                {eventRowCount > 0 && week.map((day, dayIdx) => {
                  const inMonth = isSameMonth(day, currentDate);
                  return (
                    <div
                      key={`spacer-${day.toISOString()}`}
                      className={`${inMonth ? "bg-white" : "bg-slate-50/60"} ${dayIdx < 6 ? "border-r border-slate-200" : ""}`}
                      style={{
                        gridRow: `2 / ${eventRowCount + 2}`,
                        gridColumn: dayIdx + 1,
                      }}
                    />
                  );
                })}

                {/* 2. Date number cells */}
                {week.map((day, dayIdx) => {
                  const today = isToday(day);
                  const inMonth = isSameMonth(day, currentDate);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`px-0.5 sm:px-2 pt-1.5 sm:pt-2 pb-0.5 sm:pb-1 flex items-start
                        ${inMonth ? "bg-white" : "bg-slate-50/60"}
                        ${dayIdx < 6 ? "border-r border-slate-200" : ""}`}
                      style={{
                        gridRow: 1,
                        gridColumn: dayIdx + 1,
                      }}
                    >
                      <span
                        className={`text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full shrink-0
                          ${today
                            ? "bg-indigo-600 text-white font-bold"
                            : inMonth
                            ? "text-slate-700"
                            : "text-slate-400"
                          }`}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                  );
                })}

                {/* 3. Leave placement cards — rendered LAST */}
                {placements.map(({ leave, row, startCol, endCol }) => (
                  <div
                    key={leave._id ?? leave.idNumber ?? `${leave.startDate}-${leave.employeeName}`}
                    className="px-0.5 sm:px-1.5 pt-0.5 sm:pt-1 pb-1 sm:pb-1.5 min-w-0"
                    style={{
                      gridRow: row + 2,
                      gridColumn: `${startCol + 1} / ${endCol + 2}`,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <LeaveCard
                      leave={leave}
                      compact={endCol - startCol === 0}
                      onDetails={onDetails}
                      profilePicture={profilePictureMap[leave.employeeId]}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Week view ─────────────────────────────────────────────────────────────────

interface WeekViewProps {
  currentDate: Date;
  calendarLeaves: ILeaveRequestDoc[];
  onDetails: (leave: ILeaveRequestDoc) => void;
  profilePictureMap: Record<string, string | undefined>;
}

function WeekView({ currentDate, calendarLeaves, onDetails, profilePictureMap }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const week = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const placements = useMemo(
    () => computeLeavePlacements(calendarLeaves, week),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calendarLeaves, weekStart.toISOString()]
  );

  const eventRowCount = placements.length > 0
    ? Math.max(...placements.map((p) => p.row)) + 1
    : 0;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header row — fixed height; narrow columns on mobile with horizontal scroll */}
      <div className="shrink-0 overflow-x-auto overflow-y-hidden">
        <div
          className="grid border-b border-slate-200 min-w-[504px] sm:min-w-0"
          style={{ gridTemplateColumns: "repeat(7, minmax(72px, 1fr))" }}
        >
          {week.map((day, dayIdx) => {
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`border-r border-slate-200 last:border-r-0 py-2 sm:py-2.5 px-2 sm:px-3 text-center min-w-[72px] sm:min-w-0
                  ${today ? "bg-indigo-50" : "bg-slate-50"}`}
                style={{ gridColumn: dayIdx + 1 }}
              >
                <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${today ? "text-indigo-600" : "text-slate-500"}`}>
                  {DAY_HEADERS_SHORT[day.getDay()]}
                </p>
                <span
                  className={`mt-0.5 sm:mt-1 text-base sm:text-lg font-bold w-7 h-7 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-full
                    ${today ? "bg-indigo-600 text-white" : "text-slate-700"}`}
                >
                  {format(day, "d")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event area — full height, cards pinned at top; horizontal scroll on mobile */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto relative">
        {/* Background columns — use same column widths; min-width so scroll works on mobile */}
        <div
          className="absolute inset-0 grid min-w-[504px] sm:min-w-0"
          style={{ gridTemplateColumns: "repeat(7, minmax(72px, 1fr))" }}
        >
          {week.map((day, dayIdx) => (
            <div
              key={`bg-${day.toISOString()}`}
              className={`h-full border-r border-slate-100 last:border-r-0 min-w-[72px] sm:min-w-0 ${isToday(day) ? "bg-indigo-50/30" : "bg-white"}`}
              style={{ gridColumn: dayIdx + 1 }}
            />
          ))}
        </div>

        {/* Cards — relative, packed at top */}
        {eventRowCount === 0 ? (
          <div className="relative h-full flex items-center justify-center text-slate-400 text-xs sm:text-sm px-4">
            No leave requests this week.
          </div>
        ) : (
          <div
            className="relative grid min-w-[504px] sm:min-w-0"
            style={{
              gridTemplateColumns: "repeat(7, minmax(72px, 1fr))",
              gridTemplateRows: `repeat(${eventRowCount}, auto)`,
            }}
          >
            {placements.map(({ leave, row, startCol, endCol }) => (
              <div
                key={leave._id ?? leave.idNumber ?? `${leave.startDate}-${leave.employeeName}`}
                className="px-1 sm:px-1.5 py-1 sm:py-1.5 min-w-0"
                style={{
                  gridRow: row + 1,
                  gridColumn: `${startCol + 1} / ${endCol + 2}`,
                  zIndex: 1,
                }}
              >
                <LeaveCard leave={leave} onDetails={onDetails} profilePicture={profilePictureMap[leave.employeeId]} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Day view ──────────────────────────────────────────────────────────────────

function LeaveCardExpanded({
  leave,
  onDetails,
  profilePicture,
}: {
  leave: ILeaveRequestDoc;
  onDetails: (leave: ILeaveRequestDoc) => void;
  profilePicture?: string;
}) {
  const accentClass =
    leave.status === "approved"
      ? "border-l-emerald-500"
      : "border-l-amber-400";
  const statusBadge =
    leave.status === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";

  const startFmt = format(parseISO(leave.startDate), "MMM d, yyyy");
  const endFmt = format(parseISO(leave.endDate), "MMM d, yyyy");
  const dateRange = leave.startDate === leave.endDate ? startFmt : `${startFmt} – ${endFmt}`;

  return (
    <div
      className={`w-full rounded-lg border border-l-4 border-slate-200 ${accentClass} bg-white shadow-sm cursor-pointer hover:shadow-md active:scale-[0.99] transition-all overflow-hidden touch-manipulation`}
      onClick={() => onDetails(leave)}
      title={`${leave.employeeName} – ${leave.type} leave`}
    >
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-start gap-2 sm:gap-3">
        <Avatar
          src={profilePicture}
          name={leave.employeeName}
          size="md"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-xs sm:text-sm leading-snug">
                {leave.employeeName}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 capitalize mt-0.5">
                {leave.type} Leave &middot; {dateRange}
                {leave.halfDay && (
                  <span className="ml-1 sm:ml-1.5 px-1 sm:px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium">
                    Half day
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span
                className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold capitalize ${statusBadge}`}
              >
                {leave.status}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDetails(leave);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 sm:p-0.5 rounded min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
          {leave.reason && (
            <p className="text-[11px] sm:text-xs text-slate-600 mt-1.5 sm:mt-2 leading-relaxed line-clamp-3">
              {leave.reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface DayViewProps {
  currentDate: Date;
  calendarLeaves: ILeaveRequestDoc[];
  onDetails: (leave: ILeaveRequestDoc) => void;
  profilePictureMap: Record<string, string | undefined>;
}

function DayView({ currentDate, calendarLeaves, onDetails, profilePictureMap }: DayViewProps) {
  const dayStart = startOfDay(currentDate);
  const dayLeaves = calendarLeaves.filter((l) => {
    const start = startOfDay(parseISO(l.startDate));
    const end = startOfDay(parseISO(l.endDate));
    return start <= dayStart && end >= dayStart;
  });

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto p-3 sm:p-4 gap-2 sm:gap-3">
      {dayLeaves.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs sm:text-sm px-4">
          No leave requests on this day.
        </div>
      ) : (
        dayLeaves.map((leave) => (
          <LeaveCardExpanded
            key={leave._id ?? leave.idNumber ?? `${leave.startDate}-${leave.employeeName}`}
            leave={leave}
            onDetails={onDetails}
            profilePicture={profilePictureMap[leave.employeeId]}
          />
        ))
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LeaveCalendar() {
  const navigate = useNavigate();
  const { user, fetchMe, otherUsers, fetchOtherUsers } = useUserStore();
  const {
    leaves,
    fetchAllLeaves,
    fetchLeavesByEmployeeId,
    fetchAllLoading,
    fetchByEmployeeLoading,
  } = useLeaveStore();

  const canModerate = useMemo(() => {
    const pos = user?.position;
    const roles = Array.isArray(pos)
      ? pos.map((p) => (p ?? "").toLowerCase())
      : [(pos ?? "").toLowerCase()];
    const managerKeywords = [
      "workforce",
      "team leader",
      "hr",
      "operation manager",
      "supervisory",
      "management",
    ];
    return roles.some((role) =>
      managerKeywords.some((keyword) => role.includes(keyword))
    );
  }, [user]);

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedLeave, setSelectedLeave] = useState<ILeaveRequestDoc | null>(null);

  useEffect(() => {
    if (!user) fetchMe().catch(() => void 0);
  }, [user, fetchMe]);

  useEffect(() => {
    fetchOtherUsers().catch(() => void 0);
  }, [fetchOtherUsers]);

  useEffect(() => {
    if (!user) return;
    if (canModerate) {
      fetchAllLeaves().catch(() => void 0);
    } else if (user._id) {
      fetchLeavesByEmployeeId(user._id).catch(() => void 0);
    }
  }, [user, canModerate, fetchAllLeaves, fetchLeavesByEmployeeId]);

  const calendarLeaves = useMemo(
    () => leaves.filter((l) => isRelevantStatus(l.status)),
    [leaves]
  );

  const profilePictureMap = useMemo<Record<string, string | undefined>>(() => {
    const map: Record<string, string | undefined> = {};
    for (const u of otherUsers) {
      if (u._id) map[u._id] = u.profilePicture;
    }
    if (user?._id) map[user._id] = user.profilePicture;
    return map;
  }, [otherUsers, user]);

  const loading = fetchAllLoading || fetchByEmployeeLoading;

  const navLabel = useMemo(() => {
    if (viewMode === "day") return format(currentDate, "EEEE, MMMM d, yyyy");
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "MMMM yyyy");
  }, [viewMode, currentDate]);

  const goPrev = () => {
    if (viewMode === "day") setCurrentDate((d) => subDays(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subMonths(d, 1));
  };

  const goNext = () => {
    if (viewMode === "day") setCurrentDate((d) => addDays(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  return (
    <motion.div
      className="w-full h-full flex flex-col gap-3 sm:gap-4 px-2 sm:px-4 md:px-1 min-h-0 overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="flex flex-col gap-2 sm:gap-4 shrink-0" variants={itemVariants}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/workforce-leave-management")}
            className="inline-flex items-center gap-1.5 sm:gap-2 text-slate-400 hover:text-slate-200 transition-colors py-2 -ml-1 min-h-[44px] sm:min-h-0 touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="text-sm sm:text-base">Back to Leave Management</span>
          </button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-200 tracking-tight flex items-center gap-2 flex-wrap">
              <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-indigo-400 shrink-0" />
              <span className="break-words">Leave Calendar</span>
            </h1>
            <p className="text-slate-500 font-medium mt-0.5 sm:mt-1 text-xs sm:text-sm">
              Users currently on leave and pending leave requests.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Controls — stack on mobile, row on larger */}
      <motion.div
        className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4 shrink-0"
        variants={itemVariants}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="p-2.5 sm:p-2 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 touch-manipulation flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="p-2.5 sm:p-2 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 touch-manipulation flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="px-3 py-2.5 sm:py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors min-h-[44px] sm:min-h-0 touch-manipulation"
            >
              Today
            </button>
          </div>
          <span className="text-slate-300 font-semibold text-sm sm:text-base min-w-0 w-full sm:w-auto sm:min-w-[140px] md:min-w-[200px] truncate">
            {navLabel}
          </span>
        </div>

        <div className="flex rounded-lg overflow-hidden border border-slate-600 bg-slate-800/50 p-0.5 w-full sm:w-auto">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 text-sm font-medium capitalize transition-colors rounded-lg min-h-[44px] sm:min-h-0 touch-manipulation ${
                viewMode === mode
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Calendar panel — grows to fill available height, scrollable on small screens */}
      <motion.div
        className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-200/50 flex flex-col flex-1 min-h-[280px] sm:min-h-[320px]"
        variants={itemVariants}
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 min-h-[200px]">
            <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-indigo-50 rounded-lg mb-3 sm:mb-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-slate-600 font-bold tracking-tight text-sm sm:text-base">
              Loading leave data...
            </p>
          </div>
        ) : (
          <>
            {viewMode === "month" && (
              <MonthView
                currentDate={currentDate}
                calendarLeaves={calendarLeaves}
                onDetails={setSelectedLeave}
                profilePictureMap={profilePictureMap}
              />
            )}
            {viewMode === "week" && (
              <WeekView
                currentDate={currentDate}
                calendarLeaves={calendarLeaves}
                onDetails={setSelectedLeave}
                profilePictureMap={profilePictureMap}
              />
            )}
            {viewMode === "day" && (
              <DayView
                currentDate={currentDate}
                calendarLeaves={calendarLeaves}
                onDetails={setSelectedLeave}
                profilePictureMap={profilePictureMap}
              />
            )}
          </>
        )}
      </motion.div>

      {/* Legend */}
      <motion.div
        className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0 text-xs sm:text-sm"
        variants={itemVariants}
      >
        <span className="flex items-center gap-2">
          <span className="w-3 sm:w-4 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-slate-400">Approved / On leave</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 sm:w-4 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <span className="text-slate-400">Pending request</span>
        </span>
      </motion.div>

      {/* Leave details modal */}
      <LeaveDetailsModal
        open={!!selectedLeave}
        leave={selectedLeave}
        onClose={() => setSelectedLeave(null)}
      />
    </motion.div>
  );
}
