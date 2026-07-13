export const th = {
  // Common
  loading: "กำลังโหลด...",
  error: "เกิดข้อผิดพลาด",
  save: "บันทึก",
  cancel: "ยกเลิก",
  confirm: "ยืนยัน",
  login: "เข้าสู่ระบบ",
  register: "สมัครสมาชิก",
  logout: "ออกจากระบบ",
  
  // Navbar
  nav: {
    home: "หน้าแรก",
    search: "ค้นหา",
    shop: "ร้านค้า",
    topup: "เติมเหรียญ",
    library: "บันทึก",
    contact: "ติดต่อเรา",
    inventory: "คลังไอเทม"
  },
  
  // Profile
  profile: {
    member: "สมาชิก",
  },
  
  // Home
  home: {
    update_daily: "แพลตฟอร์มสำหรับนักอ่านและนักวาด",
    hero_title_1: "จักรวาลของคนรักการ์ตูน",
    hero_title_2: "และนักวาดอิสระ",
    hero_desc: "แหล่งรวมมังงะ นิยาย และคอมมิคคุณภาพ อ่านฟรี ไม่มีสะดุด พร้อมระบบสนับสนุนผลงานจากนักวาดที่คุณชื่นชอบโดยตรง",
    start_reading: "เริ่มอ่านเลย",
    topup: "เติมเหรียญ",
    new_update: "Webtoon อัปเดตใหม่",
    view_all: "ดูทั้งหมด",
    no_data: "ไม่พบข้อมูลจากระบบ Backend"
  },
  
  // Auth
  auth: {
    welcome_back: "ยินดีต้อนรับกลับมา",
    login_desc: "เข้าสู่ระบบเพื่ออ่านการ์ตูนเรื่องโปรดต่อ",
    email: "อีเมล",
    password: "รหัสผ่าน",
    forgot_password: "ลืมรหัสผ่าน?",
    login_btn: "เข้าสู่ระบบ",
    or: "หรือ",
    login_google: "เข้าสู่ระบบด้วย Google",
    no_account: "ยังไม่มีบัญชีใช่ไหม?",
    register_link: "สมัครสมาชิก",
    error_invalid: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    error_general: "เกิดข้อผิดพลาด: ",
    google_failed: "เข้าสู่ระบบด้วย Google ล้มเหลว",
    password_mismatch: "รหัสผ่านไม่ตรงกัน",
    password_length: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
    email_in_use: "อีเมลนี้ถูกใช้งานแล้ว",
    register_title: "สมัครสมาชิกใหม่",
    register_desc: "เข้าร่วมเป็นส่วนหนึ่งของ ReadChill",
    confirm_password: "ยืนยันรหัสผ่าน",
    name: "ชื่อที่แสดง",
    have_account: "มีบัญชีอยู่แล้ว?",
    login_link: "เข้าสู่ระบบ",
    error_not_found: "ไม่พบบัญชีที่ใช้อีเมลนี้",
    forgot_desc: "กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน",
    reset_sent: "ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมายของคุณ",
    back_login: "กลับไปหน้าเข้าสู่ระบบ",
    send_reset: "ส่งลิงก์รีเซ็ตรหัสผ่าน"
  },
  
  // Topup
  topup: {
    title: "เติมเหรียญ (Topup)",
    balance: "ยอดเหรียญคงเหลือของคุณ",
    coins: "Coins",
    tab_topup: "เติมเงิน",
    tab_history: "ประวัติการเติม",
    select_package: "เลือกแพ็กเกจ",
    price: "ราคา {amount} บาท",
    bonus: "แถม {percent}%",
    custom_amount: "หรือระบุจำนวนเงินเอง (ขั้นต่ำ 3 บาท)",
    placeholder: "กรอกจำนวนเงิน",
    min_amount: "ขั้นต่ำ 3 บาท",
    will_receive: "จะได้รับ {amount} Coins",
    bonus_plus: "(โบนัส +{amount})",
    pay_btn: "ชำระเงิน {amount} บาท",
    qr_title: "สแกน QR Code เพื่อชำระเงิน",
    qr_desc: "ยอดชำระ {baht} บาท (รับ {coins} Coins)",
    qr_mock: "QR Code PromtPay\n(จำลอง)",
    save_slip: "บันทึกรูปและแนบสลิป",
    cancel: "ยกเลิก",
    upload_title: "แนบสลิปโอนเงิน (Slipok)",
    upload_desc: "ยอดชำระ {amount} บาท",
    click_upload: "คลิกเพื่ออัปโหลดสลิป",
    drag_upload: "หรือลากไฟล์มาวางที่นี่ (จำลอง: กดเพื่อผ่าน)",
    back: "ย้อนกลับ",
    success_title: "เติมเหรียญสำเร็จ!",
    success_desc: "คุณได้รับ {amount} Coins เข้าสู่บัญชีเรียบร้อยแล้ว",
    new_transaction: "ทำรายการใหม่",
    no_history: "ยังไม่มีประวัติการเติมเงิน",
    no_history_desc: "ประวัติการทำรายการของคุณจะแสดงที่นี่"
  },
  
  // Library
  library: {
    title: "บันทึก",
    desc: "จัดการประวัติการอ่านและการ์ตูนเรื่องโปรด",
    tab_history: "ประวัติการอ่าน",
    tab_saved: "เรื่องที่บันทึกไว้",
    tab_unlocked: "ตอนที่ปลดล็อกแล้ว",
    read_progress: "อ่านไปแล้ว {percent}%",
    no_saved: "ยังไม่มีการ์ตูนที่บันทึกไว้",
    no_saved_desc: "ค้นหาการ์ตูนที่คุณชอบแล้วกดไอคอนบุ๊กมาร์กเพื่อเก็บไว้อ่านทีหลัง",
    go_read: "ไปหาการ์ตูนอ่านกัน",
    col_title: "เรื่อง / ชื่อตอน",
    col_price: "ราคาที่จ่าย",
    col_date: "วันที่ปลดล็อก",
    col_action: "การกระทำ",
    read_again: "อ่านซ้ำ"
  },
  
  // Inventory
  inventory: {
    login_required: "กรุณาเข้าสู่ระบบ",
    login_desc: "คุณต้องเข้าสู่ระบบก่อนเพื่อดูคลังไอเทมของคุณ",
    title: "คลังไอเทมของฉัน",
    desc: "สติกเกอร์และกรอบรูปโปรไฟล์ที่คุณครอบครอง",
    tab_sticker: "สติกเกอร์",
    tab_frame: "กรอบรูป",
    empty_title: "คุณยังไม่มีไอเทมในหมวดหมู่นี้",
    empty_desc: "ไปที่ร้านค้าเพื่อเลือกซื้อสติกเกอร์และกรอบรูปโปรไฟล์สวยๆ ได้เลย",
    go_shop: "ไปยังร้านค้า",
    equipping: "กำลังใส่...",
    equip: "ใช้งานกรอบรูปนี้",
    unequip: "ถอดกรอบรูป",
    ready_to_use: "พร้อมใช้งานในคอมเมนต์",
    in_use: "ใช้งานอยู่",
    error_equip: "เกิดข้อผิดพลาดในการใส่กรอบรูป"
  },
  
  // Shop
  shop: {
    title: "ร้านค้าสติกเกอร์ & กรอบรูป",
    desc: "เพิ่มสีสันให้โปรไฟล์และคอมเมนต์ของคุณ พร้อมสนับสนุนนักวาด!",
    your_coins: "เหรียญของคุณ",
    topup: "เติมเหรียญ",
    tab_all: "หน้าแรก (ทั้งหมด)",
    tab_sticker: "สติกเกอร์",
    tab_frame: "กรอบรูปโปรไฟล์",
    loading: "กำลังโหลดสินค้า...",
    empty: "ยังไม่มีสินค้าในหมวดหมู่นี้",
    owned_badge: "มีแล้ว",
    owned_btn: "เป็นเจ้าของแล้ว",
    in_use: "ใช้งานอยู่",
    equipping: "กำลังใส่...",
    equip_btn: "ใช้งานกรอบรูป",
    buying: "กำลังซื้อ...",
    buy_login_required: "กรุณาเข้าสู่ระบบก่อนซื้อสินค้า",
    buy_not_enough_coins: "เหรียญของคุณไม่เพียงพอ กรุณาเติมเหรียญ",
    buy_confirm: 'ยืนยันการซื้อ "{name}" ในราคา {price} เหรียญ?',
    buy_success: "สั่งซื้อสำเร็จ! คุณสามารถใช้งานได้ทันที",
    buy_error: "เกิดข้อผิดพลาดในการซื้อ กรุณาลองใหม่",
    equip_success: "เปิดใช้งานกรอบรูปสำเร็จ!",
    equip_error: "เกิดข้อผิดพลาด"
  },
  
  // Request
  request: {
    err_login: "กรุณาเข้าสู่ระบบก่อนทำการสมัคร",
    err_pending: "คุณได้ส่งคำขอไปแล้ว กรุณารอทีมงานตรวจสอบ",
    err_general: "เกิดข้อผิดพลาดในการส่งคำขอ",
    loading: "กำลังโหลด...",
    title: "ช่องทางติดต่อ / สมัครนักเขียน",
    desc: "พูดคุย รีเควสเรื่องที่อยากอ่าน หรือหากคุณมีผลงานที่อยากนำมาลง สามารถส่งข้อมูลให้ทีมงานพิจารณาได้ทันที",
    fb_title: "พูดคุยและรีเควสเรื่องที่อยากอ่านผ่านแฟนเพจ",
    fb_desc: "ทักข้อความเพจ หรือคอมเมนต์เรื่องที่อยากอ่านได้เลย!",
    success_title: "ส่งคำขอสำเร็จ!",
    success_desc: "ทีมงานได้รับข้อมูลของคุณเรียบร้อยแล้ว เราจะทำการตรวจสอบและติดต่อกลับผ่านอีเมล หรือแจ้งเตือนในระบบโดยเร็วที่สุด",
    back_home: "กลับสู่หน้าแรก",
    not_logged_in: "คุณยังไม่ได้เข้าสู่ระบบ",
    please_login: "กรุณา",
    login_link: "เข้าสู่ระบบ",
    or_register: "หรือสมัครสมาชิกก่อนเพื่อทำการส่งคำขอ",
    email_label: "อีเมลของคุณ",
    email_placeholder: "กรุณาเข้าสู่ระบบก่อน",
    penname_label: "นามปากกา",
    penname_placeholder: "นามปากกาที่คุณต้องการใช้",
    type_label: "ประเภทผลงานหลัก",
    type_novel: "นิยาย (Novel)",
    type_comic: "การ์ตูน (Comic)",
    type_art: "นักวาด (Art)",
    contact_label: "ช่องทางติดต่อ (Facebook Page, Twitter, Line)",
    contact_placeholder: "เช่น Facebook: MyPage หรือ Line ID",
    portfolio_label: "ลิงก์ผลงานที่ผ่านมา (ถ้ามี)",
    desc_label: "เล่าเรื่องย่อ หรือแนะนำตัวเองสั้นๆ",
    desc_placeholder: "เล่าผลงานที่คุณอยากจะลงใน ReadChill ให้เราฟังหน่อย...",
    sending: "กำลังส่งข้อมูล...",
    submit_btn: "ส่งคำขอเป็นนักเขียน"
  },
  
  // Webtoon Details
  webtoon: {
    author: "ผู้แต่ง:",
    start_reading: "เริ่มอ่านเลย",
    chapter_list: "รายชื่อตอน",
    total: "ทั้งหมด",
    chapters: "ตอน",
    chapter_prefix: "ตอนที่",
    coins: "เหรียญ",
    free: "ฟรี"
  },
  
  // Reader
  reader: {
    chapter_prefix: "ตอนที่",
    settings: "ตั้งค่าการอ่าน",
    chapter_select: "เลือกตอน",
    loading_images: "กำลังโหลดภาพ...",
    prev_chapter: "ตอนก่อนหน้า",
    comments: "ความคิดเห็น",
    next_chapter: "ตอนถัดไป",
    support_artist: "สนับสนุนนักวาด",
    support_desc: "เป็นกำลังใจให้นักวาดผลิตผลงานดีๆ ต่อไป",
    donate_amount: "จำนวนเหรียญ",
    donate_btn: "สนับสนุน {amount} เหรียญ",
    donating: "กำลังส่ง...",
    custom_amount: "ระบุจำนวนเอง",
    donate_success: "ส่งเหรียญสนับสนุนสำเร็จ! ขอบคุณที่เป็นกำลังใจให้นักวาดครับ",
    donate_error: "เกิดข้อผิดพลาดในการสนับสนุน",
    donate_not_enough: "เหรียญไม่พอ กรุณาเติมเหรียญ",
    donate_login: "กรุณาเข้าสู่ระบบก่อนสนับสนุนนักวาด",
    // New settings translations
    theme: "ธีม",
    theme_light: "สว่าง",
    theme_dark: "มืด",
    theme_sepia: "เหลืองอ่อน",
    font_size: "ขนาดตัวอักษร",
    brightness: "ความสว่าง",
    page_mode: "โหมดแสดงผล",
    page_mode_scroll: "เลื่อนต่อเนื่อง",
    page_mode_single: "หน้าเดียว",
    fullscreen: "เต็มหน้าจอ"
  },
  
  // Comments
  comments: {
    err_login: "กรุณาเข้าสู่ระบบก่อนคอมเมนต์",
    err_send: "เกิดข้อผิดพลาดในการส่งคอมเมนต์",
    default_user: "สมาชิก",
    title: "ความคิดเห็น",
    placeholder: "แสดงความคิดเห็น...",
    placeholder_login: "เข้าสู่ระบบเพื่อแสดงความคิดเห็น",
    sticker_tooltip: "สติกเกอร์",
    no_stickers: "ยังไม่มีสติกเกอร์ ไปที่ร้านค้าเลย!",
    sticker_empty_desc: "เพิ่มความสนุกในการคอมเมนต์",
    go_shop: "ไปยังร้านค้าสติกเกอร์",
    empty: "ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็นเลย!",
    just_now: "เมื่อสักครู่"
  },
  
  // Search
  search: {
    title: "ค้นหาผลงาน",
    desc: "ค้นหาการ์ตูน นิยาย หรือผู้แต่งที่คุณชื่นชอบ",
    placeholder_title: "ชื่อเรื่อง หรือ ตอน...",
    placeholder_author: "นามปากกา...",
    type_all: "ทั้งหมด",
    type_comic: "เว็บตูน (Webtoon)",
    type_novel: "นิยาย (Novel)",
    type_art: "ภาพวาด (Art)",
    genres: "หมวดหมู่ (เลือกได้หลายอัน)",
    no_results: "ไม่พบผลลัพธ์ที่ค้นหา",
    no_results_desc: "ลองปรับเปลี่ยนคำค้นหา หรือตัวกรองดูอีกครั้ง"
  }
};

export type Translations = typeof th;
