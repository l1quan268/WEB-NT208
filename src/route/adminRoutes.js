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
router.get("/homestays/list", adminController.getHomestaysList);
router.get("/homestays", adminController.getHomestaysAdmin);
router.get("/homestays/:homestayId", adminController.getHomestayById);
router.put("/homestays/:homestayId", adminController.updateHomestay);
router.post("/homestays", adminController.createHomestay);
router.delete("/homestays/:homestayId", adminController.deleteHomestay);

// Room management
router.get("/rooms", adminController.getRoomsAdmin);
router.get("/rooms/:roomId", adminController.getRoomById);
router.put("/rooms/:roomId", adminController.updateRoom);
router.get("/rooms", adminController.getRoomsAdmin);
router.get("/rooms/:roomId", adminController.getRoomById);
router.put("/rooms/:roomId", adminController.updateRoom);
router.post("/rooms", adminController.createRoom);
router.delete("/rooms/:roomId", adminController.deleteRoom);

// Room images
router.get("/rooms/:roomId/images", adminController.getRoomImages);
router.post("/rooms/:roomId/images", adminController.addRoomImage);
router.delete("/rooms/images/:imageId", adminController.deleteRoomImage);
router.put("/rooms/:roomId/thumbnail", adminController.setRoomThumbnail);

// Room services
router.get("/rooms/:roomId/services", adminController.getRoomServices);
router.put("/rooms/:roomId/services", adminController.updateRoomServices);


// Booking management
router.get("/bookings", adminController.getBookingsAdmin);
router.post("/bookings", adminController.createBooking); 
router.get("/bookings/users", adminController.getUsersForBooking);
router.get("/bookings/homestays", adminController.getHomestaysForBooking);
router.get("/bookings/homestays/:homestay_id/rooms", adminController.getRoomsByHomestay); // ✅ THÊM
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