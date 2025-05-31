import multer from "multer";
import fs from "fs";
import path from "path";

const dir = path.join("public", "uploads");

// Tự tạo thư mục nếu chưa có
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });
export default upload;