// File: controllers/paymentController.js
import moment from "moment";
import db from "../models/index.js";
import crypto from "crypto";
import querystring from "qs";

// VNPay configuration
const VNP_TMN_CODE = process.env.VNP_TMN_CODE || "S2TTOR81";
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || "MTXXC74DNQWKRHOQ6N08CGAYJ5EXIYLZ";
const VNP_URL = process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const BASE_URL = process.env.BASE_URL || "http://localhost:9999"; // Updated to match server port

// Helper function to build VNPay checkout URL
const buildVNPayUrl = (params) => {
  const {
    amount,
    orderId,
    orderInfo,
    returnUrl,
    ipAddr,
    locale = "vn",
    currCode = "VND",
    orderType = "other"
  } = params;

  const createDate = moment().format("YYYYMMDDHHmmss");
  const expireDate = moment().add(15, "minutes").format("YYYYMMDDHHmmss");

  const vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: VNP_TMN_CODE,
    vnp_Locale: locale,
    vnp_CurrCode: currCode,
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType,
    vnp_Amount: amount * 100, // VNPay requires amount in cents
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  // Sort parameters
  const sortedParams = {};
  Object.keys(vnp_Params)
    .sort()
    .forEach((key) => {
      sortedParams[key] = vnp_Params[key];
    });

  // Create query string
  const signData = querystring.stringify(sortedParams, { encode: false });
  
  // Create secure hash
  const hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
  const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  // Add secure hash to params
  sortedParams.vnp_SecureHash = secureHash;

  // Build final URL
  const paymentUrl = VNP_URL + "?" + querystring.stringify(sortedParams, { encode: false });

  return paymentUrl;
};

// Hiển thị trang thanh toán
export const getPaymentPage = async (req, res) => {
  try {
    console.log("🔍 Payment page request:");
    console.log("Query params:", req.query);
    console.log("Full URL:", req.originalUrl);
    
    const { room_id, checkin, checkout } = req.query;

    console.log("Extracted params:", { room_id, checkin, checkout });

    if (!room_id || !checkin || !checkout) {
      console.log("❌ Missing required parameters");
      return res.status(400).send(`
        <h3>Thiếu thông tin phòng hoặc ngày</h3>
        <p>Cần có: room_id, checkin, checkout</p>
        <p>Nhận được: ${JSON.stringify(req.query)}</p>
        <a href="/">Về trang chủ</a>
      `);
    }

    // **FIX: Simple room lookup without association**
    let room;
    try {
      room = await db.RoomType.findByPk(room_id);
      console.log("🏠 Found room:", room ? `ID: ${room.id}, Name: ${room.type_name}` : 'NULL');
    } catch (err) {
      console.error("❌ Room lookup error:", err.message);
      room = {
        id: room_id,
        type_name: "Test Room",
        price_per_night: 500000
      };
    }

    if (!room) {
      console.log("❌ Room not found, using fallback");
      room = {
        id: room_id,
        type_name: "Default Room",
        price_per_night: 500000
      };
    }

    console.log("✅ Rendering payment page with data:", {
      room_id: room_id,    // Pass room_id explicitly
      room: room,
      checkin: checkin,
      checkout: checkout
    });

    return res.render("Payment/payment.ejs", {
      room_id: room_id,    // **ADD: Pass room_id for EJS**
      room: room,
      checkin: checkin,
      checkout: checkout,
      user: req.session?.user || null,
    });
  } catch (err) {
    console.error("❌ Payment page error:", err);
    res.status(500).send(`
      <h3>Lỗi hệ thống</h3>
      <p>Error: ${err.message}</p>
      <a href="/">Về trang chủ</a>
    `);
  }
};

// Xử lý checkout với nhiều phương thức thanh toán
// Fixed postCheckout to match exact database schema

// Fixed postCheckout to match exact database schema

export const postCheckout = async (req, res) => {
  try {
    const {
      room_id,
      checkin,
      checkout,
      fullname,
      address,
      phone,
      email,
      note,
      paymentMethod = "cash",
      createAccount
    } = req.body;

    console.log("📝 Received checkout request:", req.body);

    // Validate required fields
    if (!room_id || !checkin || !checkout || !fullname || !phone || !email) {
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu thông tin bắt buộc" 
      });
    }

    // Validate payment method
    const allowedPaymentMethods = ["vnpay", "momo", "cash"];
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Phương thức thanh toán không hợp lệ"
      });
    }

    // Get room info (simplified)
    let room;
    try {
      room = await db.RoomType.findByPk(room_id);
      if (!room) {
        return res.status(404).json({ 
          success: false, 
          message: "Không tìm thấy phòng" 
        });
      }
    } catch (roomError) {
      console.error("❌ Room query error:", roomError);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi tìm phòng"
      });
    }

    // Calculate pricing
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 3600 * 24));
    const roomPrice = parseFloat(room.price_per_night || 500000);
    const amount = roomPrice * nights;

    // Generate unique order ID
    const orderId = `HOTEL_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // Handle user_id
    let userId = null;
    if (req.session?.user?.id) {
      userId = req.session.user.id;
    }

    // **FIX: Create booking data matching EXACT database schema**
    const bookingData = {
      // Required fields matching database
      booking_id: null, // Auto-increment
      user_id: userId,
      homestay_id: room.homestay_id || null,
      room_type_id: parseInt(room_id),
      name: fullname,
      booking_date: new Date(),
      check_in_date: checkinDate,
      check_out_date: checkoutDate,
      adults: 2,
      children: 0,
      total_price: amount,
      status: 'pending',
      order_id: orderId,
      guest_email: email,
      guest_phone: phone,
      guest_address: address || '',
      payment_method: paymentMethod,
      payment_status: 'pending',
      transaction_id: null,
      paid_at: null
      // **REMOVED: special_requests (not in database schema)**
    };

    console.log("📝 Creating booking with schema-matched data:", bookingData);

    // Save booking to database
    let booking;
    try {
      booking = await db.Booking.create(bookingData);
      console.log("✅ Booking created with ID:", booking.booking_id || booking.id);
    } catch (dbError) {
      console.error("❌ Database error details:", {
        message: dbError.message,
        sql: dbError.sql,
        fields: dbError.fields,
        original: dbError.original
      });
      
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lưu thông tin đặt phòng: " + dbError.message
      });
    }

    // Handle cash payment
    if (paymentMethod === "cash") {
      console.log("💰 Processing cash payment for order:", orderId);

      return res.status(200).json({
        success: true,
        payment_method: "cash",
        order_id: orderId,
        booking_id: booking.booking_id || booking.id,
        booking_details: {
          guest_name: fullname,
          room_type: room.type_name,
          homestay_name: 'Homestay Name', // Will get from association later
          checkin: checkinDate.toISOString().split('T')[0],
          checkout: checkoutDate.toISOString().split('T')[0],
          nights: nights,
          total_amount: amount,
          formatted_amount: amount.toLocaleString('vi-VN') + ' ₫'
        },
        instructions: {
          title: "Hướng dẫn thanh toán tiền mặt",
          steps: [
            "1. Vui lòng có mặt đúng giờ check-in",
            "2. Chuẩn bị đủ tiền mặt để thanh toán",
            "3. Mang theo giấy tờ tùy thân hợp lệ", 
            "4. Xuất trình mã đặt phòng: " + orderId
          ]
        },
        contact_info: {
          hotline: "1900-xxx-xxx",
          email: "support@sweethome.vn"
        },
        message: "Đặt phòng thành công! Vui lòng thanh toán bằng tiền mặt khi nhận phòng.",
        note: note ? `Ghi chú: ${note}` : null // Include note in response instead of database
      });
    }

    // Handle VNPay
    if (paymentMethod === "vnpay") {
      console.log("💳 Processing VNPay payment for order:", orderId);
      
      const returnUrl = `http://localhost:9999/api/vnpay_return`;
      const ipAddr = req.headers["x-forwarded-for"] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     "127.0.0.1";

      const paymentUrl = buildVNPayUrl({
        amount,
        orderId,
        orderInfo: `Thanh toan dat phong - ${fullname} - ${orderId}`,
        returnUrl,
        ipAddr: ipAddr.replace("::ffff:", ""),
        locale: "vn"
      });

      return res.json({
        success: true,
        payment_method: "vnpay",
        redirect_url: paymentUrl,
        order_id: orderId,
        booking_id: booking.booking_id || booking.id
      });
    }

    // Handle MoMo
    if (paymentMethod === "momo") {
      console.log("📱 Processing MoMo payment for order:", orderId);
      
      return res.json({
        success: true,
        payment_method: "momo",
        redirect_url: "https://test-payment.momo.vn/...",
        order_id: orderId,
        booking_id: booking.booking_id || booking.id
      });
    }

  } catch (error) {
    console.error("❌ Checkout error:", {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({ 
      success: false, 
      message: "Lỗi hệ thống: " + error.message
    });
  }
};

// Xử lý kết quả thanh toán trả về từ VNPay
export const handleVNPayReturn = async (req, res) => {
  try {
    console.log("🔄 VNPay return params:", req.query);

    const vnp_Params = { ...req.query };
    const secureHash = vnp_Params["vnp_SecureHash"];

    // Remove secure hash for verification
    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    // Sort parameters
    const sortedParams = {};
    Object.keys(vnp_Params)
      .sort()
      .forEach((key) => {
        sortedParams[key] = vnp_Params[key];
      });

    // Create signature
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
    const calculatedHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    console.log("🔐 Signature verification:", {
      received: secureHash,
      calculated: calculatedHash,
      match: secureHash === calculatedHash
    });

    if (secureHash === calculatedHash) {
      const { vnp_ResponseCode, vnp_TxnRef, vnp_Amount, vnp_BankCode, vnp_PayDate, vnp_TransactionNo } = vnp_Params;

      if (vnp_ResponseCode === "00") {
        // Payment successful
        console.log("✅ Payment successful:", {
          orderId: vnp_TxnRef,
          amount: vnp_Amount / 100,
          transactionNo: vnp_TransactionNo
        });

        // Update booking status using existing table structure
        const updateResult = await db.Booking.update(
          { 
            status: "completed", // Using existing enum values
            payment_status: "paid", 
            transaction_id: vnp_TransactionNo,
            paid_at: new Date()
          },
          { where: { order_id: vnp_TxnRef } }
        );

        // Create or update payment record
        const booking = await db.Booking.findOne({ 
          where: { order_id: vnp_TxnRef } 
        });

        if (booking) {
          await db.Payment.upsert({
            booking_id: booking.booking_id,
            user_id: booking.user_id,
            amount: vnp_Amount / 100,
            status: 'completed',
            transaction_id: vnp_TransactionNo,
            payment_method: 'vnpay',
            paid_at: new Date()
          });
        }

        if (updateResult[0] === 0) {
          console.log("⚠️ No booking found to update for order:", vnp_TxnRef);
        }

        // Redirect to success page
        return res.redirect(`/payment-success?order_id=${vnp_TxnRef}&transaction_id=${vnp_TransactionNo}&amount=${vnp_Amount / 100}`);

      } else {
        // Payment failed
        console.log("❌ Payment failed:", {
          orderId: vnp_TxnRef,
          responseCode: vnp_ResponseCode
        });

        const errorMessage = getVNPayErrorMessage(vnp_ResponseCode);
        
        // Update booking status to cancelled
        await db.Booking.update(
          { 
            status: "canceled", // Using existing enum value
            payment_status: "failed" 
          },
          { where: { order_id: vnp_TxnRef } }
        );

        // Create failed payment record
        const booking = await db.Booking.findOne({ 
          where: { order_id: vnp_TxnRef } 
        });

        if (booking) {
          await db.Payment.upsert({
            booking_id: booking.booking_id,
            user_id: booking.user_id,
            amount: vnp_Amount / 100,
            status: 'failed',
            transaction_id: vnp_TxnRef + '_FAILED',
            payment_method: 'vnpay'
          });
        }

        return res.redirect(`/payment-failed?order_id=${vnp_TxnRef}&error=${encodeURIComponent(errorMessage)}`);
      }
    } else {
      console.log("❌ Invalid signature");
      return res.redirect("/payment-failed?error=invalid_signature");
    }

  } catch (error) {
    console.error("❌ VNPay return error:", error);
    return res.redirect("/payment-failed?error=system_error");
  }
};

// VNPay IPN (Instant Payment Notification) handler
export const handleVNPayIPN = async (req, res) => {
  try {
    const vnp_Params = { ...req.query };
    const secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    const sortedParams = {};
    Object.keys(vnp_Params)
      .sort()
      .forEach((key) => {
        sortedParams[key] = vnp_Params[key];
      });

    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
    const calculatedHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash === calculatedHash) {
      const { vnp_ResponseCode, vnp_TxnRef } = vnp_Params;

      // Check if order exists in database
      const booking = await db.Booking.findOne({ where: { order_id: vnp_TxnRef } });
      if (!booking) {
        return res.json({ RspCode: "01", Message: "Order not found" });
      }

      if (vnp_ResponseCode === "00") {
        // Update booking status
        await db.Booking.update(
          { 
            status: "completed",
            payment_status: "paid" 
          },
          { where: { order_id: vnp_TxnRef } }
        );
        
        return res.json({ RspCode: "00", Message: "Success" });
      } else {
        // Payment failed
        await db.Booking.update(
          { 
            status: "canceled",
            payment_status: "failed" 
          },
          { where: { order_id: vnp_TxnRef } }
        );
        
        return res.json({ RspCode: "00", Message: "Success" });
      }
    } else {
      return res.json({ RspCode: "97", Message: "Invalid signature" });
    }
  } catch (error) {
    console.error("❌ VNPay IPN error:", error);
    return res.json({ RspCode: "99", Message: "System error" });
  }
};

// **FIX: Add safer association handling for other functions**
export const getBookingInfo = async (req, res) => {
  try {
    const { order_id } = req.params;
    
    // **FIX: Try different association approaches**
    let booking;
    try {
      booking = await db.Booking.findOne({
        where: { order_id },
        include: [
          { 
            model: db.RoomType, 
            as: 'roomType',
            include: [{ model: db.Homestay, as: 'Homestay' }]
          },
          { model: db.User, as: 'user' },
          { model: db.Payment, as: 'payment' }
        ]
      });
    } catch (aliasError) {
      console.log("🔍 Trying alternative association for booking info...");
      booking = await db.Booking.findOne({
        where: { order_id }
      });
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy booking với mã: ' + order_id
      });
    }

    const nights = Math.ceil((new Date(booking.check_out_date) - new Date(booking.check_in_date)) / (1000 * 3600 * 24));

    return res.json({
      success: true,
      booking: {
        order_id: booking.order_id,
        booking_id: booking.booking_id,
        guest_name: booking.name,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone,
        guest_address: booking.guest_address,
        room_type: booking.roomType?.type_name || 'N/A',
        homestay_name: booking.roomType?.Homestay?.name || booking.roomType?.homestay?.name || 'N/A',
        checkin_date: booking.check_in_date,
        checkout_date: booking.check_out_date,
        nights: nights,
        total_amount: booking.total_price,
        formatted_amount: parseFloat(booking.total_price).toLocaleString('vi-VN') + ' ₫',
        payment_method: booking.payment_method,
        payment_status: booking.payment_status,
        booking_status: booking.status,
        special_requests: booking.special_requests,
        created_at: booking.created_at
      }
    });

  } catch (error) {
    console.error("❌ Get booking info error:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin booking: ' + error.message
    });
  }
};

// Confirm cash payment (for staff use)
export const confirmCashPayment = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { staff_id, notes } = req.body;

    // Find booking
    const booking = await db.Booking.findOne({
      where: { order_id }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy booking'
      });
    }

    if (booking.payment_method !== 'cash') {
      return res.status(400).json({
        success: false,
        message: 'Booking này không phải thanh toán bằng tiền mặt'
      });
    }

    if (booking.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Booking này đã được thanh toán rồi'
      });
    }

    // Update booking status
    await db.Booking.update(
      { 
        payment_status: 'paid',
        paid_at: new Date(),
        status: 'completed'
      },
      { where: { order_id } }
    );

    // Update payment record
    await db.Payment.update(
      {
        status: 'completed',
        paid_at: new Date(),
        transaction_id: `CASH_PAID_${Date.now()}`,
        gateway_response: JSON.stringify({
          payment_type: 'cash',
          staff_id: staff_id,
          confirmed_at: new Date(),
          notes: notes
        })
      },
      { where: { booking_id: booking.booking_id } }
    );

    console.log(`✅ Cash payment confirmed for order: ${order_id} by staff: ${staff_id}`);

    return res.json({
      success: true,
      message: 'Xác nhận thanh toán tiền mặt thành công',
      order_id: order_id,
      paid_at: new Date(),
      confirmed_by: staff_id
    });

  } catch (error) {
    console.error("❌ Confirm cash payment error:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xác nhận thanh toán: ' + error.message
    });
  }
};

// Get cash payment report
export const getCashPaymentReport = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    // **FIX: Safer query for cash payment report**
    let cashBookings;
    try {
      cashBookings = await db.Booking.findAll({
        where: {
          payment_method: 'cash',
          booking_date: targetDate
        },
        include: [
          { 
            model: db.RoomType, 
            as: 'roomType',
            include: [{ model: db.Homestay, as: 'Homestay' }]
          },
          { model: db.Payment, as: 'payment' }
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (associationError) {
      console.log("🔍 Using simplified query for cash payment report...");
      cashBookings = await db.Booking.findAll({
        where: {
          payment_method: 'cash',
          booking_date: targetDate
        },
        order: [['created_at', 'DESC']]
      });
    }

    const summary = {
      total_bookings: cashBookings.length,
      paid_bookings: cashBookings.filter(b => b.payment_status === 'paid').length,
      pending_bookings: cashBookings.filter(b => b.payment_status === 'pending').length,
      total_amount: cashBookings.reduce((sum, b) => sum + parseFloat(b.total_price), 0),
      paid_amount: cashBookings
        .filter(b => b.payment_status === 'paid')
        .reduce((sum, b) => sum + parseFloat(b.total_price), 0),
      pending_amount: cashBookings
        .filter(b => b.payment_status === 'pending')
        .reduce((sum, b) => sum + parseFloat(b.total_price), 0)
    };

    return res.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      summary: {
        ...summary,
        formatted_total: summary.total_amount.toLocaleString('vi-VN') + ' ₫',
        formatted_paid: summary.paid_amount.toLocaleString('vi-VN') + ' ₫',
        formatted_pending: summary.pending_amount.toLocaleString('vi-VN') + ' ₫'
      },
      bookings: cashBookings.map(booking => ({
        order_id: booking.order_id,
        guest_name: booking.name,
        guest_phone: booking.guest_phone,
        room_type: booking.roomType?.type_name || 'N/A',
        homestay: booking.roomType?.Homestay?.name || booking.roomType?.homestay?.name || 'N/A',
        total_amount: booking.total_price,
        payment_status: booking.payment_status,
        paid_at: booking.paid_at,
        created_at: booking.created_at
      }))
    });

  } catch (error) {
    console.error("❌ Get cash payment report error:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy báo cáo: ' + error.message
    });
  }
};

const getVNPayErrorMessage = (responseCode) => {
  const errorMessages = {
    "01": "Giao dịch chưa hoàn tất",
    "02": "Giao dịch bị lỗi",
    "04": "Giao dịch đảo (Khách hàng đã bị trừ tiền tại Ngân hàng nhưng GD chưa thành công ở VNPAY)",
    "05": "VNPAY đang xử lý giao dịch này (GD hoàn tiền)",
    "06": "VNPAY đã gửi yêu cầu hoàn tiền sang Ngân hàng (GD hoàn tiền)",
    "07": "Giao dịch bị nghi ngờ gian lận",
    "09": "GD Hoàn trả bị từ chối",
    "10": "Đã giao hàng",
    "11": "Giao dịch không thành công do: Khách hàng nhập sai mật khẩu",
    "12": "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa",
    "13": "Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP)",
    "24": "Giao dịch không thành công do: Khách hàng hủy giao dịch",
    "51": "Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch",
    "65": "Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày",
    "75": "Ngân hàng thanh toán đang bảo trì",
    "79": "Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định",
    "99": "Các lỗi khác"
  };

  return errorMessages[responseCode] || "Lỗi không xác định";
};

export default {
  getPaymentPage,
  postCheckout,
  handleVNPayReturn,
  handleVNPayIPN,
  getBookingInfo,
  confirmCashPayment,
  getCashPaymentReport
};