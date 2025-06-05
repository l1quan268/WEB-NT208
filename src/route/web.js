import express from "express";
import homeController from "../controllers/homeController";
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

  router.get("/room/:id", homeController.getRoomDetail);

  // Bắt đầu quá trình xác thực với Google
  router.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  // Google sẽ redirect về đây sau khi xác thực thành công
  // Trong web.js - sửa Google callback
  router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login",
    }),
    (req, res) => {
      // ✅ SỬA: Lưu user với cùng format như login thường
      if (req.session && req.user) {
        req.session.user = {
          user_id: req.user.user_id, // ✅ Đồng nhất với login thường
          id: req.user.user_id, // ✅ Backup cho compatibility
          name: req.user.name,
          email: req.user.email,
        };

        console.log("✅ Đã lưu user Google vào session:", req.session.user);

        // ✅ SAVE SESSION EXPLICITLY
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

  router.get("/forget-password", homeController.getForgotPassword);
  router.post("/forget-password", homeController.postForgotPassword);
  router.get("/reset-password/:token", homeController.getResetPassword);
  router.post("/reset-password/:token", homeController.postResetPassword);

  router.get("/account", homeController.getUserInfoPage);
  router.get("/bookings", homeController.getUserInfoPage); // ✅ Lịch sử đặt phòng dùng lại cùng controller
  router.post("/account/update", homeController.postUpdateUserInfo);
  router.post("/change-password", homeController.postChangePassword);

  router.post("/booking/cancel", homeController.cancelBooking);


  router.get("/test-session", (req, res) => {
    if (!req.session) {
      return res.send("Session không tồn tại!");
    }

    if (!req.session.count) {
      req.session.count = 0;
    }

    req.session.count++;

    res.send(
      `Session count: ${req.session.count}, Session ID: ${req.sessionID}`
    );
  });

  return app.use("/", router);
};

module.exports = initWebRoutes;
