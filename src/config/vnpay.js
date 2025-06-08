module.exports = {
  // VNPay Configuration
  vnp_TmnCode: process.env.VNP_TMN_CODE || "2ZKVU3BZ",
  vnp_HashSecret: process.env.VNP_HASH_SECRET || "AL1FQSVIRA9YRR7IWC6DCGSUJZWU14NY",
  vnp_Url: process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  vnp_ReturnUrl: process.env.VNP_RETURN_URL || "http://localhost:9999/vnpay_return",
  vnp_IPN_Url: process.env.VNP_IPN_URL || "http://localhost:9999/vnpay_ipn",
  vnp_Api: process.env.VNP_API || "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"
};