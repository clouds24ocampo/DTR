import type { WorkplaceDoc } from "../../types/workforce/workplace/workplace.type";

export function toWorkplaceDoc(raw: any): WorkplaceDoc {
  return {
    _id: String(raw._id),
    name: String(raw.name),
    workstationCount: Number(raw.workstationCount),
    workstations: (raw.workstations ?? []).map((ws: any) => ({
      _id: String(ws._id),
      stationName: String(ws.stationName),
      dates: (ws.dates ?? []).map((d: any) => ({
        date: String(d.date),
        assignedUsers: (d.assignedUsers ?? []).map((a: any) => ({
          userId: String(a.userId),
          label: String(a.label),
          scheduledStartTime: String(a.scheduledStartTime),
          scheduledEndTime: String(a.scheduledEndTime),
          startMealTime: Array.isArray(a.startMealTime)
            ? a.startMealTime.map(String)
            : [],
        })),
      })),
    })),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}
