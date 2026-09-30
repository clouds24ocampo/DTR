import { useEffect, useState } from "react";
import { ILeaveRequestDoc, CreateLeaveRequestBodyInput, EditLeaveRequestBodyInput } from "../../../types/global/leave/leave.type";
import ModalShell from "../../global/ModalShell";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial?: ILeaveRequestDoc | null;
  onClose: () => void;
  onCreate?: (payload: CreateLeaveRequestBodyInput) => Promise<void>;
  onUpdate?: (id: string, payload: EditLeaveRequestBodyInput) => Promise<void>;
  loading?: boolean;
};

export default function LeaveModal({
  open,
  mode,
  initial,
  onClose,
  onCreate,
  onUpdate,
  loading,
}: Props) {
  const [type, setType] = useState<
    "vacation" | "sick" | "personal" | "emergency"
  >("vacation");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [halfDay, setHalfDay] = useState<boolean>(false);

  useEffect(() => {
    if (open && mode === "edit" && initial) {
      setType(initial.type);
      setStartDate(initial.startDate);
      setEndDate(initial.endDate);
      setReason(initial.reason);
      setHalfDay(Boolean(initial.halfDay));
    }
  }, [open, mode, initial]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = { type, startDate, endDate, reason, halfDay };

    if (mode === "create" && onCreate) {
      await onCreate(payload as CreateLeaveRequestBodyInput);
    } else if (mode === "edit" && initial && onUpdate) {
      const safeId = initial.id ?? "";
      if (!safeId) return;
      await onUpdate(safeId, payload as EditLeaveRequestBodyInput);
    }

    onClose();
  };

  return (
    <ModalShell
      title={mode === "create" ? "Create Leave Request" : "Edit Leave Request"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label
              htmlFor="leaveType"
              className="block text-sm font-medium text-gray-700"
            >
              Leave Type
            </label>
            <select
              id="leaveType"
              name="type"
              value={type}
              onChange={(e) =>
                setType(
                  e.target.value as
                  | "vacation"
                  | "sick"
                  | "personal"
                  | "emergency"
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="vacation">Vacation</option>
              <option value="sick">Sick</option>
              <option value="personal">Personal</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div className="flex items-center gap-2 mt-6">
            <input
              id="halfDay"
              name="halfDay"
              type="checkbox"
              checked={halfDay}
              onChange={(e) => setHalfDay(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="halfDay" className="text-sm text-gray-700">
              Half-day
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700"
            >
              Start Date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700"
            >
              End Date
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="reason"
            className="block text-sm font-medium text-gray-700"
          >
            Reason
          </label>
          <textarea
            id="reason"
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Brief description…"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {mode === "create" ? "Create Leave" : "Save Changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
