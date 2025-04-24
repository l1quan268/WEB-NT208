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

  // Bắt đầu quá trình xác thực với Google
  router.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  // Google sẽ redirect về đây sau khi xác thực thành công
  router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login",
    }),
    (req, res) => {
      // Sau khi xác thực thành công, lưu user vào session
      if (req.session && req.user) {
        req.session.user = {
          id: req.user.user_id,
          name: req.user.name,
          email: req.user.email,
        };
        console.log("Đã lưu user Google vào session:", req.session.user);
      } else {
        console.log("Không có session hoặc user sau xác thực Google");
      }

      // Chuyển hướng về trang chủ
      res.redirect("/");
    }
  );

  router.get("/forget-password", homeController.getForgotPassword);
  router.post("/forget-password", homeController.postForgotPassword);
  router.get("/reset-password/:token", homeController.getResetPassword);
  router.post("/reset-password/:token", homeController.postResetPassword);

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
