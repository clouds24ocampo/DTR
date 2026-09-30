/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  archiveEmployee,
  unarchiveEmployee,
  deleteEmployee,
} from "../../../api/hr/employee.api";
import { registerDevice as registerDeviceApi } from "../../../api/workplace/device/device.api";
import {
  ChevronDown,
  Filter,
  Mail,
  Phone,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { AddEmployeeModal } from "../../../components/global/modals/AddEmployeeModal";
import { useFetchData } from "../../../hooks/useFetchData";
import { DataTable } from "../../../components/common/DataTable";
import { formatDate } from "../../../utils/global/dateFormatter";
import { ActionsDropdownForEmployee } from "../../../components/hr/applicant/ActionsDropdownForEmployee";
import { EditEmployeeModal } from "../../../components/global/modals/EditEmployeeModal";
import toast, { Toaster } from "react-hot-toast";
import EmployeeModal from "../../../components/global/modals/EmployeeModal";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import Chatbot from "../../../components/common/ChatBot";
import { useAppStore } from "../../../stores/hr/admin/app.store";
import PageHeader from "../../../components/ui/PageHeader";
import SearchToolbar from "../../../components/ui/SearchToolbar";
import EmptyState from "../../../components/ui/EmptyState";

interface FilterState {
  status: string;
  category: string;
  position: string;
  search: string;
}

export default function EmployeeManagement() {
  const { filteredEmployee, refetchAll, loading: fetchLoading } = useFetchData();
  const setEmployees = useAppStore((state) => state.setEmployees);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpenEdit, setIsModalOpenEdit] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    category: "all",
    position: "all",
    search: "",
  });

  // Get unique positions from filteredEmployee
  const uniquePositions = useMemo(() => {
    const allPositions = filteredEmployee.flatMap((emp) =>
      Array.isArray(emp.position) ? emp.position : [emp.position]
    );
    return [...new Set(allPositions.filter(Boolean))].sort();
  }, [filteredEmployee]);

  // Apply filters to employees
  const filteredEmployees = useMemo(() => {
    let result = [...filteredEmployee];

    // Search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      result = result.filter((employee) => {
        const firstName = (employee.firstName || "").toLowerCase();
        const lastName = (employee.lastName || "").toLowerCase();
        const middleName = (employee.middleName || "").toLowerCase();
        const fullName = `${firstName} ${middleName} ${lastName}`.trim();
        const email = (employee.email || "").toLowerCase();
        const phone = ((employee as any).phone || (employee as any).phoneNumber || "").toLowerCase();
        const idNumber = (employee.idNumber || "").toLowerCase();

        // Handle position as array or string
        const employeePosition = employee.position;
        const positionMatch = Array.isArray(employeePosition)
          ? employeePosition.some(p => p.toLowerCase().includes(searchLower))
          : (employeePosition || "").toLowerCase().includes(searchLower);

        return (
          fullName.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower) ||
          idNumber.includes(searchLower) ||
          positionMatch
        );
      });
    }

    // Position filter
    if (filters.position !== "all") {
      result = result.filter((employee) => {
        const employeePosition = employee.position;
        if (Array.isArray(employeePosition)) {
          return employeePosition.includes(filters.position);
        }
        return employeePosition === filters.position;
      });
    }

    // Status filter
    if (filters.status !== "all") {
      result = result.filter((employee) => {
        const isActive = !employee.archived;
        if (filters.status === "active") return isActive;
        if (filters.status === "inactive") return !isActive;
        return true;
      });
    }

    // Category filter (can be expanded when category field is added)
    if (filters.category !== "all") {
      // For now, mapping category to workInfo or position if applicable
      result = result.filter((employee) => {
        const categoryValue = filters.category.toLowerCase();
        const categoryLabel = filters.category.replace("-", " ").toLowerCase();

        // Check in workInfo
        const workInfo = (employee.workInfo || "").toLowerCase();
        if (workInfo.includes(categoryValue) || workInfo.includes(categoryLabel))
          return true;

        // Check in position
        const employeePosition = employee.position;
        if (Array.isArray(employeePosition)) {
          return employeePosition.some((p) => {
            const pl = p.toLowerCase();
            return pl.includes(categoryValue) || pl.includes(categoryLabel);
          });
        }
        const pl = (employeePosition || "").toLowerCase();
        return pl.includes(categoryValue) || pl.includes(categoryLabel);
      });
    }

    return result;
  }, [filteredEmployee, filters]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const openModal = (row: any) => {
    setIsModalOpenEdit(true);
    setSelectedRow(row);
    console.log(row);
  };

  const handleRowClick = (employee: any) => {
    setSelectedEmployee(employee);
    setIsViewModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpenEdit(false);
    setIsModalOpen(false);
    if (isModalOpenEdit) {
      refetchAll();
    }
  };

  const handleToggleStatus = async (employee: any) => {
    const isArchived = employee.archived;
    const action = isArchived ? unarchiveEmployee : archiveEmployee;
    const actionText = isArchived ? "activated" : "deactivated";

    // Optimistic Update
    const previousEmployees = [...filteredEmployee];
    const updatedEmployees = filteredEmployee.map((emp) =>
      emp._id === employee._id ? { ...emp, archived: !isArchived } : emp
    );
    setEmployees(updatedEmployees);

    try {
      const success = await action(employee._id);
      if (success) {
        toast.success(`Employee ${actionText} successfully`);
        refetchAll();
      } else {
        // Revert on failure
        setEmployees(previousEmployees);
        toast.error(`Failed to ${isArchived ? "activate" : "deactivate"} employee`);
      }
    } catch (error) {
      // Revert on error
      setEmployees(previousEmployees);
      console.error("Error toggling employee status:", error);
      toast.error("An error occurred while updating status");
    }
  };

  const executeDelete = async (employeeId: string) => {
    // Optimistic Update
    const previousEmployees = [...filteredEmployee];
    const updatedEmployees = filteredEmployee.filter((emp) => emp._id !== employeeId);
    setEmployees(updatedEmployees);

    try {
      const success = await deleteEmployee(employeeId);
      if (success) {
        toast.success("Employee removed successfully");
        refetchAll();
      } else {
        // Revert on failure
        setEmployees(previousEmployees);
        toast.error("Failed to remove employee");
      }
    } catch (error) {
      // Revert on error
      setEmployees(previousEmployees);
      console.error("Error removing employee:", error);
      toast.error("An error occurred while removing employee");
    }
  };

  const handleRegisterDevice = async (employee: any) => {
    try {
      const response = await registerDeviceApi(employee._id);
      if (response && response.token) {
        // Store in cookie for device browser
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1); // 1 year
        document.cookie = `device_token=${response.token}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;

        // Also store in localStorage
        localStorage.setItem("device_token", response.token);

        toast.success(`Successfully registered this device for ${employee.firstName}`);
      } else {
        toast.error("Failed to register device");
      }
    } catch (error) {
      console.error("Error registering device:", error);
      toast.error("An error occurred while registering device");
    }
  };

  const handleRemoveEmployee = (employee: any) => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-full">
            <X className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Remove Employee?</p>
            <p className="text-sm text-slate-600 mt-1">
              Are you sure you want to remove <strong>{employee.firstName} {employee.lastName}</strong>? This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              await executeDelete(employee._id);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
          >
            Remove
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
      position: 'top-center',
      style: {
        minWidth: '400px',
        borderRadius: '16px',
        padding: '16px',
        border: '1px solid #fee2e2'
      }
    });
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      status: "all",
      category: "all",
      position: "all",
      search: "",
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === "search") return value.trim() !== "";
    return value !== "all";
  });

  const columns = [
    {
      key: "id",
      header: "Employee ID",
      render: (_value: any, row: any) => (
        <div className="font-mono text-sm font-medium text-slate-900">
          {row.idNumber}
        </div>
      ),
    },
    {
      key: "name",
      header: "Employee Details",
      render: (_value: string, row: any) => {
        const firstName = row.firstName || "";
        const lastName = row.lastName || "";
        const initials = (
          (firstName[0] || "") + (lastName[0] || "")
        ).toUpperCase();

        return (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
              {row.profilePicture ? (
                <img
                  src={row.profilePicture}
                  alt={`${firstName} ${lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {initials}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 truncate">
                {[firstName, row.middleName, lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>
              <p className="text-sm text-slate-500 truncate">
                {Array.isArray(row.position)
                  ? row.position.join(", ")
                  : row.position || "Position not specified"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "contact",
      header: "Contact Information",
      render: (_value: any, row: any) => {
        const hasEmail = !!row.email;
        const phoneNumber = row.phone || row.phoneNumber;
        const hasPhone = !!phoneNumber;
        return (
          <div className="space-y-1.5 min-w-[200px]">
            {hasEmail && (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-900 truncate max-w-[200px]">
                  {row.email}
                </span>
              </div>
            )}
            {hasPhone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-900 truncate">
                  {phoneNumber}
                </span>
              </div>
            )}
            {!hasEmail && !hasPhone && (
              <span className="text-sm text-slate-400 italic">
                No contact information
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "work",
      header: "Work Information",
      render: (_value: any, row: any) => (
        <div className="text-sm text-slate-900 max-w-[200px] truncate" title={row.workInfo || "—"}>
          {row.workInfo || "—"}
        </div>
      ),
    },
    {
      key: "date",
      header: "Hire Date",
      render: (_value: any, row: any) => (
        <div className="text-sm text-slate-900">{formatDate(row.createdAt)}</div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_value: any, row: any) => {
        const isActive = !row.archived;
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
              }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (_value: any, row: any) => (
        <div
          className="flex items-center justify-center z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <ActionsDropdownForEmployee
            row={row}
            onEdit={() => openModal(row)}
            onToggleStatus={() => handleToggleStatus(row)}
            onRemove={() => handleRemoveEmployee(row)}
            onRegisterDevice={() => handleRegisterDevice(row)}
            isActive={!row.archived}
          />
        </div>
      ),
    },
  ];

  return (
    <motion.div
      className="space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Toaster />

      {/* Header Section */}
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={Users}
          tint="blue"
          eyebrow="Workforce"
          title="Employee Management"
          subtitle="Manage employee information and roles"
          actions={
            <button
              onClick={handleOpenModal}
              className="hidden md:flex items-center justify-center w-full sm:w-auto space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          }
        />

        <button
          onClick={() => {
            handleOpenModal();
            setIsOpen((prev: boolean) => !prev);
          }}
          className={`fixed bottom-6 right-6 flex items-center justify-center w-12 h-12 rounded-full shadow-md bg-blue-600 text-white transition-transform duration-300 hover:bg-blue-700 sm:hidden ${isOpen ? "rotate-45" : "rotate-0"
            }`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Toolbar (search + filters) */}
      <motion.div variants={itemVariants}>
        <SearchToolbar
          value={filters.search}
          onChange={(value) => handleFilterChange("search", value)}
          placeholder="Search employees..."
        >
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
            <Filter className="h-4 w-4 text-slate-500" aria-hidden />
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="cursor-pointer bg-transparent text-sm font-medium text-slate-700 outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center justify-center space-x-2 px-3 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors w-full sm:w-auto"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">More Filters</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showAdvancedFilters ? "rotate-180" : ""
                }`}
            />
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center justify-center space-x-1 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Clear all filters</span>
            </button>
          )}
        </SearchToolbar>
      </motion.div>

      {/* Filters + Table Section */}
      <motion.div
        className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] mt-5"
        variants={itemVariants}
      >
        <div className="pb-5 border-b border-slate-200/80">

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 mt-4 bg-slate-50 rounded-xl"
              variants={itemVariants}
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    handleFilterChange("category", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  <option value="all">All Categories</option>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Job Position
                </label>
                <select
                  value={filters.position}
                  onChange={(e) =>
                    handleFilterChange("position", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  <option value="all">All Positions</option>
                  {uniquePositions.map((position: string) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}

          {/* Info Row */}
          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-2"
            variants={itemVariants}
          >
            <div className="text-sm text-slate-600">
              {fetchLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading employees...</span>
                </div>
              ) : (
                <span>
                  Showing {filteredEmployees.length} of {filteredEmployee.length}{" "}
                  {filteredEmployees.length === 1 ? "employee" : "employees"}
                  {hasActiveFilters && " (filtered)"}
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <Filter className="w-4 h-4" />
                <span>Filters applied</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Data Table Section */}
        <motion.div variants={itemVariants}>
          <div className="overflow-x-auto">
            <div className="min-w-[800px] sm:min-w-full">
              <DataTable
                data={filteredEmployees}
                columns={columns}
                onRowClick={handleRowClick}
              />
            </div>
          </div>
        </motion.div>

        {/* Empty State */}
        {!fetchLoading && filteredEmployees.length === 0 && (
          <motion.div variants={itemVariants}>
            <EmptyState
              icon={Search}
              title={
                hasActiveFilters
                  ? "No employees match your filters"
                  : "No employees found"
              }
              message={
                hasActiveFilters
                  ? "Try adjusting your filters to see more results."
                  : filteredEmployee.length === 0
                    ? "Get started by adding your first employee."
                    : "No employees match the current criteria."
              }
              action={
                hasActiveFilters ? (
                  <button
                    onClick={clearAllFilters}
                    className="font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  >
                    Clear all filters
                  </button>
                ) : (
                  <button
                    onClick={handleOpenModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Add First Employee
                  </button>
                )
              }
            />
          </motion.div>
        )}
      </motion.div>

      {/* Modals */}
      <AddEmployeeModal isOpen={isModalOpen} onClose={handleCloseModal} />
      <EditEmployeeModal
        isOpen={isModalOpenEdit}
        onClose={handleCloseModal}
        row={selectedRow}
      />
      <EmployeeModal
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        employee={selectedEmployee}
      />
      <Chatbot />
    </motion.div>
  );
}
