import { Check, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UserLite, displayUserName } from "../../../utils/department/helpers.utils";
import { ErrorModal } from "../../global/ErrorModal";
import ModalShell from "../../global/ModalShell";
import { SuccessModal } from "../../global/SuccessModal";
import { ValidationModal } from "../../global/ValidationModal";

type DeptLite = { _id: string; head: string | null; members: string[] };

type Props = {
  open: boolean;
  onClose: () => void;
  users: UserLite[];
  memberIds: string[];
  onSave: (nextMembers: string[]) => Promise<void>;
  submitting?: boolean;
  departments: DeptLite[];
  departmentId: string;
};

export default function MembersModal({
  open,
  onClose,
  users,
  memberIds,
  onSave,
  submitting,
  departments,
  departmentId,
}: Props) {
  const [selected, setSelected] = useState<string[]>(memberIds);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(memberIds);
      setQuery("");
    }
  }, [open, memberIds]);

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
      
      // Search filter
      if (query) {
        const name = displayUserName(u).toLowerCase();
        if (!name.includes(query.toLowerCase())) return false;
      }

      if (selected.includes(id)) return true;
      return !assignedElsewhere.has(id);
    });
  }, [users, departments, departmentId, selected, query]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
  };

  const confirmSubmit = async () => {
    try {
      await onSave(selected);
      setSuccessMessage("Members updated successfully!");
      setShowValidation(false);
    } catch {
      setErrorMessage("Failed to update members. Please try again.");
      setShowValidation(false);
    }
  };

  if (!open) return null;

  return (
    <ModalShell title="Manage Department Members" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="border rounded-lg overflow-hidden border-gray-200">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between">
            <span>Employee</span>
            <span>{selected.length} Selected</span>
          </div>
          <div className="max-h-[360px] overflow-auto divide-y divide-gray-100">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const id = String(u._id ?? u.id);
                const checked = selected.includes(id);
                return (
                  <label
                    key={id}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                      checked ? "bg-blue-50/50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        checked={checked}
                        onChange={() => toggle(id)}
                      />
                      <div>
                        <div className={`text-sm font-medium ${checked ? "text-blue-900" : "text-gray-900"}`}>
                          {displayUserName(u)}
                        </div>
                        <div className="text-xs text-gray-500">{u.position || "No Position"}</div>
                      </div>
                    </div>
                    {checked && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </label>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">No employees found.</p>
              </div>
            )}
          </div>
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
        message={`Are you sure you want to update the members list? You have selected ${selected.length} members.`}
        onCancel={() => setShowValidation(false)}
        onConfirm={confirmSubmit}
      />
    </ModalShell>
  );
}
