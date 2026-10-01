import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import {
  Coffee,
  Utensils,
  Pause,
  Activity,
  AlertTriangle,
  MapPin,
  LogOut,
  X,
  Loader2,
  UserCheck,
  UserX,
  User,
  Clock,
} from "lucide-react";
import { useDTRStore } from "../../stores/global/dtr/dtr.store";
import { connectSocket } from "../../socket";
import useAuthStore from "../../stores/auth/auth.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import { Portal } from "../common/Portal";
import { DTRDocLite } from "../../types/global/dtr/dtr.type";

interface StatEntry {
  userId: string;
  startTime?: string;
  totalDuration?: number;
}

interface BreakStats {
  present: StatEntry[];
  absent: StatEntry[];
  break: StatEntry[];
  meal: StatEntry[];
  bioBreak: StatEntry[];
  clinicBreak: StatEntry[];
  systemIssue: StatEntry[];
  onTrip: StatEntry[];
  timeOut: StatEntry[];
}

interface FloatingBreakStatsProps {
  isOpen: boolean;
  onClose: () => void;
}

const FloatingBreakStats: React.FC<FloatingBreakStatsProps> = ({
  isOpen,
  onClose,
}) => {
  const { account } = useAuthStore();
  const { loadDateDTRs } = useDTRStore();
  const { otherUsers, fetchOtherUsers } = useUserStore();
  const [dtrs, setDtrs] = useState<DTRDocLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCompressed, setIsCompressed] = useState(false);
  const navigate = useNavigate();

  // Helper to get today's date in YYYY-MM-DD
  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = getTodayDate();

  // Initial fetch when opened
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadDateDTRs(today).then((res) => {
            if (res) setDtrs(res);
          }),
          fetchOtherUsers(),
        ]);
      } catch (error) {
        console.error("Failed to fetch DTR stats", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, today, loadDateDTRs, fetchOtherUsers]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!account?._id) {
      console.log("FloatingBreakStats: No account ID, skipping socket connection");
      return;
    }

    console.log("FloatingBreakStats: Connecting socket for user:", account._id);
    // Connect to socket
    const socket = connectSocket(account._id);

    const handleDTRUpdate = (payload: { dtr: DTRDocLite }) => {
      console.log("FloatingBreakStats: Received dtr:update", payload);
      // Ensure we only update if the DTR belongs to today
      if (payload.dtr && payload.dtr.date === today) {
        console.log("FloatingBreakStats: Updating DTR stats for today", payload.dtr);
        setDtrs((prev) => {
          const index = prev.findIndex((d) => d.userId === payload.dtr.userId);
          if (index !== -1) {
            // Update existing user DTR
            const newDtrs = [...prev];
            newDtrs[index] = payload.dtr;
            return newDtrs;
          } else {
            // Add new user DTR
            return [...prev, payload.dtr];
          }
        });
      } else {
        console.log("FloatingBreakStats: Ignored dtr:update (date mismatch or invalid)", {
          payloadDate: payload.dtr?.date,
          today,
        });
      }
    };

    socket.on("connect", () => {
      console.log("FloatingBreakStats: Socket connected", socket.id);
    });

    socket.on("connect_error", (err: any) => {
      console.error("FloatingBreakStats: Socket connection error", err);
    });

    socket.on("dtr:update", handleDTRUpdate);

    return () => {
      console.log("FloatingBreakStats: Cleaning up socket listeners");
      socket.off("dtr:update", handleDTRUpdate);
      socket.disconnect();
    };
  }, [account?._id, today]);

  // Track selected category for modal
  const [selectedCategory, setSelectedCategory] = useState<{
    label: string;
    userIds: StatEntry[];
  } | null>(null);

  const stats = useMemo<BreakStats>(() => {
    const safeOtherUsers = Array.isArray(otherUsers) ? otherUsers : [];
    const safeDtrs = Array.isArray(dtrs) ? dtrs : [];
    const activeEmployees = safeOtherUsers.filter((u) => u && !u.archived);
    const activeUserIds = safeDtrs.map((d) => d.userId);
    const absentUsers = activeEmployees
      .filter((u) => !activeUserIds.includes(u._id))
      .map((u) => ({ userId: u._id }));

    const newStats: BreakStats = {
      present: safeDtrs.map((d) => ({
        userId: d.userId,
        startTime: d.sessions?.[0]?.fullDTR?.[0]?.startTime,
      })),
      absent: absentUsers,
      break: [],
      meal: [],
      bioBreak: [],
      clinicBreak: [],
      systemIssue: [],
      onTrip: [],
      timeOut: [],
    };

    const calculateCurrentDuration = (startTime: string) => {
      const start = moment(startTime, "HH:mm");
      const now = moment();
      return Math.max(0, now.diff(start, "minutes"));
    };

    safeDtrs.forEach((dtr) => {
      if (!dtr || !Array.isArray(dtr.sessions)) return;
      // Find the latest session and entry
      const lastSession = dtr.sessions[dtr.sessions.length - 1];
      if (!lastSession || !Array.isArray(lastSession.fullDTR)) return;

      const lastEntry = lastSession.fullDTR[lastSession.fullDTR.length - 1];
      if (!lastEntry) return;

      if (lastEntry.status === "active") {
        const duration = lastEntry.startTime ? calculateCurrentDuration(lastEntry.startTime) : 0;
        const entryData = {
          userId: dtr.userId,
          startTime: lastEntry.startTime,
          totalDuration: duration
        };

        switch (lastEntry.type) {
          case "break":
            newStats.break.push(entryData);
            break;
          case "meal":
            newStats.meal.push(entryData);
            break;
          case "bio-break":
            newStats.bioBreak.push(entryData);
            break;
          case "clinic break":
            newStats.clinicBreak.push(entryData);
            break;
          case "system issue":
            newStats.systemIssue.push(entryData);
            break;
          case "on trip":
            newStats.onTrip.push(entryData);
            break;
        }
      } else if (lastEntry.status === "done") {
        if (lastEntry.type === "work") {
          newStats.timeOut.push({ userId: dtr.userId, startTime: lastEntry.endTime || lastEntry.startTime });
        } else if (lastEntry.type === "on trip" && lastEntry.approvalStatus === "approved") {
          let duration = 0;
          if (lastEntry.duration) {
            const [h, m] = lastEntry.duration.split(":").map(Number);
            duration = (h * 60) + m;
          } else if (lastEntry.startTime) {
            duration = calculateCurrentDuration(lastEntry.startTime);
          }

          newStats.onTrip.push({
            userId: dtr.userId,
            startTime: lastEntry.startTime,
            totalDuration: duration
          });
        }
      }
    });

    return newStats;
  }, [dtrs, otherUsers]);

  // Auto-compress after 1 minute if no users in break, expand if users are in break
  useEffect(() => {
    if (!isOpen) return;

    const hasUsersInBreak =
      stats.break.length > 0 ||
      stats.meal.length > 0 ||
      stats.bioBreak.length > 0 ||
      stats.clinicBreak.length > 0 ||
      stats.systemIssue.length > 0 ||
      stats.onTrip.length > 0;

    if (hasUsersInBreak) {
      // Expand when someone is in break
      setIsCompressed(false);
    } else {
      // Compress after 1 minute when no one is in break
      const timer = setTimeout(() => {
        setIsCompressed(true);
      }, 60000); // 1 minute

      return () => clearTimeout(timer);
    }
  }, [isOpen, stats]);

  const statItems = [
    { label: "Present", userIds: stats.present, icon: UserCheck, color: "text-green-400", bg: "bg-white/10", shouldBlink: false },
    { label: "Absent", userIds: stats.absent, icon: UserX, color: "text-rose-400", bg: "bg-white/10", shouldBlink: false },
    { label: "Taking Break", userIds: stats.break, icon: Coffee, color: "text-yellow-400", bg: "bg-white/10", shouldBlink: true },
    { label: "Lunch Break", userIds: stats.meal, icon: Utensils, color: "text-purple-400", bg: "bg-white/10", shouldBlink: true },
    { label: "Bio Break", userIds: stats.bioBreak, icon: Pause, color: "text-orange-400", bg: "bg-white/10", shouldBlink: true },
    { label: "Clinic Break", userIds: stats.clinicBreak, icon: Activity, color: "text-red-400", bg: "bg-white/10", shouldBlink: true },
    { label: "System Issue", userIds: stats.systemIssue, icon: AlertTriangle, color: "text-red-400", bg: "bg-white/10", shouldBlink: true },
    { label: "On Trip", userIds: stats.onTrip, icon: MapPin, color: "text-indigo-400", bg: "bg-white/10", shouldBlink: true },
    { label: "Time Out", userIds: stats.timeOut, icon: LogOut, color: "text-gray-400", bg: "bg-white/10", shouldBlink: false },
  ];

  return (
    <>
      <style>{`
        @keyframes blink-status {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .blink-animation {
          animation: blink-status 1.5s ease-in-out infinite;
        }
      `}</style>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, y: -20, scale: 0.95, x: "-50%" }}
            animate={{
              opacity: 1,
              y: 0,
              scale: isCompressed ? 0.7 : 1,
              x: "-50%"
            }}
            exit={{ opacity: 0, y: -20, scale: 0.95, x: "-50%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-6 left-1/2 z-[9999] cursor-grab active:cursor-grabbing"
            onClick={() => isCompressed && setIsCompressed(false)}
          >
            <div className="bg-primary-950 backdrop-blur-sm rounded-full shadow-2xl border border-primary-700/50 p-1 flex items-center gap-2 pr-2 select-none pointer-events-auto">
              <div className="pl-2 flex items-center gap-2 border-r border-primary-700/50 pr-2 mr-1">
                <Activity className="w-4 h-4 text-blue-400" />
                {loading && <Loader2 className="w-3 h-3 text-primary-300 animate-spin" />}
              </div>

              {!isCompressed && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[calc(100vw-140px)] md:max-w-none">
                  {statItems.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${item.bg} whitespace-nowrap transition-colors hover:bg-white/20 cursor-pointer ${item.shouldBlink && item.userIds.length > 0 ? 'blink-animation' : ''
                        }`}
                      title={item.label}
                      onClick={() => setSelectedCategory({ label: item.label, userIds: item.userIds })}
                    >
                      <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                      <span className={`text-xs font-bold ${item.color}`}>
                        {item.userIds.length}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="ml-1 p-1 rounded-full hover:bg-white/10 text-primary-300 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCategory && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setSelectedCategory(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col"
              >
                <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
                  <h3 className="font-semibold text-lg text-gray-900">{selectedCategory.label}</h3>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="p-1 hover:bg-gray-200/50 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto p-2 space-y-1">
                  {otherUsers
                    ?.filter((u) => selectedCategory.userIds.some((s) => s.userId === u._id))
                    .map((user) => {
                      const stat = selectedCategory.userIds.find((s) => s.userId === user._id);
                      return (
                        <div
                          key={user._id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100 cursor-pointer"
                          onClick={() => {
                            navigate(`/workforce-dtr-tracking?employeeId=${user._id}&date=${today}`);
                            setSelectedCategory(null);
                            onClose();
                          }}
                        >
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                            {user.profilePicture ? (
                              <img src={user.profilePicture} alt={user.firstName} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {user.lastName}, {user.firstName}
                              </p>
                              {stat?.startTime && (
                                <div className="flex items-center gap-1 text-xs text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
                                  <Clock className="w-3 h-3" />
                                  <span>{moment(stat.startTime, "HH:mm").format("h:mm A")}</span>
                                  {stat.totalDuration !== undefined && (
                                    <span className="ml-1 opacity-75">({stat.totalDuration}m)</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{user.position}</p>
                          </div>
                        </div>
                      );
                    })}
                  {(!otherUsers || otherUsers.filter((u) => selectedCategory.userIds.some((s) => s.userId === u._id)).length === 0) && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <UserX className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">No users found</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingBreakStats;
