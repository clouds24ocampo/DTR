import { useMemo } from "react";
import type { DepartmentDoc } from "../../types/workforce/department/department.type";
import type {
  IWorkplace,
  WorkplaceStationDay,
  Workstation,
} from "../../types/workforce/workplace/workplace.type";

type UserLite = {
  _id?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  position?: string;
  profilePicture?: string;
};

export function useWorkplaceHelpers({
  workplaces,
  otherUsers,
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
}: any) {
  const safeWorkplaces = useMemo<IWorkplace[]>(() => {
    let normalized: IWorkplace[] = [];

    if (Array.isArray(workplaces)) {
      normalized = workplaces as IWorkplace[];
    } else {
      const alt = (workplaces as any)?.data ?? (workplaces as any)?.items;
      normalized = Array.isArray(alt) ? (alt as IWorkplace[]) : [];
    }

    // Ensure each workplace has properly normalized workstations
    return normalized.map((wp) => {
      // Normalize workstations array
      const normalizedWorkstations = (Array.isArray(wp.workstations) ? wp.workstations : []).map((ws: any) => {
        // Ensure dates array exists and is properly structured
        const normalizedDates = (Array.isArray(ws.dates) ? ws.dates : []).map((d: any) => {
          // Normalize assignedUsers array
          const normalizedAssignedUsers = (Array.isArray(d.assignedUsers) ? d.assignedUsers : []).map((user: any) => {
            // Handle userId in various formats (String, ObjectId object, etc.)
            let userIdStr = "";
            if (user.userId) {
              userIdStr = typeof user.userId === "object" && user.userId.toString
                ? user.userId.toString()
                : String(user.userId);
            } else if (user.id) {
              userIdStr = typeof user.id === "object" && user.id.toString
                ? user.id.toString()
                : String(user.id);
            } else if (user._id) {
              userIdStr = typeof user._id === "object" && user._id.toString
                ? user._id.toString()
                : String(user._id);
            }

            return {
              userId: userIdStr,
              label: String(user.label || ""),
              scheduledStartTime: String(user.scheduledStartTime || ""),
              scheduledEndTime: String(user.scheduledEndTime || ""),
              startMealTime: Array.isArray(user.startMealTime)
                ? user.startMealTime.map(String)
                : [],
            };
          }).filter((u: any) => u.userId); // Filter out entries with missing userId

          return {
            date: String(d.date || ""),
            assignedUsers: normalizedAssignedUsers,
          };
        });

        return {
          _id: String(ws._id || ""),
          stationName: String(ws.stationName || ""),
          dates: normalizedDates,
        };
      });

      return {
        ...wp,
        workstations: normalizedWorkstations,
      };
    });
  }, [workplaces]);

  const getEmployeeName = (userId: string) => {
    const u = (otherUsers as UserLite[]).find((emp) => emp._id === userId);
    if (!u) return "Unknown User";
    const full =
      [u.firstName, u.middleName, u.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      u.username ||
      u.email;
    return full || "Unknown User";
  };

  const getEmployeePosition = (userId: string) => {
    const u = (otherUsers as UserLite[]).find((emp) => emp._id === userId);
    return u?.position ?? "";
  };

  const getEmployeeIdNumber = (userId: string) => {
    const u = (otherUsers as any[]).find((emp) => emp._id === userId);
    return u?.idNumber ?? "";
  };

  const getEmployeeProfilePicture = (userId: string) => {
    const u = (otherUsers as any[]).find((emp) => emp._id === userId);
    return u?.profilePicture ?? "";
  };

  const totalWorkstations = useMemo(
    () =>
      safeWorkplaces.reduce(
        (total, wp) => total + (wp.workstations?.length ?? 0),
        0
      ),
    [safeWorkplaces]
  );

  const assignedWorkstations = useMemo(() => {
    return safeWorkplaces.reduce((total, wp) => {
      const countForWp = (wp.workstations ?? []).filter((ws: Workstation) =>
        (ws.dates ?? []).some(
          (d: WorkplaceStationDay) =>
            d?.date === selectedDate && (d.assignedUsers?.length ?? 0) > 0
        )
      ).length;
      return total + countForWp;
    }, 0);
  }, [safeWorkplaces, selectedDate]);

  const availableWorkstations = totalWorkstations - assignedWorkstations;

  const editingWorkplaceEntity = useMemo(
    () => safeWorkplaces.find((w) => w._id === editingWorkplace) || null,
    [editingWorkplace, safeWorkplaces]
  );

  const selectedStationName = useMemo(() => {
    if (!selectedWorkstation) return "";
    const wp = safeWorkplaces.find(
      (w) => w._id === selectedWorkstation.workplaceId
    );
    const ws = wp?.workstations.find(
      (x) => x._id === selectedWorkstation.workstationId
    );
    return ws?.stationName ?? "";
  }, [selectedWorkstation, safeWorkplaces]);

  const handleWorkplaceSubmit = async (payload: {
    name: string;
    workstationCount: number;
    useStationNames: boolean;
    stationNames: string[];
  }) => {
    const { name, workstationCount, useStationNames, stationNames } = payload;
    const hasProvidedNames = useStationNames && stationNames.length > 0;

    if (editingWorkplace) {
      if (hasProvidedNames) {
        await updateWorkplace(editingWorkplace, {
          name,
          workstationCount: stationNames.length,
          stationNames,
        });
      } else {
        const current = safeWorkplaces.find((w) => w._id === editingWorkplace);
        const currentNames =
          (current?.workstations || []).map((ws) => ws.stationName) || [];
        const rebuilt = Array.from(
          { length: workstationCount },
          (_, i) => currentNames[i] ?? `Station ${i + 1}`
        );
        await updateWorkplace(editingWorkplace, {
          name,
          workstationCount,
          stationNames: rebuilt,
        });
      }
      setEditingWorkplace(null);
    } else {
      if (hasProvidedNames) {
        await createWorkplace({
          name,
          workstationCount: stationNames.length,
          stationNames,
        });
      } else {
        const auto = Array.from(
          { length: workstationCount },
          (_, i) => `Station ${i + 1}`
        );
        await createWorkplace({
          name,
          workstationCount,
          stationNames: auto,
        });
      }
    }

    setShowWorkplaceForm(false);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkstation) return;
    const { workplaceId, workstationId } = selectedWorkstation;

    // Debug logging
    if (process.env.NODE_ENV === "development") {
      console.log("🟡 useWorkplaceHelpers - handleAssignSubmit started:", {
        selectedWorkstation,
        workplaceId,
        workstationId,
        allWorkplaces: safeWorkplaces.map((w) => ({
          id: w._id,
          name: w.name,
        })),
      });
    }

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const userId = (formData.get("userId") as string) || "";
    // Get date from form - it should be set by the modal, don't fall back to parent's selectedDate
    let dateFromForm = (formData.get("date") as string) || "";

    // Also try to get it directly from the select element as a fallback
    if (!dateFromForm) {
      const dateSelect = form.querySelector<HTMLSelectElement>('select[name="date"]');
      if (dateSelect && dateSelect.value) {
        dateFromForm = dateSelect.value;
      }
    }

    // Validate date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFromForm || !datePattern.test(dateFromForm)) {
      console.error("Invalid date format:", dateFromForm);
      throw new Error(`Date is required and must be in YYYY-MM-DD format. Received: "${dateFromForm}"`);
    }

    const date = dateFromForm;

    // Log for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("handleAssignSubmit - date extracted:", date);
    }
    const label = ((formData.get("label") as string) || "").trim();
    const scheduledStartTime =
      (formData.get("scheduledStartTime") as string) || "08:00";
    const scheduledEndTime =
      (formData.get("scheduledEndTime") as string) || "17:00";
    const startMealTime = formData
      .getAll("startMealTime[]")
      .map((v) => String(v).trim())
      .filter(Boolean) as string[];
    const stationNameInput = (formData.get("stationName") as string) || "";

    // Normalize IDs to strings for comparison
    const normalizedWorkplaceId = String(workplaceId).trim();
    const normalizedWorkstationId = String(workstationId).trim();

    // Find workplace - use strict string comparison
    const wp = safeWorkplaces.find((w) => {
      const wpId = String(w._id || "").trim();
      return wpId === normalizedWorkplaceId;
    });

    // Find workstation within the found workplace
    const ws = wp?.workstations?.find((x) => {
      const wsId = String(x._id || "").trim();
      return wsId === normalizedWorkstationId;
    });

    const stationName = stationNameInput || ws?.stationName;

    // Debug logging and validation
    if (process.env.NODE_ENV === "development") {
      console.log("🟠 useWorkplaceHelpers - workplace lookup:", {
        requestedWorkplaceId: normalizedWorkplaceId,
        requestedWorkstationId: normalizedWorkstationId,
        foundWorkplace: wp ? {
          id: String(wp._id),
          name: wp.name,
          normalizedId: String(wp._id).trim(),
        } : null,
        foundWorkstation: ws ? {
          id: String(ws._id),
          name: ws.stationName,
          normalizedId: String(ws._id).trim(),
        } : null,
        stationName,
        stationNameInput,
        allWorkplaces: safeWorkplaces.map((w) => ({
          id: String(w._id),
          normalizedId: String(w._id).trim(),
          name: w.name,
          workstations: w.workstations?.map((ws) => ({
            id: String(ws._id),
            normalizedId: String(ws._id).trim(),
            name: ws.stationName,
          })) || [],
        })),
      });
    }

    // Validation: Ensure workplace was found
    if (!wp) {
      const availableIds = safeWorkplaces.map((w) => `"${String(w._id)}" (${w.name})`).join(", ");
      const errorMsg = `Workplace with ID "${normalizedWorkplaceId}" not found. Available workplaces: ${availableIds}`;
      console.error("❌ useWorkplaceHelpers - Workplace not found:", {
        requestedId: normalizedWorkplaceId,
        availableWorkplaces: safeWorkplaces.map((w) => ({
          id: String(w._id),
          name: w.name,
        })),
      });
      throw new Error(errorMsg);
    }

    // Validation: Ensure workstation was found and belongs to the workplace
    if (!ws) {
      const availableWorkstations = wp.workstations?.map((ws) => `"${String(ws._id)}" (${ws.stationName})`).join(", ") || "none";
      const errorMsg = `Workstation with ID "${normalizedWorkstationId}" not found in workplace "${wp.name}" (${normalizedWorkplaceId}). Available workstations: ${availableWorkstations}`;
      console.error("❌ useWorkplaceHelpers - Workstation not found:", {
        requestedWorkstationId: normalizedWorkstationId,
        workplaceId: normalizedWorkplaceId,
        workplaceName: wp.name,
        availableWorkstations: wp.workstations?.map((ws) => ({
          id: String(ws._id),
          name: ws.stationName,
        })) || [],
      });
      throw new Error(errorMsg);
    }

    // Validation: Ensure station name matches (if provided)
    if (stationNameInput && stationNameInput.trim() && stationNameInput.trim() !== ws.stationName) {
      console.warn("⚠️ useWorkplaceHelpers - Station name mismatch:", {
        input: stationNameInput,
        workstationName: ws.stationName,
        using: stationName,
      });
    }

    // Final validation: Double-check that the workstation belongs to the correct workplace
    const workstationBelongsToWorkplace = wp.workstations?.some((w) => {
      const wsId = String(w._id || "").trim();
      return wsId === normalizedWorkstationId;
    });

    if (!workstationBelongsToWorkplace) {
      const errorMsg = `Workstation "${ws.stationName}" (${normalizedWorkstationId}) does not belong to workplace "${wp.name}" (${normalizedWorkplaceId})`;
      console.error("❌ useWorkplaceHelpers - Workstation belongs to different workplace:", errorMsg);
      throw new Error(errorMsg);
    }

    // Additional validation: Verify the workplace ID we're about to send matches what we found
    if (String(wp._id).trim() !== normalizedWorkplaceId) {
      const errorMsg = `Workplace ID mismatch: Found workplace "${wp.name}" with ID "${String(wp._id)}" but expected "${normalizedWorkplaceId}"`;
      console.error("❌ useWorkplaceHelpers - Workplace ID mismatch:", errorMsg);
      throw new Error(errorMsg);
    }

    try {
      // Ensure date is in YYYY-MM-DD format before sending
      const dateToSend = date.trim();

      // Final validation before API call
      const finalWorkplaceId = normalizedWorkplaceId;

      // Log the payload being sent
      if (process.env.NODE_ENV === "development") {
        console.log("🟣 useWorkplaceHelpers - sending API request:", {
          apiEndpoint: `POST /api/workplaces/${finalWorkplaceId}/assign`,
          workplaceId: finalWorkplaceId,
          workplaceName: wp.name,
          workstationId: normalizedWorkstationId,
          stationName,
          date: dateToSend,
          userId,
          label,
          scheduledStartTime,
          scheduledEndTime,
          validation: {
            workplaceFound: !!wp,
            workstationFound: !!ws,
            workstationBelongsToWorkplace: workstationBelongsToWorkplace,
            stationNameMatches: !stationNameInput || stationNameInput === ws.stationName,
          },
          payload: {
            date: dateToSend,
            stationName,
            user: { id: userId },
            label,
            scheduledStartTime,
            scheduledEndTime,
            startMealTime,
          },
        });
      }

      const response = await assignToWorkstation(finalWorkplaceId, {
        date: dateToSend,
        stationName,
        user: { id: userId },
        label,
        scheduledStartTime,
        scheduledEndTime,
        startMealTime,
      });

      // Don't auto-update selected date after assignment
      // This prevents showing users assigned for other dates when they're not assigned for today
      // The user can manually change the date if they want to see the assignment
      // Only update if the assigned date matches the requested date
      const assignedDate = response?.meta?.assignedDate;
      if (assignedDate && setSelectedDate && assignedDate === date) {
        // Only update if dates match - this means assignment was successful for the requested date
        // Don't update if date was auto-adjusted to a different date
      }

      setShowAssignForm(false);
      setSelectedWorkstation(null);
      form.reset();

      // Refresh workplaces data to ensure we have the latest assignments
      // This ensures we only show users assigned for the selected date
      if (fetchAllWorkplaces) {
        try {
          await fetchAllWorkplaces();
        } catch (error) {
          console.error("Error refreshing workplaces after assignment:", error);
        }
      }
    } catch (error: any) {
      // Re-throw with better error message so the modal can display it
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to assign user";
      throw new Error(errorMessage);
    }
  };

  const handleUnassign = async (
    workplaceId: string,
    workstationId: string,
    date: string,
    userId: string
  ) => {
    await unassignUser(workplaceId, workstationId, date, userId);
  };

  type CopyAssignmentItem = {
    workstationId: string;
    stationName: string;
    userId: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    startMealTime?: string[];
    label?: string;
  };

  const handleCopyAssignmentsToDate = async (
    workplaceId: string,
    _sourceDate: string,
    targetDate: string,
    assignments: CopyAssignmentItem[]
  ) => {
    const dateToSend = targetDate.trim();
    for (const a of assignments) {
      await assignToWorkstation(workplaceId, {
        date: dateToSend,
        stationName: a.stationName,
        user: { id: a.userId },
        scheduledStartTime: a.scheduledStartTime,
        scheduledEndTime: a.scheduledEndTime,
        startMealTime: a.startMealTime,
        ...(a.label != null && a.label !== "" ? { label: a.label } : {}),
      });
    }
    if (fetchAllWorkplaces) {
      await fetchAllWorkplaces();
    }
  };

  type DepartmentLite = {
    _id: string;
    name: string;
    head: string | null;
    members: string[];
  };

  const safeDepartments: DepartmentLite[] = useMemo(() => {
    const raw: any = deptState as any;
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
  }, [deptState]);

  // Helper function to get all assigned user IDs for a specific date across all workplaces
  const getAssignedUserIdsForDate = (date: string): Set<string> => {
    const assignedIds = new Set<string>();

    safeWorkplaces.forEach((workplace) => {
      workplace.workstations?.forEach((workstation) => {
        workstation.dates?.forEach((dayEntry) => {
          if (dayEntry.date === date && Array.isArray(dayEntry.assignedUsers)) {
            dayEntry.assignedUsers.forEach((assignedUser) => {
              if (assignedUser.userId) {
                assignedIds.add(String(assignedUser.userId));
              }
            });
          }
        });
      });
    });

    return assignedIds;
  };

  // Helper function to check if a station already has an assignment on a specific date
  // If workplaceId is provided, only checks within that specific workplace
  // This prevents false positives when the same station name exists in multiple workplaces
  const isStationAssignedOnDate = (stationName: string, date: string, workplaceId?: string): boolean => {
    if (!stationName || !date) return false;

    const normalizedDate = date.trim();
    const normalizedStationName = stationName.trim().toLowerCase();
    const normalizedWorkplaceId = workplaceId ? String(workplaceId).trim() : null;

    // Debug logging
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 isStationAssignedOnDate - checking:", {
        stationName,
        normalizedStationName,
        date: normalizedDate,
        workplaceId: normalizedWorkplaceId,
        allWorkplaces: safeWorkplaces.map((w) => ({
          id: String(w._id),
          name: w.name,
        })),
      });
    }

    // Filter workplaces to check - only the specified workplace if provided
    // Use loose comparison to handle ObjectId vs string mismatches
    const workplacesToCheck = normalizedWorkplaceId
      ? safeWorkplaces.filter((w) => {
        const wpId = String(w._id || "").trim();
        const matches = wpId === normalizedWorkplaceId;
        if (process.env.NODE_ENV === "development" && !matches) {
          // Log why it didn't match for debugging
          console.log(`  Workplace ID comparison:`, {
            workplaceId: wpId,
            requestedId: normalizedWorkplaceId,
            matches,
            workplaceName: w.name,
          });
        }
        return matches;
      })
      : safeWorkplaces;

    if (normalizedWorkplaceId && workplacesToCheck.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.warn("⚠️ isStationAssignedOnDate - workplace not found:", {
          requestedWorkplaceId: normalizedWorkplaceId,
          availableWorkplaces: safeWorkplaces.map((w) => ({
            id: String(w._id),
            name: w.name,
            idType: typeof w._id,
          })),
        });
      }
      return false; // Workplace not found, so station can't be assigned there
    }

    if (process.env.NODE_ENV === "development") {
      console.log("📍 isStationAssignedOnDate - workplaces to check:", {
        requestedWorkplaceId: normalizedWorkplaceId,
        workplacesToCheckCount: workplacesToCheck.length,
        workplacesToCheck: workplacesToCheck.map((w) => ({
          id: String(w._id),
          name: w.name,
        })),
      });
    }

    // Helper to normalize dates for comparison (handles various formats)
    const normalizeDateForComparison = (dateStr: string): string => {
      if (!dateStr) return "";
      const trimmed = dateStr.trim();
      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      // Try to parse and convert to YYYY-MM-DD
      try {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        }
      } catch (e) {
        // Ignore parsing errors
      }
      return trimmed; // Return as-is if can't parse
    };

    const normalizedTargetDate = normalizeDateForComparison(normalizedDate);

    for (const workplace of workplacesToCheck) {
      const workplaceIdStr = String(workplace._id).trim();

      if (process.env.NODE_ENV === "development") {
        console.log(`🔍 Checking workplace: ${workplace.name} (${workplaceIdStr})`, {
          workstationsCount: workplace.workstations?.length || 0,
        });
      }

      for (const workstation of workplace.workstations || []) {
        const workstationName = (workstation.stationName || "").trim().toLowerCase();
        const workstationIdStr = String(workstation._id || "").trim();

        if (workstationName === normalizedStationName) {
          if (process.env.NODE_ENV === "development") {
            console.log(`  ✓ Found matching station: ${workstation.stationName} (${workstationIdStr})`, {
              datesCount: workstation.dates?.length || 0,
            });
          }

          // Check if dates array exists and has entries
          if (!workstation.dates || workstation.dates.length === 0) {
            if (process.env.NODE_ENV === "development") {
              console.log(`    → No dates array or empty dates array for this station`);
            }
            continue; // No dates, so no assignments
          }

          for (const dayEntry of workstation.dates) {
            if (!dayEntry || !dayEntry.date) {
              continue; // Skip invalid entries
            }

            // Normalize date comparison
            const dayEntryDate = normalizeDateForComparison(String(dayEntry.date));
            const assignedUsers = Array.isArray(dayEntry.assignedUsers) ? dayEntry.assignedUsers : [];

            if (process.env.NODE_ENV === "development") {
              console.log(`    → Checking date entry:`, {
                rawDate: dayEntry.date,
                normalizedDate: dayEntryDate,
                targetDate: normalizedTargetDate,
                matches: dayEntryDate === normalizedTargetDate,
                assignedUsersCount: assignedUsers.length,
              });
            }

            if (dayEntryDate === normalizedTargetDate) {
              if (assignedUsers.length > 0) {
                if (process.env.NODE_ENV === "development") {
                  console.log("✅ isStationAssignedOnDate - found assignment:", {
                    workplaceId: workplaceIdStr,
                    workplaceName: workplace.name,
                    workstationId: workstationIdStr,
                    stationName: workstation.stationName,
                    date: normalizedTargetDate,
                    rawDateFromData: dayEntry.date,
                    assignedUsersCount: assignedUsers.length,
                    assignedUsers: assignedUsers.map((u: any) => ({
                      userId: String(u.userId || u.id || u._id || ""),
                      label: String(u.label || ""),
                    })),
                  });
                }
                return true;
              } else {
                if (process.env.NODE_ENV === "development") {
                  console.log(`    → Date matches but no assigned users (empty array)`);
                }
              }
            }
          }
        }
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log("❌ isStationAssignedOnDate - no assignment found:", {
        stationName,
        normalizedStationName,
        date: normalizedDate,
        normalizedTargetDate,
        workplaceId: normalizedWorkplaceId,
        workplacesChecked: workplacesToCheck.map((w) => ({
          id: String(w._id),
          name: w.name,
        })),
      });
    }

    return false;
  };

  // Helper function to get detailed assignments for a specific station on a date
  // Returns an array of assigned users with their schedules
  const getStationAssignmentsOnDate = (stationName: string, date: string, workplaceId?: string): any[] => {
    if (!stationName || !date) return [];

    const normalizedDate = date.trim();
    const normalizedStationName = stationName.trim().toLowerCase();
    const normalizedWorkplaceId = workplaceId ? String(workplaceId).trim() : null;

    const workplacesToCheck = normalizedWorkplaceId
      ? safeWorkplaces.filter((w) => String(w._id || "").trim() === normalizedWorkplaceId)
      : safeWorkplaces;

    // Helper to normalize dates for comparison (handles various formats)
    const normalizeDateForComparison = (dateStr: string): string => {
      if (!dateStr) return "";
      const trimmed = dateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      try {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        }
      } catch (e) { }
      return trimmed;
    };

    const normalizedTargetDate = normalizeDateForComparison(normalizedDate);
    const assignments: any[] = [];

    for (const workplace of workplacesToCheck) {
      for (const workstation of workplace.workstations || []) {
        const workstationName = (workstation.stationName || "").trim().toLowerCase();
        
        if (workstationName === normalizedStationName) {
          if (!workstation.dates) continue;

          for (const dayEntry of workstation.dates) {
            if (!dayEntry || !dayEntry.date) continue;

            const dayEntryDate = normalizeDateForComparison(String(dayEntry.date));
            
            if (dayEntryDate === normalizedTargetDate) {
              const assignedUsers = Array.isArray(dayEntry.assignedUsers) ? dayEntry.assignedUsers : [];
              if (assignedUsers.length > 0) {
                assignments.push(...assignedUsers);
              }
            }
          }
        }
      }
    }

    return assignments;
  };

  return {
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
  };
}
