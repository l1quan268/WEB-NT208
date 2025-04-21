import bcrypt from "bcryptjs";
import db from "../models/index";

const salt = bcrypt.genSaltSync(10);

let createNewUser = async (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Kiểm tra xem email đã tồn tại chưa
      const existingUser = await db.User.findOne({
        where: { email: data.email },
      });
      if (existingUser) {
        return resolve("Email đã tồn tại");
      }

      // Hash mật khẩu
      let hashPasswordFromBcrypt = await hashUserPassword(data.password);

      // Tạo user mới
      await db.User.create({
        name: data.name,
        email: data.email,
        password_hash: hashPasswordFromBcrypt,
        gender: data.gender || "male", // nếu có chọn giới tính
        phone: data.phone || "", // nếu có nhập số điện thoại
      });

      resolve("Đăng ký thành công");
    } catch (e) {
      reject(e);
    }
  });
};

let hashUserPassword = (password) => {
  return new Promise(async (resolve, reject) => {
    try {
      let hashPassword = await bcrypt.hash(password, salt);
      resolve(hashPassword);
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = {
  createUser: createNewUser,
};
