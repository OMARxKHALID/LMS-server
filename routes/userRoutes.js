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
  revokeUserAccess,
} from "../controllers/userController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Authentication and user management routes
router.post("/auth/register", createUser);
router.post("/auth/login", loginUser);
router.post("/auth/logout", authenticate, logOutUser);
router.get("/auth/profile", authenticate, getUserProfile);
router.post("/auth/request-password-reset", requestPasswordReset);
router.post("/auth/reset-password/:token", resetPassword);
router.put("/auth/user/:userId", authenticate, updateUser);
router.get("/auth/users", authenticate, getAllUsers);
router.patch("/auth/users/:userId", authenticate, revokeUserAccess);

export default router;
