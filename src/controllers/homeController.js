import db from "../models/index";
import user_service from "../services/user_service";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import sendEmail from "../utils/email";


<<<<<<< Updated upstream
=======


>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
      console.log("✅ LOGIN SUCCESS - User data:", result.user);

      req.session.user = {
<<<<<<< Updated upstream
      user_id: result.user.user_id,
      id: result.user.user_id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role // 🔥 cần thiết để middleware kiểm tra
    };
=======
        user_id: result.user.user_id,
        id: result.user.user_id, // THÊM: backup cho compatibility
        name: result.user.name,
        email: result.user.email,
        avatar_url: result.user.avatar_url, // ✅ thêm dòng này
      };
>>>>>>> Stashed changes

      req.session.save((err) => {
        if (err) {
          console.error("❌ Session save error:", err);
          return res.render("Login/login.ejs", {
            error: "Lỗi lưu session",
            success: null,
          });
>>>>>>> Stashed changes
        }
      } catch (sessionError) {
        console.error("Lỗi khi lưu session:", sessionError);
      }

<<<<<<< Updated upstream
      // Luôn chuyển hướng về trang chủ, ngay cả khi không lưu được session
      return res.redirect("/");
=======
        console.log("✅ SESSION SAVED SUCCESSFULLY:", req.session.user);

        // ✅ Chuyển hướng admin về /admin
        if (req.session.user.email === "admin@gm.com") {
          return res.redirect("/admin");
        }

        // Người dùng thường thì về trang chủ
        return res.redirect("/");
      });
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
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
// Thêm vào homeController.js
// let deleteReview = async (req, res) => {
//   try {
//     console.log("=== DELETE REVIEW REQUEST ===");
//     console.log("Params:", req.params);
//     console.log("Session user:", req.session?.user);

//     const { reviewId } = req.params;
//     const user = req.session?.user;

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "Vui lòng đăng nhập để xóa đánh giá",
//       });
//     }

//     const userId = user.user_id || user.id;

//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         message: "Thông tin đăng nhập không hợp lệ",
//       });
//     }

//     if (!reviewId) {
//       return res.status(400).json({
//         success: false,
//         message: "Thiếu ID đánh giá",
//       });
//     }

//     // ✅ KIỂM TRA review có tồn tại và thuộc về user này không
//     const checkReviewQuery = `
//       SELECT review_id, user_id, room_type_id, rating, comment
//       FROM reviews
//       WHERE review_id = ? AND user_id = ?
//     `;

//     const reviewResults = await db.sequelize.query(checkReviewQuery, {
//       replacements: [reviewId, userId],
//       type: db.Sequelize.QueryTypes.SELECT,
//     });

//     if (!reviewResults || reviewResults.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message:
//           "Không tìm thấy đánh giá hoặc bạn không có quyền xóa đánh giá này",
//       });
//     }

//     const review = reviewResults[0];
//     console.log("✅ Found review to delete:", review);

//     // ✅ XÓA review
//     const deleteQuery = `DELETE FROM reviews WHERE review_id = ? AND user_id = ?`;

//     const [result] = await db.sequelize.query(deleteQuery, {
//       replacements: [reviewId, userId],
//       type: db.Sequelize.QueryTypes.DELETE,
//     });

//     console.log("✅ Review deleted successfully");

//     return res.json({
//       success: true,
//       message: "Xóa đánh giá thành công",
//       deletedReview: {
//         id: review.review_id,
//         rating: review.rating,
//         comment: review.comment,
//       },
//     });
//   } catch (error) {
//     console.error("❌ LỖI XÓA ĐÁNH GIÁ:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Lỗi server: " + error.message,
//     });
//   }
// };

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
let getChangePassword = async (req, res) => {
  res.render("User_info/User_info.ejs", {
  user: req.session.user, // ✅ THÊM dòng này nếu chưa có
  userData: userData
});
};

let postChangePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.session?.user?.user_id;
  const user = await db.User.findByPk(userId);

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.send("❌ Mật khẩu hiện tại không đúng.");
  }

  const newHashed = await bcrypt.hash(newPassword, 10);
  await db.User.update({ password_hash: newHashed }, { where: { user_id: userId } });

  res.redirect("/account"); // hoặc hiển thị thông báo thành công
};
let getAccountInfo = async (req, res) => {
  const userId = req.session?.user?.user_id;
  const userData = await db.User.findByPk(userId);
  if (userData?.dob) {
  userData.dobFormatted = new Date(userData.dob).toISOString().slice(0, 10);
}
  return res.render("User_info/User_info.ejs", {
  user: req.session.user,       // ✅ BẮT BUỘC
  userData: userData            // ✅ Đã có
  });
};

let updateAccountInfo = async (req, res) => {
  const userId = req.session?.user?.user_id;
  const { name, phone, gender, dob } = req.body;

  const updateData = { name, phone, gender, dob };
  await db.User.update(updateData, { where: { user_id: userId } });

  req.session.user.name = name;
  res.redirect("/account");
};
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======
  getRoomDetail: getRoomDetail,
  postReview: postReview,
  getAccountInfo: getAccountInfo,
  updateAccountInfo: updateAccountInfo,
  getChangePassword : getChangePassword ,
  postChangePassword : postChangePassword ,
  // deleteReview: deleteReview,
>>>>>>> Stashed changes
};
// Trang quản trị (chỉ admin@gm.com mới có thể truy cập)
const getAdminPage = async (req, res) => {
  const users = await db.User.findAll({ where: { role: 'user' } });
  const homestays = await db.Homestay.findAll();
  res.render("Admin/admin.ejs", { users, homestays, user: req.session.user });
};
// Thêm người dùng
let addUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    await db.User.create({ name, email, password_hash, role: "user" });
    res.redirect("/admin");
  } catch (error) {
    console.error("Lỗi khi thêm người dùng:", error);
    res.status(500).send("Lỗi server");
  }
};

// Cập nhật thông tin người dùng
const updateUser = async (req, res) => {
  const { name, email, password } = req.body;
  const userId = req.params.id;
  const updateData = { name, email };
  if (password?.trim()) {
    updateData.password_hash = await bcrypt.hash(password, 10);
  }
  try {
    await db.User.update(updateData, { where: { user_id: userId } });
    res.redirect("/admin");
  } catch (err) {
    console.error("Lỗi cập nhật người dùng:", err);
    res.status(500).send("Lỗi khi cập nhật người dùng.");
  }
};
// Xóa người dùng
const deleteUser = async (req, res) => {
  const userId = req.params.id;
  try {
    await db.Review.destroy({ where: { user_id: userId } });
    await db.Payment.destroy({ where: { user_id: userId } });
    await db.Booking.destroy({ where: { user_id: userId } });
    await db.User.destroy({ where: { user_id: userId } });
    res.redirect("/admin");
  } catch (err) {
    console.error("Lỗi xóa người dùng:", err);
    res.status(500).send("Lỗi khi xóa người dùng.");
  }
};

// ✅ Export toàn bộ controller
module.exports = {
  getHomePage,
  getSignUp,
  postRegister,
  getLogin,
  searchRoom,
  postLogin,
  getLogout,
  getForgotPassword,
  postForgotPassword,
  getResetPassword,
  postResetPassword,
  searchRoomAjax,
  getRoomDetail,
  postReview,

  // Quản trị
  getAdminPage,
  addUser,
  updateUser,
  deleteUser,
};