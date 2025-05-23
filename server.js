import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/connect.js";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import borrowRoutes from "./routes/borrowRoutes.js";
import earningsRoutes from "./routes/earningsRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";

import cors from "cors";
// cofiguration
dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Configure CORS
const corsOptions = {
  origin: [CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

app.use("/api", userRoutes);
app.use("/api", bookRoutes);
app.use("/api", categoryRoutes);
app.use("/api", borrowRoutes);
app.use("/api", earningsRoutes);
app.use("/api", transactionRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

app.listen(PORT, () => {
  console.log(
    `Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});
