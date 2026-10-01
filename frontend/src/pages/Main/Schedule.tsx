/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import ScheduleDetails from "../../components/workforce/schedule/ScheduleDetails";
import { useScheduleStore } from "../../stores/global/schedule/schedule.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import Chatbot from "../../components/common/ChatBot";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";

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
    new Date().toLocaleDateString("en-CA")
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
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={CalendarDays}
          tint="blue"
          eyebrow="Scheduling"
          title="My Schedule"
          subtitle={
            user
              ? "View and manage your work schedule"
              : isUserLoading
              ? "Loading your account…"
              : "Could not detect your account. Try refreshing."
          }
        />
      </motion.div>

      {/* Schedule Details */}
      {user && (
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
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
        <motion.div variants={itemVariants}>
          <EmptyState
            icon={CalendarDays}
            title="Sign in required"
            message="Please log in to view your schedule"
          />
        </motion.div>
      )}
      <Chatbot />
    </motion.div>
  );
}
