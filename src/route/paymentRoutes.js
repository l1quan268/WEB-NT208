// routes/paymentRoutes.js - Clean version for production
const express = require("express");
const {
  postCheckout,
  getPaymentPage,
  handleVNPayReturn,
  handleVNPayIPN,
  getBookingInfo,
  confirmCashPayment,
  getCashPaymentReport
} = require("../controllers/paymentController.js");

const router = express.Router();

// Payment page route
router.get("/payment", getPaymentPage);

// Main checkout route
router.post("/checkout", postCheckout);

// VNPay routes
router.get("/vnpay_return", handleVNPayReturn);
router.post("/vnpay_return", handleVNPayReturn); // Some VNPay configs use POST
router.get("/vnpay_ipn", handleVNPayIPN);
router.post("/vnpay_ipn", handleVNPayIPN); // IPN can be GET or POST

// Booking management routes
router.get("/booking/:order_id", getBookingInfo);
router.post("/cash-payment/:order_id/confirm", confirmCashPayment);
router.get("/cash-payment/report", getCashPaymentReport);

// Health check route for API connectivity test
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "payment-api"
  });
});

module.exports = router;