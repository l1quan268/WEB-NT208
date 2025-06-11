// File: routes/payment.js

const express = require('express');
const router = express.Router();
const { 
  postCheckout, 
  getPaymentPage, 
  handleVNPayReturn, 
  handleVNPayIPN, 
  getBookingInfo, 
  confirmCashPayment, 
  getCashPaymentReport,
  healthCheck 
} = require('../controllers/paymentController');

// --------- AUTH MIDDLEWARE (bổ sung) ---------
function requireLogin(req, res, next) {
  // Nếu đã có req.user (passport), hoặc req.session.user, hoặc token tuỳ hệ thống
  // Ví dụ dùng passport:
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  // Nếu lưu user trong session:
  if (req.session && req.session.user) {
    return next();
  }
  // Nếu dùng JWT thì decode từ token kiểm tra...
  // Nếu không đăng nhập thì chuyển hướng sang trang đăng nhập
  // Có thể lưu lại đường dẫn để redirect lại sau đăng nhập
  req.session.redirectTo = req.originalUrl;
  return res.redirect('/login');
}

// --------- Debug middleware ---------
router.use((req, res, next) => {
  if (req.originalUrl.includes('checkout') || req.originalUrl.includes('payment')) {
    console.log(`💳 [Payment Route] ${req.method} ${req.originalUrl}`);
    console.log('💳 Payment data:', req.body);
  }
  next();
});

// --------- Health check route ---------
router.get("/health", healthCheck);

// --------- MAIN CHECKOUT ROUTE ---------
router.post("/checkout", postCheckout);

// --------- VNPay routes ---------
router.get("/vnpay_return", handleVNPayReturn);
router.get("/vnpay_ipn", handleVNPayIPN);

// --------- Booking management routes ---------
router.get("/booking/:order_id", getBookingInfo);
router.post("/cash-payment/:order_id/confirm", confirmCashPayment);
router.get("/cash-payment/report", getCashPaymentReport);

// --------- Payment page route ---------
// Bắt buộc đăng nhập mới xem được trang này
router.get("/payment", requireLogin, getPaymentPage);

module.exports = router;
