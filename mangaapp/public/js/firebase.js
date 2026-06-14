// นำเข้า Firebase App รุ่นล่าสุดผ่าน CDN (ES Modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
// นำเข้าบริการต่างๆ ที่ต้องใช้: Auth สำหรับ Login, Firestore สำหรับ Database, Storage สำหรับเก็บรูป
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ตั้งค่าคอนฟิกของ Firebase (ต้องนำมาจากหน้า Project Settings ใน Firebase Console)
// คำเตือน: ค่าด้านล่างเป็นแค่ตัวอย่าง กรุณานำ config จริงของคุณมาใส่แทน
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// เริ่มต้นการทำงานของ Firebase ด้วย config ที่กำหนด
const app = initializeApp(firebaseConfig);

// สร้างและส่งออก (export) instance ของบริการต่างๆ เพื่อให้ไฟล์อื่นนำไปใช้
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// เตรียม GoogleAuthProvider ไว้สำหรับการล็อกอินด้วย Gmail
export const googleProvider = new GoogleAuthProvider();
