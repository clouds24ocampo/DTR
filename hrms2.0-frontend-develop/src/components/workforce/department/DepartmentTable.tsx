import { Edit3, Trash2, Users, UserSquare2 } from "lucide-react";
import { DepartmentDoc } from "../../../types/workforce/department/department.type";
import { UserLite, byId, displayUserName } from "../../../utils/department/helpers.utils";

type SafeDepartment = {
  _id: string;
  name: string;
  head: string | null;
  members: string[];
};

type Props = {
  safeDepartments: SafeDepartment[];
  fullDepartments: DepartmentDoc[];
  users: UserLite[];
  loading: boolean;
  onEdit: (id: string) => void;
  onOpenHead: (dep: DepartmentDoc) => void;
  onOpenMembers: (dep: DepartmentDoc) => void;
  onDelete: (id: string) => Promise<void>;
};

export default function DepartmentTable({
  safeDepartments,
  fullDepartments,
  users,
  loading,
  onEdit,
  onOpenHead,
  onOpenMembers,
  onDelete,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="font-medium text-gray-900">Departments</div>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Head
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Members
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {safeDepartments.map((d) => {
              const full = fullDepartments.find((x) => x._id === d._id);
              const headUser = byId(users, d.head ?? undefined);
              return (
                <tr key={d._id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-900">
                    <div className="font-medium">{full?.name ?? d.name}</div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">
                    {full?.type ?? ""}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">
                    {displayUserName(headUser)}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">
                    {d.members?.length ?? 0}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                        full?.status ?? true
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {full?.status ?? true ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(d._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span className="text-xs">Edit</span>
                      </button>
                      {full && (
                        <>
                          <button
                            onClick={() => onOpenHead(full)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50"
                            title="Set Head"
                          >
                            <UserSquare2 className="w-4 h-4" />
                            <span className="text-xs">Head</span>
                          </button>
                          <button
                            onClick={() => onOpenMembers(full)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50"
                            title="Members"
                          >
                            <Users className="w-4 h-4" />
                            <span className="text-xs">Members</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onDelete(d._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {safeDepartments.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  No departments yet. Create the first one!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
