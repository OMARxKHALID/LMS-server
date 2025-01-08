import express from "express";
import {
  createBook,
  getBooks,
  getBook,
  deleteBook,
  editBook,
  purchaseBook,
} from "../controllers/bookController.js";

const router = express.Router();

router.post("/books", createBook);
router.get("/books", getBooks);
router.put("/books/:id", editBook);
router.get("/books/:id", getBook);
router.delete("/books/:id", deleteBook);
router.post("/books/purchase", purchaseBook);

export default router;
