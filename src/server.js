import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
// Thay đổi từ "../config/viewEngine.js" thành "./config/viewEngine.js"
import viewEngine from "./config/viewEngine.js";
import initWebRoutes from "./route/web.js";
import connectDB from "./config/connectDb.js";
import passport from "./config/passport.js";
import dotenv from "dotenv";

dotenv.config(); // Load biến môi trường từ .env

const app = express();

// Middleware phân tích body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// View engine & route
viewEngine(app);
initWebRoutes(app);

// Database
try {
  connectDB();
} catch (error) {
  console.error("❌ Error connecting to the database:", error);
}

// Start server
const port = process.env.PORT || 9999;
app.listen(port, () => {
  console.log(`✅ Backend Node.js is running on port: ${port}`);
});