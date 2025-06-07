const db = require("../models/index");
const { Op } = require("sequelize");

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
      { status: status },
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

    await db.User.destroy({
      where: { user_id: userId }
    });

    return res.json({
      success: true,
      message: "Xóa user thành công"
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi xóa user"
    });
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
  deleteService
};