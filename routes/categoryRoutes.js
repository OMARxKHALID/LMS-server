import express from "express";
import {
  createCategory,
  getCategories,
  getCategory,
  deleteCategory,
  updateCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

router.post("/categories", createCategory);
router.get("/categories", getCategories);
router.put("/categories/:id", updateCategory);
router.get("/categories/:id", getCategory);
router.delete("/categories/:id", deleteCategory);

export default router;
