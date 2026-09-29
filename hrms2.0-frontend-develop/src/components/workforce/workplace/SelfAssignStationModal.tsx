/* eslint-disable @typescript-eslint/no-explicit-any */
import { CheckCircle2, Clock, Loader2, MapPin, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useWorkplaceStore } from "../../../stores/workforce/workplace/workplace.store";
import type { IWorkplace, Workstation } from "../../../types/workforce/workplace/workplace.type";
import type { ISession } from "../../../types/global/schedule/schedule.type";
import {
  getAvailableStations,
  getUserCurrentAssignment,
  hasScheduleStarted,
  isBeforeWorkStarts,
  getFirstSession,
} from "../../../utils/workplace/stationAssignment.utils";
import ModalShell from "../../global/ModalShell";
import { ErrorModal } from "../../global/ErrorModal";
import { SuccessModal } from "../../global/SuccessModal";
import { formatTime } from "../../../utils/global/timeDateFormat";

type SelfAssignStationModalProps = {
  open: boolean;
  workplace: IWorkplace | null;
  schedule: { date: string; sessions?: ISession[] } | undefined;
  userId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function SelfAssignStationModal({
  open,
  workplace,
  schedule,
  userId,
  onClose,
  onSuccess,
}: SelfAssignStationModalProps) {
  const { selfAssignToStation, selfUnassignFromStation, selfAssignToStationLoading, selfUnassignFromStationLoading } =
    useWorkplaceStore();

  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccessMessage(null);
      setSelectedStationId("");
      setShowUnassignConfirm(false);
    }
  }, [open]);

  // Get schedule information
  const scheduleInfo = useMemo(() => {
    if (!schedule || !schedule.sessions || schedule.sessions.length === 0) {
      return null;
    }

    const firstSession = getFirstSession(schedule.sessions);
    if (!firstSession) {
      return null;
    }

    return {
      date: schedule.date,
      startTime: firstSession.scheduledStartTime,
      endTime: firstSession.scheduledEndTime,
      label: firstSession.label,
    };
  }, [schedule]);

  // Check if schedule has started
  const scheduleStarted = useMemo(() => {
    if (!scheduleInfo) return false;
    return hasScheduleStarted(scheduleInfo.date, scheduleInfo.startTime);
  }, [scheduleInfo]);

  // Check if can assign (schedule exists and hasn't started)
  const canAssign = useMemo(() => {
    if (!scheduleInfo) return false;
    return isBeforeWorkStarts(scheduleInfo.startTime, scheduleInfo.date);
  }, [scheduleInfo]);

  // Get current assignment
  const currentAssignment = useMemo(() => {
    if (!workplace || !scheduleInfo) return null;
    return getUserCurrentAssignment(workplace, userId, scheduleInfo.date);
  }, [workplace, userId, scheduleInfo]);

  // Get available stations
  const availableStations = useMemo(() => {
    if (!workplace || !scheduleInfo || !canAssign) return [];

    // Exclude current assignment if user wants to change
    const excludeUserId = currentAssignment ? userId : undefined;

    return getAvailableStations(
      workplace,
      scheduleInfo.date,
      scheduleInfo.startTime,
      scheduleInfo.endTime,
      excludeUserId
    );
  }, [workplace, scheduleInfo, canAssign, currentAssignment, userId]);

  // Get all stations (for display)
  const allStations = useMemo(() => {
    if (!workplace || !workplace.workstations) return [];
    return workplace.workstations;
  }, [workplace]);

  // Check if a station is available
  const isStationAvailableForSelection = (station: Workstation): boolean => {
    if (!scheduleInfo) return false;
    return availableStations.some((s) => s._id === station._id);
  };

  // Check if a station is currently assigned to the user
  const isCurrentAssignment = (station: Workstation): boolean => {
    return currentAssignment?._id === station._id;
  };

  // Handle station assignment
  const handleAssign = async () => {
    if (!selectedStationId || !scheduleInfo || !workplace) {
      setError("Please select a station");
      return;
    }

    const selectedStation = allStations.find((s) => s._id === selectedStationId);
    if (!selectedStation) {
      setError("Selected station not found");
      return;
    }

    // Validate schedule hasn't started
    if (scheduleStarted) {
      setError("Cannot assign to station. Your schedule has already started.");
      return;
    }

    if (!canAssign) {
      setError("Cannot assign to station. Schedule has already started or is invalid.");
      return;
    }

    // Check if station is available
    if (!isStationAvailableForSelection(selectedStation)) {
      setError(`Station "${selectedStation.stationName}" is not available for this time slot.`);
      return;
    }

    setError(null);

    try {
      const result = await selfAssignToStation(workplace._id, {
        date: scheduleInfo.date,
        stationName: selectedStation.stationName,
        label: scheduleInfo.label,
        scheduledStartTime: scheduleInfo.startTime,
        scheduledEndTime: scheduleInfo.endTime,
      });

      setSuccessMessage(`Successfully assigned to ${result.meta.stationName}`);

      // Call onSuccess callback after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }, 1500);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || err?.message || "Failed to assign to station";
      setError(errorMessage);
    }
  };

  // Handle unassignment
  const handleUnassign = async () => {
    if (!scheduleInfo || !workplace || !currentAssignment) {
      return;
    }

    setError(null);

    try {
      await selfUnassignFromStation(workplace._id, scheduleInfo.date);
      setSuccessMessage("Successfully unassigned from station");

      // Call onSuccess callback after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }, 1500);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || err?.message || "Failed to unassign from station";
      setError(errorMessage);
    }
  };

  if (!open) return null;

  const isLoading = selfAssignToStationLoading || selfUnassignFromStationLoading;

  return (
    <>
      <ModalShell
        title="Assign Station"
        onClose={isLoading ? () => { } : onClose}
      >
        <div className="space-y-4">
          {/* Schedule Information */}
          {scheduleInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Schedule Information</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    <strong>Date:</strong> {new Date(scheduleInfo.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    <strong>Time:</strong> {formatTime(scheduleInfo.startTime)} - {formatTime(scheduleInfo.endTime)}
                  </span>
                </div>
                {scheduleInfo.label && (
                  <div className="flex items-center gap-2">
                    <span>
                      <strong>Label:</strong> {scheduleInfo.label}
                    </span>
                  </div>
                )}
              </div>
              {scheduleStarted && (
                <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded-lg text-sm text-yellow-800">
                  <strong>Warning:</strong> Your schedule has already started. You cannot change your station assignment.
                </div>
              )}
            </div>
          )}

          {/* Current Assignment */}
          {currentAssignment && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Current Assignment
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-700" />
                  <span className="text-sm font-medium text-green-900">
                    {currentAssignment.stationName}
                  </span>
                </div>
                {canAssign && (
                  <button
                    onClick={() => setShowUnassignConfirm(true)}
                    disabled={isLoading}
                    className="text-sm text-red-600 hover:text-red-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Unassign
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Station Selection */}
          {canAssign && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Station {currentAssignment && "(Change Assignment)"}
              </label>
              {allStations.length === 0 ? (
                <div className="text-sm text-gray-500 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  No stations available in this workplace.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allStations.map((station) => {
                    const isAvailable = isStationAvailableForSelection(station);
                    const isCurrent = isCurrentAssignment(station);
                    const isSelected = selectedStationId === station._id;

                    return (
                      <button
                        key={station._id}
                        onClick={() => {
                          if (isAvailable && !isCurrent) {
                            setSelectedStationId(station._id);
                            setError(null);
                          }
                        }}
                        disabled={!isAvailable || isCurrent || isLoading}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${isSelected
                          ? "border-blue-500 bg-blue-50"
                          : isCurrent
                            ? "border-green-300 bg-green-50"
                            : isAvailable
                              ? "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                              : "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                          } ${!isAvailable && !isCurrent ? "cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <MapPin className={`w-4 h-4 ${isCurrent ? "text-green-600" : isAvailable ? "text-blue-600" : "text-gray-400"}`} />
                            <span className={`font-medium ${isCurrent ? "text-green-900" : isAvailable ? "text-gray-900" : "text-gray-500"}`}>
                              {station.stationName}
                            </span>
                            {isCurrent && (
                              <span className="text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isAvailable && !isCurrent ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : !isAvailable && !isCurrent ? (
                              <XCircle className="w-5 h-5 text-red-400" />
                            ) : null}
                          </div>
                        </div>
                        {!isAvailable && !isCurrent && (
                          <p className="text-xs text-gray-500 mt-1 ml-6">
                            Station is occupied for this time slot
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {availableStations.length === 0 && allStations.length > 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  No available stations for this time slot. All stations are occupied.
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            {canAssign && (
              <button
                onClick={handleAssign}
                disabled={
                  !selectedStationId ||
                  isLoading ||
                  !!(currentAssignment && selectedStationId === currentAssignment._id)
                }
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Assigning...
                  </>
                ) : currentAssignment ? (
                  "Change Station"
                ) : (
                  "Assign to Station"
                )}
              </button>
            )}
          </div>
        </div>
      </ModalShell>

      {/* Unassign Confirmation Modal */}
      {showUnassignConfirm && (
        <ModalShell
          title="Confirm Unassignment"
          onClose={() => setShowUnassignConfirm(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Are you sure you want to unassign yourself from{" "}
              <strong>{currentAssignment?.stationName}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnassignConfirm(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleUnassign();
                  setShowUnassignConfirm(false);
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Unassigning...
                  </>
                ) : (
                  "Confirm Unassign"
                )}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Success Modal */}
      {successMessage && (
        <SuccessModal
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* Error Modal */}
      {error && (
        <ErrorModal
          message={error}
          onClose={() => setError(null)}
        />
      )}
    </>
  );
}

