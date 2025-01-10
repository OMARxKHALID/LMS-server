import express from "express";
import {
  createUser,
  loginUser,
  getUserProfile,
  logOutUser,
  requestPasswordReset,
  resetPassword,
  getAllUsers,
  updateUser,
  updateUserAddress,
  getUserTransactions,
  getUserAddress,
  getUserBorrowedBooks,
} from "../controllers/userController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/auth/register", createUser);
router.post("/auth/login", loginUser);
router.post("/auth/logout", authenticate, logOutUser);
router.get("/auth/profile", authenticate, getUserProfile);
router.post("/auth/request-password-reset", requestPasswordReset);
router.post("/auth/reset-password/:token", resetPassword);
router.put("/auth/user/:userId", authenticate, updateUser);
router.post("/auth/users", authenticate, getAllUsers);
router.get("/auth/user/transactions", getUserTransactions);
router.put("/auth/user/address", updateUserAddress);
router.get("/auth/user/address", getUserAddress);
router.get("/auth/user/:userId/borrowed-books", getUserBorrowedBooks);

export default router;
