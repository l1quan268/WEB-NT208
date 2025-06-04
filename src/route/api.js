const express = require("express");
const homeController = require("../controllers/homeController");

const router = express.Router();

// API: Gửi đánh giá
router.post("/review", homeController.postReview);

module.exports = router;
