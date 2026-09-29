import { useMemo, useState } from "react";
import { ILeaveRequestDoc, UpdateLeaveStatusBodyInput, LeaveStatus } from "../../../types/global/leave/leave.type";
import PromptModal from "../../global/PromptModal";

const getLeaveId = (x?: { id?: string; _id?: string } | null) =>
  (x?.id || x?._id || "").trim();

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
  const [promptModal, setPromptModal] = useState<{
    open: boolean;
    leave: ILeaveRequestDoc | null;
  }>({
    open: false,
    leave: null,
  });

  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      const matchesSearch =
        leave.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.reason.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || leave.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leaves, searchTerm, statusFilter]);

  const statusBadge = (s: LeaveStatus) => {
    const map: Record<LeaveStatus, string> = {
      pending:
        "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 px-2 py-0.5 rounded-lg",
      approved:
        "bg-green-50 text-green-700 ring-1 ring-green-200 px-2 py-0.5 rounded-lg",
      rejected:
        "bg-red-50 text-red-700 ring-1 ring-red-200 px-2 py-0.5 rounded-lg",
      canceled:
        "bg-gray-100 text-gray-700 ring-1 ring-gray-300 px-2 py-0.5 rounded-lg",
    };
    return <span className={map[s]}>{s}</span>;
  };

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <input
          type="text"
          placeholder="Search by employee or reason"
          className="rounded-lg border px-4 py-2 text-sm w-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as LeaveStatus | "all")
          }
          className="rounded-lg border px-4 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Dates</th>
              <th className="px-4 py-3 text-left font-medium">Reason</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLeaves.map((l, idx) => {
              const key =
                getLeaveId(l) ||
                `${l.employeeId}-${l.startDate}-${l.endDate}-${
                  l.requestedAt ?? ""
                }-${idx}`;

              return (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 capitalize">{l.type}</td>
                  <td className="px-4 py-3">
                    {l.startDate} → {l.endDate}
                    {l.halfDay ? " • Half-day" : ""}
                  </td>
                  <td className="px-4 py-3 max-w-[28rem] truncate">
                    {l.reason}
                  </td>
                  <td className="px-4 py-3">{statusBadge(l.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {l.status === "pending" && (
                        <>
                          <button
                            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                            onClick={() => onEdit(l)}
                            disabled={loading}
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300 disabled:opacity-50"
                            onClick={() => {
                              setPromptModal({
                                open: true,
                                leave: l,
                              });
                            }}
                            disabled={loading}
                            title="Cancel request"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredLeaves.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                  No leave requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Prompt Modal */}
      <PromptModal
        open={promptModal.open}
        title="Cancel Leave Request"
        message="Add a note for cancellation (optional)"
        defaultValue=""
        placeholder="Enter your note here (optional)..."
        onConfirm={async (note) => {
          if (!promptModal.leave) return;
          await onUpdateStatus(promptModal.leave.id ?? promptModal.leave._id ?? promptModal.leave.idNumber, {
            status: "canceled",
            reviewerId: promptModal.leave.employeeId,
            reviewerName: "Requester",
            note: note.trim() || undefined,
          });
          setPromptModal({ open: false, leave: null });
        }}
        onCancel={() => {
          setPromptModal({ open: false, leave: null });
        }}
      />
    </div>
  );
}
