/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AssignUserModal from "../../../components/workforce/workplace/AssignUserModal";
import StationAssignmentsModal from "../../../components/workforce/workplace/StationAssignmentsModal";
import WorkplaceFormModal from "../../../components/workforce/workplace/WorkplaceFormModal";
import WorkplacesTab from "../../../components/workforce/workplace/WorkplacesTab";
import WorkplaceStats from "../../../components/workforce/workplace/WorkplaceStats";
import WorkstationsAssignmentsTab from "../../../components/workforce/workplace/WorkstationsAssignmentsTab";
import { useDepartmentStore } from "../../../stores/workforce/department/department.store";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import { useWorkplaceStore } from "../../../stores/workforce/workplace/workplace.store";
import { getLocalYYYYMMDD } from "../../../utils/global/timeDateFormat";
import { useWorkplaceHelpers } from "../../../utils/workplace/useWorkplaceHelpers";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import Chatbot from "../../../components/common/ChatBot";

type UserLite = {
  _id?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  position?: string;
  archived?: boolean;
};

export default function WorkplaceManagement() {
  const {
    workplaces,
    fetchAllWorkplaces,
    createWorkplace,
    updateWorkplace,
    deleteWorkplace,
    deleteWorkstation,
    assignToWorkstation,
    unassignUser,
    fetchWorkplacesLoading,
  } = useWorkplaceStore();

  const [refreshingWorkplaces, setRefreshingWorkplaces] = useState(false);
  const handleRefreshWorkplaces = async () => {
    setRefreshingWorkplaces(true);
    try {
      await fetchAllWorkplaces();
    } finally {
      setRefreshingWorkplaces(false);
    }
  };

  const { otherUsers, fetchOtherUsers } = useUserStore();
  const activeUsers = (otherUsers as UserLite[])?.filter((u) => !u.archived) ?? [];
  const { departments: deptState, fetchAllDepartments } = useDepartmentStore();

  const [activeTab, setActiveTab] = useState<"workplaces" | "workstations">(
    "workplaces"
  );
  const [showWorkplaceForm, setShowWorkplaceForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [editingWorkplace, setEditingWorkplace] = useState<string | null>(null);
  const [__, setEditingWorkstation] = useState<{
    workplaceId: string;
    workstationId: string;
  } | null>(null);
  const [selectedWorkplace, setSelectedWorkplace] = useState<string>("");
  const [selectedWorkstation, setSelectedWorkstation] = useState<{
    workplaceId: string;
    workstationId: string;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState(getLocalYYYYMMDD());
  const [isOpen, setIsOpen] = useState(false);
  const [showStationAssignmentsModal, setShowStationAssignmentsModal] = useState(false);
  const [selectedStationForModal, setSelectedStationForModal] = useState<{
    workplaceId: string;
    workstationId: string;
  } | null>(null);

  const {
    safeWorkplaces,
    safeDepartments,
    editingWorkplaceEntity,
    getEmployeeName,
    getEmployeePosition,
    getEmployeeIdNumber,
    getEmployeeProfilePicture,
    totalWorkstations,
    assignedWorkstations,
    availableWorkstations,
    selectedStationName,
    handleWorkplaceSubmit,
    handleAssignSubmit,
    handleUnassign,
    handleCopyAssignmentsToDate,
    getAssignedUserIdsForDate,
    isStationAssignedOnDate,
    getStationAssignmentsOnDate,
  } = useWorkplaceHelpers({

    workplaces,
    otherUsers: activeUsers,
    deptState,
    editingWorkplace,
    selectedDate,
    setSelectedDate,
    selectedWorkstation,
    setEditingWorkplace,
    setSelectedWorkstation,
    setShowWorkplaceForm,
    setShowAssignForm,
    createWorkplace,
    updateWorkplace,
    assignToWorkstation,
    unassignUser,
    fetchAllWorkplaces,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchAllDepartments(),
          fetchAllWorkplaces(),
          fetchOtherUsers(),
        ]);
      } catch (error) {
        console.error("Error loading workplace data:", error);
      }
    };
    loadData();
  }, []);

  const isInitialMount = useRef(true);
  // Refetch workplaces when selected date changes so new/auto-created schedules reflect
  useEffect(() => {
    if (!selectedDate) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchAllWorkplaces().catch((error) => {
      console.error("Error refreshing workplaces for date:", error);
    });
  }, [selectedDate]);

  // When on Workstations tab, refetch workplaces on window focus so automatic scheduling updates (dates + assigned users) are visible
  useEffect(() => {
    if (activeTab !== "workstations") return;
    const onFocus = () => {
      fetchAllWorkplaces().catch((error) => {
        console.error("Error refreshing workplaces on focus:", error);
      });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [activeTab, fetchAllWorkplaces]);

  // Debug: Log workplaces and workstations data (remove in production)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Workplaces data:", safeWorkplaces);
      console.log("Total workstations:", totalWorkstations);
      safeWorkplaces.forEach((wp, idx) => {
        console.log(`Workplace ${idx + 1} (${wp.name}):`, {
          id: wp._id,
          workstationCount: wp.workstationCount,
          workstationsArrayLength: wp.workstations?.length ?? 0,
          workstations: wp.workstations,
        });
      });
    }
  }, [safeWorkplaces, totalWorkstations]);

  // Get workplace and workstation for the modal
  const modalWorkplace = selectedStationForModal
    ? safeWorkplaces.find((w) => w._id === selectedStationForModal.workplaceId)
    : null;
  const modalWorkstation = modalWorkplace?.workstations?.find(
    (ws) => ws._id === selectedStationForModal?.workstationId
  ) || null;

  return (
    <motion.div
      className="w-full space-y-4 sm:space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
            Workplace Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage workplaces, workstations, and user assignments
          </p>
        </div>

        {/* Desktop Button */}
        <button
          onClick={() => setShowWorkplaceForm(true)}
          className="hidden md:flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Workplace</span>
        </button>

        {/* Mobile Floating Button */}
        <button
          onClick={() => {
            setShowWorkplaceForm(true);
            setIsOpen((prev) => !prev);
          }}
          className={`fixed bottom-6 right-6 flex items-center justify-center w-12 h-12 rounded-full shadow-md bg-blue-600 text-white transition-transform duration-300 hover:bg-blue-700 sm:hidden ${isOpen ? "rotate-45" : "rotate-0"
            }`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants}>
        <WorkplaceStats
          totalWorkplaces={safeWorkplaces.length}
          totalWorkstations={totalWorkstations}
          assignedWorkstations={assignedWorkstations}
          availableWorkstations={availableWorkstations}
        />
      </motion.div>

      {/* Tabs Container */}
      <motion.div
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-0"
        variants={itemVariants}
      >
        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("workplaces")}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === "workplaces"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Workplaces
            </button>
            <button
              onClick={() => setActiveTab("workstations")}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === "workstations"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Workstations &amp; Assignments
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <motion.div className="p-4 sm:p-6 flex-1 overflow-y-auto min-h-0" variants={itemVariants}>
          {activeTab === "workplaces" ? (
            <WorkplacesTab
              workplaces={safeWorkplaces}
              loading={fetchWorkplacesLoading}
              onEdit={(id) => {
                setEditingWorkplace(id);
                setShowWorkplaceForm(true);
              }}
              onDelete={deleteWorkplace}
            />
          ) : (
            <WorkstationsAssignmentsTab
              key={`workstations-${safeWorkplaces.length}-${selectedDate}-${selectedWorkplace}`}
              workplaces={safeWorkplaces}
              selectedWorkplaceId={selectedWorkplace}
              onSelectWorkplaceId={setSelectedWorkplace}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              getEmployeeName={getEmployeeName}
              getEmployeePosition={getEmployeePosition}
              getEmployeeIdNumber={getEmployeeIdNumber}
              getEmployeeProfilePicture={getEmployeeProfilePicture}
              onRefresh={handleRefreshWorkplaces}
              refreshLoading={refreshingWorkplaces}
              onAssignClick={(workplaceId, workstationId) => {
                if (process.env.NODE_ENV === "development") {
                  const workplace = safeWorkplaces.find((w) => w._id === workplaceId);
                  console.log("🟢 WorkplaceManagement - onAssignClick received:", {
                    workplaceId,
                    workplaceName: workplace?.name || "Unknown",
                    workstationId,
                    allWorkplaces: safeWorkplaces.map((w) => ({
                      id: w._id,
                      name: w.name,
                    })),
                  });
                }
                setSelectedWorkstation({ workplaceId, workstationId });
                setShowAssignForm(true);
              }}
              onEditWorkstationClick={(workplaceId, workstationId) => {
                setEditingWorkstation({ workplaceId, workstationId });
              }}
              onDeleteWorkstation={(workplaceId, workstationId) =>
                deleteWorkstation(workplaceId, workstationId)
              }
              onUnassign={handleUnassign}
              onCopyAssignmentsToDate={handleCopyAssignmentsToDate}
              onStationClick={(workplaceId, workstationId) => {
                setSelectedStationForModal({ workplaceId, workstationId });
                setShowStationAssignmentsModal(true);
              }}
            />
          )}
        </motion.div>
      </motion.div>

      {/* Workplace Form Modal */}
      <WorkplaceFormModal
        open={showWorkplaceForm}
        mode={editingWorkplace ? "edit" : "create"}
        initialName={editingWorkplaceEntity?.name ?? ""}
        initialWorkstationCount={editingWorkplaceEntity?.workstationCount ?? 0}
        initialStationNames={
          editingWorkplaceEntity?.workstations?.map((ws) => ws.stationName) ??
          []
        }
        resetKey={editingWorkplace ?? "create"}
        onClose={() => {
          setShowWorkplaceForm(false);
          setEditingWorkplace(null);
        }}
        onSubmit={handleWorkplaceSubmit}
      />

      {/* Assign User Modal - morning shift: start 5:00 AM, breaks 7:00 & 9:00 (15 min), lunch 11:00–12:00, end 2:00 PM */}
      <AssignUserModal
        key={
          showAssignForm && selectedWorkstation
            ? `${selectedWorkstation.workplaceId}-${selectedWorkstation.workstationId}`
            : "assign"
        }
        open={showAssignForm && !!selectedWorkstation}
        employees={activeUsers}
        departments={safeDepartments}
        defaultDate={selectedDate}
        defaultStationName={selectedStationName}
        lockStationName
        defaultStartTime="05:00"
        defaultEndTime="14:00"
        defaultMealTime="11:00"
        defaultLabel="Morning shift"
        getAssignedUserIdsForDate={getAssignedUserIdsForDate}
        isStationAssignedOnDate={isStationAssignedOnDate}
        getStationAssignmentsOnDate={getStationAssignmentsOnDate}
        selectedWorkplaceId={selectedWorkstation?.workplaceId}
        onClose={() => {
          setShowAssignForm(false);
          setSelectedWorkstation(null);
        }}
        onSubmit={handleAssignSubmit}
      />

      {/* Station Assignments Modal */}
      <StationAssignmentsModal
        open={showStationAssignmentsModal && !!selectedStationForModal}
        workplace={modalWorkplace || null}
        workstation={modalWorkstation}
        initialDate={selectedDate}
        getEmployeeName={getEmployeeName}
        getEmployeePosition={getEmployeePosition}
        getEmployeeProfilePicture={getEmployeeProfilePicture}
        onUnassign={handleUnassign}
        onClose={() => {
          setShowStationAssignmentsModal(false);
          setSelectedStationForModal(null);
        }}
      />
      <Chatbot />
    </motion.div>
  );
}
