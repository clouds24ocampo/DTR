/* eslint-disable react-hooks/exhaustive-deps */
import {
  Building2,
  Check,
  Filter,
  Plus,
  Search,
  Users,
  UserSquare2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import SetHeadModal from "../../../components/global/SetHeadModal";
import { ValidationModal } from "../../../components/global/ValidationModal";
import DepartmentCards from "../../../components/workforce/department/DepartmentCards";
import DepartmentFormModal from "../../../components/workforce/department/DepartmentFormModal";
import DepartmentStats from "../../../components/workforce/department/DepartmentStats";
import MembersModal from "../../../components/workforce/department/MembersModal";
import DepartmentDetailsModal from "../../../components/workforce/department/DepartmentDetailsModal";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import { useDepartmentStore } from "../../../stores/workforce/department/department.store";
import {
  DepartmentDoc,
  CreateDepartmentBodyInput,
  UpdateDepartmentBodyInput,
} from "../../../types/workforce/department/department.type";
import {
  UserLite,
  normalizeDepartments,
} from "../../../utils/department/helpers.utils";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import Chatbot from "../../../components/common/ChatBot";

export default function DepartmentManagement() {
  const {
    departments,
    fetchAllDepartments,
    fetchAllLoading,
    fetchOneLoading,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    setDepartmentHead,
    error,
    clearError,
  } = useDepartmentStore();

  const { otherUsers, fetchOtherUsers } = useUserStore();
  const users = (otherUsers as UserLite[]) ?? [];

  // Filter out inactive or unknown users
  const activeUsers = useMemo(() => {
    return users.filter((u) => {
      if (!u) return false;
      const isArchived = u.archived === true;
      const isInactive = u.status === "inactive" || u.status === false;
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
      const isUnknown = !name && !u.username && !u.email;
      return !isArchived && !isInactive && !isUnknown;
    });
  }, [users]);

  useEffect(() => {
    fetchAllDepartments();
    fetchOtherUsers();
  }, []);

  const { list: fullDepartments, safe: safeDepartments } = useMemo(
    () => normalizeDepartments(departments),
    [departments]
  );

  const userById = useMemo(() => {
    const map = new Map<string, UserLite>();
    activeUsers.forEach((u) => u?._id && map.set(String(u._id), u));
    return map;
  }, [activeUsers]);

  // Stats
  const totalDepartments = safeDepartments.length;
  const withHeadCount = safeDepartments.filter((d) => !!d.head).length;
  const totalMembers = safeDepartments.reduce(
    (sum, d) => sum + (d.members?.length ?? 0),
    0
  );
  const activeCount =
    fullDepartments.filter?.((d) => d.status)?.length ?? safeDepartments.length;

  const stats = [
    {
      title: "Departments",
      value: totalDepartments,
      icon: Building2,
      color: "blue" as const,
    },
    {
      title: "With Head",
      value: withHeadCount,
      icon: UserSquare2,
      color: "green" as const,
    },
    {
      title: "Members",
      value: totalMembers,
      icon: Users,
      color: "purple" as const,
    },
    {
      title: "Active",
      value: activeCount,
      icon: Check,
      color: "yellow" as const,
    },
  ];

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showHead, setShowHead] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [targetDep, setTargetDep] = useState<DepartmentDoc | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const editingEntity = useMemo(
    () => fullDepartments.find((d) => d._id === editingId) || null,
    [editingId, fullDepartments]
  );

  const [query, setQuery] = useState("");
  const [filterHasHead, setFilterHasHead] = useState<
    "all" | "with" | "without"
  >("all");

  const openCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (id: string) => {
    setFormMode("edit");
    setEditingId(id);
    setShowForm(true);
  };

  const openSetHead = (dep: DepartmentDoc) => {
    setTargetDep(dep);
    setShowHead(true);
  };

  const openMembers = (dep: DepartmentDoc) => {
    setTargetDep(dep);
    setShowMembers(true);
  };

  const openDetails = (dep: DepartmentDoc) => {
    setTargetDep(dep);
    setShowDetails(true);
  };

  const handleCreateOrUpdate = async (
    payload: CreateDepartmentBodyInput | UpdateDepartmentBodyInput
  ) => {
    if (formMode === "create") {
      await createDepartment(payload as CreateDepartmentBodyInput);
    } else if (editingId) {
      await updateDepartment(editingId, payload as UpdateDepartmentBodyInput);
    }
    setShowForm(false);
  };

  const handleSetHead = async (headId: string | null) => {
    if (!targetDep) return;
    await setDepartmentHead(targetDep._id, headId);
    setShowHead(false);
  };

  const handleSaveMembers = async (nextMembers: string[]) => {
    if (!targetDep) return;
    await updateDepartment(targetDep._id, { members: nextMembers });
    setShowMembers(false);
  };

  const handleDelete = async (id: string): Promise<void> => {
    setDeleteId(id);
  };

  const loading = fetchAllLoading || fetchOneLoading;

  // Filtered list based on query and head filter
  const filteredDepartments = useMemo(() => {
    let result = fullDepartments;

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((d) => {
        const nameMatch = d.name?.toLowerCase().includes(q);
        const head = d.head ? userById.get(d.head) : null;
        const headMatch = head && (
          head.firstName?.toLowerCase().includes(q) ||
          head.lastName?.toLowerCase().includes(q) ||
          head.username?.toLowerCase().includes(q)
        );
        return nameMatch || headMatch;
      });
    }

    if (filterHasHead === "with") {
      result = result.filter((d) => !!d.head);
    } else if (filterHasHead === "without") {
      result = result.filter((d) => !d.head);
    }

    return result;
  }, [fullDepartments, query, filterHasHead, userById]);

  return (
    <motion.div
      className="w-full space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
            Department Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Organize workforce structures and manage department assignments
          </p>
        </div>

        <button
          onClick={openCreate}
          className="hidden md:flex items-center space-x-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>

        <button
          onClick={() => {
            openCreate();
            setIsOpen((prev) => !prev);
          }}
          className={`fixed bottom-6 right-6 flex items-center justify-center w-14 h-14 rounded-full shadow-lg bg-blue-600 text-white transition-transform duration-300 hover:bg-blue-700 sm:hidden z-50 ${isOpen ? "rotate-45" : "rotate-0"
            }`}
        >
          <Plus className="w-6 h-6" />
        </button>
      </motion.div>

      {/* Stats Section */}
      <motion.div variants={itemVariants}>
        <DepartmentStats stats={stats} />
      </motion.div>

      {/* Error banner */}
      {error && (
        <motion.div
          variants={itemVariants}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">Error:</span>
            <span>{error}</span>
          </div>
          <button onClick={clearError} className="text-red-700 hover:underline font-medium">
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Toolbar (search + filter) */}
      <motion.div
        className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"
        variants={itemVariants}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all box-border"
            placeholder="Search departments or heads…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              id="head-filter"
              value={filterHasHead}
              onChange={(e) =>
                setFilterHasHead(e.target.value as typeof filterHasHead)
              }
              className="text-sm outline-none bg-transparent cursor-pointer font-medium text-gray-700"
            >
              <option value="all">All Heads</option>
              <option value="with">With Head</option>
              <option value="without">Without Head</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Cards Grid */}
      <motion.div variants={itemVariants}>
        {filteredDepartments.length > 0 ? (
          <DepartmentCards
            departments={filteredDepartments}
            userById={userById}
            loading={loading}
            onEdit={openEdit}
            onDelete={handleDelete}
            onSetHead={openSetHead}
            onMembers={openMembers}
            onView={openDetails}
          />
        ) : (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No departments found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or filters to find what you're looking for.</p>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="mt-4 text-blue-600 font-medium hover:underline"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <DepartmentFormModal
        open={showForm}
        mode={formMode}
        initial={editingEntity ?? undefined}
        onSubmit={handleCreateOrUpdate}
        onClose={() => setShowForm(false)}
        submitting={false}
      />

      <SetHeadModal
        open={showHead}
        onClose={() => setShowHead(false)}
        users={activeUsers}
        currentHeadId={targetDep?.head ?? null}
        onSet={handleSetHead}
        submitting={false}
        departments={safeDepartments}
        departmentId={targetDep?._id ?? ""}
      />

      <MembersModal
        open={showMembers}
        onClose={() => setShowMembers(false)}
        users={activeUsers}
        memberIds={targetDep?.members ?? []}
        onSave={handleSaveMembers}
        submitting={false}
        departments={safeDepartments}
        departmentId={targetDep?._id ?? ""}
      />

      {showDetails && (
        <DepartmentDetailsModal
          onClose={() => setShowDetails(false)}
          department={targetDep}
          userById={userById}
        />
      )}

      <ValidationModal
        open={!!deleteId}
        title="Confirm Delete"
        message="Are you sure you want to delete this department? This action cannot be undone."
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deleteDepartment(deleteId);
            setDeleteId(null);
          }
        }}
      />
      <Chatbot />
    </motion.div>
  );
}
