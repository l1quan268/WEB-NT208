import db from "../models/index";
import user_service from "../services/user_service";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import sendEmail from "../utils/email";

let getHomePage = async (req, res) => {
  try {
    // Kiểm tra nếu session và user tồn tại
    const user = req.session && req.session.user ? req.session.user : null;

    return res.render("Home/Home.ejs", {
      user: user, // Truyền biến user sang view
    });
  } catch (error) {
    console.error(error);
    return res.render("Home/Home.ejs", {
      user: null, // Truyền user null nếu có lỗi
    });
  }
};

let getSignUp = (req, res) => {
  return res.render("Login/SignUp.ejs");
};

let getLogin = (req, res) => {
  return res.render("Login/login.ejs", {
    error: null,
    success: null,
  });
};

let postRegister = async (req, res) => {
  try {
    let message = await user_service.createUser(req.body);

    if (message === "Đăng ký thành công") {
      return res.render("Login/login.ejs", {
        success: "Đăng ký thành công! Vui lòng đăng nhập.",
        error: null, // Đảm bảo truyền cả error để không bị lỗi
      });
    } else {
      return res.render("Login/SignUp.ejs", {
        error: message,
      });
    }
  } catch (error) {
    console.log(error);
    return res.render("Login/SignUp.ejs", {
      error: "Đã có lỗi xảy ra!",
    });
  }
};

const { Op } = require("sequelize");

// let postLogin = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const result = await user_service.handleUserLogin(email, password);

//     if (result.success) {
//       req.session.user = result.user;
//       return res.redirect("/");
//     } else {
//       return res.render("Login/login.ejs", {
//         error: result.message,
//         success: null,
//       });
//     }
//   } catch (error) {
//     console.log(error);
//     return res.render("Login/login.ejs", {
//       error: "Đã có lỗi xảy ra khi đăng nhập!",
//       success: null,
//     });
//   }
// };
// let postLogin = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const result = await user_service.handleUserLogin(email, password);

//     if (result.success) {
//       // Kiểm tra lại req.session trước khi gán
//       if (!req.session) {
//         console.error("Session không tồn tại!");
//         throw new Error("Hệ thống session không hoạt động");
//       }

//       req.session.user = {
//         id: result.user.id,
//         name: result.user.name,
//         email: result.user.email,
//       };

//       console.log("Session sau khi gán:", req.session.user);
//       return res.redirect("/");
//     } else {
//       return res.render("Login/login.ejs", {
//         error: result.message,
//         success: null,
//       });
//     }
//   } catch (error) {
//     console.error("Lỗi đăng nhập:", error);
//     return res.render("Login/login.ejs", {
//       error: "Lỗi hệ thống",
//       success: null,
//     });
//   }
// };
let postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await user_service.handleUserLogin(email, password);

    if (result.success) {
      // Bỏ qua kiểm tra session
      try {
        // Thử lưu thông tin người dùng vào session
        if (req.session) {
          req.session.user = {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
          };
          console.log("Đã lưu session thành công:", req.session.user);
        } else {
          console.log("Session không tồn tại, nhưng vẫn chuyển hướng");
        }
      } catch (sessionError) {
        console.error("Lỗi khi lưu session:", sessionError);
      }

      // Luôn chuyển hướng về trang chủ, ngay cả khi không lưu được session
      return res.redirect("/");
    } else {
      return res.render("Login/login.ejs", {
        error: result.message,
        success: null,
      });
    }
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.render("Login/login.ejs", {
      error: "Lỗi hệ thống",
      success: null,
    });
  }
};

let getLogout = (req, res) => {
  // Kiểm tra xem session có tồn tại không
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Lỗi khi đăng xuất:", err);
        // Nếu có lỗi, chuyển hướng về trang chủ với thông báo lỗi (nếu bạn có cơ chế hiển thị flash message)
        return res.redirect("/?logoutError=1");
      }

      // Xóa cookie session (nếu sử dụng cookie-based session)
      res.clearCookie("connect.sid"); // hoặc tên cookie session của bạn

      // Chuyển hướng về trang chủ với thông báo đăng xuất thành công
      res.redirect("/?logoutSuccess=1");
    });
  } else {
    // Nếu không có session, vẫn chuyển hướng về trang chủ
    res.redirect("/");
  }
};

// Hiển thị form quên mật khẩu
let getForgotPassword = (req, res) => {
  res.render("Login/forget.ejs", {
    error: null,
    success: null,
  });
};

// Xử lý gửi email reset mật khẩu
let postForgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await db.User.findOne({ where: { email } });

    if (!user) {
      return res.render("Login/forget.ejs", {
        error: "Không tìm thấy người dùng với email này!",
        success: null,
      });
    }

    // Tạo token ngẫu nhiên
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    console.log("Token gửi qua email:", token);
    console.log("Token được lưu vào DB (băm):", hashedToken);
    // Lưu token và hạn sử dụng vào DB
    await db.User.update(
      {
        reset_token_hash: hashedToken,
        reset_token_expires_at: new Date(Date.now() + 3600000), // 1 giờ
      },
      { where: { email } }
    );

    // Gửi email
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/reset-password/${token}`;

    await sendEmail({
      to: email,
      subject: "Đặt lại mật khẩu",
      html: `
        <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>
        <p>Nhấn vào liên kết sau để tiếp tục:</p>
        <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
        <p>Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.</p>
      `,
    });
    return res.render("Login/forget.ejs", {
      success: "Đã gửi liên kết đặt lại mật khẩu qua email!",
      error: null,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.render("Login/forget.ejs", {
      error: "Có lỗi xảy ra!",
      success: null,
    });
  }
};

// Hiển thị form nhập mật khẩu mới (từ link trong email)
let getResetPassword = async (req, res) => {
  const token = req.params.token;

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await db.User.findOne({
      where: {
        reset_token_hash: hashedToken,
        reset_token_expires_at: { [Op.gt]: new Date() }, // Chưa hết hạn
      },
    });

    if (!user) {
      return res.send("Token không hợp lệ hoặc đã hết hạn!");
    }

    res.render("Login/resetPassword.ejs", { token });
  } catch (error) {
    console.error("Get reset password error:", error);
    res.send("Đã xảy ra lỗi!");
  }
};

// Xử lý lưu mật khẩu mới
let postResetPassword = async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render("Login/resetPassword.ejs", {
      token,
      error: "Mật khẩu không khớp!",
      success: null,
    });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await db.User.findOne({
      where: {
        reset_token_hash: hashedToken,
        reset_token_expires_at: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.send("Token không hợp lệ hoặc đã hết hạn!");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await user.update({
      password_hash: hashedPassword,
      reset_token_hash: null,
      reset_token_expires_at: null,
    });

    res.render("Login/login.ejs", {
      success: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập.",
      error: null,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.send("Có lỗi xảy ra!");
  }
};

let searchRoom = async (req, res) => {
  const checkin = req.query.checkin || "";
  const checkout = req.query.checkout || "";
  const adults = parseInt(req.query.adults) || 0;
  const children = parseInt(req.query.children) || 0;

  try {
    // Tìm tất cả RoomType mà KHÔNG có booking nào trùng khoảng ngày
    let rooms = await db.RoomType.findAll({
      include: [
        {
          model: db.Booking,
          required: false,
          where: {
            [Op.or]: [
              {
                check_in_date: {
                  [Op.between]: [checkin, checkout],
                },
              },
              {
                check_out_date: {
                  [Op.between]: [checkin, checkout],
                },
              },
              {
                check_in_date: {
                  [Op.lte]: checkin,
                },
                check_out_date: {
                  [Op.gte]: checkout,
                },
              },
            ],
          },
        },
      ],
      where: {
        max_adults: { [Op.gte]: adults },
        max_children: { [Op.gte]: children },
      },
    });

    // Chỉ giữ lại room chưa có booking nào trùng lịch
    rooms = rooms.filter((room) => room.Bookings.length === 0);

    return res.render("Search/Search.ejs", {
      rooms,
      checkin,
      checkout,
      adults,
      children,
    });
  } catch (error) {
    console.log(error);
    return res.render("Search/Search.ejs", {
      rooms: [],
      checkin,
      checkout,
      adults,
      children,
      error: "Có lỗi xảy ra khi tìm kiếm!",
    });
  }
};

module.exports = {
  getHomePage: getHomePage,
  getSignUp: getSignUp,
  postRegister: postRegister,
  getLogin: getLogin,
  searchRoom: searchRoom,
  postLogin: postLogin,
  getLogout: getLogout,
  getForgotPassword: getForgotPassword,
  postForgotPassword: postForgotPassword,
  getResetPassword: getResetPassword,
  postResetPassword: postResetPassword,
};
