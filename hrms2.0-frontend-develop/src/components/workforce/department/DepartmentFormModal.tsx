import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DepartmentDoc, CreateDepartmentBodyInput, UpdateDepartmentBodyInput } from "../../../types/workforce/department/department.type";
import { ErrorModal } from "../../global/ErrorModal";
import ModalShell from "../../global/ModalShell";
import { SuccessModal } from "../../global/SuccessModal";
import { ValidationModal } from "../../global/ValidationModal";
import { InfoIcon } from "../../common/InfoIcon";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<DepartmentDoc>;
  onSubmit: (
    payload: CreateDepartmentBodyInput | UpdateDepartmentBodyInput
  ) => Promise<void>;
  onClose: () => void;
  submitting?: boolean;
};

export default function DepartmentFormModal({
  open,
  mode,
  initial,
  onSubmit,
  onClose,
  submitting,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [status, setStatus] = useState<boolean>(initial?.status ?? true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setType(initial?.type ?? "");
      setDescription(initial?.description ?? "");
      setLocation(initial?.location ?? "");
      setStatus(initial?.status ?? true);
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
  };

  const confirmSubmit = async () => {
    try {
      const base = { name, type, description, location, status };
      const payload =
        mode === "create"
          ? (base as CreateDepartmentBodyInput)
          : (base as UpdateDepartmentBodyInput);

      await onSubmit(payload);

      setSuccessMessage(
        mode === "create"
          ? "Department created successfully!"
          : "Department updated successfully!"
      );
      setShowValidation(false);
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setShowValidation(false);
    }
  };

  if (!open) return null;

  return (
    <ModalShell
      title={mode === "create" ? "Create Department" : "Edit Department"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              Name
              <InfoIcon
                description="The name of the department. This should be unique and clearly identify the department's purpose or function within the organization (e.g., 'Human Resources', 'Engineering', 'Sales')."
                title="Department Name"
              />
            </span>
            <input
              className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Human Resources"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              Type
              <InfoIcon
                description="The type or category of the department. This helps classify departments into broader categories (e.g., 'Operations', 'Support', 'Management', 'Technical')."
                title="Department Type"
              />
            </span>
            <input
              className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              placeholder="e.g. Operations"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            Description
            <InfoIcon
              description="A detailed description of the department's purpose, responsibilities, and role within the organization. This helps team members and managers understand what the department does."
              title="Description"
            />
          </span>
          <textarea
            className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the department..."
          />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              checked={status}
              onChange={(e) => setStatus(e.target.checked)}
            />
            <span className="text-sm text-gray-700 flex items-center gap-1">
              Active Status
              <InfoIcon
                description="Check this box to make the department active. Active departments are visible in the system and can have employees assigned to them. Inactive departments are hidden but can be reactivated later."
                title="Active Status"
              />
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              Location
              <InfoIcon
                description="The physical location or office address of the department (optional). This can be used for location-based features, geofencing, and workplace management."
                title="Location"
              />
            </span>
            <input
              className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Building A, Floor 2"
            />
          </label>
        </div>
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
            {submitting ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
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
            ? "create this department?"
            : "save changes to this department?"
        }`}
        onCancel={() => setShowValidation(false)}
        onConfirm={confirmSubmit}
      />
    </ModalShell>
  );
}
