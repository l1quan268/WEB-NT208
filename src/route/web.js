import express from "express";
import { requireAdmin } from "../middlewares/authMiddleware.js";
import homeController from "../controllers/homeController";
import passport from "passport";

let router = express.Router();

let initWebRoutes = (app) => {
  // ==== Trang người dùng ====
  router.get("/", homeController.getHomePage);
  router.get("/SignUp", homeController.getSignUp);
  router.post("/Register", homeController.postRegister);
  router.get("/login", homeController.getLogin);
  router.post("/login", homeController.postLogin);
  router.get("/logout", homeController.getLogout);

  // ==== Tìm kiếm ====
  router.get("/search", homeController.searchRoom);
  router.get("/search/ajax", homeController.searchRoomAjax);

<<<<<<< Updated upstream
  // Bắt đầu quá trình xác thực với Google
=======
  // ==== Chi tiết phòng ====
  router.get("/room/:id", homeController.getRoomDetail);

  // ==== Google Auth ====
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
          role: req.user.role, // ✅ nếu bạn muốn phân quyền với Google login
        };
<<<<<<< Updated upstream
        console.log("Đã lưu user Google vào session:", req.session.user);
      } else {
        console.log("Không có session hoặc user sau xác thực Google");
=======

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

  // ==== Quên / Reset mật khẩu ====
  router.get("/forget-password", homeController.getForgotPassword);
  router.post("/forget-password", homeController.postForgotPassword);
  router.get("/reset-password/:token", homeController.getResetPassword);
  router.post("/reset-password/:token", homeController.postResetPassword);

  // ==== Admin routes (chỉ dành cho role = 'admin') ====
  router.get("/admin", requireAdmin, homeController.getAdminPage);
  router.post("/admin/add-user", requireAdmin, homeController.addUser);
  router.post("/admin/update-user/:id", requireAdmin, homeController.updateUser);
  router.post("/admin/delete-user/:id", requireAdmin, homeController.deleteUser);

  // ==== Route test session (tuỳ chọn) ====
  router.get("/test-session", (req, res) => {
    if (!req.session) return res.send("Session không tồn tại!");
    req.session.count = (req.session.count || 0) + 1;
    res.send(`Session count: ${req.session.count}, Session ID: ${req.sessionID}`);
  });

  // ==== Gắn router vào app ====
  return app.use("/", router);
};

module.exports = initWebRoutes;
