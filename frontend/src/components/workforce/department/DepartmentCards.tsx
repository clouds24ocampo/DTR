import { Edit2, Trash2, UserSquare, Users2 } from "lucide-react";
import { useState } from "react";
import UserHoverCard from "./UserHoverCard";
import { DepartmentDoc } from "../../../types/workforce/department/department.type";
import { UserLite } from "../../../utils/department/helpers.utils";
import { ErrorModal } from "../../global/ErrorModal";
import { SuccessModal } from "../../global/SuccessModal";
import { ValidationModal } from "../../global/ValidationModal";

interface Props {
  departments: DepartmentDoc[];
  userById: Map<string, UserLite>;
  loading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onSetHead: (dep: DepartmentDoc) => void;
  onMembers: (dep: DepartmentDoc) => void;
  onView: (dep: DepartmentDoc) => void;
  readonly?: boolean;
}

export default function DepartmentCards({
  departments,
  userById,
  loading,
  onEdit,
  onDelete,
  onSetHead,
  onMembers,
  onView,
  readonly,
}: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await onDelete(deleteId);
      setSuccessMessage("Department deleted successfully!");
    } catch {
      setErrorMessage("Failed to delete department. Please try again.");
    } finally {
      setDeleteId(null);
      setShowValidation(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((d) => {
          const head = d.head ? userById.get(d.head) : undefined;
          const headName = displayName(head) || "—";
          const members = d.members ?? [];
          const isActive = d.status;

          return (
            <div
              key={d._id}
              onClick={() => onView(d)}
              className="group relative cursor-pointer overflow-visible rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-blue-200 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {d.name ?? "Unnamed Department"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {members.filter(id => userById.has(id)).length} member{members.filter(id => userById.has(id)).length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {!readonly && (
                    <>
                      <ActionBtn
                        icon={<Edit2 className="w-4 h-4" />}
                        label="Edit"
                        onClick={() => onEdit(d._id)}
                      />
                      <ActionBtn
                        icon={<UserSquare className="w-4 h-4" />}
                        label="Set Head"
                        onClick={() => onSetHead(d)}
                      />
                      <ActionBtn
                        icon={<Users2 className="w-4 h-4" />}
                        label="Members"
                        onClick={() => onMembers(d)}
                      />
                      <ActionBtn
                        icon={<Trash2 className="w-4 h-4 text-red-600" />}
                        label="Delete"
                        danger
                        onClick={() => {
                          setDeleteId(d._id);
                          setShowValidation(true);
                        }}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${isActive
                    ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                    : "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20"
                    }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Department Head</p>
                <div
                  className="mt-2 flex items-center gap-3 relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AvatarWithHover user={head} name={headName} />
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">
                      {head ? headName : "No head assigned"}
                    </p>
                    {head && (
                      <p className="text-[11px] font-medium text-slate-500">{head.position || head.email || "Management"}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Members</p>
                {members.filter(id => userById.has(id)).length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400 italic">No active members</p>
                ) : (
                  <div className="mt-3 flex items-center">
                    <div className="flex -space-x-2 overflow-visible p-1">
                      {members.filter(id => userById.has(id)).slice(0, 8).map((id) => {
                        const u = userById.get(id);
                        if (!u) return null;
                        return (
                          <div
                            key={id}
                            className="relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AvatarWithHover user={u} size="small" />
                          </div>
                        );
                      })}
                      {members.filter(id => userById.has(id)).length > 8 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-[10px] font-bold text-slate-600 ring-2 ring-white shadow-sm z-0">
                          +{members.filter(id => userById.has(id)).length - 8}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ErrorModal message={errorMessage} onClose={() => setErrorMessage("")} />
      <SuccessModal
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />
      <ValidationModal
        open={showValidation}
        title="Confirm Delete"
        message="Are you sure you want to delete this department?"
        onCancel={() => setShowValidation(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function displayName(u?: UserLite) {
  if (!u) return "";
  const parts = [u.firstName, u.middleName, u.lastName].filter(Boolean);
  const full = parts.join(" ").trim();
  return full || (u?.username ?? u?.email ?? "");
}

function AvatarWithHover({ user, name, size = "medium" }: { user?: UserLite, name?: string, size?: "small" | "medium" }) {
  const [hovered, setHovered] = useState(false);
  const sizeClasses = size === "small" ? "h-8 w-8" : "h-10 w-10";
  const textClass = size === "small" ? "text-[10px]" : "text-xs";

  if (!user && !name) {
    return (
      <div className={`${sizeClasses} rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-200 flex items-center justify-center text-slate-400 ${textClass} font-bold`}>
        ?
      </div>
    )
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`${sizeClasses} rounded-full border-2 border-white shadow-sm overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white ${textClass} font-bold ring-0 group-hover:ring-2 ring-blue-100 transition-all`}>
        {user?.profilePicture ? (
          <img src={user.profilePicture} alt={name || displayName(user)} className="h-full w-full object-cover" />
        ) : (
          <span>{(user?.firstName?.[0] || user?.username?.[0] || name?.[0] || "?").toUpperCase()}</span>
        )}
      </div>
      {user && <UserHoverCard user={user} visible={hovered} />}
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2 rounded-lg ${danger ? "hover:bg-red-50" : "hover:bg-slate-100"
        }`}
    >
      {icon}
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg bg-white border border-slate-200 p-6 animate-pulse">
      <div className="h-5 w-32 rounded-lg bg-slate-200 mb-3" />
      <div className="h-4 w-20 rounded-lg bg-slate-200 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-6 w-full rounded-lg bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
