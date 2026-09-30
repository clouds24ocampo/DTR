import { Calendar, Clock, Copy, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  IWorkplace,
  Workstation,
  WorkplaceStationDay,
} from "../../../types/workforce/workplace/workplace.type";
import { formatTime } from "../../../utils/global/timeDateFormat";
import { ErrorModal } from "../../global/ErrorModal";
import { SuccessModal } from "../../global/SuccessModal";
import { ValidationModal } from "../../global/ValidationModal";

export type CopyAssignmentItem = {
  workstationId: string;
  stationName: string;
  userId: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  startMealTime?: string[];
  label?: string;
};

// Helper to normalize date to YYYY-MM-DD format
function normalizeDate(date: string | Date): string {
  if (!date) return "";

  // If it's already a string in YYYY-MM-DD format, return it directly
  if (typeof date === "string") {
    // Check if it matches YYYY-MM-DD pattern
    const ymdPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (ymdPattern.test(date.trim())) {
      return date.trim();
    }
    // Otherwise, parse it
    const d = new Date(date);
    // Check for invalid date
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // If it's a Date object
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type Props = {
  workplaces: IWorkplace[];
  selectedWorkplaceId: string;
  onSelectWorkplaceId: (id: string) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;

  getEmployeeName: (userId: string) => string;
  getEmployeePosition: (userId: string) => string;
  getEmployeeIdNumber: (userId: string) => string;
  getEmployeeProfilePicture: (userId: string) => string;

  onAssignClick: (workplaceId: string, workstationId: string) => void;
  onEditWorkstationClick: (workplaceId: string, workstationId: string) => void;
  onDeleteWorkstation: (workplaceId: string, workstationId: string) => void;
  onUnassign: (
    workplaceId: string,
    workstationId: string,
    date: string,
    userId: string
  ) => void;
  onStationClick?: (workplaceId: string, workstationId: string) => void;
  onRefresh?: () => void | Promise<void>;
  refreshLoading?: boolean;
  onCopyAssignmentsToDate?: (
    workplaceId: string,
    sourceDate: string,
    targetDate: string,
    assignments: CopyAssignmentItem[]
  ) => Promise<void>;
};

export default function WorkstationsAssignmentsTab({
  workplaces,
  selectedWorkplaceId,
  onSelectWorkplaceId,
  selectedDate,
  onSelectDate,
  getEmployeeName,
  getEmployeePosition,
  getEmployeeIdNumber,
  getEmployeeProfilePicture,
  onAssignClick,
  onDeleteWorkstation,
  onUnassign,
  onStationClick,
  onRefresh,
  refreshLoading = false,
  onCopyAssignmentsToDate,
}: Props) {
  const filteredWorkplaces = useMemo<IWorkplace[]>(
    () =>
      selectedWorkplaceId
        ? workplaces.filter((w) => w._id === selectedWorkplaceId)
        : workplaces,
    [workplaces, selectedWorkplaceId]
  );
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "unassign" | null;
    workplaceId?: string;
    workstationId?: string;
    userId?: string;
  }>({ type: null });

  const [copyToDateState, setCopyToDateState] = useState<{
    open: boolean;
    workplaceId: string;
    workplaceName: string;
    sourceDate: string;
    assignments: CopyAssignmentItem[];
  }>({
    open: false,
    workplaceId: "",
    workplaceName: "",
    sourceDate: "",
    assignments: [],
  });
  const [copyTargetDate, setCopyTargetDate] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Debug: Log when workplaces data changes
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("WorkstationsAssignmentsTab - workplaces updated:", {
        workplacesCount: workplaces.length,
        selectedDate,
        filteredWorkplacesCount: filteredWorkplaces.length,
        sampleWorkplace: filteredWorkplaces[0] ? {
          id: filteredWorkplaces[0]._id,
          name: filteredWorkplaces[0].name,
          workstationsCount: filteredWorkplaces[0].workstations?.length ?? 0,
          firstWorkstation: filteredWorkplaces[0].workstations?.[0] ? {
            stationName: filteredWorkplaces[0].workstations[0].stationName,
            datesCount: filteredWorkplaces[0].workstations[0].dates?.length ?? 0,
            dates: filteredWorkplaces[0].workstations[0].dates?.map(d => ({
              date: d.date,
              assignedUsersCount: d.assignedUsers?.length ?? 0,
            })),
          } : null,
        } : null,
      });
    }
  }, [workplaces, selectedDate, filteredWorkplaces]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-start gap-3 sm:gap-4 flex-wrap">
        <select
          value={selectedWorkplaceId}
          onChange={(e) => onSelectWorkplaceId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
        >
          <option key="all-workplaces" value="">All Workplaces</option>
          {workplaces.map((workplace) => (
            <option key={workplace._id || `workplace-${workplace.name}`} value={workplace._id}>
              {workplace.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onSelectDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
        />

        {onRefresh && (
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={refreshLoading}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-colors"
            title="Refresh assignments (e.g. after automatic scheduling)"
          >
            <RefreshCw className={`w-4 h-4 ${refreshLoading ? "animate-spin" : ""}`} />
            <span>{refreshLoading ? "Refreshing…" : "Refresh"}</span>
          </button>
        )}
      </div>

      <div className="space-y-6">
        {filteredWorkplaces.map((workplace) => {
          const normalizedDate = normalizeDate(selectedDate);
          const reassignAllCount = (workplace.workstations ?? []).reduce(
            (acc, ws) => {
              const entry = (ws.dates ?? []).find(
                (d) =>
                  d?.date &&
                  normalizeDate(d.date) === normalizedDate &&
                  (d.assignedUsers?.length ?? 0) > 0
              );
              return acc + (entry?.assignedUsers?.length ?? 0);
            },
            0
          );

          return (
          <div
            key={workplace._id}
            className="border border-gray-200 rounded-lg p-6"
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {workplace.name}
              </h3>
              {onCopyAssignmentsToDate && (
                <button
                  type="button"
                  onClick={() => {
                    const normalized = normalizeDate(selectedDate);
                    const assignments: CopyAssignmentItem[] = [];
                    (workplace.workstations ?? []).forEach((ws) => {
                      const entry = (ws.dates ?? []).find(
                        (d) =>
                          d?.date &&
                          normalizeDate(d.date) === normalized &&
                          (d.assignedUsers?.length ?? 0) > 0
                      );
                      if (!entry?.assignedUsers) return;
                      entry.assignedUsers.forEach((u: any) => {
                        const userId = u.userId ?? u.id ?? u._id;
                        if (userId && ws._id && ws.stationName) {
                          assignments.push({
                            workstationId: ws._id,
                            stationName: ws.stationName,
                            userId: String(userId),
                            scheduledStartTime: String(u.scheduledStartTime ?? ""),
                            scheduledEndTime: String(u.scheduledEndTime ?? ""),
                            startMealTime: Array.isArray(u.startMealTime)
                              ? u.startMealTime.map(String)
                              : undefined,
                            label: u.label ? String(u.label) : undefined,
                          });
                        }
                      });
                    });
                    setCopyToDateState({
                      open: true,
                      workplaceId: workplace._id!,
                      workplaceName: workplace.name,
                      sourceDate: normalized,
                      assignments,
                    });
                    setCopyTargetDate("");
                  }}
                  disabled={reassignAllCount === 0}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={
                    reassignAllCount === 0
                      ? "No assignments to copy for this date"
                      : `Copy all ${reassignAllCount} assignment(s) to another date (employees keep current assignments)`
                  }
                >
                  <Copy className="w-4 h-4" />
                  Copy to another date
                </button>
              )}
            </div>

            {/* Check if workstations exist */}
            {!workplace.workstations || workplace.workstations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">
                  No workstations found in this workplace
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Workstations will appear here once they are added to the workplace
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workplace.workstations.map(
                  (workstation: Workstation, wsi) => {
                    if (!workstation || !workstation.stationName) {
                      return null;
                    }

                    const normalizedSelectedDate = normalizeDate(selectedDate);

                    // Get all dates with assignments for this workstation (for informational purposes)
                    const allDateEntries = (workstation.dates ?? []).filter((d) => {
                      if (!d || !d.date) return false;
                      return (d.assignedUsers?.length ?? 0) > 0;
                    });

                    // Find the date entry that matches the selected date exactly
                    // Only show assignments for the exact selected date, not auto-adjusted dates
                    let dateEntry: WorkplaceStationDay | undefined = undefined;

                    // Only look for date entry if we have a valid selected date
                    if (normalizedSelectedDate) {
                      dateEntry = (workstation.dates ?? []).find((d) => {
                        if (!d || !d.date) return false;

                        // Normalize both dates for comparison - exact match only
                        const normalizedDateFromData = normalizeDate(d.date);
                        const matches = normalizedDateFromData === normalizedSelectedDate;

                        // Only return true if dates match exactly AND there are assigned users
                        return matches && (d.assignedUsers?.length ?? 0) > 0;
                      });
                    }

                    // Debug: Log all dates in this workstation
                    if (process.env.NODE_ENV === "development") {
                      console.log(`Workstation ${workstation.stationName}:`, {
                        selectedDate,
                        normalizedSelectedDate,
                        datesInWorkstation: workstation.dates?.map(d => ({
                          rawDate: d.date,
                          normalized: normalizeDate(d.date),
                          assignedUsersCount: d.assignedUsers?.length ?? 0,
                        })),
                        allDateEntriesWithAssignments: allDateEntries.map(d => ({
                          date: d.date,
                          normalized: normalizeDate(d.date),
                          assignedUsersCount: d.assignedUsers?.length ?? 0,
                        })),
                        foundDateEntry: dateEntry ? {
                          date: dateEntry.date,
                          normalized: normalizeDate(dateEntry.date),
                          assignedUsersCount: dateEntry.assignedUsers?.length ?? 0,
                        } : null,
                      });
                    }

                    // Debug logging when match is found
                    if (process.env.NODE_ENV === "development" && dateEntry) {
                      console.log("✅ Date match found:", {
                        workstation: workstation.stationName,
                        storedDate: dateEntry.date,
                        normalizedStored: normalizeDate(dateEntry.date),
                        selectedDate: selectedDate,
                        normalizedSelected: normalizedSelectedDate,
                        assignedUsers: dateEntry.assignedUsers?.length ?? 0,
                        assignedUsersData: dateEntry.assignedUsers,
                      });
                    }

                    // Extract assigned users with proper type checking
                    // Only show users if dateEntry exists AND matches the selected date exactly
                    let assignedUsers: {
                      userId: string;
                      label: string;
                      scheduledStartTime: string;
                      scheduledEndTime: string;
                      startMealTime?: string[];
                    }[] = [];

                    // Only extract users if we have a valid dateEntry that matches the selected date
                    // AND the date is NOT in the past
                    if (dateEntry && dateEntry.assignedUsers && normalizedSelectedDate) {
                      const today = normalizeDate(new Date());
                      if (normalizedSelectedDate >= today) {
                        // Double-check that the dateEntry date matches the selected date
                        const dateEntryNormalized = normalizeDate(dateEntry.date);
                        if (dateEntryNormalized === normalizedSelectedDate) {
                          // Ensure assignedUsers is an array
                          if (Array.isArray(dateEntry.assignedUsers)) {
                            assignedUsers = dateEntry.assignedUsers
                              .map((user: any) => {
                                // Handle different userId formats (String, ObjectId, etc.)
                                const userIdValue = user.userId || user.id || user._id || "";
                                const userIdStr = userIdValue ? String(userIdValue) : "";

                                if (!userIdStr) {
                                  // Log missing userId for debugging
                                  if (process.env.NODE_ENV === "development") {
                                    console.warn("Assigned user missing userId:", user);
                                  }
                                  return null;
                                }

                                return {
                                  userId: userIdStr,
                                  label: String(user.label || ""),
                                  scheduledStartTime: String(user.scheduledStartTime || ""),
                                  scheduledEndTime: String(user.scheduledEndTime || ""),
                                  startMealTime: Array.isArray(user.startMealTime)
                                    ? user.startMealTime.map(String)
                                    : [],
                                };
                              })
                              .filter((user): user is NonNullable<typeof user> => user !== null); // Filter out nulls
                          }
                        }
                      }
                    }

                    // Debug: Log raw data structure
                    if (process.env.NODE_ENV === "development" && dateEntry) {
                      console.log(`Raw dateEntry for ${workstation.stationName}:`, {
                        date: dateEntry.date,
                        assignedUsersRaw: dateEntry.assignedUsers,
                        assignedUsersProcessed: assignedUsers,
                        assignedUsersCount: assignedUsers.length,
                      });
                    }

                    // Debug: Log assignment status
                    if (process.env.NODE_ENV === "development") {
                      if (dateEntry && assignedUsers.length > 0) {
                        console.log(`✅ Date entry found for ${workstation.stationName}:`, {
                          date: dateEntry.date,
                          normalizedDate: normalizeDate(dateEntry.date),
                          selectedDate: normalizedSelectedDate,
                          assignedUsersCount: assignedUsers.length,
                          assignedUsers: assignedUsers,
                        });
                      } else if (allDateEntries.length > 0) {
                        console.log(`ℹ️ ${workstation.stationName} has assignments on different date(s):`, {
                          selectedDate: normalizedSelectedDate,
                          availableDates: allDateEntries.map(d => ({
                            date: d.date,
                            normalized: normalizeDate(d.date),
                            assignedUsersCount: d.assignedUsers?.length ?? 0,
                          })),
                        });
                      } else {
                        console.log(`❌ No assignments for ${workstation.stationName} on any date`);
                      }
                    }

                    return (
                      <div
                        key={
                          workstation._id ??
                          `wsb-${workplace._id}-${workstation.stationName}-${wsi}`
                        }
                        className={`border border-gray-200 rounded-lg p-4 ${onStationClick ? "cursor-pointer hover:border-blue-300 hover:shadow-md transition-all" : ""
                          }`}
                        onClick={(e) => {
                          // Only trigger if clicking on the card itself, not on buttons
                          if (onStationClick && (e.target as HTMLElement).closest('button') === null) {
                            onStationClick(workplace._id!, workstation._id!);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">
                            {workstation.stationName}
                          </h4>
                          <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                if (process.env.NODE_ENV === "development") {
                                  console.log("🔵 WorkstationsAssignmentsTab - onAssignClick called:", {
                                    workplaceId: workplace._id,
                                    workplaceName: workplace.name,
                                    workstationId: workstation._id,
                                    stationName: workstation.stationName,
                                  });
                                }
                                onAssignClick(workplace._id!, workstation._id!);
                              }}
                              className="p-1 text-green-600 hover:bg-green-100 rounded-lg"
                              title="Assign User"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmAction({
                                  type: "delete",
                                  workplaceId: workplace._id!,
                                  workstationId: workstation._id!,
                                })
                              }
                              className="p-1 text-red-600 hover:bg-red-100 rounded-lg"
                              title="Delete Workstation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 min-h-[80px]" onClick={(e) => e.stopPropagation()}>
                          {assignedUsers.length > 0 ? (
                            assignedUsers.map((assignedUser, idx) => {
                              const employeeName = getEmployeeName(assignedUser.userId);
                              const employeeIdNumber = getEmployeeIdNumber(assignedUser.userId);

                              // Function to get initials from name
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
                                  key={`${workplace._id}-${workstation._id || wsi}-${assignedUser.userId}-${assignedUser.scheduledStartTime}-${selectedDate}-${idx}`}
                                  className="bg-blue-50 p-3 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                      <div className="h-8 w-8 rounded-full border border-blue-200 overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                        {getEmployeeProfilePicture(assignedUser.userId) ? (
                                          <img
                                            src={getEmployeeProfilePicture(assignedUser.userId)}
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
                                        <span className="text-sm font-medium text-blue-900 truncate block" title={employeeName}>
                                          {employeeName}
                                        </span>
                                        {employeeIdNumber && (
                                          <span className="text-xs text-blue-600 font-mono">
                                            ID: {employeeIdNumber}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() =>
                                        setConfirmAction({
                                          type: "unassign",
                                          workplaceId: workplace._id!,
                                          workstationId: workstation._id!,
                                          userId: assignedUser.userId,
                                        })
                                      }
                                      className="text-red-600 hover:bg-red-100 p-1 rounded-lg flex-shrink-0 ml-2"
                                      title="Unassign"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-blue-700">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="w-3 h-3 flex-shrink-0" />
                                      <span className="whitespace-nowrap">
                                        {formatTime(assignedUser.scheduledStartTime) || "N/A"} -{" "}
                                        {formatTime(assignedUser.scheduledEndTime) || "N/A"}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="w-3 h-3 flex-shrink-0" />
                                      <span className="whitespace-nowrap">
                                        {normalizedSelectedDate}
                                      </span>
                                    </div>
                                    {assignedUser.label && (
                                      <div className="text-[10px] px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full">
                                        {assignedUser.label}
                                      </div>
                                    )}
                                    {getEmployeePosition(assignedUser.userId) && (
                                      <div className="ml-auto text-[11px] italic text-blue-600">
                                        {getEmployeePosition(assignedUser.userId)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg" onClick={(e) => e.stopPropagation()}>
                              <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">
                                No assignments for {normalizedSelectedDate || selectedDate}
                              </p>
                              {(() => {
                                const datesWithAssignments = (workstation.dates ?? []).filter(
                                  (d) => {
                                    if (!d || !d.date || (d.assignedUsers?.length ?? 0) === 0) return false;
                                    const normalizedDate = normalizeDate(d.date);
                                    const today = normalizeDate(new Date());
                                    return normalizedDate >= today;
                                  }
                                );
                                if (datesWithAssignments.length > 0) {
                                  const dates = datesWithAssignments.map(d => normalizeDate(d.date!)).join(", ");
                                  return (
                                    <p className="text-xs text-blue-600 font-medium mt-2">
                                      Has assignments on other dates: {dates}
                                    </p>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
          );
        })}

        {!filteredWorkplaces.length && (
          <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No workplaces found</p>
            <p className="text-xs text-gray-400 mt-1">
              {selectedWorkplaceId
                ? "The selected workplace could not be found"
                : "Create a workplace to get started"}
            </p>
          </div>
        )}
      </div>
      <ValidationModal
        open={!!confirmAction.type}
        title={
          confirmAction.type === "delete"
            ? "Confirm Delete"
            : confirmAction.type === "unassign"
              ? "Confirm Unassign"
              : ""
        }
        message={
          confirmAction.type === "delete"
            ? "Are you sure you want to delete this workstation? This cannot be undone."
            : confirmAction.type === "unassign"
              ? "Are you sure you want to unassign this user?"
              : ""
        }
        onCancel={() => setConfirmAction({ type: null })}
        onConfirm={async () => {
          try {
            if (confirmAction.type === "delete") {
              await onDeleteWorkstation(
                confirmAction.workplaceId!,
                confirmAction.workstationId!
              );
              setSuccessMessage("Workstation deleted successfully!");
            }
            if (confirmAction.type === "unassign") {
              await onUnassign(
                confirmAction.workplaceId!,
                confirmAction.workstationId!,
                selectedDate,
                confirmAction.userId!
              );
              setSuccessMessage("User unassigned successfully!");
            }
          } catch (err) {
            console.error(err);
            setErrorMessage("Action failed. Please try again.");
          } finally {
            setConfirmAction({ type: null });
          }
        }}
      />

      {/* Copy assignments to another date modal */}
      {copyToDateState.open && onCopyAssignmentsToDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-2">
              <Copy className="w-5 h-5 text-blue-600" />
              Copy to another date
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Copy all {copyToDateState.assignments.length} assignment(s) from{" "}
              <strong>{copyToDateState.workplaceName}</strong> on{" "}
              <strong>{copyToDateState.sourceDate}</strong> to the selected date. Current
              assignments are kept.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target date
            </label>
            <input
              type="date"
              value={copyTargetDate}
              onChange={(e) => setCopyTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setCopyToDateState((s) => ({ ...s, open: false }))
                }
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!copyTargetDate.trim() || copyLoading}
                onClick={async () => {
                  const target = copyTargetDate.trim();
                  if (!target || !onCopyAssignmentsToDate) return;
                  setCopyLoading(true);
                  try {
                    await onCopyAssignmentsToDate(
                      copyToDateState.workplaceId,
                      copyToDateState.sourceDate,
                      target,
                      copyToDateState.assignments
                    );
                    setSuccessMessage(
                      `${copyToDateState.assignments.length} assignment(s) copied to ${target}.`
                    );
                    setCopyToDateState((s) => ({ ...s, open: false }));
                    setCopyTargetDate("");
                  } catch (err) {
                    console.error(err);
                    setErrorMessage("Failed to copy assignments. Please try again.");
                  } finally {
                    setCopyLoading(false);
                  }
                }}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copyLoading ? "Copying…" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ErrorModal message={errorMessage} onClose={() => setErrorMessage("")} />
      <SuccessModal
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />
    </div>
  );
}
