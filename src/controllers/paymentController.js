// File: controllers/paymentController.js - Complete Fixed Version
const moment = require("moment");
const db = require("../models/index.js");
const crypto = require("crypto");
const querystring = require("qs");

// VNPay configuration
const VNP_TMN_CODE = process.env.VNP_TMN_CODE || "DM2F135W";
const VNP_HASH_SECRET =
  process.env.VNP_HASH_SECRET || "AL1FQSVIRA9YRR7IWC6DCGSUJZWU14NY";
const VNP_URL =
  process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const BASE_URL = process.env.BASE_URL || "http://localhost:9999";
const VNP_RETURN_URL =
  process.env.VNP_RETURN_URL || `${BASE_URL}/api/vnpay_return`;
const VNP_IPN_URL = process.env.VNP_IPN_URL || `${BASE_URL}/api/vnpay_ipn`;

// Sort object function for VNPay
function sortObject(obj) {
  const sortedObj = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sortedObj[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
  });
  return sortedObj;
}

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
    orderType = "other",
    bankCode = null,
  } = params;

  if (!amount || !orderId || !orderInfo || !returnUrl) {
    throw new Error("Missing required VNPay parameters");
  }

  const vnpAmount = Math.round(parseFloat(amount)) * 100;
  if (vnpAmount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const date = new Date();
  const createDate =
    date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getDate().toString().padStart(2, "0") +
    date.getHours().toString().padStart(2, "0") +
    date.getMinutes().toString().padStart(2, "0") +
    date.getSeconds().toString().padStart(2, "0");

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
  };

  if (bankCode && bankCode !== "") {
    vnp_Params.vnp_BankCode = bankCode;
  }

  const sortedParams = sortObject(vnp_Params);
  const signData = querystring.stringify(sortedParams, { encode: false });

  const secureHash = crypto
    .createHmac("sha512", VNP_HASH_SECRET)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex")
    .toUpperCase();

  sortedParams["vnp_SecureHash"] = secureHash;
  const paymentUrl =
    VNP_URL + "?" + querystring.stringify(sortedParams, { encode: false });

  return paymentUrl;
};

// Helper function to get service name
const getServiceName = (serviceId) => {
  const names = {
    10: "Dịch vụ đưa đón sân bay",
    14: "Thuê xe máy",
    13: "Dịch vụ giặt ủi",
  };
  return names[serviceId] || "Dịch vụ khác";
};

// Helper function to get service descriptions
const getServiceDescription = (serviceId) => {
  const descriptions = {
    10: "Dịch vụ đưa đón từ/đến sân bay Tân Sơn Nhất. Xe 4-7 chỗ tùy theo yêu cầu. Chở khách cả đi lẫn về",
    14: "Thuê xe máy tự động, bao xăng trong ngày. Có mũ bảo hiểm và áo mưa.",
    13: "Dịch vụ giặt ủi quần áo, tính theo kg. Trả trong ngày hoặc ngày hôm sau.",
  };
  return descriptions[serviceId] || "";
};

//
const getServiceUnit = (serviceId) => {
  const units = {
    10: "lượt",
    14: "xe",
    13: "kg", //Changed from 'lần' to 'kg'
  };
  return units[serviceId] || "lần";
};

// FIXED: Calculate pricing without surcharge logic
const calculateRoomPricing = (
  room,
  checkinDate,
  checkoutDate,
  adults,
  children,
  selectedServices = []
) => {
  const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 3600 * 24));
  const roomPrice = parseFloat(room.price_per_night || 500000);
  const baseAmount = roomPrice * nights;

  let servicesTotal = 0;
  let servicesBreakdown = [];

  if (selectedServices && selectedServices.length > 0) {
    selectedServices.forEach((service) => {
      const serviceUnitPrice = parseFloat(service.price || 0);
      const serviceQuantity = parseInt(service.quantity || 1);
      const serviceTotalPrice = serviceUnitPrice * serviceQuantity; // Calculate total

      servicesTotal += serviceTotalPrice;
      servicesBreakdown.push({
        service_id: service.service_id,
        name: service.name || getServiceName(service.service_id),
        unit_price: serviceUnitPrice, //Keep unit price for display
        quantity: serviceQuantity,
        unit: getServiceUnit(service.service_id),
        total_price: serviceTotalPrice, //Add total price
      });
    });
  }

  const roomTotal = baseAmount;
  const totalAmount = roomTotal + servicesTotal;

  return {
    nights,
    roomPrice,
    baseAmount,
    adults,
    children,
    totalGuests: adults + children,
    roomTotal,
    servicesTotal,
    servicesBreakdown,
    totalAmount,
  };
};

// FIXED: Get available services with database prices
const getAvailableServices = async (req, res) => {
  try {
    const services = await db.Service.findAll({
      where: {
        service_id: [10, 14, 13],
      },
      order: [["service_id", "ASC"]],
    });

    const servicesWithPricing = services.map((service) => {
      let allowQuantity = false;
      let maxQuantity = 1;
      let unit = "lần";

      switch (service.service_id) {
        case 10:
          unit = "lượt";
          break;
        case 14:
          allowQuantity = true;
          maxQuantity = 5;
          unit = "xe";
          break;
        case 13:
          allowQuantity = true;
          maxQuantity = 20; //Increased max for kg
          unit = "kg"; // Changed to kg
          break;
      }

      return {
        service_id: service.service_id,
        service_name: service.service_name,
        price: parseFloat(service.base_price), // Use database price
        unit: unit,
        allow_quantity: allowQuantity,
        max_quantity: maxQuantity,
        description: getServiceDescription(service.service_id),
      };
    });

    return res.json({
      success: true,
      services: servicesWithPricing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách dịch vụ: " + error.message,
    });
  }
};

// FIXED: Get payment page with database prices
const getPaymentPage = async (req, res) => {
  try {
    const { room_id, checkin, checkout, adults, children } = req.query;

    if (!room_id || !checkin || !checkout) {
      return res
        .status(400)
        .send(
          `<h3>Thiếu thông tin</h3><p>Vui lòng chọn phòng, ngày nhận và ngày trả phòng.</p>`
        );
    }

    let room = await db.RoomType.findByPk(room_id);
    if (!room) {
      room = {
        id: room_id,
        type_name: "Default Room",
        price_per_night: 500000,
        max_guests: 4,
      };
    }

    const adultsCount = parseInt(adults) || 1;
    const childrenCount = parseInt(children) || 0;

    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkinDate < today) {
      return res
        .status(400)
        .send(
          `<h3>Ngày nhận phòng không hợp lệ</h3><p>Ngày nhận phòng phải từ hôm nay trở đi.</p>`
        );
    }

    if (checkoutDate <= checkinDate) {
      return res
        .status(400)
        .send(
          `<h3>Ngày trả phòng không hợp lệ</h3><p>Ngày trả phòng phải sau ngày nhận phòng.</p>`
        );
    }

    const totalGuests = adultsCount + childrenCount;
    if (totalGuests > 15) {
      return res
        .status(400)
        .send(
          `<h3>Số khách vượt quá giới hạn</h3><p>Tối đa 15 khách mỗi phòng.</p>`
        );
    }

    if (adultsCount < 1) {
      return res
        .status(400)
        .send(
          `<h3>Số khách không hợp lệ</h3><p>Phải có ít nhất 1 người lớn.</p>`
        );
    }

    const pricing = calculateRoomPricing(
      room,
      checkinDate,
      checkoutDate,
      adultsCount,
      childrenCount
    );

    // ✅ Get available services from database with actual prices
    const services = await db.Service.findAll({
      where: {
        service_id: [10, 14, 13],
      },
      order: [["service_id", "ASC"]],
    });

    const servicesWithPricing = services.map((service) => {
      let allowQuantity = false;
      let maxQuantity = 1;
      let unit = "lần";

      switch (service.service_id) {
        case 10:
          unit = "lượt";
          break;
        case 14:
          allowQuantity = true;
          maxQuantity = 5;
          unit = "xe";
          break;
        case 13:
          allowQuantity = true;
          maxQuantity = 20; // Increased max for kg
          unit = "kg"; // Changed to kg
          break;
      }

      return {
        service_id: service.service_id,
        service_name: service.service_name,
        price: parseFloat(service.base_price), //  Use database price
        unit: unit,
        allow_quantity: allowQuantity,
        max_quantity: maxQuantity,
        description: getServiceDescription(service.service_id),
      };
    });

    return res.render("Payment/payment.ejs", {
      room_id,
      room,
      checkin,
      checkout,
      adults: adultsCount,
      children: childrenCount,
      pricing,
      services: servicesWithPricing,
      user: req.session?.user || null,
    });
  } catch (err) {
    res.status(500).send(`<h3>Lỗi hệ thống</h3><p>${err.message}</p>`);
  }
};

// postCheckout function với booking_id schema đúng
const postCheckout = async (req, res) => {
  let transaction;
  try {
    transaction = await db.sequelize.transaction();

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
      existing_booking_id,
      services,
    } = req.body;

    const adultsCount = parseInt(req.body.adults) || 0;
    const childrenCount = parseInt(req.body.children) || 0;

    console.log("🔧 Request data:", {
      existing_booking_id,
      paymentMethod,
      room_id,
      fullname,
      email,
      phone,
    });

    // FIX: Kiểm tra existing_booking_id đúng cách
    if (existing_booking_id && existing_booking_id.trim() !== "") {
      // XỬ LÝ THANH TOÁN CHO BOOKING ĐÃ TỒN TẠI
      console.log(
        "🔄 Processing payment for existing booking:",
        existing_booking_id
      );

      // Chỉ cho phép VNPay cho existing booking
      if (paymentMethod !== "vnpay") {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Chỉ hỗ trợ thanh toán VNPay cho đặt phòng đã tồn tại",
        });
      }

      //  Tìm booking theo booking_id (primary key)
      const existingBooking = await db.Booking.findOne({
        where: {
          booking_id: existing_booking_id, //  Dùng booking_id thay vì id
        },
        transaction,
      });

      if (!existingBooking) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy booking với ID: ${existing_booking_id}`,
        });
      }

      // Sử dụng booking_id (primary key) - luôn có giá trị
      const actualBookingId = existingBooking.booking_id;

      console.log("📋 Found existing booking:", {
        booking_id: existingBooking.booking_id,
        order_id: existingBooking.order_id,
        payment_status: existingBooking.payment_status,
        status: existingBooking.status,
        actualBookingId: actualBookingId,
      });

      // Kiểm tra trạng thái booking
      if (existingBooking.payment_status === "paid") {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Booking này đã được thanh toán rồi",
        });
      }

      if (existingBooking.status === "canceled") {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Booking đã bị hủy, không thể thanh toán",
        });
      }

      // Tạo VNPay URL cho existing booking
      try {
        const returnUrl = VNP_RETURN_URL;
        const clientIp =
          req.headers["x-forwarded-for"] ||
          req.connection?.remoteAddress ||
          req.socket?.remoteAddress ||
          "127.0.0.1";

        const cleanIpAddr = clientIp
          .split(",")[0]
          .trim()
          .replace("::ffff:", "");
        const ipRegex =
          /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const validIp = ipRegex.test(cleanIpAddr) ? cleanIpAddr : "127.0.0.1";

        const orderInfo = `Thanh toan dat phong ${existingBooking.order_id} - ${existingBooking.name}`;

        const paymentUrl = buildVNPayUrl({
          amount: existingBooking.total_price,
          orderId: existingBooking.order_id,
          orderInfo: orderInfo,
          returnUrl: returnUrl,
          ipAddr: validIp,
          orderType: "other",
          locale: "vn",
          bankCode: null,
        });

        // Cập nhật payment record với booking_id chính xác
        const updateResult = await db.Payment.update(
          {
            gateway_response: JSON.stringify({
              vnpay_url: paymentUrl,
              order_info: orderInfo,
              client_ip: validIp,
              created_at: new Date(),
              existing_booking_payment: true,
              booking_id_used: actualBookingId,
            }),
          },
          {
            where: {
              booking_id: actualBookingId, //Sử dụng booking_id thực tế
            },
            transaction,
          }
        );

        console.log("💳 Payment update result:", updateResult);

        // Nếu không có payment record, tạo mới với booking_id đúng
        if (updateResult[0] === 0) {
          console.log("⚠️ No existing payment record found, creating new one");

          await db.Payment.create(
            {
              booking_id: actualBookingId, //Sử dụng booking_id
              user_id: req.session?.user?.id || null,
              amount: existingBooking.total_price,
              status: "pending",
              payment_method: "vnpay",
              transaction_id: existingBooking.order_id,
              gateway_response: JSON.stringify({
                vnpay_url: paymentUrl,
                order_info: orderInfo,
                client_ip: validIp,
                created_at: new Date(),
                existing_booking_payment: true,
                new_payment_record: true,
              }),
              created_at: new Date(),
              updated_at: new Date(),
            },
            { transaction }
          );
        }

        await transaction.commit();

        return res.json({
          success: true,
          payment_method: "vnpay",
          redirect_url: paymentUrl,
          order_id: existingBooking.order_id,
          booking_id: actualBookingId, // Trả về booking_id đúng
          amount: existingBooking.total_price,
          message: "Chuyển hướng tới VNPay để thanh toán booking đã tồn tại",
        });
      } catch (vnpayError) {
        await transaction.rollback();
        console.error("💥 VNPay error for existing booking:", vnpayError);
        return res.status(500).json({
          success: false,
          message: `Lỗi VNPay: ${vnpayError.message}`,
          debug_info: {
            booking_id: actualBookingId,
            existing_booking_id: existing_booking_id,
            error_type: "vnpay_existing_booking",
            error_stack: vnpayError.stack,
          },
        });
      }
    } else {
      // XỬ LÝ TẠO BOOKING MỚI (Logic cũ với fix booking_id)
      console.log("🆕 Creating new booking");

      // Validation cho booking mới
      let selectedServices = [];
      if (services) {
        try {
          selectedServices =
            typeof services === "string" ? JSON.parse(services) : services;
        } catch (e) {
          selectedServices = [];
        }
      }

      const requiredFields = {
        room_id,
        checkin,
        checkout,
        fullname,
        phone,
        email,
      };

      const missingFields = [];
      Object.entries(requiredFields).forEach(([key, value]) => {
        if (!value || (typeof value === "string" && value.trim() === "")) {
          missingFields.push(key);
        }
      });

      if (missingFields.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Thiếu thông tin bắt buộc: ${missingFields.join(", ")}`,
          missing_fields: missingFields,
        });
      }

      const finalAddress =
        address && address.trim() !== ""
          ? address.trim()
          : "Địa chỉ khách hàng";
      const finalNote = note && note.trim() !== "" ? note.trim() : "";

      if (paymentMethod !== "vnpay" && paymentMethod !== "cash") {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Phương thức thanh toán không hợp lệ.",
        });
      }

      const room = await db.RoomType.findByPk(room_id, { transaction });
      if (!room) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy phòng" });
      }

      const checkinDate = new Date(checkin);
      const checkoutDate = new Date(checkout);

      if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ success: false, message: "Ngày không hợp lệ" });
      }

      if (checkoutDate <= checkinDate) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Ngày checkout phải sau ngày checkin",
        });
      }

      // Validate và xử lý services với database prices
      let validatedServices = [];
      if (selectedServices && selectedServices.length > 0) {
        for (const serviceItem of selectedServices) {
          const service = await db.Service.findByPk(serviceItem.service_id, {
            transaction,
          });
          if (service) {
            const serviceUnitPrice = parseFloat(service.base_price);
            let maxQuantity = 1;

            switch (service.service_id) {
              case 10:
                maxQuantity = 1;
                break;
              case 14:
                maxQuantity = 5;
                break;
              case 13:
                maxQuantity = 20;
                break;
            }

            const quantity = Math.min(
              parseInt(serviceItem.quantity) || 1,
              maxQuantity
            );

            validatedServices.push({
              service_id: service.service_id,
              name: service.service_name,
              price: serviceUnitPrice,
              quantity: quantity,
              unit: getServiceUnit(service.service_id),
            });
          }
        }
      }

      const pricing = calculateRoomPricing(
        room,
        checkinDate,
        checkoutDate,
        adultsCount,
        childrenCount,
        validatedServices
      );

      const orderId = `HOTEL_${Date.now()}_${Math.floor(
        Math.random() * 10000
      )}`;
      const userId = req.session?.user?.id || null;

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
        status: "pending",
        order_id: orderId,
        guest_email: email.trim(),
        guest_phone: phone.trim(),
        guest_address: finalAddress,
        payment_method: paymentMethod,
        payment_status: "pending",
        notes: finalNote,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const booking = await db.Booking.create(bookingData, { transaction });

      // Sử dụng booking.booking_id thay vì booking.id
      const newBookingId = booking.booking_id; //Primary key chính xác

      console.log("📋 Created new booking:", {
        booking_id: newBookingId,
        order_id: orderId,
        total_price: pricing.totalAmount,
      });

      //Lưu booking services với booking_id đúng
      if (validatedServices.length > 0) {
        for (const service of validatedServices) {
          const totalPrice = service.price * service.quantity;

          await db.BookingService.create(
            {
              booking_id: newBookingId,
              service_id: service.service_id,
              price: totalPrice,
              quantity: service.quantity,
            },
            { transaction }
          );
        }
      }

      const paymentData = {
        booking_id: newBookingId,
        user_id: userId,
        amount: pricing.totalAmount,
        status: "pending",
        payment_method: paymentMethod,
        transaction_id: orderId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await db.Payment.create(paymentData, { transaction });
      await transaction.commit();

      // Xử lý response cho booking mới
      if (paymentMethod === "cash") {
        const bookingDetails = {
          guest_name: fullname.trim(),
          guest_email: email.trim(),
          guest_phone: phone.trim(),
          guest_address: finalAddress,
          room_type: room.type_name,
          checkin: checkinDate.toISOString().split("T")[0],
          checkout: checkoutDate.toISOString().split("T")[0],
          nights: pricing.nights,
          adults: adultsCount,
          children: childrenCount,
          total_guests: adultsCount + childrenCount,
          room_total: pricing.roomTotal,
          services_total: pricing.servicesTotal,
          services_breakdown: pricing.servicesBreakdown,
          total_amount: pricing.totalAmount,
          formatted_amount: pricing.totalAmount.toLocaleString("vi-VN") + " ₫",
          notes: finalNote,
        };

        return res.status(200).json({
          success: true,
          payment_method: "cash",
          order_id: orderId,
          booking_id: newBookingId,
          booking_details: bookingDetails,
          message:
            "Booking được tạo thành công với phương thức thanh toán tiền mặt",
        });
      }

      if (paymentMethod === "vnpay") {
        try {
          const returnUrl = VNP_RETURN_URL;

          const clientIp =
            req.headers["x-forwarded-for"] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            "127.0.0.1";

          const cleanIpAddr = clientIp
            .split(",")[0]
            .trim()
            .replace("::ffff:", "");
          const ipRegex =
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const validIp = ipRegex.test(cleanIpAddr) ? cleanIpAddr : "127.0.0.1";

          const orderInfo = `Dat phong ${room.type_name.replace(
            /[^a-zA-Z0-9\s]/g,
            ""
          )} - ${fullname.replace(/[^a-zA-Z0-9\s]/g, "")} - ${orderId}`;

          const paymentUrl = buildVNPayUrl({
            amount: pricing.totalAmount,
            orderId: orderId,
            orderInfo: orderInfo,
            returnUrl: returnUrl,
            ipAddr: validIp,
            orderType: "other",
            locale: "vn",
            bankCode: null,
          });

          await db.Payment.update(
            {
              gateway_response: JSON.stringify({
                vnpay_url: paymentUrl,
                order_info: orderInfo,
                client_ip: validIp,
                created_at: new Date(),
                vnp_tmn_code: VNP_TMN_CODE,
                amount_vnd: pricing.totalAmount,
                return_url: returnUrl,
                new_booking: true,
                services_included: validatedServices.length > 0,
                services_count: validatedServices.length,
              }),
            },
            {
              where: {
                booking_id: newBookingId,
                payment_method: "vnpay",
              },
            }
          );

          return res.json({
            success: true,
            payment_method: "vnpay",
            redirect_url: paymentUrl,
            order_id: orderId,
            booking_id: newBookingId,
            expires_in: "24 hours",
            amount: pricing.totalAmount,
            room_total: pricing.roomTotal,
            services_total: pricing.servicesTotal,
            services_count: validatedServices.length,
            message: "Booking được tạo thành công, chuyển hướng tới VNPay",
          });
        } catch (vnpayError) {
          await db.Booking.update(
            { payment_method: "cash", payment_status: "pending" },
            { where: { booking_id: newBookingId } }
          );

          return res.status(500).json({
            success: false,
            message: `Lỗi VNPay: ${vnpayError.message}. Booking đã được tạo với phương thức thanh toán tiền mặt.`,
            fallback_payment: "cash",
            order_id: orderId,
            booking_id: newBookingId,
          });
        }
      }
    }

    return res.status(400).json({
      success: false,
      message: "Phương thức thanh toán không được hỗ trợ.",
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    console.error("💥 Checkout error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống: " + error.message,
      debug_info: {
        error_type: "system_error",
        error_stack: error.stack,
      },
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
    const hash = crypto
      .createHmac("sha512", VNP_HASH_SECRET)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    if (secureHash.toLowerCase() === hash.toLowerCase()) {
      const {
        vnp_ResponseCode,
        vnp_TxnRef,
        vnp_Amount,
        vnp_BankCode,
        vnp_PayDate,
        vnp_TransactionNo,
      } = vnp_Params;

      if (vnp_ResponseCode === "00") {
        await db.Booking.update(
          {
            status: "completed",
            payment_status: "paid",
            transaction_id: vnp_TransactionNo,
            paid_at: new Date(),
          },
          {
            where: { order_id: vnp_TxnRef },
          }
        );

        const booking = await db.Booking.findOne({
          where: { order_id: vnp_TxnRef },
        });

        if (booking) {
          await db.Payment.update(
            {
              status: "completed",
              transaction_id: vnp_TransactionNo,
              paid_at: new Date(),
              gateway_response: JSON.stringify({
                vnp_ResponseCode,
                vnp_TransactionNo,
                vnp_BankCode,
                vnp_PayDate,
                vnp_Amount: vnp_Amount / 100,
              }),
            },
            {
              where: { booking_id: booking.id || booking.booking_id },
            }
          );
        }

        return res.redirect(
          `/payment-success?order_id=${vnp_TxnRef}&transaction_id=${vnp_TransactionNo}&amount=${
            vnp_Amount / 100
          }`
        );
      } else {
        await db.Booking.update(
          {
            status: "canceled",
            payment_status: "failed",
          },
          {
            where: { order_id: vnp_TxnRef },
          }
        );

        return res.redirect(
          `/payment-failed?order_id=${vnp_TxnRef}&error=payment_failed`
        );
      }
    } else {
      return res.redirect("/payment-failed?error=invalid_signature");
    }
  } catch (error) {
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
    const calculatedHash = hmac
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex")
      .toUpperCase();

    if (secureHash === calculatedHash) {
      const { vnp_ResponseCode, vnp_TxnRef } = vnp_Params;

      const booking = await db.Booking.findOne({
        where: { order_id: vnp_TxnRef },
      });
      if (!booking) {
        return res.json({ RspCode: "01", Message: "Order not found" });
      }

      if (vnp_ResponseCode === "00") {
        await db.Booking.update(
          {
            status: "completed",
            payment_status: "paid",
          },
          { where: { order_id: vnp_TxnRef } }
        );

        return res.json({ RspCode: "00", Message: "Success" });
      } else {
        await db.Booking.update(
          {
            status: "canceled",
            payment_status: "failed",
          },
          { where: { order_id: vnp_TxnRef } }
        );

        return res.json({ RspCode: "00", Message: "Success" });
      }
    } else {
      return res.json({ RspCode: "97", Message: "Invalid signature" });
    }
  } catch (error) {
    return res.json({ RspCode: "99", Message: "System error" });
  }
};

// Get booking info
const getBookingInfo = async (req, res) => {
  try {
    const { order_id } = req.params;

    const booking = await db.Booking.findOne({
      where: { order_id },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy booking với mã: " + order_id,
      });
    }

    let bookingServices = [];
    try {
      const rawServices = await db.BookingService.findAll({
        where: { booking_id: booking.booking_id || booking.id },
        include: [
          {
            model: db.Service,
            attributes: ["service_name"],
          },
        ],
      });

      bookingServices = rawServices.map((bs) => {
        const totalPrice = parseFloat(bs.price);
        const quantity = parseInt(bs.quantity);
        const unitPrice = quantity > 0 ? totalPrice / quantity : totalPrice;

        return {
          service_id: bs.service_id,
          service_name:
            bs.Service?.service_name || getServiceName(bs.service_id),
          unit_price: unitPrice,
          quantity: quantity,
          unit: getServiceUnit(bs.service_id),
          total_price: totalPrice,
        };
      });
    } catch (serviceError) {
      console.log("Error loading services:", serviceError.message);
    }

    const nights = Math.ceil(
      (new Date(booking.check_out_date) - new Date(booking.check_in_date)) /
        (1000 * 3600 * 24)
    );
    const servicesTotal = bookingServices.reduce(
      (sum, service) => sum + service.total_price,
      0
    );

    return res.json({
      success: true,
      booking: {
        order_id: booking.order_id,
        booking_id: booking.booking_id || booking.id,
        guest_name: booking.name,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone,
        guest_address: booking.guest_address,
        checkin_date: booking.check_in_date,
        checkout_date: booking.check_out_date,
        nights: nights,
        adults: booking.adults,
        children: booking.children,
        total_guests: booking.adults + booking.children,
        total_amount: booking.total_price,
        services_total: servicesTotal,
        formatted_amount:
          parseFloat(booking.total_price).toLocaleString("vi-VN") + " ₫",
        formatted_services_total: servicesTotal.toLocaleString("vi-VN") + " ₫",
        payment_method: booking.payment_method,
        payment_status: booking.payment_status,
        booking_status: booking.status,
        notes: booking.notes,
        services: bookingServices.map((service) => ({
          ...service,
          formatted_unit_price:
            service.unit_price.toLocaleString("vi-VN") + " ₫",
          formatted_total_price:
            service.total_price.toLocaleString("vi-VN") + " ₫",
        })),
        created_at: booking.created_at,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin booking: " + error.message,
    });
  }
};

// Confirm cash payment
const confirmCashPayment = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { staff_id, notes } = req.body;

    const booking = await db.Booking.findOne({
      where: { order_id },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy booking",
      });
    }

    if (booking.payment_method !== "cash") {
      return res.status(400).json({
        success: false,
        message: "Booking này không phải thanh toán bằng tiền mặt",
      });
    }

    if (booking.payment_status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Booking này đã được thanh toán rồi",
      });
    }

    await db.Booking.update(
      {
        payment_status: "paid",
        paid_at: new Date(),
        status: "completed",
      },
      { where: { order_id } }
    );

    await db.Payment.update(
      {
        status: "completed",
        paid_at: new Date(),
        transaction_id: `CASH_PAID_${Date.now()}`,
        gateway_response: JSON.stringify({
          payment_type: "cash",
          staff_id: staff_id,
          confirmed_at: new Date(),
          notes: notes,
        }),
      },
      { where: { booking_id: booking.booking_id || booking.id } }
    );

    return res.json({
      success: true,
      message: "Xác nhận thanh toán tiền mặt thành công",
      order_id: order_id,
      paid_at: new Date(),
      confirmed_by: staff_id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xác nhận thanh toán: " + error.message,
    });
  }
};

// Get cash payment report
const getCashPaymentReport = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const cashBookings = await db.Booking.findAll({
      where: {
        payment_method: "cash",
        booking_date: targetDate,
      },
      order: [["created_at", "DESC"]],
    });

    const summary = {
      total_bookings: cashBookings.length,
      paid_bookings: cashBookings.filter((b) => b.payment_status === "paid")
        .length,
      pending_bookings: cashBookings.filter(
        (b) => b.payment_status === "pending"
      ).length,
      total_amount: cashBookings.reduce(
        (sum, b) => sum + parseFloat(b.total_price),
        0
      ),
      paid_amount: cashBookings
        .filter((b) => b.payment_status === "paid")
        .reduce((sum, b) => sum + parseFloat(b.total_price), 0),
      pending_amount: cashBookings
        .filter((b) => b.payment_status === "pending")
        .reduce((sum, b) => sum + parseFloat(b.total_price), 0),
    };

    return res.json({
      success: true,
      date: targetDate.toISOString().split("T")[0],
      summary: {
        ...summary,
        formatted_total: summary.total_amount.toLocaleString("vi-VN") + " ₫",
        formatted_paid: summary.paid_amount.toLocaleString("vi-VN") + " ₫",
        formatted_pending:
          summary.pending_amount.toLocaleString("vi-VN") + " ₫",
      },
      bookings: cashBookings.map((booking) => ({
        order_id: booking.order_id,
        guest_name: booking.name,
        guest_phone: booking.guest_phone,
        total_amount: booking.total_price,
        payment_status: booking.payment_status,
        paid_at: booking.paid_at,
        created_at: booking.created_at,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy báo cáo: " + error.message,
    });
  }
};

// Health Check Function
const healthCheck = (req, res) => {
  try {
    return res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
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
  getAvailableServices,
  healthCheck,
};
