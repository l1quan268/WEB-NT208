import express from "express";
import homeController from "../controllers/homeController.js"; // ✅ Added .js
import { getPaymentPage, handleVNPayReturn } from "../controllers/paymentController.js"; // ✅ Named import
import passport from "passport";

let router = express.Router();

let initWebRoutes = (app) => {
  router.get("/", homeController.getHomePage);
  router.get("/SignUp", homeController.getSignUp);
  router.post("/Register", homeController.postRegister);
  router.get("/login", homeController.getLogin);
  router.post("/login", homeController.postLogin);
  router.get("/logout", homeController.getLogout);

  router.get("/search", homeController.searchRoom);
  router.get("/search/ajax", homeController.searchRoomAjax);
<<<<<<< Updated upstream

  // Bắt đầu quá trình xác thực với Google
=======
  router.get("/room/:id", homeController.getRoomDetail);

  // ✅ Payment routes (remove duplicate)
  router.get("/payment", getPaymentPage);
  router.get("/vnpay_return", handleVNPayReturn);

  // Google Auth
>>>>>>> Stashed changes
  router.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );
<<<<<<< Updated upstream

  // Google sẽ redirect về đây sau khi xác thực thành công
=======
>>>>>>> Stashed changes
  router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login",
    }),
    (req, res) => {
<<<<<<< Updated upstream
      // Sau khi xác thực thành công, lưu user vào session
      if (req.session && req.user) {
        req.session.user = {
=======
      if (req.session && req.user) {
        req.session.user = {
          user_id: req.user.user_id,
>>>>>>> Stashed changes
          id: req.user.user_id,
          name: req.user.name,
          email: req.user.email,
        };
<<<<<<< Updated upstream
        console.log("Đã lưu user Google vào session:", req.session.user);
      } else {
        console.log("Không có session hoặc user sau xác thực Google");
=======

        console.log("✅ Đã lưu user Google vào session:", req.session.user);
        req.session.save((err) => {
          if (err) console.error("❌ Google session save error:", err);
          res.redirect("/");
        });
      } else {
        res.redirect("/login");
>>>>>>> Stashed changes
      }

      // Chuyển hướng về trang chủ
      res.redirect("/");
    }
  );

  // Quên mật khẩu
  router.get("/forget-password", homeController.getForgotPassword);
  router.post("/forget-password", homeController.postForgotPassword);
  router.get("/reset-password/:token", homeController.getResetPassword);
  router.post("/reset-password/:token", homeController.postResetPassword);

  router.get("/test-session", (req, res) => {
    if (!req.session) return res.send("Session không tồn tại!");
    req.session.count = (req.session.count || 0) + 1;
    res.send(`Session count: ${req.session.count}, ID: ${req.sessionID}`);
  });

  return app.use("/", router);
};

export default initWebRoutes; // ✅ ES6 export