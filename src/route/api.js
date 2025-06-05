const express = require("express");
const homeController = require("../controllers/homeController");

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`🔍 [${new Date().toISOString()}] API Route: ${req.method} ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("📝 Request body:", req.body);
  }
  next();
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Payment API is running",
    endpoints: {
      health: "GET /api/health",
      checkout: "POST /api/checkout",
      vnpay_return: "GET /vnpay_return", // Không cần đặt trong /api nếu đã có ở web.js
      vnpay_ipn: "GET /api/vnpay_ipn",   // Nếu có xử lý IPN riêng
      review: "POST /api/review"
    },
  });
});

// POST /api/review - Gửi đánh giá phòng
router.post("/review", homeController.postReview);

// Bạn có thể thêm các route khác như:
// router.post("/checkout", controller.postCheckout);
// router.get("/vnpay_ipn", controller.handleIPN);

module.exports = router;
