// route/paymentRoutes.js - Create this file

import express from "express";
import { 
  postCheckout, 
  getPaymentPage, 
  handleVNPayReturn, 
  handleVNPayIPN,
  getBookingInfo,
  confirmCashPayment,
  getCashPaymentReport
} from "../controllers/paymentController.js";

const router = express.Router();

// Debug middleware for payment routes
router.use((req, res, next) => {
  if (req.originalUrl.includes('checkout') || req.originalUrl.includes('payment')) {
    console.log(`💳 [Payment Route] ${req.method} ${req.originalUrl}`);
    console.log('💳 Payment data:', req.body);
  }
  next();
});

// **MAIN CHECKOUT ROUTE**
router.post("/checkout", postCheckout);

// **Alternative routes for testing**
router.post("/test-cash-payment", postCheckout);
router.post("/test-checkout", postCheckout);

// **VNPay routes**
router.get("/vnpay_return", handleVNPayReturn);
router.get("/vnpay_ipn", handleVNPayIPN);

// **Booking management routes**
router.get("/booking/:order_id", getBookingInfo);
router.post("/cash-payment/:order_id/confirm", confirmCashPayment);
router.get("/cash-payment/report", getCashPaymentReport);

// **Payment page route (if needed)**
router.get("/payment", getPaymentPage);

export default router;