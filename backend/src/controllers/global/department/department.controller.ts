// src/controllers/department.controller.ts
import { Request, Response } from "express";
import {
  addMembersService,
  createDepartmentService,
  deleteDepartmentService,
  getAllDepartmentsService,
  getDepartmentByIdService,
  removeMemberService,
  setDepartmentHeadService,
  updateDepartmentService,
} from "src/services/global/department/department.service";
import { ServiceError } from "src/utils/global/error";
import { getUserFromCookie } from "src/utils/global/getCookie";

/* -------------------------------------------------------------------------- */
/*                                   CREATE                                   */
/* -------------------------------------------------------------------------- */
export const createDepartment = async (req: Request, res: Response) => {
  try {
    const me = getUserFromCookie(req);
    if (!me?.id) return res.status(401).json({ message: "Not authenticated" });

    const { name, type, description, head, members, location, status } =
      req.body as {
        name?: string;
        type?: string;
        description?: string;
        head?: string;
        members?: string[];
        location?: string;
        status?: boolean;
      };

    const department = await createDepartmentService({
      name: name ?? "",
      type: type ?? "",
      description,
      head,
      members: Array.isArray(members) ? members : [],
      location,
      status,
      createdBy: me.id,
    });

    return res
      .status(201)
      .json({ message: "Department created successfully", department });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("createDepartment error:", err);
    return res.status(500).json({ message: "Failed to create department" });
  }
};

/* -------------------------------------------------------------------------- */
/*                                    READ                                    */
/* -------------------------------------------------------------------------- */
export const getAllDepartments = async (_req: Request, res: Response) => {
  try {
    const departments = await getAllDepartmentsService();
    return res
      .status(200)
      .json({ message: "Departments retrieved successfully", departments });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("getAllDepartments error:", err);
    return res.status(500).json({ message: "Failed to retrieve departments" });
  }
};

export const getDepartmentById = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params as { departmentId?: string };
    if (!departmentId) {
      return res.status(400).json({ message: "Department ID is required" });
    }

    const department = await getDepartmentByIdService(departmentId);
    return res
      .status(200)
      .json({ message: "Department retrieved successfully", department });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("getDepartmentById error:", err);
    return res.status(500).json({ message: "Failed to retrieve department" });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   UPDATE                                   */
/* -------------------------------------------------------------------------- */
export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params as { departmentId?: string };
    if (!departmentId) {
      return res.status(400).json({ message: "Department ID is required" });
    }

    const { name, type, description, head, members, location, status } =
      req.body as {
        name?: string;
        type?: string;
        description?: string;
        head?: string | null;
        members?: string[];
        location?: string;
        status?: boolean;
      };

    const department = await updateDepartmentService(departmentId, {
      name,
      type,
      description,
      head: head ?? undefined,
      members: Array.isArray(members) ? members : undefined,
      location,
      status,
    });

    return res
      .status(200)
      .json({ message: "Department updated successfully", department });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("updateDepartment error:", err);
    return res.status(500).json({ message: "Failed to update department" });
  }
};

/* ------------------------------ HEAD OPERATIONS --------------------------- */
export const setDepartmentHead = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params as { departmentId?: string };
    const { headId } = req.body as { headId?: string | null };

    if (!departmentId) {
      return res.status(400).json({ message: "Department ID is required" });
    }

    await setDepartmentHeadService({
      departmentId,
      headId: headId ?? null,
    });

    return res
      .status(200)
      .json({ message: "Department head updated successfully" });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("setDepartmentHead error:", err);
    return res
      .status(500)
      .json({ message: "Failed to update department head" });
  }
};

/* ----------------------------- MEMBER OPERATIONS -------------------------- */
export const addDepartmentMembers = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params as { departmentId?: string };
    const { memberIds } = req.body as { memberIds?: string[] };

    if (!departmentId) {
      return res.status(400).json({ message: "Department ID is required" });
    }
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "memberIds is required" });
    }

    const department = await addMembersService({ departmentId, memberIds });
    return res
      .status(200)
      .json({ message: "Members added successfully", department });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("addDepartmentMembers error:", err);
    return res.status(500).json({ message: "Failed to add members" });
  }
};

export const removeDepartmentMember = async (req: Request, res: Response) => {
  try {
    const { departmentId, memberId } = req.params as {
      departmentId?: string;
      memberId?: string;
    };

    if (!departmentId) {
      return res.status(400).json({ message: "Department ID is required" });
    }
    if (!memberId) {
      return res.status(400).json({ message: "Member ID is required" });
    }

    const department = await removeMemberService({ departmentId, memberId });
    return res
      .status(200)
      .json({ message: "Member removed successfully", department });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("removeDepartmentMember error:", err);
    return res.status(500).json({ message: "Failed to remove member" });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   DELETE                                   */
/* -------------------------------------------------------------------------- */
export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params as { departmentId?: string };
    if (!departmentId) {
      return res.status(400).json({ message: "Department ID is required" });
    }

    await deleteDepartmentService(departmentId);
    return res.status(200).json({ message: "Department deleted successfully" });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("deleteDepartment error:", err);
    return res.status(500).json({ message: "Failed to delete department" });
  }
};
