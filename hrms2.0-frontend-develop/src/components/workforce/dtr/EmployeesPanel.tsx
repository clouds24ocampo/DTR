import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LS_EMP_OPEN = "dtrTracking:employeesOpen";

export interface EmployeeLite {
  _id: string;
  firstName?: string;
  lastName?: string;
  position?: string | string[];
  department?: string;
  idNumber?: string;
}

export interface DepartmentLite {
  _id: string;
  name: string;
  head: string | null;
  members: string[];
}

export default function EmployeesPanel({
  employees,
  selectedEmployee,
  onSelect,
  departments,
}: {
  employees: EmployeeLite[];
  selectedEmployee: string;
  onSelect: (id: string) => void;
  departments?: DepartmentLite[];
}) {
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [open, setOpen] = useState<boolean>(() => {
    // Check if mobile view (below lg breakpoint - 1024px)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

    try {
      const raw = localStorage.getItem(LS_EMP_OPEN);
      if (raw !== null) {
        // If localStorage exists, use it but respect mobile/desktop on initial load
        const savedValue = JSON.parse(raw);
        // On initial load, prioritize viewport size over saved preference
        return isMobile ? false : savedValue;
      }
      // Default to closed on mobile, open on desktop
      return !isMobile;
    } catch {
      return !isMobile;
    }
  });

  // Handle window resize to update state based on viewport
  useEffect(() => {
    const handleResize = () => {
      const isMobileNow = window.innerWidth < 1024;
      // Only auto-close on mobile if currently open, don't auto-open on desktop
      if (isMobileNow && open) {
        setOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_EMP_OPEN, JSON.stringify(open));
    } catch {
      // do nothing
    }
  }, [open]);

  const deptByUserId = useMemo(() => {
    const map = new Map<string, { name: string; role?: "Head" | "Member" }>();
    if (Array.isArray(departments)) {
      for (const d of departments) {
        if (d.head) map.set(String(d.head), { name: d.name, role: "Head" });
        for (const m of d.members ?? []) {
          const key = String(m);
          if (!map.has(key)) {
            map.set(key, { name: d.name, role: "Member" });
          }
        }
      }
    }
    return map;
  }, [departments]);

  const getDeptForEmp = (id: string) => {
    const fromMap = deptByUserId.get(id);
    return fromMap ?? null;
  };

  const isMobile = () => {
    return typeof window !== 'undefined' && window.innerWidth < 1024;
  };

  const handleEmployeeSelect = (id: string) => {
    onSelect(id);
    // Close panel on mobile after selection
    if (isMobile()) {
      setOpen(false);
    }
  };

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) {
      return employees;
    }

    const query = searchQuery.toLowerCase().trim();
    return employees.filter((emp) => {
      // Search by idNumber
      const idNumber = (emp.idNumber || "").toLowerCase();
      if (idNumber.includes(query)) return true;

      // Search by firstName
      const firstName = (emp.firstName || "").toLowerCase();
      if (firstName.includes(query)) return true;

      // Search by lastName
      const lastName = (emp.lastName || "").toLowerCase();
      if (lastName.includes(query)) return true;

      // Search by full name
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName.includes(query)) return true;

      // Search by position
      const posValue = Array.isArray(emp.position) ? emp.position[0] : emp.position;
      const position = (posValue || "").toLowerCase();
      if (position.includes(query)) return true;

      return false;
    });
  }, [employees, searchQuery]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 min-h-0 lg:max-h-[75dvh]">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 flex-shrink-0"
        aria-expanded={open}
        aria-controls="employees-panel"
        whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="font-semibold text-gray-900">Employees</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {open ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="employees-panel"
            className="px-4 pb-4 overflow-y-auto flex-1 min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Search Bar */}
            <div className="mb-3 sticky top-0 bg-white z-10 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by ID, name, or position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {filteredEmployees.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">
                {searchQuery ? "No employees found matching your search." : "No employees found."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredEmployees.map((emp, index) => {
                  const selected = selectedEmployee === String(emp._id);

                  const deptInfo = getDeptForEmp(String(emp._id));
                  const deptName = deptInfo?.name ?? emp.department ?? "—";
                  const deptRole = deptInfo?.role;

                  return (
                    <motion.button
                      key={emp._id}
                      onClick={() => handleEmployeeSelect(String(emp._id))}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${selected
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50 border border-transparent"
                        }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="font-medium text-gray-900">
                        {emp.firstName} {emp.lastName}
                      </div>

                      <div className="text-sm text-gray-600">
                        {emp.position || "—"}
                      </div>

                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs text-gray-500">{deptName}</span>
                        {deptRole ? (
                          <span className="text-[10px] inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {deptRole}
                          </span>
                        ) : null}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
