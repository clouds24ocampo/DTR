import {
  Clock,
  XCircle,
  Search,
  Filter,
  Activity,
  UserCheck,
  Ban,
  CalendarDays,
  ShieldCheck,
  Zap,
  MoreVertical,
  User,
  Calendar,
  MessageSquare,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  ILeaveRequestDoc,
  LeaveStatus,
  UpdateLeaveStatusBodyInput,
} from "../../../types/global/leave/leave.type";
import { motion, AnimatePresence } from "framer-motion";

const ApprovalBadge = ({ role, data, onClick }: { role: string; data?: any; onClick?: () => void }) => {
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
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase cursor-pointer hover:opacity-80 transition-opacity ${colors[status as keyof typeof colors]
        }`}
      title={
        status !== "pending"
          ? `${status.toUpperCase()} by ${data?.userName || "Reviewer"} on ${data?.date?.split("T")[0]
          }${data?.note ? ` - Note: ${data.note}` : ""}`
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
  onEdit: (leave: ILeaveRequestDoc) => void;
  onUpdateStatus: (
    leaveId: string,
    payload: UpdateLeaveStatusBodyInput
  ) => Promise<void>;
  loading: boolean;
};

export default function MyLeaveList({
  leaves,
  onEdit,
  onUpdateStatus,
  loading,
}: Props) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "all">("all");
  const [selectedLeave, setSelectedLeave] = useState<ILeaveRequestDoc | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      const matchesSearch =
        leave.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || leave.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leaves, searchTerm, statusFilter]);

  const getStatusConfig = (s: LeaveStatus) => {
    const configs: Record<LeaveStatus, {
      icon: any,
      color: string,
      bg: string,
      border: string,
      ring: string,
      text: string,
      label: string
    }> = {
      pending: {
        icon: Clock,
        color: "amber",
        bg: "bg-amber-50",
        border: "border-amber-200",
        ring: "ring-amber-500/10",
        text: "text-amber-700",
        label: "Pending"
      },
      approved: {
        icon: UserCheck,
        color: "emerald",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        ring: "ring-emerald-500/10",
        text: "text-emerald-700",
        label: "Approved"
      },
      rejected: {
        icon: Ban,
        color: "rose",
        bg: "bg-rose-50",
        border: "border-rose-200",
        ring: "ring-rose-500/10",
        text: "text-rose-700",
        label: "Declined"
      },
      canceled: {
        icon: XCircle,
        color: "slate",
        bg: "bg-slate-50",
        border: "border-slate-200",
        ring: "ring-slate-500/10",
        text: "text-slate-700",
        label: "Cancelled"
      },
    };
    return configs[s] || configs.pending;
  };

  return (
    <div className="bg-white">
      {/* Header Filters */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="relative group flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Filter your requests by reason or type..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 outline-none shadow-sm text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer appearance-none shadow-sm transition-all"
              >
                <option value="all">All Records</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Declined</option>
                <option value="canceled">Cancelled</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-slate-400 rotate-45" />
              </div>
            </div>

            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-black uppercase tracking-wider shadow-sm border border-blue-100">
              {filteredLeaves.length} Files
            </div>
          </div>
        </div>
      </div>

      {/* Requests table */}
      <div className="overflow-hidden">
        <div className="min-w-full divide-y divide-slate-100">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/50">
            <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3 h-3" /> Type
            </div>
            <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <CalendarDays className="w-3 h-3" /> Schedule
            </div>
            <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</div>
            <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Approvals</div>
            <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</div>
            <div className="col-span-1 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">Actions</div>
          </div>

          <div className="divide-y divide-slate-50 min-h-[400px]">
            <AnimatePresence mode="popLayout">
              {filteredLeaves.map((l, idx) => {
                const key = l.id || `leave-${idx}`;
                const config = getStatusConfig(l.status);

                return (
                  <motion.div
                    key={key}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-12 gap-4 px-6 py-6 group hover:bg-slate-50/80 transition-all duration-200 items-center"
                  >
                    {/* Classification */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bg} ${config.text} border ${config.border} shadow-sm group-hover:scale-110 transition-transform`}>
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 tracking-tight capitalize">{l.type}</p>
                        </div>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-tighter">Start</span>
                          <div className="w-px h-3 bg-slate-200 my-0.5" />
                          <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-tighter">End</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-700 tracking-tight">{l.startDate}</span>
                          <span className="text-xs font-black text-slate-700 tracking-tight">{l.endDate}</span>
                        </div>
                        {l.halfDay && (
                          <div className="ml-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                            Half
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Justification */}
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-slate-600 leading-relaxed line-clamp-2 italic pr-4" title={l.reason}>
                        "{l.reason}"
                      </p>
                    </div>

                    {/* Approvals (Workforce only) */}
                    <div className="col-span-2">
                      <div className="flex flex-wrap gap-1">
                        <ApprovalBadge role="Workforce" data={l.approvals?.workforce} onClick={() => { setSelectedLeave(l); setShowReviewModal(true); }} />
                      </div>
                    </div>

                    {/* Stage */}
                    <div className="col-span-2">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border group-hover:shadow-sm transition-all shadow-none ${config.bg} ${config.text} ${config.border} ring-2 ring-transparent ring-offset-0 group-hover:ring-${config.color}-500/10`}>
                          <config.icon className="w-3.5 h-3.5" />
                          {config.label}
                        </span>
                        {(l.rejectionReason || l.review?.note) && (
                          <p
                            onClick={() => { setSelectedLeave(l); setShowReviewModal(true); }}
                            className={`text-[10px] font-bold max-w-[150px] line-clamp-2 cursor-pointer hover:underline ${l.status === 'rejected' || l.status === 'canceled' ? 'text-rose-600' : 'text-slate-500'
                              }`} title={l.rejectionReason || l.review?.note}>
                            Note: {l.rejectionReason || l.review?.note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end gap-2 pr-2">
                      {l.status === "pending" && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => onEdit(l)}
                            disabled={loading}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                            title="Modify Submission"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              const note = window.prompt("Reason for archiving this request? (Optional)", "");
                              if (window.confirm("Are you sure you want to archive this request?")) {
                                await onUpdateStatus(l.id ?? l._id ?? l.idNumber, {
                                  status: "canceled",
                                  reviewerId: l.employeeId,
                                  reviewerName: "Requester",
                                  note: note || undefined,
                                });
                              }
                            }}
                            disabled={loading}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"
                            title="Archive Submission"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredLeaves.length === 0 && (
              <div className="py-24 text-center">
                <div className="w-16 h-16 mx-auto bg-slate-50 rounded-lg flex items-center justify-center mb-4 ring-1 ring-slate-100">
                  <ShieldCheck className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">No leave requests</h3>
                <p className="text-xs font-bold text-slate-400 mt-1 italic">No records match your current search.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && selectedLeave && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Review Details</h3>
                    <p className="text-[10px] font-bold text-slate-400 capitalize">{selectedLeave.type} Request</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Leave Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      {selectedLeave.startDate} to {selectedLeave.endDate}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Reason</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 italic line-clamp-2">"{selectedLeave.reason}"</p>
                  </div>
                </div>

                {/* Approval Timeline */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Review Timeline</h4>

                  <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {[
                      { role: "Workforce", data: selectedLeave.approvals?.workforce },
                    ].map((step) => {
                      const status = step.data?.status || "pending";

                      return (
                        <div key={step.role} className="relative pl-10">
                          <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ring-2 ${status === 'approved' ? 'bg-emerald-500 ring-emerald-100' :
                            status === 'rejected' ? 'bg-rose-500 ring-rose-100' :
                              'bg-slate-300 ring-slate-100'
                            }`} />

                          <div className={`p-3 rounded-xl border ${status === 'approved' ? 'bg-emerald-50/30 border-emerald-100' :
                            status === 'rejected' ? 'bg-rose-50/30 border-rose-100' :
                              'bg-slate-50/30 border-slate-100'
                            }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">{step.role}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                  'bg-slate-200 text-slate-500'
                                }`}>
                                {status}
                              </span>
                            </div>

                            {step.data?.date && (
                              <div className="flex items-center gap-1.5 mb-2">
                                <User className="w-2.5 h-2.5 text-slate-400" />
                                <span className="text-[9px] font-bold text-slate-500">
                                  {step.data.userName} • {new Date(step.data.date).toLocaleString()}
                                </span>
                              </div>
                            )}

                            {step.data?.note ? (
                              <p className="text-xs font-medium text-slate-600 bg-white/50 p-2 rounded-lg border border-slate-100">
                                {step.data.note}
                              </p>
                            ) : status !== 'pending' ? (
                              <p className="text-[10px] italic text-slate-400">No comment provided.</p>
                            ) : (
                              <p className="text-[10px] italic text-slate-400">Awaiting review...</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Requester Action (if any) */}
                {(selectedLeave.status === 'canceled' || (selectedLeave.review?.note && selectedLeave.status === 'rejected')) && (
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Ban className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-black text-rose-700 uppercase tracking-wider">
                        {selectedLeave.status === 'canceled' ? 'Request Canceled' : 'Final Rejection Note'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-rose-600 bg-white/50 p-3 rounded-lg border border-rose-100 leading-relaxed">
                      {selectedLeave.review?.note || selectedLeave.rejectionReason}
                    </p>
                    {selectedLeave.status === 'canceled' && selectedLeave.review?.reviewedAt && (
                      <p className="text-[9px] font-bold text-rose-400 mt-2 text-right">
                        Canceled on {new Date(selectedLeave.review.reviewedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
