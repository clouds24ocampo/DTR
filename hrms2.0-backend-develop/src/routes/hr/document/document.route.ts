import express from "express";
import {
  getDocuments,
  addDocument,
  deleteDocument,
  updateDocument,
} from "../../../controllers/hr/document/document.controller";

const router = express.Router();

router.get("/all-documents", getDocuments);

router.post("/add-document", addDocument);

router.put("/update-document/:id", updateDocument);

router.delete("/delete-document/:id", deleteDocument);

export default router;
