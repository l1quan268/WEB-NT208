import express from "express";
import bodyParser from "body-parser";
import session from "express-session"; // Thêm dòng này
import viewEngine from "./config/viewEngine";
import initWebRoutes from "./route/web";
import connectDB from "./config/connectDb";
import passport from "./config/passport";
require("dotenv").config();

const app = express();

// --- Cấu hình Session Middleware (ĐẶT TRƯỚC CÁC ROUTE) ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-fallback-secret", // Mật khẩu bí mật
    resave: false, // Không lưu lại session nếu không thay đổi
    saveUninitialized: false, // Không lưu trữ session mới nếu chưa được khởi tạo
    cookie: {
      secure: process.env.NODE_ENV === "production", // Nếu ở môi trường production thì bật HTTPS
      httpOnly: true, // Cookie không thể được truy cập qua JavaScript
      maxAge: 24 * 60 * 60 * 1000, // Thời gian hết hạn session, ví dụ 1 ngày
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Các middleware khác (giữ nguyên)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

viewEngine(app);
initWebRoutes(app);

connectDB();

const port = process.env.PORT || 6969;
app.listen(port, () => {
  console.log(`Backend Nodejs is running on port: ${port}`);
});
