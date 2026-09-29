import { useMemo, useState } from "react";
import { ILeaveRequestDoc, UpdateLeaveStatusBodyInput, LeaveStatus } from "../../../types/global/leave/leave.type";
import { UserType } from "../../../types/workforce/user/user.type";
import PromptModal from "../../global/PromptModal";
import LeaveDetailsModal from "./LeaveDetailsModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  XCircle,
  Search,
  Filter,
  ArrowRight,
  UserCheck,
  Ban
} from "lucide-react";

const getLeaveId = (x?: { id?: string; _id?: string } | null) =>
  (x?.id || x?._id || "").trim();

const ApprovalBadge = ({ role, data }: { role: string; data?: any }) => {
  const status = data?.status || "pending";
  const colors = {
    pending: "bg-slate-100 text-slate-500 border-slate-200",
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-100 text-rose-700 border-rose-200",
  };
  const icon =
    status === "misc" ? null : status === "approved" ? (
      <UserCheck className="w-3 h-3" />
    ) : status === "rejected" ? (
      <XCircle className="w-3 h-3" />
    ) : (
      <Clock className="w-3 h-3" />
    );

  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${colors[status as keyof typeof colors]
        }`}
      title={
        status !== "pending"
          ? `${status.toUpperCase()} by ${data?.userName || "Reviewer"} on ${data?.date?.split("T")[0]
          }`
          : "Pending Review"
      }
    >
      {icon}
      {role}
    </div>
  );
};

type Props = {
  leaves: ILeaveRequestDoc[];
  canModerate: boolean;
  /** When true, user can approve/decline leave requests (Workforce role only). */
  canApprove?: boolean;
  onUpdateStatus: (
    leaveId: string,
    payload: UpdateLeaveStatusBodyInput
  ) => Promise<void>;
  loading: boolean;
  statusFilter: LeaveStatus | "all";
  onStatusFilterChange: (status: LeaveStatus | "all") => void;
  employees: UserType[];
  userRoleKey?: "hr" | "workforce" | "teamLeader";
};

export default function LeaveList({
  leaves,
  canModerate: _canModerate,
  canApprove = false,
  onUpdateStatus,
  loading,
  statusFilter,
  onStatusFilterChange,
  employees,
  userRoleKey,
}: Props) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [detailsModal, setDetailsModal] = useState<{
    open: boolean;
    leave: ILeaveRequestDoc | null;
  }>({
    open: false,
    leave: null,
  });
  const [promptModal, setPromptModal] = useState<{
    open: boolean;
    leave: ILeaveRequestDoc | null;
    nextStatus: UpdateLeaveStatusBodyInput["status"] | null;
    promptMsg: string;
    reviewerName: string;
  }>({
    open: false,
    leave: null,
    nextStatus: null,
    promptMsg: "",
    reviewerName: "",
  });

  const filteredLeaves = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return leaves.filter((leave) => {
      const matchesSearch =
        !q ||
        leave.employeeName.toLowerCase().includes(q) ||
        leave.reason.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || leave.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leaves, searchTerm, statusFilter]);

  const getReporterInfo = (id: any) => {
    const searchId = typeof id === "object" ? id?._id || id?.id : id;
    return employees.find((u) => u._id === searchId);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusConfig = (s: LeaveStatus) => {
    const configs: Record<
      LeaveStatus,
      {
        icon: any;
        color: string;
        bg: string;
        border: string;
        ring: string;
        text: string;
      }
    > = {
      pending: {
        icon: Clock,
        color: "amber",
        bg: "bg-amber-50",
        border: "border-amber-200",
        ring: "ring-amber-500/10",
        text: "text-amber-700",
      },
      approved: {
        icon: UserCheck,
        color: "emerald",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        ring: "ring-emerald-500/10",
        text: "text-emerald-700",
      },
      rejected: {
        icon: Ban,
        color: "rose",
        bg: "bg-rose-50",
        border: "border-rose-200",
        ring: "ring-rose-500/10",
        text: "text-rose-700",
      },
      canceled: {
        icon: XCircle,
        color: "slate",
        bg: "bg-slate-50",
        border: "border-slate-200",
        ring: "ring-slate-500/10",
        text: "text-slate-700",
      },
    };
    return configs[s] || configs.pending;
  };

  type ModerationStatus = UpdateLeaveStatusBodyInput["status"];
  const handleUpdate = (
    leave: ILeaveRequestDoc,
    next: ModerationStatus,
    promptMsg: string,
    reviewerName: string
  ) => {
    setPromptModal({
      open: true,
      leave,
      nextStatus: next,
      promptMsg,
      reviewerName,
    });
  };

  const handlePromptConfirm = async (note: string) => {
    if (!promptModal.leave || !promptModal.nextStatus) return;

    const leaveId = getLeaveId(promptModal.leave);
    if (!leaveId) {
      setPromptModal({ ...promptModal, open: false });
      return;
    }

    await onUpdateStatus(leaveId, {
      status: promptModal.nextStatus,
      reviewerId: "", // Parent (LeaveManagement) sets from current user so backend records workforce approver correctly
      reviewerName: promptModal.reviewerName,
      note: note.trim() || undefined,
    });

    setPromptModal({
      open: false,
      leave: null,
      nextStatus: null,
      promptMsg: "",
      reviewerName: "",
    });
  };

  const handlePromptCancel = () => {
    setPromptModal({
      open: false,
      leave: null,
      nextStatus: null,
      promptMsg: "",
      reviewerName: "",
    });
  };

  const handleRowClick = (leave: ILeaveRequestDoc) => {
    setDetailsModal({
      open: true,
      leave,
    });
  };

  const handleActionClick = (e: React.MouseEvent, callback: () => void) => {
    e.stopPropagation();
    callback();
  };

  const canAction = (leave: ILeaveRequestDoc) => {
    if (!canApprove) return false;
    if (leave.status === "pending") {
      if (!userRoleKey) return false;
      const myState = leave.approvals?.[userRoleKey]?.status || "pending";
      return myState === "pending";
    }
    return false;
  };

  return (
    <div className="bg-white">
      {/* Table Header Controls */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="relative group flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Filter by employee name, department, or reason..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200 outline-none shadow-sm text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  onStatusFilterChange(e.target.value as LeaveStatus | "all")
                }
                className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none appearance-none cursor-pointer pr-4"
              >
                <option value="all">All Stages</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
            <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-black uppercase tracking-wider shadow-sm border border-indigo-100">
              {filteredLeaves.length} Records
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Personnel
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Duration
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Approvals
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Status
              </th>
              <th className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Operations
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            <AnimatePresence mode="popLayout">
              {filteredLeaves.map((l, idx) => {
                const key = getLeaveId(l) || `leave-${idx}`;
                const config = getStatusConfig(l.status);
                const reporter = getReporterInfo(l.employeeId);

                return (
                  <motion.tr
                    key={key}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group hover:bg-slate-50/80 transition-all duration-150 cursor-pointer relative"
                    onClick={() => handleRowClick(l)}
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {reporter?.profilePicture ? (
                            <img
                              src={reporter.profilePicture}
                              alt={l.employeeName}
                              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[12px] font-black border-2 border-white shadow-sm">
                              {getInitials(l.employeeName)}
                            </div>
                          )}
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${l.status === "approved"
                              ? "bg-emerald-500"
                              : l.status === "pending"
                                ? "bg-amber-500"
                                : "bg-slate-300"
                              }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {l.employeeName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">
                            {reporter?.position || "Core Team"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                          <span>{l.startDate}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{l.endDate}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {l.type}
                          </span>
                          {l.halfDay && (
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              Half
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        <ApprovalBadge role="Workforce" data={l.approvals?.workforce} />
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ring-1 ${config.bg} ${config.text} ${config.border} ${config.ring}`}
                      >
                        <config.icon className="w-3.5 h-3.5" />
                        {l.status}
                      </div>
                      {l.rejectionReason && (
                        <p className="text-[10px] text-rose-600 mt-1 max-w-[150px] truncate" title={l.rejectionReason}>
                          Reason: {l.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {canAction(l) && (
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow-md hover:bg-emerald-700 transition-all border border-emerald-500"
                              onClick={(e) =>
                                handleActionClick(e, () =>
                                  handleUpdate(
                                    l,
                                    "approved",
                                    "Approve this request?",
                                    "Reviewer"
                                  )
                                )
                              }
                              disabled={loading}
                            >
                              Approve
                            </button>
                            <button
                              className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow-md hover:bg-rose-700 transition-all border border-rose-500"
                              onClick={(e) =>
                                handleActionClick(e, () =>
                                  handleUpdate(
                                    l,
                                    "rejected",
                                    "Reason for rejection:",
                                    "Reviewer"
                                  )
                                )
                              }
                              disabled={loading}
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        <button className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                          View
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>

            {filteredLeaves.length === 0 && (
              <tr>
                <td colSpan={6} className="py-24 text-center">
                  <div className="inline-flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Filter className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-800 font-bold tracking-tight mb-1">
                      No requests match your current filters
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Experience */}
      <div className="md:hidden">
        {filteredLeaves.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Filter className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-800 font-bold tracking-tight">
              Zero Registry Hits
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLeaves.map((l, idx) => {
              const key = getLeaveId(l) || `leave-mobile-${idx}`;
              const config = getStatusConfig(l.status);
              const reporter = getReporterInfo(l.employeeId);

              return (
                <div
                  key={key}
                  className="p-6 active:bg-slate-50 transition-colors"
                  onClick={() => handleRowClick(l)}
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      {reporter?.profilePicture ? (
                        <img
                          src={reporter.profilePicture}
                          className="w-10 h-10 rounded-full object-cover shadow-sm bg-slate-100"
                          alt=""
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                          {getInitials(l.employeeName)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-none mb-1">
                          {l.employeeName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          {l.type}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border leading-none ${config.bg} ${config.text} ${config.border}`}
                    >
                      {l.status}
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                    <ApprovalBadge role="Workforce" data={l.approvals?.workforce} />
                  </div>

                  {canAction(l) && (
                    <div
                      className="grid grid-cols-2 gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm"
                        onClick={() =>
                          handleUpdate(
                            l,
                            "approved",
                            "Validate this request?",
                            "Reviewer"
                          )
                        }
                      >
                        Approve
                      </button>
                      <button
                        className="flex-1 py-2.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm"
                        onClick={() =>
                          handleUpdate(
                            l,
                            "rejected",
                            "Decline this request?",
                            "Reviewer"
                          )
                        }
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <LeaveDetailsModal
        open={detailsModal.open}
        leave={detailsModal.leave}
        onClose={() => setDetailsModal({ open: false, leave: null })}
      />

      <PromptModal
        open={promptModal.open}
        title="Administrative Decision"
        message={promptModal.promptMsg}
        defaultValue=""
        placeholder="Input administrative justification (optional)..."
        onConfirm={handlePromptConfirm}
        onCancel={handlePromptCancel}
      />
    </div>
  );
}
