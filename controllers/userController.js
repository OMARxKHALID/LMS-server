import generateTokenAndSetCookie from "../utils/helpers/generateTokenAndSetCookie.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import User from "../models/userModel.js";

// Create new user
export const createUser = async (req, res) => {
  try {
    const { user_name, email, full_name, password } = req.body;

    if (!user_name || !email || !full_name || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { user_name }],
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already exists"
            : "Username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      user_name,
      email,
      full_name,
      password: hashedPassword,
    });
    await newUser.save();

    generateTokenAndSetCookie(newUser._id, res);
    res.status(201).json({
      message: "User created successfully",
      user: {
        user_name: newUser.user_name,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        status: newUser.status,
        _id: newUser._id,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Duplicate key error. Please check your input." });
    }
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// User login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check if user is inactive
    if (user.status === "inactive") {
      return res.status(403).json({
        message: "Your account has been revoked. Please contact ADMIN.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate token and set it in the cookie
    generateTokenAndSetCookie(user._id, res);

    res.json({
      message: "LOGGED-IN",
      _id: user._id,
      user_name: user.user_name,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      wallet_balance: user.wallet_balance,
      transactions: user.transactions,
      address: user.address,
      borrowed_books: user.borrowed_books,
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user_id)
      .populate("transactions")
      .exec();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        message: "Your account has been revoked. Please contact ADMIN.",
      });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Log out user
export const logOutUser = async (req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "none",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    console.error("Error logging out user:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Request password reset
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.reset_password_token = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.reset_password_expires = Date.now() + 24 * 60 * 60 * 1000; // 1 day
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await sendEmail({
      email: user.email,
      subject: "Password Reset Request",
      message: `To reset your password, please visit: ${resetUrl}`,
    });

    res.status(200).json({ message: "Reset link sent to email" });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Reset user password
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and password are required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    if (!userId || !updates) {
      return res
        .status(400)
        .json({ message: "User ID and updates are required" });
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user_name: user.user_name,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      wallet_balance: user.wallet_balance,
      address: user.address,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

export const revokeUserAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!userId || !status) {
      return res
        .status(400)
        .json({ message: "User ID and status are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.status === status) {
      return res.status(400).json({ message: `User is already ${status}` });
    }

    user.status = status;
    await user.save();

    res.status(200).json({ message: `User status updated to ${status}`, user });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// chnage user role
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Invalid role provided." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res
      .status(200)
      .json({ message: "Role updated successfully.", user: updatedUser });
  } catch (error) {
    console.error("Error updating user role:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};
