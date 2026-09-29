import express from "express";
import * as PayrollController from "../../../controllers/hr/payroll/payroll.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";
import protectRoute from "../../../middleware/protectedRoute";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protectRoute);
router.use(authMiddleware(["HR", "Operations Manager", "Admin"]));

router.post("/calculate", PayrollController.calculatePayroll);
router.get("/", PayrollController.getPayrolls);
router.put("/:id", PayrollController.updatePayroll);
router.delete("/:id", PayrollController.deletePayroll);

export default router;
