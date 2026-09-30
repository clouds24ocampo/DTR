import { useMemo, useState } from "react";
import type {
  ILeaveRequestDoc,
  LeaveStatus,
  UpdateLeaveStatusBodyInput,
} from "../../../types/global/leave/leave.type";

const getLeaveId = (x?: { id?: string; _id?: string } | null) =>
  (x?.id || x?._id || "").trim();

type Props = {
  leaves: ILeaveRequestDoc[];
  canModerate: boolean;
  onEdit: (leave: ILeaveRequestDoc) => void;
  onUpdateStatus: (
    leaveId: string,
    payload: UpdateLeaveStatusBodyInput
  ) => Promise<void>;
  loading: boolean;
};

export default function LeaveList({
  leaves,
  canModerate,
  onEdit,
  onUpdateStatus,
  loading,
}: Props) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "all">("all");

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
  type ModerationStatus = UpdateLeaveStatusBodyInput["status"];
  const handleUpdate = async (
    leave: ILeaveRequestDoc,
    next: ModerationStatus,
    promptMsg: string,
    reviewerName: string
  ) => {
    const leaveId = getLeaveId(leave);
    if (!leaveId) return;
    const note = window.prompt(promptMsg, "") || undefined;
    await onUpdateStatus(leaveId, {
      status: next,
      reviewerId: leave.employeeId,
      reviewerName,
      note,
    });
  };

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-b">
        <label className="w-full sm:w-1/2">
          <span className="sr-only">Search by employee or reason</span>
          <input
            type="text"
            placeholder="Search by employee or reason"
            className="w-full rounded-lg border px-4 py-2 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>

        <label className="w-full sm:w-56">
          <span className="sr-only">Filter by status</span>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as LeaveStatus | "all")
            }
            className="w-full rounded-lg border px-4 py-2 text-sm bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="canceled">Canceled</option>
          </select>
        </label>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Employee</th>
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
                  <td className="px-4 py-3">{l.employeeName}</td>
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
                      {canModerate && l.status === "pending" && (
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
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                            onClick={() =>
                              handleUpdate(
                                l,
                                "approved",
                                "Optional note for approval?",
                                "Reviewer"
                              )
                            }
                            disabled={loading}
                            title="Approve"
                          >
                            Approve
                          </button>
                          <button
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                            onClick={() =>
                              handleUpdate(
                                l,
                                "rejected",
                                "Reason for rejection?",
                                "Reviewer"
                              )
                            }
                            disabled={loading}
                            title="Reject"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {l.status === "pending" && (
                        <button
                          className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300 disabled:opacity-50"
                          onClick={() =>
                            handleUpdate(
                              l,
                              "canceled",
                              "Add a note for cancellation (optional)",
                              "Requester"
                            )
                          }
                          disabled={loading}
                          title="Cancel request"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredLeaves.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
                  No leave requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        {filteredLeaves.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No leave requests found.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredLeaves.map((l, idx) => {
              const key =
                getLeaveId(l) ||
                `${l.employeeId}-${l.startDate}-${l.endDate}-${
                  l.requestedAt ?? ""
                }-${idx}`;
              return (
                <li key={key} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{l.employeeName}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {l.type}
                        {l.halfDay ? " • Half-day" : ""}
                      </p>
                    </div>
                    {statusBadge(l.status)}
                  </div>

                  <div className="mt-2 text-sm">
                    <p className="text-gray-700">
                      {l.startDate} → {l.endDate}
                    </p>
                    {l.reason && (
                      <p className="mt-1 line-clamp-3 text-gray-600">
                        {l.reason}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {canModerate && l.status === "pending" && (
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
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                          onClick={() =>
                            handleUpdate(
                              l,
                              "approved",
                              "Optional note for approval?",
                              "Reviewer"
                            )
                          }
                          disabled={loading}
                          title="Approve"
                        >
                          Approve
                        </button>
                        <button
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                          onClick={() =>
                            handleUpdate(
                              l,
                              "rejected",
                              "Reason for rejection?",
                              "Reviewer"
                            )
                          }
                          disabled={loading}
                          title="Reject"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {l.status === "pending" && (
                      <button
                        className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300 disabled:opacity-50"
                        onClick={() =>
                          handleUpdate(
                            l,
                            "canceled",
                            "Add a note for cancellation (optional)",
                            "Requester"
                          )
                        }
                        disabled={loading}
                        title="Cancel request"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
