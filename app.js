// THÊM VÀO APP.JS - API ENDPOINTS
app.get('/api/room/:roomId/confirmed-bookings', async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`🔍 Getting bookings for room ${roomId}`);
    
    // THAY ĐỔI QUERY THEO DATABASE CỦA BẠN
    const query = `
      SELECT 
        booking_id,
        checkin_date,
        checkout_date,
        guest_name,
        user_id,
        status
      FROM bookings 
      WHERE room_type_id = ? 
        AND status IN ('confirmed', 'paid')
        AND checkout_date >= CURDATE()
    `;
    
    // THAY ĐỔI THEO DATABASE DRIVER CỦA BẠN
    const bookings = await db.query(query, [roomId]); // Hoặc connection.query
    
    const formattedBookings = bookings.map(booking => ({
      id: booking.booking_id,
      checkin: booking.checkin_date,
      checkout: booking.checkout_date,
      guest_name: booking.guest_name || 'Khách hàng'
    }));
    
    res.json({
      success: true,
      bookings: formattedBookings
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    res.json({ success: false, bookings: [] });
  }
});

app.post('/api/room/:roomId/check-availability', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { checkin, checkout } = req.body;
    
    console.log(`🔍 Checking: Room ${roomId}, ${checkin} → ${checkout}`);
    
    // KIỂM TRA CONFLICT
    const conflictQuery = `
      SELECT checkin_date, checkout_date, guest_name
      FROM bookings 
      WHERE room_type_id = ? 
        AND status IN ('confirmed', 'paid')
        AND (
          (checkin_date < ? AND checkout_date > ?) OR
          (checkin_date < ? AND checkout_date > ?) OR  
          (checkin_date >= ? AND checkin_date < ?)
        )
    `;
    
    const conflicts = await db.query(conflictQuery, [
      roomId, checkout, checkin, checkout, checkout, checkin, checkout
    ]);
    
    if (conflicts.length > 0) {
      console.log(`❌ CONFLICT FOUND:`, conflicts);
      return res.json({
        success: false,
        available: false,
        conflicts: conflicts.map(c => ({
          checkin: c.checkin_date,
          checkout: c.checkout_date,
          guest: c.guest_name
        }))
      });
    }
    
    console.log(`✅ Room available`);
    res.json({ success: true, available: true });
    
  } catch (error) {
    console.error('❌ Check availability error:', error);
    res.json({ success: false, available: false });
  }
});