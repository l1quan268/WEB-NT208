// route/api.js - CommonJS version

const express = require("express");
const homeController = require("../controllers/homeController");
const chatController = require("../controllers/chatController");
const paymentRoutes = require("./paymentRoutes"); // ✅ Import CommonJS style

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(
    `🔍 [${new Date().toISOString()}] API Route: ${req.method} ${
      req.originalUrl
    }`
  );
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("📝 Request body:", req.body);
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
      review: "POST /api/review",
      chat_query: "POST /api/chat-query",
    },
  });
});

// ===== Đánh giá phòng =====
router.post("/review", homeController.postReview);
router.get("/rooms", homeController.getRoomsPaginated);

router.get("/room/:room_id/booked-dates", homeController.getBookedDates);

// ✅ Route cho chatbot
router.post("/chat-query", chatController.handleChatQuery);

// ✅ Mount các route con từ paymentRoutes.js
router.use("/", paymentRoutes);

module.exports = router;
