import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const authenticate = async (req, res, next) => {
  const token =
    req.cookies.jwt || req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // Verify token using JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user details excluding the password
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Attach user to the request object for further use
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    // Return a generic error message
    res
      .status(401)
      .json({ error: "Not authorized. Invalid or expired token." });
  }
};
