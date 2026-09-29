import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LeaveList from "../../../components/workforce/leave/LeaveList";
import LeaveModal from "../../../components/workforce/leave/LeaveModal";
import LeaveSummaryCards from "../../../components/workforce/leave/LeaveSummaryCards";
import { useLeaveStore } from "../../../stores/global/leave/leave.store";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import {
  ILeaveRequestDoc,
  EditLeaveRequestBodyInput,
  UpdateLeaveStatusBodyInput,
  LeaveStatus,
} from "../../../types/global/leave/leave.type";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import Chatbot from "../../../components/common/ChatBot";
import { CalendarDays } from "lucide-react";

export default function LeaveManagement() {
  const navigate = useNavigate();
  const { user, otherUsers, fetchOtherUsers, fetchMe } = useUserStore();

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

  /** Only Workforce role can approve/decline leave requests. */
  const canApprove = useMemo(() => {
    const pos = user?.position;
    const roles = Array.isArray(pos)
      ? pos.map((p) => (p ?? "").toLowerCase())
      : [(pos ?? "").toLowerCase()];
    return roles.some((role) => role.includes("workforce"));
  }, [user]);
  const {
    leaves,
    fetchAllLeaves,
    fetchLeavesByEmployeeId,
    editLeave,
    updateLeaveStatus,
    fetchAllLoading,
    fetchByEmployeeLoading,
    updateLoading,
    error,
  } = useLeaveStore();

  const [showEdit, setShowEdit] = useState(false);
  const [currentLeave] = useState<ILeaveRequestDoc | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "all">("all");

  useEffect(() => {
    if (!user) {
      fetchMe().catch(() => void 0);
    }
  }, [user, fetchMe]);

  useEffect(() => {
    fetchOtherUsers().catch(() => void 0);
  }, [fetchOtherUsers]);

  useEffect(() => {
    if (!user) return;

    if (canModerate) {
      fetchAllLeaves().catch(() => void 0);
    } else if (user?._id) {
      fetchLeavesByEmployeeId(user._id).catch(() => void 0);
    }
  }, [user, canModerate, fetchAllLeaves, fetchLeavesByEmployeeId]);

  const filteredLeaves = useMemo(() => {
    if (canModerate) return leaves;
    return leaves.filter((l) => {
      const ownerId =
        typeof l.employeeId === "object"
          ? (l.employeeId as any)?._id || (l.employeeId as any)?.id
          : l.employeeId;
      return ownerId === user?._id;
    });
  }, [leaves, canModerate, user?._id]);

  const handleUpdate = async (id: string, patch: EditLeaveRequestBodyInput) => {
    const editorId = (user?._id || "").trim();
    await editLeave(id, patch, editorId);
  };

  const handleUpdateStatus = async (
    leaveId: string,
    payload: UpdateLeaveStatusBodyInput
  ) => {
    const safeId = (leaveId || "").trim();
    if (!safeId) return;

    const reviewerId = user?._id ?? payload.reviewerId;
    const reviewerName =
      [user?.firstName, user?.middleName, user?.lastName]
        .filter(Boolean)
        .join(" ") || payload.reviewerName;

    await updateLeaveStatus(safeId, { ...payload, reviewerId, reviewerName });
  };

  const loading = fetchAllLoading || fetchByEmployeeLoading;

  return (
    <motion.div
      className="w-full space-y-8 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-100">
            Leave Administration
          </h1>
          <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
            Streamline your workforce leave requests, approvals, and balance tracking from a single management console.
          </p>
          {error && (
            <motion.div
              className="mt-4 px-4 py-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-3 text-rose-600"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              <p className="text-sm font-bold">System Sync Error: {error}</p>
            </motion.div>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate("/workforce-leave-calendar")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
        >
          <CalendarDays className="h-4 w-4" />
          <span>Leave Calendar</span>
        </button>
      </motion.div>

      {/* Summary Section */}
      <motion.div variants={itemVariants} className="px-1">
        <LeaveSummaryCards
          leaves={filteredLeaves}
          selectedStatus={statusFilter}
          onStatusClick={setStatusFilter}
        />
      </motion.div>

      {/* Main List Area */}
      <motion.div
        className="space-y-4"
        variants={itemVariants}
      >
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-6 bg-indigo-600 rounded-full" />
          <h2 className="text-lg font-bold text-slate-300">Request Registry</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-200/50">
          {loading ? (
            <div className="py-32 text-center">
              <div className="inline-flex items-center justify-center p-4 bg-indigo-50 rounded-lg mb-4">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-600 font-bold tracking-tight">Retrieving registry records...</p>
            </div>
          ) : (
            <LeaveList
              leaves={filteredLeaves}
              canModerate={canModerate}
              canApprove={canApprove}
              onUpdateStatus={handleUpdateStatus}
              loading={updateLoading}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              employees={otherUsers as any}
              userRoleKey={(() => {
                if (!user) return undefined;
                const pos = Array.isArray(user.position) ? user.position : [user.position];
                const posLower = pos.map((p) => (p || "").toLowerCase());
                if (posLower.some((p) => p.includes("hr"))) return "hr";
                if (posLower.some((p) => p.includes("workforce"))) return "workforce";
                if (posLower.some((p) => p.includes("team leader"))) return "teamLeader";
                // Fallback for managers/superadmin
                if (posLower.some((p) => p.includes("management"))) return "hr";
                if (posLower.some((p) => p.includes("operation manager"))) return "teamLeader";
                return undefined;
              })()}
            />
          )}
        </div>
      </motion.div>

      {/* Modals */}
      <LeaveModal
        open={showEdit}
        mode="edit"
        initial={currentLeave}
        onClose={() => setShowEdit(false)}
        onUpdate={handleUpdate}
        loading={updateLoading}
      />
      <Chatbot />
    </motion.div>
  );
}
