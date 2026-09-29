import { Minus, Plus } from "lucide-react";
import React, { useState } from "react";
import { ISession } from "../../../types/global/schedule/schedule.type";
import ModalShell from "../../global/ModalShell";
import { InfoIcon } from "../../common/InfoIcon";

type Props = {
  scheduleId: string;
  session: ISession & { _id?: string };
  onClose: () => void;
  onSave: (patch: Partial<ISession>) => void | Promise<void>;
};

export default function SessionEditModal({ session, onClose, onSave }: Props) {
  const [start, setStart] = useState(session.scheduledStartTime);
  const [end, setEnd] = useState(session.scheduledEndTime);
  const [meals, setMeals] = useState<string[]>(
    Array.isArray(session.startMealTime) ? [...session.startMealTime] : []
  );

  const addMealRow = () => setMeals((prev) => [...prev, ""]);
  const updateMealAt = (i: number, v: string) =>
    setMeals((prev) => prev.map((m, idx) => (idx === i ? v : m)));
  const removeMealAt = (i: number) =>
    setMeals((prev) => prev.filter((_, idx) => idx !== i));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patch: Partial<ISession> = {
      scheduledStartTime: start,
      scheduledEndTime: end,
      startMealTime: meals.filter(Boolean),
    };
    await onSave(patch);
    onClose();
  };

  return (
    <ModalShell title="Edit Session" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600 flex items-center gap-1">
              Start
              <InfoIcon
                description="The scheduled start time for this work session in HH:MM format (24-hour). This defines when the employee is expected to begin work for this session. The time should be in a valid 24-hour format."
                title="Session Start Time"
              />
            </label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 flex items-center gap-1">
              End
              <InfoIcon
                description="The scheduled end time for this work session in HH:MM format (24-hour). This must be after the start time and defines when the employee is expected to finish work for this session."
                title="Session End Time"
              />
            </label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600 flex items-center gap-1">
              Meal Start Times
              <InfoIcon
                description="Add the start times for meal breaks within this session. You can add multiple meal times if employees have multiple meal breaks. Each meal time should be in HH:MM format (24-hour). These times are used to track meal breaks and calculate work hours accurately."
                title="Meal Start Times"
              />
            </label>
            <button
              type="button"
              onClick={addMealRow}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>

          {meals.length === 0 ? (
            <p className="text-xs text-gray-500">No meals added.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {meals.map((m, i) => (
                <div key={`meal-${i}`} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={m}
                    onChange={(e) => updateMealAt(i, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeMealAt(i)}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                    aria-label="Remove meal time"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
