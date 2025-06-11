const express = require("express");
const homeController = require("../controllers/homeController");
const passport = require("passport");
const {
  getPaymentPage,
  postCheckout,
  handleVNPayReturn,
  handleVNPayIPN,
  getBookingInfo,
  confirmCashPayment,
  getCashPaymentReport,
} = require("../controllers/paymentController");
const adminRoutes = require("./adminRoutes");

let router = express.Router();

let initWebRoutes = (app) => {
  // ✅ Home routes
  router.get("/", homeController.getHomePage);
  router.get("/SignUp", homeController.getSignUp);
  router.post("/Register", homeController.postRegister);
  router.get("/login", homeController.getLogin);
  router.post("/login", homeController.postLogin);
  router.get("/logout", homeController.getLogout);

  // ✅ Search routes
  router.get("/search", homeController.searchRoom);
  router.get("/search/ajax", homeController.searchRoomAjax);
  // router.get("/room/:id", homeController.getRoomDetail);
  router.get("/room/:slug", homeController.getRoomDetailBySlug);

  // ✅ Payment routes
  router.get("/payment", getPaymentPage);
  router.post("/payment", postCheckout);
  router.post("/checkout", postCheckout);
  router.get("/vnpay_return", handleVNPayReturn);
  router.get("/vnpay_ipn", handleVNPayIPN);
  router.post("/vnpay_ipn", handleVNPayIPN);

  // ✅ API routes cho payment
  router.get("/api/vnpay_return", handleVNPayReturn);
  router.get("/api/vnpay_ipn", handleVNPayIPN);
  router.post("/api/vnpay_ipn", handleVNPayIPN);
  router.post("/api/checkout", postCheckout);

  // ✅ Payment result pages
  router.get("/payment-success", (req, res) => {
    const { order_id, transaction_id, amount } = req.query;

    res.render("Payment/success", {
      title: "Thanh toán thành công",
      order_id,
      transaction_id,
      amount: amount ? parseFloat(amount).toLocaleString("vi-VN") + " ₫" : null,
      user: req.session?.user || null,
    });
  });

  router.get("/payment-failed", (req, res) => {
    const { order_id, error, code } = req.query;

    res.render("Payment/failed", {
      title: "Thanh toán thất bại",
      order_id,
      error: error ? decodeURIComponent(error) : "Giao dịch không thành công",
      code: code || "ERR_PAYMENT_FAILED",
      user: req.session?.user || null,
    });
  });

  // ✅ Booking management routes
  router.get("/booking/:order_id", getBookingInfo);
  router.post("/booking/:order_id/confirm-cash", confirmCashPayment);
  router.get("/cash-report", getCashPaymentReport);

  // ✅ API endpoint để check trạng thái payment
  router.get("/api/payment-status/:order_id", async (req, res) => {
    try {
      const { order_id } = req.params;

      // Basic validation
      if (!order_id) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã đơn hàng",
        });
      }

      return res.json({
        success: true,
        status: {
          order_id: order_id,
          booking_status: "pending",
          payment_status: "pending",
          payment_method: "vnpay",
          message: "API đang được phát triển",
        },
      });
    } catch (error) {
      console.error("Payment status check error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi hệ thống khi kiểm tra trạng thái thanh toán",
      });
    }
  });

  // ✅ Google Auth routes
  router.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  router.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      if (req.session && req.user) {
        req.session.user = {
          user_id: req.user.user_id,
          id: req.user.user_id,
          name: req.user.name,
          email: req.user.email,
        };

        console.log("✅ Đã lưu user Google vào session:", req.session.user);

        req.session.save((err) => {
          if (err) {
            console.error("❌ Google session save error:", err);
          }
          res.redirect("/");
        });
      } else {
        console.log("❌ Không có session hoặc user sau xác thực Google");
        res.redirect("/login");
      }
    }
  );

  // ✅ Password reset routes
  router.get("/forget-password", homeController.getForgotPassword);
  router.post("/forget-password", homeController.postForgotPassword);
  router.get("/reset-password/:token", homeController.getResetPassword);
  router.post("/reset-password/:token", homeController.postResetPassword);

  // ✅ User account routes
  router.get("/account", homeController.getUserInfoPage);
  router.get("/bookings", homeController.getUserInfoPage);
  router.post("/account/update", homeController.postUpdateUserInfo);
  router.post("/change-password", homeController.postChangePassword);

  // ✅ Booking management
  router.post("/booking/cancel", homeController.cancelBooking);

  // ✅ Test routes (có thể xóa trong production)
  router.get("/test-payment-success", (req, res) => {
    res.redirect(
      "/payment-success?order_id=TEST123&transaction_id=VNP123&amount=500000"
    );
  });

  router.get("/test-payment-failed", (req, res) => {
    res.redirect(
      "/payment-failed?order_id=TEST123&error=invalid_signature&code=97"
    );
  });

  router.get("/test-session", (req, res) => {
    if (!req.session) {
      return res.send("Session không tồn tại!");
    }

    req.session.count = (req.session.count || 0) + 1;
    res.send(
      `Session count: ${req.session.count}, Session ID: ${req.sessionID}`
    );
  });

  // ✅ Health check route
  router.get("/health", (req, res) => {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
    });
  });

  // ✅ API info route
  router.get("/api", (req, res) => {
    res.json({
      message: "Sweet Home Vũng Tàu API",
      version: "1.0.0",
      endpoints: [
        "GET /api/payment-status/:order_id",
        "POST /api/checkout",
        "GET /api/vnpay_return",
        "GET|POST /api/vnpay_ipn",
        "GET /health",
        "GET /test-payment-success",
        "GET /test-payment-failed",
      ],
    });
  });

  // ✅ Admin routes - Mount tất cả admin routes với prefix /admin
  router.use("/admin", adminRoutes);

  return app.use("/", router);
};

module.exports = initWebRoutes;
