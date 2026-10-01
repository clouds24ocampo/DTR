import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Coffee,
  LogIn,
  LogOut,
  MapPin,
  Stethoscope,
  Users,
  Utensils,
  X,
  CheckCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorModal } from "../../components/global/ErrorModal";
import { SuccessModal } from "../../components/global/SuccessModal";
import { GeoFenceModal } from "../../components/global/GeoFenceModal";
import { ValidationModal } from "../../components/global/ValidationModal";
import { useDTRStore } from "../../stores/global/dtr/dtr.store";
import { useScheduleStore } from "../../stores/global/schedule/schedule.store";
import { StartableType, IssueType, DTRDocLite } from "../../types/global/dtr/dtr.type";
import {
  getUserLocation,
  isPointInAnyPolygon,
  parseMultiplePolygonCoordinates,
} from "../../utils/geo/geoFence.utils";
import { createDeclinedEntry } from "../../api/global/declined-entry/declined-entry.api";
import type { DeclinedActionType } from "../../types/global/declined-entry/declined-entry.type";
import type { UserType } from "../../types/workforce/user/user.type";
import { verifyDevice } from "../../api/workplace/device/device.api";
import axiosInstance from "../../axios/axiosInstance";
import {
  shouldNotifyForBreak,
  getNextNotificationDelay,
  secondsSinceStart,
  BreakNotificationTimer,
  isDev,
  focusWindow,
} from "../../utils/breakNotifications";

// === BRAND (from .env) ===
const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME?.trim();

// === GEO-FENCING CONFIGURATION ===
// Multiple polygon coordinates from environment variable
// Format: "lat1,lng1;lat2,lng2;lat3,lng3;...||lat1,lng1;lat2,lng2;lat3,lng3;..."
// Polygons are separated by "||" (double pipe)
// Example: "14.5995,120.9842;14.6005,120.9852;14.6015,120.9842;14.6005,120.9832||14.7000,121.0000;14.7010,121.0010;14.7020,121.0000;14.7010,120.9990"
// User can time in and use actions when inside ANY of these polygons
const GEO_FENCE_POLYGONS = parseMultiplePolygonCoordinates(
  import.meta.env.VITE_GEO_FENCE_POLYGON
);

// === Types & Constants ===
type ActionId =
  | "work"
  | "break"
  | "meal"
  | "bio-break"
  | "clinic-break"
  | "system-issue"
  | "on-trip"
  | "timeout";

const ACTION_TO_OFFICE_ZONE: Partial<Record<ActionId, string>> = {
  work: "work-area",
  break: "cafeteria",
  meal: "cafeteria",
  "bio-break": "restroom",
  "clinic-break": "clinic",
  "on-trip": "outside",
  timeout: "outside",
};

async function syncVirtualOfficeAction(employeeId: string, actionId: ActionId): Promise<void> {
  const destinationZone = ACTION_TO_OFFICE_ZONE[actionId];
  if (!destinationZone) return;
  try {
    await axiosInstance.post("/employee/action", {
      employeeId,
      action: actionId,
      destinationZone,
    });
  } catch (error) {
    // Non-blocking sync for office visualization only.
    console.warn("Virtual Office sync skipped:", error);
  }
}

const ACTIONS: {
  id: ActionId;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: "blue" | "yellow" | "black" | "white" | "red";
}[] = [
    { id: "work", label: "Time In", icon: LogIn, color: "blue" },
    { id: "break", label: "Break", icon: Coffee, color: "yellow" },
    { id: "meal", label: "Meal", icon: Utensils, color: "blue" },
    { id: "bio-break", label: "Bio Break", icon: Users, color: "black" },
    {
      id: "clinic-break",
      label: "Clinic Break",
      icon: Stethoscope,
      color: "black",
    },
    {
      id: "system-issue",
      label: "System Issue",
      icon: AlertTriangle,
      color: "red",
    },
    { id: "on-trip", label: "On Trip", icon: MapPin, color: "blue" },
    { id: "timeout", label: "Time Out", icon: LogOut, color: "white" },
  ];

const actionIdToStartableType: Record<
  Exclude<ActionId, "timeout">,
  StartableType
> = {
  work: "work",
  break: "break",
  meal: "meal",
  "bio-break": "bio-break",
  "clinic-break": "clinic break",
  "system-issue": "system issue",
  "on-trip": "on trip",
};

// === Utils ===
function formatYmd(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function useNow() {
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// Helper to convert HH:mm to minutes since midnight
function hhmmToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

// Helper to get current time in minutes since midnight
function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// Color helpers (brand palette)
const chipStyles: Record<(typeof ACTIONS)[number]["color"], string> = {
  blue: "bg-blue-600 hover:bg-blue-700 text-white",
  yellow: "bg-yellow-400 hover:bg-yellow-500 text-black",
  black: "bg-black hover:bg-neutral-900 text-white",
  white: "bg-white hover:bg-neutral-100 text-black border border-neutral-200",
  red: "bg-red-600 hover:bg-red-700 text-white",
};

const selectedCard = "ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-800";

// === Break Reminder Utilities ===
const playBreakReminderSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); // Drop to A4

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

const triggerBreakNotification = () => {
  if (!("Notification" in window)) return;

  const title = "Time In Required";
  const options = {
    body: "You are currently on break. Please time in if your break is over.",
    icon: "/vite.svg", // Using default icon or specific one
    tag: `break-reminder-${Date.now()}`, // Unique tag to ensure notification triggers every time
    requireInteraction: true,
  };

  if (Notification.permission === "granted") {
    new Notification(title, options);
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(title, options);
      }
    });
  }
};

// focusWindow imported from utils

export default function PublicClock() {
  const navigate = useNavigate();
  const {
    createDTR,
    startItem,
    endItem,
    loadDTRsByUserAndDate,
    createLoading,
    startLoading,
    endLoading,
    cancelTripRequest,
    cancelLoading,
  } = useDTRStore();
  const { fetchSchedulesFiltered } = useScheduleStore();

  // Local UI state
  const [idNumber, setIdNumber] = useState(() => {
    try {
      return localStorage.getItem("lastEmployeeId") || "";
    } catch (error) {
      console.error("Error accessing localStorage:", error);
      return "";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("lastEmployeeId", idNumber);
    } catch (error) {
      console.error("Error writing to localStorage:", error);
    }
  }, [idNumber]);

  const [selectedAction, setSelectedAction] = useState<ActionId | "">("");
  const [issueType, setIssueType] = useState<IssueType | "">("");
  const [reason, setReason] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSchedule, setHasSchedule] = useState<boolean | null>(null);
  const [isFlexTime, setIsFlexTime] = useState(false);
  const [currentDTR, setCurrentDTR] = useState<DTRDocLite | null>(null);
  const [checkingSchedule, setCheckingSchedule] = useState(false);
  const [foundUserId, setFoundUserId] = useState<string | null>(null);
  const [userSchedule, setUserSchedule] = useState<any | null>(null);
  const [autoTimeoutChecked, setAutoTimeoutChecked] = useState(false);
  const [showGeoFenceModal, setShowGeoFenceModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [geoFenceActionLabel, setGeoFenceActionLabel] = useState<string>("");
  const [employeeInfo, setEmployeeInfo] = useState<UserType | null>(null);
  const [tripType, setTripType] = useState("");
  const [tripReason, setTripReason] = useState("");
  const [tripCategory, setTripCategory] = useState<"Whole day" | "Half day" | "">("");
  const [halfDayType, setHalfDayType] = useState<"First session" | "Second session" | "">("");
  const [showOnTripModal, setShowOnTripModal] = useState(false);
  const [showCancelTripModal, setShowCancelTripModal] = useState(false);

  // === BOT DETECTION & SECURITY ===
  const [websiteUrl, setWebsiteUrl] = useState(""); // Honeypot
  const [isHuman, setIsHuman] = useState(false); // Behavioral check
  const [challengeSolved, setChallengeSolved] = useState(false); // JS Challenge

  useEffect(() => {
    // Simple behavioral analysis: require at least one robust interaction
    const verifyHuman = () => {
      setIsHuman(true);
    };
    // JS Challenge: Set a value that requires JS execution
    const timer = setTimeout(() => {
      setChallengeSolved(true);
    }, 500);

    window.addEventListener("mousemove", verifyHuman, { once: true });
    window.addEventListener("keydown", verifyHuman, { once: true });
    window.addEventListener("touchstart", verifyHuman, { once: true });
    window.addEventListener("scroll", verifyHuman, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", verifyHuman);
      window.removeEventListener("keydown", verifyHuman);
      window.removeEventListener("touchstart", verifyHuman);
      window.removeEventListener("scroll", verifyHuman);
    };
  }, []);

  // Break Reminder State
  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);
  const [reminderActive, setReminderActive] = useState(false);

  // Live clock
  const now = useNow();
  const ymd = useMemo(() => formatYmd(now), [now]);
  const isMutating = startLoading || endLoading || createLoading;

  // Check schedule and DTR status when ID is entered
  useEffect(() => {
    const trimmedId = idNumber.trim();
    if (!trimmedId) {
      setHasSchedule(null);
      setIsFlexTime(false);
      setCurrentDTR(null);
      setFoundUserId(null);
      setUserSchedule(null);
      setEmployeeInfo(null);
      return;
    }
    // Skip partial input while typing (e.g. "Q", "QC") — avoids noisy 404s.
    if (trimmedId.length < 5) {
      setHasSchedule(null);
      setIsFlexTime(false);
      setCurrentDTR(null);
      setFoundUserId(null);
      setUserSchedule(null);
      setEmployeeInfo(null);
      return;
    }

    const checkScheduleAndDTR = async () => {
      setCheckingSchedule(true);
      try {
        // Use the filtered schedule endpoint which accepts idNumber
        // The backend will resolve idNumber to userId internally
        const userSchedules = await fetchSchedulesFiltered({
          userId: trimmedId, // Can be idNumber or userId
          date: ymd,
          kiosk: true, // backend previews the default shift for flexible-time staff
        }).catch((error) => {
          // Handle 401 errors gracefully - endpoint might require auth
          if (error?.response?.status === 401) {
            console.warn("Schedule check requires authentication");
            return [];
          }
          console.error("Error fetching schedules:", error);
          return [];
        });

        const hasSched = userSchedules && userSchedules.length > 0;
        setHasSchedule(hasSched);
        // Backend flags developers/IT staff as flexible time (no time-in window).
        setIsFlexTime(Boolean(hasSched && (userSchedules[0] as any).flexible));

        // If schedule found, extract userId and check DTR
        if (hasSched && userSchedules[0]?.userId) {
          const userId = userSchedules[0].userId;
          const schedule = userSchedules[0];
          setFoundUserId(userId);
          setUserSchedule(schedule);

          // Load DTR to check current status
          try {
            const dtrs = await loadDTRsByUserAndDate({
              userId: userId,
              date: ymd,
            }).catch((error) => {
              // Handle 401 errors gracefully
              if (error?.response?.status === 401) {
                console.warn("DTR check requires authentication");
                return [];
              }
              console.error("Error loading DTR:", error);
              return [];
            });

            if (dtrs && dtrs.length > 0) {
              setCurrentDTR(dtrs[0]);
            } else {
              setCurrentDTR(null);
            }
          } catch (dtrError) {
            console.error("Error loading DTR:", dtrError);
            setCurrentDTR(null);
          }

          // Employee card comes with the kiosk schedule lookup (works logged out).
          setEmployeeInfo((schedule as any).employee ?? null);
        } else {
          setUserSchedule(null);
          setFoundUserId(null);
          setCurrentDTR(null);
        }
      } catch (error: any) {
        console.error("Error checking schedule/DTR:", error);
        // On 401, allow user to proceed (they might still be able to clock in)
        if (error?.response?.status === 401) {
          setHasSchedule(null); // Unknown status
          setFoundUserId(trimmedId); // Use idNumber as fallback
        } else {
          setHasSchedule(false);
          setFoundUserId(null);
        }
        setCurrentDTR(null);
        setUserSchedule(null);
      } finally {
        setCheckingSchedule(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkScheduleAndDTR, 500);
    return () => clearTimeout(timeoutId);
  }, [idNumber, ymd, fetchSchedulesFiltered, loadDTRsByUserAndDate]);

  // Get active action types from DTR
  const activeActions = useMemo(() => {
    if (!currentDTR) return new Set<string>();
    const active = new Set<string>();
    currentDTR.sessions.forEach((session) => {
      session.fullDTR.forEach((item) => {
        if (item.status === "active") {
          // Map DTR type to action ID
          if (item.type === "work") active.add("work");
          else if (item.type === "break") active.add("break");
          else if (item.type === "meal") active.add("meal");
          else if (item.type === "bio-break") active.add("bio-break");
          else if (item.type === "clinic break") active.add("clinic-break");
          else if (item.type === "system issue") active.add("system-issue");
          else if (item.type === "on trip") active.add("on-trip");
        }
      });
    });
    return active;
  }, [currentDTR]);

  // Precise Break Reminder System

  const activeBreakEntry = useMemo(() => {
    if (!currentDTR) return null;
    let found:
      | {
        type: "break" | "meal" | "bio-break" | "clinic break";
        startTime: string;
        mealTotalSeconds?: number;
      }
      | null = null;
    for (const session of currentDTR.sessions) {
      for (const item of session.fullDTR) {
        if (
          item.status === "active" &&
          (item.type === "break" ||
            item.type === "meal" ||
            item.type === "bio-break" ||
            item.type === "clinic break")
        ) {
          const mealTotalSeconds =
            item.type === "meal"
              ? (() => {
                const sched =
                  userSchedule?.sessions?.find((s: any) => s.label === session.label) ||
                  null;
                const mealCredits = sched?.mealCredits || "00:00";
                const [hh, mm] = (mealCredits || "00:00").split(":").map(Number);
                return (hh * 60 + mm) * 60;
              })()
              : undefined;
          found = {
            type: item.type as any,
            startTime: item.startTime,
            mealTotalSeconds,
          };
        }
      }
    }
    return found;
  }, [currentDTR, userSchedule]);

  // Use JSON string for effect dependency to avoid object identity churn
  const activeBreakEntryStr = useMemo(() => JSON.stringify(activeBreakEntry), [activeBreakEntry]);

  const notifyTimerRef = useRef<BreakNotificationTimer | null>(null);

  useEffect(() => {
    // Initialize single timer instance
    if (!notifyTimerRef.current) {
      notifyTimerRef.current = new BreakNotificationTimer();
    }
    const timer = notifyTimerRef.current;

    const entry = activeBreakEntryStr ? JSON.parse(activeBreakEntryStr) : null;
    const onBreak =
      !!entry &&
      (entry.type === "break" ||
        entry.type === "meal" ||
        entry.type === "bio-break" ||
        entry.type === "clinic break");

    if (onBreak) {
      setReminderActive(true);
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }

      const scheduleNext = () => {
        // Must use the entry from closure or parse fresh? 
        // Since effect depends on activeBreakEntryStr, 'entry' is fresh enough for this cycle.
        // But if scheduleNext is recursive via timer, it closes over 'entry'.
        // This is fine because if entry changes, effect re-runs and cancels old timer.

        const now = Date.now();
        if (now < snoozedUntil) {
          timer.schedule(snoozedUntil - now, scheduleNext);
          return;
        }
        const elapsed = secondsSinceStart(entry.startTime);
        const should = shouldNotifyForBreak(entry.type, elapsed, {
          mealTotalSeconds: entry.mealTotalSeconds,
        });

        if (should) {
          playBreakReminderSound();
          triggerBreakNotification();
          focusWindow();
          if (isDev()) {
            console.log(
              "BreakNotification:",
              JSON.stringify({
                type: entry.type,
                timestamp: new Date().toISOString(),
                elapsedSeconds: elapsed,
                mealTotalSeconds: entry.mealTotalSeconds
              })
            );
          }
        }
        const delay = getNextNotificationDelay(
          entry.type,
          elapsed,
          { mealTotalSeconds: entry.mealTotalSeconds }
        );
        if (delay == null) return;
        timer.schedule(delay, scheduleNext);
      };

      // Start scheduling
      scheduleNext();
      return () => {
        timer.clear();
      };
    } else {
      setReminderActive(false);
      setSnoozedUntil(0);
      if (timer) timer.clear();
    }
  }, [activeBreakEntryStr, snoozedUntil]);

  // Check if user is currently time-in (has active work session)
  const isTimeIn = useMemo(() => {
    return activeActions.has("work") || activeActions.has("on-trip");
  }, [activeActions]);

  // Check if user has already timed out for today
  // User has timed out if:
  // 1. They have a DTR record
  // 2. All work sessions are done (status === "done")
  // 3. No active sessions exist
  const hasTimedOut = useMemo(() => {
    if (!currentDTR) return false;

    // Check if there are any active sessions
    const hasActiveSessions = currentDTR.sessions.some((session) =>
      session.fullDTR.some((item) => item.status === "active")
    );

    if (hasActiveSessions) return false; // Still has active sessions, not timed out

    // Check if there are any work sessions that are done
    const hasWorkSessions = currentDTR.sessions.some((session) =>
      session.fullDTR.some((item) => item.type === "work" && item.status === "done")
    );

    // If there are work sessions that are done and no active sessions, user has timed out
    return hasWorkSessions;
  }, [currentDTR]);

  // Get the earliest scheduled start time for today
  const earliestStartTime = useMemo(() => {
    if (!userSchedule || !userSchedule.sessions || userSchedule.sessions.length === 0) {
      return null;
    }
    const startTimes = userSchedule.sessions
      .map((session: any) => session.scheduledStartTime)
      .filter(Boolean);
    if (startTimes.length === 0) return null;
    return startTimes.sort()[0]; // Get earliest time
  }, [userSchedule]);



  // Check if current time is within 40 minutes before earliest start time.
  // Flexible-time staff skip the window entirely.
  const canTimeIn = useMemo(() => {
    if (isFlexTime) return true;
    if (!earliestStartTime) return true; // If no schedule, allow (will be caught by other checks)
    const currentMinutes = getCurrentMinutes();
    const startMinutes = hhmmToMinutes(earliestStartTime);
    const oneHourBefore = startMinutes - 60;
    return currentMinutes >= oneHourBefore;
  }, [earliestStartTime, isFlexTime]);

  // Auto-timeout check: "System should timeout 15 minutes after the scheduled end time of the CURRENT active shift"
  useEffect(() => {
    // Flexible-time staff have no shift end; the backend closes their DTR at 23:45.
    if (isFlexTime || !foundUserId || !isTimeIn || !userSchedule || !currentDTR) return;

    // Check every minute
    const checkInterval = setInterval(() => {
      // If already checked/triggered, stop
      if (autoTimeoutChecked) return;

      const currentMinutes = getCurrentMinutes();
      let shouldTimeout = false;

      // Iterate through sessions to find which one is active and if it's within the timeout window
      userSchedule.sessions.forEach((schedSession: any, index: number) => {
        const dtrSession = currentDTR.sessions[index];
        // Must have matching DTR session
        if (!dtrSession) return;

        // Check if this specific session has an active entry
        const hasActiveEntry = dtrSession.fullDTR.some(
          (item: any) => item.status === "active"
        );

        if (!hasActiveEntry) return;

        // Get Scheduled End Time for this session
        const endTime = schedSession.scheduledEndTime;
        if (!endTime || endTime === "00:00") return;

        const endMinutes = hhmmToMinutes(endTime);

        // Define Window: [Scheduled End + 15 mins, Scheduled End + 60 mins]
        // Example: End 17:00 (1020). Window 17:15 (1035) - 18:00 (1080).
        const startWindow = endMinutes + 15;
        const endWindow = endMinutes + 60;

        // Check if current time falls within this window
        // Note: Using >= startWindow ensures we catch it starting 15 mins after.
        // Using <= endWindow provides a 60-minute catch window for auto-timeout.
        if (currentMinutes >= startWindow && currentMinutes <= endWindow) {
          shouldTimeout = true;
        }
      });

      if (shouldTimeout) {
        setAutoTimeoutChecked(true);
        endItem({ userId: foundUserId, date: ymd, isSystemTimeout: true })
          .then(() => {
            setSuccessMessage(
              "Automatically timed out (15 minutes after scheduled end time)."
            );
            // Refresh
            return loadDTRsByUserAndDate({
              userId: foundUserId,
              date: ymd,
            }).catch(() => null);
          })
          .then((dtrs) => {
            if (dtrs && dtrs.length > 0) setCurrentDTR(dtrs[0]);
            else setCurrentDTR(null);
          })
          .catch((err) => {
            console.error("Auto-timeout failed", err);
            setAutoTimeoutChecked(false);
          });
      }
    }, 60000);

    return () => clearInterval(checkInterval);
  }, [
    isFlexTime,
    foundUserId,
    isTimeIn,
    userSchedule,
    currentDTR,
    endItem,
    loadDTRsByUserAndDate,
    autoTimeoutChecked,
    ymd,
  ]);

  // Reset auto-timeout check flag when DTR changes or user changes
  useEffect(() => {
    setAutoTimeoutChecked(false);
  }, [currentDTR, foundUserId]);

  // Helper function to parse duration "HH:mm" to minutes
  function parseDurationToMinutes(duration: string): number {
    if (!duration || duration === "--" || duration === "00:00") return 0;
    const [hours, minutes] = duration.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  // Check schedule availability for break and meal actions.
  // Flexible-time staff are always eligible (backend provisions credits).
  const scheduleBreakAvailable = useMemo(() => {
    if (isFlexTime) return true;
    if (!userSchedule || !userSchedule.sessions) return false;
    // Check if any session has break credits or break count > 0
    return userSchedule.sessions.some(
      (session: any) =>
        (session.breakCredits && session.breakCredits !== "00:00") ||
        (session.breakCount && session.breakCount > 0)
    );
  }, [userSchedule, isFlexTime]);

  const scheduleMealAvailable = useMemo(() => {
    if (isFlexTime) return true;
    if (!userSchedule || !userSchedule.sessions) return false;
    // Check if any session has meal credits or meal count > 0
    return userSchedule.sessions.some(
      (session: any) =>
        (session.mealCredits && session.mealCredits !== "00:00") ||
        (session.mealCount && session.mealCount > 0)
    );
  }, [userSchedule, isFlexTime]);

  // Count completed breaks and meals from DTR (only "done" status counts toward limit)
  const completedBreakCount = useMemo(() => {
    if (!currentDTR) return 0;
    let count = 0;
    currentDTR.sessions.forEach((session) => {
      session.fullDTR.forEach((item) => {
        // Only count completed breaks (status === "done")
        if (item.type === "break" && item.status === "done") {
          count++;
        }
      });
    });
    return count;
  }, [currentDTR]);

  const completedMealCount = useMemo(() => {
    if (!currentDTR) return 0;
    let count = 0;
    currentDTR.sessions.forEach((session) => {
      session.fullDTR.forEach((item) => {
        // Only count completed meals (status === "done")
        if (item.type === "meal" && item.status === "done") {
          count++;
        }
      });
    });
    return count;
  }, [currentDTR]);

  // Count active breaks and meals (to check if we can start a new one)
  const activeBreakCount = useMemo(() => {
    if (!currentDTR) return 0;
    let count = 0;
    currentDTR.sessions.forEach((session) => {
      session.fullDTR.forEach((item) => {
        if (item.type === "break" && item.status === "active") {
          count++;
        }
      });
    });
    return count;
  }, [currentDTR]);

  const activeMealCount = useMemo(() => {
    if (!currentDTR) return 0;
    let count = 0;
    currentDTR.sessions.forEach((session) => {
      session.fullDTR.forEach((item) => {
        if (item.type === "meal" && item.status === "active") {
          count++;
        }
      });
    });
    return count;
  }, [currentDTR]);

  // Check if break/meal has been fully used based on schedule limits
  // This includes both completed and active breaks/meals to prevent starting new ones when limit is reached
  const breakFullyUsed = useMemo(() => {
    if (!userSchedule || !userSchedule.sessions) return false;
    // Get the maximum breakCount from all sessions
    const maxBreakCount = Math.max(
      ...userSchedule.sessions.map((session: any) => session.breakCount || 0)
    );
    // If no break count limit, check if break credits are exhausted
    if (maxBreakCount === 0) {
      // Check if all break credits are used (compare DTRTotalBreak with breakCredits)
      if (!currentDTR) return false;
      return currentDTR.sessions.some((session) => {
        const sessionSchedule = userSchedule.sessions.find(
          (s: any) => s.label === session.label
        );
        if (!sessionSchedule) return false;
        const breakCredits = parseDurationToMinutes(sessionSchedule.breakCredits || "00:00");
        const breakUsed = parseDurationToMinutes(session.DTRTotalBreak || "00:00");
        return breakCredits > 0 && breakUsed >= breakCredits;
      });
    }
    // Include active breaks in the count to prevent starting new ones when limit is reached
    return (completedBreakCount + activeBreakCount) >= maxBreakCount;
  }, [userSchedule, currentDTR, completedBreakCount, activeBreakCount]);

  const mealFullyUsed = useMemo(() => {
    if (!userSchedule || !userSchedule.sessions) return false;
    // Get the maximum mealCount from all sessions
    const maxMealCount = Math.max(
      ...userSchedule.sessions.map((session: any) => session.mealCount || 0)
    );
    // If no meal count limit, check if meal credits are exhausted
    if (maxMealCount === 0) {
      // Check if all meal credits are used (compare DTRTotalMeal with mealCredits)
      if (!currentDTR) return false;
      return currentDTR.sessions.some((session) => {
        const sessionSchedule = userSchedule.sessions.find(
          (s: any) => s.label === session.label
        );
        if (!sessionSchedule) return false;
        const mealCredits = parseDurationToMinutes(sessionSchedule.mealCredits || "00:00");
        const mealUsed = parseDurationToMinutes(session.DTRTotalMeal || "00:00");
        return mealCredits > 0 && mealUsed >= mealCredits;
      });
    }
    // Include active meals in the count to prevent starting new ones when limit is reached
    return (completedMealCount + activeMealCount) >= maxMealCount;
  }, [userSchedule, currentDTR, completedMealCount, activeMealCount]);

  // Check for approved trip status
  const approvedTrip = useMemo(() => {
    if (!currentDTR) return null;
    for (const session of currentDTR.sessions) {
      for (const item of session.fullDTR) {
        if (item.type === "on trip" && item.approvalStatus === "approved") {
          return item;
        }
      }
    }
    return null;
  }, [currentDTR]);

  // Check for pending trip status
  const pendingTrip = useMemo(() => {
    if (!currentDTR) return null;
    for (const session of currentDTR.sessions) {
      for (const item of session.fullDTR) {
        if (item.type === "on trip" && item.approvalStatus === "pending") {
          return item;
        }
      }
    }
    return null;
  }, [currentDTR]);

  // Auto-timeout when Trip is Approved
  const [processedTripApproval, setProcessedTripApproval] = useState(false);

  // Reset processing flag when user changes
  useEffect(() => {
    setProcessedTripApproval(false);
  }, [foundUserId, ymd]);

  useEffect(() => {
    // Only trigger if:
    // 1. We have an approved trip
    // 2. We have active sessions (isTimeIn)
    // 3. User ID is identified
    // 4. We haven't processed this auto-timeout yet
    // 5. No other mutation is in progress
    if (approvedTrip && isTimeIn && foundUserId && !processedTripApproval && !isMutating) {
      const handleTripApprovalTimeout = async () => {
        setProcessedTripApproval(true);
        try {
          // Perform system timeout to close all active sessions
          await endItem({
            userId: foundUserId,
            date: ymd,
            isSystemTimeout: true
          });

          setSuccessMessage("Trip Request Approved: All active sessions have been automatically timed out.");

          // Refresh DTR to reflect changes
          try {
            const dtrs = await loadDTRsByUserAndDate({
              userId: foundUserId,
              date: ymd,
            });
            if (dtrs && dtrs.length > 0) {
              setCurrentDTR(dtrs[0]);
            } else {
              setCurrentDTR(null);
            }
          } catch (refreshError) {
            console.warn("Failed to refresh DTR after auto-timeout", refreshError);
          }
        } catch (error) {
          console.error("Error processing trip approval timeout:", error);
          // If it failed, maybe we should allow retrying? 
          // For now, keep it true to avoid infinite error loop
        }
      };

      handleTripApprovalTimeout();
    }
  }, [approvedTrip, isTimeIn, foundUserId, processedTripApproval, isMutating, endItem, loadDTRsByUserAndDate, ymd]);

  async function handleAction() {
    const trimmedIdNumber = idNumber.trim();

    // === SECURITY CHECKS ===
    // 1. Honeypot check
    if (websiteUrl) {
      console.warn("Bot detected: Honeypot triggered");
      return; // Silent failure
    }
    // 2. Behavioral check
    if (!isHuman) {
      setErrorMessage("Please interact with the page before submitting.");
      return;
    }
    // 3. JS Challenge check
    if (!challengeSolved) {
      setErrorMessage("Security check failed. Please refresh the page.");
      return;
    }

    // 4. Random Delay (Simulation) to mimic human network variance and slow down brute force
    const randomDelay = Math.floor(Math.random() * 800) + 200; // 200-1000ms
    await new Promise(r => setTimeout(r, randomDelay));

    if (!trimmedIdNumber || !selectedAction) {
      setErrorMessage("Please enter an Employee ID Number and select an action.");
      return;
    }

    // If still checking, wait
    if (checkingSchedule) {
      setErrorMessage("Please wait while we verify your schedule...");
      return;
    }

    // Check if user is archived
    if (employeeInfo?.archived === true || String(employeeInfo?.archived) === "true") {
      setErrorMessage("Your account is currently inactive. Please contact the HR department for assistance.");
      return;
    }

    // Check if user has schedule (only if we were able to check).
    // Flexible-time staff skip this — backend provisions a shift on clock-in.
    if (hasSchedule === false && !isFlexTime) {
      setErrorMessage("You don't have a schedule for today. Please contact your supervisor.");
      return;
    }

    // Check 60-minute window for time-in
    if (selectedAction === "work" && !canTimeIn && earliestStartTime) {
      const currentMinutes = getCurrentMinutes();
      const startMinutes = hhmmToMinutes(earliestStartTime);
      const oneHourBefore = startMinutes - 60;

      // Logic: if currentMinutes < oneHourBefore, deny.
      // Example: Start 9:00 (540). 60 mins before = 8:00 (480).
      // If Now 7:59 (479). 479 < 480 -> Deny.
      // If Now 8:00 (480). 480 >= 480 -> Allow.

      if (currentMinutes < oneHourBefore) {
        const timeUntilAllowed = oneHourBefore - currentMinutes;
        const hours = Math.floor(timeUntilAllowed / 60);
        const minutes = timeUntilAllowed % 60;
        const timeStr = hours > 0
          ? `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`
          : `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        setErrorMessage(`You can only time in 1 hour before your scheduled start time. Please wait ${timeStr}.`);
        return;
      }
    }

    // Prevent time-in if already time-in
    if (selectedAction === "work" && isTimeIn) {
      setErrorMessage("You are already time-in. Please select a break action or time out.");
      return;
    }

    // Prevent break actions and timeout if not time-in
    if (selectedAction !== "work" && selectedAction !== "on-trip" && !isTimeIn) {
      setErrorMessage("Please time in first before taking a break or timing out.");
      return;
    }

    // Check for device token to bypass geofencing
    let bypassGeofence = false;
    const deviceToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("device_token="))
      ?.split("=")[1] || localStorage.getItem("device_token");

    if (deviceToken && foundUserId) {
      try {
        await verifyDevice(foundUserId, deviceToken);
        bypassGeofence = true;
        console.log("Device verified, bypassing geofencing");
      } catch {
        console.warn("Device verification failed, proceeding with geofencing check");
      }
    }

    // Geo-fencing check for all actions (except on-trip)
    if (GEO_FENCE_POLYGONS && !bypassGeofence && selectedAction !== "on-trip") {
      setCheckingLocation(true);
      // Get the action label for the modal
      const actionLabel = ACTIONS.find((a) => a.id === selectedAction)?.label || "";
      setGeoFenceActionLabel(actionLabel);

      try {
        const location = await getUserLocation();
        if (location) {
          setUserLocation(location);
          const isInside = isPointInAnyPolygon(location, GEO_FENCE_POLYGONS);
          if (!isInside) {
            // Record declined entry before showing modal
            const userIdToUse = foundUserId || trimmedIdNumber;
            try {
              // Get schedule info from userSchedule if available
              const scheduleInfo = userSchedule?.sessions?.[0]
                ? {
                  scheduledStartTime: userSchedule.sessions[0].scheduledStartTime,
                  scheduledEndTime: userSchedule.sessions[0].scheduledEndTime,
                }
                : undefined;

              // Map actionId to declined action type
              const declinedActionType: DeclinedActionType =
                selectedAction === "timeout"
                  ? "timeout"
                  : (selectedAction as DeclinedActionType);

              await createDeclinedEntry({
                userId: userIdToUse,
                date: ymd,
                actionType: declinedActionType,
                coordinates: {
                  lat: location.lat,
                  lng: location.lng,
                },
                scheduleInfo,
              });
            } catch (declinedEntryError) {
              // Log error but don't block the user from seeing the modal
              console.error("Error creating declined entry:", declinedEntryError);
            }

            setShowGeoFenceModal(true);
            setCheckingLocation(false);
            return;
          }
        } else {
          // If location access is denied or unavailable, show error
          setErrorMessage("Unable to verify your location. Please enable location services and try again.");
          setCheckingLocation(false);
          return;
        }
      } catch (error) {
        console.error("Error checking location:", error);
        setErrorMessage("Error checking location. Please try again.");
        setCheckingLocation(false);
        return;
      } finally {
        setCheckingLocation(false);
      }
    }

    // Use foundUserId if available, otherwise use idNumber (DTR endpoints may handle idNumber)
    const userIdToUse = foundUserId || trimmedIdNumber;

    try {
      // Try to create DTR - this endpoint may require auth but let's try
      // Try to create DTR - this endpoint may require auth but let's try
      try {
        await createDTR({
          userId: userIdToUse,
          date: ymd,
          // Inject security fields
          website_url: websiteUrl,
          _hp_check: true
        } as any);
      } catch (createError: any) {
        // If create fails with 401, DTR might already exist or endpoint requires auth
        // Continue anyway as start/end endpoints might work
        if (createError?.response?.status !== 401) {
          throw createError;
        }
      }

      if (selectedAction === "timeout") {
        await endItem({
          userId: userIdToUse,
          date: ymd,
          // Inject security fields
          website_url: websiteUrl,
          _hp_check: true
        } as any);
        await syncVirtualOfficeAction(userIdToUse, "timeout");
        setSuccessMessage("Time out recorded.");
        // Refresh DTR status after timeout to update isTimeIn
        if (foundUserId) {
          try {
            const dtrs = await loadDTRsByUserAndDate({
              userId: foundUserId,
              date: ymd,
            }).catch(() => null);
            if (dtrs && dtrs.length > 0) {
              setCurrentDTR(dtrs[0]);
            } else {
              setCurrentDTR(null);
            }
          } catch (dtrError) {
            console.warn("Could not refresh DTR status:", dtrError);
          }
        }
        resetForm();
        return;
      }

      const type =
        actionIdToStartableType[selectedAction as Exclude<ActionId, "timeout">];

      if (type === "system issue") {
        if (!issueType) {
          setErrorMessage("Please select an issue type (hardware/software).");
          return;
        }
        if (!reason.trim()) {
          setErrorMessage(
            "Please provide a short reason for the system issue."
          );
          return;
        }
      }

      if (type === "clinic break" && !reason.trim()) {
        setErrorMessage("Please provide a short reason for the clinic break.");
        return;
      }
      if (type === "on trip") {
        if (!tripType.trim()) {
          setErrorMessage("Please select a trip type.");
          return;
        }
        if (!tripReason.trim()) {
          setErrorMessage("Please provide more details about the trip.");
          return;
        }
        if (!tripCategory) {
          setErrorMessage("Please select trip duration (Whole day/Half day).");
          return;
        }
        if (tripCategory === "Half day" && !halfDayType) {
          setErrorMessage("Please select first session or second session for half day trip.");
          return;
        }
      }

      await startItem({
        userId: userIdToUse,
        // Inject security fields
        website_url: websiteUrl,
        _hp_check: true,
        type,
        date: ymd,
        issue: type === "system issue" && issueType ? issueType : undefined,
        reason:
          type === "system issue" || type === "clinic break"
            ? reason.trim()
            : undefined,
        tripType: type === "on trip" ? tripType : undefined,
        tripReason: type === "on trip" ? tripReason.trim() : undefined,
        tripCategory: type === "on trip" ? (tripCategory as "Whole day" | "Half day") : undefined,
        halfDayType: type === "on trip" && tripCategory === "Half day" ? (halfDayType as "First session" | "Second session") : undefined,
      } as any);
      await syncVirtualOfficeAction(userIdToUse, selectedAction as ActionId);
      setSuccessMessage(
        `Clocked in for ${ACTIONS.find((a) => a.id === selectedAction)?.label ?? "action"
        }`
      );
      // Refresh DTR status after action (if we have userId)
      // This is important to update isTimeIn status, especially when starting work after a break
      if (foundUserId) {
        try {
          const dtrs = await loadDTRsByUserAndDate({
            userId: foundUserId,
            date: ymd,
          }).catch(() => null);
          if (dtrs && dtrs.length > 0) {
            setCurrentDTR(dtrs[0]);
          } else {
            setCurrentDTR(null);
          }
        } catch (dtrError) {
          // Silently fail DTR refresh
          console.warn("Could not refresh DTR status:", dtrError);
        }
      }
      resetForm();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || "An error occurred. Please try again.";
      setErrorMessage(errorMsg);
    }
  }

  async function handleConfirmCancelTrip() {
    if (!foundUserId) return;

    try {
      // Per user request: if trip is canceled, it should continue/tag as work (time in)
      const success = await cancelTripRequest({
        userId: foundUserId,
        date: ymd,
        convertToWork: true
      });

      if (success) {
        await syncVirtualOfficeAction(foundUserId, "work");
        setSuccessMessage("Trip converted to regular work time.");
        // Refresh local DTR state
        try {
          const dtrs = await loadDTRsByUserAndDate({
            userId: foundUserId,
            date: ymd,
          }).catch(() => null);

          if (dtrs && dtrs.length > 0) {
            setCurrentDTR(dtrs[0]);
          } else {
            setCurrentDTR(null);
          }
        } catch (error) {
          console.warn("Failed to refresh DTR after conversion:", error);
        }
      }
    } catch (error) {
      console.error("Error converting trip:", error);
    } finally {
      setShowCancelTripModal(false);
    }
  }

  function resetForm() {
    // Keep idNumber after submission
    setSelectedAction("");
    setIssueType("");
    setReason("");
    setTripType("");
    setTripReason("");
    setTripCategory("");
    setHalfDayType("");
    setShowOnTripModal(false);
    // Note: We keep schedule and DTR state to show status after action
  }

  // Theme & animation (aligned with LoginForm)
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        duration: 0.6,
        stiffness: 80,
        damping: 10,
        when: "beforeChildren",
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="h-dvh w-full relative overflow-y-auto bg-gradient-to-br from-black via-blue-950 to-blue-700 flex items-center justify-center py-2 sm:py-4 md:py-6">
      {/* Back button - Top left corner (LoginForm-style) */}
      <motion.button
        onClick={() => navigate("/login")}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-slate-600 bg-slate-800/80 px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-white backdrop-blur transition hover:bg-slate-700/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <span>Back</span>
      </motion.button>

      {/* Security Honeypot - Invisible to Humans */}
      <div style={{ opacity: 0, position: 'absolute', top: 0, left: 0, height: 0, width: 0, zIndex: -1, overflow: 'hidden' }}>
        <input
          type="text"
          name="website_url"
          tabIndex={-1}
          autoComplete="off"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
        />
      </div>

      {/* Break Reminder Indicator */}
      <AnimatePresence>
        {reminderActive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex items-center gap-2"
          >
            <div className="flex items-center gap-2 bg-slate-800/90 text-white px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm border border-slate-600">
              {snoozedUntil > Date.now() ? (
                <BellOff size={16} className="animate-pulse" />
              ) : (
                <Bell size={16} className="animate-bounce" />
              )}
              <span className="text-xs sm:text-sm font-semibold">
                {snoozedUntil > Date.now() ? "Reminder Snoozed" : "On Break"}
              </span>

              {snoozedUntil <= Date.now() && (
                <button
                  onClick={() => setSnoozedUntil(Date.now() + 5 * 60 * 1000)}
                  className="ml-2 px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold transition-colors"
                >
                  Snooze
                </button>
              )}
              {snoozedUntil > Date.now() && (
                <button
                  onClick={() => setSnoozedUntil(0)}
                  className="ml-2 px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Centered container */}
      <motion.div
        className="w-full max-w-5xl px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-4 md:py-6 relative z-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Centered Header */}
        <motion.header
          variants={itemVariants}
          className="mb-3 sm:mb-4 md:mb-6 flex flex-col items-center text-center gap-0.5 sm:gap-1"
        >
          <h1 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
            {COMPANY_NAME}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Clock in and out page
          </p>
        </motion.header>

        {/* Panels */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 md:grid-cols-3">
          {/* Time Panel (LoginForm left-panel style) */}
          <motion.section
            variants={itemVariants}
            className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-3 sm:p-4 md:p-6 border border-slate-700/50 shadow-2xl shadow-blue-500/20"
          >
            {/* Soft glow accent */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 blur-3xl" />
            </div>
            <div className="relative flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-lg px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                <span className="font-mono text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white tabular-nums">
                  {now.toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-1.5 sm:mt-2 md:mt-3 text-slate-300 text-[10px] sm:text-xs md:text-sm">
                {now.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="mt-2 sm:mt-3 md:mt-4 lg:mt-6 inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-blue-400/90 to-cyan-400/90 text-white px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold shadow-lg shadow-blue-500/30">
                <span className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white" />
                {ymd}
              </div>
            </div>
          </motion.section>

          {/* Action & Form Panel (LoginForm right-panel style) */}
          <motion.section
            variants={itemVariants}
            className="md:col-span-2 rounded-2xl bg-slate-800/95 p-3 sm:p-4 md:p-6 border border-slate-700/50 shadow-2xl shadow-blue-500/20"
          >
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {/* Employee ID Number */}
              <div>
                <label
                  htmlFor="idNumber"
                  className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-slate-300"
                >
                  Employee ID Number
                </label>
                <div className="relative">
                  <input
                    id="idNumber"
                    name="idNumber"
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    disabled={isMutating}
                    placeholder="Enter Employee ID Number"
                    className={[
                      "w-full rounded-lg border border-slate-600 bg-slate-700 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-60",
                      (idNumber || checkingSchedule) && "pr-16 sm:pr-20",
                      hasSchedule === false
                        ? "border-red-500/70 focus:ring-red-400/50"
                        : hasSchedule === true
                          ? "border-green-500/50 focus:ring-green-400/50"
                          : "",
                    ].join(" ")}
                  />
                  <AnimatePresence>
                    {idNumber && (
                      <motion.button
                        type="button"
                        onClick={() => setIdNumber("")}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 z-10 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
                      >
                        Clear
                      </motion.button>
                    )}
                  </AnimatePresence>
                  {checkingSchedule && (
                    <div className="absolute right-10 sm:right-12 top-1/2 -translate-y-1/2 z-10">
                      <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
                    </div>
                  )}
                </div>
                {idNumber.trim() && (
                  <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs">
                    {checkingSchedule ? (
                      <span className="text-slate-400">Checking schedule...</span>
                    ) : hasSchedule === false ? (
                      <span className="text-red-300 font-medium">
                        ⚠️ No schedule found for today
                      </span>
                    ) : hasSchedule === true ? (
                      <span className="text-green-400 font-medium">
                        {isFlexTime ? "✓ Flexible time — clock in anytime" : "✓ Schedule found"}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Employee Information Panel */}
              <AnimatePresence>
                {idNumber.trim() && employeeInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-lg border border-slate-600 bg-slate-700/80 p-3 sm:p-4"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Profile Picture */}
                      <div className="flex-shrink-0">
                        {employeeInfo.profilePicture ? (
                          <img
                            src={employeeInfo.profilePicture}
                            alt={`${employeeInfo.firstName} ${employeeInfo.lastName}`}
                            className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover border-2 border-slate-500 shadow-md"
                          />
                        ) : (
                          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center border-2 border-slate-500 shadow-md">
                            <span className="text-white font-bold text-lg sm:text-xl">
                              {employeeInfo.firstName.charAt(0)}
                              {employeeInfo.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Employee Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
                          {employeeInfo.firstName} {employeeInfo.middleName && `${employeeInfo.middleName.charAt(0)}.`} {employeeInfo.lastName}
                        </h3>
                        <div className="mt-1 space-y-0.5 sm:space-y-1">
                          <p className="text-[10px] sm:text-xs text-slate-300">
                            <span className="font-semibold">ID:</span> {idNumber.trim()}
                          </p>
                          <p className="text-[10px] sm:text-xs text-slate-300">
                            <span className="font-semibold">Position:</span> {employeeInfo.position}
                          </p>
                          {employeeInfo.workInfo && (
                            <p className="text-[10px] sm:text-xs text-slate-300">
                              <span className="font-semibold">Department:</span> {employeeInfo.workInfo}
                            </p>
                          )}
                          {employeeInfo.location && (
                            <p className="text-[10px] sm:text-xs text-slate-300">
                              <span className="font-semibold">Location:</span> {employeeInfo.location}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold ${!employeeInfo.archived
                          ? "bg-green-900/50 text-green-300 border border-green-700/50"
                          : "bg-slate-600 text-slate-400 border border-slate-500"
                          }`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${!employeeInfo.archived ? "bg-green-500" : "bg-slate-500"
                            }`} />
                          {!employeeInfo.archived ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Trip Approval Indicator */}
              <AnimatePresence>
                {idNumber.trim() && approvedTrip && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-lg border border-green-700/50 bg-green-900/30 p-3 sm:p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-green-800/50 text-green-400 rounded-lg flex items-center justify-center border border-green-700/50 flex-shrink-0">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-green-200">Trip Request Approved</h4>
                        <p className="text-xs text-green-300/90 mt-0.5">
                          Your <span className="font-semibold">{approvedTrip.tripCategory?.toLowerCase()}</span> trip ({approvedTrip.tripType}) has been verified and approved.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <label className="text-xs sm:text-sm font-medium text-slate-300">
                    Select Action
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate("/coming-soon")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-500 bg-slate-700/50 px-2 py-1 text-xs font-small text-slate-300 transition hover:border-slate-400 hover:bg-slate-700/80 sm:px-3 sm:py-1.5 sm:text-xs"
                  >
                    Virtual Office
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-3 sm:grid-cols-3">
                  {ACTIONS.map((action) => {
                    const Icon = action.icon;
                    const active = selectedAction === action.id;
                    const isCurrentlyActive = activeActions.has(action.id);

                    const isArchived = employeeInfo?.archived === true || String(employeeInfo?.archived) === "true";
                    // Determine if action should be disabled
                    let isDisabled = isMutating || hasSchedule === false || checkingSchedule || isArchived;

                    // If user has already timed out for today, disable all actions
                    // Actions will only be available again tomorrow
                    if (hasTimedOut) {
                      isDisabled = true;
                    }

                    // If user is NOT time-in (no active work session), disable all break actions and timeout
                    // Only allow "work" (time in) - this allows user to time in again after a break ends
                    if (!isTimeIn && action.id !== "work" && action.id !== "on-trip" && !hasTimedOut) {
                      isDisabled = true;
                    }

                    // If user IS time-in (has active work session), disable "work" (time in) action
                    // This prevents double time-in, but user can still take breaks
                    if (isTimeIn && action.id === "work") {
                      isDisabled = true;
                    }

                    // Disable time-in if not within 10-minute window
                    if (action.id === "work" && !canTimeIn && earliestStartTime) {
                      isDisabled = true;
                    }

                    // Check schedule availability for break and meal
                    if (action.id === "break" && !scheduleBreakAvailable) {
                      isDisabled = true;
                    }
                    if (action.id === "meal" && !scheduleMealAvailable) {
                      isDisabled = true;
                    }

                    // Disable break/meal if already fully used (prevent double entry)
                    // This includes both completed and active breaks/meals
                    if (action.id === "break" && breakFullyUsed) {
                      isDisabled = true;
                    }
                    if (action.id === "meal" && mealFullyUsed) {
                      isDisabled = true;
                    }

                    // Disable all actions if trip is pending OR active
                    const isCurrentlyActiveTrip = activeActions.has("on-trip");
                    if (pendingTrip || isCurrentlyActiveTrip) {
                      if (action.id === "on-trip") {
                        isDisabled = false; // Enabled to allow cancellation or return
                      } else {
                        isDisabled = true;
                      }
                    }

                    return (
                      <button
                        key={action.id}
                        onClick={() => {
                          setSelectedAction(action.id);
                          if (action.id === "on-trip") {
                            if (pendingTrip) {
                              setShowCancelTripModal(true);
                            } else if (isCurrentlyActive) {
                              // If on trip and active, clicking it means "Return from Trip"
                              // We return by starting a new "work" (Time In) session, 
                              // which automatically closes the trip session on the backend.
                              setSelectedAction("work");
                              // Use setTimeout to ensure state updates before handleAction runs if needed,
                              // but handleAction uses closure or we can just trigger it directly if safe.
                              // Actually, handleAction uses selectedAction state, so we update it first.
                              setTimeout(() => handleAction(), 0);
                            } else {
                              setShowOnTripModal(true);
                            }
                          }
                        }}
                        disabled={isDisabled}
                        className={[
                          "group relative flex items-center gap-1.5 sm:gap-2 md:gap-3 rounded-lg border-2 p-1.5 sm:p-2 md:p-3 text-left transition",
                          active
                            ? "border-blue-400 bg-slate-700/80"
                            : "border-slate-600 hover:border-slate-500 bg-slate-700/50",
                          active ? selectedCard : "",
                          isDisabled ? "opacity-50 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "inline-flex h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 items-center justify-center rounded-lg sm:rounded-lg flex-shrink-0",
                            chipStyles[action.color],
                            "transition",
                            isCurrentlyActive ? "ring-2 ring-green-500 ring-offset-1 sm:ring-offset-2" : "",
                          ].join(" ")}
                        >
                          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                        </span>
                        <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-slate-200">
                          {action.id === "on-trip"
                            ? (pendingTrip ? "Pending Approval" : isCurrentlyActive ? "Return from Trip" : action.label)
                            : action.label}
                        </span>
                        {isCurrentlyActive && (
                          <span className="absolute right-1 top-1 sm:right-2 sm:top-2 flex h-1.5 w-1.5 sm:h-2 sm:w-2 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-600" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {activeActions.size > 0 && (
                  <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-green-400 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500" />
                      Active: {Array.from(activeActions).map((id) => ACTIONS.find((a) => a.id === id)?.label).filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {hasTimedOut && (
                  <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-red-300 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500" />
                      You have already timed out for today. Actions will be available again tomorrow.
                    </span>
                  </div>
                )}
              </div>

              {/* Conditional Fields */}
              <AnimatePresence mode="popLayout">
                {selectedAction === "system-issue" && (
                  <motion.div
                    key="system-issue"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2"
                  >
                    <div>
                      <span className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-slate-300">
                        Issue Type
                      </span>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {(["hardware", "software"] as IssueType[]).map(
                          (opt) => {
                            const isSelected = issueType === opt;
                            return (
                              <label
                                key={opt}
                                className={`inline-flex cursor-pointer items-center gap-1.5 sm:gap-2 rounded-lg border-2 px-4 py-2 text-xs sm:text-sm font-bold transition-all ${isSelected
                                  ? "bg-slate-700 border-blue-400 text-blue-300 ring-1 ring-blue-400"
                                  : "bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500"
                                  }`}
                              >
                                <input
                                  type="radio"
                                  id={`issue-${opt}`}
                                  name="issueType"
                                  value={opt}
                                  checked={isSelected}
                                  onChange={(e) =>
                                    setIssueType(e.target.value as IssueType)
                                  }
                                  disabled={isMutating}
                                  className="sr-only"
                                />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-blue-400" : "border-slate-500"
                                  }`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                                </div>
                                <span className="capitalize">{opt}</span>
                              </label>
                            );
                          }
                        )}
                      </div>

                    </div>
                    <div>
                      <label className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-slate-300">
                        Reason
                      </label>
                      <input
                        id="issueReason"
                        name="issueReason"
                        type="text"
                        placeholder="Short description of the issue"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={isMutating}
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-60"
                      />
                    </div>
                  </motion.div>
                )}

                {selectedAction === "clinic-break" && (
                  <motion.div
                    key="clinic-break"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <label className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-slate-300">
                      Reason
                    </label>
                    <input
                      id="clinicReason"
                      name="clinicReason"
                      type="text"
                      placeholder="Short reason for clinic break"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={isMutating}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-60"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Confirm (LoginForm-style primary gradient when actionable) */}
              <div className="pt-1 sm:pt-2">
                <motion.button
                  whileHover={selectedAction ? { scale: 1.02 } : {}}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAction}
                  disabled={
                    !idNumber.trim() ||
                    !selectedAction ||
                    isMutating ||
                    (hasSchedule === false && !isFlexTime) ||
                    checkingSchedule ||
                    checkingLocation ||
                    hasTimedOut ||
                    (selectedAction === "work" && isTimeIn) ||
                    (selectedAction !== "work" && !isTimeIn) ||
                    (selectedAction === "work" && !canTimeIn)
                  }
                  className={[
                    "w-full rounded-lg px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-bold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-400",
                    selectedAction
                      ? "text-white bg-gradient-to-r from-blue-400 to-cyan-400 shadow-lg shadow-blue-500/50 hover:from-blue-500 hover:to-cyan-500"
                      : "bg-slate-600 text-slate-400",
                  ].join(" ")}
                >
                  {isMutating
                    ? "Processing…"
                    : checkingLocation
                      ? "Checking location…"
                      : checkingSchedule
                        ? "Checking schedule…"
                        : hasSchedule === false && !isFlexTime
                          ? "No schedule for today"
                          : employeeInfo?.archived === true || String(employeeInfo?.archived) === "true"
                            ? "Account Inactive"
                            : hasTimedOut
                              ? "Already timed out for today"
                              : selectedAction === "work" && !canTimeIn && earliestStartTime
                                ? "Too early to time in"
                                : selectedAction
                                  ? `Confirm ${ACTIONS.find((a) => a.id === selectedAction)?.label
                                  }`
                                  : "Select Action"}
                </motion.button>
              </div>
            </div>
          </motion.section>
        </div>
      </motion.div>
      <SuccessModal
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />
      <ErrorModal message={errorMessage} onClose={() => setErrorMessage("")} />
      <GeoFenceModal
        isOpen={showGeoFenceModal}
        onClose={() => setShowGeoFenceModal(false)}
        actionLabel={geoFenceActionLabel}
        userLocation={userLocation}
      />
      <OnTripModal
        isOpen={showOnTripModal}
        onClose={() => {
          setShowOnTripModal(false);
          setSelectedAction("");
        }}
        tripType={tripType}
        setTripType={setTripType}
        tripReason={tripReason}
        setTripReason={setTripReason}
        tripCategory={tripCategory}
        setTripCategory={setTripCategory}
        halfDayType={halfDayType}
        setHalfDayType={setHalfDayType}
        onConfirm={handleAction}
        isMutating={isMutating}
      />
      <ValidationModal
        open={showCancelTripModal}
        title="Cancel Trip Request"
        message="Are you sure you want to cancel this trip request? This will tag your time as regular work (Time In) instead."
        onConfirm={handleConfirmCancelTrip}
        onCancel={() => setShowCancelTripModal(false)}
        isLoading={cancelLoading}
      />
    </div >
  );
}

function OnTripModal({
  isOpen,
  onClose,
  tripType,
  setTripType,
  tripReason,
  setTripReason,
  tripCategory,
  setTripCategory,
  halfDayType,
  setHalfDayType,
  onConfirm,
  isMutating
}: {
  isOpen: boolean;
  onClose: () => void;
  tripType: string;
  setTripType: (v: string) => void;
  tripReason: string;
  setTripReason: (v: string) => void;
  tripCategory: string;
  setTripCategory: (v: "Whole day" | "Half day" | "") => void;
  halfDayType: string;
  setHalfDayType: (v: "First session" | "Second session" | "") => void;
  onConfirm: () => void;
  isMutating: boolean;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm !mt-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="w-full max-w-lg bg-white text-on-light rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] mx-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">Trip Details</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    Specify Trip Information
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 hover:bg-gray-100 transition-colors text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 bg-white">
              {/* Trip Type */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type of Trip</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Business", "Delivery", "Acquisition", "Other"].map((opt) => {
                    const isSelected = tripType === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setTripType(opt)}
                        className={`px-3 py-2.5 rounded-lg text-xs font-bold border transition-all duration-200 ${isSelected
                          ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration</label>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["Whole day", "Half day"].map((opt) => {
                    const isSelected = tripCategory === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setTripCategory(opt as any)}
                        className={`px-3 py-2.5 rounded-lg text-xs font-bold border transition-all duration-200 ${isSelected
                          ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence>
                {tripCategory === "Half day" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-2">
                      <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Select Period</label>
                      <div className="grid grid-cols-2 gap-2">
                        {["First session", "Second session"].map((opt) => {
                          const isSelected = halfDayType === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => setHalfDayType(opt as any)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-200 ${isSelected
                                ? "bg-white border-blue-400 text-blue-700 shadow-sm ring-1 ring-blue-400/20"
                                : "bg-white/50 border-blue-100 text-blue-600 hover:bg-white hover:border-blue-200"
                                }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reason */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reason / Destination</label>
                <textarea
                  placeholder="Please provide details about the trip..."
                  value={tripReason}
                  onChange={(e) => setTripReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all duration-200 resize-none h-28 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isMutating}
                className="flex-[2] px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-black active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-gray-200"
              >
                {isMutating ? "Processing..." : "Confirm Trip"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

