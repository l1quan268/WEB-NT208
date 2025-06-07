// File: controllers/paymentController.js
const moment = require("moment");
const db = require("../models/index.js");
const crypto = require("crypto");
const querystring = require("qs");

// VNPay configuration
const VNP_TMN_CODE = process.env.VNP_TMN_CODE || "2ZKVU3BZ";
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || "AL1FQSVIRA9YRR7IWC6DCGSUJZWU14NY";
const VNP_URL = process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const BASE_URL = process.env.BASE_URL || "https://sweethome1.id.vn";

// VNPay URL builder
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

  // Validate required parameters
  if (!amount || !orderId || !orderInfo || !returnUrl) {
    throw new Error("Missing required VNPay parameters");
  }

  // Ensure amount is valid
  const vnpAmount = Math.round(parseFloat(amount)) * 100;
  if (vnpAmount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const createDate = moment().format("YYYYMMDDHHmmss");
  const expireDate = moment().add(24, "hours").format("YYYYMMDDHHmmss");

  const vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: VNP_TMN_CODE,
    vnp_Locale: locale,
    vnp_CurrCode: currCode,
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType,
    vnp_Amount: vnpAmount,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    ...(expireDate && { vnp_ExpireDate: expireDate })
  };

  // Sort parameters alphabetically (critical for VNPay)
  const sortedParams = {};
  Object.keys(vnp_Params)
    .sort()
    .forEach((key) => {
      if (vnp_Params[key] !== null && vnp_Params[key] !== undefined && vnp_Params[key] !== '') {
        sortedParams[key] = vnp_Params[key];
      }
    });

  // Create secure hash
  const signData = querystring.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
  const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  sortedParams.vnp_SecureHash = secureHash;
  const paymentUrl = VNP_URL + "?" + querystring.stringify(sortedParams, { encode: false });
  
  return paymentUrl;
};

// Calculate pricing with adult-only surcharge logic
const calculateRoomPricing = (room, checkinDate, checkoutDate, adults, children) => {
  const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 3600 * 24));
  const roomPrice = parseFloat(room.price_per_night || 500000);
  const baseAmount = roomPrice * nights;
  
  // Phụ thu chỉ áp dụng cho NGƯỜI LỚN > 5, trẻ em KHÔNG tính phụ thu
  const surchargePerNight = adults > 5 ? (adults - 5) * 100000 : 0;
  const totalSurcharge = surchargePerNight * nights;
  
  const totalAmount = baseAmount + totalSurcharge;
  const totalGuests = adults + children;

  return {
    nights,
    roomPrice,
    baseAmount,
    adults,
    children,
    totalGuests,
    surchargeAdults: adults > 5 ? adults - 5 : 0,
    surchargePerNight,
    totalSurcharge,
    totalAmount
  };
};

const getPaymentPage = async (req, res) => {
  try {
    const { room_id, checkin, checkout, adults, children } = req.query;
    
    if (!room_id || !checkin || !checkout) {
      return res.status(400).send(`<h3>Thiếu thông tin</h3><p>Vui lòng chọn phòng, ngày nhận và ngày trả phòng.</p>`);
    }

    let room = await db.RoomType.findByPk(room_id);
    if (!room) {
      room = {
        id: room_id,
        type_name: "Default Room",
        price_per_night: 500000,
        max_guests: 4
      };
    }

    const adultsCount = parseInt(adults) || 1;
    const childrenCount = parseInt(children) || 0;
    
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkinDate < today) {
      return res.status(400).send(`<h3>Ngày nhận phòng không hợp lệ</h3><p>Ngày nhận phòng phải từ hôm nay trở đi.</p>`);
    }

    if (checkoutDate <= checkinDate) {
      return res.status(400).send(`<h3>Ngày trả phòng không hợp lệ</h3><p>Ngày trả phòng phải sau ngày nhận phòng.</p>`);
    }

    const totalGuests = adultsCount + childrenCount;
    if (totalGuests > 15) {
      return res.status(400).send(`<h3>Số khách vượt quá giới hạn</h3><p>Tối đa 15 khách mỗi phòng.</p>`);
    }

    if (adultsCount < 1) {
      return res.status(400).send(`<h3>Số khách không hợp lệ</h3><p>Phải có ít nhất 1 người lớn.</p>`);
    }

    const pricing = calculateRoomPricing(room, checkinDate, checkoutDate, adultsCount, childrenCount);

    return res.render("Payment/payment.ejs", {
      room_id,
      room,
      checkin,
      checkout,
      adults: adultsCount,
      children: childrenCount,
      pricing,
      user: req.session?.user || null
    });
  } catch (err) {
    console.error("Payment page error:", err);
    res.status(500).send(`<h3>Lỗi hệ thống</h3><p>${err.message}</p>`);
  }
};

const postCheckout = async (req, res) => {
  let transaction;
  try {
    transaction = await db.sequelize.transaction();

    const {
      room_id, checkin, checkout, fullname, address,
      phone, email, note, paymentMethod = "cash"
    } = req.body;

    const adultsCount = parseInt(req.body.adults) || 0;
    const childrenCount = parseInt(req.body.children) || 0;

    // Enhanced validation - Only allow cash and vnpay
    if (!room_id || !checkin || !checkout || !fullname || !phone || !email) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu thông tin bắt buộc",
        missing_fields: {
          room_id: !room_id,
          checkin: !checkin,
          checkout: !checkout,
          fullname: !fullname,
          phone: !phone,
          email: !email
        }
      });
    }

    // Only allow VNPay and Cash
    const allowedPaymentMethods = ["vnpay", "cash"];
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: "Phương thức thanh toán không hợp lệ. Chỉ hỗ trợ VNPay và tiền mặt." 
      });
    }

    const room = await db.RoomType.findByPk(room_id, { transaction });
    if (!room) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng" });
    }

    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);

    if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Ngày không hợp lệ" });
    }

    if (checkoutDate <= checkinDate) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Ngày checkout phải sau ngày checkin" });
    }

    const pricing = calculateRoomPricing(room, checkinDate, checkoutDate, adultsCount, childrenCount);
    const orderId = `HOTEL_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const userId = req.session?.user?.id || null;

    // Create booking
    const bookingData = {
      user_id: userId,
      homestay_id: room.homestay_id || null,
      room_type_id: parseInt(room_id),
      name: fullname.trim(),
      booking_date: new Date(),
      check_in_date: checkinDate,
      check_out_date: checkoutDate,
      adults: adultsCount,
      children: childrenCount,
      total_price: pricing.totalAmount,
      status: 'pending',
      order_id: orderId,
      guest_email: email.trim(),
      guest_phone: phone.trim(),
      guest_address: (address || '').trim(),
      payment_method: paymentMethod,
      payment_status: 'pending',
      special_requests: (note || '').trim(),
      created_at: new Date(),
      updated_at: new Date()
    };

    const booking = await db.Booking.create(bookingData, { transaction });

    // Create payment record
    const paymentData = {
      booking_id: booking.id || booking.booking_id,
      user_id: userId,
      amount: pricing.totalAmount,
      status: 'pending',
      payment_method: paymentMethod,
      transaction_id: orderId,
      created_at: new Date(),
      updated_at: new Date()
    };

    const payment = await db.Payment.create(paymentData, { transaction });
    await transaction.commit();

    // Handle Cash Payment
    if (paymentMethod === "cash") {
      return res.status(200).json({
        success: true,
        payment_method: "cash",
        order_id: orderId,
        booking_id: booking.id || booking.booking_id,
        message: "Booking được tạo thành công với phương thức thanh toán tiền mặt",
        booking_details: {
          guest_name: fullname,
          room_type: room.type_name,
          homestay_name: 'Homestay Name',
          checkin: checkinDate.toISOString().split('T')[0],
          checkout: checkoutDate.toISOString().split('T')[0],
          nights: pricing.nights,
          adults: adultsCount,
          children: childrenCount,
          total_guests: pricing.totalGuests,
          base_price: pricing.baseAmount,
          surcharge_adults: pricing.surchargeAdults,
          surcharge_per_night: pricing.surchargePerNight,
          total_surcharge: pricing.totalSurcharge,
          total_amount: pricing.totalAmount,
          formatted_amount: pricing.totalAmount.toLocaleString('vi-VN') + ' ₫',
          price_breakdown: {
            room_price_per_night: pricing.roomPrice,
            nights: pricing.nights,
            base_total: pricing.baseAmount,
            adults: pricing.adults,
            children: pricing.children,
            total_guests: pricing.totalGuests,
            surcharge_adults: pricing.surchargeAdults,
            surcharge_per_adult_per_night: pricing.surchargeAdults > 0 ? 100000 : 0,
            total_surcharge: pricing.totalSurcharge,
            final_total: pricing.totalAmount
          }
        }
      });
    }

    // Handle VNPay Payment
    if (paymentMethod === "vnpay") {
      try {
        const returnUrl = `${BASE_URL}/api/vnpay_return`;
        const clientIp = req.headers["x-forwarded-for"] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress || 
                        req.ip || 
                        "127.0.0.1";
        
        const cleanIpAddr = clientIp.split(',')[0].trim().replace("::ffff:", "");
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const validIp = ipRegex.test(cleanIpAddr) ? cleanIpAddr : "127.0.0.1";
        
        const orderInfo = `Dat phong ${room.type_name.replace(/[^a-zA-Z0-9\s]/g, '')} - ${fullname.replace(/[^a-zA-Z0-9\s]/g, '')} - ${orderId}`;

        const paymentUrl = buildVNPayUrl({
          amount: pricing.totalAmount,
          orderId,
          orderInfo,
          returnUrl,
          ipAddr: validIp,
          locale: "vn"
        });

        // Update payment record with VNPay URL
        await db.Payment.update({
          gateway_response: JSON.stringify({
            vnpay_url: paymentUrl,
            order_info: orderInfo,
            client_ip: validIp,
            created_at: new Date(),
            vnp_tmn_code: VNP_TMN_CODE,
            amount_vnd: pricing.totalAmount
          })
        }, {
          where: { booking_id: booking.id || booking.booking_id, payment_method: 'vnpay' }
        });

        return res.json({
          success: true,
          payment_method: "vnpay",
          redirect_url: paymentUrl,
          order_id: orderId,
          booking_id: booking.id || booking.booking_id,
          expires_in: "24 hours",
          amount: pricing.totalAmount,
          message: "Booking được tạo thành công, chuyển hướng tới VNPay"
        });

      } catch (vnpayError) {
        console.error("VNPay setup error:", vnpayError);
        
        // Fallback to cash payment
        await db.Booking.update(
          { payment_method: 'cash', payment_status: 'pending' },
          { where: { id: booking.id || booking.booking_id } }
        );

        await db.Payment.update(
          { payment_method: 'cash', status: 'pending' },
          { where: { booking_id: booking.id || booking.booking_id } }
        );

        return res.status(500).json({
          success: false,
          message: `Lỗi VNPay: ${vnpayError.message}. Booking đã được tạo với phương thức thanh toán tiền mặt.`,
          fallback_payment: "cash",
          order_id: orderId,
          booking_id: booking.id || booking.booking_id
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: "Phương thức thanh toán không được hỗ trợ. Chỉ hỗ trợ VNPay và tiền mặt."
    });

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    
    console.error("Checkout error:", error);
    
    return res.status(500).json({ 
      success: false, 
      message: "Lỗi hệ thống: " + error.message,
      error_details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
};

// VNPay Return Handler
const handleVNPayReturn = async (req, res) => {
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
      const { vnp_ResponseCode, vnp_TxnRef, vnp_Amount, vnp_BankCode, vnp_PayDate, vnp_TransactionNo } = vnp_Params;

      if (vnp_ResponseCode === "00") {
        await db.Booking.update(
          { 
            status: "completed",
            payment_status: "paid", 
            transaction_id: vnp_TransactionNo,
            paid_at: new Date()
          },
          { where: { order_id: vnp_TxnRef } }
        );

        const booking = await db.Booking.findOne({ 
          where: { order_id: vnp_TxnRef } 
        });

        if (booking) {
          await db.Payment.update(
            {
              status: 'completed',
              transaction_id: vnp_TransactionNo,
              paid_at: new Date(),
              gateway_response: JSON.stringify({
                vnp_ResponseCode,
                vnp_TransactionNo,
                vnp_BankCode,
                vnp_PayDate,
                vnp_Amount: vnp_Amount / 100
              })
            },
            { where: { booking_id: booking.id || booking.booking_id } }
          );
        }

        return res.redirect(`/payment-success?order_id=${vnp_TxnRef}&transaction_id=${vnp_TransactionNo}&amount=${vnp_Amount / 100}`);

      } else {
        const errorMessage = getVNPayErrorMessage(vnp_ResponseCode);
        
        await db.Booking.update(
          { 
            status: "canceled",
            payment_status: "failed" 
          },
          { where: { order_id: vnp_TxnRef } }
        );

        const booking = await db.Booking.findOne({ 
          where: { order_id: vnp_TxnRef } 
        });

        if (booking) {
          await db.Payment.update(
            {
              status: 'failed',
              transaction_id: vnp_TxnRef + '_FAILED',
              gateway_response: JSON.stringify({
                vnp_ResponseCode,
                error_message: errorMessage,
                failed_at: new Date()
              })
            },
            { where: { booking_id: booking.id || booking.booking_id } }
          );
        }

        return res.redirect(`/payment-failed?order_id=${vnp_TxnRef}&error=${encodeURIComponent(errorMessage)}`);
      }
    } else {
      return res.redirect("/payment-failed?error=invalid_signature");
    }

  } catch (error) {
    console.error("VNPay return error:", error);
    return res.redirect("/payment-failed?error=system_error");
  }
};

// VNPay IPN Handler
const handleVNPayIPN = async (req, res) => {
  try {
    // IPN có thể nhận data từ query hoặc body
    const vnp_Params = { ...req.query, ...req.body };
    const secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    const sortedParams = {};
    Object.keys(vnp_Params)
      .sort()
      .forEach((key) => {
        if (vnp_Params[key] !== null && vnp_Params[key] !== undefined && vnp_Params[key] !== '') {
          sortedParams[key] = vnp_Params[key];
        }
      });

    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
    const calculatedHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash === calculatedHash) {
      const { vnp_ResponseCode, vnp_TxnRef } = vnp_Params;

      const booking = await db.Booking.findOne({ where: { order_id: vnp_TxnRef } });
      if (!booking) {
        return res.json({ RspCode: "01", Message: "Order not found" });
      }

      if (vnp_ResponseCode === "00") {
        await db.Booking.update(
          { 
            status: "completed",
            payment_status: "paid" 
          },
          { where: { order_id: vnp_TxnRef } }
        );
        
        return res.json({ RspCode: "00", Message: "Success" });
      } else {
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
    console.error("VNPay IPN error:", error);
    return res.json({ RspCode: "99", Message: "System error" });
  }
};

// Get Booking Information
const getBookingInfo = async (req, res) => {
  try {
    const { order_id } = req.params;
    
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
    console.error("Get booking info error:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin booking: ' + error.message
    });
  }
};

// Confirm Cash Payment
const confirmCashPayment = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { staff_id, notes } = req.body;

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

    await db.Booking.update(
      { 
        payment_status: 'paid',
        paid_at: new Date(),
        status: 'completed'
      },
      { where: { order_id } }
    );

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

    return res.json({
      success: true,
      message: 'Xác nhận thanh toán tiền mặt thành công',
      order_id: order_id,
      paid_at: new Date(),
      confirmed_by: staff_id
    });

  } catch (error) {
    console.error("Confirm cash payment error:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xác nhận thanh toán: ' + error.message
    });
  }
};

// Get Cash Payment Report
const getCashPaymentReport = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
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
    console.error("Get cash payment report error:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy báo cáo: ' + error.message
    });
  }
};

// VNPay error messages
const getVNPayErrorMessage = (responseCode) => {
  const errorMessages = {
    "01": "Giao dịch chưa hoàn tất - Vui lòng thử lại",
    "02": "Giao dịch bị lỗi - Có lỗi xảy ra trong quá trình xử lý",
    "04": "Giao dịch đảo - Khách hàng đã bị trừ tiền nhưng giao dịch chưa thành công",
    "05": "VNPay đang xử lý giao dịch hoàn tiền",
    "06": "VNPay đã gửi yêu cầu hoàn tiền tới ngân hàng",
    "07": "Giao dịch bị nghi ngờ gian lận - Vui lòng liên hệ ngân hàng",
    "09": "Giao dịch hoàn trả bị từ chối",
    "10": "Đã giao hàng - Không thể hoàn tiền",
    "11": "Giao dịch thất bại - Sai mật khẩu xác thực",
    "12": "Giao dịch thất bại - Thẻ/Tài khoản bị khóa",
    "13": "Giao dịch thất bại - Sai mã OTP xác thực",
    "24": "Giao dịch bị hủy - Khách hàng đã hủy giao dịch",
    "51": "Giao dịch thất bại - Tài khoản không đủ số dư",
    "65": "Giao dịch thất bại - Vượt quá hạn mức giao dịch trong ngày",
    "75": "Ngân hàng thanh toán đang bảo trì - Vui lòng thử lại sau",
    "79": "Giao dịch thất bại - Nhập sai mật khẩu quá số lần cho phép",
    "99": "Lỗi không xác định - Vui lòng liên hệ hỗ trợ"
  };

  return errorMessages[responseCode] || `Mã lỗi ${responseCode} - Lỗi không xác định`;
};

// Export all functions
module.exports = {
  getPaymentPage,
  postCheckout,
  handleVNPayReturn,
  handleVNPayIPN,
  getBookingInfo,
  confirmCashPayment,
  getCashPaymentReport
};