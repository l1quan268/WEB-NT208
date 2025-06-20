<!DOCTYPE html>
<html lang="vi">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>
    <%= room?.type_name %> - Chi tiết phòng
  </title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />

  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script
    src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/js/bootstrap-datepicker.min.js"></script>
  <link rel="stylesheet" href="/details_homestay.css" />
  <!-- Lightbox CSS -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/lightbox2/2.11.3/css/lightbox.min.css" rel="stylesheet" />

  <!-- Lightbox JS -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lightbox2/2.11.3/js/lightbox.min.js"></script>

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />

  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<!-- Flatpickr CSS + JS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>

</head>
<style>
  .suggested-rooms-wrapper {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 0, 10px;
    margin-left: 40px;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);

  }

  .suggested-rooms-wrapper a {
    text-decoration: none;
    color: inherit;
  }

  .suggested-rooms-wrapper a:hover {
    text-decoration: underline;
  }

  .suggested-rooms-wrapper {
    background-color: #fff7e6;
    background: #f3e6dc;
    border-radius: 8px;
    /* padding: 20px; */
    margin-left: 40px;
    box-shadow: 10px 10px 15px rgba(202, 131, 131, 0.1);
    opacity: 1;
  }

  /* Tiêu đề căn giữa */
  .suggested-rooms-wrapper>h5 {
    text-align: center;
    font-weight: bold;
    margin-bottom: 20px;


  }


  .btn-primary {
    background-color: #007bff;
    border-color: #007bff;
  }

  */
</style>

<body>
  <!-- Giữ nguyên phần navbar của bạn -->
  <!-- Navbar -->
  <script>
    const isLoggedIn = <%= user ? 'true' : 'false' %>;
  </script>
  <nav class="navbar navbar-expand-lg navbar-light bg-light" style="
        width: 100%;
        opacity: 80%;
        position: fixed;
        z-index: 1000;
        top: 0;
        left: 0;
      ">
    <!-- Logo bên trái -->
    <a class="navbar-brand" href="/">
      <img src="/image/image/logo/logo.jpg" alt="Logo" style="
            margin: 0px;
            padding: 0px;
            width: 100px;
            height: 100px;
            position: absolute;
            margin-top: -50px;
            margin-left: 70px;
          " class="logo" />
    </a>
    <div class="container kt">
      <!-- Nút Toggle khi màn hình nhỏ -->
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- Danh mục menu (Căn giữa) -->
      <div class="collapse navbar-collapse justify-content-center" id="navbarNav" style="margin-left: 50px">
        <ul class="navbar-nav">
          <li class="nav-item">
            <a class="nav-link" href="/" style="font-weight: bold">TRANG CHỦ</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/#intro" style="font-weight: bold">GIỚI THIỆU</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/#CH" style="font-weight: bold">CĂN HỘ</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#LH" style="font-weight: bold">LIÊN HỆ</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/danh-gia" style="font-weight: bold">ĐÁNH GIÁ</a>
          </li>
        </ul>
      </div>

      <!-- Nút Đăng nhập/Đăng xuất (Bên phải) -->
      <% if (user) { %>
        <div class="dropdown">
          <button class="btn p-0 border-0 bg-transparent" type="button" id="userDropdown" data-bs-toggle="dropdown"
            aria-expanded="false">
            <img src="https://i.postimg.cc/rF3Fh10Y/avatar-trang-4.jpg" alt="Avatar" class="rounded-circle" width="40"
              height="40" />
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow" aria-labelledby="userDropdown">
            <li>
              <span class="dropdown-item text-primary fw-bold">
                <%= user.email %>
              </span>
            </li>
            <li>
              <a class="dropdown-item" href="/account">Thông tin tài khoản</a>
            </li>
            <li>
              <a class="dropdown-item" href="/bookings">Lịch sử đặt phòng</a>
            </li>
            <li>
              <hr class="dropdown-divider" />
            </li>
            <li>
              <a class="dropdown-item text-danger" href="/logout">Đăng xuất</a>
            </li>
          </ul>
        </div>
        <% } else { %>
          <button class="btn btn-primary" onclick="window.location.href='/login'" style="background-color: white;">
            ĐĂNG NHẬP
          </button>
          <% } %>
    </div>
  </nav>

  <div class="product-info-container container my-5" style="padding-top: 0.5px">
    <div class="container">
      <div class="breadcrumb mt-5 mb-3">
        <a href="/" class="breadcrumb-link">Trang chủ</a> /
        <a href="/#CH" class="breadcrumb-link">Căn hộ</a> /
        <span class="breadcrumb-current">
          <%= room?.type_name || "Chi tiết phòng" %>
        </span>
      </div>

    </div>

    <!-- Bố cục ngang: ảnh chính + khung giá phòng -->
    <div class="row align-items-start mb-6">
      <div class="col-md-8">
        <div class="image-gallery">
          <% if (images && images.length> 0) { %>
            <div class="main-image mb-3">
              <a href="<%= images[0].image_url %>" data-lightbox="homestay-gallery" data-title="Ảnh chính">
                <img src="<%= images[0].image_url %>" alt="Ảnh chính" class="img-fluid rounded" />
              </a>
            </div>
            <div class="thumbnail-images d-flex flex-wrap gap-2">
              <% images.slice(1).forEach((img, index)=> { %>
                <a href="<%= img.image_url %>" data-lightbox="homestay-gallery" data-title="Ảnh <%= index + 1 %>">
                  <img src="<%= img.image_url %>" alt="Ảnh phụ" class="img-thumbnail" width="100" />
                </a>
                <% }) %>
            </div>
            <% } %>
        </div>

        <div class="room-info-container mt-4 p-3 rounded shadow-sm bg-white">
          <ul class="list-unstyled room-summary mb-4">
            <li><strong>Địa chỉ:</strong>
              <%= homestay?.address %>
            </li>
            <li><strong>Phòng ngủ:</strong>
              <%= room.bedroom_count %>
            </li>
            <li><strong>Phòng tắm:</strong>
              <%= room.toilet_count %>
            </li>
            <li>
              <strong>Sức chứa:</strong> Tối đa <%= room.max_guests %> người
            </li>
          </ul>

          <p class="room-description mb-4">
            <%= room.description %>
          </p>

          <h4>Tiện nghi:</h4>
          <ul class="amenities list-unstyled mb-4">
            <% services.forEach(s=> { %>
              <li>
                <i class="fas fa-check-circle text-success me-2"></i>
                <%= s.service_name %>
              </li>
              <% }) %>
          </ul>

          <!-- ----------------------------------- -->


          <!-- Đánh giá homestay -->
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h5 class="mb-3">Đánh giá homestay</h5>

            <!-- Form đánh giá -->
            <form id="reviewForm" data-room-id="<%= room?.room_type_id %>">
              <div class="mb-3">
                <label class="form-label">Chọn số sao:</label>
                <div class="star-rating" id="starRating">
                  <i class="fas fa-star" data-value="1"
                    style="font-size: 1.2rem; color: #ddd; cursor: pointer; transition: color 0.2s;"></i>
                  <i class="fas fa-star" data-value="2"
                    style="font-size: 1.2rem; color: #ddd; cursor: pointer; transition: color 0.2s;"></i>
                  <i class="fas fa-star" data-value="3"
                    style="font-size: 1.2rem; color: #ddd; cursor: pointer; transition: color 0.2s;"></i>
                  <i class="fas fa-star" data-value="4"
                    style="font-size: 1.2rem; color: #ddd; cursor: pointer; transition: color 0.2s;"></i>
                  <i class="fas fa-star" data-value="5"
                    style="font-size: 1.2rem; color: #ddd; cursor: pointer; transition: color 0.2s;"></i>
                </div>
              </div>

              <div class="mb-3">
                <textarea class="form-control" id="commentBox" rows="4" placeholder="Nhập bình luận..."
                  style="resize: none;"></textarea>
              </div>

              <button type="submit" class="btn btn-primary">
                Gửi đánh giá
              </button>
            </form>

            <!-- Danh sách đánh giá -->
            <div id="reviewList" class="mt-4">
              <% if (reviews && reviews.length> 0) { %>
                <% reviews.forEach(r=> { %>
                  <div style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px;">
                    <div class="d-flex align-items-center mb-2">
                      <img src="https://i.postimg.cc/N0kXMjb5/avatarreview.jpg" class="rounded-circle me-2" width="40"
                        height="40" />
                      <strong>
                        <%= r.User?.name || "Ẩn danh" %>
                      </strong>
                    </div>
                    <div class="mb-1" style="color: #ffc107;">
                      <% for (let i=1; i <=5; i++) { %>
                        <% if (i <=r.rating) { %>
                          <i class="fas fa-star"></i>
                          <% } else { %>
                            <i class="far fa-star"></i>
                            <% } %>
                              <% } %>
                    </div>
                    <p class="mb-1">
                      <%= r.comment %>
                    </p>
                    <small class="text-muted">Đăng ngày: <%= new Date(r.created_at).toLocaleDateString('vi-VN') %>
                    </small>
                  </div>
                  <% }) %>
                    <% } else { %>
                      <p class="text-muted">Chưa có đánh giá nào.</p>
                      <% } %>
            </div>
          </div>

        </div>
      </div>
      <!-- --------------------------------------------- -->
      <div class="col-md-4 mt-5 mt-md-0">
        <div class="price-table"
          style="background-color: #f3e6dc; padding: 20px; border-radius: 8px; margin-left: 40px;">
          <h4>
            Giá phòng: <%= Number(room.price_per_night).toLocaleString('vi-VN') %> đ / đêm
          </h4>
          <div class="booking-form mt-3">
            <div class="form-group mb-2">
              <label for="adults">Số người lớn:</label>
              <input type="number" id="adults" class="form-control" name="adults" value="1" min="1" max="<%= room.max_adults %>" required />
            </div>
            <div class="form-group mb-2">
              <label for="children">Số trẻ em:</label>
              <input type="number" id="children" class="form-control" name="children" value="0" min="0" max="<%= room.max_children %>" />
            </div>
            <div class="form-group mb-2">
              <label for="checkin">Ngày nhận:</label>
              <input type="text" id="checkin" class="form-control flatpickr" placeholder="Chọn ngày nhận" />
              <small class="form-text text-danger mt-1">
  <i class="fas fa-calendar-times"></i> Những ngày không chọn được là ngày đã có khách đặt.
</small>
            </div>
            <div class="form-group mb-2">
              <label for="checkout">Ngày đi:</label>
              <input type="text" id="checkout" class="form-control flatpickr" placeholder="Chọn ngày đi" />
            </div>

            <!-- ✅ Updated form với adults và children -->
            <form action="/payment" method="GET" id="bookingForm">
              <input type="hidden" name="room_id" value="<%= room.room_type_id %>" />
              <input type="hidden" name="checkin" id="hiddenCheckin" />
              <input type="hidden" name="checkout" id="hiddenCheckout" />
              <input type="hidden" name="adults" id="hiddenAdults" />
              <input type="hidden" name="children" id="hiddenChildren" />
              <button type="submit" class="btn btn-dark w-100 mt-2">Đặt ngay</button>
            </form>
          </div>
        </div>
        <% const suggRooms=(typeof suggestedRooms !=='undefined' && Array.isArray(suggestedRooms) &&
          suggestedRooms.length> 0)
          ? suggestedRooms.map(room => {
          let thumb = room.thumbnail || 'https://via.placeholder.com/150';

          // Nếu thumbnail không bắt đầu bằng http hoặc / thì thêm tiền tố /uploads/
          if (!thumb.startsWith('http') && !thumb.startsWith('/')) {
          thumb = '/uploads/' + thumb;
          }

          return {
          ...room,
          thumbnail: thumb,
          price_per_night: room.price_per_night || (Math.floor(Math.random() * 500000) + 200000)
          };
          })
          : [
          { room_type_id: 1, type_name: "Phòng mẫu 1", price_per_night: 300000, thumbnail:
          "https://via.placeholder.com/150" },
          { room_type_id: 2, type_name: "Phòng mẫu 2", price_per_night: 450000, thumbnail:
          "https://via.placeholder.com/150" },
          { room_type_id: 3, type_name: "Phòng mẫu 3", price_per_night: 500000, thumbnail:
          "https://via.placeholder.com/150" }
          ];
          %>

          <div class="container mt-5">
            <div class="suggested-rooms-wrapper p-4 rounded shadow-sm ">
              <h5 class="mb-4">Gợi ý các phòng khác </h5>
              <div class="d-flex gap-4 flex-wrap justify-content-center">
                <% suggRooms.forEach(function(sroom) { %>
                  <div class="card" style="width: 18rem; cursor: pointer;">
                    <a href="/room/<%= sroom.slug %>">
                      <img src="<%= sroom.thumbnail %>" class="card-img-top" alt="<%= sroom.type_name %>"
                        style="height: 140px; object-fit: cover;" />
                    </a>
                    <div class="card-body p-3">
                      <h6 class="card-title">
                        <%= sroom.type_name %>
                      </h6>
                      <p class="card-text" style="font-size: 0.95rem; color: #444;">
                        Giá: <%= Number(sroom.price_per_night).toLocaleString('vi-VN') %> đ/đêm
                      </p>
                    </div>
                  </div>
                  <% }) %>
              </div>
            </div>

          </div>

      </div>

      <!-- ----------------------------------- -->
    </div>
    <!-- Đóng row -->
  </div>
  <!-- Đóng product-info-container -->

  <!-- Footer -->
  <footer class="bg-light py-4" style="width: 100%" id="LH" style="margin-left: 0">
    <div class="container" style="margin-top: 20px">
      <div class="row">
        <!-- Cột Liên Hệ -->
        <div class="col-md-4">
          <h5 class="fw-bold">LIÊN HỆ CHÚNG TÔI</h5>

          <p>
            <i class="fas fa-envelope" style="color: #9d972d"></i> Email: 23521265@gm.uit.edu.vn
          </p>
          <p><i class="fas fa-phone" style="color: #28a745"></i></i> Số điện thoại: 080-678-963-210</p>
          <p>
            <i class="fas fa-map-marker-alt" style="color: #dc3545"></i> Địa chỉ: 183B/19, quận Cam,
            thành phố Sài Gòn
          </p>
        </div>

        <!-- Cột Mạng Xã Hội -->
        <div class="col-md-4 text-left">
          <h5 class="fw-bold">MẠNG XÃ HỘI</h5>
          <a href="https://www.instagram.com" target="_blank" class="d-block text-decoration-none text-dark mb-2">
            <i class="fab fa-instagram" style="
                  background: linear-gradient(
                    to right,
                    #f09433 0%,
                    #e6683c 25%,
                    #dc2743 50%,
                    #cc2366 75%,
                    #bc1888 100%
                  );
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                "></i> Instagram
          </a>
          <a href="https://www.facebook.com" target="_blank" class="d-block text-decoration-none text-dark mb-2">
            <i class="fab fa-facebook" style="color: #1877f2"></i> Facebook
          </a>
          <a href="https://www.youtube.com" target="_blank" class="d-block text-decoration-none text-dark mb-2">
            <i class="fab fa-youtube" style="color: #ff0000"></i> Youtube
          </a>
          <a href="https://www.twitter.com" target="_blank" class="d-block text-decoration-none text-dark mb-2">
            <i class="fab fa-twitter" style="color: #000000"></i> Twitter
          </a>
        </div>

        <!-- Cột Bản Đồ -->
        <div class="col-md-4">
          <h5 class="fw-bold">MAPS</h5>
          <iframe src="https://www.google.com/maps?q=Vũng+Tàu&output=embed" width="100%" height="150" style="border: 0"
            allowfullscreen="" loading="lazy">
          </iframe>
        </div>
      </div>
    </div>
  </footer>
  <script>
  document.getElementById('bookingForm').addEventListener('submit', function (e) {
    if (!isLoggedIn) {
      e.preventDefault();
      Swal.fire({
        icon: 'info',
        title: 'Bạn cần đăng nhập',
        text: 'Vui lòng đăng nhập để tiếp tục đặt phòng!',
        confirmButtonText: 'Đăng nhập'
      }).then(() => {
        window.location.href = '/login';
      });
      return false;
    }
  });
</script>

  <div class="text-center mt-3">
    <p class="mb-0">© 2025 - All Rights Reserved</p>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

  <!-- ----------------------------------- -->
  <!-- script cho đánh giá  -->
   
<script>
  function formatDateVN(dateStr) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
  // 🔥 THÊM BIẾN GLOBAL CHO CALENDAR
  let bookedDates = [];
  const roomId = '<%= room.room_type_id %>';

  // 🔥 LOAD BOOKED DATES KHI TRANG TẢI
  document.addEventListener('DOMContentLoaded', function () {
    loadBookedDates();
    updateStars();
    setupFormHandlers();
  });

  // 🔥 FUNCTION LOAD NGÀY ĐÃ ĐẶT TỪ SERVER
  function loadBookedDates() {
    // Tạo API endpoint giả (bạn cần tạo API này)
    fetch(`/api/room/${roomId}/booked-dates`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          bookedDates = data.bookedDates || [];
      console.log("📅 Booked dates: ", bookedDates); // DEBUG
          flatpickr(".flatpickr", {
      dateFormat: "Y-m-d",
      disable: bookedDates, // không cho chọn
      locale: "vn",
      onDayCreate: function(dObj, dStr, fp, dayElem) {
  const dateStr = dayElem.dateObj.toISOString().split('T')[0];

  // Nếu là ngày đã được đặt
  if (bookedDates.includes(dateStr)) {
    // Kiểm tra nếu NGÀY SAU đó không nằm trong bookedDates => đây là ngày CUỐI (checkout) => KHÔNG tô đỏ
    const nextDate = new Date(dayElem.dateObj);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    // Chỉ tô đỏ nếu NGÀY TIẾP THEO cũng là ngày đã được đặt (=> không phải ngày checkout)
    if (bookedDates.includes(nextDateStr)) {
      dayElem.style.color = 'white';
      dayElem.style.borderRadius = '50%';
    }
  }
}


    });
    
          console.log('📅 Loaded booked dates:', bookedDates);
          setupDateValidation();
        } else {
          console.warn('Could not load booked dates, using empty array');
          bookedDates = [];
          setupDateValidation();
        }
      })
      .catch(error => {
        console.warn('Error loading booked dates:', error);
        // Fallback: hardcode một số ngày để test
        bookedDates = [
          '2025-06-15',
          '2025-06-16', 
          '2025-06-20',
          '2025-06-21',
          '2025-06-25'
        ];
        setupDateValidation();
      });
  }

  //--------------------------------
  // 🔥 SETUP DATE VALIDATION VÀ DISABLE DATES
  function setupDateValidation() {
    const checkinInput = document.getElementById("checkin");
    const checkoutInput = document.getElementById("checkout");

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    checkinInput.min = today;

    // 🔥 STYLE CHO NGÀY BỊ DISABLE
    const style = document.createElement('style');
    style.textContent = `
      input[type="date"]::-webkit-calendar-picker-indicator {
        background: transparent;
        bottom: 0;
        color: transparent;
        cursor: pointer;
        height: auto;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
        width: auto;
      }
      
      /* Tạo overlay để hiển thị ngày disabled */
      .date-input-container {
        position: relative;
      }
      
      .disabled-dates-info {
        font-size: 0.8em;
        color: #dc3545;
        margin-top: 5px;
      }
    `;
    document.head.appendChild(style);
        // 🔥 THÊM THÔNG BÁO NGÀY BỊ DISABLE
    const checkinContainer = checkinInput.parentNode;
    const checkoutContainer = checkoutInput.parentNode;
    
    checkinContainer.classList.add('date-input-container');
    checkoutContainer.classList.add('date-input-container');

    const disabledInfo = document.createElement('div');
    disabledInfo.className = 'disabled-dates-info';

    checkoutContainer.appendChild(disabledInfo);

    // 🔥 VALIDATION CHO CHECKIN
    checkinInput.addEventListener('change', function () {
      const selectedDate = this.value;
      
      // Kiểm tra nếu ngày được chọn nằm trong danh sách đã đặt
      if (bookedDates.includes(selectedDate)) {
  // 🔥 Tìm khoảng bắt đầu - kết thúc chứa selectedDate
  let conflictStart = selectedDate;
  let conflictEnd = selectedDate;

  const sorted = [...bookedDates].sort();
  const index = sorted.indexOf(selectedDate);

  // Lùi về trước nếu các ngày liên tiếp
  for (let i = index - 1; i >= 0; i--) {
    const prev = new Date(sorted[i]);
    const curr = new Date(conflictStart);
    prev.setDate(prev.getDate() + 1);
    if (prev.toISOString().split('T')[0] === curr.toISOString().split('T')[0]) {
      conflictStart = sorted[i];
    } else break;
  }

  // Tiến về sau nếu các ngày liên tiếp
  for (let i = index + 1; i < sorted.length; i++) {
    const next = new Date(sorted[i]);
    const curr = new Date(conflictEnd);
    curr.setDate(curr.getDate() + 1);
    if (next.toISOString().split('T')[0] === curr.toISOString().split('T')[0]) {
      conflictEnd = sorted[i];
    } else break;
  }

  function formatDateVN(dateStr) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

Swal.fire({
  icon: 'warning',
  title: 'Ngày không khả dụng',
  html: `
    Ngày này đã được đặt từ <strong>${formatDateVN(conflictStart)}</strong> đến <strong>${formatDateVN(conflictEnd)}</strong>.<br>
    Vui lòng chọn khoảng thời gian khác.
  `,
  timer: 5000,
  showConfirmButton: false
});

  this.value = ''; // Clear
  return;
}


      const checkinDate = new Date(selectedDate);
      const minCheckout = new Date(checkinDate);
      minCheckout.setDate(minCheckout.getDate() + 1);
      checkoutInput.min = minCheckout.toISOString().split('T')[0];

      // Auto-update checkout if it's invalid
      if (checkoutInput.value && checkoutInput.value <= selectedDate) {
        checkoutInput.value = minCheckout.toISOString().split('T')[0];
      }
    });
        // 🔥 VALIDATION CHO CHECKOUT
    checkoutInput.addEventListener('change', function () {
      const checkinDate = checkinInput.value;
      const checkoutDate = this.value;
      
      if (!checkinDate) {
        Swal.fire({
          icon: 'info',
          title: 'Chọn ngày nhận trước',
          text: 'Vui lòng chọn ngày nhận phòng trước.',
          timer: 2000,
          showConfirmButton: false
        });
        this.value = '';
        return;
      }

      // 🔥 KIỂM TRA RANGE CÓ CHỨA NGÀY ĐÃ ĐẶT KHÔNG
      if (hasBookedDatesInRange(checkinDate, checkoutDate)) {
        Swal.fire({
          icon: 'error',
          title: 'Khoảng thời gian không hợp lệ',
          text: 'Khoảng thời gian bạn chọn có chứa ngày đã được đặt. Vui lòng chọn lại.',
          timer: 4000,
          showConfirmButton: false
        });
        this.value = '';
        return;
      }
            // Kiểm tra checkout sau checkin
      if (checkoutDate <= checkinDate) {
        Swal.fire({
          icon: 'warning',
          title: 'Ngày không hợp lệ',
          text: 'Ngày trả phòng phải sau ngày nhận phòng.',
          timer: 2000,
          showConfirmButton: false
        });
        this.value = '';
        return;
      }
    });
  }

// Enhanced error handling for edge cases
window.addEventListener('beforeunload', function(e) {
  // Clear any pending API requests when user leaves page
  if (window.pendingBookingCheck) {
    window.pendingBookingCheck.abort();
  }
});

// Show booking tips on page load
setTimeout(function() {
  if (!localStorage.getItem('booking_tips_shown')) {
    Swal.fire({
      icon: 'info',
      title: 'Mẹo đặt phòng',
      html: `
        <div style="text-align: left;">
          <p><i class="fas fa-calendar-check text-primary me-2"></i><strong>Lịch đỏ:</strong> Ngày đã có khách đặt</p>
          <p><i class="fas fa-calendar-plus text-success me-2"></i><strong>Lịch xanh:</strong> Ngày có thể đặt</p>
          <p><i class="fas fa-lightbulb text-warning me-2"></i><strong>Gợi ý:</strong> Hệ thống sẽ đề xuất ngày phù hợp</p>
        </div>
      `,
      confirmButtonText: 'Đã hiểu',
      timer: 8000
    });
    
    localStorage.setItem('booking_tips_shown', 'true');
  }
}, 2000);
//--------------------------------

  // 🔥 FUNCTION KIỂM TRA RANGE CÓ CHỨA NGÀY ĐÃ ĐẶT
  function hasBookedDatesInRange(checkinDate, checkoutDate) {
    const startDate = new Date(checkinDate);
    const endDate = new Date(checkoutDate);
    
    // Lặp qua từng ngày trong range
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (bookedDates.includes(dateStr)) {
        console.log('❌ Found booked date in range:', dateStr);
        return true;
      }
    }
    return false;
  }
  // 🔥 FUNCTION LẤY DANH SÁCH CÁC NGÀY TRÙNG
function getConflictedDatesInRange(checkinDate, checkoutDate) {
  const startDate = new Date(checkinDate);
  const endDate = new Date(checkoutDate);
  const conflicts = [];

  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    if (bookedDates.includes(dateStr)) {
      conflicts.push(dateStr);
    }
  }

  return conflicts;
}

  // 🔥 SETUP FORM HANDLERS (CODE CŨ)
  function setupFormHandlers() {
    const form = document.getElementById('bookingForm');
    const checkinInput = document.getElementById("checkin");
    const checkoutInput = document.getElementById("checkout");
    const adultsInput = document.getElementById("adults");
    const childrenInput = document.getElementById("children");

    form.addEventListener("submit", (e) => {
      // Validate required fields
      if (!checkinInput.value || !checkoutInput.value) {
        e.preventDefault();
        Swal.fire({
          icon: 'warning',
          title: 'Thiếu thông tin',
          text: 'Vui lòng chọn ngày nhận và ngày đi.',
          timer: 2500,
          showConfirmButton: false
        });
        return;
      }

      const adults = parseInt(adultsInput.value) || 1;
      const children = parseInt(childrenInput.value) || 0;

      // Basic validation
      if (adults < 1) {
        e.preventDefault();
        Swal.fire({
          icon: 'warning',
          title: 'Lỗi nhập liệu',
          text: 'Số người lớn phải ít nhất là 1.',
          timer: 2500,
          showConfirmButton: false
        });
        return;
      }

      if (adults + children > 15) {
        e.preventDefault();
        Swal.fire({
          icon: 'warning',
          title: 'Quá số lượng',
          text: 'Tổng số khách không được vượt quá 15 người.',
          timer: 2500,
          showConfirmButton: false
        });
        return;
      }

      // 🔥 KIỂM TRA LẠI RANGE TRƯỚC KHI SUBMIT
      const conflicts = getConflictedDatesInRange(checkinInput.value, checkoutInput.value);
if (conflicts.length > 0) {
  e.preventDefault();

  const from = conflicts[0];
  const to = conflicts[conflicts.length - 1];

  Swal.fire({
    icon: 'error',
    title: 'Khoảng thời gian đã được đặt',
    html: `
      <p>Phòng đã có người đặt từ <strong>${from}</strong> đến <strong>${to}</strong>.</p>
      <p>Vui lòng chọn thời gian khác!</p>
    `,
    confirmButtonText: 'OK'
  });

  return;
}


      // Set hidden values
      document.getElementById("hiddenCheckin").value = checkinInput.value;
      document.getElementById("hiddenCheckout").value = checkoutInput.value;
      document.getElementById("hiddenAdults").value = adults;
      document.getElementById("hiddenChildren").value = children;

      console.log("Booking data being sent:", {
        room_id: roomId,
        checkin: checkinInput.value,
        checkout: checkoutInput.value,
        adults: adults,
        children: children
      });
    });
  }

  // ---- CODE CŨ CHO REVIEW SYSTEM (GIỮ NGUYÊN) ----

  // Xử lý chọn sao
  const stars = document.querySelectorAll('#starRating i');
  let selectedRating = 0;

  stars.forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.getAttribute('data-value'));
      updateStars();
    });

    star.addEventListener('mouseover', () => {
      const value = parseInt(star.getAttribute('data-value'));
      highlightStars(value);
    });
  });

  document.getElementById('starRating').addEventListener('mouseleave', () => {
    updateStars();
  });

  function updateStars() {
    stars.forEach((star, index) => {
      if (index < selectedRating) {
        star.style.color = '#ffc107';
      } else {
        star.style.color = '#ddd';
      }
    });
  }

  function highlightStars(rating) {
    stars.forEach((star, index) => {
      if (index < rating) {
        star.style.color = '#ffc107';
      } else {
        star.style.color = '#ddd';
      }
    });
  }

  // Xử lý submit form review
  const reviewForm = document.getElementById('reviewForm');
  reviewForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const comment = document.getElementById('commentBox').value.trim();

    if (selectedRating === 0) {
      Swal.fire({
        icon: 'info',
        text: 'Vui lòng chọn số sao đánh giá.',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    if (!comment) {
      Swal.fire({
        icon: 'info',
        text: 'Vui lòng nhập bình luận.',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    const roomTypeId = reviewForm.getAttribute('data-room-id');

    if (!roomTypeId) {
      Swal.fire({
        icon: 'info',
        text: 'Không tìm thấy thông tin phòng.',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    const data = {
      rating: selectedRating,
      comment: comment,
      room_type_id: roomTypeId
    };

    console.log('Sending data:', data);

    const submitBtn = reviewForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gửi...';

    fetch('/api/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      credentials: 'include'
    })
      .then(res => {
        if (res.status === 401) {
          Swal.fire({
            icon: 'info',
            title: 'Bạn chưa đăng nhập',
            text: 'Vui lòng đăng nhập để gửi đánh giá.',
            confirmButtonText: 'Đăng nhập'
          }).then(() => {
            window.location.href = '/login';
          });
          throw new Error('Unauthorized - Cần đăng nhập');
        }

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(result => {
        console.log('Response:', result);
        if (result.success) {
          Swal.fire({
            icon: 'success',
            text: 'Gửi đánh giá thành công.',
            timer: 2000,
            showConfirmButton: false
          });
          addReviewToList(result.review);
          resetForm();
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'Error',
            text: 'Gửi đánh giá thất bại.',
            timer: 2000,
            showConfirmButton: false
          });
        }
      })
      .catch(err => {
        console.error('Error:', err);

        if (err.message.includes('Unauthorized')) {
          return;
        }

        if (err.message.includes('status: 400')) {
          Swal.fire({
            icon: 'warning',
            title: 'Error',
            text: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin đánh giá.',
            timer: 2000,
            showConfirmButton: false
          });
        } else if (err.message.includes('status: 500')) {
          Swal.fire({
            icon: 'warning',
            title: 'Error',
            text: 'Có lỗi xảy ra từ phía máy chủ. Vui lòng thử lại sau.',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'Error',
            text: 'Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại sau.',
            timer: 2000,
            showConfirmButton: false
          });
        }
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Gửi đánh giá';
      });
  });

  function resetForm() {
    reviewForm.reset();
    selectedRating = 0;
    updateStars();
  }

  function addReviewToList(review) {
    const reviewList = document.getElementById('reviewList');
    const reviewHTML = `
      <div style="border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 15px;">
          <div class="d-flex align-items-center mb-2">
              <img src="https://i.postimg.cc/N0kXMjb5/avatarreview.jpg" 
                   class="rounded-circle me-2" width="40" height="40" />
              <strong>${review.name || 'Ẩn danh'}</strong>
          </div>
          <div class="mb-1" style="color: #ffc107;">
              ${renderStars(review.rating)}
          </div>
          <p class="mb-1">${review.comment}</p>
          <small class="text-muted">Đăng ngày: ${new Date().toLocaleDateString('vi-VN')}</small>
      </div>
  `;
    reviewList.insertAdjacentHTML('afterbegin', reviewHTML);
  }

  function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += i <= rating
        ? '<i class="fas fa-star"></i>'
        : '<i class="far fa-star"></i>';
    }
    return stars;
  }
</script>


<script>
// Thay thế script validation hiện tại bằng code này
document.addEventListener('DOMContentLoaded', function() {
  const maxAdults = <%= room.max_adults %>;
  const maxChildren = <%= room.max_children %>;
  const maxGuests = <%= room.max_guests %>;
  
  const adultsInput = document.getElementById('adults');
  const childrenInput = document.getElementById('children');
  const checkinInput = document.getElementById('checkin');
  const checkoutInput = document.getElementById('checkout');
  
  // Tạo element hiển thị thông báo lỗi
  function createErrorMessage(inputElement, message) {
    // Xóa thông báo lỗi cũ nếu có
    const existingError = inputElement.parentNode.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    // Tạo thông báo lỗi mới
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 5px;
      padding: 5px;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      display: flex;
      align-items: center;
    `;
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>${message}`;
    
    inputElement.parentNode.appendChild(errorDiv);
    
    // Disable các input khác
    disableOtherInputs();
    
    // Auto remove sau 5 giây
    setTimeout(() => {
      if (errorDiv && errorDiv.parentNode) {
        errorDiv.remove();
        checkAllValidation();
      }
    }, 5000);
  }
  
  // Xóa thông báo lỗi
  function removeErrorMessage(inputElement) {
    const errorDiv = inputElement.parentNode.querySelector('.error-message');
    if (errorDiv) {
      errorDiv.remove();
    }
  }
  
  // Disable/Enable các input khác
  function disableOtherInputs() {
    const hasError = document.querySelectorAll('.error-message').length > 0;
    checkinInput.disabled = hasError;
    checkoutInput.disabled = hasError;
    
    if (hasError) {
      checkinInput.style.backgroundColor = '#f8f9fa';
      checkoutInput.style.backgroundColor = '#f8f9fa';
    } else {
      checkinInput.style.backgroundColor = '';
      checkoutInput.style.backgroundColor = '';
    }
  }
  
  // Kiểm tra tất cả validation
  function checkAllValidation() {
    const adults = parseInt(adultsInput.value) || 0;
    const children = parseInt(childrenInput.value) || 0;
    
    // Reset tất cả error messages
    removeErrorMessage(adultsInput);
    removeErrorMessage(childrenInput);
    
    let hasError = false;
    
    // Validate adults
    if (adults > maxAdults) {
      createErrorMessage(adultsInput, `Số người lớn tối đa là ${maxAdults} người. Vui lòng nhập lại!`);
      adultsInput.focus();
      hasError = true;
    } else if (adults < 1) {
      createErrorMessage(adultsInput, 'Cần ít nhất 1 người lớn!');
      adultsInput.focus();
      hasError = true;
    }
    
    // Validate children
    if (children > maxChildren) {
      createErrorMessage(childrenInput, `Số trẻ em tối đa là ${maxChildren} em. Vui lòng nhập lại!`);
      if (!hasError) childrenInput.focus();
      hasError = true;
    }
    
    // Validate total guests
    if (!hasError && (adults + children) > maxGuests) {
      createErrorMessage(childrenInput, `Tổng số khách tối đa là ${maxGuests} người (${adults + children} > ${maxGuests}). Vui lòng giảm số lượng!`);
      childrenInput.focus();
      hasError = true;
    }
    
    disableOtherInputs();
    
    return !hasError;
  }
  
  // Event listeners cho real-time validation
  adultsInput.addEventListener('input', function() {
    // Delay validation một chút để user có thể gõ số
    setTimeout(checkAllValidation, 300);
  });
  
  adultsInput.addEventListener('blur', function() {
    checkAllValidation();
  });
  
  childrenInput.addEventListener('input', function() {
    setTimeout(checkAllValidation, 300);
  });
  
  childrenInput.addEventListener('blur', function() {
    checkAllValidation();
  });
  
  // Validation khi submit form
  const bookingForm = document.getElementById('bookingForm');
  bookingForm.addEventListener('submit', function(e) {
    if (!checkAllValidation()) {
      e.preventDefault();
      Swal.fire({
        icon: 'error',
        title: 'Thông tin không hợp lệ',
        text: 'Vui lòng kiểm tra lại số lượng khách trước khi đặt phòng.',
        timer: 3000,
        showConfirmButton: false
      });
      return false;
    }
    
    const checkin = checkinInput.value;
    const checkout = checkoutInput.value;
    
    if (!checkin || !checkout) {
      e.preventDefault();
      Swal.fire({
        icon: 'warning',
        title: 'Thiếu thông tin',
        text: 'Vui lòng chọn ngày nhận và ngày đi.',
        timer: 2500,
        showConfirmButton: false
      });
      return false;
    }
    
    // Gán giá trị vào hidden inputs
    const adults = parseInt(adultsInput.value) || 1;
    const children = parseInt(childrenInput.value) || 0;
    
    document.getElementById('hiddenAdults').value = adults;
    document.getElementById('hiddenChildren').value = children;
    document.getElementById('hiddenCheckin').value = checkin;
    document.getElementById('hiddenCheckout').value = checkout;
    
    console.log("Booking data:", {
      room_id: '<%= room.room_type_id %>',
      adults: adults,
      children: children,
      checkin: checkin,
      checkout: checkout
    });
  });
  
  // Initial validation khi trang load
  setTimeout(checkAllValidation, 500);
});
</script>

  <!-- ----------------------------------- -->
</body>

</html>