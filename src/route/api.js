import express from "express";
import homeController from "../controllers/homeController.js";

const router = express.Router();

// API: Gửi đánh giá
router.post("/review", homeController.postReview);

export default router;
