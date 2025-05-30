import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import viewEngine from "./config/viewEngine";
import initWebRoutes from "./route/web";
import connectDB from "./config/connectDb";
import passport from "./config/passport";
import apiRoutes from "./route/api.js";
require("dotenv").config();

const app = express();

//Body Parser ĐẶT TRƯỚC SESSION
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-fallback-secret-key-12345",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 giờ
    },
  })
);

// Passport SAU SESSION
app.use(passport.initialize());
app.use(passport.session());

//Kiểm tra session
app.use((req, res, next) => {
  console.log("=== SESSION DEBUG ===");
  console.log("URL:", req.url);
  console.log("Method:", req.method);
  console.log("Session ID:", req.sessionID);
  console.log("Session data:", req.session);
  console.log("Passport user:", req.user); // Passport lưu user ở req.user
  console.log("==================");
  next();
});

//View Engine và Routes
viewEngine(app);
initWebRoutes(app);
app.use("/api", apiRoutes);

connectDB();

const port = process.env.PORT || 6969;
app.listen(port, () => {
  console.log(`Backend Nodejs is running on port: ${port}`);
});
