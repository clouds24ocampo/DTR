/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/Department.tsx
import { Building2, Check, Search, Users, UserSquare2, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DepartmentStats from "../../components/workforce/department/DepartmentStats";
import { useDepartmentStore } from "../../stores/workforce/department/department.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import {
  normalizeDepartments,
  UserLite,
} from "../../utils/department/helpers.utils";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import Chatbot from "../../components/common/ChatBot";
import DepartmentCards from "../../components/workforce/department/DepartmentCards";
import DepartmentDetailsModal from "../../components/workforce/department/DepartmentDetailsModal";
import { DepartmentDoc } from "../../types/workforce/department/department.type";

export default function Department() {
  const {
    departments,
    fetchAllDepartments,
    fetchAllLoading,
    fetchOneLoading,
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
    const m = new Map<string, UserLite>();
    activeUsers.forEach((u) => u?._id && m.set(String(u._id), u));
    return m;
  }, [activeUsers]);

  const totalDepartments = safeDepartments.length;
  const withHeadCount = useMemo(
    () => safeDepartments.filter((d) => !!d.head).length,
    [safeDepartments]
  );
  const totalMembers = useMemo(
    () =>
      safeDepartments.reduce(
        (sum, d) =>
          sum + (d.members?.filter((id) => userById.has(id)).length ?? 0),
        0
      ),
    [safeDepartments, userById]
  );
  const activeCount = useMemo(
    () =>
      fullDepartments.filter?.((d) => d.status)?.length ??
      safeDepartments.length,
    [fullDepartments, safeDepartments.length]
  );

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

  const [query, setQuery] = useState("");
  const [filterHasHead, setFilterHasHead] = useState<
    "all" | "with" | "without"
  >("all");
  const [showDetails, setShowDetails] = useState(false);
  const [targetDep, setTargetDep] = useState<DepartmentDoc | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fullDepartments
      .filter((d) => {
        const headId = d.head ? String(d.head) : null;
        if (filterHasHead === "with" && !headId) return false;
        if (filterHasHead === "without" && headId) return false;
        if (!q) return true;

        const head = headId ? userById.get(headId) : null;
        const headName = head
          ? [head.firstName, head.lastName].filter(Boolean).join(" ")
          : "";
        const memberStrings = (Array.isArray(d.members) ? d.members : [])
          .map((id) => {
            const u = userById.get(String(id));
            return [u?.firstName, u?.lastName, u?.position ?? ""]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
          })
          .join(" ");

        return (
          (d.name ?? "").toLowerCase().includes(q) ||
          headName.toLowerCase().includes(q) ||
          memberStrings.includes(q)
        );
      })
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [fullDepartments, query, filterHasHead, userById]);

  const loading = fetchAllLoading || fetchOneLoading;

  const openDetails = (dep: DepartmentDoc) => {
    setTargetDep(dep);
    setShowDetails(true);
  };

  return (
    <motion.div
      className="w-full space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-200">
            Departments
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            View and explore organizational departments
          </p>
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div variants={itemVariants}>
        <DepartmentStats stats={stats} />
      </motion.div>

      {/* Toolbar (search + filter) */}
      <motion.div
        className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"
        variants={itemVariants}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all box-border"
            placeholder="Search departments, heads, or members…"
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
          <button onClick={clearError} className="text-red-700 hover:underline font-medium focus:outline-none">
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Grid */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <SkeletonGrid />
        ) : filtered.length > 0 ? (
          <DepartmentCards
            departments={filtered}
            userById={userById}
            onView={openDetails}
            // Non-management view may not need these, but component requires them
            onEdit={() => { }}
            onDelete={async () => { }}
            onSetHead={() => { }}
            onMembers={() => { }}
            readonly // Let's assume we can add a readonly prop or just hide buttons via CSS/props if needed
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

      {showDetails && (
        <DepartmentDetailsModal
          onClose={() => setShowDetails(false)}
          department={targetDep}
          userById={userById}
        />
      )}

      <Chatbot />
    </motion.div>
  );
}

/* ——— skeletons ——— */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-200 bg-white p-6 animate-pulse"
        >
          <div className="h-6 w-40 rounded-lg bg-gray-200 mb-3" />
          <div className="h-4 w-24 rounded-lg bg-gray-200 mb-6" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded-lg bg-gray-100" />
            <div className="h-4 w-2/3 rounded-lg bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
