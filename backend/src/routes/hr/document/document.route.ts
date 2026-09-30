import express from "express";
import protectRoute from "../../../middleware/protectedRoute";
import { authMiddleware } from "../../../middleware/auth.middleware";
import {
  getDocuments,
  addDocument,
  deleteDocument,
  updateDocument,
} from "../../../controllers/hr/document/document.controller";

const router = express.Router();
router.use(protectRoute);

router.get("/all-documents", getDocuments);

router.post("/add-document", authMiddleware(["HR"]), addDocument);

router.put("/update-document/:id", authMiddleware(["HR"]), updateDocument);

router.delete("/delete-document/:id", authMiddleware(["HR"]), deleteDocument);

export default router;
