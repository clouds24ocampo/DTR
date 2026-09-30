/* eslint-disable @typescript-eslint/no-explicit-any */
import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDepartmentStore } from "../../../stores/workforce/department/department.store";
import EmployeesPanel, {
  EmployeeLite,
} from "../../../components/workforce/dtr/EmployeesPanel";
import BreakdownEditModal from "../../../components/workforce/schedule/BreakdownEditModal";
import ScheduleDetails from "../../../components/workforce/schedule/ScheduleDetails";
import SessionEditModal from "../../../components/workforce/schedule/SessionEditModal";
import { useScheduleStore } from "../../../stores/global/schedule/schedule.store";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import { DepartmentDoc } from "../../../types/workforce/department/department.type";
import { ISession } from "../../../types/global/schedule/schedule.type";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import Chatbot from "../../../components/common/ChatBot";
import PageHeader from "../../../components/ui/PageHeader";

export default function ScheduleManagement() {
  const { user, otherUsers, fetchOtherUsers } = useUserStore();
  const {
    schedules,
    editSingleSession,
    fetchSchedulesFiltered,
    fetchFilteredLoading,
  } = useScheduleStore();

  const { departments, fetchAllDepartments } = useDepartmentStore();

  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [showSessionEdit, setShowSessionEdit] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<{
    scheduleId: string;
    session: ISession & { _id?: string };
  } | null>(null);

  const [showBreakdownEdit, setShowBreakdownEdit] = useState(false);
  const [breakdownToEdit, setBreakdownToEdit] = useState<{
    scheduleId: string;
    session: ISession & {
      _id?: string;
      fullSched?: {
        type: "work" | "break" | "meal";
        start: string;
        end: string;
      }[];
    };
    index: number;
  } | null>(null);

  useEffect(() => {
    fetchOtherUsers();
    fetchAllDepartments();
  }, [fetchOtherUsers, fetchAllDepartments]);

  const employeesToShow = useMemo(() => {
    const list = [...(otherUsers ?? [])].filter((u) => !u.archived);
    if (user && !list.some((u) => u._id === user._id)) list.unshift(user);
    return list;
  }, [user, otherUsers]);

  type DepartmentLite = {
    _id: string;
    name: string;
    head: string | null;
    members: string[];
  };
  const safeDepartments: DepartmentLite[] = useMemo(() => {
    const raw: any = departments as any;
    const list: DepartmentDoc[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.departments)
        ? raw.departments
        : Array.isArray(raw?.items)
          ? raw.items
          : [];
    return list.map((d) => ({
      _id: String(d._id),
      name: String(d.name),
      head: d.head ? String(d.head) : null,
      members: Array.isArray(d.members) ? d.members.map(String) : [],
    }));
  }, [departments]);

  const employeeLites = useMemo<EmployeeLite[]>(
    () =>
      (employeesToShow || []).map((e: any) => ({
        _id: e._id,
        firstName: e.firstName,
        lastName: e.lastName,
        position: e.position,
      })),
    [employeesToShow]
  );

  useEffect(() => {
    if (!selectedEmployee && employeesToShow.length > 0) {
      setSelectedEmployee(employeesToShow[0]._id);
    }
  }, [employeesToShow, selectedEmployee]);

  const selectedEmp = useMemo(
    () => employeesToShow.find((emp) => emp._id === selectedEmployee),
    [employeesToShow, selectedEmployee]
  );

  useEffect(() => {
    if (selectedEmployee && selectedDate) {
      fetchSchedulesFiltered({
        userId: selectedEmployee,
        date: selectedDate,
      }).catch((err) => console.error("Error fetching schedules:", err));
    }
  }, [selectedEmployee, selectedDate, fetchSchedulesFiltered]);

  const handleOpenBreakdownEdit = (
    scheduleId: string,
    session: ISession & { _id?: string },
    index: number
  ) => {
    setBreakdownToEdit({ scheduleId, session, index });
    setShowBreakdownEdit(true);
  };

  const handleSaveBreakdownPatch = async (patch: Partial<ISession>) => {
    if (!breakdownToEdit?.session?._id) return;
    await editSingleSession(
      breakdownToEdit.scheduleId,
      breakdownToEdit.session._id,
      patch,
      `Edited breakdown #${breakdownToEdit.index + 1} from Schedule UI`
    );
    setShowBreakdownEdit(false);
  };

  const handleOpenSessionEdit = (
    scheduleId: string,
    session: ISession & { _id?: string }
  ) => {
    setSessionToEdit({ scheduleId, session });
    setShowSessionEdit(true);
  };

  const handleSaveSingleSession = async (patch: Partial<ISession>) => {
    if (!sessionToEdit?.session?._id) return;
    await editSingleSession(
      sessionToEdit.scheduleId,
      sessionToEdit.session._id,
      patch,
      "Edited from Schedule UI"
    );
    setShowSessionEdit(false);
  };

  return (
    <motion.div
      className="w-full space-y-4 sm:space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page header */}
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={CalendarDays}
          eyebrow="Workforce"
          title="Schedule Management"
          subtitle="View and manage work schedules"
        />
      </motion.div>

      {/* Main content */}
      <motion.div
        className="flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0"
        variants={itemVariants}
      >
        {/* Left Panel */}
        <motion.div className="w-full lg:w-1/4 lg:min-w-[280px] lg:max-w-[320px]" variants={itemVariants}>
          <EmployeesPanel
            employees={employeeLites}
            selectedEmployee={selectedEmployee ?? ""}
            onSelect={(id) => setSelectedEmployee(id)}
            departments={safeDepartments}
          />
        </motion.div>

        {/* Right Panel */}
        <motion.div className="flex-1 min-w-0 overflow-hidden" variants={itemVariants}>
          <ScheduleDetails
            selectedEmployee={selectedEmployee}
            selectedEmp={selectedEmp}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            schedules={schedules as any}
            loading={fetchFilteredLoading}
            onOpenSessionEdit={handleOpenSessionEdit}
            onOpenBreakdownEdit={handleOpenBreakdownEdit}
            canEdit
          />
        </motion.div>
      </motion.div>

      {/* Modals */}
      {showSessionEdit && sessionToEdit && (
        <SessionEditModal
          scheduleId={sessionToEdit.scheduleId}
          session={sessionToEdit.session}
          onClose={() => setShowSessionEdit(false)}
          onSave={handleSaveSingleSession}
        />
      )}

      {showBreakdownEdit && breakdownToEdit && (
        <BreakdownEditModal
          isOpen={showBreakdownEdit}
          scheduleId={breakdownToEdit.scheduleId}
          session={breakdownToEdit.session}
          breakdownIndex={breakdownToEdit.index}
          onClose={() => setShowBreakdownEdit(false)}
          onSave={handleSaveBreakdownPatch}
        />
      )}
      <Chatbot />
    </motion.div>
  );
}
