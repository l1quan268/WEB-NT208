import express from "express";
import homeController from "../controllers/homeController";

let router = express.Router();

let initWebRoutes = (app) => {
  router.get("/", homeController.getHomePage);
  router.get("/SignUp", homeController.getSignUp);

  router.post("/Register", homeController.postRegister);
  router.get("/login", homeController.getLogin);

  router.get("/search", homeController.searchRoom);
  return app.use("/", router);
};
module.exports = initWebRoutes;
