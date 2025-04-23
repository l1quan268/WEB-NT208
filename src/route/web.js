import express from "express";
import homeController from "../controllers/homeController";

let router = express.Router();

let initWebRoutes = (app) => {
  router.get("/", homeController.getHomePage);
  router.get("/SignUp", homeController.getSignUp);

  router.post("/Register", homeController.postRegister);
  router.get("/login", homeController.getLogin);
  router.post("/login", homeController.postLogin);

  router.get("/search", homeController.searchRoom);
  // Thêm vào file route/web.js hoặc controller
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
