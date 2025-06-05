// server.js hoặc routes/payment.js
const express = require('express');
const { VNPay, ignoreLogger } = require('vnpay');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Cấu hình VNPay
const vnpay = new VNPay({
  tmnCode: 'S2TTOR81', // Thay bằng TMN Code thực tế từ VNPay
  secureSecret: 'MTXXC74DNQWKRHOQ6N08CGAYJ5EXIYLZ', // Thay bằng Secure Secret thực tế
  vnpayHost: 'https://sandbox.vnpayment.vn', // Sandbox URL
  testMode: true, // Chế độ test
  hashAlgorithm: 'SHA512',
  enableLog: true,
  loggerFn: ignoreLogger
});

app.post('/api/checkout', async (req, res) => {
  try {
    const {
      room_id,
      checkin,
      checkout,
      fullname,
      address,
      phone,
      email,
      paymentMethod,
      note,
      createAccount
    } = req.body;

    // Validate dữ liệu đầu vào
    if (!fullname || !address || !phone || !email || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
    }

    // Tính toán số tiền (ví dụ: 500,000 VND/đêm)
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
    const amount = nights * 500000; // 500,000 VND per night

    // Tạo mã đơn hàng duy nhất
    const orderId = generateOrderId();
    
    // Lưu thông tin booking vào database (tùy chọn)
    const bookingData = {
      orderId,
      room_id,
      checkin,
      checkout,
      fullname,
      address,
      phone,
      email,
      amount,
      paymentMethod,
      note,
      createAccount: createAccount || false,
      status: 'pending',
      createdAt: new Date()
    };
    
    // TODO: Lưu vào database
    // await saveBookingToDatabase(bookingData);

    if (paymentMethod === 'vnpay') {
      // Tạo URL thanh toán VNPay
      const paymentUrl = vnpay.buildPaymentUrl({
        vnp_Amount: amount,
        vnp_Command: 'pay',
        vnp_CreateDate: formatDate(new Date()),
        vnp_CurrCode: 'VND',
        vnp_IpAddr: req.ip || '127.0.0.1',
        vnp_Locale: 'vn',
        vnp_OrderInfo: `Thanh toan dat phong khach san - ${orderId}`,
        vnp_OrderType: 'other',
        vnp_ReturnUrl: `${req.protocol}://${req.get('host')}/vnpay/return`,
        vnp_TmnCode: vnpay.tmnCode,
        vnp_TxnRef: orderId,
      });

      return res.json({
        success: true,
        payment_method: 'vnpay',
        redirect_url: paymentUrl,
        order_id: orderId
      });
    } 
    else if (paymentMethod === 'momo') {
      // TODO: Tích hợp MoMo API
      return res.json({
        success: true,
        payment_method: 'momo',
        redirect_url: 'https://test-payment.momo.vn/...',
        order_id: orderId
      });
    }
    else if (paymentMethod === 'cash') {
      // Thanh toán tiền mặt - chỉ cần lưu thông tin
      return res.json({
        success: true,
        payment_method: 'cash',
        order_id: orderId,
        message: 'Đặt phòng thành công. Vui lòng thanh toán bằng tiền mặt khi nhận phòng.'
      });
    }
    else {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      });
    }

  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi xử lý đặt phòng'
    });
  }
});

// Route xử lý callback từ VNPay
app.get('/vnpay/return', (req, res) => {
  try {
    const vnpayReturnData = req.query;
    
    // Verify chữ ký từ VNPay
    const isValidSignature = vnpay.verifyReturnUrl(vnpayReturnData);
    
    if (!isValidSignature) {
      return res.redirect('/payment-failed?error=invalid_signature');
    }

    const { vnp_ResponseCode, vnp_TxnRef, vnp_Amount, vnp_TransactionNo } = vnpayReturnData;
    
    if (vnp_ResponseCode === '00') {
      // Thanh toán thành công
      
      // TODO: Cập nhật trạng thái booking trong database
      // await updateBookingStatus(vnp_TxnRef, 'paid', vnp_TransactionNo);
      
      return res.redirect(`/payment-success?order_id=${vnp_TxnRef}&transaction_id=${vnp_TransactionNo}`);
    } else {
      // Thanh toán thất bại
      const errorMessage = getVNPayErrorMessage(vnp_ResponseCode);
      
      // TODO: Cập nhật trạng thái booking trong database
      // await updateBookingStatus(vnp_TxnRef, 'failed', null);
      
      return res.redirect(`/payment-failed?order_id=${vnp_TxnRef}&error=${errorMessage}`);
    }

  } catch (error) {
    console.error('VNPay return error:', error);
    return res.redirect('/payment-failed?error=system_error');
  }
});

// Route xử lý IPN (Instant Payment Notification) từ VNPay
app.post('/vnpay/ipn', (req, res) => {
  try {
    const vnpayIpnData = req.query;
    
    // Verify chữ ký
    const isValidSignature = vnpay.verifyIpnCall(vnpayIpnData);
    
    if (!isValidSignature) {
      return res.json({ RspCode: '97', Message: 'Invalid signature' });
    }

    const { vnp_ResponseCode, vnp_TxnRef, vnp_Amount, vnp_TransactionNo } = vnpayIpnData;
    
    // TODO: Kiểm tra đơn hàng có tồn tại trong database không
    // const booking = await getBookingByOrderId(vnp_TxnRef);
    // if (!booking) {
    //   return res.json({ RspCode: '01', Message: 'Order not found' });
    // }

    if (vnp_ResponseCode === '00') {
      // TODO: Cập nhật trạng thái booking
      // await updateBookingStatus(vnp_TxnRef, 'paid', vnp_TransactionNo);
      
      return res.json({ RspCode: '00', Message: 'Success' });
    } else {
      // TODO: Cập nhật trạng thái booking thất bại
      // await updateBookingStatus(vnp_TxnRef, 'failed', null);
      
      return res.json({ RspCode: '00', Message: 'Success' });
    }

  } catch (error) {
    console.error('VNPay IPN error:', error);
    return res.json({ RspCode: '99', Message: 'System error' });
  }
});

// Utility functions
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORDER_${timestamp}_${random}`;
}

function formatDate(date) {
  return date.toISOString().replace(/[-T:]/g, '').substring(0, 14);
}

function getVNPayErrorMessage(responseCode) {
  const errorMessages = {
    '01': 'Giao dịch chưa hoàn tất',
    '02': 'Giao dịch bị lỗi',
    '04': 'Giao dịch đảo (Khách hàng đã bị trừ tiền tại Ngân hàng nhưng GD chưa thành công ở VNPAY)',
    '05': 'VNPAY đang xử lý giao dịch này (GD hoàn tiền)',
    '06': 'VNPAY đã gửi yêu cầu hoàn tiền sang Ngân hàng (GD hoàn tiền)',
    '07': 'Giao dịch bị nghi ngờ gian lận',
    '09': 'GD Hoàn trả bị từ chối',
    '10': 'Đã giao hàng',
    '11': 'Giao dịch không thành công do: Khách hàng nhập sai mật khẩu',
    '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa',
    '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP)',
    '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
    '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch',
    '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày',
    '75': 'Ngân hàng thanh toán đang bảo trì',
    '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định',
    '99': 'Các lỗi khác'
  };
  
  return errorMessages[responseCode] || 'Lỗi không xác định';
}

// Start server
const PORT = process.env.PORT || 9999;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;