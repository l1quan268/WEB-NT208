// Thêm vào routes/api.js hoặc app.js
// API endpoint để lấy các booking đã confirm cho 1 phòng

app.get('/api/room/:roomId/confirmed-bookings', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Query để lấy các booking đã thanh toán/confirm
    // Giả sử bạn có bảng bookings với các trường:
    // - room_type_id, checkin_date, checkout_date, status, payment_status
    
    const query = `
      SELECT 
        b.booking_id,
        b.checkin_date as checkin,
        b.checkout_date as checkout,
        b.status,
        b.payment_status,
        u.name as guest_name,
        u.email as guest_email
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.user_id
      WHERE b.room_type_id = ? 
        AND b.status IN ('confirmed', 'checked_in', 'completed')
        AND b.payment_status = 'paid'
        AND b.checkout_date >= CURDATE()
      ORDER BY b.checkin_date ASC
    `;
    
    // Thực thi query (tùy thuộc vào database bạn dùng)
    const bookings = await db.query(query, [roomId]);
    
    // Format lại data
    const confirmedBookings = bookings.map(booking => ({
      id: booking.booking_id,
      checkin: booking.checkin,
      checkout: booking.checkout,
      guest_name: booking.guest_name || 'Khách hàng',
      guest_email: booking.guest_email,
      status: booking.status
    }));
    
    res.json({
      success: true,
      bookings: confirmedBookings,
      message: `Found ${confirmedBookings.length} confirmed bookings`
    });
    
  } catch (error) {
    console.error('Error fetching confirmed bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking data',
      error: error.message
    });
  }
});

// API endpoint để check conflict khi user submit booking
app.post('/api/room/:roomId/check-availability', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { checkin, checkout } = req.body;
    
    // Validate input
    if (!checkin || !checkout) {
      return res.status(400).json({
        success: false,
        message: 'Missing checkin or checkout date'
      });
    }
    
    if (new Date(checkout) <= new Date(checkin)) {
      return res.status(400).json({
        success: false,
        message: 'Checkout date must be after checkin date'
      });
    }
    
    // Check for conflicts with existing bookings
    const conflictQuery = `
      SELECT 
        booking_id,
        checkin_date,
        checkout_date,
        status
      FROM bookings 
      WHERE room_type_id = ? 
        AND status IN ('confirmed', 'checked_in', 'completed')
        AND payment_status = 'paid'
        AND (
          (checkin_date < ? AND checkout_date > ?) OR
          (checkin_date < ? AND checkout_date > ?) OR
          (checkin_date >= ? AND checkin_date < ?)
        )
    `;
    
    const conflicts = await db.query(conflictQuery, [
      roomId,
      checkout, checkin,  // Existing booking starts before new checkout and ends after new checkin
      checkout, checkout, // Existing booking starts before new checkout and ends after new checkout  
      checkin, checkout   // Existing booking starts within new booking period
    ]);
    
    if (conflicts.length > 0) {
      return res.json({
        success: false,
        available: false,
        conflicts: conflicts.map(c => ({
          checkin: c.checkin_date,
          checkout: c.checkout_date,
          status: c.status
        })),
        message: 'Room is not available for selected dates'
      });
    }
    
    // Room is available
    res.json({
      success: true,
      available: true,
      message: 'Room is available for selected dates'
    });
    
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking room availability',
      error: error.message
    });
  }
});

// API endpoint để lấy suggested dates
app.get('/api/room/:roomId/suggested-dates', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { from_date } = req.query;
    
    const startDate = from_date || new Date().toISOString().split('T')[0];
    
    // Get all confirmed bookings
    const bookingsQuery = `
      SELECT checkin_date, checkout_date
      FROM bookings 
      WHERE room_type_id = ? 
        AND status IN ('confirmed', 'checked_in', 'completed')
        AND payment_status = 'paid'
        AND checkout_date >= ?
      ORDER BY checkin_date ASC
    `;
    
    const bookings = await db.query(bookingsQuery, [roomId, startDate]);
    
    // Generate suggested available periods
    const suggestions = [];
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < bookings.length && suggestions.length < 5; i++) {
      const bookingStart = new Date(bookings[i].checkin_date);
      const bookingEnd = new Date(bookings[i].checkout_date);
      
      // If there's a gap before this booking
      const daysBefore = Math.floor((bookingStart - currentDate) / (1000 * 60 * 60 * 24));
      
      if (daysBefore >= 2) { // At least 2 days available
        suggestions.push({
          checkin: currentDate.toISOString().split('T')[0],
          checkout: bookingStart.toISOString().split('T')[0],
          nights: daysBefore,
          type: 'before_booking'
        });
      }
      
      // Move to after this booking
      currentDate = new Date(bookingEnd);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Add some dates after all bookings
    if (suggestions.length < 5) {
      const futureDate = new Date(currentDate);
      futureDate.setDate(currentDate.getDate() + 7);
      
      suggestions.push({
        checkin: currentDate.toISOString().split('T')[0],
        checkout: futureDate.toISOString().split('T')[0],
        nights: 7,
        type: 'after_bookings'
      });
    }
    
    res.json({
      success: true,
      suggestions: suggestions,
      current_bookings: bookings.length
    });
    
  } catch (error) {
    console.error('Error getting suggested dates:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting suggested dates',
      error: error.message
    });
  }
});

// Middleware để validate booking trước khi tạo
app.use('/payment', async (req, res, next) => {
  try {
    const { room_id, checkin, checkout } = req.query;
    
    if (!room_id || !checkin || !checkout) {
      return next(); // Skip validation if missing params
    }
    
    // Check availability one more time before payment
    const conflictQuery = `
      SELECT COUNT(*) as conflict_count
      FROM bookings 
      WHERE room_type_id = ? 
        AND status IN ('confirmed', 'checked_in', 'completed')
        AND payment_status = 'paid'
        AND (
          (checkin_date < ? AND checkout_date > ?) OR
          (checkin_date < ? AND checkout_date > ?) OR
          (checkin_date >= ? AND checkin_date < ?)
        )
    `;
    
    const result = await db.query(conflictQuery, [
      room_id,
      checkout, checkin,
      checkout, checkout,
      checkin, checkout
    ]);
    
    if (result[0].conflict_count > 0) {
      // Redirect back with error message
      return res.redirect(`/room/${room_id}?error=room_not_available&checkin=${checkin}&checkout=${checkout}`);
    }
    
    next();
    
  } catch (error) {
    console.error('Error in booking validation middleware:', error);
    next();
  }
});