import React, { useEffect, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  X,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  User,
  DollarSign,
  Building,
  Clock,
  Hash,
  Timer,
} from "lucide-react";
import { formatDate } from "../../../utils/global/dateFormatter";
import { useDTRStore } from "../../../stores/global/dtr/dtr.store";

/** Parse "HH:MM" or "H:MM" to decimal hours */
function parseDurationToHours(duration: string | undefined): number {
  if (!duration || typeof duration !== "string") return 0;
  const parts = duration.trim().split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours + minutes / 60;
}

/** Format decimal hours as human-readable, e.g. "50 hours and 30 minutes" */
function formatHoursToHumanReadable(decimalHours: number): string {
  if (decimalHours <= 0) return "0 hours";
  const wholeHours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - wholeHours) * 60);
  const hoursStr =
    wholeHours > 0 ? (wholeHours === 1 ? "1 hour" : `${wholeHours} hours`) : "";
  const minutesStr =
    minutes > 0 ? (minutes === 1 ? "1 minute" : `${minutes} minutes`) : "";
  if (hoursStr && minutesStr) return `${hoursStr} and ${minutesStr}`;
  return hoursStr || minutesStr || "0 hours";
}

function computeDTRHours(dtr: {
  sessions?: Array<{
    DTRTotalWork?: string;
    fullDTR?: Array<{
      type: string;
      status: string;
      startTime: string;
      endTime?: string;
    }>;
  }>;
}) {
  const sessions = dtr.sessions || [];
  return sessions.reduce((sum, session) => {
    // Prefer backend-computed total work (DTRTotalWork) when present
    const dtrTotalWork = session.DTRTotalWork;
    if (dtrTotalWork) {
      return sum + parseDurationToHours(dtrTotalWork);
    }
    // Fallback: compute from fullDTR work entries
    const fullDTR = session.fullDTR || [];
    const workEntries = fullDTR.filter(
      (entry) => entry.type === "work" && entry.status === "done"
    );
    const hours = workEntries.reduce((h, entry) => {
      const [startHour, startMin] = entry.startTime.split(":").map(Number);
      const [endHour, endMin] = (entry.endTime || "00:00")
        .split(":")
        .map(Number);
      const start = startHour + startMin / 60;
      const end = endHour + endMin / 60;
      return h + (end - start);
    }, 0);
    return sum + hours;
  }, 0);
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

const backdropVariants = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 25,
      stiffness: 500,
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: { duration: 0.2 },
  },
};

const contentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const { userDTRs, loadUserDTRs } = useDTRStore();

  useEffect(() => {
    if (isOpen && employee?._id) {
      loadUserDTRs(employee._id).catch(console.error);
    }
  }, [isOpen, employee?._id, loadUserDTRs]);

  const isIntern = useMemo(() => {
    if (!employee?.position) return false;
    const pos = Array.isArray(employee.position)
      ? employee.position.join(" ").toLowerCase()
      : String(employee.position).toLowerCase();
    return pos.includes("intern");
  }, [employee?.position]);

  const totalHoursRendered = useMemo(() => {
    if (!isIntern || !userDTRs) return 0;
    return userDTRs.reduce((total, dtr) => total + computeDTRHours(dtr), 0);
  }, [isIntern, userDTRs]);

  if (!employee) return null;

  const firstName = employee.firstName || "";
  const lastName = employee.lastName || "";
  const middleName = employee.middleName || "";
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
  const initials = (
    (firstName[0] || "") + (lastName[0] || "")
  ).toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 !mt-0"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-6 border-b border-gray-200 shadow-sm">
              <div>
                <p className="text-sm text-gray-600 mb-1">Employee profile</p>
                <h2 className="text-2xl font-bold text-gray-900">
                  Employee Information
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <motion.div
                className="p-8 space-y-8"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Profile Header Section */}
                <motion.section
                  variants={itemVariants}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                    <div className="flex items-start gap-5 flex-1">
                      {employee.profilePicture ? (
                        <img
                          src={employee.profilePicture}
                          alt="Profile"
                          className="w-24 h-24 rounded-lg border border-gray-300 object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                          <span className="text-white font-semibold text-2xl">
                            {initials}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="text-2xl font-bold text-gray-900 mb-4">
                          {fullName}
                        </h4>

                        <div className="grid md:grid-cols-2 gap-4">
                          {employee.email && (
                            <div className="flex items-center space-x-3">
                              <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="text-gray-700 text-sm">
                                {employee.email}
                              </span>
                            </div>
                          )}
                          {(employee.phone || employee.phoneNumber) && (
                            <div className="flex items-center space-x-3">
                              <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="text-gray-700 text-sm">
                                {employee.phone || employee.phoneNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end sm:items-start gap-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                  </div>
                </motion.section>

                {/* Personal Information Section */}
                <motion.section
                  variants={itemVariants}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Personal Information
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Employee ID
                      </label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900 font-medium font-mono">
                          {employee.idNumber || "—"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Username
                      </label>
                      <p className="text-gray-900 font-medium mt-1">
                        {employee.username || "—"}
                      </p>
                    </div>
                    {employee.gender && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Gender
                        </label>
                        <p className="text-gray-900 font-medium mt-1">
                          {employee.gender}
                        </p>
                      </div>
                    )}
                    {employee.dateOfBirth && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Date of Birth
                        </label>
                        <p className="text-gray-900 font-medium mt-1">
                          {formatDate(String(employee.dateOfBirth))}
                        </p>
                      </div>
                    )}
                    {employee.location && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="text-sm font-medium text-gray-500 flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          Location
                        </label>
                        <p className="text-gray-900 font-medium mt-1">
                          {employee.location}
                        </p>
                      </div>
                    )}
                    {employee.about && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="text-sm font-medium text-gray-500">
                          About
                        </label>
                        <p className="text-gray-900 font-medium mt-1">
                          {employee.about}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.section>

                {/* Work Information Section */}
                <motion.section
                  variants={itemVariants}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-green-600" />
                    Work Information
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center">
                        <Building className="w-4 h-4 mr-1" />
                        Position
                      </label>
                      <p className="text-gray-900 font-medium mt-1">
                        {employee.position || "—"}
                      </p>
                    </div>
                    {isIntern && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center">
                          <Timer className="w-4 h-4 mr-1 text-blue-500" />
                          Total Hours Rendered
                        </label>
                        <p className="text-gray-900 font-medium mt-1">
                          {formatHoursToHumanReadable(totalHoursRendered)}
                        </p>
                      </div>
                    )}
                    {employee.workInfo && (
                      <div className="md:col-span-2 lg:col-span-2">
                        <label className="text-sm font-medium text-gray-500">
                          Work Information
                        </label>
                        <p className="text-gray-900 font-medium mt-1">
                          {employee.workInfo}
                        </p>
                      </div>
                    )}
                    {employee.salary && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          Salary
                        </label>
                        <p className="text-gray-900 font-medium mt-1">
                          {typeof employee.salary === "number"
                            ? `₱${employee.salary.toLocaleString()}`
                            : employee.salary}
                          {employee.salaryType && (
                            <span className="text-gray-500 text-sm ml-2">
                              ({employee.salaryType})
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    {employee.createdAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          Hire Date
                        </label>
                        <p className="text-gray-900 font-medium mt-1">
                          {formatDate(employee.createdAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.section>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmployeeModal;

