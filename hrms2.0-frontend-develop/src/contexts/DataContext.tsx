import { createContext, ReactNode, useContext, useState } from "react";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: "workforce" | "team-leader" | "user";
  teamId?: string;
  department: string;
  position: string;
  avatar?: string;
  status: "active" | "inactive";
  hireDate: string;
}

export interface Schedule {
  date: string;
  sessions: Array<{
    workCredits: string;
    breakCredits: string;
    breakCount: number;
    mealCredits: string;
    mealCount: number;
    scheduledStartTime: string;
    scheduledEndTime: string;
    startMealTime: string[];
    fullSched: Array<{
      type: "work" | "break" | "meal";
      start: string;
      end: string;
    }>;
  }>;
}

export interface DTREntry {
  date: string;
  sessions: Array<{
    workCredits: string;
    breakCredits: string;
    breakCount: number;
    mealCredits: string;
    mealCount: number;
    DTRTotalWork: string;
    DTRTotalBreak: string;
    DTRTotalMeal: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    startMealTime: string;
    fullDTR: Array<{
      type: "work" | "break" | "meal" | "bio-break" | "system-issue";
      startTime: string;
      startTag?: string;
      endTime?: string;
      duration: string;
      status: "active" | "completed";
    }>;
  }>;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "sick" | "vacation" | "personal" | "emergency";
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Report {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "issue" | "suggestion" | "complaint" | "other";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in-progress" | "resolved" | "closed";
  createdAt: string;
  assignedTo?: string;
}

interface DataContextType {
  employees: Employee[];
  schedules: Record<string, Schedule[]>;
  dtrEntries: Record<string, DTREntry[]>;
  leaveRequests: LeaveRequest[];
  reports: Report[];
  addEmployee: (employee: Omit<Employee, "id">) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  addSchedule: (employeeId: string, schedule: Schedule) => void;
  updateSchedule: (
    employeeId: string,
    date: string,
    schedule: Schedule
  ) => void;
  clockIn: (employeeId: string, type: string) => void;
  clockOut: (employeeId: string) => void;
  submitLeaveRequest: (
    request: Omit<LeaveRequest, "id" | "requestedAt">
  ) => void;
  updateLeaveRequest: (
    id: string,
    status: "approved" | "rejected",
    reviewedBy: string
  ) => void;
  submitReport: (report: Omit<Report, "id" | "createdAt">) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const mockEmployees: Employee[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "admin@company.com",
    role: "workforce",
    department: "HR",
    position: "HR Manager",
    status: "active",
    hireDate: "2020-01-15",
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "leader@company.com",
    role: "team-leader",
    teamId: "team-1",
    department: "Engineering",
    position: "Team Lead",
    status: "active",
    hireDate: "2019-03-20",
  },
  {
    id: "3",
    name: "Emily Davis",
    email: "user@company.com",
    role: "user",
    teamId: "team-1",
    department: "Engineering",
    position: "Employee - Operation",
    status: "active",
    hireDate: "2021-06-10",
  },
  {
    id: "4",
    name: "James Wilson",
    email: "james@company.com",
    role: "user",
    teamId: "team-1",
    department: "Engineering",
    position: "Junior Developer",
    status: "active",
    hireDate: "2022-09-05",
  },
];

const mockSchedules: Record<string, Schedule[]> = {
  "3": [
    {
      date: "2025-01-21",
      sessions: [
        {
          workCredits: "10:15",
          breakCredits: "00:45",
          breakCount: 3,
          mealCredits: "01:00",
          mealCount: 1,
          scheduledStartTime: "06:00",
          scheduledEndTime: "18:00",
          startMealTime: ["14:00"],
          fullSched: [
            { type: "work", start: "06:00", end: "08:00" },
            { type: "break", start: "08:00", end: "08:15" },
            { type: "work", start: "08:15", end: "12:00" },
            { type: "break", start: "12:00", end: "12:15" },
            { type: "work", start: "12:15", end: "14:00" },
            { type: "meal", start: "14:00", end: "15:00" },
            { type: "work", start: "15:00", end: "17:00" },
            { type: "break", start: "17:00", end: "17:15" },
            { type: "work", start: "17:15", end: "18:00" },
          ],
        },
      ],
    },
  ],
};

function DataProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [schedules, setSchedules] =
    useState<Record<string, Schedule[]>>(mockSchedules);
  const [dtrEntries, setDtrEntries] = useState<Record<string, DTREntry[]>>({});
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const addEmployee = (employee: Omit<Employee, "id">) => {
    const newEmployee = { ...employee, id: Date.now().toString() };
    setEmployees((prev) => [...prev, newEmployee]);
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp))
    );
  };

  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
  };

  const addSchedule = (employeeId: string, schedule: Schedule) => {
    setSchedules((prev) => ({
      ...prev,
      [employeeId]: [...(prev[employeeId] || []), schedule],
    }));
  };

  const updateSchedule = (
    employeeId: string,
    date: string,
    schedule: Schedule
  ) => {
    setSchedules((prev) => ({
      ...prev,
      [employeeId]: (prev[employeeId] || []).map((s) =>
        s.date === date ? schedule : s
      ),
    }));
  };

  const clockIn = (employeeId: string, type: string) => {
    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date()
      .toLocaleTimeString("en-GB", { hour12: false })
      .slice(0, 5);

    setDtrEntries((prev) => {
      const employeeDTR = prev[employeeId] || [];
      const todayDTR = employeeDTR.find((dtr) => dtr.date === today);

      if (todayDTR) {
        // Update existing DTR
        const updatedDTR = {
          ...todayDTR,
          sessions: todayDTR.sessions.map((session) => ({
            ...session,
            fullDTR: [
              ...session.fullDTR,
              {
                type: type as any,
                startTime: currentTime,
                startTag:
                  type === "work" && currentTime > session.scheduledStartTime
                    ? `late ${Math.floor(Math.random() * 300)}`
                    : undefined,
                duration: "00:00",
                status: "active" as const,
              },
            ],
          })),
        };

        return {
          ...prev,
          [employeeId]: employeeDTR.map((dtr) =>
            dtr.date === today ? updatedDTR : dtr
          ),
        };
      } else {
        // Create new DTR entry
        const schedule = schedules[employeeId]?.find((s) => s.date === today);
        const newDTR: DTREntry = {
          date: today,
          sessions: [
            {
              workCredits: schedule?.sessions[0]?.workCredits || "08:00",
              breakCredits: schedule?.sessions[0]?.breakCredits || "01:00",
              breakCount: schedule?.sessions[0]?.breakCount || 2,
              mealCredits: schedule?.sessions[0]?.mealCredits || "01:00",
              mealCount: schedule?.sessions[0]?.mealCount || 1,
              DTRTotalWork: "00:00",
              DTRTotalBreak: "00:00",
              DTRTotalMeal: "00:00",
              scheduledStartTime:
                schedule?.sessions[0]?.scheduledStartTime || "08:00",
              scheduledEndTime:
                schedule?.sessions[0]?.scheduledEndTime || "17:00",
              startMealTime: schedule?.sessions[0]?.startMealTime[0] || "12:00",
              fullDTR: [
                {
                  type: type as any,
                  startTime: currentTime,
                  startTag:
                    type === "work" &&
                    currentTime >
                      (schedule?.sessions[0]?.scheduledStartTime || "08:00")
                      ? `late ${Math.floor(Math.random() * 300)}`
                      : undefined,
                  duration: "00:00",
                  status: "active",
                },
              ],
            },
          ],
        };

        return {
          ...prev,
          [employeeId]: [...employeeDTR, newDTR],
        };
      }
    });
  };

  const clockOut = (employeeId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date()
      .toLocaleTimeString("en-GB", { hour12: false })
      .slice(0, 5);

    setDtrEntries((prev) => {
      const employeeDTR = prev[employeeId] || [];
      const todayDTR = employeeDTR.find((dtr) => dtr.date === today);

      if (todayDTR) {
        const updatedDTR = {
          ...todayDTR,
          sessions: todayDTR.sessions.map((session) => {
            const lastActiveEntry = [...session.fullDTR]
              .reverse()
              .find((entry) => entry.status === "active");
            if (lastActiveEntry) {
              const startHour = parseInt(
                lastActiveEntry.startTime.split(":")[0]
              );
              const startMin = parseInt(
                lastActiveEntry.startTime.split(":")[1]
              );
              const endHour = parseInt(currentTime.split(":")[0]);
              const endMin = parseInt(currentTime.split(":")[1]);

              const duration = `${String(endHour - startHour).padStart(
                2,
                "0"
              )}:${String(endMin - startMin).padStart(2, "0")}`;

              return {
                ...session,
                fullDTR: session.fullDTR.map((entry) =>
                  entry === lastActiveEntry
                    ? {
                        ...entry,
                        endTime: currentTime,
                        duration,
                        status: "completed" as const,
                      }
                    : entry
                ),
              };
            }
            return session;
          }),
        };

        return {
          ...prev,
          [employeeId]: employeeDTR.map((dtr) =>
            dtr.date === today ? updatedDTR : dtr
          ),
        };
      }
      return prev;
    });
  };

  const submitLeaveRequest = (
    request: Omit<LeaveRequest, "id" | "requestedAt">
  ) => {
    const newRequest: LeaveRequest = {
      ...request,
      id: Date.now().toString(),
      requestedAt: new Date().toISOString(),
    };
    setLeaveRequests((prev) => [...prev, newRequest]);
  };

  const updateLeaveRequest = (
    id: string,
    status: "approved" | "rejected",
    reviewedBy: string
  ) => {
    setLeaveRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? { ...req, status, reviewedBy, reviewedAt: new Date().toISOString() }
          : req
      )
    );
  };

  const submitReport = (report: Omit<Report, "id" | "createdAt">) => {
    const newReport: Report = {
      ...report,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setReports((prev) => [...prev, newReport]);
  };

  const updateReport = (id: string, updates: Partial<Report>) => {
    setReports((prev) =>
      prev.map((report) =>
        report.id === id ? { ...report, ...updates } : report
      )
    );
  };

  return (
    <DataContext.Provider
      value={{
        employees,
        schedules,
        dtrEntries,
        leaveRequests,
        reports,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addSchedule,
        updateSchedule,
        clockIn,
        clockOut,
        submitLeaveRequest,
        updateLeaveRequest,
        submitReport,
        updateReport,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

export { DataProvider };
