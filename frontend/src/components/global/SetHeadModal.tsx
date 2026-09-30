import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  UserLite,
  displayUserName,
} from "../../utils/department/helpers.utils";
import { ErrorModal } from "./ErrorModal";
import ModalShell from "./ModalShell";
import { SuccessModal } from "./SuccessModal";
import { ValidationModal } from "./ValidationModal";

type DeptLite = { _id: string; head: string | null; members: string[] };

type Props = {
  open: boolean;
  onClose: () => void;
  users: UserLite[];
  currentHeadId: string | null;
  onSet: (headId: string | null) => Promise<void>;
  submitting?: boolean;
  departments: DeptLite[];
  departmentId: string;
};

export default function SetHeadModal({
  open,
  onClose,
  users,
  currentHeadId,
  onSet,
  submitting,
  departments,
  departmentId,
}: Props) {
  const [value, setValue] = useState<string>(currentHeadId ?? "");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (open) setValue(currentHeadId ?? "");
  }, [open, currentHeadId]);

  const filteredUsers = useMemo(() => {
    const assignedElsewhere = new Set<string>();
    for (const d of departments ?? []) {
      if (d._id === departmentId) continue;
      if (d.head) assignedElsewhere.add(String(d.head));
      for (const m of d.members ?? []) assignedElsewhere.add(String(m));
    }
    const getId = (u: UserLite) =>
      u._id || u.id ? String(u._id || u.id) : undefined;

    return users.filter((u) => {
      const id = getId(u);
      if (!id) return false;
      if (currentHeadId && id === currentHeadId) return true;
      return !assignedElsewhere.has(id);
    });
  }, [users, departments, departmentId, currentHeadId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
  };

  const confirmSubmit = async () => {
    try {
      await onSet(value);
      setSuccessMessage("Department head updated successfully!");
      setShowValidation(false);
    } catch {
      setErrorMessage("Failed to update department head. Please try again.");
      setShowValidation(false);
    }
  };

  if (!open) return null;

  return (
    <ModalShell title="Set Department Head" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Select Head</span>
          <select
            className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            <option value="">— No Head Assigned —</option>
            {filteredUsers.map((u) => (
              <option key={u._id ?? u.id} value={String(u._id ?? u.id)}>
                {displayUserName(u)}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Only users not assigned to other departments are shown.
          </p>
        </label>
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
            {submitting ? "Saving..." : "Save Changes"}
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
        title="Confirm Update"
        message="Are you sure you want to update the department head?"
        onCancel={() => setShowValidation(false)}
        onConfirm={confirmSubmit}
      />
    </ModalShell>
  );
}
