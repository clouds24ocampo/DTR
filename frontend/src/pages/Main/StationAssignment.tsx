/* eslint-disable @typescript-eslint/no-explicit-any */
import { Calendar, MapPin, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import { useUserStore } from "../../stores/workforce/user/user.store";
import { useScheduleStore } from "../../stores/global/schedule/schedule.store";
import { useWorkplaceStore } from "../../stores/workforce/workplace/workplace.store";
import SelfAssignStationModal from "../../components/workforce/workplace/SelfAssignStationModal";
import {
  getUserCurrentAssignment,
  hasScheduleStarted,
  isBeforeWorkStarts,
  getFirstSession,
  getUserWorkplace,
} from "../../utils/workplace/stationAssignment.utils";
import { formatTime } from "../../utils/global/timeDateFormat";
import Chatbot from "../../components/common/ChatBot";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonGrid from "../../components/ui/SkeletonGrid";
import { SectionHeader } from "../../components/ui/dashboardUi";

export default function StationAssignment() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { schedules, fetchMySchedulesByDate, fetchByDateLoading } = useScheduleStore();
  const { workplaces, fetchAllWorkplaces } = useWorkplaceStore();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);

  // Check if user is an agent role
  const isAgentRole = useMemo(() => {
    const position = user?.position;
    return position === "Frontline / Agent Roles" || position === "Specialized Agent Roles";
  }, [user?.position]);

  // Redirect if not agent role
  useEffect(() => {
    if (user && !isAgentRole) {
      navigate("/schedule");
    }
  }, [user, isAgentRole, navigate]);

  // Fetch data
  useEffect(() => {
    if (user?._id) {
      fetchAllWorkplaces().catch(console.error);
      fetchMySchedulesByDate(selectedDate).catch(console.error);
    }
  }, [user?._id, selectedDate, fetchAllWorkplaces, fetchMySchedulesByDate]);

  // Get workplace based on user's station assignments
  const workplace = useMemo(() => {
    if (!workplaces || workplaces.length === 0 || !user?._id) return null;
    
    // Find workplace where user has assignments, prioritizing the selected date
    const userWorkplace = getUserWorkplace(workplaces, user._id, selectedDate);
    
    // If no assignment found, fall back to first workplace (for users who haven't been assigned yet)
    return userWorkplace || workplaces[0] || null;
  }, [workplaces, user?._id, selectedDate]);

  // Get schedules with station assignment info
  const schedulesWithAssignments = useMemo(() => {
    if (!schedules || schedules.length === 0 || !workplace || !user?._id) return [];

    return schedules.map((schedule) => {
      const firstSession = getFirstSession(schedule.sessions);
      const scheduleInfo = firstSession
        ? {
            date: schedule.date,
            startTime: firstSession.scheduledStartTime,
            endTime: firstSession.scheduledEndTime,
          }
        : null;

      const scheduleStarted = scheduleInfo
        ? hasScheduleStarted(scheduleInfo.date, scheduleInfo.startTime)
        : false;

      const canAssign = scheduleInfo
        ? isBeforeWorkStarts(scheduleInfo.startTime, scheduleInfo.date)
        : false;

      const currentAssignment = scheduleInfo
        ? getUserCurrentAssignment(workplace, user._id, scheduleInfo.date)
        : null;

      return {
        ...schedule,
        scheduleInfo,
        scheduleStarted,
        canAssign,
        currentAssignment,
        hasWorkstationId: !!schedule.workstationId,
      };
    });
  }, [schedules, workplace, user?._id]);

  // Handle open assign modal
  const handleOpenAssignModal = (schedule: any) => {
    setSelectedSchedule(schedule);
    setShowAssignModal(true);
  };

  // Handle successful assignment
  const handleAssignmentSuccess = () => {
    fetchAllWorkplaces().catch(console.error);
    if (selectedDate) {
      fetchMySchedulesByDate(selectedDate).catch(console.error);
    }
  };

  if (!user) {
    return (
      <motion.div
        className="w-full space-y-6 pb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <EmptyState
          icon={AlertCircle}
          title="Sign in required"
          message="Please log in to manage your station assignments"
        />
      </motion.div>
    );
  }

  if (!isAgentRole) {
    return (
      <motion.div
        className="w-full space-y-6 pb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <EmptyState
          icon={AlertCircle}
          title="Access Restricted"
          message="Station assignment is only available for Frontline/Agent and Specialized Agent roles."
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={MapPin}
          tint="blue"
          eyebrow="Workplace"
          title="Station Assignment"
          subtitle="Assign yourself to workstations before your schedule starts"
        />
      </motion.div>

      {/* Date Selector */}
      <motion.div
        className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        variants={itemVariants}
      >
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Select Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </motion.div>

      {/* Workplace Info */}
      {workplace && (
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">{workplace.name}</h2>
          </div>
          <p className="text-sm text-slate-500">
            {workplace.workstationCount} workstation{workplace.workstationCount !== 1 ? "s" : ""} available
          </p>
        </motion.div>
      )}

      {/* Schedules List */}
      <motion.div
        className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        variants={itemVariants}
      >
        <SectionHeader
          icon={Calendar}
          title={`Schedules for ${new Date(selectedDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}`}
        />

        {fetchByDateLoading ? (
          <SkeletonGrid count={3} columns="grid-cols-1" />
        ) : schedulesWithAssignments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Schedules Found"
            message={`You don't have a schedule for ${new Date(selectedDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}`}
          />
        ) : (
          <div className="space-y-4">
            {schedulesWithAssignments.map((schedule) => (
              <motion.div
                key={schedule._id || schedule.userId}
                className="border border-slate-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-shadow"
                variants={itemVariants}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-slate-900">
                        {schedule.scheduleInfo
                          ? formatTime(schedule.scheduleInfo.startTime) +
                            " - " +
                            formatTime(schedule.scheduleInfo.endTime)
                          : "No time information"}
                      </h3>
                      {schedule.currentAssignment && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {schedule.currentAssignment.stationName}
                        </span>
                      )}
                    </div>
                    {schedule.scheduleInfo && (
                      <p className="text-sm text-slate-600">
                        {schedule.sessions?.[0]?.label || "Regular Work"}
                      </p>
                    )}
                    {schedule.scheduleStarted && (
                      <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Schedule has started - cannot change assignment
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {schedule.canAssign ? (
                      <button
                        onClick={() => handleOpenAssignModal(schedule)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        {schedule.currentAssignment ? "Change Station" : "Assign Station"}
                      </button>
                    ) : schedule.scheduleStarted ? (
                      <div className="px-4 py-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl">
                        Started
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Self-Assignment Modal */}
      {workplace && selectedSchedule && (
        <SelfAssignStationModal
          open={showAssignModal}
          workplace={workplace}
          schedule={selectedSchedule}
          userId={user._id || ""}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedSchedule(null);
          }}
          onSuccess={handleAssignmentSuccess}
        />
      )}

      <Chatbot />
    </motion.div>
  );
}

