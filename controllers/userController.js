import generateTokenAndSetCookie from "../utils/helpers/generateTokenAndSetCookie.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import Transaction from "../models/transactionModel.js";
import User from "../models/userModel.js";
import Borrow from "../models/borrowModel.js";

// Create new user
export const createUser = async (req, res) => {
  try {
    const { username, email, full_name, password, role } = req.body;

    if (!username || !email || !full_name || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email or username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      full_name,
      password: hashedPassword,
      role,
    });

    await newUser.save();

    // Generate token and set it in the cookie
    generateTokenAndSetCookie(newUser._id, res);

    res.status(201).json({
      message: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Error creating user:", error);
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

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate token and set it in the cookie
    const token = generateTokenAndSetCookie(user._id, res);

    res.json({
      message: "LOGGED-IN",
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance,
      transactions: user.transactions,
      address: user.address || {},
      borrowedBooks: user.borrowedBooks,
      token,
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
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpires = Date.now() + 24 * 60 * 60 * 1000; // 1 day
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
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
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
      message: "User updated successfully",
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance,
      transactions: user.transactions,

      address: user.address || {},
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Get user transactions
export const getUserTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user_id })
      .populate("book")
      .exec();

    if (!transactions || transactions.length === 0) {
      return res
        .status(404)
        .json({ message: "No transactions found for this user" });
    }

    res.json(transactions);
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Update user address
export const updateUserAddress = async (req, res) => {
  try {
    const { street, city, state, country, postalCode } = req.body;

    if (!street || !city || !state || !country || !postalCode) {
      return res
        .status(400)
        .json({ message: "All address fields are required" });
    }

    const user = await User.findById(req.user_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.address = { street, city, state, country, postalCode };
    await user.save();

    res.json({
      message: "Address updated successfully",
      address: user.address,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// Get user address
export const getUserAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.address) {
      return res.status(404).json({ message: "Address not set" });
    }

    res.json(user.address);
  } catch (error) {
    console.error("Error fetching user address:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

export const getUserBorrowedBooks = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const borrowedBooks = await Borrow.find({ borrowed_by: userId });

    res.json({
      message: "Borrowed books retrieved successfully",
      borrowedBooks,
    });
  } catch (error) {
    console.error("Error fetching borrowed books for user:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};
