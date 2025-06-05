<<<<<<< Updated upstream
const express = require("express");
const homeController = require("../controllers/homeController");
=======
// route/api.js - Mount paymentRoutes properly

import express from "express";
import homeController from "../controllers/homeController.js";
import paymentRoutes from "./paymentRoutes.js"; // **Import paymentRoutes file**
>>>>>>> Stashed changes

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`🔍 [${new Date().toISOString()}] API Route: ${req.method} ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📝 Request body:', req.body);
  }
  next();
});

// Health check route
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Payment API is running",
    endpoints: {
      health: "GET /api/health",
      checkout: "POST /api/checkout",
      vnpay_return: "GET /api/vnpay_return",
      vnpay_ipn: "GET /api/vnpay_ipn",
      review: "POST /api/review"
    }
  });
});

// ===== Đánh giá phòng =====
router.post("/review", homeController.postReview);

<<<<<<< Updated upstream
module.exports = router;
=======
// **MOUNT payment routes from paymentRoutes.js**
router.use("/", paymentRoutes);

export default router;
>>>>>>> Stashed changes
