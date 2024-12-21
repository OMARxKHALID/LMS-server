import express from "express";
import {
  borrowBook,
  returnBook,
  getBorrowRecords,
} from "../controllers/borrowController.js";

const router = express.Router();

router.post("/borrow", borrowBook);
router.put("/borrow/return/:borrowId", returnBook);
router.get("/borrow/records", getBorrowRecords);

export default router;
