const db = require("../models/index");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");

// Middleware kiểm tra quyền admin
const checkAdminRole = async (req, res, next) => {
  const user = req.session?.user;
  
  if (!user) {
    return res.redirect("/login");
  }
  
  try {
    // Kiểm tra role admin từ database
    const userRecord = await db.User.findByPk(user.user_id);
    
    if (!userRecord || userRecord.role !== 'admin') {
      return res.status(403).render("error", {
        message: "Bạn không có quyền truy cập trang này",
        user: user
      });
    }
    
    req.adminUser = userRecord;
    next();
  } catch (error) {
    console.error("Error checking admin role:", error);
    return res.status(500).render("error", {
      message: "Lỗi hệ thống",
      user: user
    });
  }
};

// Trang admin chính
let getAdminDashboard = async (req, res) => {
  try {
    // Lấy thống kê tổng quan
    const stats = await Promise.all([
      db.User.count(), // Tổng user
      db.Homestay.count(), // Tổng homestay  
      db.Booking.count(), // Tổng booking
      // ✅ Chỉ tính doanh thu từ booking đã thanh toán (payment_status = 'paid')
      db.Booking.sum('total_price', {
        where: { 
          payment_status: 'paid' 
        }
      })
    ]);

    // Lấy booking gần đây với thông tin thanh toán
    const recentBookings = await db.Booking.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: db.User,
          attributes: ['name', 'email'],
          required: false
        },
        {
          model: db.RoomType,
          attributes: ['type_name'],
          required: false
        }
      ]
    });

    // ✅ Tính thêm một số thống kê chi tiết về doanh thu
    const revenueStats = await Promise.all([
      // Doanh thu hôm nay
      db.Booking.sum('total_price', {
        where: {
          payment_status: 'paid',
          paid_at: {
            [db.Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      // Doanh thu tháng này
      db.Booking.sum('total_price', {
        where: {
          payment_status: 'paid',
          paid_at: {
            [db.Sequelize.Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      // Số booking đã thanh toán
      db.Booking.count({
        where: { payment_status: 'paid' }
      }),
      // Số booking chưa thanh toán
      db.Booking.count({
        where: { payment_status: 'pending' }
      })
    ]);

    return res.render("Admin/admin.ejs", {
      user: req.session.user,
      adminUser: req.adminUser,
      stats: {
        totalUsers: stats[0] || 0,
        totalHomestays: stats[1] || 0,
        totalBookings: stats[2] || 0,
        totalRevenue: stats[3] || 0, // ✅ Chỉ tính booking đã paid
        // Thêm thống kê chi tiết
        todayRevenue: revenueStats[0] || 0,
        monthRevenue: revenueStats[1] || 0,
        paidBookings: revenueStats[2] || 0,
        pendingBookings: revenueStats[3] || 0
      },
      recentBookings: recentBookings
    });
  } catch (error) {
    console.error("Error loading admin dashboard:", error);
    return res.status(500).render("error", {
      message: "Lỗi tải trang admin: " + error.message,
      user: req.session.user
    });
  }
};

// Quản lý users
let getUsersAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const { count, rows: users } = await db.User.findAndCountAll({
      limit: limit,
      offset: offset,
      order: [['created_at', 'DESC']],
      attributes: ['user_id', 'name', 'email', 'role', 'phone', 'created_at']
    });

    const totalPages = Math.ceil(count / limit);

    return res.json({
      success: true,
      users: users,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalUsers: count
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi tải danh sách user"
    });
  }
};

// Quản lý homestays
let getHomestaysAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const { count, rows: homestays } = await db.Homestay.findAndCountAll({
      limit: limit,
      offset: offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: db.RoomType,
          attributes: ['room_type_id'],
          required: false
        }
      ]
    });

    const totalPages = Math.ceil(count / limit);

    return res.json({
      success: true,
      homestays: homestays,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalHomestays: count
      }
    });
  } catch (error) {
    console.error("Error fetching homestays:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi tải danh sách homestay"
    });
  }
};

// Quản lý phòng
let getRoomsAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const { count, rows: rooms } = await db.RoomType.findAndCountAll({
      limit: limit,
      offset: offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: db.Homestay,
          attributes: ['name', 'address'],
          required: false
        }
      ]
    });

    const totalPages = Math.ceil(count / limit);

    return res.json({
      success: true,
      rooms: rooms,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRooms: count
      }
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi tải danh sách phòng"
    });
  }
};

// Quản lý hóa đơn
let getBookingsAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'all';

    let whereCondition = {};
    if (status !== 'all') {
      whereCondition.status = status;
    }

    const { count, rows: bookings } = await db.Booking.findAndCountAll({
      where: whereCondition,
      limit: limit,
      offset: offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: db.User,
          attributes: ['name', 'email', 'phone'],
          required: false
        },
        {
          model: db.RoomType,
          attributes: ['type_name'],
          include: [{
            model: db.Homestay,
            attributes: ['name'],
            required: false
          }],
          required: false
        }
      ]
    });

    const totalPages = Math.ceil(count / limit);

    return res.json({
      success: true,
      bookings: bookings,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalBookings: count
      }
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi tải danh sách hóa đơn"
    });
  }
};

// Quản lý đánh giá
let getReviewsAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const { count, rows: reviews } = await db.Review.findAndCountAll({
      limit: limit,
      offset: offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: db.User,
          attributes: ['name', 'email'],
          required: false
        },
        {
          model: db.RoomType,
          attributes: ['type_name'],
          include: [{
            model: db.Homestay,
            attributes: ['name'],
            required: false
          }],
          required: false
        }
      ]
    });

    const totalPages = Math.ceil(count / limit);

    return res.json({
      success: true,
      reviews: reviews,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalReviews: count
      }
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi tải danh sách đánh giá"
    });
  }
};

// Quản lý dịch vụ
let getServicesAdmin = async (req, res) => {
  try {
    const services = await db.Service.findAll({
      order: [['service_name', 'ASC']]
    });

    return res.json({
      success: true,
      services: services
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi tải danh sách dịch vụ"
    });
  }
};

// Cập nhật trạng thái booking
let updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'failed', 'paid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ"
      });
    }

    await db.Booking.update(
      { payment_status: status },
      { where: { booking_id: bookingId } }
    );

    return res.json({
      success: true,
      message: "Cập nhật trạng thái thành công"
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật trạng thái"
    });
  }
};

// Xóa user
let deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Không cho phép xóa admin
    const userToDelete = await db.User.findByPk(userId);
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user"
      });
    }

    if (userToDelete.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: "Không thể xóa tài khoản admin"
      });
    }

    // Xóa liên quan: Review → Booking → Payment → User
    await db.Review.destroy({ where: { user_id: userId } });
    await db.Payment.destroy({ where: { user_id: userId } });
    await db.Booking.destroy({ where: { user_id: userId } });
    await db.User.destroy({ where: { user_id: userId } });

    return res.json({ success: true, message: "Đã xóa user và dữ liệu liên quan" });
  } catch (error) {
    console.error("❌ Lỗi xóa user:", error);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};

// Xóa review
let deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    await db.Review.destroy({
      where: { review_id: reviewId }
    });

    return res.json({
      success: true,
      message: "Xóa đánh giá thành công"
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi xóa đánh giá"
    });
  }
};

// Thêm dịch vụ mới
let addService = async (req, res) => {
  try {
    const { service_name } = req.body;

    if (!service_name || service_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Tên dịch vụ không được để trống"
      });
    }

    // Kiểm tra trùng tên
    const existingService = await db.Service.findOne({
      where: { service_name: service_name.trim() }
    });

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: "Dịch vụ này đã tồn tại"
      });
    }

    const newService = await db.Service.create({
      service_name: service_name.trim()
    });

    return res.json({
      success: true,
      message: "Thêm dịch vụ thành công",
      service: newService
    });
  } catch (error) {
    console.error("Error adding service:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi thêm dịch vụ"
    });
  }
};

// Cập nhật dịch vụ
let updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { service_name } = req.body;

    if (!service_name || service_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Tên dịch vụ không được để trống"
      });
    }

    await db.Service.update(
      { service_name: service_name.trim() },
      { where: { service_id: serviceId } }
    );

    return res.json({
      success: true,
      message: "Cập nhật dịch vụ thành công"
    });
  } catch (error) {
    console.error("Error updating service:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật dịch vụ"
    });
  }
};

// Xóa dịch vụ
let deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    await db.Service.destroy({
      where: { service_id: serviceId }
    });

    return res.json({
      success: true,
      message: "Xóa dịch vụ thành công"
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi xóa dịch vụ"
    });
  }
};
let getUserInfoById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await db.User.findByPk(userId, {
      attributes: ['user_id', 'role', 'name', 'dob', 'email', 'phone', 'gender', 'created_at', 'updated_at'],
    });

    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    const bookingCount = await db.Booking.count({ where: { user_id: userId } });

    return res.json({ success: true, user, bookingCount });
  } catch (err) {
    console.error("❌ Lỗi lấy thông tin user:", err);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};
let updateUserInfo = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, dob, phone, gender, email, currentPassword, newPassword } = req.body;

    const user = await db.User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    // ✅ Cập nhật thông tin cơ bản
    await user.update({ name, dob, phone, gender, email });

    // ✅ Nếu đổi mật khẩu → phải xác minh
    if (newPassword && currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Mật khẩu hiện tại không đúng" });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await user.update({ password_hash: hashed });
    }

    return res.json({ success: true, message: "Cập nhật thông tin thành công" });
  } catch (error) {
    console.error("❌ Lỗi cập nhật user:", error);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};
let getBookingById = async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await db.Booking.findOne({
      where: { booking_id: id },
      include: [{ model: db.User }, { model: db.RoomType }],
    });

    if (!booking) {
      return res.json({ success: false, message: "Không tìm thấy hóa đơn" });
    }

    return res.json({ success: true, booking });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Lỗi khi lấy hóa đơn" });
  }
};
let createUser = async (req, res) => {
  try {
    const { name, email, password, phone, gender, dob, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Tên, email và mật khẩu là bắt buộc"
      });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await db.User.findOne({
      where: { email: email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email đã được sử dụng"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ"
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    const newUser = await db.User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hashedPassword,
      phone: phone || null,
      gender: gender || null,
      dob: dob || null,
      role: role === 'admin' ? 'admin' : 'user'
    });

    return res.json({
      success: true,
      message: "Tạo tài khoản thành công",
      user: {
        user_id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        gender: newUser.gender,
        dob: newUser.dob,
        created_at: newUser.created_at
      }
    });
  } catch (error) {
    console.error("❌ Lỗi tạo user:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống: " + error.message
    });
  }
};
let createBooking = async (req, res) => {
  try {
    const { 
      user_id, 
      homestay_id, 
      name, 
      booking_date, 
      check_in_date, 
      check_out_date, 
      adults, 
      children, 
      total_price,
      guest_email,
      guest_phone,
      guest_address,
      payment_method,
      payment_status
    } = req.body;

    // Validation (bỏ room_type_id vì đặt cả homestay)
    if (!user_id || !homestay_id || !name || !booking_date || 
        !check_in_date || !check_out_date || !adults || !total_price) {
      return res.status(400).json({
        success: false,
        message: "Các trường bắt buộc không được để trống"
      });
    }

    // Kiểm tra user tồn tại
    const userExists = await db.User.findByPk(user_id);
    if (!userExists) {
      return res.status(400).json({
        success: false,
        message: "Người dùng không tồn tại"
      });
    }

    // Kiểm tra homestay tồn tại
    const homestayExists = await db.Homestay.findByPk(homestay_id, {
      include: [{ model: db.RoomType }]
    });
    if (!homestayExists) {
      return res.status(400).json({
        success: false,
        message: "Homestay không tồn tại"
      });
    }

    // Validate ngày
    const checkinDate = new Date(check_in_date);
    const checkoutDate = new Date(check_out_date);
    const today = new Date();
    
    if (checkinDate >= checkoutDate) {
      return res.status(400).json({
        success: false,
        message: "Ngày check-out phải sau ngày check-in"
      });
    }

    if (checkinDate < today.setHours(0,0,0,0)) {
      return res.status(400).json({
        success: false,
        message: "Ngày check-in không thể là ngày trong quá khứ"
      });
    }

    // Kiểm tra tất cả phòng trong homestay có trống không
    const roomIds = homestayExists.RoomTypes.map(room => room.room_type_id);
    
    const conflictBooking = await db.Booking.findOne({
      where: {
        room_type_id: { [db.Sequelize.Op.in]: roomIds },
        payment_status: { [db.Sequelize.Op.in]: ['paid', 'pending'] },
        [db.Sequelize.Op.or]: [
          {
            check_in_date: {
              [db.Sequelize.Op.between]: [check_in_date, check_out_date]
            }
          },
          {
            check_out_date: {
              [db.Sequelize.Op.between]: [check_in_date, check_out_date]  
            }
          },
          {
            check_in_date: { [db.Sequelize.Op.lte]: check_in_date },
            check_out_date: { [db.Sequelize.Op.gte]: check_out_date }
          }
        ]
      }
    });

    if (conflictBooking) {
      return res.status(400).json({
        success: false,
        message: "Homestay đã có phòng được đặt trong thời gian này"
      });
    }

    // Tạo order_id
    const order_id = `HOTEL_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // ✅ TẠO BOOKING CHO TỪNG PHÒNG TRONG HOMESTAY
    const bookings = [];
    const payments = [];

    for (const roomType of homestayExists.RoomTypes) {
      const booking = await db.Booking.create({
        user_id,
        homestay_id,
        room_type_id: roomType.room_type_id,
        name,
        booking_date: booking_date || new Date(),
        check_in_date,
        check_out_date,
        adults: parseInt(adults),
        children: parseInt(children) || 0,
        total_price: parseFloat(total_price), // Tổng tiền cho cả homestay
        order_id: `${order_id}_ROOM_${roomType.room_type_id}`, // Unique order_id cho mỗi phòng
        guest_email: guest_email || null,
        guest_phone: guest_phone || null,
        guest_address: guest_address || null,
        payment_method: payment_method || 'cash',
        payment_status: payment_status || 'pending'
      });

      bookings.push(booking);

      // Tạo payment record cho từng booking
      const payment = await db.Payment.create({
        booking_id: booking.booking_id,
        user_id,
        amount: parseFloat(total_price),
        status: payment_status || 'pending', 
        transaction_id: `CASH_${order_id}_ROOM_${roomType.room_type_id}`,
        payment_method: payment_method || 'cash',
        processed_at: payment_status === 'paid' ? new Date() : null,
        paid_at: payment_status === 'paid' ? new Date() : null
      });

      payments.push(payment);
    }

    return res.json({
      success: true,
      message: `Tạo hóa đơn thành công cho homestay ${homestayExists.name} (${bookings.length} phòng)`,
      bookings: bookings,
      payments: payments
    });

  } catch (error) {
    console.error("❌ Lỗi tạo booking:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống: " + error.message
    });
  }
};

// Function để lấy danh sách users (cho dropdown)
let getUsersForBooking = async (req, res) => {
  try {
    const users = await db.User.findAll({
      where: { role: 'user' }, // ✅ CHỈ LẤY USER CÓ ROLE 'user'
      attributes: ['user_id', 'name', 'email'],
      order: [['name', 'ASC']]
    });

    return res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error("❌ Lỗi lấy users:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách users"
    });
  }
};

const getHomestaysForBooking = async (req, res) => {
  try {
    const homestays = await db.Homestay.findAll({
      include: [{ model: db.RoomType }],
      order: [['name', 'ASC']]
    });

    // Map lại thông tin cần thiết cho frontend
    const data = homestays.map(h => ({
      homestay_id: h.homestay_id,
      name: h.name,
      address: h.address,
      room_count: h.RoomTypes.length,
      // lấy giá đêm trung bình từ room types
      total_price_per_night: h.RoomTypes.length
        ? Math.min(...h.RoomTypes.map(r => r.price_per_night))
        : 0
    }));

    return res.json({ success: true, homestays: data });
  } catch (error) {
    console.error("Error loading homestays for booking:", error);
    return res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};
let updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { 
      user_id, 
      homestay_id, 
      name, 
      booking_date, 
      check_in_date, 
      check_out_date, 
      adults, 
      children, 
      total_price,
      guest_email,
      guest_phone,
      guest_address,
      payment_method,
      payment_status
    } = req.body;

    // Kiểm tra booking tồn tại
    const existingBooking = await db.Booking.findByPk(bookingId);
    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hóa đơn"
      });
    }

    // Validation
    if (!user_id || !homestay_id || !name || !booking_date || 
        !check_in_date || !check_out_date || !adults || !total_price) {
      return res.status(400).json({
        success: false,
        message: "Các trường bắt buộc không được để trống"
      });
    }

    // Kiểm tra user tồn tại
    const userExists = await db.User.findByPk(user_id);
    if (!userExists) {
      return res.status(400).json({
        success: false,
        message: "Người dùng không tồn tại"
      });
    }

    // Kiểm tra homestay tồn tại
    const homestayExists = await db.Homestay.findByPk(homestay_id);
    if (!homestayExists) {
      return res.status(400).json({
        success: false,
        message: "Homestay không tồn tại"
      });
    }

    // Validate ngày
    const checkinDate = new Date(check_in_date);
    const checkoutDate = new Date(check_out_date);
    
    if (checkinDate >= checkoutDate) {
      return res.status(400).json({
        success: false,
        message: "Ngày check-out phải sau ngày check-in"
      });
    }

    // Cập nhật booking
    await existingBooking.update({
      user_id,
      homestay_id,
      name,
      booking_date,
      check_in_date,
      check_out_date,
      adults: parseInt(adults),
      children: parseInt(children) || 0,
      total_price: parseFloat(total_price),
      guest_email: guest_email || null,
      guest_phone: guest_phone || null,
      guest_address: guest_address || null,
      payment_method: payment_method || 'cash',
      payment_status: payment_status || 'pending'
    });

    // Cập nhật payment record tương ứng
    const payment = await db.Payment.findOne({
      where: { booking_id: bookingId }
    });

    if (payment) {
      await payment.update({
        user_id,
        amount: parseFloat(total_price),
        status: payment_status || 'pending',
        payment_method: payment_method || 'cash',
        processed_at: payment_status === 'paid' ? new Date() : null,
        paid_at: payment_status === 'paid' ? new Date() : null
      });
    }

    return res.json({
      success: true,
      message: "Cập nhật hóa đơn thành công",
      booking: existingBooking
    });

  } catch (error) {
    console.error("❌ Lỗi cập nhật booking:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống: " + error.message
    });
  }
};

// THÊM function lấy chi tiết booking để edit
let getBookingForEdit = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await db.Booking.findByPk(bookingId, {
      include: [
        {
          model: db.User,
          attributes: ['user_id', 'name', 'email']
        },
        {
          model: db.Homestay,
          attributes: ['homestay_id', 'name', 'address']
        },
        {
          model: db.RoomType,
          attributes: ['room_type_id', 'type_name']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hóa đơn"
      });
    }

    return res.json({
      success: true,
      booking: booking
    });

  } catch (error) {
    console.error("❌ Lỗi lấy booking:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống: " + error.message
    });
  }
};
module.exports = {
  checkAdminRole,
  getAdminDashboard,
  getUsersAdmin,
  getHomestaysAdmin,
  getRoomsAdmin,
  getBookingsAdmin,
  getReviewsAdmin,
  getServicesAdmin,
  updateBookingStatus,
  deleteUser,
  deleteReview,
  addService,
  updateService,
  deleteService,
  getUserInfoById,
  updateUserInfo,
  getBookingById,
  createUser,
  createBooking,        
  getUsersForBooking,   
  getHomestaysForBooking,
  updateBooking,        
  getBookingForEdit,    
};