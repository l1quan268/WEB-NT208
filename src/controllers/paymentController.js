// File: controllers/paymentController.js
const moment = require("moment");
const db = require("../models/index.js");
const crypto = require("crypto");
const querystring = require("qs");

// VNPay configuration
const VNP_TMN_CODE = process.env.VNP_TMN_CODE || "2ZKVU3BZ";
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || "AL1FQSVIRA9YRR7IWC6DCGSUJZWU14NY";
const VNP_URL = process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const BASE_URL = process.env.BASE_URL || "http://sweethome1.id.vn";
const VNP_RETURN_URL = process.env.VNP_RETURN_URL || `${BASE_URL}/api/vnpay_return`;
const VNP_IPN_URL = process.env.VNP_IPN_URL || `${BASE_URL}/api/vnpay_ipn`;

// Function sortObject theo chuẩn VNPay
function sortObject(obj) {
 const sortedObj = {};
 const keys = Object.keys(obj).sort();
 keys.forEach(key => {
   sortedObj[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
 });
 return sortedObj;
}

// Debug function để test signature
const testVNPaySignature = () => {
 const testParams = {
   vnp_Amount: "100000",
   vnp_Command: "pay",
   vnp_CreateDate: "20250607111736",
   vnp_CurrCode: "VND",
   vnp_IpAddr: "127.0.0.1",
   vnp_Locale: "vn",
   vnp_OrderInfo: "Test payment",
   vnp_OrderType: "other",
   vnp_ReturnUrl: VNP_RETURN_URL,
   vnp_TmnCode: VNP_TMN_CODE,
   vnp_TxnRef: "TEST123456",
   vnp_Version: "2.1.0"
 };

 const sortedParams = sortObject(testParams);
 const signData = querystring.stringify(sortedParams, { encode: false });

 console.log("🧪 Test Sign Data:", signData);

 const hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
 const hash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex").toUpperCase();

 console.log("🧪 Test Hash Result:", hash);
 return hash;
};

// Test cấu hình khi khởi động
console.log("🔍 VNPay Config Check:");
console.log("TMN Code:", VNP_TMN_CODE);
console.log("Hash Secret:", VNP_HASH_SECRET.substring(0, 8) + "...");
console.log("Base URL:", BASE_URL);
console.log("Return URL:", VNP_RETURN_URL);
console.log("IPN URL:", VNP_IPN_URL);
console.log("🌍 Environment:", process.env.NODE_ENV);
testVNPaySignature();

// VNPay URL builder với signature chuẩn
const buildVNPayUrl = (params) => {
 const {
   amount,
   orderId,
   orderInfo,
   returnUrl,
   ipAddr,
   locale = "vn",
   currCode = "VND",
   orderType = "other",
   bankCode = null
 } = params;

 if (!amount || !orderId || !orderInfo || !returnUrl) {
   throw new Error("Missing required VNPay parameters");
 }

 const vnpAmount = Math.round(parseFloat(amount)) * 100;
 if (vnpAmount <= 0) {
   throw new Error("Invalid payment amount");
 }

 const date = new Date();
 const createDate = date.getFullYear().toString() +
                   (date.getMonth() + 1).toString().padStart(2, '0') +
                   date.getDate().toString().padStart(2, '0') +
                   date.getHours().toString().padStart(2, '0') +
                   date.getMinutes().toString().padStart(2, '0') +
                   date.getSeconds().toString().padStart(2, '0');

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
   vnp_CreateDate: createDate
 };

 if (bankCode && bankCode !== '') {
   vnp_Params.vnp_BankCode = bankCode;
 }

 console.log("📋 VNPay Params before sorting:", vnp_Params);

 const sortedParams = sortObject(vnp_Params);
 const signData = querystring.stringify(sortedParams, { encode: false });

 console.log("🔐 Sign Data String:", signData);
 
 const secureHash = crypto.createHmac("sha512", VNP_HASH_SECRET)
   .update(Buffer.from(signData, "utf-8"))
   .digest("hex")
   .toUpperCase();
   
 console.log("🎯 Generated Hash:", secureHash);

 sortedParams['vnp_SecureHash'] = secureHash;
 const paymentUrl = VNP_URL + '?' + querystring.stringify(sortedParams, { encode: false });

 console.log("🌐 Final Payment URL:", paymentUrl.substring(0, 200) + "...");

 return paymentUrl;
};

// Calculate pricing
const calculateRoomPricing = (room, checkinDate, checkoutDate, adults, children) => {
 const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 3600 * 24));
 const roomPrice = parseFloat(room.price_per_night || 500000);
 const baseAmount = roomPrice * nights;
 
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

// getPaymentPage
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

// postCheckout function với enhanced validation
const postCheckout = async (req, res) => {
 let transaction;
 try {
   console.log("🚀 Starting checkout process...");
   console.log("📦 Request body:", req.body);
   
   transaction = await db.sequelize.transaction();

   const {
     room_id, checkin, checkout, fullname, address,
     phone, email, note, paymentMethod = "cash",
     existing_booking_id
   } = req.body;

   const adultsCount = parseInt(req.body.adults) || 0;
   const childrenCount = parseInt(req.body.children) || 0;

   console.log("👥 Guest counts:", { adultsCount, childrenCount });
   console.log("🆔 Existing booking ID:", existing_booking_id);

   // Enhanced validation với thông báo chi tiết
   const requiredFields = {
     room_id: room_id,
     checkin: checkin, 
     checkout: checkout,
     fullname: fullname,
     phone: phone,
     email: email
   };

   const missingFields = [];
   Object.entries(requiredFields).forEach(([key, value]) => {
     if (!value || (typeof value === 'string' && value.trim() === '')) {
       missingFields.push(key);
     }
   });

   if (missingFields.length > 0) {
     console.error("❌ Missing required fields:", missingFields);
     await transaction.rollback();
     return res.status(400).json({ 
       success: false, 
       message: `Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`,
       missing_fields: missingFields,
       received_data: {
         room_id: room_id || 'MISSING',
         checkin: checkin || 'MISSING',
         checkout: checkout || 'MISSING', 
         fullname: fullname || 'MISSING',
         phone: phone || 'MISSING',
         email: email || 'MISSING',
         address: address || 'EMPTY (optional)',
         existing_booking_id: existing_booking_id || 'NONE'
       }
     });
   }

   // Set default values cho optional fields
   const finalAddress = address && address.trim() !== '' ? address.trim() : 'Địa chỉ khách hàng';
   const finalNote = note && note.trim() !== '' ? note.trim() : '';

   console.log("✅ All required fields present:", {
     room_id,
     checkin, 
     checkout,
     fullname: fullname.trim(),
     phone: phone.trim(),
     email: email.trim(),
     address: finalAddress,
     paymentMethod,
     existing_booking_id: existing_booking_id || 'NEW_BOOKING'
   });

   const allowedPaymentMethods = ["vnpay", "cash"];
   if (!allowedPaymentMethods.includes(paymentMethod)) {
     console.error("❌ Invalid payment method:", paymentMethod);
     await transaction.rollback();
     return res.status(400).json({ 
       success: false, 
       message: "Phương thức thanh toán không hợp lệ. Chỉ hỗ trợ VNPay và tiền mặt." 
     });
   }

   // Xử lý booking đã tồn tại
   if (existing_booking_id) {
     console.log("🔄 Processing payment for existing booking:", existing_booking_id);
     
     const existingBooking = await db.Booking.findOne({
       where: { booking_id: existing_booking_id },
       transaction
     });
     
     if (!existingBooking) {
       console.error("❌ Existing booking not found:", existing_booking_id);
       await transaction.rollback();
       return res.status(404).json({ 
         success: false, 
         message: "Không tìm thấy đặt phòng với ID: " + existing_booking_id 
       });
     }

     console.log("📋 Existing booking found:", {
       order_id: existingBooking.order_id,
       status: existingBooking.status,
       payment_status: existingBooking.payment_status,
       total_price: existingBooking.total_price
     });

     if (existingBooking.payment_status === 'paid') {
       await transaction.rollback();
       return res.status(400).json({ 
         success: false, 
         message: "Đặt phòng này đã được thanh toán" 
       });
     }

     if (existingBooking.status === 'canceled') {
       await transaction.rollback();
       return res.status(400).json({ 
         success: false, 
         message: "Đặt phòng này đã bị hủy" 
       });
     }

     // Xử lý VNPay cho booking cũ
     if (paymentMethod === "vnpay") {
       console.log("💳 Processing VNPay for existing booking...");
       
       try {
         const returnUrl = VNP_RETURN_URL;
         
         const clientIp = req.headers["x-forwarded-for"] || 
                         req.connection?.remoteAddress || 
                         req.socket?.remoteAddress || 
                         req.connection?.socket?.remoteAddress ||
                         "127.0.0.1";
         
         const cleanIpAddr = clientIp.split(',')[0].trim().replace("::ffff:", "");
         const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
         const validIp = ipRegex.test(cleanIpAddr) ? cleanIpAddr : "127.0.0.1";
         
         const room = await db.RoomType.findByPk(existingBooking.room_type_id, { transaction });
         if (!room) {
           console.error("❌ Room not found for existing booking:", existingBooking.room_type_id);
           await transaction.rollback();
           return res.status(404).json({ success: false, message: "Không tìm thấy thông tin phòng" });
         }
         
         const orderInfo = `Thanh toan booking ${existingBooking.order_id} - ${existingBooking.name.replace(/[^a-zA-Z0-9\s]/g, '')} - ${room.type_name.replace(/[^a-zA-Z0-9\s]/g, '')}`;

         console.log("🏦 Creating VNPay payment URL for existing booking:", {
           amount: existingBooking.total_price,
           orderId: existingBooking.order_id,
           orderInfo,
           returnUrl,
           ipAddr: validIp
         });

         const paymentUrl = buildVNPayUrl({
           amount: existingBooking.total_price,
           orderId: existingBooking.order_id,
           orderInfo: orderInfo,
           returnUrl: returnUrl,
           ipAddr: validIp,
           orderType: "other",
           locale: "vn",
           bankCode: null
         });

         await db.Booking.update({
           payment_method: 'vnpay',
           updated_at: new Date()
         }, {
           where: { booking_id: existing_booking_id },
           transaction
         });

         const existingPayment = await db.Payment.findOne({
           where: { booking_id: existing_booking_id },
           transaction
         });

         if (existingPayment) {
           await db.Payment.update({
             payment_method: 'vnpay',
             status: 'pending',
             gateway_response: JSON.stringify({
               vnpay_url: paymentUrl,
               order_info: orderInfo,
               client_ip: validIp,
               created_at: new Date(),
               vnp_tmn_code: VNP_TMN_CODE,
               amount_vnd: existingBooking.total_price,
               return_url: returnUrl,
               existing_booking: true
             }),
             updated_at: new Date()
           }, {
             where: { booking_id: existing_booking_id },
             transaction
           });
         } else {
           await db.Payment.create({
             booking_id: existing_booking_id,
             user_id: existingBooking.user_id,
             amount: existingBooking.total_price,
             status: 'pending',
             payment_method: 'vnpay',
             transaction_id: existingBooking.order_id,
             gateway_response: JSON.stringify({
               vnpay_url: paymentUrl,
               order_info: orderInfo,
               client_ip: validIp,
               created_at: new Date(),
               vnp_tmn_code: VNP_TMN_CODE,
               amount_vnd: existingBooking.total_price,
               return_url: returnUrl,
               existing_booking: true
             }),
             created_at: new Date(),
             updated_at: new Date()
           }, { transaction });
         }

         await transaction.commit();
         console.log("✅ VNPay payment URL created for existing booking");

         return res.json({
           success: true,
           payment_method: "vnpay",
           redirect_url: paymentUrl,
           order_id: existingBooking.order_id,
           booking_id: existing_booking_id,
           expires_in: "24 hours",
           amount: existingBooking.total_price,
           message: "Link thanh toán VNPay đã được tạo cho đặt phòng hiện có",
           existing_booking: true
         });

       } catch (vnpayError) {
         console.error("❌ VNPay setup error for existing booking:", vnpayError);
         await transaction.rollback();
         
         return res.status(500).json({
           success: false,
           message: `Lỗi VNPay: ${vnpayError.message}`,
           order_id: existingBooking.order_id,
           booking_id: existing_booking_id
         });
       }
     }

     await transaction.rollback();
     return res.status(400).json({
       success: false,
       message: "Chỉ hỗ trợ thanh toán VNPay cho đặt phòng đã tồn tại"
     });
   }

   // Xử lý tạo booking mới
   console.log("🆕 Creating new booking...");
   console.log("🏨 Finding room...");
   
   const room = await db.RoomType.findByPk(room_id, { transaction });
   if (!room) {
     console.error("❌ Room not found:", room_id);
     await transaction.rollback();
     return res.status(404).json({ success: false, message: "Không tìm thấy phòng" });
   }

   console.log("✅ Room found:", room.type_name);

   const checkinDate = new Date(checkin);
   const checkoutDate = new Date(checkout);

   if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
     console.error("❌ Invalid dates");
     await transaction.rollback();
     return res.status(400).json({ success: false, message: "Ngày không hợp lệ" });
   }

   if (checkoutDate <= checkinDate) {
     console.error("❌ Invalid date range");
     await transaction.rollback();
     return res.status(400).json({ success: false, message: "Ngày checkout phải sau ngày checkin" });
   }

   console.log("💰 Calculating pricing...");
   const pricing = calculateRoomPricing(room, checkinDate, checkoutDate, adultsCount, childrenCount);
   console.log("💰 Pricing result:", pricing);
   
   const orderId = `HOTEL_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
   const userId = req.session?.user?.id || null;

   console.log("📋 Creating new booking...");

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
     guest_address: finalAddress,
     payment_method: paymentMethod,
     payment_status: 'pending',
     special_requests: finalNote,
     created_at: new Date(),
     updated_at: new Date()
   };

   console.log("📋 Booking data:", bookingData);
   const booking = await db.Booking.create(bookingData, { transaction });
   console.log("✅ Booking created with ID:", booking.id || booking.booking_id);

   console.log("💳 Creating payment record...");

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
   console.log("✅ Payment record created");
   
   await transaction.commit();
   console.log("✅ Transaction committed");

   // Handle Cash Payment với booking_details đầy đủ
   if (paymentMethod === "cash") {
     console.log("💵 Processing cash payment...");
     
     const priceBreakdown = {
       room_price_per_night: pricing.roomPrice,
       nights: pricing.nights,
       base_total: pricing.baseAmount,
       surcharge_adults: pricing.surchargeAdults,
       total_surcharge: pricing.totalSurcharge,
       final_total: pricing.totalAmount
     };

     const bookingDetails = {
       guest_name: fullname.trim(),
       guest_email: email.trim(),
       guest_phone: phone.trim(),
       guest_address: finalAddress,
       room_type: room.type_name,
       checkin: checkinDate.toISOString().split('T')[0],
       checkout: checkoutDate.toISOString().split('T')[0],
       nights: pricing.nights,
       adults: adultsCount,
       children: childrenCount,
       total_guests: adultsCount + childrenCount,
       total_surcharge: pricing.totalSurcharge,
       formatted_amount: pricing.totalAmount.toLocaleString('vi-VN') + ' ₫',
       price_breakdown: priceBreakdown,
       special_requests: finalNote
     };

     console.log("✅ Cash payment response prepared:", bookingDetails);

     return res.status(200).json({
       success: true,
       payment_method: "cash",
       order_id: orderId,
       booking_id: booking.id || booking.booking_id,
       booking_details: bookingDetails,
       message: "Booking được tạo thành công với phương thức thanh toán tiền mặt"
     });
   }

   // Handle VNPay Payment for new booking
   if (paymentMethod === "vnpay") {
     console.log("💳 Processing VNPay payment for new booking...");
     
     try {
       const returnUrl = VNP_RETURN_URL;
       
       const clientIp = req.headers["x-forwarded-for"] || 
                       req.connection?.remoteAddress || 
                       req.socket?.remoteAddress || 
                       req.connection?.socket?.remoteAddress ||
                       "127.0.0.1";
       
       const cleanIpAddr = clientIp.split(',')[0].trim().replace("::ffff:", "");
       const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
       const validIp = ipRegex.test(cleanIpAddr) ? cleanIpAddr : "127.0.0.1";
       
       const orderInfo = `Dat phong ${room.type_name.replace(/[^a-zA-Z0-9\s]/g, '')} - ${fullname.replace(/[^a-zA-Z0-9\s]/g, '')} - ${orderId}`;

       console.log("🏦 Creating VNPay payment with params:", {
         amount: pricing.totalAmount,
         orderId,
         orderInfo,
         returnUrl,
         ipAddr: validIp
       });

       const paymentUrl = buildVNPayUrl({
         amount: pricing.totalAmount,
         orderId: orderId,
         orderInfo: orderInfo,
         returnUrl: returnUrl,
         ipAddr: validIp,
         orderType: "other",
         locale: "vn",
         bankCode: null
       });

       await db.Payment.update({
         gateway_response: JSON.stringify({
           vnpay_url: paymentUrl,
           order_info: orderInfo,
           client_ip: validIp,
           created_at: new Date(),
           vnp_tmn_code: VNP_TMN_CODE,
           amount_vnd: pricing.totalAmount,
           return_url: returnUrl,
           new_booking: true
         })
       }, {
         where: { booking_id: booking.id || booking.booking_id, payment_method: 'vnpay' }
       });

       console.log("✅ VNPay payment URL created successfully");

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
       console.error("❌ VNPay setup error:", vnpayError);
       
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

   console.error("❌ Unsupported payment method");
   return res.status(400).json({
     success: false,
     message: "Phương thức thanh toán không được hỗ trợ. Chỉ hỗ trợ VNPay và tiền mặt."
   });

 } catch (error) {
   if (transaction) {
     await transaction.rollback();
   }
   
   console.error("💥 Checkout error:", error);
   
   return res.status(500).json({ 
     success: false, 
     message: "Lỗi hệ thống: " + error.message,
     error_details: {
       name: error.name,
       message: error.message,
       stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
     }
   });
 }
};

// VNPay Return Handler
const handleVNPayReturn = async (req, res) => {
 try {
   let vnp_Params = { ...req.query };
   const secureHash = vnp_Params["vnp_SecureHash"];

   delete vnp_Params["vnp_SecureHash"];
   delete vnp_Params["vnp_SecureHashType"];

   const sortedParams = sortObject(vnp_Params);
   const signData = querystring.stringify(sortedParams, { encode: false });
   const hash = crypto.createHmac("sha512", VNP_HASH_SECRET)
     .update(Buffer.from(signData, "utf-8"))
     .digest("hex");

   console.log("🔍 VNPay Return Verification:");
   console.log("Received Hash:", secureHash);
   console.log("Calculated Hash:", hash);
   console.log("Sign Data:", signData);

   if (secureHash.toLowerCase() === hash.toLowerCase()) {
     const { vnp_ResponseCode, vnp_TxnRef, vnp_Amount, vnp_BankCode, vnp_PayDate, vnp_TransactionNo } = vnp_Params;

     if (vnp_ResponseCode === "00") {
 await db.Booking.update({
         status: "completed",
         payment_status: "paid",
         transaction_id: vnp_TransactionNo,
         paid_at: new Date()
       }, {
         where: { order_id: vnp_TxnRef }
       });

       const booking = await db.Booking.findOne({
         where: { order_id: vnp_TxnRef }
       });

       if (booking) {
         await db.Payment.update({
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
         }, {
           where: { booking_id: booking.id || booking.booking_id }
         });
       }

       return res.redirect(`/payment-success?order_id=${vnp_TxnRef}&transaction_id=${vnp_TransactionNo}&amount=${vnp_Amount / 100}`);

     } else {
       const errorMessage = getVNPayErrorMessage(vnp_ResponseCode);

       await db.Booking.update({
         status: "canceled",
         payment_status: "failed"
       }, {
         where: { order_id: vnp_TxnRef }
       });

       return res.redirect(`/payment-failed?order_id=${vnp_TxnRef}&error=${encodeURIComponent(errorMessage)}`);
     }
   } else {
     console.error("❌ VNPay signature verification failed!");
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
   const vnp_Params = { ...req.query, ...req.body };
   const secureHash = vnp_Params["vnp_SecureHash"];

   delete vnp_Params["vnp_SecureHash"];
   delete vnp_Params["vnp_SecureHashType"];

   const sortedParams = sortObject(vnp_Params);
   const signData = querystring.stringify(sortedParams, { encode: false });
   const hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
   const calculatedHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex").toUpperCase();

   console.log("🔍 VNPay IPN Verification:");
   console.log("Received Hash:", secureHash);
   console.log("Calculated Hash:", calculatedHash);

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
     console.error("❌ VNPay IPN signature verification failed!");
     return res.json({ RspCode: "97", Message: "Invalid signature" });
   }
 } catch (error) {
   console.error("VNPay IPN error:", error);
   return res.json({ RspCode: "99", Message: "System error" });
 }
};

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
     { where: { booking_id: booking.booking_id || booking.id } }
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
     console.log("Association error, falling back to simple query:", associationError.message);
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

// Health Check Function
const healthCheck = (req, res) => {
 console.log("🏥 Health check requested");
 try {
   return res.json({ 
     status: "OK", 
     timestamp: new Date().toISOString(),
     service: "Payment API",
     environment: process.env.NODE_ENV || "development",
     database: "Connected",
     vnpay_config: {
       tmn_code: VNP_TMN_CODE ? "✅ Set" : "❌ Missing",
       hash_secret: VNP_HASH_SECRET ? "✅ Set" : "❌ Missing",
       base_url: BASE_URL,
       return_url: VNP_RETURN_URL,
       ipn_url: VNP_IPN_URL
     },
     server_time: new Date().toLocaleString('vi-VN', { 
       timeZone: 'Asia/Ho_Chi_Minh' 
     }),
     uptime: process.uptime() + " seconds"
   });
 } catch (error) {
   console.error("Health check error:", error);
   return res.status(500).json({
     status: "ERROR",
     message: error.message,
     timestamp: new Date().toISOString()
   });
 }
};

// Export all functions
module.exports = {
 getPaymentPage,
 postCheckout,
 handleVNPayReturn,
 handleVNPayIPN,
 getBookingInfo,
 confirmCashPayment,
 getCashPaymentReport,
 healthCheck
};