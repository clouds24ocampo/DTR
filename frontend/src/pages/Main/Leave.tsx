import { CalendarClock, ClipboardList, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLeaveStore } from "../../stores/global/leave/leave.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import PageHeader from "../../components/ui/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import { SectionHeader } from "../../components/ui/dashboardUi";
import LeaveModal from "../../components/global/leave/LeaveModal";
import LeaveSummaryCards from "../../components/global/leave/LeaveSummaryCards";
import MyLeaveList from "../../components/global/leave/MyLeaveList";
import type {
  CreateLeaveRequestBodyInput,
  EditLeaveRequestBodyInput,
  ILeaveRequestDoc,
  UpdateLeaveStatusBodyInput,
} from "../../types/global/leave/leave.type";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import Chatbot from "../../components/common/ChatBot";

/** Leave filing page: all roles can file and manage their own leave requests. */
export default function Leave() {
  const { user, fetchMe, fetchUserLoading } = useUserStore();
  const {
    leaves,
    fetchLeavesByEmployeeId,
    createLeave,
    editLeave,
    fetchByEmployeeLoading,
    createLoading,
    updateLoading,
    error,
  } = useLeaveStore();

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [currentLeave, setCurrentLeave] = useState<ILeaveRequestDoc | null>(null);

  useEffect(() => {
    if (!user) {
      void fetchMe();
    }
  }, [user, fetchMe]);

  useEffect(() => {
    if (user?._id) {
      void fetchLeavesByEmployeeId(user._id);
    }
  }, [user?._id, fetchLeavesByEmployeeId]);

  const myLeaves = useMemo(
    () => leaves.filter((l) => l.employeeId === user?._id),
    [leaves, user?._id]
  );

  const handleCreate = async (payload: CreateLeaveRequestBodyInput) => {
    if (!user?._id) return;
    await createLeave({
      ...payload,
      employeeId: user._id,
      employeeName: [user.firstName, user.middleName, user.lastName]
        .filter(Boolean)
        .join(" "),
    });
  };

  const handleUpdate = async (id: string, patch: EditLeaveRequestBodyInput) => {
    const editorId = (user?._id || "").trim();
    const safeId = (id || "").trim();
    if (!safeId || !editorId) return;
    await editLeave(safeId, patch, editorId);
    setShowEdit(false);
    setCurrentLeave(null);
  };

  const handleEditLeave = (leave: ILeaveRequestDoc) => {
    setCurrentLeave(leave);
    setShowEdit(true);
  };

  const handleUpdateLeaveStatus = async (
    leaveId: string,
    payload: UpdateLeaveStatusBodyInput
  ) => {
    console.log("Update leave status", leaveId, payload);
  };

  const loading = fetchByEmployeeLoading || fetchUserLoading;

  return (
    <motion.div
      className="w-full space-y-8 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Area */}
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={CalendarClock}
          tint="blue"
          eyebrow="Time Off"
          title="Absence Management"
          subtitle="Track your leave requests, vacation schedule, and approval history from your personal administrative dashboard."
          actions={
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreate(true)}
              className="hidden md:flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] disabled:opacity-50"
              disabled={createLoading || loading}
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              Create New Request
            </motion.button>
          }
        />
      </motion.div>

      {/* Error banner */}
      <motion.div variants={itemVariants}>
        <ErrorBanner message={error} />
      </motion.div>

      {/* Summary Section */}
      <motion.div variants={itemVariants} className="px-1">
        <LeaveSummaryCards leaves={myLeaves} />
      </motion.div>

      {/* Main Content Area */}
      <motion.div
        className="space-y-4"
        variants={itemVariants}
      >
        <SectionHeader icon={ClipboardList} title="Personal Filing History" />

        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {loading ? (
            <div className="p-32 text-center">
              <div className="inline-flex items-center justify-center p-4 bg-blue-50 rounded-xl mb-4">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-slate-600 font-bold tracking-tight">Syncing with leave registry...</p>
            </div>
          ) : (
            <MyLeaveList
              leaves={myLeaves}
              onEdit={handleEditLeave}
              onUpdateStatus={handleUpdateLeaveStatus}
              loading={false}
            />
          )}
        </div>
      </motion.div>

      {/* Mobile Floating Trigger */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => setShowCreate(true)}
        disabled={createLoading || loading}
        className="fixed bottom-8 right-8 z-50 flex md:hidden items-center justify-center w-14 h-14 rounded-2xl shadow-xl bg-blue-600 text-white transition-all active:bg-blue-700"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </motion.button>

      {/* Modals */}
      <LeaveModal
        open={showCreate}
        mode="create"
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        loading={createLoading}
      />

      {currentLeave && (
        <LeaveModal
          open={showEdit}
          mode="edit"
          initial={currentLeave}
          onClose={() => {
            setShowEdit(false);
            setCurrentLeave(null);
          }}
          onUpdate={handleUpdate}
          loading={updateLoading}
        />
      )}
      <Chatbot />
    </motion.div>
  );
}
