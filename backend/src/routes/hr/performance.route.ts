import express from "express";
import protectRoute from "src/middleware/protectedRoute";
import {
    createPerformanceReviewController,
    getAllPerformanceReviewsController,
    getPerformanceReviewByIdController,
    getPerformanceReviewsByEmployeeController,
    getPerformanceReviewsByReviewerController,
    updatePerformanceReviewController,
    deletePerformanceReviewController,
    acknowledgePerformanceReviewController,
} from "../../controllers/hr/performance/performance.controller";

const router = express.Router();

router.get("/", protectRoute, getAllPerformanceReviewsController);

router.get("/:reviewId", protectRoute, getPerformanceReviewByIdController);

router.get(
    "/employee/:employeeId",
    protectRoute,
    getPerformanceReviewsByEmployeeController
);

router.get(
    "/reviewer/:reviewerId",
    protectRoute,
    getPerformanceReviewsByReviewerController
);

router.post("/create", protectRoute, createPerformanceReviewController);

router.put("/:reviewId", protectRoute, updatePerformanceReviewController);

router.patch("/:reviewId/acknowledge", protectRoute, acknowledgePerformanceReviewController);

router.delete("/:reviewId", protectRoute, deletePerformanceReviewController);

export default router;
