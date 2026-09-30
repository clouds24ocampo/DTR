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
import { CalendarDays, ClipboardList, FileText } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import ErrorBanner from "../../../components/ui/ErrorBanner";
import SkeletonGrid from "../../../components/ui/SkeletonGrid";
import { SectionHeader } from "../../../components/ui/dashboardUi";

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
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={FileText}
          eyebrow="Workforce"
          title="Leave Administration"
          subtitle="Streamline your workforce leave requests, approvals, and balance tracking from a single management console."
          actions={
            <button
              type="button"
              onClick={() => navigate("/workforce-leave-calendar")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Leave Calendar</span>
            </button>
          }
        />
      </motion.div>

      {/* Error banner */}
      <motion.div variants={itemVariants}>
        <ErrorBanner message={error} />
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
        <SectionHeader icon={ClipboardList} title="Request Registry" tint="indigo" />

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {loading ? (
            <SkeletonGrid count={4} columns="sm:grid-cols-2" />
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
