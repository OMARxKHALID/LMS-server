import express from "express";
import { getEarnings } from "../controllers/earningsController.js";

const router = express.Router();

router.get("/earnings", getEarnings);

export default router;
