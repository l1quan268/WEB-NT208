const bcrypt = require("bcryptjs");
const db = require("../models/index");

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
        gender: data.gender || "male",
        phone: data.phone || "",
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
      const salt = await bcrypt.genSalt(10);
      let hashPassword = await bcrypt.hash(password, salt);
      resolve(hashPassword);
    } catch (e) {
      reject(e);
    }
  });
};

//Trả về đúng field name
let handleUserLogin = async (email, password) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("1. Bắt đầu xử lý đăng nhập với email:", email);

      // Tìm user theo email
      const user = await db.User.findOne({
        where: { email: email },
      });

      console.log("2. Kết quả tìm user:", user ? "Tồn tại" : "Không tồn tại");

      if (!user) {
        console.log("3. Email không tồn tại trong hệ thống");
        return resolve({
          success: false,
          message: "Email không tồn tại trong hệ thống",
        });
      }

      console.log("4. Mật khẩu nhập vào:", password);
      console.log("5. Hash trong database:", user.password_hash);

      // So sánh mật khẩu
      const isMatch = await bcrypt.compare(password, user.password_hash);

      console.log("6. Kết quả so sánh mật khẩu:", isMatch);

      if (!isMatch) {
        console.log("7. Mật khẩu không khớp");
        return resolve({
          success: false,
          message: "Mật khẩu không chính xác",
        });
      }

      console.log("8. Đăng nhập thành công với user_id:", user.user_id);

      resolve({
        success: true,
        message: "Đăng nhập thành công",
        user: {
          user_id: user.user_id,
          id: user.user_id, // THÊM: backup cho compatibility
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (e) {
      console.log("9. Lỗi trong quá trình đăng nhập:", e);
      reject(e);
    }
  });
};

let getUserById = async (user_id) => {
  try {
    const user = await db.User.findOne({
      where: { user_id: user_id },
    });
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
      console.log("✅ Tìm thấy user Google với user_id:", user.user_id);
      return user;
    }

    // Nếu chưa có user, tạo mới
    let newUser = await db.User.create({
      name: profile.displayName,
      email: profile.emails[0].value,
      gender: "male",
      password_hash: "", // Google không cần mật khẩu
    });

    console.log("✅ Tạo mới user Google với user_id:", newUser.user_id);
    return newUser;
  } catch (error) {
    console.error("❌ Lỗi findOrCreateGoogleUser:", error);
    throw error;
  }
};

module.exports = {
  createUser: createNewUser,
  handleUserLogin: handleUserLogin,
  getUserById: getUserById,
  findOrCreateGoogleUser: findOrCreateGoogleUser,
};
