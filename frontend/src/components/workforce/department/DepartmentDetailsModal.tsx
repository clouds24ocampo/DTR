import { Building2, MapPin, Users, Calendar, Mail, Briefcase } from "lucide-react";
import { DepartmentDoc } from "../../../types/workforce/department/department.type";
import { UserLite, displayUserName } from "../../../utils/department/helpers.utils";
import ModalShell from "../../global/ModalShell";

interface Props {
    onClose: () => void;
    department: DepartmentDoc | null;
    userById: Map<string, UserLite>;
}

export default function DepartmentDetailsModal({ onClose, department, userById }: Props) {
    if (!department) return null;

    const head = department.head ? userById.get(department.head) : null;
    const members = (department.members ?? []).map(id => userById.get(id)).filter(Boolean) as UserLite[];
    const isActive = department.status;

    return (
        <ModalShell title="Department Details" onClose={onClose}>
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Header Info */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <Building2 className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{department.name}</h2>
                            <p className="text-sm text-gray-500">{department.type || "General"}</p>
                        </div>
                    </div>
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${isActive
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}
                    >
                        {isActive ? "Active" : "Inactive"}
                    </span>
                </div>

                {/* Description */}
                {department.description && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Description</h3>
                        <p className="text-gray-700 text-sm leading-relaxed">{department.description}</p>
                    </div>
                )}

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-gray-200 rounded-lg flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Total Members</p>
                            <p className="text-lg font-bold text-gray-900">{members.length}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white border border-gray-200 rounded-lg flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <MapPin className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Location</p>
                            <p className="text-lg font-bold text-gray-900">{department.location || "N/A"}</p>
                        </div>
                    </div>
                </div>

                {/* Department Head */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Department Head</h3>
                    {head ? (
                        <div className="flex items-center gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                            <div className="h-14 w-14 rounded-full border-2 border-white shadow-sm overflow-hidden bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                                {head.profilePicture ? (
                                    <img src={head.profilePicture} alt={displayUserName(head)} className="h-full w-full object-cover" />
                                ) : (
                                    <span>{(head.firstName?.[0] || head.username?.[0] || "?").toUpperCase()}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-lg font-bold text-gray-900">{displayUserName(head)}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <Briefcase className="w-3.5 h-3.5" />
                                        <span>{head.position || "Management"}</span>
                                    </div>
                                    {head.email && (
                                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                            <Mail className="w-3.5 h-3.5" />
                                            <span>{head.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-center">
                            <p className="text-sm text-gray-500">No head assigned to this department</p>
                        </div>
                    )}
                </div>

                {/* Members List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Members ({members.length})</h3>
                    </div>
                    {members.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {members.map((u) => (
                                <div key={u._id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                                    <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-bold border border-gray-200">
                                        {u.profilePicture ? (
                                            <img src={u.profilePicture} alt={displayUserName(u)} className="h-full w-full object-cover" />
                                        ) : (
                                            <span>{(u.firstName?.[0] || u.username?.[0] || "?").toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{displayUserName(u)}</p>
                                        <p className="text-[11px] text-gray-500 truncate">{u.position || "Member"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-center">
                            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No members found</p>
                        </div>
                    )}
                </div>

                {/* Metadata */}
                <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Created: {new Date(department.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Last Updated: {new Date(department.updatedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium self-end sm:self-auto"
                    >
                        Close
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}
