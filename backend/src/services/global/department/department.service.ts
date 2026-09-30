import mongoose from "mongoose";
import { ServiceError } from "src/utils/global/error";
import Department from "../../../models/global/department.model";
import type {
  CreateDepartmentBodyInput,
  DepartmentDoc,
  IDepartment,
} from "../../../types/global/department/department.type";

function toDepartmentDoc(raw: any): DepartmentDoc {
  return {
    _id: String(raw._id),
    name: String(raw.name),
    type: String(raw.type),
    description: String(raw.description ?? ""),
    head: raw.head ? String(raw.head) : null,
    members: Array.isArray(raw.members)
      ? raw.members.map((m: any) => String(m))
      : [],
    location: String(raw.location ?? ""),
    status: Boolean(raw.status),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    createdBy: raw.createdBy ? String(raw.createdBy) : undefined,
  };
}

const toObjectId = (id: string) =>
  mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id;

/* --------------------------------- Create --------------------------------- */
export async function createDepartmentService(
  input: CreateDepartmentBodyInput
): Promise<DepartmentDoc> {
  const { name, type } = input;

  if (!name?.trim()) throw new ServiceError("name is required", 400);
  if (!type?.trim()) throw new ServiceError("type is required", 400);

  try {
    const doc: Partial<IDepartment> = {
      name: name.trim(),
      type: type.trim(),
      description: input.description?.trim() ?? "",
      head: input.head ? (toObjectId(input.head) as any) : null,
      members: Array.isArray(input.members)
        ? (input.members.map((m) => toObjectId(m)) as any)
        : [],
      location: input.location?.trim() ?? "",
      status: typeof input.status === "boolean" ? input.status : true,
      createdBy: input.createdBy
        ? (toObjectId(input.createdBy) as any)
        : undefined,
    };

    const created = await Department.create(doc);
    const plain =
      typeof created.toObject === "function" ? created.toObject() : created;
    return toDepartmentDoc(plain);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("duplicate key error")) {
      throw new ServiceError("Department name must be unique", 400);
    }
    throw err;
  }
}

/* ---------------------------------- Read ---------------------------------- */
export async function getDepartmentByIdService(
  departmentId: string
): Promise<DepartmentDoc> {
  const dep = await Department.findById(departmentId).lean();
  if (!dep) throw new ServiceError("Department not found", 404);
  return toDepartmentDoc(dep);
}

export async function getAllDepartmentsService(): Promise<DepartmentDoc[]> {
  const deps = await Department.find().lean();
  if (!deps.length) throw new ServiceError("No departments found", 404);
  return deps.map(toDepartmentDoc);
}

/* --------------------------------- Update --------------------------------- */
export async function updateDepartmentService(
  departmentId: string,
  input: {
    name?: string;
    type?: string;
    description?: string;
    head?: mongoose.Types.ObjectId | string | null;
    members?: Array<mongoose.Types.ObjectId | string>;
    location?: string;
    status?: boolean;
  }
) {
  const dep = await Department.findById(departmentId);
  if (!dep) throw new ServiceError("Department not found", 404);

  if (typeof input.name === "string") dep.name = input.name.trim();
  if (typeof input.type === "string") dep.type = input.type.trim();
  if (typeof input.description === "string")
    dep.description = input.description.trim();
  if (typeof input.location === "string") dep.location = input.location.trim();
  if (typeof input.status === "boolean") dep.status = input.status;

  if (input.head !== undefined) {
    dep.head =
      input.head === null
        ? null
        : new mongoose.Types.ObjectId(String(input.head));
  }

  if (Array.isArray(input.members)) {
    dep.members = input.members.map(
      (m) => new mongoose.Types.ObjectId(String(m))
    ) as any;
  }

  await dep.save();
  const plain = typeof dep.toObject === "function" ? dep.toObject() : dep;
  return toDepartmentDoc(plain);
}

/* ---------------------------- Head / Members ops --------------------------- */
export async function setDepartmentHeadService(args: {
  departmentId: string;
  headId: string | null;
}): Promise<void> {
  const { departmentId, headId } = args;
  const dep = await Department.findById(departmentId);
  if (!dep) throw new ServiceError("Department not found", 404);

  dep.head = headId ? (toObjectId(headId) as any) : null;
  await dep.save();
}

export async function addMembersService(args: {
  departmentId: string;
  memberIds: string[];
}): Promise<DepartmentDoc> {
  const { departmentId, memberIds } = args;
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    throw new ServiceError("memberIds is required", 400);
  }

  const updated = await Department.findByIdAndUpdate(
    departmentId,
    {
      $addToSet: {
        members: { $each: memberIds.map((m) => toObjectId(m)) },
      },
    },
    { new: true }
  ).lean();

  if (!updated) throw new ServiceError("Department not found", 404);
  return toDepartmentDoc(updated);
}

export async function removeMemberService(args: {
  departmentId: string;
  memberId: string;
}): Promise<DepartmentDoc> {
  const { departmentId, memberId } = args;

  const updated = await Department.findByIdAndUpdate(
    departmentId,
    { $pull: { members: toObjectId(memberId) } },
    { new: true }
  ).lean();

  if (!updated) throw new ServiceError("Department not found", 404);
  return toDepartmentDoc(updated);
}

/* --------------------------------- Delete --------------------------------- */

export async function deleteDepartmentService(
  departmentId: string
): Promise<void> {
  if (!mongoose.isValidObjectId(departmentId)) {
    throw new ServiceError("Invalid department id", 400);
  }

  const dep = await Department.findById(departmentId);
  if (!dep) throw new ServiceError("Department not found", 404);

  await dep.deleteOne();
}
