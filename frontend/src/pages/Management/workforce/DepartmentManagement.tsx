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
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import SearchToolbar from "../../../components/ui/SearchToolbar";
import ErrorBanner from "../../../components/ui/ErrorBanner";
import EmptyState from "../../../components/ui/EmptyState";
import SkeletonGrid from "../../../components/ui/SkeletonGrid";
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
      subtitle: "All departments created",
      icon: Building2,
      color: "blue" as const,
    },
    {
      title: "With Head",
      value: withHeadCount,
      subtitle: "Departments with assigned heads",
      icon: UserSquare2,
      color: "green" as const,
    },
    {
      title: "Members",
      value: totalMembers,
      subtitle: "Total registered members",
      icon: Users,
      color: "purple" as const,
    },
    {
      title: "Active",
      value: activeCount,
      subtitle: "Currently active departments",
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
      className="w-full space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={Building2}
          eyebrow="Workforce"
          title="Department Management"
          subtitle="Organize workforce structures and manage department assignments"
          actions={
            <button
              onClick={openCreate}
              className="hidden md:flex items-center space-x-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          }
        />

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
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </motion.div>

      {/* Error banner */}
      <motion.div variants={itemVariants}>
        <ErrorBanner message={error} onDismiss={clearError} />
      </motion.div>

      {/* Toolbar (search + filter) */}
      <motion.div variants={itemVariants}>
        <SearchToolbar
          value={query}
          onChange={setQuery}
          placeholder="Search departments or heads…"
        >
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
            <Filter className="h-4 w-4 text-slate-500" aria-hidden />
            <select
              id="head-filter"
              value={filterHasHead}
              onChange={(e) =>
                setFilterHasHead(e.target.value as typeof filterHasHead)
              }
              className="cursor-pointer bg-transparent text-sm font-medium text-slate-700 outline-none"
            >
              <option value="all">All Heads</option>
              <option value="with">With Head</option>
              <option value="without">Without Head</option>
            </select>
          </div>
        </SearchToolbar>
      </motion.div>

      {/* Cards Grid */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <SkeletonGrid />
        ) : filteredDepartments.length > 0 ? (
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
          <EmptyState
            icon={Search}
            title="No departments found"
            message="Try adjusting your search or filters to find what you're looking for."
            action={
              query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  Clear Search
                </button>
              ) : undefined
            }
          />
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
