import bcrypt from "bcryptjs";
import db from "../models/index";

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
      // Tạo salt mới mỗi lần băm
      const salt = await bcrypt.genSalt(10);
      let hashPassword = await bcrypt.hash(password, salt);
      resolve(hashPassword);
    } catch (e) {
      reject(e);
    }
  });
};

//login
//
let handleUserLogin = async (email, password) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("1. Bắt đầu xử lý đăng nhập với email:", email); // Thêm dòng này

      // Tìm user theo email
      const user = await db.User.findOne({
        where: { email: email },
      });

      console.log("2. Kết quả tìm user:", user ? "Tồn tại" : "Không tồn tại"); // Thêm dòng này

      if (!user) {
        console.log("3. Email không tồn tại trong hệ thống"); // Thêm dòng này
        return resolve({
          success: false,
          message: "Email không tồn tại trong hệ thống",
        });
      }

      console.log("4. Mật khẩu nhập vào:", password); // Thêm dòng này
      console.log("5. Hash trong database:", user.password_hash); // Thêm dòng này

      // So sánh mật khẩu
      const isMatch = await bcrypt.compare(password, user.password_hash);

      console.log("6. Kết quả so sánh mật khẩu:", isMatch); // Thêm dòng này

      if (!isMatch) {
        console.log("7. Mật khẩu không khớp"); // Thêm dòng này
        return resolve({
          success: false,
          message: "Mật khẩu không chính xác",
        });
      }

      console.log("8. Đăng nhập thành công"); // Thêm dòng này
      // Nếu đúng cả email và mật khẩu
      resolve({
        success: true,
        message: "Đăng nhập thành công",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (e) {
      console.log("9. Lỗi trong quá trình đăng nhập:", e); // Thêm dòng này
      reject(e);
    }
  });
};
let getUserById = async (user_id) => {
  try {
    const user = await db.User.findOne({ where: { user_id } });
    return user;
  } catch (error) {
    throw error;
  }
};
let findOrCreateGoogleUser = async (profile) => {
  try {
    let user = await db.User.findOne({
      where: { email: profile.emails[0].value },
    });

    if (user) {
      return user;
    }

    // Nếu chưa có user, tạo mới
    let newUser = await db.User.create({
      name: profile.displayName,
      email: profile.emails[0].value,
      gender: "male", // Hoặc profile.gender nếu Google trả về
      password_hash: "", // Vì dùng Google nên không cần mật khẩu
    });

    return newUser;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createUser: createNewUser,
  handleUserLogin: handleUserLogin,
  getUserById: getUserById,
  findOrCreateGoogleUser: findOrCreateGoogleUser,
};
