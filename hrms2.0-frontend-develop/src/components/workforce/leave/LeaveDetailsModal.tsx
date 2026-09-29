import { ILeaveRequestDoc, LeaveStatus } from "../../../types/global/leave/leave.type";
import ModalShell from "../../global/ModalShell";
import { Calendar, Clock, FileText, User, CheckCircle, XCircle, MinusCircle, AlertCircle } from "lucide-react";

type Props = {
  open: boolean;
  leave: ILeaveRequestDoc | null;
  onClose: () => void;
};

export default function LeaveDetailsModal({ open, leave, onClose }: Props) {
  if (!open || !leave) return null;

  const statusConfig = {
    pending: {
      label: "Pending",
      className: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
      icon: Clock,
    },
    approved: {
      label: "Approved",
      className: "bg-green-50 text-green-700 ring-1 ring-green-200",
      icon: CheckCircle,
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-50 text-red-700 ring-1 ring-red-200",
      icon: XCircle,
    },
    canceled: {
      label: "Canceled",
      className: "bg-gray-100 text-gray-700 ring-1 ring-gray-300",
      icon: MinusCircle,
    },
  };

  const statusInfo = statusConfig[leave.status as LeaveStatus] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const calculateDays = () => {
    if (!leave.startDate || !leave.endDate) return "N/A";
    try {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return leave.halfDay ? `${diffDays - 0.5} days (Half-day)` : `${diffDays} day${diffDays > 1 ? "s" : ""}`;
    } catch {
      return "N/A";
    }
  };

  return (
    <ModalShell title="Leave Request Details" onClose={onClose}>
      <div className="space-y-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusInfo.className}`}>
              <StatusIcon className="w-4 h-4" />
              <span className="font-medium capitalize">{statusInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Employee Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600" />
            Employee Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Employee Name</p>
              <p className="text-base font-medium text-gray-900">{leave.employeeName || "N/A"}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">ID Number</p>
              <p className="text-base font-medium text-gray-900">{leave.idNumber || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Leave Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            Leave Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Leave Type</p>
              <p className="text-base font-medium text-gray-900 capitalize">{leave.type || "N/A"}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Duration</p>
              <p className="text-base font-medium text-gray-900">{calculateDays()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Start Date</p>
              <p className="text-base font-medium text-gray-900">{formatDate(leave.startDate)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">End Date</p>
              <p className="text-base font-medium text-gray-900">{formatDate(leave.endDate)}</p>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Reason
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-base text-gray-900 whitespace-pre-wrap">{leave.reason || "No reason provided"}</p>
          </div>
        </div>

        {/* Request Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Request Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Requested At</p>
              <p className="text-base font-medium text-gray-900">
                {formatDateTime(leave.requestedAt)}
              </p>
            </div>
            {leave.halfDay && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Half Day</p>
                <p className="text-base font-medium text-gray-900">Yes</p>
              </div>
            )}
          </div>
        </div>

        {/* Review Information */}
        {(leave.review || leave.approvedBy) && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-gray-600" />
              Review Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {leave.approvedBy && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Approved By</p>
                  <p className="text-base font-medium text-gray-900">
                    {leave.approvedBy.userName || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateTime(leave.approvedBy.approvedAt)}
                  </p>
                </div>
              )}
              {leave.review && (
                <>
                  {leave.review.reviewedByName && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Reviewed By</p>
                      <p className="text-base font-medium text-gray-900">
                        {leave.review.reviewedByName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(leave.review.reviewedAt)}
                      </p>
                    </div>
                  )}
                  {leave.review.note && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Review Note</p>
                      <p className="text-base text-gray-900 whitespace-pre-wrap">
                        {leave.review.note}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Additional Information */}
        {(() => {
          const hasValue = (v: unknown) => v != null && v !== "" && v !== 0 && v !== "0";
          const showSection =
            hasValue(leave.teamId) ||
            hasValue(leave.workstationId) ||
            (leave.attachmentUrls && leave.attachmentUrls.length > 0);
          return showSection ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {hasValue(leave.teamId) && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Team ID</p>
                  <p className="text-base font-medium text-gray-900">{leave.teamId}</p>
                </div>
              )}
              {hasValue(leave.workstationId) && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Workstation ID</p>
                  <p className="text-base font-medium text-gray-900">{leave.workstationId}</p>
                </div>
              )}
              {leave.attachmentUrls && leave.attachmentUrls.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Attachments</p>
                  <div className="space-y-2">
                    {leave.attachmentUrls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm block"
                      >
                        Attachment {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          ) : null;
        })()}
      </div>
    </ModalShell>
  );
}

