import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ErrorModal } from "../../global/ErrorModal";
import ModalShell from "../../global/ModalShell";
import { SuccessModal } from "../../global/SuccessModal";
import { ValidationModal } from "../../global/ValidationModal";
import { InfoIcon } from "../../common/InfoIcon";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialName?: string;
  initialWorkstationCount?: number;
  initialStationNames?: string[];
  resetKey?: string | number;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    workstationCount: number;
    useStationNames: boolean;
    stationNames: string[];
  }) => Promise<void>;
  submitting?: boolean;
};

export default function WorkplaceFormModal({
  open,
  mode,
  initialName = "",
  initialWorkstationCount = 0,
  initialStationNames = [],
  resetKey,
  onClose,
  onSubmit,
  submitting,
}: Props) {
  const [name, setName] = useState(initialName);
  const [count, setCount] = useState(
    initialStationNames.length > 0
      ? initialStationNames.length
      : Math.max(initialWorkstationCount, 1)
  );
  const [useNames, setUseNames] = useState(initialStationNames.length > 0);
  const [stationNames, setStationNames] = useState<string[]>(
    initialStationNames.length > 0
      ? [...initialStationNames]
      : Array.from(
          { length: Math.max(initialWorkstationCount, 1) },
          (_, i) => `Station ${i + 1}`
        )
  );

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (!open) return;
    const preferNames = initialStationNames.length > 0;

    setName(initialName);
    setUseNames(preferNames);

    const baseCount = Math.max(
      preferNames ? initialStationNames.length : initialWorkstationCount,
      1
    );
    setCount(baseCount);

    setStationNames(
      preferNames
        ? [...initialStationNames]
        : Array.from(
            { length: baseCount },
            (_, i) => `Station ${i + 1}`
          )
    );
  }, [
    open,
    resetKey,
    initialName,
    initialWorkstationCount,
    initialStationNames,
  ]);

  useEffect(() => {
    setStationNames((prev) => {
      if (count === prev.length) return prev;
      if (count < prev.length) return prev.slice(0, count);
      const next = [...prev];
      for (let i = prev.length; i < count; i++) next.push(`Station ${i + 1}`);
      return next;
    });
  }, [count]);

  const handleNameChange = (idx: number, value: string) => {
    setStationNames((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (count < 1) {
      setErrorMessage("Workstation count must be at least 1.");
      return;
    }
    setShowValidation(true);
  };

  const confirmSubmit = async () => {
    try {
      await onSubmit({
        name,
        workstationCount: count,
        useStationNames: useNames,
        stationNames,
      });

      setSuccessMessage(
        mode === "create"
          ? "Workplace created successfully!"
          : "Workplace updated successfully!"
      );
      setShowValidation(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setErrorMessage(msg);
      setShowValidation(false);
    }
  };

  if (!open) return null;

  return (
    <ModalShell
      title={mode === "create" ? "Add Workplace" : "Edit Workplace"}
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        aria-describedby="workplace-help"
      >
        <p id="workplace-help" className="text-sm text-gray-500 mb-4">
          You can optionally specify station names. When enabled, we’ll use
          exactly those names.
        </p>

        <input
          type="hidden"
          name="useStationNames"
          value={useNames ? "1" : ""}
        />

        <div>
          <label
            htmlFor="workplaceName"
            className="block text-sm font-medium text-gray-700 flex items-center gap-1"
          >
            Workplace Name
            <InfoIcon
              description="The name of the workplace or work area. This should clearly identify the location (e.g., 'Operations Floor', 'Main Office', 'Warehouse A'). This name will be used for workplace assignments and location tracking."
              title="Workplace Name"
            />
          </label>
          <input
            id="workplaceName"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Operations Floor"
          />
        </div>

        <div>
          <label
            htmlFor="workstationCount"
            className="block text-sm font-medium text-gray-700 flex items-center gap-1"
          >
            Workstation Count
            <InfoIcon
              description="The total number of workstations or stations available in this workplace. Enter a number (e.g., 3, 10, 25). If you enable 'Use specific station names', you'll be able to name each station individually. The number of station name fields will automatically match this count."
              title="Workstation Count"
            />
          </label>
          <input
            id="workstationCount"
            type="number"
            min={1}
            value={Number.isFinite(count) && count >= 1 ? count : 1}
            onChange={(e) => {
              const n = parseInt(e.target.value || "1", 10);
              setCount(Number.isNaN(n) ? 1 : Math.max(1, n));
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 3"
          />
          <p className="mt-1 text-xs text-gray-500">
            Station name fields (if enabled) will match this count.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="useNames"
            type="checkbox"
            checked={useNames}
            onChange={(e) => setUseNames(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="useNames" className="text-sm text-gray-700 flex items-center gap-1">
            Use specific station names
            <InfoIcon
              description="When enabled, you can assign custom names to each workstation (e.g., 'Station A', 'Desk 5', 'Workstation 1'). When disabled, stations will use auto-generated names like 'Station 1', 'Station 2', etc. Enabling this gives you more control over station identification."
              title="Use Specific Station Names"
            />
          </label>
        </div>

        {useNames && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">
              Station Names ({count})
            </div>
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-16 text-xs text-gray-500">#{i + 1}</div>
                  <input
                    id={`stationName-${i}`}
                    type="text"
                    value={stationNames[i] ?? ""}
                    onChange={(e) => handleNameChange(i, e.target.value)}
                    required
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Station ${i + 1}`}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              These names will override the auto-generated ones.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition-colors"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting
              ? "Saving..."
              : mode === "create"
              ? "Create"
              : "Save Changes"}
          </button>
        </div>
      </form>

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
        title={mode === "create" ? "Confirm Create" : "Confirm Update"}
        message={`Are you sure you want to ${
          mode === "create"
            ? "create this workplace?"
            : "save changes to this workplace?"
        }`}
        onCancel={() => setShowValidation(false)}
        onConfirm={confirmSubmit}
      />
    </ModalShell>
  );
}
