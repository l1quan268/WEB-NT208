import db from "../models/index";
import user_service from "../services/user_service";

let getHomePage = async (reg, res) => {
  return res.render("Home/Home.ejs");
};
let getSignUp = (req, res) => {
  return res.render("Login/SignUp.ejs");
};
let getLogin = (req, res) => {
  return res.render("Login/login.ejs", { error: null });
};
let postRegister = async (req, res) => {
  try {
    let message = await user_service.createUser(req.body);

    if (message === "Đăng ký thành công") {
      // ✅ Render trang đăng nhập kèm thông báo thành công
      return res.render("Login/login.ejs", {
        success: "Đăng ký thành công! Vui lòng đăng nhập.",
        error: null,
      });
    } else {
      // ❌ Render lại trang đăng ký với thông báo lỗi
      return res.render("Login/SignUp.ejs", { error: message });
    }
  } catch (error) {
    console.log(error);
    return res.render("Login/SignUp.ejs", { error: "Đã có lỗi xảy ra!" });
  }
};
const { Op } = require("sequelize");

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
};
