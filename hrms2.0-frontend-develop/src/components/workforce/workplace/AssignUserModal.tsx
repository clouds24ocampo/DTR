/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useId, useMemo, useState } from "react";
import { timeSlotsOverlap, timeToMinutes } from "../../../utils/workplace/stationAssignment.utils";
import { ErrorModal } from "../../global/ErrorModal";
import ModalShell from "../../global/ModalShell";
import { SuccessModal } from "../../global/SuccessModal";
import { ValidationModal } from "../../global/ValidationModal";

type UserLite = {
  _id?: string;
  id?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  position?: string;
  title?: string;
  role?: string;
};

type DepartmentLite = {
  _id: string;
  name: string;
  head: string | null;
  members: string[];
};

type AssignedUserModalProps = {
  open: boolean;
  employees: UserLite[];
  departments?: DepartmentLite[];
  defaultDepartmentId?: string;

  defaultDate: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  defaultStationName?: string;
  lockStationName?: boolean;
  defaultUserId?: string;
  busy?: boolean;
  serverError?: string | null;
  getAssignedUserIdsForDate?: (date: string) => Set<string>;
  isStationAssignedOnDate?: (stationName: string, date: string, workplaceId?: string) => boolean;
  getStationAssignmentsOnDate?: (stationName: string, date: string, workplaceId?: string) => any[];
  selectedWorkplaceId?: string; // Optional workplaceId to scope the assignment check
  /** Default schedule times (24h HH:mm). When provided, form opens with these values. */
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultMealTime?: string;
  /** Default label (e.g. "Morning shift"). When provided with default times, form opens with this label. */
  defaultLabel?: string;
};

const toHHmm = (raw: string): string | null => {
  if (!raw) return null;
  let t = raw.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");

  // Handle HH:MM:SS AM/PM format (e.g., "8:00:00 AM" or "5:30:45 PM")
  const hhmmssAmPm = t.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)\s*(am|pm)$/i);
  if (hhmmssAmPm) t = `${hhmmssAmPm[1]}:${hhmmssAmPm[2]} ${hhmmssAmPm[4]}`;

  // Handle HH:MM:SS format (e.g., "08:00:00" or "17:30:45")
  const hhmmss = t.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/);
  if (hhmmss) t = `${hhmmss[1]}:${hhmmss[2]}`;

  // Handle 12-hour format with AM/PM (e.g., "8:00 AM", "9:30 PM", "12:00 PM", "12:00 AM")
  const h12 = t.match(/^(\d{1,2})(?::([0-5]?\d))?\s*(am|pm)$/i);
  if (h12) {
    let h = parseInt(h12[1], 10);
    const m = h12[2] ? parseInt(h12[2], 10) : 0;
    const mer = h12[3].toLowerCase();

    // Validate hour and minute ranges
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;

    // Convert 12-hour to 24-hour format
    if (mer === "am") {
      if (h === 12) h = 0; // 12 AM = 00:00
    } else {
      if (h !== 12) h += 12; // PM: add 12 except for 12 PM
    }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Handle 24-hour format (e.g., "08:00", "17:30")
  const h24 = t.match(/^(\d{1,2}):([0-5]\d)$/);
  if (h24) {
    const h = parseInt(h24[1], 10);
    const m = parseInt(h24[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Handle bare hour (e.g., "8" becomes "08:00", "17" becomes "17:00")
  const bare = t.match(/^(\d{1,2})$/);
  if (bare) {
    const h = parseInt(bare[1], 10);
    if (h < 0 || h > 23) return null;
    return `${String(h).padStart(2, "0")}:00`;
  }

  return null;
};

// Convert 24-hour format to 12-hour format components
const from24to12 = (hhmm: string): { hour: number; minute: number; period: "AM" | "PM" } | null => {
  if (!hhmm) return null;
  const norm = toHHmm(hhmm);
  if (!norm) return null;
  const [h, m] = norm.split(":").map(Number);
  if (h === 0) return { hour: 12, minute: m, period: "AM" };
  if (h === 12) return { hour: 12, minute: m, period: "PM" };
  if (h < 12) return { hour: h, minute: m, period: "AM" };
  return { hour: h - 12, minute: m, period: "PM" };
};

// Convert 12-hour format components to 24-hour format string
const from12to24 = (hour: number, minute: number, period: "AM" | "PM"): string => {
  let h24 = hour;
  if (period === "AM") {
    if (hour === 12) h24 = 0;
  } else {
    if (hour !== 12) h24 = hour + 12;
  }
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

// 12-Hour Time Picker Component
type TimePicker12HProps = {
  id: string;
  value: string; // 24-hour format (HH:mm)
  onChange: (value: string) => void; // Returns 24-hour format
  label: string;
  error?: boolean;
  disabled?: boolean;
};

const TimePicker12H = ({ id, value, onChange, label, error, disabled }: TimePicker12HProps) => {
  const parsed = from24to12(value);
  const hour = parsed?.hour ?? 8;
  const minute = parsed?.minute ?? 0;
  const period = parsed?.period ?? "AM";

  const handleChange = (newHour: number, newMinute: number, newPeriod: "AM" | "PM") => {
    const new24 = from12to24(newHour, newMinute, newPeriod);
    onChange(new24);
  };

  return (
    <div>
      <label htmlFor={`${id}-hour`} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {/* Hour Select */}
        <select
          id={`${id}-hour`}
          value={hour}
          onChange={(e) => handleChange(Number(e.target.value), minute, period)}
          disabled={disabled}
          className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${error ? "border-red-300" : "border-gray-300"
            } ${disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : ""}`}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        <span className="text-gray-500">:</span>

        {/* Minute Select */}
        <select
          id={`${id}-minute`}
          value={minute}
          onChange={(e) => handleChange(hour, Number(e.target.value), period)}
          disabled={disabled}
          className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${error ? "border-red-300" : "border-gray-300"
            } ${disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : ""}`}
        >
          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>

        {/* AM/PM Select */}
        <select
          id={`${id}-period`}
          value={period}
          onChange={(e) => handleChange(hour, minute, e.target.value as "AM" | "PM")}
          disabled={disabled}
          className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${error ? "border-red-300" : "border-gray-300"
            } ${disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : ""}`}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Selected: {hour}:{String(minute).padStart(2, "0")} {period} (stored as {value})
      </p>
    </div>
  );
};

export default function AssignedUserModal({
  open,
  employees,
  departments,
  defaultDepartmentId,
  defaultDate: _defaultDate, // Kept for backward compatibility but not used - user must select date
  onClose,
  onSubmit,
  defaultStationName,
  lockStationName = false,
  defaultUserId,
  busy = false,
  serverError = null,
  getAssignedUserIdsForDate,
  isStationAssignedOnDate,
  getStationAssignmentsOnDate,
  selectedWorkplaceId,
  defaultStartTime,
  defaultEndTime,
  defaultMealTime,
  defaultLabel,
}: AssignedUserModalProps) {
  if (!open) return null;

  const [mealRows, setMealRows] = useState<number[]>([0]); // Default to one meal row
  const [mealTimeValue, setMealTimeValue] = useState<string>(defaultMealTime ?? "12:00"); // Default meal time
  const [startTimeValue, setStartTimeValue] = useState<string>(defaultStartTime ?? "08:00"); // Stored in 24-hour format
  const [endTimeValue, setEndTimeValue] = useState<string>(defaultEndTime ?? "17:00"); // Stored in 24-hour format
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(
    defaultDepartmentId ?? ""
  );
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [selectedStationName, setSelectedStationName] = useState<string>(defaultStationName ?? "");
  const [showValidation, setShowValidation] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const deptId = useId();
  const employeeId = useId();
  const stationId = useId();
  const stationHelpId = useId();
  const labelId = useId();
  const labelHelpId = useId();
  const dateId = useId();
  const startId = useId();
  const endId = useId();
  const mealsGroupHelpId = useId();
  const mealsBaseId = useId();

  useEffect(() => {
    if (open) {
      setMealRows([0]); // Default to one meal row
      setMealTimeValue("12:00");
      setError(null);
      setStartTimeValue(defaultStartTime ?? "08:00");
      setEndTimeValue(defaultEndTime ?? "17:00");
      setMealTimeValue(defaultMealTime ?? "12:00");
      setSelectedDepartmentId(
        defaultDepartmentId ?? departments?.[0]?._id ?? ""
      );
      setSelectedDate("");
      setSelectedLabel(defaultLabel ?? "");
      setSelectedStationName(defaultStationName ?? "");
    }
  }, [
    open,
    defaultStationName,
    defaultUserId,
    departments,
    defaultDepartmentId,
    defaultStartTime,
    defaultEndTime,
    defaultMealTime,
    defaultLabel,
  ]);

  // Update selectedStationName when defaultStationName changes (for locked stations)
  useEffect(() => {
    if (lockStationName && defaultStationName) {
      setSelectedStationName(defaultStationName);
    }
  }, [lockStationName, defaultStationName]);

  // Generate date options for dropdown (today to 90 days ahead - no past dates)
  const dateOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    const today = new Date();
    // Set to start of day to ensure we include today
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today); // Start from today
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 90); // 90 days ahead

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Use local date components to avoid timezone issues
      // Don't use toISOString() as it converts to UTC and can shift the date
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD format in local timezone

      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = currentDate.getDate();
      const label = `${dayName}, ${monthName} ${dayNum}, ${year}`;

      options.push({ value: dateStr, label });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return options;
  }, []);

  // Helper to check for time overlaps
  const hasTimeOverlap = useMemo(() => {
    if (!getStationAssignmentsOnDate || !selectedDate || !startTimeValue || !endTimeValue) return false;
    
    const stationToCheck = selectedStationName || defaultStationName || "";
    if (!stationToCheck) return false;

    const existingAssignments = getStationAssignmentsOnDate(stationToCheck, selectedDate, selectedWorkplaceId);
    if (!existingAssignments || existingAssignments.length === 0) return false;

    const newStart = toHHmm(startTimeValue) || startTimeValue;
    const newEnd = toHHmm(endTimeValue) || endTimeValue;

    return existingAssignments.some((assignment: any) => {
      return timeSlotsOverlap(
        newStart,
        newEnd,
        assignment.scheduledStartTime,
        assignment.scheduledEndTime
      );
    });
  }, [getStationAssignmentsOnDate, selectedDate, startTimeValue, endTimeValue, selectedStationName, defaultStationName, selectedWorkplaceId]);

  const canSubmit = useMemo(() => {
    const s = toHHmm(startTimeValue);
    const e = toHHmm(endTimeValue);
    if (!s || !e) return false;
    
    // Allow overnight shifts, so we don't strictly enforce start < end.
    // Just ensure they are not equal.
    if (s === e) return false;

    // Check for overlaps
    if (hasTimeOverlap) return false;

    // Fallback to basic date check if overlap check helper isn't available
    // This maintains backward compatibility
    if (!getStationAssignmentsOnDate && isStationAssignedOnDate) {
      const stationToCheck = selectedStationName || defaultStationName || "";
      if (stationToCheck && selectedDate) {
        if (isStationAssignedOnDate(stationToCheck, selectedDate, selectedWorkplaceId)) {
          return false;
        }
      }
    }

    return true;
  }, [startTimeValue, endTimeValue, hasTimeOverlap, getStationAssignmentsOnDate, isStationAssignedOnDate, selectedStationName, defaultStationName, selectedDate, selectedWorkplaceId]);

  // Preview normalized times for user feedback
  const normalizedStartTime = useMemo(() => toHHmm(startTimeValue), [startTimeValue]);
  const normalizedEndTime = useMemo(() => toHHmm(endTimeValue), [endTimeValue]);

  const durationString = useMemo(() => {
    if (!normalizedStartTime || !normalizedEndTime) return "";
    const startMin = timeToMinutes(normalizedStartTime);
    let endMin = timeToMinutes(normalizedEndTime);
    
    // Handle overnight
    if (endMin < startMin || (endMin === 0 && startMin > 0)) {
      endMin += 1440;
    }
    
    const diff = endMin - startMin;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}m`;
  }, [normalizedStartTime, normalizedEndTime]);

  const addMealRow = () => {
    // Only allow adding if there are no meal rows (limit to 1)
    setMealRows((rows) => (rows.length === 0 ? [0] : rows));
  };
  const removeMealRow = (idx: number) =>
    setMealRows((rows) => rows.filter((_, i) => i !== idx));

  const filteredEmployees = useMemo(() => {
    let result = employees;

    // Filter by department if departments are provided
    if (Array.isArray(departments) && departments.length > 0) {
      const selected =
        departments.find((d) => d._id === selectedDepartmentId) ?? departments[0];
      if (selected) {
        const ids = new Set<string>([
          ...(selected.head ? [selected.head] : []),
          ...(Array.isArray(selected.members) ? selected.members : []),
        ]);

        const getId = (u: UserLite) => u._id || u.id;
        result = employees.filter((u) => {
          const id = getId(u);
          return !!id && ids.has(id);
        });
      }
    }

    // Filter out employees already assigned on the selected date
    if (getAssignedUserIdsForDate && selectedDate) {
      const assignedIds = getAssignedUserIdsForDate(selectedDate);
      const getId = (u: UserLite) => u._id || u.id;
      result = result.filter((u) => {
        const id = getId(u);
        return !!id && !assignedIds.has(id);
      });
    }

    return result;
  }, [departments, selectedDepartmentId, employees, getAssignedUserIdsForDate, selectedDate]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);

    // Validate date first - must be selected by user (or auto-set for regular work)
    const dateFromForm = (fd.get("date") as string) || "";
    const labelFromForm = ((fd.get("label") as string) || "").trim().toLowerCase();

    // For regular work, date should be auto-set, but still validate
    if (!dateFromForm || (!selectedDate && labelFromForm !== "regular work")) {
      return setError("Date is required. Please select a date.");
    }
    // Ensure the form date matches the selected date state
    if (dateFromForm !== selectedDate) {
      // Update the form field to match the state
      const dateInput = form.querySelector<HTMLSelectElement>('select[name="date"]');
      if (dateInput) {
        dateInput.value = selectedDate;
      }
    }

    const station = ((fd.get("stationName") as string) || "").trim();
    const label = ((fd.get("label") as string) || "").trim();

    // Check for time overlaps using the detailed assignment check
    if (getStationAssignmentsOnDate && station && dateFromForm) {
      const existingAssignments = getStationAssignmentsOnDate(station, dateFromForm, selectedWorkplaceId);
      
      if (existingAssignments && existingAssignments.length > 0) {
        const startRaw = ((fd.get("scheduledStartTime") as string) || startTimeValue || "").trim();
        const endRaw = ((fd.get("scheduledEndTime") as string) || endTimeValue || "").trim();
        
        const newStart = toHHmm(startRaw) || startRaw;
        const newEnd = toHHmm(endRaw) || endRaw;

        const overlapping = existingAssignments.find((assignment: any) => {
          return timeSlotsOverlap(
            newStart,
            newEnd,
            assignment.scheduledStartTime,
            assignment.scheduledEndTime
          );
        });

        if (overlapping) {
          const start = overlapping.scheduledStartTime;
          const end = overlapping.scheduledEndTime;
          return setError(
            `This station "${station}" is already booked from ${start} to ${end}. Please select a different time slot.`
          );
        }
      }
    }
    // Fallback: Check if station is already assigned on this date (if detailed check not available)
    else if (isStationAssignedOnDate && station && dateFromForm) {
      if (isStationAssignedOnDate(station, dateFromForm, selectedWorkplaceId)) {
        return setError(
          `This station "${station}" is already assigned to an employee on ${dateFromForm}. Please select a different date or station.`
        );
      }
    }

    // Get times from hidden inputs (already in 24-hour format from TimePicker12H)
    const startRaw = ((fd.get("scheduledStartTime") as string) || startTimeValue || "").trim();
    const endRaw = ((fd.get("scheduledEndTime") as string) || endTimeValue || "").trim();

    // Convert to HH:mm format if needed (should already be in correct format)
    const start = toHHmm(startRaw) || startRaw;
    const end = toHHmm(endRaw) || endRaw;

    if (!station) return setError("Station name is required.");
    if (!label) return setError("Label is required.");
    if (!start || !end || !toHHmm(start) || !toHHmm(end)) {
      let timeHint = "Invalid time format. ";
      if (!start || !toHHmm(start)) timeHint += `Start time "${startRaw}" is invalid. `;
      if (!end || !toHHmm(end)) timeHint += `End time "${endRaw}" is invalid. `;
      return setError(timeHint);
    }
    if (start === end)
      return setError("Start and end time cannot be the same.");

    const mealInputs = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="startMealTime[]"]')
    );

    const mealsNorm: string[] = [];
    let invalidMeal = false;

    for (const el of mealInputs) {
      const raw = (el.value || "").trim();
      if (!raw) continue;
      const norm = toHHmm(raw);
      if (!norm) {
        invalidMeal = true;
        break;
      }
      mealsNorm.push(norm);
    }
    if (invalidMeal) {
      return setError(
        "One or more meal times are invalid. Use 1:00 PM or 13:00."
      );
    }

    const unique = new Set(mealsNorm);
    if (unique.size !== mealsNorm.length)
      return setError("Meal times must be unique.");

    const startMin = timeToMinutes(start);
    let endMin = timeToMinutes(end);
    if (endMin < startMin || (endMin === 0 && startMin > 0)) {
      endMin += 1440;
    }

    const outOfRange = mealsNorm.find((t) => {
      let tMin = timeToMinutes(t);
      // Adjust meal time if it falls into the next day relative to start
      if (tMin < startMin) {
        tMin += 1440;
      }
      return !(tMin >= startMin && tMin < endMin);
    });
    
    if (outOfRange)
      return setError(
        `Meal time ${outOfRange} must be within the scheduled window (${start}–${end}).`
      );

    // Update hidden inputs with normalized times (already set by TimePicker12H, but ensure they're correct)
    const startInput = form.querySelector<HTMLInputElement>('input[name="scheduledStartTime"]');
    const endInput = form.querySelector<HTMLInputElement>('input[name="scheduledEndTime"]');
    if (startInput) startInput.value = start;
    if (endInput) endInput.value = end;
    let i = 0;
    mealInputs.forEach((el) => {
      const raw = (el.value || "").trim();
      el.value = raw ? mealsNorm[i++] ?? "" : "";
    });

    setShowValidation(true);
  };
  const confirmSubmit = async () => {
    try {
      const form = document.querySelector<HTMLFormElement>(
        "form#assigned-user-form"
      );
      if (!form) return;

      // Ensure the date field has the selected date value before submission
      if (!selectedDate) {
        setErrorMessage("Date is required. Please select a date.");
        setShowValidation(false);
        return;
      }

      const dateInput = form.querySelector<HTMLSelectElement>('select[name="date"]');
      if (dateInput) {
        dateInput.value = selectedDate;
        // Force a change event to ensure the form recognizes the value
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Verify the date is set correctly before submission
      const formData = new FormData(form);
      const dateFromForm = formData.get("date") as string;

      // Log for debugging
      if (process.env.NODE_ENV === "development") {
        console.log("confirmSubmit - date check:", {
          selectedDate,
          dateFromForm,
          dateInputValue: dateInput?.value,
          match: dateFromForm === selectedDate
        });
      }

      if (!dateFromForm || dateFromForm !== selectedDate) {
        console.error("Date mismatch:", { selectedDate, dateFromForm, dateInputValue: dateInput?.value });
        setErrorMessage(`Date validation failed. Selected: ${selectedDate}, Form: ${dateFromForm}`);
        setShowValidation(false);
        return;
      }

      // Log the date being sent for debugging
      if (process.env.NODE_ENV === "development") {
        console.log("Submitting assignment with date:", dateFromForm);
      }

      const event = new Event("submit", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "target", { value: form });
      await onSubmit(event as unknown as React.FormEvent<HTMLFormElement>);

      setSuccessMessage("User assigned successfully!");
      setShowValidation(false);
    } catch (err: any) {
      console.error("Assignment error:", err);

      // Extract error message from various error formats
      let errorMsg = "Failed to assign user. Please try again.";
      if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      } else if (typeof err === "string") {
        errorMsg = err;
      }

      setErrorMessage(errorMsg);
      setShowValidation(false);
    }
  };

  const timeError = Boolean(error?.toLowerCase().includes("time"));
  const stationError = Boolean(error?.toLowerCase().includes("station"));

  return (
    <ModalShell title="Assign User to Workstation" onClose={onClose}>
      <div className="max-w-full">
        <form
          id="assigned-user-form"
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
        >
          {Array.isArray(departments) && departments.length > 0 && (
            <div>
              <label
                htmlFor={deptId}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Department
              </label>
              <select
                id={deptId}
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Only the selected department's head and members will be listed.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor={dateId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date
            </label>
            <select
              id={dateId}
              name="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a date</option>
              {dateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Please select a date first to enable employee selection.
            </p>
            {/* Show existing assignments/warnings */}
            {selectedDate && (selectedStationName || defaultStationName) && getStationAssignmentsOnDate && (
              (() => {
                const stationToCheck = selectedStationName || defaultStationName || "";
                const assignments = getStationAssignmentsOnDate(stationToCheck, selectedDate, selectedWorkplaceId);
                
                if (assignments.length > 0) {
                  return (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-medium text-amber-800 mb-1">Existing Assignments:</p>
                      <ul className="text-xs text-amber-700 space-y-1">
                        {assignments.map((a: any, i: number) => (
                          <li key={i}>
                            • {a.scheduledStartTime} - {a.scheduledEndTime} 
                            {a.label ? ` (${a.label})` : ""}
                          </li>
                        ))}
                      </ul>
                      {hasTimeOverlap && (
                        <p className="mt-2 text-xs text-red-600 font-bold">
                          ⚠️ Selected time overlaps with an existing assignment.
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              })()
            )}
            {/* Fallback warning if getStationAssignmentsOnDate is not available */}
            {!getStationAssignmentsOnDate && selectedDate && (selectedStationName || defaultStationName) && isStationAssignedOnDate && isStationAssignedOnDate(selectedStationName || defaultStationName || "", selectedDate, selectedWorkplaceId) && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                ⚠️ This station "{selectedStationName || defaultStationName}" is already assigned to an employee on this date. Please select a different date or station.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={employeeId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Employee
            </label>
            <select
              id={employeeId}
              name="userId"
              defaultValue={defaultUserId ?? ""}
              disabled={!selectedDate && selectedLabel.trim().toLowerCase() !== "regular work"}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!selectedDate && selectedLabel.trim().toLowerCase() !== "regular work"
                  ? "bg-gray-100 cursor-not-allowed opacity-60"
                  : ""
                }`}
              required
            >
              <option value="">
                {selectedDate || selectedLabel.trim().toLowerCase() === "regular work"
                  ? "Select employee"
                  : "Please select a date first"}
              </option>
              {selectedDate && filteredEmployees.map((employee, i) => {
                const id = employee._id || employee.id || `u-${i}`;
                const name =
                  [employee.firstName, employee.middleName, employee.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim() ||
                  employee.username ||
                  employee.email ||
                  "Unknown User";
                const position =
                  employee.position || employee.title || employee.role;
                return (
                  <option key={id} value={id}>
                    {name} {position ? `- ${position}` : ""}
                  </option>
                );
              })}
            </select>
            {(selectedDate || selectedLabel.trim().toLowerCase() === "regular work") && Array.isArray(departments) &&
              departments.length > 0 &&
              filteredEmployees.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No employees found for the selected department.
                </p>
              )}
            {!selectedDate && selectedLabel.trim().toLowerCase() !== "regular work" && (
              <p className="mt-1 text-xs text-amber-600">
                Please select a date to view available employees.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={stationId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Station Name
            </label>
            <input
              id={stationId}
              name="stationName"
              type="text"
              defaultValue={defaultStationName ?? ""}
              readOnly={lockStationName}
              placeholder="e.g., Station 1"
              aria-describedby={stationHelpId}
              aria-invalid={stationError || undefined}
              onChange={(e) => setSelectedStationName(e.target.value.trim())}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${lockStationName
                  ? "bg-gray-50 text-gray-700 border-gray-300"
                  : "border-gray-300"
                }`}
              required
            />
            <p id={stationHelpId} className="mt-1 text-xs text-gray-500">
              {lockStationName ? (
                <>
                  This assignment is for <strong>{defaultStationName}</strong>.
                </>
              ) : (
                <>Choose or enter a station to assign this user.</>
              )}
            </p>
          </div>

          <div>
            <label
              htmlFor={labelId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Label
            </label>
            <input
              id={labelId}
              name="label"
              type="text"
              value={selectedLabel}
              list="label-presets"
              placeholder='e.g., "regular work", "overtime", "on-leave", "training", "meeting"'
              aria-describedby={labelHelpId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => {
                const labelValue = e.target.value.trim();
                setSelectedLabel(labelValue);
                const labelLower = labelValue.toLowerCase();

                // Auto-set times and date for "regular work"
                if (labelLower === "regular work") {
                  setStartTimeValue("08:00");
                  setEndTimeValue("17:00");
                  setMealTimeValue("12:00");
                  
                  // Auto-set date to today if not already selected
                  if (!selectedDate) {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    const todayStr = `${year}-${month}-${day}`;
                    setSelectedDate(todayStr);

                    // Update the form field
                    const form = document.querySelector<HTMLFormElement>("form#assigned-user-form");
                    if (form) {
                      const dateInput = form.querySelector<HTMLSelectElement>('select[name="date"]');
                      if (dateInput) {
                        dateInput.value = todayStr;
                      }
                    }
                  }

                  // Update hidden inputs
                  const form = document.querySelector<HTMLFormElement>("form#assigned-user-form");
                  if (form) {
                    const startInput = form.querySelector<HTMLInputElement>('input[name="scheduledStartTime"]');
                    const endInput = form.querySelector<HTMLInputElement>('input[name="scheduledEndTime"]');
                    if (startInput) startInput.value = "08:00";
                    if (endInput) endInput.value = "17:00";
                  }
                }
                
                // Morning shift: start 5:00 AM, breaks 7:00 & 9:00 (15 min, backend), lunch 11:00–12:00, end 2:00 PM
                else if (labelLower === "morning shift") {
                  setStartTimeValue("05:00");
                  setEndTimeValue("14:00");
                  setMealTimeValue("11:00"); // Lunch 11:00 AM–12:00 PM (7:00 & 9:00 breaks are fixed in backend)
                  
                  // Update hidden inputs
                  const form = document.querySelector<HTMLFormElement>("form#assigned-user-form");
                  if (form) {
                    const startInput = form.querySelector<HTMLInputElement>('input[name="scheduledStartTime"]');
                    const endInput = form.querySelector<HTMLInputElement>('input[name="scheduledEndTime"]');
                    if (startInput) startInput.value = "05:00";
                    if (endInput) endInput.value = "14:00";
                  }
                }
                
                // Mid-shift (3pm - 12am)
                // Note: 12am is 00:00 or 24:00. 
                // Since our time picker handles 24h, we use 24:00 or 00:00.
                // However, 00:00 is technically the start of the next day.
                // For simplicity in single-day assignments, we'll use 23:59 or 00:00 if handled.
                // Let's use 24:00 if supported, or 00:00.
                // But the time picker converts to 12h. 12 AM is 00:00.
                // If it's 3pm to 12am, it crosses midnight if we consider 12am as next day.
                // But usually in shifts, 3pm-12am means 15:00 - 00:00.
                else if (labelLower === "mid-shift") {
                  setStartTimeValue("15:00");
                  setEndTimeValue("00:00");
                  setMealTimeValue("19:00");
                  
                  // Update hidden inputs
                  const form = document.querySelector<HTMLFormElement>("form#assigned-user-form");
                  if (form) {
                    const startInput = form.querySelector<HTMLInputElement>('input[name="scheduledStartTime"]');
                    const endInput = form.querySelector<HTMLInputElement>('input[name="scheduledEndTime"]');
                    if (startInput) startInput.value = "15:00";
                    if (endInput) endInput.value = "00:00";
                  }
                }
              }}
              required
            />
            <datalist id="label-presets">
              <option value="regular work" />
              <option value="Morning shift" />
              <option value="Mid-shift" />
              <option value="overtime" />
              <option value="on-leave" />
              <option value="training" />
              <option value="meeting" />
            </datalist>
            <p id={labelHelpId} className="mt-1 text-xs text-gray-500">
              Saved as the required <code>label</code> in the schedule/DTR.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TimePicker12H
              id={startId}
              value={startTimeValue}
              onChange={(newValue) => {
                setStartTimeValue(newValue);
                // Update hidden input for form submission
                const form = document.querySelector<HTMLFormElement>("form#assigned-user-form");
                if (form) {
                  const hiddenInput = form.querySelector<HTMLInputElement>(`input[name="scheduledStartTime"]`);
                  if (hiddenInput) hiddenInput.value = newValue;
                }
              }}
              label="Start Time"
              error={timeError}
              disabled={selectedLabel.trim().toLowerCase() === "regular work"}
            />
            <TimePicker12H
              id={endId}
              value={endTimeValue}
              onChange={(newValue) => {
                setEndTimeValue(newValue);
                // Update hidden input for form submission
                const form = document.querySelector<HTMLFormElement>("form#assigned-user-form");
                if (form) {
                  const hiddenInput = form.querySelector<HTMLInputElement>(`input[name="scheduledEndTime"]`);
                  if (hiddenInput) hiddenInput.value = newValue;
                }
              }}
              label="End Time"
              error={timeError}
              disabled={selectedLabel.trim().toLowerCase() === "regular work"}
            />
          </div>
          {/* Hidden inputs for form submission (24-hour format) */}
          <input type="hidden" name="scheduledStartTime" value={normalizedStartTime || startTimeValue} />
          <input type="hidden" name="scheduledEndTime" value={normalizedEndTime || endTimeValue} />
          {normalizedStartTime && normalizedEndTime && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Time Range:</strong> {normalizedStartTime} - {normalizedEndTime}
                ({durationString})
              </p>
            </div>
          )}

          <fieldset aria-describedby={mealsGroupHelpId} className="mt-2">
            <legend className="block text-sm font-medium text-gray-700">
              Meal Start Times (optional)
            </legend>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={addMealRow}
                disabled={mealRows.length > 0}
                className={`text-sm ${mealRows.length > 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-blue-600 hover:text-blue-700"
                  }`}
              >
                + Add meal time
              </button>
            </div>

            {mealRows.length > 0 ? (
              <div className="mt-2 space-y-2">
                {mealRows.map((idx) => {
                  const mealId = `${mealsBaseId}-${idx}`;
                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex-1">
                        <TimePicker12H
                          id={mealId}
                          value={mealTimeValue}
                          onChange={setMealTimeValue}
                          label="Meal Start Time"
                          disabled={["regular work", "morning shift", "mid-shift"].includes(selectedLabel.trim().toLowerCase())}
                        />
                        <input type="hidden" name="startMealTime[]" value={mealTimeValue} />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMealRow(idx)}
                        disabled={["regular work", "morning shift", "mid-shift"].includes(selectedLabel.trim().toLowerCase())}
                        className={`text-sm px-2 py-1 rounded-lg mt-8 ${
                          ["regular work", "morning shift", "mid-shift"].includes(selectedLabel.trim().toLowerCase())
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                        }`}
                        aria-label={`Remove meal time #${idx + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p id={mealsGroupHelpId} className="mt-1 text-xs text-gray-500">
                No meal times added. Click "Add meal time" to include breaks.
              </p>
            )}
          </fieldset>

          {(error || serverError) && (
            <div
              className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2"
              role="alert"
              aria-live="polite"
            >
              {error || serverError}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? "Assigning…" : "Assign User"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <ErrorModal message={errorMessage} onClose={() => setErrorMessage("")} />

      <SuccessModal
        message={successMessage}
        onClose={() => {
          setSuccessMessage("");
          onClose();
        }}
      />

      <ValidationModal
        open={showValidation}
        title="Confirm Assignment"
        message="Are you sure you want to assign this user to the workstation?"
        onCancel={() => setShowValidation(false)}
        onConfirm={confirmSubmit}
      />
    </ModalShell>
  );
}
