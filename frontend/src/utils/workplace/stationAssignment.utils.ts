import type { IWorkplace, Workstation, WorkplaceStationDay, WorkplaceAssignedUser } from "../../types/workforce/workplace/workplace.type";
import type { ISession } from "../../types/global/schedule/schedule.type";

/**
 * Parses a date string (YYYY-MM-DD) and time string (HH:mm) into a Date object
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timeStr - Time in HH:mm format
 * @returns Date object or null if invalid
 */
function parseDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
    
    const [year, month, day] = dateStr.split("-").map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }
    
    // month is 0-indexed in Date constructor
    const date = new Date(year, month - 1, day, hours, minutes);
    
    // Validate the date was created correctly
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hours ||
      date.getMinutes() !== minutes
    ) {
      return null;
    }
    
    return date;
  } catch (error) {
    console.error("Error parsing date/time:", error);
    return null;
  }
}

/**
 * Checks if the schedule has started based on the date and start time
 * @param scheduleDate - Date in YYYY-MM-DD format
 * @param startTime - Start time in HH:mm format
 * @returns true if current time is after or equal to the schedule start time, false otherwise
 */
export function hasScheduleStarted(scheduleDate: string, startTime: string): boolean {
  try {
    const scheduleDateTime = parseDateTime(scheduleDate, startTime);
    if (!scheduleDateTime) {
      return false; // Invalid date/time, assume not started
    }
    
    const now = new Date();
    return now >= scheduleDateTime;
  } catch (error) {
    console.error("Error checking if schedule started:", error);
    return false;
  }
}

/**
 * Checks if current time is before work starts (allows advance assignment)
 * @param startTime - Start time in HH:mm format
 * @param date - Date in YYYY-MM-DD format
 * @returns true if current time is before work starts
 */
export function isBeforeWorkStarts(startTime: string, date: string): boolean {
  try {
    const workStartDateTime = parseDateTime(date, startTime);
    if (!workStartDateTime) {
      return false;
    }
    
    const now = new Date();
    return now < workStartDateTime;
  } catch (error) {
    console.error("Error checking if before work starts:", error);
    return false;
  }
}

/**
 * Checks if a time slot overlaps with another time slot
 * @param start1 - Start time in HH:mm
 * @param end1 - End time in HH:mm
 * @param start2 - Start time in HH:mm
 * @param end2 - End time in HH:mm
 * @returns true if time slots overlap
 */
export function timeSlotsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const start1Min = timeToMinutes(start1);
  let end1Min = timeToMinutes(end1);
  // Handle overnight shifts or midnight ending
  if (end1Min < start1Min || (end1Min === 0 && start1Min > 0)) {
    end1Min += 1440;
  }

  const start2Min = timeToMinutes(start2);
  let end2Min = timeToMinutes(end2);
  // Handle overnight shifts or midnight ending
  if (end2Min < start2Min || (end2Min === 0 && start2Min > 0)) {
    end2Min += 1440;
  }
  
  return start1Min < end2Min && start2Min < end1Min;
}

/**
 * Converts HH:mm time string to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Checks if a station is available for a given date and time slot
 * @param station - The workstation to check
 * @param date - Date in YYYY-MM-DD format
 * @param startTime - Start time in HH:mm format
 * @param endTime - End time in HH:mm format
 * @param excludeUserId - Optional user ID to exclude from conflict check (for reassignment)
 * @returns true if station is available
 */
export function isStationAvailable(
  station: Workstation,
  date: string,
  startTime: string,
  endTime: string,
  excludeUserId?: string
): boolean {
  const normalizedDate = date.trim();
  
  // Find the day entry for this date
  const dayEntry: WorkplaceStationDay | undefined = station.dates?.find(
    (d) => d.date && d.date.trim() === normalizedDate
  );
  
  if (!dayEntry || !dayEntry.assignedUsers || dayEntry.assignedUsers.length === 0) {
    return true; // No assignments for this date, station is available
  }
  
  // Check if any assigned user has overlapping time slot
  for (const assignedUser of dayEntry.assignedUsers) {
    // Skip if this is the user we're excluding (for reassignment)
    if (excludeUserId && String(assignedUser.userId) === String(excludeUserId)) {
      continue;
    }
    
    if (
      timeSlotsOverlap(
        assignedUser.scheduledStartTime,
        assignedUser.scheduledEndTime,
        startTime,
        endTime
      )
    ) {
      return false; // Station is occupied during this time slot
    }
  }
  
  return true; // No conflicts found
}

/**
 * Gets available stations from a workplace for a given date and time slot
 * @param workplace - The workplace to check
 * @param date - Date in YYYY-MM-DD format
 * @param startTime - Start time in HH:mm format
 * @param endTime - End time in HH:mm format
 * @param excludeUserId - Optional user ID to exclude from conflict check
 * @returns Array of available workstations
 */
export function getAvailableStations(
  workplace: IWorkplace,
  date: string,
  startTime: string,
  endTime: string,
  excludeUserId?: string
): Workstation[] {
  if (!workplace.workstations || workplace.workstations.length === 0) {
    return [];
  }
  
  return workplace.workstations.filter((station) =>
    isStationAvailable(station, date, startTime, endTime, excludeUserId)
  );
}

/**
 * Gets the current station assignment for a user on a specific date
 * @param workplace - The workplace to search
 * @param userId - User ID to find assignment for
 * @param date - Date in YYYY-MM-DD format
 * @returns The workstation the user is assigned to, or null if not assigned
 */
export function getUserCurrentAssignment(
  workplace: IWorkplace,
  userId: string,
  date: string
): Workstation | null {
  if (!workplace.workstations || workplace.workstations.length === 0) {
    return null;
  }
  
  const normalizedDate = date.trim();
  
  for (const station of workplace.workstations) {
    const dayEntry: WorkplaceStationDay | undefined = station.dates?.find(
      (d) => d.date && d.date.trim() === normalizedDate
    );
    
    if (dayEntry && dayEntry.assignedUsers) {
      const isAssigned = dayEntry.assignedUsers.some(
        (user) => String(user.userId) === String(userId)
      );
      
      if (isAssigned) {
        return station;
      }
    }
  }
  
  return null;
}

/**
 * Gets the assigned user information for a station on a specific date
 * @param station - The workstation
 * @param date - Date in YYYY-MM-DD format
 * @param userId - User ID to find
 * @returns The assigned user info, or null if not found
 */
export function getAssignedUserInfo(
  station: Workstation,
  date: string,
  userId: string
): WorkplaceAssignedUser | null {
  const normalizedDate = date.trim();
  
  const dayEntry: WorkplaceStationDay | undefined = station.dates?.find(
    (d) => d.date && d.date.trim() === normalizedDate
  );
  
  if (!dayEntry || !dayEntry.assignedUsers) {
    return null;
  }
  
  const assignedUser = dayEntry.assignedUsers.find(
    (user) => String(user.userId) === String(userId)
  );
  
  return assignedUser || null;
}

/**
 * Gets the first session from a schedule (used for determining start time)
 * @param sessions - Array of schedule sessions
 * @returns The first session, or null if no sessions
 */
export function getFirstSession(sessions: ISession[] | undefined): ISession | null {
  if (!sessions || sessions.length === 0) {
    return null;
  }
  
  // Sort by start time and return the earliest
  const sorted = [...sessions].sort((a, b) => 
    a.scheduledStartTime.localeCompare(b.scheduledStartTime)
  );
  
  return sorted[0];
}

/**
 * Checks if a user has a schedule for a specific date
 * @param schedule - Schedule object (may have date and sessions)
 * @param date - Date in YYYY-MM-DD format to check
 * @returns true if schedule exists for the date
 */
export function hasScheduleForDate(schedule: { date: string; sessions?: ISession[] } | undefined, date: string): boolean {
  if (!schedule) {
    return false;
  }
  
  const normalizedDate = date.trim();
  const scheduleDate = schedule.date?.trim();
  
  if (scheduleDate !== normalizedDate) {
    return false;
  }
  
  return !!(schedule.sessions && schedule.sessions.length > 0);
}

/**
 * Finds the workplace where a user has station assignments
 * Prioritizes assignments for the selected date, then falls back to any assignment
 * @param workplaces - Array of all workplaces
 * @param userId - User ID to find workplace for
 * @param preferredDate - Preferred date to check (YYYY-MM-DD format), optional
 * @returns The workplace where the user has assignments, or null if not found
 */
export function getUserWorkplace(
  workplaces: IWorkplace[],
  userId: string,
  preferredDate?: string
): IWorkplace | null {
  if (!workplaces || workplaces.length === 0 || !userId) {
    return null;
  }

  const normalizedUserId = String(userId).trim();
  const normalizedPreferredDate = preferredDate ? preferredDate.trim() : null;

  // First, try to find workplace with assignment on preferred date
  if (normalizedPreferredDate) {
    for (const workplace of workplaces) {
      if (!workplace.workstations || workplace.workstations.length === 0) {
        continue;
      }

      for (const station of workplace.workstations) {
        if (!station.dates || station.dates.length === 0) {
          continue;
        }

        const dayEntry = station.dates.find(
          (d) => d.date && d.date.trim() === normalizedPreferredDate
        );

        if (dayEntry && dayEntry.assignedUsers) {
          const hasAssignment = dayEntry.assignedUsers.some(
            (user) => String(user.userId) === normalizedUserId
          );

          if (hasAssignment) {
            return workplace;
          }
        }
      }
    }
  }

  // If no assignment found for preferred date, find any workplace with assignments
  // Prioritize most recent assignment
  let foundWorkplace: IWorkplace | null = null;
  let mostRecentDate: string | null = null;

  for (const workplace of workplaces) {
    if (!workplace.workstations || workplace.workstations.length === 0) {
      continue;
    }

    for (const station of workplace.workstations) {
      if (!station.dates || station.dates.length === 0) {
        continue;
      }

      for (const dayEntry of station.dates) {
        if (!dayEntry || !dayEntry.date || !dayEntry.assignedUsers) {
          continue;
        }

        const hasAssignment = dayEntry.assignedUsers.some(
          (user) => String(user.userId) === normalizedUserId
        );

        if (hasAssignment) {
          const entryDate = dayEntry.date.trim();
          
          // If no date found yet, or this date is more recent, update
          if (!mostRecentDate || entryDate > mostRecentDate) {
            mostRecentDate = entryDate;
            foundWorkplace = workplace;
          }
        }
      }
    }
  }

  return foundWorkplace;
}

