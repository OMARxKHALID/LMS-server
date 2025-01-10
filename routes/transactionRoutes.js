import express from "express";
import {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  deleteTransaction,
} from "../controllers/transactionController.js";

const router = express.Router();

router.post("/transactions", createTransaction);
router.get("/transactions", getAllTransactions);
router.get("/transactions/:transactionId", getTransactionById);
router.delete("/transactions/:transactionId", deleteTransaction);

export default router;
