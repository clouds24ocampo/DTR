import { Clock, Edit, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ISession } from "../../../types/global/schedule/schedule.type";
import { formatTime } from "../../../utils/global/timeDateFormat";
import {
  getTypeIcon,
  getTypeColor,
} from "../../../utils/schedule/schedule.utils";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import { useWorkplaceStore } from "../../../stores/workforce/workplace/workplace.store";
import SelfAssignStationModal from "../workplace/SelfAssignStationModal";
import {
  getUserCurrentAssignment,
  hasScheduleStarted,
  isBeforeWorkStarts,
  getFirstSession,
} from "../../../utils/workplace/stationAssignment.utils";

// Helper to calculate duration between two "HH:mm" strings
function calculateDuration(start: string, end: string): string {
  if (!start || !end) return "00:00";
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);

  let totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// Helper to format duration to readable string like DTR
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

type ScheduleRecord = {
  _id?: string;
  userId: string;
  date: string;
  sessions?: (ISession & { _id?: string })[];
};

type Props = {
  selectedEmployee: string | null;
  selectedEmp?: { firstName?: string; lastName?: string };
  selectedDate: string;
  onDateChange: (date: string) => void;

  schedules: ScheduleRecord[];
  loading: boolean;

  canEdit?: boolean;

  onOpenSessionEdit?: (
    scheduleId: string,
    session: ISession & { _id?: string }
  ) => void;

  onOpenBreakdownEdit?: (
    scheduleId: string,
    session: ISession & { _id?: string },
    breakdownIndex: number
  ) => void;
};

export default function ScheduleDetails({
  selectedEmployee,
  selectedEmp,
  selectedDate,
  onDateChange,
  schedules,
  loading,
  onOpenBreakdownEdit,
  canEdit = true,
}: Props) {
  const { user } = useUserStore();
  const { workplaces, fetchAllWorkplaces } = useWorkplaceStore();
  const [showAssignModal, setShowAssignModal] = useState(false);

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
      onDateChange(newDate);
    }
  }, [year, month, day, daysInMonth, onDateChange]);

  // Fetch workplaces on mount
  useEffect(() => {
    fetchAllWorkplaces().catch(console.error);
  }, [fetchAllWorkplaces]);

  // Check if user is an agent role
  const isAgentRole = useMemo(() => {
    const position = user?.position;
    return position === "Frontline / Agent Roles" || position === "Specialized Agent Roles";
  }, [user?.position]);

  // Get schedule for selected date
  const scheduleForDate = useMemo(() => {
    return schedules.find((s) => s.date === selectedDate);
  }, [schedules, selectedDate]);

  // Get schedule info
  const scheduleInfo = useMemo(() => {
    if (!scheduleForDate || !scheduleForDate.sessions || scheduleForDate.sessions.length === 0) {
      return null;
    }
    const firstSession = getFirstSession(scheduleForDate.sessions);
    if (!firstSession) return null;
    return {
      date: scheduleForDate.date,
      startTime: firstSession.scheduledStartTime,
      endTime: firstSession.scheduledEndTime,
    };
  }, [scheduleForDate]);

  // Check if schedule has started
  const scheduleStarted = useMemo(() => {
    if (!scheduleInfo) return false;
    return hasScheduleStarted(scheduleInfo.date, scheduleInfo.startTime);
  }, [scheduleInfo]);

  // Check if can assign
  const canAssign = useMemo(() => {
    if (!scheduleInfo || !isAgentRole) return false;
    return isBeforeWorkStarts(scheduleInfo.startTime, scheduleInfo.date);
  }, [scheduleInfo, isAgentRole]);

  // Find workplace - for now, we'll use the first workplace
  // In a real scenario, you might want to find the workplace the user is assigned to
  const workplace = useMemo(() => {
    if (!workplaces || workplaces.length === 0) return null;
    // TODO: Find the workplace the user is actually assigned to
    // For now, return the first workplace
    return workplaces[0];
  }, [workplaces]);

  // Get current assignment
  const currentAssignment = useMemo(() => {
    if (!workplace || !scheduleInfo || !user?._id) return null;
    return getUserCurrentAssignment(workplace, user._id, scheduleInfo.date);
  }, [workplace, scheduleInfo, user?._id]);

  // Handle successful assignment
  const handleAssignmentSuccess = () => {
    // Refresh schedules or workplaces if needed
    fetchAllWorkplaces().catch(console.error);
  };

  // Calculate daily totals for summary (similar to DTR)
  const dailyTotals = useMemo(() => {
    if (!scheduleForDate || !scheduleForDate.sessions) return { scheduled: "0h 0m", span: "-- - --" };

    let totalMinutes = 0;
    const allStarts = scheduleForDate.sessions.map(s => s.scheduledStartTime).sort();
    const allEnds = scheduleForDate.sessions.map(s => s.scheduledEndTime).sort();

    scheduleForDate.sessions.forEach(s => {
      const [h, m] = (s.workCredits || "00:00").split(":").map(Number);
      totalMinutes += h * 60 + m;
    });

    return {
      scheduled: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      span: `${allStarts[0] ? formatTime(allStarts[0]) : "--"} - ${allEnds[allEnds.length - 1] ? formatTime(allEnds[allEnds.length - 1]) : "--"}`
    };
  }, [scheduleForDate]);

  return (
    <motion.div
      className="w-full lg:flex-1"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="bg-white rounded-lg shadow-sm border border-gray-200"
        variants={itemVariants}
      >
        {/* Header */}
        <div className="z-10 bg-white/90 rounded-lg backdrop-blur px-4 sm:px-6 py-4">
          {selectedEmployee ? (
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              variants={itemVariants}
            >
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Schedules for {selectedEmp?.firstName} {selectedEmp?.lastName}
              </h3>
              <div className="flex gap-2">
                {/* Year Dropdown */}
                <select
                  id="scheduleYear"
                  value={year}
                  onChange={(e) => {
                    const newYear = parseInt(e.target.value);
                    const newDay = Math.min(day, new Date(newYear, month, 0).getDate());
                    onDateChange(
                      `${newYear}-${String(month).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`
                    );
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>

                {/* Month Dropdown */}
                <select
                  id="scheduleMonth"
                  value={month}
                  onChange={(e) => {
                    const newMonth = parseInt(e.target.value);
                    const newDay = Math.min(day, new Date(year, newMonth, 0).getDate());
                    onDateChange(
                      `${year}-${String(newMonth).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`
                    );
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthNum = i + 1;
                    const monthNames = [
                      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                    ];
                    return (
                      <option key={monthNum} value={monthNum}>
                        {monthNames[i]}
                      </option>
                    );
                  })}
                </select>

                {/* Day Dropdown */}
                <select
                  id="scheduleDay"
                  value={day}
                  onChange={(e) => {
                    const newDay = parseInt(e.target.value);
                    onDateChange(
                      `${year}-${String(month).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`
                    );
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNum = i + 1;
                    return (
                      <option key={dayNum} value={dayNum}>
                        {String(dayNum).padStart(2, "0")}
                      </option>
                    );
                  })}
                </select>
              </div>
            </motion.div>
          ) : (
            <div className="text-sm sm:text-base text-gray-600 py-1">
              Select an employee to view schedules
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {selectedEmployee ? (
            loading ? (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-gray-600">Loading schedules...</p>
              </motion.div>
            ) : schedules.length > 0 ? (
              <div className="space-y-8">
                {/* Daily Summary Section */}
                {scheduleForDate && (
                  <motion.div
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                    variants={itemVariants}
                  >
                    <h4 className="font-medium text-gray-900 mb-2">Daily Summary</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">Scheduled Span: </span>
                          <span className="font-medium">{dailyTotals.span}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">Total Scheduled: </span>
                          <span className="font-bold text-blue-600">{dailyTotals.scheduled}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Main Schedule Info */}
                <div className="space-y-8">
                  {schedules.map((schedule) => (
                    <div key={schedule._id ?? `${schedule.userId}-${schedule.date}`} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900">
                          {new Date(schedule.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </h4>
                        {/* Station Assignment Button for Agent Roles */}
                        {isAgentRole && schedule.date === selectedDate && (
                          <div className="flex items-center gap-3">
                            {currentAssignment && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                                <MapPin className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-green-900">
                                  {currentAssignment.stationName}
                                </span>
                              </div>
                            )}
                            {canAssign ? (
                              <button
                                onClick={() => setShowAssignModal(true)}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                <MapPin className="w-4 h-4" />
                                {currentAssignment ? "Change Station" : "Assign Station"}
                              </button>
                            ) : scheduleStarted ? (
                              <div className="px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <span className="text-xs text-yellow-800">
                                  Schedule started
                                </span>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {(schedule.sessions || []).map((session, sIdx) => (
                        <motion.div
                          key={`session-${schedule._id ?? schedule.userId}-${sIdx}`}
                          className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6"
                          variants={itemVariants}
                          whileHover={{ scale: 1.005, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        >
                          {/* Session Header */}
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-base font-bold text-gray-900">
                              Session {sIdx + 1}
                            </h5>
                          </div>

                          {/* Summary Tags */}
                          <div className="flex flex-wrap gap-2 mb-6">
                            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                              Work {formatDurationToReadable(session.workCredits)}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-medium">
                              Breaks {session.breakCount}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                              Meals {session.mealCount}
                            </span>
                          </div>

                          {/* Detail Blocks */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                              <div className="text-sm font-medium text-blue-900 mb-1">Work Time</div>
                              <div className="text-lg font-bold text-blue-700">
                                {formatDurationToReadable(session.workCredits)}
                              </div>
                              <div className="text-xs text-blue-700/80 mt-1">
                                {formatTime(session.scheduledStartTime)} – {formatTime(session.scheduledEndTime)}
                              </div>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                              <div className="text-sm font-medium text-yellow-900 mb-1">Breaks</div>
                              <div className="text-lg font-bold text-yellow-700">
                                {formatDurationToReadable(session.breakCredits)}
                              </div>
                              <div className="text-xs text-yellow-700/80 mt-1">
                                {session.breakCount} {session.breakCount === 1 ? "break" : "breaks"}
                              </div>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                              <div className="text-sm font-medium text-purple-900 mb-1">Meal</div>
                              <div className="text-lg font-bold text-purple-700">
                                {session.mealCount > 0 ? formatDurationToReadable(session.mealCredits) : "None"}
                              </div>
                              <div className="text-xs text-purple-700/80 mt-1">
                                {session.mealCount > 0 ? `Starts at ${formatTime(session.startMealTime?.[0])}` : "No meals scheduled"}
                              </div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                              <div className="text-sm font-medium text-green-900 mb-1">Total Hours</div>
                              <div className="text-lg font-bold text-green-700">
                                {formatDurationToReadable(session.workCredits)}
                              </div>
                              <div className="text-xs text-green-700/80 mt-1">Scheduled work</div>
                            </div>
                          </div>

                          {/* Breakdown Section */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Breakdown</h4>
                            {(session.fullSched || []).length > 0 ? (
                              <div className="flex flex-col gap-3">
                                {session.fullSched!.map((item, idx) => {
                                  const Icon = getTypeIcon(item.type);
                                  const duration = calculateDuration(item.start, item.end);
                                  return (
                                    <motion.div
                                      key={`${item.type}-${sIdx}-${idx}`}
                                      className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-3 sm:gap-0 ${getTypeColor(item.type)} transition-all hover:bg-white/50`}
                                      variants={itemVariants}
                                      whileHover={{ scale: 1.01, x: 4 }}
                                    >
                                      <div className="flex items-start space-x-3 w-full sm:w-auto">
                                        <div className="mt-0.5 sm:mt-1 flex-shrink-0 opacity-80">
                                          {Icon && <Icon className="w-4 h-4" />}
                                        </div>
                                        <div>
                                          <div className="font-bold capitalize text-sm mb-1">{item.type}</div>
                                          <div className="text-sm opacity-90 font-medium">
                                            {formatTime(item.start)} → {formatTime(item.end)}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4 sm:pl-0 pl-7">
                                        <div className="text-right">
                                          <div className="text-sm italic font-medium">
                                            {formatDurationToReadable(duration)}
                                          </div>
                                        </div>
                                        {canEdit && onOpenBreakdownEdit && (
                                          <button
                                            onClick={() => onOpenBreakdownEdit(schedule._id!, session, idx)}
                                            className="p-2 rounded-lg bg-white/40 hover:bg-white/60 text-gray-700 transition shadow-sm"
                                            title="Edit this breakdown"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 italic py-4 text-center bg-gray-50 rounded-lg">
                                No breakdown items available.
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Schedule Records
                </h3>
                <p className="text-gray-600">
                  No schedules found for {selectedDate}
                </p>
              </motion.div>
            )
          ) : (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-gray-600">Please select an employee.</p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Self-Assignment Modal */}
      {isAgentRole && workplace && scheduleForDate && (
        <SelfAssignStationModal
          open={showAssignModal}
          workplace={workplace}
          schedule={scheduleForDate}
          userId={user?._id || ""}
          onClose={() => setShowAssignModal(false)}
          onSuccess={handleAssignmentSuccess}
        />
      )}
    </motion.div>
  );
}
