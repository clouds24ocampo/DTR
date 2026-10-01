/* eslint-disable @typescript-eslint/no-explicit-any */
import { Clock, ChevronLeft, ChevronRight, Download, TrendingUp, AlertCircle, Timer, UserCheck, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DTRDetails from "../../../components/workforce/dtr/DTRDetails";
import EmployeesPanel from "../../../components/workforce/dtr/EmployeesPanel";
import DTRStats, { DTRStat } from "../../../components/workforce/dtr/DTRStats";
import { useDepartmentStore } from "../../../stores/workforce/department/department.store";
import { useDTRStore } from "../../../stores/global/dtr/dtr.store";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import { DepartmentDoc } from "../../../types/workforce/department/department.type";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import { durationMinutesBetween } from "../../../utils/dtr/dtr.utils";
import Chatbot from "../../../components/common/ChatBot";
import DTRExportModal from "../../../components/workforce/dtr/DTRExportModal";
import PageHeader from "../../../components/ui/PageHeader";
import EmptyState from "../../../components/ui/EmptyState";
import TripApprovalsModal from "../../../components/workforce/dtr/TripApprovalsModal";
import { connectSocket } from "../../../socket";
import type { DTRDocLite } from "../../../types/global/dtr/dtr.type";

/* --------------------- helper for YYYY-MM-DD (local) --------------------- */
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DTRTracking() {
  const [searchParams] = useSearchParams();
  const { user, otherUsers, fetchOtherUsers } = useUserStore();
  const { filteredDTRs, ownDTR, userDTRs, loadDTRsByUserAndDate, loadUserDTRs, loading } =
    useDTRStore();
  const { departments, fetchAllDepartments } = useDepartmentStore();

  const [selectedEmployee, setSelectedEmployee] = useState<string>(
    searchParams.get("employeeId") || ""
  );
  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
    return getLocalDateString(new Date());
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTripApprovalsModal, setShowTripApprovalsModal] = useState(false);

  // Handle URL query parameters
  useEffect(() => {
    const dateParam = searchParams.get("date");
    const employeeIdParam = searchParams.get("employeeId");

    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      setSelectedDate(dateParam);
    }

    if (employeeIdParam) {
      setSelectedEmployee(employeeIdParam);
    }
  }, [searchParams]);

  // Parse date components
  const [year, month, day] = selectedDate.split("-").map(Number);

  // Calculate days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // Ensure day is valid for the selected month
  useEffect(() => {
    if (day > daysInMonth) {
      const newDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
      setSelectedDate(newDate);
    }
  }, [year, month, day, daysInMonth]);

  // Date navigation functions
  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(getLocalDateString(currentDate));
  };

  const goToNextDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    // Don't allow future dates
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const nextDateStr = getLocalDateString(currentDate);
    if (nextDateStr <= todayStr) {
      setSelectedDate(nextDateStr);
    }
  };

  // Check if next button should be disabled
  const isNextDisabled = useMemo(() => {
    const today = new Date();
    const todayStr = getLocalDateString(today);
    return selectedDate >= todayStr;
  }, [selectedDate]);

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

  useEffect(() => {
    if (!selectedEmployee && employeesToShow.length > 0) {
      setSelectedEmployee(String(employeesToShow[0]._id));
    }
  }, [employeesToShow, selectedEmployee]);

  const selectedEmp = useMemo(
    () =>
      employeesToShow.find((emp: any) => String(emp._id) === selectedEmployee),
    [employeesToShow, selectedEmployee]
  );

  useEffect(() => {
    if (selectedEmployee && selectedDate) {
      const safeDate = selectedDate.split("T")[0];
      loadDTRsByUserAndDate({ userId: selectedEmployee, date: safeDate });
    }
  }, [selectedEmployee, selectedDate, loadDTRsByUserAndDate]);

  const selectedDateDTR = useMemo(() => {
    if (!selectedEmployee) return null;
    const match = filteredDTRs.find(
      (d) => String(d.userId) === String(selectedEmployee) && d.date === selectedDate
    );
    if (match) return match;
    const anyForEmp = filteredDTRs.find((d) => String(d.userId) === String(selectedEmployee));
    if (anyForEmp) return anyForEmp;
    if (filteredDTRs.length > 0 && String(filteredDTRs[0].userId) === String(selectedEmployee)) {
      return filteredDTRs[0];
    }
    if (ownDTR && String(ownDTR.userId) === String(selectedEmployee) && ownDTR.date === selectedDate) {
      return ownDTR;
    }
    return null;
  }, [filteredDTRs, selectedEmployee, ownDTR, selectedDate]);

  /* ------------------- Weekly Stats & Real-Time Sync logic ------------------- */
  const [now, setNow] = useState(new Date());

  // Ticking timer: 1 second interval for smooth real-time progress
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadUserDTRs(selectedEmployee);
    }
  }, [selectedEmployee, loadUserDTRs]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!user?._id) return;
    const socket = connectSocket(user._id);

    const handleDTRUpdate = (payload: { dtr: DTRDocLite }) => {
      if (!payload?.dtr) return;
      if (String(payload.dtr.userId) === String(selectedEmployee)) {
        const safeDate = selectedDate.split("T")[0];
        loadDTRsByUserAndDate({ userId: selectedEmployee, date: safeDate });
        loadUserDTRs(selectedEmployee);
      }
    };

    socket.on("dtr:update", handleDTRUpdate);
    return () => {
      socket.off("dtr:update", handleDTRUpdate);
      socket.disconnect();
    };
  }, [user?._id, selectedEmployee, selectedDate, loadDTRsByUserAndDate, loadUserDTRs]);

  // Periodic quiet refresh if viewing today so active clock status is always current
  useEffect(() => {
    if (!selectedEmployee || !selectedDate) return;
    const todayStr = getLocalDateString(new Date());
    if (selectedDate.split("T")[0] !== todayStr) return;

    const interval = setInterval(() => {
      const safeDate = selectedDate.split("T")[0];
      loadDTRsByUserAndDate({ userId: selectedEmployee, date: safeDate });
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedEmployee, selectedDate, loadDTRsByUserAndDate]);

  const weekRange = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const baseDate = new Date(y, m - 1, d);
    const dayOfWeek = baseDate.getDay(); // 0 is Sunday
    const firstDay = new Date(y, m - 1, d - dayOfWeek);
    const lastDay = new Date(y, m - 1, d - dayOfWeek + 6);

    const options: Intl.DateTimeFormatOptions = { month: "short", day: "2-digit" };
    return {
      start: firstDay,
      end: lastDay,
      label: `${firstDay.toLocaleDateString("en-US", options)} - ${lastDay.toLocaleDateString("en-US", options)}`,
    };
  }, [selectedDate]);

  // Merge selectedDateDTR with userDTRs so the weekly stats always include today's live active work
  const weekDTRs = useMemo(() => {
    const startStr = getLocalDateString(weekRange.start);
    const endStr = getLocalDateString(weekRange.end);
    const map = new Map<string, DTRDocLite>();

    (userDTRs || []).forEach((d) => {
      if (d && d.date >= startStr && d.date <= endStr) {
        map.set(d.date, d);
      }
    });

    if (
      selectedDateDTR &&
      String(selectedDateDTR.userId) === String(selectedEmployee) &&
      selectedDateDTR.date >= startStr &&
      selectedDateDTR.date <= endStr
    ) {
      map.set(selectedDateDTR.date, selectedDateDTR);
    }

    return Array.from(map.values());
  }, [userDTRs, selectedDateDTR, selectedEmployee, weekRange]);

  const stats = useMemo<DTRStat[]>(() => {
    let totalMinutes = 0;
    let daysPresent = 0;
    let overtimeCount = 0;
    let tardyCount = 0;

    const uniqueDays = new Set<string>();

    weekDTRs.forEach((d) => {
      d.sessions.forEach((s) => {
        // Total Work from completed sessions/items (cross-date: recompute from entries when stored total is 0)
        const [h, m] = (s.DTRTotalWork || "00:00").split(":").map(Number);
        let workMin = (h || 0) * 60 + (m || 0);
        if (workMin === 0 && Array.isArray(s.fullDTR)) {
          s.fullDTR.forEach((e: { type?: string; status?: string; startTime?: string; endTime?: string }) => {
            if ((e.type || "").toLowerCase() !== "work" || e.status !== "done" || !e.startTime || !e.endTime) return;
            workMin += durationMinutesBetween(e.startTime, e.endTime);
          });
        }
        totalMinutes += workMin;

        // Tags and Active tracking
        s.fullDTR.forEach((e) => {
          if (e.startTag?.toLowerCase().includes("late")) tardyCount++;
          if (e.endTag?.toLowerCase().includes("overtime")) overtimeCount++;
          if (e.status === "done" || e.status === "active") uniqueDays.add(d.date);

          // Realtime addition for active work entry
          if (e.type === "work" && e.status === "active" && e.startTime) {
            const [startH, startM] = e.startTime.split(":").map(Number);
            if (!isNaN(startH) && !isNaN(startM)) {
              const [dYear, dMonth, dDay] = d.date.split("-").map(Number);
              const startDate = new Date(dYear, dMonth - 1, dDay, startH, startM, 0, 0);
              const diffMs = now.getTime() - startDate.getTime();
              if (diffMs > 0) {
                totalMinutes += Math.floor(diffMs / 60000);
              }
            }
          }
        });
      });
    });

    daysPresent = uniqueDays.size;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return [
      {
        title: "Actual Work",
        value: `${hours}h ${mins}m`,
        icon: Timer,
        color: "blue",
        description: `Total rendered for ${weekRange.label}`,
      },
      {
        title: "Days Present",
        value: daysPresent,
        icon: UserCheck,
        color: "green",
        description: "Unique days with time entries",
      },
      {
        title: "Overtime",
        value: overtimeCount,
        icon: TrendingUp,
        color: "orange",
        description: "Total overtime segments this week",
      },
      {
        title: "Tardy/Late",
        value: tardyCount,
        icon: AlertCircle,
        color: "yellow",
        description: "Clock-in delay occurrences",
      },
    ];
  }, [weekDTRs, weekRange, now]);

  return (
    <motion.div
      className="w-full space-y-4 sm:space-y-6 min-h-0 flex flex-col"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={Clock}
          eyebrow="Workforce"
          title="DTR Tracking"
          subtitle="Monitor daily time records and attendance"
          actions={
            <button
              onClick={() => setShowTripApprovalsModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <MapPin className="h-4 w-4" />
              <span>Trip Approvals</span>
            </button>
          }
        />
      </motion.div>

      {/* Mini Dashboard */}
      <motion.div variants={itemVariants}>
        <DTRStats stats={stats} />
      </motion.div>

      {/* Main Content */}
      <motion.div
        className="flex flex-col lg:flex-row gap-3 sm:gap-6 flex-1 min-h-0"
        variants={itemVariants}
      >
        {/* Left Panel (Employee List) */}
        <motion.div className="w-full lg:w-1/4 lg:min-w-[280px] lg:max-w-[320px] flex flex-col h-full" variants={itemVariants}>
          <EmployeesPanel
            employees={employeesToShow as any[]}
            selectedEmployee={selectedEmployee}
            onSelect={setSelectedEmployee}
            departments={safeDepartments}
          />
        </motion.div>

        {/* Right Panel (DTR Details) */}
        <motion.div className="w-full lg:flex-1 min-w-0 flex flex-col" variants={itemVariants}>
          <motion.div
            className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col flex-1 min-h-0"
            variants={itemVariants}
          >
            {/* Header Section (Employee info + Date picker) */}
            <motion.div
              className="sticky -top-5 sm:-top-10 z-20 bg-white shadow-sm px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 rounded-t-2xl flex-shrink-0"
              variants={itemVariants}
            >
              {selectedEmployee ? (
                <div className="flex justify-between flex-col sm:flex-row gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                      DTR for {selectedEmp?.firstName} {selectedEmp?.lastName}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      {selectedEmp?.position}
                    </p>
                  </div>

                  {/* Date Navigation and Export - Mobile Optimized */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    {/* Date Navigation Buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial">
                      <button
                        onClick={goToPreviousDay}
                        className="p-1.5 sm:p-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-shrink-0"
                        aria-label="Previous day"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                      </button>

                      <div className="flex gap-1 sm:gap-2 flex-1 sm:flex-initial">
                        {/* Year Dropdown */}
                        <select
                          id="dtrYear"
                          value={year}
                          onChange={(e) => {
                            const newYear = parseInt(e.target.value);
                            const newDay = Math.min(day, new Date(newYear, month, 0).getDate());
                            setSelectedDate(
                              `${newYear}-${String(month).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`
                            );
                          }}
                          className="flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm min-w-0 bg-white text-slate-700"
                        >
                          {Array.from({ length: 5 }, (_, i) => {
                            const y = new Date().getFullYear() - 2 + i;
                            return (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            );
                          })}
                        </select>

                        {/* Month Dropdown */}
                        <select
                          id="dtrMonth"
                          value={month}
                          onChange={(e) => {
                            const newMonth = parseInt(e.target.value);
                            const newDay = Math.min(day, new Date(year, newMonth, 0).getDate());
                            setSelectedDate(
                              `${year}-${String(newMonth).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`
                            );
                          }}
                          className="flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm min-w-0 bg-white text-slate-700"
                        >
                          {Array.from({ length: 12 }, (_, i) => {
                            const monthNum = i + 1;
                            const monthNames = [
                              "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                            ];
                            return (
                              <option key={monthNum} value={monthNum}>
                                {monthNames[i]}
                              </option>
                            );
                          })}
                        </select>

                        {/* Day Dropdown */}
                        <select
                          id="dtrDay"
                          value={day}
                          onChange={(e) => {
                            const newDay = parseInt(e.target.value);
                            setSelectedDate(
                              `${year}-${String(month).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`
                            );
                          }}
                          className="flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm min-w-0 bg-white text-slate-700"
                        >
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const dayNum = i + 1;
                            return (
                              <option key={dayNum} value={dayNum}>
                                {String(dayNum).padStart(2, "0")}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <button
                        onClick={goToNextDay}
                        disabled={isNextDisabled}
                        className="p-1.5 sm:p-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        aria-label="Next day"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>

                    {/* Export Button */}
                    <button
                      onClick={() => setShowExportModal(true)}
                      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-xs sm:text-sm font-medium w-full sm:w-auto"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Export DTR</span>
                      <span className="sm:hidden">Export</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 py-1 text-sm sm:text-base">
                  Select an employee to view DTR
                </div>
              )}
            </motion.div>

            {/* DTR Content Section */}
            <motion.div
              className="p-3 sm:p-6 overflow-y-auto flex-1 min-h-0"
              variants={itemVariants}
            >
              {selectedEmployee ? (
                <DTRDetails
                  dtr={selectedDateDTR}
                  selectedDate={selectedDate}
                  loading={loading}
                  userId={selectedEmployee}
                />
              ) : (
                <EmptyState
                  icon={Clock}
                  title="Select an Employee"
                  message="Choose an employee to view their DTR records"
                />
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Export Modal */}
      <DTRExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedEmployee={selectedEmployee}
        selectedEmp={selectedEmp}
        employees={employeesToShow}
      />

      {/* Trip Approvals Modal */}
      <TripApprovalsModal
        isOpen={showTripApprovalsModal}
        onClose={() => setShowTripApprovalsModal(false)}
      />

      <Chatbot />
    </motion.div>
  );
}
