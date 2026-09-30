import mongoose from "mongoose";
import { ServiceError } from "src/utils/global/error";
import Workplace from "../../../models/workforce/workplace.model";
import type {
  CreateWorkplaceBodyInput,
  WorkplaceDoc,
} from "../../../types/workforce/workplace/workplace.type";
import { toWorkplaceDoc } from "src/utils/workplace/workplace.utils";

export async function createWorkplaceService(
  input: CreateWorkplaceBodyInput
): Promise<WorkplaceDoc> {
  const { name, workstationCount, stationNames } = input;

  if (!name?.trim()) throw new ServiceError("name is required", 400);
  if (!Number.isInteger(workstationCount) || workstationCount < 1) {
    throw new ServiceError("workstationCount must be >= 1", 400);
  }

  try {
    const wp = await Workplace.create({ name: name.trim(), workstationCount });

    if (Array.isArray(stationNames)) {
      if (stationNames.length !== workstationCount) {
        throw new ServiceError(
          "stationNames length must match workstationCount",
          400
        );
      }
      wp.workstations.forEach((ws: any, i: number) => {
        ws.stationName = String(stationNames[i] ?? `Station ${i + 1}`);
      });
      await wp.save();
    }

    return toWorkplaceDoc(wp.toObject());
  } catch (error: any) {
    if (error?.message?.includes("duplicate key error")) {
      throw new ServiceError("Workplace name must be unique", 400);
    }
    throw error;
  }
}

export async function updateWorkplaceService(
  workplaceId: string,
  input: CreateWorkplaceBodyInput
): Promise<WorkplaceDoc> {
  const { name, workstationCount, stationNames } = input;

  if (!name?.trim()) throw new ServiceError("name is required", 400);
  if (!Number.isInteger(workstationCount) || workstationCount < 1) {
    throw new ServiceError("workstationCount must be >= 1", 400);
  }

  const wp = await Workplace.findById(workplaceId);
  if (!wp) throw new ServiceError("Workplace not found", 404);

  wp.name = name.trim();
  wp.workstationCount = workstationCount;

  if (Array.isArray(stationNames)) {
    if (stationNames.length !== workstationCount) {
      throw new ServiceError(
        "stationNames length must match workstationCount",
        400
      );
    }

    if (wp.workstations.length < workstationCount) {
      const additional = Array.from(
        { length: workstationCount - wp.workstations.length },
        (_, i) => ({
          _id: new mongoose.Types.ObjectId().toString(),
          stationName:
            stationNames[wp.workstations.length + i] ??
            `Station ${wp.workstations.length + i + 1}`,
          dates: [],
        })
      );
      wp.workstations.push(...additional);
    }

    if (wp.workstations.length > workstationCount) {
      wp.workstations = wp.workstations.slice(0, workstationCount);
    }

    wp.workstations.forEach((ws: any, i: number) => {
      ws.stationName = String(stationNames[i] ?? `Station ${i + 1}`);
    });
  }

  await wp.save();
  return toWorkplaceDoc(wp);
}

export async function deleteWorkplaceService(
  workplaceId: string
): Promise<void> {
  const deleted = await Workplace.findByIdAndDelete(workplaceId);
  if (!deleted) throw new ServiceError("Workplace not found", 404);
}

export async function updateWorkstationService(
  workplaceId: string,
  workstationId: string,
  stationName: string
): Promise<void> {
  if (!stationName.trim())
    throw new ServiceError("stationName is required", 400);

  const wp = await Workplace.findById(workplaceId);
  if (!wp) throw new ServiceError("Workplace not found", 404);

  const workstation = wp.workstations.find(
    (ws: any) => String(ws._id) === workstationId
  );
  if (!workstation) throw new ServiceError("Workstation not found", 404);

  workstation.stationName = stationName.trim();
  await wp.save();
}

export async function deleteWorkstationService(
  workplaceId: string,
  workstationId: string
): Promise<void> {
  const wp: any = await Workplace.findById(workplaceId);
  if (!wp) throw new ServiceError("Workplace not found", 404);

  const index = wp.workstations.findIndex(
    (ws: any) => String(ws._id) === workstationId
  );
  if (index === -1) throw new ServiceError("Workstation not found", 404);

  wp.workstations.splice(index, 1);
  await wp.save();
}

export async function getAllWorkplacesService(): Promise<WorkplaceDoc[]> {
  const workplaces = await Workplace.find().lean();
  // Return empty array instead of throwing error when no workplaces exist
  if (!workplaces || workplaces.length === 0) return [];
  return workplaces.map((wp: any) => toWorkplaceDoc(wp));
}
