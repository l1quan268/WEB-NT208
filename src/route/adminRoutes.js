const express = require("express");
const adminController = require("../controllers/adminController");

let router = express.Router();

// Áp dụng middleware kiểm tra admin cho tất cả routes admin
router.use(adminController.checkAdminRole);

// Admin dashboard
router.get("/", adminController.getAdminDashboard);

// User management
router.get("/users", adminController.getUsersAdmin);
router.delete("/users/:userId", adminController.deleteUser);
router.get("/users/:userId", adminController.getUserInfoById);
router.put("/users/:userId", adminController.updateUserInfo);
router.post("/users", adminController.createUser);

// Homestay management
router.get("/homestays", adminController.getHomestaysAdmin);

// Room management
router.get("/rooms", adminController.getRoomsAdmin);

// Booking management
router.get("/bookings", adminController.getBookingsAdmin);
router.post("/bookings", adminController.createBooking); 
router.get("/bookings/users", adminController.getUsersForBooking);
router.get("/bookings/homestays", adminController.getHomestaysForBooking);
router.put("/bookings/:bookingId/status", adminController.updateBookingStatus);
router.put("/bookings/:bookingId", adminController.updateBooking);        
router.get("/bookings/:bookingId/edit", adminController.getBookingForEdit); 
router.get('/bookings/:id', adminController.getBookingById);

// Review management
router.get("/reviews", adminController.getReviewsAdmin);
router.delete("/reviews/:reviewId", adminController.deleteReview);

// Service management
router.get("/services", adminController.getServicesAdmin);
router.post("/services", adminController.addService);
router.put("/services/:serviceId", adminController.updateService);
router.delete("/services/:serviceId", adminController.deleteService);


module.exports = router;