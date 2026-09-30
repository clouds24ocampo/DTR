import { Calendar, Clock, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ModalShell from "../../global/ModalShell";
import {
  IWorkplace,
  Workstation,
  WorkplaceStationDay,
} from "../../../types/workforce/workplace/workplace.type";
import { formatTime } from "../../../utils/global/timeDateFormat";
import { ErrorModal } from "../../global/ErrorModal";
import { SuccessModal } from "../../global/SuccessModal";
import { ValidationModal } from "../../global/ValidationModal";

// Helper to normalize date to YYYY-MM-DD format
function normalizeDate(date: string | Date): string {
  if (!date) return "";

  if (typeof date === "string") {
    const ymdPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (ymdPattern.test(date.trim())) {
      return date.trim();
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type Props = {
  open: boolean;
  workplace: IWorkplace | null;
  workstation: Workstation | null;
  initialDate: string;
  getEmployeeName: (userId: string) => string;
  getEmployeePosition: (userId: string) => string;
  getEmployeeProfilePicture: (userId: string) => string;
  onClose: () => void;
  onUnassign?: (
    workplaceId: string,
    workstationId: string,
    date: string,
    userId: string
  ) => Promise<void>;
};

export default function StationAssignmentsModal({
  open,
  workplace,
  workstation,
  initialDate,
  getEmployeeName,
  getEmployeePosition,
  getEmployeeProfilePicture,
  onClose,
  onUnassign,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Get all dates with assignments for this workstation
  const datesWithAssignments = useMemo(() => {
    if (!workstation?.dates) return [];
    return workstation.dates
      .filter((d) => d && d.date && (d.assignedUsers?.length ?? 0) > 0)
      .map((d) => normalizeDate(d.date!))
      .sort();
  }, [workstation]);

  // Update selectedDate when initialDate changes or when datesWithAssignments changes
  useEffect(() => {
    if (open) {
      const normalizedInitialDate = normalizeDate(initialDate);
      // If initialDate is in the list of dates with assignments, use it
      // Otherwise, use the first available date or empty string
      if (datesWithAssignments.length > 0) {
        if (datesWithAssignments.includes(normalizedInitialDate)) {
          setSelectedDate(normalizedInitialDate);
        } else {
          setSelectedDate(datesWithAssignments[0]);
        }
      } else {
        setSelectedDate(normalizedInitialDate);
      }
    }
  }, [open, initialDate, datesWithAssignments]);

  // Format date for display (e.g., "Dec 9, 2025")
  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Find assignments for the selected date
  const assignmentsForDate = useMemo(() => {
    if (!workstation?.dates || !selectedDate) return [];

    const normalizedSelectedDate = normalizeDate(selectedDate);
    const dateEntry: WorkplaceStationDay | undefined = workstation.dates.find((d) => {
      if (!d || !d.date) return false;
      const normalizedDateFromData = normalizeDate(d.date);
      return normalizedDateFromData === normalizedSelectedDate;
    });

    if (!dateEntry || !dateEntry.assignedUsers) return [];

    return dateEntry.assignedUsers
      .map((user: any) => {
        const userIdValue = user.userId || user.id || user._id || "";
        const userIdStr = userIdValue ? String(userIdValue) : "";

        if (!userIdStr) return null;

        return {
          userId: userIdStr,
          idNumber: String(user.idNumber || ""),
          label: String(user.label || ""),
          scheduledStartTime: String(user.scheduledStartTime || ""),
          scheduledEndTime: String(user.scheduledEndTime || ""),
          startMealTime: Array.isArray(user.startMealTime)
            ? user.startMealTime.map(String)
            : [],
        };
      })
      .filter((user): user is NonNullable<typeof user> => user !== null);
  }, [workstation, selectedDate]);

  if (!open || !workplace || !workstation) return null;

  const stationName = workstation.stationName || "Unknown Station";
  const normalizedSelectedDate = normalizeDate(selectedDate);

  return (
    <ModalShell
      title={`${stationName} - Assignments`}
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Date Filter */}
        <div>
          <label
            htmlFor="assignment-date-filter"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Filter by Date
          </label>
          {datesWithAssignments.length > 0 ? (
            <select
              id="assignment-date-filter"
              value={normalizedSelectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {datesWithAssignments.map((date) => (
                <option key={date} value={date}>
                  {formatDateForDisplay(date)}
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500">
              No dates with assignments available
            </div>
          )}
          {datesWithAssignments.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Showing {datesWithAssignments.length} date{datesWithAssignments.length !== 1 ? 's' : ''} with assignments
            </p>
          )}
        </div>

        {/* Assignments List */}
        {datesWithAssignments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Assigned Employees for {formatDateForDisplay(normalizedSelectedDate)}
            </h3>

            {assignmentsForDate.length > 0 ? (
              <div className="space-y-3">
                {[...assignmentsForDate].reverse().map((assignment, idx) => {
                  const employeeName = getEmployeeName(assignment.userId);
                  const employeePosition = getEmployeePosition(assignment.userId);

                  // Helper to get initials
                  const getInitials = (name: string) => {
                    if (!name || name === "Unknown User") return "?";
                    const parts = name.split(" ").filter(Boolean);
                    if (parts.length >= 2) {
                      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                    }
                    return name[0].toUpperCase();
                  };

                  return (
                    <div
                      key={`${assignment.userId}-${assignment.scheduledStartTime}-${normalizedSelectedDate}-${idx}`}
                      className="bg-blue-50 p-4 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-full border border-blue-200 overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {getEmployeeProfilePicture(assignment.userId) ? (
                              <img
                                src={getEmployeeProfilePicture(assignment.userId)}
                                alt={employeeName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>
                                {getInitials(employeeName)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-blue-900 truncate" title={employeeName}>
                              {employeeName}
                            </p>
                            {assignment.idNumber && (
                              <p className="text-xs text-blue-600 font-mono mt-0.5">
                                ID: {assignment.idNumber}
                              </p>
                            )}
                            {employeePosition && (
                              <p className="text-xs text-blue-700 italic mt-0.5">
                                {employeePosition}
                              </p>
                            )}
                          </div>
                        </div>
                        {onUnassign && workplace && workstation && (
                          <button
                            onClick={() =>
                              setConfirmAction({
                                userId: assignment.userId,
                                userName: employeeName,
                              })
                            }
                            className="text-red-600 hover:bg-red-100 p-1.5 rounded-lg flex-shrink-0 ml-2 transition-colors"
                            title="Remove Assignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-blue-700">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>
                            {formatTime(assignment.scheduledStartTime) || "N/A"} - {formatTime(assignment.scheduledEndTime) || "N/A"}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-blue-700">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>{formatDateForDisplay(normalizedSelectedDate)}</span>
                        </div>

                        {assignment.label && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded-full">
                              {assignment.label}
                            </span>
                          </div>
                        )}

                        {assignment.startMealTime && assignment.startMealTime.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <p className="text-xs font-medium text-blue-800 mb-1">Meal Times:</p>
                            <div className="flex flex-wrap gap-1">
                              {assignment.startMealTime.map((mealTime: string, mealIdx: number) => (
                                <span
                                  key={mealIdx}
                                  className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg"
                                >
                                  {formatTime(mealTime)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">
                  No assignments for {normalizedSelectedDate}
                </p>
                {datesWithAssignments.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    This station has assignments on other dates
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {datesWithAssignments.length === 0 && (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">
              No assignments found for this station
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Assign employees to this station to see them here
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ValidationModal
        open={!!confirmAction}
        title="Confirm Removal"
        message={`Are you sure you want to remove ${confirmAction?.userName} from this station assignment?`}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction || !onUnassign || !workplace || !workstation) return;

          try {
            await onUnassign(
              workplace._id!,
              workstation._id!,
              normalizedSelectedDate,
              confirmAction.userId
            );
            setSuccessMessage(`${confirmAction.userName} removed successfully!`);
            setConfirmAction(null);
            // The parent component will refresh workplaces data after onUnassign
            // The modal will automatically update when the props change
          } catch (err) {
            console.error("Error removing assignment:", err);
            setErrorMessage("Failed to remove assignment. Please try again.");
            setConfirmAction(null);
          }
        }}
      />

      <ErrorModal message={errorMessage} onClose={() => setErrorMessage("")} />
      <SuccessModal
        message={successMessage}
        onClose={() => {
          setSuccessMessage("");
          // Optionally close the modal after successful removal
          // onClose();
        }}
      />

      <div className="flex items-center justify-end pt-4 border-t border-gray-100 mt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}

