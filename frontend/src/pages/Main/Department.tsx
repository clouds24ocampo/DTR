/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/Department.tsx
import { Building2, Check, Search, Users, UserSquare2, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import StatCard from "../../components/ui/StatCard";
import PageHeader from "../../components/ui/PageHeader";
import SearchToolbar from "../../components/ui/SearchToolbar";
import ErrorBanner from "../../components/ui/ErrorBanner";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonGrid from "../../components/ui/SkeletonGrid";
import { useDepartmentStore } from "../../stores/workforce/department/department.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import useAuthStore from "../../stores/auth/auth.store";
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

  const { user } = useUserStore();
  const { account } = useAuthStore();
  const myId = String(user?._id ?? account?._id ?? "");

  // Employees see their own department(s); org-wide editing lives under Management.
  const { list: fullDepartments, safe: safeDepartments } = useMemo(() => {
    const all = normalizeDepartments(departments);
    const mine = (d: { head?: unknown; members?: unknown[] }) =>
      String(d.head ?? "") === myId || (d.members ?? []).some((m) => String(m) === myId);
    return { list: all.list.filter(mine), safe: all.safe.filter(mine) };
  }, [departments, myId]);

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
      title: "My departments",
      value: totalDepartments,
      subtitle: "You belong to",
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
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={Building2}
          eyebrow="Organization"
          title="My Department"
          subtitle="Your team, its head and the people you work with"
        />
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

      {/* Toolbar (search + filter) */}
      <motion.div variants={itemVariants}>
        <SearchToolbar
          value={query}
          onChange={setQuery}
          placeholder="Search departments, heads, or members…"
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

      {/* Error banner */}
      <motion.div variants={itemVariants}>
        <ErrorBanner message={error} onDismiss={clearError} />
      </motion.div>

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
