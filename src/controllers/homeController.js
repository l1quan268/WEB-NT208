const db = require("../models/index");
const user_service = require("../services/user_service");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/email");

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
      slug: room.slug,
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
  const msg = req.query.msg;
  let success = null;

  if (msg === "changed") {
    success = "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.";
  }

  return res.render("Login/login.ejs", {
    error: null,
    success: success,
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

const axios = require("axios");

let postLogin = async (req, res) => {
  try {
    const { email, password, "g-recaptcha-response": captcha } = req.body;

    // Kiểm tra captcha
    if (!captcha) {
      return res.render("Login/login.ejs", {
        error: "Vui lòng xác nhận CAPTCHA.",
        success: null,
      });
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      new URLSearchParams({
        secret: secretKey,
        response: captcha,
        remoteip: req.ip,
      })
    );

    if (!response.data.success) {
      return res.render("Login/login.ejs", {
        error: "Xác thực CAPTCHA thất bại.",
        success: null,
      });
    }

    // Nếu captcha ok → kiểm tra đăng nhập
    const result = await user_service.handleUserLogin(email, password);

    if (result.success) {
      console.log("✅ LOGIN SUCCESS - User data:", result.user);

      req.session.user = {
        user_id: result.user.user_id,
        id: result.user.user_id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role, // ✅ Thêm role vào session
      };

      req.session.save((err) => {
        if (err) {
          console.error("❌ Session save error:", err);
          return res.render("Login/login.ejs", {
            error: "Lỗi lưu session",
            success: null,
          });
        }

        console.log("✅ SESSION SAVED SUCCESSFULLY:", req.session.user);

        // ✅ Kiểm tra nếu user là admin thì redirect đến trang admin
        if (result.user.role === "admin") {
          return res.redirect("/admin");
        } else {
          return res.redirect("/");
        }
      });
    } else {
      return res.render("Login/login.ejs", {
        error: result.message,
        success: null,
      });
    }
  } catch (error) {
    console.error("❌ Lỗi đăng nhập:", error);
    return res.render("Login/login.ejs", {
      error: "Lỗi hệ thống",
      success: null,
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

let getLogout = (req, res) => {
  // Kiểm tra xem session có tồn tại không
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Lỗi khi đăng xuất:", err);
        // Nếu có lỗi, chuyển hướng về trang chủ với thông báo lỗi (nếu bạn có cơ chế hiển thị flash message)
        return res.redirect("/");
      }

      // Xóa cookie session (nếu sử dụng cookie-based session)
      res.clearCookie("connect.sid"); // hoặc tên cookie session của bạn

      // Chuyển hướng về trang chủ với thông báo đăng xuất thành công
      res.redirect("/");
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

    // Truy vấn với điều kiện loại trừ phòng đã được đặt trong khoảng thời gian tìm kiếm
    let rooms = await db.RoomType.findAll({
      where: roomWhere,
      include: [
        /*        
        {
          model: db.Booking,
          required: false,
          where: {
            status: { [Op.ne]: "canceled" },  Chỉ tính booking chưa bị hủy
            [Op.and]: [
               Kiểm tra nếu có ngày checkin và checkout thì mới áp dụng điều kiện
              checkin && checkout
                ? {
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
                  }
                : {},
            ],
          },
        },
        */
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

    // Lọc bỏ những phòng đã được đặt trong khoảng thời gian tìm kiếm
    if (checkin && checkout) {
      rooms = rooms.filter((room) => {
        // Nếu phòng không có booking nào thì available
        if (!room.Bookings || room.Bookings.length === 0) {
          return true;
        }
        // Nếu có booking, kiểm tra xem có conflict không
        return room.Bookings.length === 0;
      });
    }

    // Lọc theo dịch vụ
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

    // Map lại dữ liệu cho view - bỏ available_after vì chỉ hiển thị phòng có sẵn
    const mappedRooms = rooms.map((room) => {
      return {
        room_type_id: room.room_type_id,
        slug: room.slug,
        name: room.type_name,
        price: room.price_per_night,
        address: room.Homestay?.address || "Không rõ",
        thumbnail: room.RoomTypeImages?.[0]?.image_url || "/image/no-image.png",
        services: room.Services?.map((s) => s.service_name) || [],
        description: room.description || "",
        avg_rating: ratingMap[room.room_type_id]?.avg_rating || null,
        review_count: ratingMap[room.room_type_id]?.review_count || 0,
        // Không cần available_after nữa vì chỉ hiển thị phòng có sẵn
      };
    });

    // Trả kết quả
    console.log("🔍 Available rooms:");
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
            status: { [Op.ne]: "canceled" }, // Chỉ tính booking chưa bị hủy
            [Op.and]: [
              // Kiểm tra nếu có ngày checkin và checkout thì mới áp dụng điều kiện
              checkin && checkout
                ? {
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
                  }
                : {},
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

    // Lọc bỏ những phòng đã được đặt trong khoảng thời gian tìm kiếm
    if (checkin && checkout) {
      rooms = rooms.filter((room) => {
        // Nếu phòng không có booking nào thì available
        if (!room.Bookings || room.Bookings.length === 0) {
          return true;
        }
        // Nếu có booking, kiểm tra xem có conflict không
        return room.Bookings.length === 0;
      });
    }

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
      return {
        room_type_id: room.room_type_id,
        slug: room.slug,
        name: room.type_name,
        price: room.price_per_night,
        address: room.Homestay?.address || "Không rõ",
        thumbnail: room.RoomTypeImages?.[0]?.image_url || "/image/no-image.png",
        services: room.Services?.map((s) => s.service_name) || [],
        description: room.description || "",
        avg_rating: ratingMap[room.room_type_id]?.avg_rating || null,
        review_count: ratingMap[room.room_type_id]?.review_count || 0,
        // Không cần available_after nữa
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
    // 🔹 Lấy thông tin phòng
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
      ],
    });

    if (!room) return res.status(404).send("Không tìm thấy phòng");

    // ✅ SỬA: Dùng raw query để lấy reviews
    const reviewQuery = `
      SELECT 
        r.review_id,
        r.user_id,
        r.rating,
        r.comment,
        r.created_at,
        u.name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE r.room_type_id = ?
      ORDER BY r.created_at DESC
    `;

    const reviews = await db.sequelize.query(reviewQuery, {
      replacements: [id],
      type: db.Sequelize.QueryTypes.SELECT,
    });

    // Format reviews cho template
    const formattedReviews = reviews.map((review) => ({
      review_id: review.review_id,
      user_id: review.user_id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      User: {
        name: review.name || "Ẩn danh",
      },
    }));

    // Lấy 3 phòng gợi ý
    const suggestedRooms = await db.RoomType.findAll({
      where: {
        room_type_id: { [db.Sequelize.Op.ne]: id },
      },
      include: [
        {
          model: db.RoomTypeImage,
          required: false,
          where: { is_thumbnail: true },
        },
      ],
      limit: 3,
      order: db.Sequelize.literal("RAND()"),
    });

    const mappedSuggestedRooms = suggestedRooms.map((r) => {
      const thumbnailImage = r.RoomTypeImages?.find((img) => img.is_thumbnail);
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

    // Tính điểm trung bình đánh giá
    const avgRating = formattedReviews.length
      ? (
          formattedReviews.reduce((acc, r) => acc + r.rating, 0) /
          formattedReviews.length
        ).toFixed(1)
      : null;

    console.log(
      "✅ ROOM DETAIL LOADED - Reviews count:",
      formattedReviews.length
    );

    // Trả dữ liệu ra view
    res.render("Detail_homestay/details_homestay.ejs", {
      room,
      images: room.RoomTypeImages,
      services: room.Services,
      reviews: formattedReviews, // ✅ Dùng raw query results
      homestay: room.Homestay,
      avgRating,
      suggestedRooms: mappedSuggestedRooms,
      user: req.session.user || null,
    });
  } catch (err) {
    console.error("❌ Lỗi lấy chi tiết phòng:", err);
    res.status(500).send("Lỗi server: " + err.message);
  }
};
let getRoomDetailBySlug = async (req, res) => {
  const slug = req.params.slug;

  try {
    // 🔹 Lấy thông tin phòng dựa trên slug
    const room = await db.RoomType.findOne({
      where: { slug: slug },
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
      ],
    });

    if (!room) return res.status(404).send("Không tìm thấy phòng");

    // ✅ Lấy reviews qua raw query
    const reviewQuery = `
      SELECT 
        r.review_id,
        r.user_id,
        r.rating,
        r.comment,
        r.created_at,
        u.name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE r.room_type_id = ?
      ORDER BY r.created_at DESC
    `;

    const reviews = await db.sequelize.query(reviewQuery, {
      replacements: [room.room_type_id],
      type: db.Sequelize.QueryTypes.SELECT,
    });

    const formattedReviews = reviews.map((review) => ({
      review_id: review.review_id,
      user_id: review.user_id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      User: {
        name: review.name || "Ẩn danh",
      },
    }));

    // 🔹 Lấy 3 phòng gợi ý
    const suggestedRooms = await db.RoomType.findAll({
      where: {
        room_type_id: { [db.Sequelize.Op.ne]: room.room_type_id },
      },
      include: [
        {
          model: db.RoomTypeImage,
          required: false,
          where: { is_thumbnail: true },
        },
      ],
      limit: 3,
      order: db.Sequelize.literal("RAND()"),
    });

    const mappedSuggestedRooms = suggestedRooms.map((r) => {
      const thumbnailImage = r.RoomTypeImages?.find((img) => img.is_thumbnail);
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
        slug: r.slug,
        type_name: r.type_name,
        price_per_night: r.price_per_night,
        thumbnail: thumbnailUrl,
      };
    });

    // Tính điểm trung bình đánh giá
    const avgRating = formattedReviews.length
      ? (
          formattedReviews.reduce((acc, r) => acc + r.rating, 0) /
          formattedReviews.length
        ).toFixed(1)
      : null;

    console.log(
      "✅ ROOM DETAIL BY SLUG - Reviews count:",
      formattedReviews.length
    );

    res.render("Detail_homestay/details_homestay.ejs", {
      room,
      images: room.RoomTypeImages,
      services: room.Services,
      reviews: formattedReviews,
      homestay: room.Homestay,
      avgRating,
      suggestedRooms: mappedSuggestedRooms,
      user: req.session.user || null,
    });
  } catch (err) {
    console.error("❌ Lỗi lấy chi tiết phòng (slug):", err);
    res.status(500).send("Lỗi server: " + err.message);
  }
};

// ✅ CẬP NHẬT postReview để cho phép tạo mới sau khi xóa
let postReview = async (req, res) => {
  try {
    console.log("=== REVIEW REQUEST DEBUG ===");
    console.log("Request body:", req.body);
    console.log("Session user:", req.session?.user);

    const { room_type_id, rating, comment } = req.body;
    const user = req.session?.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để đánh giá",
      });
    }

    const userId = user.user_id || user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Thông tin đăng nhập không hợp lệ",
      });
    }

    // Validation
    if (!room_type_id || !rating || !comment?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin",
      });
    }

    const numRating = parseInt(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Đánh giá phải từ 1-5 sao",
      });
    }

    const trimmedComment = comment.trim();
    if (trimmedComment.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Bình luận quá ngắn (tối thiểu 5 ký tự)",
      });
    }

    // Kiểm tra room tồn tại
    const roomExists = await db.RoomType.findByPk(room_type_id);
    if (!roomExists) {
      return res.status(404).json({
        success: false,
        message: "Phòng không tồn tại",
      });
    }

    // ✅ KIỂM TRA đã đánh giá chưa
    const existingReviewQuery = `
      SELECT review_id FROM reviews 
      WHERE user_id = ? AND room_type_id = ? 
      LIMIT 1
    `;

    const existingReviews = await db.sequelize.query(existingReviewQuery, {
      replacements: [userId, room_type_id],
      type: db.Sequelize.QueryTypes.SELECT,
    });

    let newReviewId;

    if (existingReviews && existingReviews.length > 0) {
      // ✅ CẬP NHẬT review cũ
      console.log("🔄 Updating existing review...");
      const updateQuery = `
        UPDATE reviews 
        SET rating = ?, comment = ?, created_at = NOW() 
        WHERE user_id = ? AND room_type_id = ?
      `;

      await db.sequelize.query(updateQuery, {
        replacements: [numRating, trimmedComment, userId, room_type_id],
        type: db.Sequelize.QueryTypes.UPDATE,
      });

      newReviewId = existingReviews[0].review_id;
      console.log("✅ Review updated with ID:", newReviewId);
    } else {
      // ✅ TẠO review mới
      console.log("➕ Creating new review...");
      const insertQuery = `
        INSERT INTO reviews (user_id, room_type_id, rating, comment, created_at) 
        VALUES (?, ?, ?, ?, NOW())
      `;

      const [result] = await db.sequelize.query(insertQuery, {
        replacements: [userId, room_type_id, numRating, trimmedComment],
        type: db.Sequelize.QueryTypes.INSERT,
      });

      newReviewId = result;
      console.log("✅ New review created with ID:", newReviewId);
    }

    // Lấy thông tin user
    const userQuery = `SELECT name, email FROM users WHERE user_id = ?`;
    const userResults = await db.sequelize.query(userQuery, {
      replacements: [userId],
      type: db.Sequelize.QueryTypes.SELECT,
    });

    const userInfo = userResults[0];

    return res.json({
      success: true,
      message:
        existingReviews.length > 0
          ? "Cập nhật đánh giá thành công!"
          : "Đánh giá thành công!",
      review: {
        id: newReviewId,
        name: userInfo?.name || user.name || user.email || "Ẩn danh",
        rating: numRating,
        comment: trimmedComment,
        created_at: new Date(),
      },
    });
  } catch (error) {
    console.error("❌ LỖI GỬI ĐÁNH GIÁ:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
};

let getUserInfoPage = async (req, res) => {
  const userSession = req.session?.user;
  if (!userSession) return res.redirect("/login");

  const user = await db.User.findByPk(userSession.user_id);
  if (!user) return res.redirect("/login");

  let dobFormatted = "";
  if (user.dob) {
    const parsedDob = new Date(user.dob);
    if (!isNaN(parsedDob.getTime())) {
      dobFormatted = parsedDob.toISOString().split("T")[0];
    }
  }

  // 🔍 Thêm truy vấn lấy lịch sử bookings
  const bookings = await db.sequelize.query(
    `
    SELECT 
      b.name,
      b.booking_id,
      b.booking_date,
      rt.type_name AS room_name,
      b.check_in_date,
      b.check_out_date,
      b.adults,
      b.children,
      b.total_price,
      b.payment_status
    FROM bookings b
    JOIN roomtypes rt ON b.room_type_id = rt.room_type_id
    WHERE b.user_id = ?
    ORDER BY b.booking_date DESC
  `,
    {
      replacements: [userSession.user_id],
      type: db.Sequelize.QueryTypes.SELECT,
    }
  );

  const message = req.session.message;
  delete req.session.message;

  return res.render("User_info/User_info.ejs", {
    user: req.session.user,
    userData: {
      ...user.dataValues,
      dobFormatted,
    },
    message,
    bookings, // ✅ truyền bookings xuống view
  });
};
let cancelBooking = async (req, res) => {
  const user = req.session?.user;
  const bookingName = req.body.booking_id;

  if (!user || !bookingName) return res.redirect("/bookings");

  try {
    const result = await db.Booking.update(
      { payment_status: "failed" },
      {
        where: {
          booking_id: bookingName,
          user_id: user.user_id,
          payment_status: { [db.Sequelize.Op.ne]: "paid" }, // Không cập nhật nếu đã thanh toán
        },
      }
    );

    if (result[0] > 0) {
      req.session.message = "Đã hủy hóa đơn thành công!";
    } else {
      req.session.message =
        "Không thể hủy hóa đơn (đã thanh toán hoặc không tồn tại)!";
    }
  } catch (error) {
    console.error("❌ Lỗi khi hủy booking:", error);
    req.session.message = "Lỗi khi hủy hóa đơn!";
  }

  return res.redirect("/bookings");
};

let postUpdateUserInfo = async (req, res) => {
  const userSession = req.session?.user;
  if (!userSession) return res.redirect("/login");

  const { name, phone, dob, gender } = req.body;
  await db.User.update(
    { name, phone, dob, gender },
    { where: { user_id: userSession.user_id } }
  );

  req.session.message = "Cập nhật thông tin thành công!";
  return res.redirect("/account");
};

let postChangePassword = async (req, res) => {
  const userSession = req.session?.user;
  if (!userSession) return res.redirect("/login");

  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    const user = await db.User.findByPk(userSession.user_id);
    if (!user) {
      req.session.message = "Không tìm thấy tài khoản.";
      return res.redirect("/account");
    }

    // ✅ Không cho đổi nếu tài khoản không có mật khẩu (tài khoản Google)
    if (!user.password_hash) {
      req.session.message =
        "Tài khoản này không hỗ trợ đổi mật khẩu (có thể đăng nhập bằng Google).";
      return res.redirect("/account");
    }

    // ✅ So sánh mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    console.log("✅ So sánh mật khẩu:", {
      inputPassword: currentPassword,
      hashInDB: user.password_hash,
      matchResult: isMatch,
    });

    if (!isMatch) {
      req.session.message = "❌ Mật khẩu hiện tại không đúng.";
      return res.redirect("/account");
    }

    // ✅ So sánh mật khẩu mới và xác nhận
    if (newPassword !== confirmPassword) {
      req.session.message = "❌ Mật khẩu mới và xác nhận không khớp.";
      return res.redirect("/account");
    }

    // ✅ Hash và cập nhật mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password_hash: hashedNewPassword });
    console.log("✅ Mật khẩu mới đã được cập nhật:", hashedNewPassword);

    // ✅ Đăng xuất sau khi đổi mật khẩu
    req.session.destroy((err) => {
      if (err) {
        console.error("❌ Lỗi khi đăng xuất sau đổi mật khẩu:", err);
        return res.redirect("/account");
      }

      res.clearCookie("connect.sid");
      return res.redirect("/login?msg=changed");
    });
  } catch (err) {
    console.error("❌ Lỗi đổi mật khẩu:", err);
    req.session.message = "Có lỗi xảy ra khi đổi mật khẩu.";
    return res.redirect("/account");
  }
};
let getBookedDates = async (req, res) => {
  try {
    const { room_id } = req.params;
    console.log('🔍 API called for room_id:', room_id);
    
    if (!room_id) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    const bookings = await db.Booking.findAll({
      where: {
        room_type_id: room_id,
        payment_status: ["paid", "pending"],
        status: {
          [db.Sequelize.Op.notIn]: ["cancelled", "failed"],
        },
      },
      attributes: ["booking_id", "check_in_date", "check_out_date"],
      order: [["check_in_date", "ASC"]],
    });

    let disabledForCheckin = [];   // Ngày không thể checkin
    let disabledForCheckout = [];  // Ngày không thể checkout

    bookings.forEach((booking, index) => {
      const checkinDate = new Date(booking.check_in_date);
      const checkoutDate = new Date(booking.check_out_date);

      console.log(`📅 Booking ${index + 1}:`, {
        id: booking.booking_id,
        checkin: booking.check_in_date,
        checkout: booking.check_out_date
      });

      // ❌ NGÀY KHÔNG THỂ CHECKIN: từ checkin đến ngày trước checkout
      for (let d = new Date(checkinDate); d < checkoutDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        if (!disabledForCheckin.includes(dateStr)) {
          disabledForCheckin.push(dateStr);
        }
      }

      // ❌ NGÀY KHÔNG THỂ CHECKOUT: từ ngày sau checkin đến checkout
      const dayAfterCheckin = new Date(checkinDate);
      dayAfterCheckin.setDate(dayAfterCheckin.getDate() + 1);
      
      for (let d = new Date(dayAfterCheckin); d <= checkoutDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        if (!disabledForCheckout.includes(dateStr)) {
          disabledForCheckout.push(dateStr);
        }
      }
    });

    disabledForCheckin.sort();
    disabledForCheckout.sort();

    console.log(`📅 Room ${room_id} - Disabled for checkin:`, disabledForCheckin);
    console.log(`📅 Room ${room_id} - Disabled for checkout:`, disabledForCheckout);

    // ✅ TRẢ VỀ CẢ 2 LOẠI NGÀY DISABLE
    return res.json({
      success: true,
      bookedDates: disabledForCheckin, // ✅ Để frontend tương thích
      disabledForCheckin: disabledForCheckin,
      disabledForCheckout: disabledForCheckout,
      totalBookings: bookings.length,
    });
  } catch (error) {
    console.error("❌ Error fetching booked dates:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
let getRoomsPaginated = async (req, res) => {
  // -------- 1. Đọc & chuẩn hoá tham số ----------
  const limit = Number.parseInt(req.query.limit) || 4; // mặc định 4
  const offset = Number.parseInt(req.query.offset) || 0; // mặc định 0

  try {
    // -------- 2. Truy vấn Sequelize ----------
    const rooms = await db.RoomType.findAll({
      limit,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        { model: db.Homestay, attributes: ["address"], required: true },
        {
          model: db.RoomTypeImage,
          where: { is_thumbnail: true },
          attributes: ["image_url"],
          required: false,
        },
        { model: db.Service, through: { attributes: [] }, required: false },
      ],
    });

    // -------- 3. Chuẩn hoá data trước khi trả ----------
    const data = rooms.map((r) => ({
      slug: r.slug,
      name: r.type_name,
      price: r.price_per_night,
      address: r.Homestay?.address || "",
      thumbnail: r.RoomTypeImages?.[0]?.image_url || "/image/no-image.png",
      services: r.Services?.map((s) => s.service_name) || [],
      avg_rating: r.avg_rating || null, // 👈 cần có trường này
      review_count: r.review_count || 0,
    }));

    return res.status(200).json({
      err: 0,
      msg: "OK",
      data,
    });
  } catch (error) {
    console.error("getRoomsPaginated >>", error);
    return res.status(500).json({
      err: 1,
      msg: "Internal server error",
    });
  }
};

let getReviewPage = async (req, res) => {
  try {
    res.render("Home/Review", {
      title: "Đánh giá khách hàng",
      user: req.user || null,
    });
  } catch (err) {
    console.error("❌ Lỗi hiển thị trang đánh giá:", err);
    res.status(500).send("Lỗi server");
  }
};

let postReviewForm = async (req, res) => {
  const { name, email, phone, message } = req.body;

  try {
    if (!name || !email || !message) {
      return res.status(400).send("Thiếu thông tin bắt buộc");
    }

    // TODO: bạn có thể lưu vào DB, gửi email, v.v.
    console.log("📨 Đánh giá mới:", { name, email, phone, message });

    res.redirect("/danh-gia?success=1");
  } catch (err) {
    console.error("❌ Lỗi gửi form đánh giá:", err);
    res.status(500).send("Lỗi server khi gửi đánh giá");
  }
};

// Cập nhật module.exports - THÊM getBookedDates vào cuối
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
  postReview: postReview,
  postChangePassword: postChangePassword,
  postUpdateUserInfo: postUpdateUserInfo,
  getUserInfoPage: getUserInfoPage,
  cancelBooking: cancelBooking,
  getBookedDates: getBookedDates, // 🔥 CHỈ THÊM DÒNG NÀY
  getRoomDetailBySlug: getRoomDetailBySlug,
  getRoomsPaginated: getRoomsPaginated,
  getReviewPage: getReviewPage,
  postReviewForm: postReviewForm,
};
