import { Edit, MapPin, Trash2, Users } from "lucide-react";
import { useState } from "react";
import {
  IWorkplace,
  Workstation,
} from "../../../types/workforce/workplace/workplace.type";
import { ErrorModal } from "../../global/ErrorModal";
import { SuccessModal } from "../../global/SuccessModal";
import { ValidationModal } from "../../global/ValidationModal";

type Props = {
  workplaces: IWorkplace[];
  loading?: boolean;
  onEdit: (workplaceId: string) => void;
  onDelete: (workplaceId: string) => Promise<void>;
};

export default function WorkplacesTab({
  workplaces,
  loading,
  onEdit,
  onDelete,
}: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await onDelete(confirmDeleteId);
      setSuccessMessage("Workplace deleted successfully!");
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to delete workplace. Please try again.");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-sm text-gray-500">Loading workplaces…</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workplaces.map((workplace, idx) => (
          <div
            key={workplace._id ?? `wp-${workplace.name}-${idx}`}
            className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {workplace.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {workplace.workstationCount} workstations
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="text-sm text-gray-600">
                <strong>Workstations:</strong>
              </div>
              {workplace.workstations?.length ? (
                <div className="space-y-2">
                  {workplace.workstations.map((workstation: Workstation) => {
                    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

                    const isAssigned = (workstation.dates || []).some(
                      (d) =>
                        d.date === today && (d.assignedUsers || []).length > 0
                    );

                    return (
                      <div
                        key={workstation._id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm font-medium">
                          {workstation.stationName}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            isAssigned
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {isAssigned ? "Assigned" : "Available"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No workstations added
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {workplace.workstations?.length ?? 0} stations
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit(workplace._id!)}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmDeleteId(workplace._id!)}
                  className="p-1 text-red-600 hover:bg-red-100 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {!workplaces.length && !loading && (
          <div className="col-span-full text-center py-10 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No workplaces yet</p>
          </div>
        )}
      </div>
      <ValidationModal
        open={!!confirmDeleteId}
        title="Confirm Delete"
        message="Are you sure you want to delete this workplace? This action cannot be undone."
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />
      <SuccessModal
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />

      <ErrorModal message={errorMessage} onClose={() => setErrorMessage("")} />
    </div>
  );
}
