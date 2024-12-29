import express from "express";
import { getEarnings } from "../controllers/earningsController.js";

const router = express.Router();

router.get("/earnings/:userId", getEarnings);

export default router;
