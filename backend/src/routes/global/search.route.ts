import express from "express";
import { globalSearch } from "../../controllers/global/search/search.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import protectRoute from "../../middleware/protectedRoute";

const router = express.Router();

router.get(
  "/",
  protectRoute,
  authMiddleware([]), // All authenticated users can search
  globalSearch
);

export default router;

