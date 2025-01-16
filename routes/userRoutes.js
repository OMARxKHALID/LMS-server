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
  updateUserRole,
} from "../controllers/userController.js";
import {
  authenticateUser,
  authorizeRole,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// Authentication routes
router.post("/auth/register", createUser);
router.post("/auth/login", loginUser);
router.post("/auth/logout", authenticateUser, logOutUser);

// User profile routes
router.get("/auth/profile", authenticateUser, getUserProfile);
router.put("/auth/profile/:userId", authenticateUser, updateUser);

// Password reset routes
router.post("/auth/password/reset-request", requestPasswordReset);
router.post("/auth/password/reset/:token", resetPassword);

// User management (Admin only) routes
router.get(
  "/auth/admin/users",
  authenticateUser,
  authorizeRole("admin"),
  getAllUsers
);
router.patch(
  "/auth/admin/users/:userId/status",
  authenticateUser,
  authorizeRole("admin"),
  revokeUserAccess
);
router.patch(
  "/auth/admin/users/:userId/role",
  authenticateUser,
  authorizeRole("admin"),
  updateUserRole
);

export default router;
