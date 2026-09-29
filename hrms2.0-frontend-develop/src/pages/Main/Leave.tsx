import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLeaveStore } from "../../stores/global/leave/leave.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
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
      <motion.div
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 px-1"
        variants={itemVariants}
      >
        <div className="space-y-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-200">
              Absence Management
            </h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">
              Track your leave requests, vacation schedule, and approval history from your personal administrative dashboard.
            </p>
          </div>
          {error && (
            <motion.div
              className="mt-4 px-4 py-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-3 text-rose-600"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              <p className="text-sm font-bold">Cloud Sync Warning: {error}</p>
            </motion.div>
          )}
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreate(true)}
          className="hidden md:flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] disabled:opacity-50"
          disabled={createLoading || loading}
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Create New Request
        </motion.button>
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
        <div className="flex items-center gap-2 px-1 text-slate-400">
          <div className="w-1 h-5 bg-blue-500 rounded-full" />
          <h2 className="text-xs font-black uppercase tracking-[0.2em]">Personal Filing History</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-200/50">
          {loading ? (
            <div className="p-32 text-center">
              <div className="inline-flex items-center justify-center p-4 bg-blue-50 rounded-lg mb-4">
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
        className="fixed bottom-8 right-8 z-50 flex md:hidden items-center justify-center w-14 h-14 rounded-lg shadow-xl bg-blue-600 text-white transition-all active:bg-blue-700"
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
