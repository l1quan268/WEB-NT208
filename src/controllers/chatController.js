const db = require("../models");

let handleChatQuery = async (req, res) => {
  const message = req.body.message.toLowerCase();
  const kbAnswer = req.body.kbAnswer || null; // Nhận từ workflow

  //Kiểm tra có cần API không
  const needsAPI =
    /\d+\s*(người|khách|nguoi)|phòng.*trống|lịch.*phòng|phòng.*lịch|hôm nay|today/.test(
      message
    );

  if (!needsAPI && kbAnswer) {
    return res.json({
      reply: kbAnswer,
    });
  }

  let apiReply = null;

  //Case 1: Hỏi số người cụ thể
  const match = message.match(/(\d+)\s*(người|khách|người|nguoi)/);
  if (message.includes("phòng") && match) {
    const guestCount = parseInt(match[1]);

    try {
      const [rooms] = await db.sequelize.query(
        `SELECT rt.type_name, rt.max_guests, rt.price_per_night, h.name as homestay_name
         FROM roomtypes rt
         JOIN homestays h ON rt.homestay_id = h.homestay_id  
         WHERE rt.max_guests >= :count 
         ORDER BY rt.price_per_night ASC`,
        { replacements: { count: guestCount } }
      );

      if (rooms.length > 0) {
        apiReply = `🔎 Có ${rooms.length} phòng phù hợp cho ${guestCount} người:\n`;
        apiReply += rooms
          .map(
            (r) =>
              `• **${r.type_name}** tại ${r.homestay_name}\n  👥 Tối đa ${
                r.max_guests
              } người - 💰 ${r.price_per_night.toLocaleString()}đ/đêm`
          )
          .join("\n\n");
      } else {
        apiReply = `❌ Không có phòng nào phù hợp cho ${guestCount} người.`;
      }
    } catch (err) {
      console.error("❌ SQL ERROR (guest count):", err);
      apiReply = "⚠️ Lỗi truy vấn số người.";
    }
  }

  //Case 2: Phòng trống hôm nay (ưu tiên cao nhất)
  else if (
    message.includes("trống") &&
    (message.includes("hôm nay") || message.includes("today"))
  ) {
    try {
      const today = new Date().toISOString().split("T")[0];

      const [available] = await db.sequelize.query(
        `SELECT rt.type_name, rt.price_per_night, rt.max_guests, h.name as homestay_name
         FROM roomtypes rt
         JOIN homestays h ON rt.homestay_id = h.homestay_id
         WHERE rt.room_type_id NOT IN (
           SELECT DISTINCT room_type_id FROM bookings 
           WHERE :today BETWEEN check_in_date AND check_out_date
             AND status IN ('pending', 'completed')
         )
         ORDER BY rt.price_per_night ASC`,
        { replacements: { today } }
      );

      if (available.length > 0) {
        apiReply = `🟢 **Phòng trống hôm nay** (${today}):\n`;
        apiReply += available
          .map(
            (r) =>
              `• **${r.type_name}** tại ${r.homestay_name}\n  👥 ${
                r.max_guests
              } người - 💰 ${r.price_per_night.toLocaleString()}đ/đêm`
          )
          .join("\n\n");
      } else {
        apiReply = `❌ Tất cả phòng đã được đặt hôm nay (${today})`;
      }
    } catch (err) {
      console.error("❌ SQL ERROR (today availability):", err);
      apiReply = "⚠️ Lỗi truy vấn phòng trống.";
    }
  }

  //Case 3: Hỏi lịch phòng cụ thể (ưu tiên cao nhất trong else)
  else {
    let roomMatch =
      message.match(
        /(?:lịch|phòng)\s+(?:của\s+)?([a-z0-9\s\-]+?)(?:\s+(?:còn|trống|lịch|ngày)|$)/i
      ) || message.match(/lịch(?: của)?\s+([a-z0-9\s\-]+)/i);

    if (roomMatch && roomMatch[1]) {
      const rawName = roomMatch[1].trim().replace(/\s+/g, " ");

      try {
        // Tìm phòng theo tên (search cả type_name và homestay name)
        const [rooms] = await db.sequelize.query(
          `SELECT rt.room_type_id, rt.type_name, h.name as homestay_name
           FROM roomtypes rt
           JOIN homestays h ON rt.homestay_id = h.homestay_id
           WHERE LOWER(rt.type_name) LIKE :name 
              OR LOWER(h.name) LIKE :name
           LIMIT 1`,
          { replacements: { name: `%${rawName.toLowerCase()}%` } }
        );

        if (rooms.length > 0) {
          const room = rooms[0];

          // Lấy TẤT CẢ lịch đặt phòng (cả past và future để show full calendar)
          const [booked] = await db.sequelize.query(
            `SELECT check_in_date, check_out_date, status, name as guest_name
             FROM bookings 
             WHERE room_type_id = :id 
               AND status IN ('pending', 'completed')
             ORDER BY check_in_date DESC
             LIMIT 10`,
            { replacements: { id: room.room_type_id } }
          );

          if (booked.length === 0) {
            apiReply = `✅ **${room.type_name}** tại ${room.homestay_name} chưa có booking nào!\n\n`;
            apiReply += `💡 **Bạn có thể đặt bất kỳ ngày nào từ hôm nay trở đi.**`;
          } else {
            // Hiển thị lịch đầy đủ
            apiReply = `📅 **${room.type_name}** tại ${room.homestay_name} - Lịch đặt phòng:\n`;

            // Phân loại booking theo thời gian
            const today = new Date().toISOString().split("T")[0];
            const futureBookings = [];
            const pastBookings = [];

            booked.forEach((b) => {
              if (b.check_out_date >= today) {
                futureBookings.push(b);
              } else {
                pastBookings.push(b);
              }
            });

            // Hiển thị future bookings trước
            if (futureBookings.length > 0) {
              apiReply += `\n🔮 **Lịch sắp tới:**\n`;
              futureBookings.forEach((b) => {
                apiReply += `• ${b.check_in_date} → ${b.check_out_date} (${
                  b.status === "pending" ? "Chờ xác nhận" : "Đã xác nhận"
                })\n`;
              });
            }

            // Hiển thị past bookings
            if (pastBookings.length > 0) {
              apiReply += `\n📜 **Lịch đã qua (${pastBookings.length} booking gần nhất):**\n`;
              pastBookings.slice(0, 5).forEach((b) => {
                apiReply += `• ${b.check_in_date} → ${b.check_out_date} (Đã hoàn thành)\n`;
              });
            }

            // Đề xuất ngày trống thông minh (chỉ dựa trên future bookings)
            const suggestions = [];

            if (futureBookings.length === 0) {
              // Không có booking tương lai
              suggestions.push(
                `• **Từ hôm nay (${today}) trở đi** - Hoàn toàn trống!`
              );
            } else {
              // Sắp xếp future bookings theo ngày
              futureBookings.sort(
                (a, b) => new Date(a.check_in_date) - new Date(b.check_in_date)
              );

              // 1. Kiểm tra từ hôm nay đến booking đầu tiên
              const firstBooking = new Date(futureBookings[0].check_in_date);
              const todayDate = new Date(today);

              if (firstBooking > todayDate) {
                const daysDiff = Math.ceil(
                  (firstBooking - todayDate) / (1000 * 60 * 60 * 24)
                );
                if (daysDiff > 0) {
                  const endDate = new Date(firstBooking);
                  endDate.setDate(endDate.getDate() - 1);
                  suggestions.push(
                    `• **${today}** đến **${
                      endDate.toISOString().split("T")[0]
                    }** (${daysDiff} ngày)`
                  );
                }
              }

              // 2. Kiểm tra khoảng trống giữa các future bookings
              for (let i = 0; i < futureBookings.length - 1; i++) {
                const currentCheckOut = new Date(
                  futureBookings[i].check_out_date
                );
                const nextCheckIn = new Date(
                  futureBookings[i + 1].check_in_date
                );
                const gapDays = Math.ceil(
                  (nextCheckIn - currentCheckOut) / (1000 * 60 * 60 * 24)
                );

                if (gapDays > 1) {
                  const fromDate = new Date(currentCheckOut);
                  fromDate.setDate(fromDate.getDate() + 1);
                  const toDate = new Date(nextCheckIn);
                  toDate.setDate(toDate.getDate() - 1);

                  const availableDays = gapDays - 1;
                  if (availableDays > 0) {
                    suggestions.push(
                      `• **${fromDate.toISOString().split("T")[0]}** đến **${
                        toDate.toISOString().split("T")[0]
                      }** (${availableDays} ngày)`
                    );
                  }
                }
              }

              // 3. Sau booking cuối cùng
              const lastBooking = futureBookings[futureBookings.length - 1];
              const lastCheckOut = new Date(lastBooking.check_out_date);
              const nextAvailable = new Date(lastCheckOut);
              nextAvailable.setDate(nextAvailable.getDate() + 1);
              suggestions.push(
                `• **Từ ${nextAvailable.toISOString().split("T")[0]} trở đi**`
              );
            }

            // Thêm đề xuất vào response
            if (suggestions.length > 0) {
              apiReply += `\n\n💡 **Có thể đặt:**\n`;
              apiReply += suggestions.join("\n");
            }
          }
        } else {
          apiReply = `❌ Không tìm thấy phòng có tên "${rawName}". Có thể bạn muốn tìm:\n`;

          // Gợi ý phòng tương tự
          const [suggestions] = await db.sequelize.query(
            `SELECT rt.type_name, h.name as homestay_name
             FROM roomtypes rt
             JOIN homestays h ON rt.homestay_id = h.homestay_id
             LIMIT 5`
          );

          apiReply += suggestions
            .map((s) => `• **${s.type_name}** tại ${s.homestay_name}`)
            .join("\n");
        }
      } catch (err) {
        console.error("❌ SQL ERROR (room name):", err);
        apiReply = "⚠️ Lỗi truy vấn lịch phòng.";
      }
    }

    // 🎯 Case 4: Tìm phòng trống nói chung (chỉ khi KHÔNG có "lịch" và KHÔNG có "hôm nay")
    else if (
      message.includes("phòng") &&
      message.includes("trống") &&
      !message.includes("hôm nay") &&
      !message.includes("today") &&
      !message.includes("lịch") // ⭐ KEY FIX: Thêm condition này
    ) {
      try {
        const [available] = await db.sequelize.query(
          `SELECT rt.type_name, rt.max_guests, rt.price_per_night, h.name as homestay_name
           FROM roomtypes rt
           JOIN homestays h ON rt.homestay_id = h.homestay_id
           ORDER BY rt.price_per_night ASC
           LIMIT 10`
        );

        apiReply = `📋 **Danh sách phòng có sẵn:**\n`;
        apiReply += available
          .map(
            (r) =>
              `• **${r.type_name}** tại ${r.homestay_name}\n  👥 ${
                r.max_guests
              } người - 💰 ${r.price_per_night.toLocaleString()}đ/đêm`
          )
          .join("\n\n");
        apiReply += `\n\n💡 Để kiểm tra lịch trống cụ thể, hỏi: "lịch phòng [tên phòng]"`;
      } catch (err) {
        console.error("❌ SQL ERROR (all rooms):", err);
        apiReply = "⚠️ Lỗi truy vấn danh sách phòng.";
      }
    }

    //Case 5: Hỏi về homestay cụ thể
    else if (
      message.includes("homestay") ||
      message.includes("villa") ||
      message.includes("house")
    ) {
      const homestayMatch = message.match(
        /([a-z0-9\s\-]+(?:villa|house|homestay|view|paradise|breeze|nest|retreat|haven|chic|lagoon|stay|garden|home|aurora|corner|berkley|hut|beautiful))/i
      );

      if (homestayMatch) {
        const homestayName = homestayMatch[1].trim();

        try {
          const [homestayRooms] = await db.sequelize.query(
            `SELECT rt.type_name, rt.max_guests, rt.price_per_night, h.name as homestay_name
             FROM roomtypes rt
             JOIN homestays h ON rt.homestay_id = h.homestay_id
             WHERE LOWER(h.name) LIKE :name
             ORDER BY rt.price_per_night ASC`,
            { replacements: { name: `%${homestayName.toLowerCase()}%` } }
          );

          if (homestayRooms.length > 0) {
            const homestayName = homestayRooms[0].homestay_name;
            apiReply = `🏠 **${homestayName}** có ${homestayRooms.length} loại phòng:\n`;
            apiReply += homestayRooms
              .map(
                (r) =>
                  `• **${r.type_name}** - ${
                    r.max_guests
                  } người - ${r.price_per_night.toLocaleString()}đ/đêm`
              )
              .join("\n");
          } else {
            apiReply = `❌ Không tìm thấy homestay "${homestayName}"`;
          }
        } catch (err) {
          console.error("❌ SQL ERROR (homestay):", err);
          apiReply = "⚠️ Lỗi truy vấn homestay.";
        }
      }
    }
  }

  //Merge KB + API responses
  let finalReply = "";
  if (kbAnswer && apiReply) {
    finalReply = `${kbAnswer}\n\n📊 **Thông tin chi tiết:**\n${apiReply}`;
  } else if (apiReply) {
    finalReply = apiReply;
  } else {
    finalReply = "Xin lỗi, tôi chưa hiểu câu hỏi của bạn.";
  }

  return res.json({ reply: finalReply });
};

module.exports = { handleChatQuery };
