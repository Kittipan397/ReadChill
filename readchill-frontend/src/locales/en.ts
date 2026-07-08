import { Translations } from './th';

export const en: Translations = {
  // Common
  loading: "Loading...",
  error: "An error occurred",
  save: "Save",
  cancel: "Cancel",
  confirm: "Confirm",
  login: "Log in",
  register: "Register",
  logout: "Log out",
  
  // Navbar
  nav: {
    home: "Home",
    search: "Search",
    shop: "Shop",
    topup: "Top Up",
    library: "My Library",
    contact: "Contact Us",
    inventory: "Inventory"
  },
  
  // Profile
  profile: {
    member: "Member",
  },
  
  // Home
  home: {
    update_daily: "New chapters daily!",
    hero_title_1: "Read your favorite manga",
    hero_title_2: "without interruptions at ReadChill",
    hero_desc: "The ultimate source for manga, novels, and high-quality comics. Read for free anywhere, anytime with fast loading and premium experience.",
    start_reading: "Start Reading",
    topup: "Top Up",
    new_update: "Recently Updated Manga (Live API Data)",
    view_all: "View All",
    no_data: "No manga found from the backend system"
  },
  
  // Auth
  auth: {
    welcome_back: "Welcome Back",
    login_desc: "Log in to continue reading your favorite manga",
    email: "Email",
    password: "Password",
    forgot_password: "Forgot Password?",
    login_btn: "Log in",
    or: "or",
    login_google: "Log in with Google",
    no_account: "Don't have an account?",
    register_link: "Register",
    error_invalid: "Invalid email or password",
    error_general: "An error occurred: ",
    google_failed: "Google login failed",
    password_mismatch: "Passwords do not match",
    password_length: "Password must be at least 6 characters",
    email_in_use: "This email is already in use",
    register_title: "Create an Account",
    register_desc: "Join ReadChill today",
    confirm_password: "Confirm Password",
    name: "Display Name",
    have_account: "Already have an account?",
    login_link: "Login",
    error_not_found: "Account not found for this email",
    forgot_desc: "Enter your email to receive a password reset link",
    reset_sent: "A password reset link has been sent to your email. Please check your inbox.",
    back_login: "Back to Login",
    send_reset: "Send Reset Link"
  },
  
  // Topup
  topup: {
    title: "Topup Coins",
    balance: "Your Coin Balance",
    coins: "Coins",
    tab_topup: "Topup",
    tab_history: "History",
    select_package: "Select Package",
    price: "Price {amount} THB",
    bonus: "Bonus {percent}%",
    custom_amount: "Or enter custom amount (Min 3 THB)",
    placeholder: "Enter amount",
    min_amount: "Minimum 3 THB",
    will_receive: "You will receive {amount} Coins",
    bonus_plus: "(Bonus +{amount})",
    pay_btn: "Pay {amount} THB",
    qr_title: "Scan QR Code to Pay",
    qr_desc: "Total {baht} THB (Receive {coins} Coins)",
    qr_mock: "PromptPay QR Code\n(Mock)",
    save_slip: "Save Image & Attach Slip",
    cancel: "Cancel",
    upload_title: "Attach Payment Slip (Slipok)",
    upload_desc: "Total {amount} THB",
    click_upload: "Click to upload slip",
    drag_upload: "Or drag and drop file here (Mock: click to pass)",
    back: "Back",
    success_title: "Topup Successful!",
    success_desc: "You have received {amount} Coins to your account.",
    new_transaction: "New Transaction",
    no_history: "No topup history",
    no_history_desc: "Your transaction history will appear here"
  },
  
  // Library
  library: {
    title: "My Library",
    desc: "Manage your reading history and favorite manga",
    tab_history: "Reading History",
    tab_saved: "Saved Manga",
    tab_unlocked: "Unlocked Chapters",
    read_progress: "Read {percent}%",
    no_saved: "No saved manga yet",
    no_saved_desc: "Find manga you like and bookmark them to read later",
    go_read: "Let's go read",
    col_title: "Manga / Chapter",
    col_price: "Price Paid",
    col_date: "Date Unlocked",
    col_action: "Action",
    read_again: "Read again"
  },
  
  // Inventory
  inventory: {
    login_required: "Please Login",
    login_desc: "You must login first to view your inventory",
    title: "My Inventory",
    desc: "Stickers and Profile Frames you own",
    tab_sticker: "Stickers",
    tab_frame: "Frames",
    empty_title: "You don't have items in this category",
    empty_desc: "Go to the shop to buy beautiful stickers and profile frames",
    go_shop: "Go to Shop",
    equipping: "Equipping...",
    equip: "Equip this frame",
    unequip: "Unequip frame",
    ready_to_use: "Ready to use in comments",
    in_use: "In Use",
    error_equip: "Error equipping frame"
  },
  
  // Shop
  shop: {
    title: "Sticker & Frame Shop",
    desc: "Colorize your profile and comments, and support artists!",
    your_coins: "Your Coins",
    topup: "Topup Coins",
    tab_all: "Home (All)",
    tab_sticker: "Stickers",
    tab_frame: "Profile Frames",
    loading: "Loading items...",
    empty: "No items in this category",
    owned_badge: "Owned",
    owned_btn: "Already Owned",
    in_use: "In Use",
    equipping: "Equipping...",
    equip_btn: "Equip Frame",
    buying: "Buying...",
    buy_login_required: "Please login before buying items",
    buy_not_enough_coins: "Not enough coins. Please topup.",
    buy_confirm: 'Confirm purchase of "{name}" for {price} coins?',
    buy_success: "Purchase successful! You can use it now.",
    buy_error: "Error purchasing. Please try again.",
    equip_success: "Frame equipped successfully!",
    equip_error: "An error occurred"
  },
  
  // Request
  request: {
    err_login: "Please login before applying",
    err_pending: "You have already submitted a request. Please wait for the team's review.",
    err_general: "An error occurred while submitting your request",
    loading: "Loading...",
    title: "Contact / Apply as Creator",
    desc: "Chat, request stories, or submit your work for the team to review and publish on the platform.",
    fb_title: "Chat and request stories on our Fanpage",
    fb_desc: "Send a message or comment the stories you want to read!",
    success_title: "Request Submitted Successfully!",
    success_desc: "We have received your information. We will review it and contact you via email or system notification soon.",
    back_home: "Back to Home",
    not_logged_in: "You are not logged in",
    please_login: "Please",
    login_link: "login",
    or_register: "or register before submitting a request.",
    email_label: "Your Email",
    email_placeholder: "Please login first",
    penname_label: "Pen Name",
    penname_placeholder: "The pen name you want to use",
    type_label: "Primary Work Type",
    type_novel: "Novel",
    type_comic: "Comic",
    type_art: "Art",
    contact_label: "Contact Info (Facebook Page, Twitter, Line)",
    contact_placeholder: "e.g., Facebook: MyPage or Line ID",
    portfolio_label: "Portfolio Link (if any)",
    desc_label: "Brief summary or self-introduction",
    desc_placeholder: "Tell us about the work you want to publish on ReadChill...",
    sending: "Submitting...",
    submit_btn: "Submit Creator Request"
  },
  
  // Manga Details
  manga: {
    author: "Author:",
    start_reading: "Start Reading",
    chapter_list: "Chapters",
    total: "Total",
    chapters: "chapters",
    chapter_prefix: "Chapter",
    coins: "Coins",
    free: "Free"
  },
  
  // Reader
  reader: {
    chapter_prefix: "Chapter",
    settings: "Reader Settings",
    chapter_select: "Select Chapter",
    loading_images: "Loading images...",
    prev_chapter: "Previous Chapter",
    comments: "Comments",
    next_chapter: "Next Chapter",
    support_artist: "Support Artist",
    support_desc: "Show your appreciation to the artist",
    donate_amount: "Coin Amount",
    donate_btn: "Donate {amount} Coins",
    donating: "Sending...",
    custom_amount: "Custom Amount",
    donate_success: "Donation sent successfully! Thank you for supporting the artist.",
    donate_error: "Error sending donation",
    donate_not_enough: "Not enough coins, please top up.",
    donate_login: "Please login to support the artist"
  },
  
  // Comments
  comments: {
    err_login: "Please login before commenting",
    err_send: "An error occurred while sending comment",
    default_user: "Member",
    title: "Comments",
    placeholder: "Write a comment...",
    placeholder_login: "Login to write a comment",
    sticker_tooltip: "Stickers",
    no_stickers: "No stickers yet. Visit the shop!",
    sticker_empty_desc: "Make commenting more fun",
    go_shop: "Go to Sticker Shop",
    empty: "No comments yet. Be the first to comment!",
    just_now: "Just now"
  },
  
  // Search
  search: {
    title: "Search",
    desc: "Search for your favorite manga, novels, or authors",
    placeholder_title: "Title or Chapter...",
    placeholder_author: "Author name...",
    type_all: "All",
    type_comic: "Comic",
    type_novel: "Novel",
    type_art: "Art",
    genres: "Genres (Multi-select)",
    no_results: "No results found",
    no_results_desc: "Try adjusting your search terms or filters"
  }
};
