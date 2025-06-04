const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const user_service = require("../services/user_service");
const dotenv = require("dotenv");
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Giả sử hàm `findOrCreateGoogleUser` sẽ tìm hoặc tạo người dùng mới
        const user = await user_service.findOrCreateGoogleUser(profile);
        return done(null, user); // Trả về user đã tìm thấy hoặc tạo mới
      } catch (err) {
        return done(err, null); // Nếu có lỗi, trả về lỗi
      }
    }
  )
);

// Serialize the user into the session (cần lưu id vào session)
passport.serializeUser((user, done) => {
  done(null, user.user_id); // Lưu user_id vào session (nếu sử dụng user_id)
});

// Deserialize the user from the session (khôi phục lại user từ session)
passport.deserializeUser(async (id, done) => {
  try {
    // Tìm người dùng dựa trên user_id
    const user = await user_service.getUserById(id);
    done(null, user); // Trả về người dùng tìm được
  } catch (err) {
    done(err, null); // Nếu có lỗi, trả về lỗi
  }
});

module.exports = passport;
