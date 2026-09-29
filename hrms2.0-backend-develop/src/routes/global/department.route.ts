import { Router } from "express";
import {
  addDepartmentMembers,
  createDepartment,
  deleteDepartment,
  getAllDepartments,
  getDepartmentById,
  removeDepartmentMember,
  setDepartmentHead,
  updateDepartment,
} from "src/controllers/global/department/department.controller";
import { authMiddleware } from "src/middleware/auth.middleware";
import protectRoute from "src/middleware/protectedRoute";

const router = Router();

router.get("/", protectRoute, getAllDepartments);

router.get("/:departmentId", protectRoute, getDepartmentById);

router.post(
  "/create",
  protectRoute,
  authMiddleware(["Operation Manager", "HR", "Workforce"]),
  createDepartment
);
router.post(
  "/:departmentId/members",
  protectRoute,
  authMiddleware(["Operation Manager", "HR", "Workforce"]),
  addDepartmentMembers
);

router.put(
  "/:departmentId",
  protectRoute,
  authMiddleware(["Operation Manager", "HR", "Workforce"]),
  updateDepartment
);

router.patch("/:departmentId/head", protectRoute, setDepartmentHead);

router.delete(
  "/:departmentId",
  protectRoute,
  authMiddleware(["Operation Manager", "HR", "Workforce"]),
  deleteDepartment
);

router.delete(
  "/:departmentId/members/:memberId",
  protectRoute,
  authMiddleware(["Operation Manager", "HR", "Workforce"]),
  removeDepartmentMember
);

export default router;
