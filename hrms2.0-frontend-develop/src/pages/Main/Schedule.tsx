/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import ScheduleDetails from "../../components/workforce/schedule/ScheduleDetails";
import { useScheduleStore } from "../../stores/global/schedule/schedule.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import Chatbot from "../../components/common/ChatBot";

export default function Schedule() {
  const { user } = useUserStore();
  const userStore = useUserStore() as any;
  const { schedules, fetchMySchedulesByDate, fetchByDateLoading } =
    useScheduleStore();

  const { fetchMe, fetchCurrentUser, getMe, loadingUser, loadingMe } =
    (userStore ?? {}) as Record<string, unknown>;
  const userLoadFn = useMemo(
    () =>
      (fetchMe || fetchCurrentUser || getMe) as
        | undefined
        | (() => Promise<unknown>),
    [fetchMe, fetchCurrentUser, getMe]
  );

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Ensure the logged-in user is hydrated
  useEffect(() => {
    if (!user && userLoadFn) {
      userLoadFn().catch((err) => console.error("Failed to load user:", err));
    }
  }, [user, userLoadFn]);

  // Logged-in user's id (fixed for this page)
  const selectedEmployee = user?._id ?? null;

  // For ScheduleDetails display
  const selectedEmp = useMemo(() => user ?? null, [user]);

  useEffect(() => {
    if (user?._id && selectedDate) {
      fetchMySchedulesByDate(selectedDate).catch((err) =>
        console.error("Error fetching schedules:", err)
      );
    }
  }, [user?._id, selectedDate, fetchMySchedulesByDate]);

  const isUserLoading = Boolean(loadingUser ?? loadingMe);

  return (
    <motion.div
      className="w-full space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-200">
            My Schedule
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            {user
              ? "View and manage your work schedule"
              : isUserLoading
              ? "Loading your account…"
              : "Could not detect your account. Try refreshing."}
          </p>
        </div>
      </motion.div>

      {/* Schedule Details */}
      {user && (
        <motion.div
          className="bg-white rounded-lg shadow-sm border border-gray-200"
          variants={itemVariants}
        >
          <ScheduleDetails
            selectedEmployee={selectedEmployee}
            selectedEmp={selectedEmp as any}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            schedules={schedules as any}
            loading={fetchByDateLoading}
            canEdit={false}
          />
        </motion.div>
      )}
      {!user && !isUserLoading && (
        <motion.div
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center"
          variants={itemVariants}
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Sign in required
          </h3>
          <p className="text-sm text-gray-600">
            Please log in to view your schedule
          </p>
        </motion.div>
      )}
      <Chatbot />
    </motion.div>
  );
}
