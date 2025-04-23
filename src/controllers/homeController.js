import db from "../models/index";
import user_service from "../services/user_service";

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
    success: null, // Thêm dòng này
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
//         success: null, // Thêm dòng này
//       });
//     }
//   } catch (error) {
//     console.log(error);
//     return res.render("Login/login.ejs", {
//       error: "Đã có lỗi xảy ra khi đăng nhập!",
//       success: null, // Thêm dòng này
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
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
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
};
