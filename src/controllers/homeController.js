import db from "../models/index";
import user_service from "../services/user_service";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import sendEmail from "../utils/email";

let getHomePage = async (req, res) => {
  const user = req.session?.user || null;

  try {
    // Lấy 8 phòng đầu tiên
    const rooms = await db.RoomType.findAll({
      limit: 8,
      include: [
        {
          model: db.Homestay,
          required: true,
        },
        {
          model: db.RoomTypeImage,
          required: false,
          where: { is_thumbnail: true },
        },
        {
          model: db.Service,
          through: { attributes: [] },
          required: false,
        },
      ],
    });

    // Lấy danh sách room_type_id để truy vấn đánh giá
    const roomIds = rooms.map((room) => room.room_type_id);

    const ratingData = await db.Review.findAll({
      where: { room_type_id: roomIds },
      attributes: [
        "room_type_id",
        [db.sequelize.fn("AVG", db.sequelize.col("rating")), "avg_rating"],
        [
          db.sequelize.fn("COUNT", db.sequelize.col("review_id")),
          "review_count",
        ],
      ],
      group: ["room_type_id"],
    });

    // Tạo map rating
    const ratingMap = {};
    ratingData.forEach((entry) => {
      ratingMap[Number(entry.room_type_id)] = {
        avg_rating: parseFloat(entry.dataValues.avg_rating).toFixed(1),
        review_count: parseInt(entry.dataValues.review_count),
      };
    });

    // Chuyển dữ liệu thành format dùng được bên view
    const mappedRooms = rooms.map((room) => ({
      room_type_id: room.room_type_id,
      name: room.type_name,
      price: room.price_per_night,
      address: room.Homestay?.address || "Không rõ",
      thumbnail: room.RoomTypeImages?.[0]?.image_url || "/image/no-image.png",
      services: room.Services?.map((s) => s.service_name) || [],
      description: room.description || "",
      avg_rating: ratingMap[room.room_type_id]?.avg_rating || null,
      review_count: ratingMap[room.room_type_id]?.review_count || 0,
    }));

    return res.render("Home/Home.ejs", {
      user: user,
      rooms: mappedRooms,
    });
  } catch (error) {
    console.error("Lỗi khi load trang chủ:", error);
    return res.render("Home/Home.ejs", {
      user: user,
      rooms: [],
      error: "Lỗi khi tải dữ liệu phòng",
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

//Tìm kiếm phòng

let searchRoom = async (req, res) => {
  const checkin = req.query.checkin || "";
  const checkout = req.query.checkout || "";
  const adults = parseInt(req.query.adults) || 0;
  const children = parseInt(req.query.children) || 0;
  const ward = req.query.ward || "";
  const service = req.query.service || "";
  const type = req.query.type || "";
  const price = req.query.price || "";
  const sort = req.query.sort || "";
  const user = req.session?.user || null;

  try {
    let roomWhere = {
      max_adults: { [Op.gte]: adults },
      max_children: { [Op.gte]: children },
    };
    // Lọc loại chỗ ở
    if (type === "house") {
      roomWhere.description = { [Op.like]: "%nhà nguyên căn%" };
    } else if (type === "apartment") {
      roomWhere.description = { [Op.like]: "%phòng riêng trong căn hộ%" };
    }

    // Lọc theo khoảng giá
    if (price === "1") {
      roomWhere.price_per_night = { [Op.lt]: 500000 };
    } else if (price === "2") {
      roomWhere.price_per_night = { [Op.between]: [500000, 1000000] };
    } else if (price === "3") {
      roomWhere.price_per_night = { [Op.gt]: 1000000 };
    }

    // Lọc phường
    const whereHomestay = {};
    if (ward) {
      whereHomestay.address = { [Op.like]: `%${ward}%` };
    }

    // Truy vấn
    let rooms = await db.RoomType.findAll({
      where: roomWhere,
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
        {
          model: db.Homestay,
          required: true,
          where: whereHomestay,
        },
        {
          model: db.RoomTypeImage,
          required: false,
          where: { is_thumbnail: true },
        },
        {
          model: db.Service,
          through: { attributes: [] },
          required: false,
        },
      ],
      order:
        sort === "asc"
          ? [["price_per_night", "ASC"]]
          : sort === "desc"
          ? [["price_per_night", "DESC"]]
          : [],
    });

    // Lọc phòng trống

    // Nếu lọc theo dịch vụ
    if (service) {
      rooms = rooms.filter((room) =>
        room.Services.some((s) => s.service_name === service)
      );
    }
    // 1. Lấy danh sách room_type_id
    const roomIds = rooms.map((room) => room.room_type_id);

    // 2. Truy vấn rating trung bình từ bảng Review
    const ratingData = await db.Review.findAll({
      where: { room_type_id: roomIds },
      attributes: [
        "room_type_id",
        [db.sequelize.fn("AVG", db.sequelize.col("rating")), "avg_rating"],
        [
          db.sequelize.fn("COUNT", db.sequelize.col("review_id")),
          "review_count",
        ],
      ],
      group: ["room_type_id"],
    });

    const ratingMap = {};
    ratingData.forEach((entry) => {
      ratingMap[Number(entry.room_type_id)] = {
        avg_rating: parseFloat(entry.dataValues.avg_rating).toFixed(1),
        review_count: parseInt(entry.dataValues.review_count),
      };
    });

    // Map lại dữ liệu cho view
    const mappedRooms = rooms.map((room) => {
      let available_after = null;

      if (room.Bookings?.length > 0) {
        const latest = room.Bookings.reduce((max, b) => {
          const out = new Date(b.check_out_date);
          return out > max ? out : max;
        }, new Date(0));
        available_after = latest.toISOString().split("T")[0];
      }

      return {
        room_type_id: room.room_type_id,
        name: room.type_name,
        price: room.price_per_night,
        address: room.Homestay?.address || "Không rõ",
        thumbnail: room.RoomTypeImages?.[0]?.image_url || "/image/no-image.png",
        services: room.Services?.map((s) => s.service_name) || [],
        description: room.description || "",
        avg_rating: ratingMap[room.room_type_id]?.avg_rating || null,
        review_count: ratingMap[room.room_type_id]?.review_count || 0,
        available_after,
      };
    });
    // Trả kết quả
    console.log("🔍 mappedRooms with rating:");
    console.log(mappedRooms);
    return res.render("Search/Search.ejs", {
      rooms: mappedRooms,
      checkin,
      checkout,
      adults,
      children,
      ward,
      service,
      type,
      price,
      sort,
      user,
    });
  } catch (error) {
    console.error("Lỗi tìm kiếm:", error);
    return res.render("Search/Search.ejs", {
      rooms: [],
      checkin,
      checkout,
      adults,
      children,
      ward,
      service,
      type,
      price,
      sort,
      user,
      error: "Có lỗi xảy ra khi tìm kiếm!",
    });
  }
};
// Xử lý tìm kiếm phòng qua AJAX
let searchRoomAjax = async (req, res) => {
  const checkin = req.query.checkin || "";
  const checkout = req.query.checkout || "";
  const adults = parseInt(req.query.adults) || 0;
  const children = parseInt(req.query.children) || 0;
  const ward = req.query.ward || "";
  const service = req.query.service || "";
  const type = req.query.type || "";
  const price = req.query.price || "";
  const sort = req.query.sort || "";

  try {
    let roomWhere = {
      max_adults: { [Op.gte]: adults },
      max_children: { [Op.gte]: children },
    };

    if (type === "house") {
      roomWhere.description = { [Op.like]: "%nhà nguyên căn%" };
    } else if (type === "apartment") {
      roomWhere.description = { [Op.like]: "%phòng riêng trong căn hộ%" };
    }

    if (price === "1") {
      roomWhere.price_per_night = { [Op.lt]: 500000 };
    } else if (price === "2") {
      roomWhere.price_per_night = { [Op.between]: [500000, 1000000] };
    } else if (price === "3") {
      roomWhere.price_per_night = { [Op.gt]: 1000000 };
    }

    const whereHomestay = {};
    if (ward) {
      whereHomestay.address = { [Op.like]: `%${ward}%` };
    }

    let rooms = await db.RoomType.findAll({
      where: roomWhere,
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
        {
          model: db.Homestay,
          required: true,
          where: whereHomestay,
        },
        {
          model: db.RoomTypeImage,
          required: false,
          where: { is_thumbnail: true },
        },
        {
          model: db.Service,
          through: { attributes: [] },
          required: false,
        },
      ],
      order:
        sort === "asc"
          ? [["price_per_night", "ASC"]]
          : sort === "desc"
          ? [["price_per_night", "DESC"]]
          : [],
    });

    if (service) {
      rooms = rooms.filter((room) =>
        room.Services.some((s) => s.service_name === service)
      );
    }

    const roomIds = rooms.map((r) => r.room_type_id);

    const ratingData = await db.Review.findAll({
      where: { room_type_id: roomIds },
      attributes: [
        "room_type_id",
        [db.sequelize.fn("AVG", db.sequelize.col("rating")), "avg_rating"],
        [
          db.sequelize.fn("COUNT", db.sequelize.col("review_id")),
          "review_count",
        ],
      ],
      group: ["room_type_id"],
    });

    const ratingMap = {};
    ratingData.forEach((entry) => {
      ratingMap[Number(entry.room_type_id)] = {
        avg_rating: parseFloat(entry.dataValues.avg_rating).toFixed(1),
        review_count: parseInt(entry.dataValues.review_count),
      };
    });

    const mappedRooms = rooms.map((room) => {
      let available_after = null;

      if (room.Bookings?.length > 0) {
        const latest = room.Bookings.reduce((max, b) => {
          const out = new Date(b.check_out_date);
          return out > max ? out : max;
        }, new Date(0));
        available_after = latest.toISOString().split("T")[0];
      }

      return {
        room_type_id: room.room_type_id,
        name: room.type_name,
        price: room.price_per_night,
        address: room.Homestay?.address || "Không rõ",
        thumbnail: room.RoomTypeImages?.[0]?.image_url || "/image/no-image.png",
        services: room.Services?.map((s) => s.service_name) || [],
        description: room.description || "",
        avg_rating: ratingMap[room.room_type_id]?.avg_rating || null,
        review_count: ratingMap[room.room_type_id]?.review_count || 0,
        available_after,
      };
    });
    return res.render("partials/room_list.ejs", {
      rooms: mappedRooms,
    });
  } catch (error) {
    console.error("Lỗi tìm kiếm AJAX:", error);
    return res.status(500).send("Có lỗi xảy ra khi tìm kiếm!");
  }
};

let getRoomDetail = async (req, res) => {
  const id = req.params.id;

  try {
    const room = await db.RoomType.findOne({
      where: { room_type_id: id },
      include: [
        {
          model: db.Homestay,
          required: true,
        },
        {
          model: db.RoomTypeImage,
          required: false,
        },
        {
          model: db.Service,
          through: { attributes: [] },
          required: false,
        },
        // {
        //   model: db.Review,
        //   required: false,
        //   include: [
        //     {
        //       model: db.User,
        //       attributes: ["name"],
        //     },
        //   ],
        // },
      ],
    });

    if (!room) return res.status(404).send("Không tìm thấy phòng");
    // Lấy 3 phòng ngẫu nhiên khác với phòng hiện tại
    const suggestedRooms = await db.RoomType.findAll({
      where: {
        room_type_id: { [db.Sequelize.Op.ne]: id },
      },
      include: [
        {
          model: db.RoomTypeImage,
          required: false,
        },
      ],
      limit: 3,
      order: db.Sequelize.literal("RAND()"),
    });
    // Map thumbnail ảnh cho gợi ý phòng
    const mappedSuggestedRooms = suggestedRooms.map((r) => {
      const thumbnailImage = r.RoomTypeImages.find((img) => img.is_thumbnail);
      let thumbnailUrl = thumbnailImage
        ? thumbnailImage.image_url
        : "/image/no-image.png";

      if (
        thumbnailUrl &&
        !thumbnailUrl.startsWith("http") &&
        !thumbnailUrl.startsWith("/")
      ) {
        thumbnailUrl = "/uploads/" + thumbnailUrl;
      }

      return {
        room_type_id: r.room_type_id,
        type_name: r.type_name,
        price_per_night: r.price_per_night,
        thumbnail: thumbnailUrl,
      };
    });

    // Tính rating trung bình
    const ratings = room.Reviews || [];
    const avgRating = ratings.length
      ? (
          ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length
        ).toFixed(1)
      : null;
    console.log("ẢNH:", room.RoomTypeImages);
    res.render("Detail_homestay/details_homestay.ejs", {
      room,
      images: room.RoomTypeImages,
      services: room.Services,
      reviews: ratings,
      homestay: room.Homestay,
      avgRating,
      suggestedRooms: mappedSuggestedRooms,

      user: req.session.user || null,
    });
  } catch (err) {
    console.error("Lỗi lấy chi tiết phòng:", err);
    res.status(500).send("Lỗi server");
  }
};

// Tìm kiếm phòng
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
  searchRoomAjax: searchRoomAjax,
  getRoomDetail: getRoomDetail,
};
