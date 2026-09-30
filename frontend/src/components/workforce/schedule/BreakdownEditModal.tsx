/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { ISession } from "../../../types/global/schedule/schedule.type";
import { ErrorModal } from "../../global/ErrorModal";
import { SuccessModal } from "../../global/SuccessModal";
import { ValidationModal } from "../../global/ValidationModal";
import { InfoIcon } from "../../common/InfoIcon";

type BreakdownItem = {
  type: "work" | "break" | "meal";
  start: string;
  end: string;
};

type SessionWithSched = ISession & {
  _id?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  fullSched?: BreakdownItem[];
};

interface BreakdownEditModalProps {
  isOpen: boolean;
  scheduleId: string;
  session: SessionWithSched;
  breakdownIndex: number;
  onClose: () => void;
  onSave: (patch: Partial<ISession>) => Promise<void> | void;
}

function toMinutes(t?: string): number | null {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function cmpTimeAsc(a: BreakdownItem, b: BreakdownItem) {
  const am = toMinutes(a.start) ?? 0;
  const bm = toMinutes(b.start) ?? 0;
  return am - bm;
}

export default function BreakdownEditModal({
  isOpen,
  session,
  breakdownIndex,
  onClose,
  onSave,
}: BreakdownEditModalProps) {
  const original = useMemo(
    () => (session.fullSched ?? [])[breakdownIndex],
    [session, breakdownIndex]
  );

  const [type, setType] = useState<BreakdownItem["type"]>(
    original?.type ?? "work"
  );
  const [start, setStart] = useState<string>(original?.start ?? "08:00");
  const [end, setEnd] = useState<string>(original?.end ?? "00:00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  const validate = (): string | null => {
    const startMin = toMinutes(start);
    const endMin = toMinutes(end);
    if (startMin === null || endMin === null)
      return "Please enter valid times (HH:MM).";
    if (startMin >= endMin) return "Start time must be earlier than end time.";

    const others = (session.fullSched ?? [])
      .map((it, idx) => ({ ...it, __idx: idx }))
      .filter((it) => it.__idx !== breakdownIndex);
    for (const o of others) {
      const os = toMinutes(o.start) ?? 0;
      const oe = toMinutes(o.end) ?? 0;
      const overlaps = startMin < oe && os < endMin;
      if (overlaps) {
        return `Overlap with "${o.type}" ${o.start}–${o.end}. Adjust times.`;
      }
    }

    return null;
  };

  const handleSubmit = () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setShowValidation(true);
  };

  const confirmSubmit = async () => {
    setSubmitting(true);
    try {
      const current = session.fullSched ?? [];
      const updated = current.map((it, idx) =>
        idx === breakdownIndex ? { ...it, type, start, end } : it
      );
      updated.sort(cmpTimeAsc);

      const startMealTime = updated
        .filter((it) => it.type === "meal")
        .map((it) => it.start);

      const patch: Partial<ISession> = {
        fullSched: updated as any,
        startMealTime,
      };

      await Promise.resolve(onSave(patch));
      setSuccessMessage("Breakdown updated successfully!");
      setShowValidation(false);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to save changes. Please try again.");
      setShowValidation(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-lg border border-slate-200/80">
        <div className="px-5 py-4 border-b border-slate-200/80">
          <h3 className="text-lg font-semibold text-slate-900">
            Edit Breakdown
          </h3>
          <p className="text-xs text-slate-500">
            Update a single segment inside this session. Times must be within
            the session and not overlap with other segments.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-1">
              Type
              <InfoIcon
                description="Select the type of time segment: Work (productive work time), Break (short rest periods), or Meal (lunch/dining time). This classification helps track different types of time and calculate work credits accurately."
                title="Breakdown Type"
              />
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as BreakdownItem["type"])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="work">Work</option>
              <option value="break">Break</option>
              <option value="meal">Meal</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-1">
                Start
                <InfoIcon
                  description="The start time for this breakdown segment in HH:MM format (24-hour). This time must be within the session's scheduled time window and before the end time. Times must not overlap with other segments in the same session."
                  title="Start Time"
                />
              </label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-1">
                End
                <InfoIcon
                  description="The end time for this breakdown segment in HH:MM format (24-hour). This time must be after the start time, within the session's scheduled time window, and not overlap with other segments. The system will validate for overlaps automatically."
                  title="End Time"
                />
              </label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {session.scheduledStartTime && session.scheduledEndTime && (
            <p className="text-xs text-slate-500">
              Session window: {session.scheduledStartTime}–
              {session.scheduledEndTime}
            </p>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200/80 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
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
        title="Confirm Update"
        message="Are you sure you want to save changes to this breakdown?"
        onCancel={() => setShowValidation(false)}
        onConfirm={confirmSubmit}
      />
    </div>
  );
}
