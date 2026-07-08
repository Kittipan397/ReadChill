// นำเข้า Firebase App รุ่นล่าสุดผ่าน CDN (ES Modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
// นำเข้าบริการต่างๆ ที่ต้องใช้: Auth สำหรับ Login, Firestore สำหรับ Database, Storage สำหรับเก็บรูป
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ตั้งค่าคอนฟิกของ Firebase (ต้องนำมาจากหน้า Project Settings ใน Firebase Console)
// คำเตือน: ค่าด้านล่างเป็นแค่ตัวอย่าง กรุณานำ config จริงของคุณมาใส่แทน
const firebaseConfig = {
  apiKey: "AIzaSyA1-4fnlowdoF6IrFsSGCcnsnFHtwgzQ5o",
  authDomain: "readchill.firebaseapp.com",
  projectId: "readchill",
  storageBucket: "readchill.firebasestorage.app",
  messagingSenderId: "130626914375",
  appId: "1:130626914375:web:79450f746ab35d49c40962",
  measurementId: "G-QWBPVDK8BJ"
};

// เริ่มต้นการทำงานของ Firebase ด้วย config ที่กำหนด
const app = initializeApp(firebaseConfig);

// สร้างและส่งออก (export) instance ของบริการต่างๆ เพื่อให้ไฟล์อื่นนำไปใช้
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app);

// Provider ต่างๆ
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, functions, storage, googleProvider };
