const { RoomType } = require("./src/models"); // Đường dẫn model Sequelize của bạn
const slugify = require("slugify");

(async () => {
  try {
    // Lấy toàn bộ RoomType
    const roomTypes = await RoomType.findAll();

    for (const roomType of roomTypes) {
      const slug = slugify(roomType.type_name, { lower: true, strict: true });
      await roomType.update({ slug });
      console.log(`Cập nhật slug cho: ${roomType.type_name}`);
    }

    console.log("Hoàn tất cập nhật slug!");
    process.exit(0);
  } catch (err) {
    console.error("Lỗi:", err);
    process.exit(1);
  }
})();
