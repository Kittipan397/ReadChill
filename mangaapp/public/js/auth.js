import { auth, db, googleProvider } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ดึงองค์ประกอบจาก DOM
const googleSignInBtn = document.getElementById("google-signin-btn");
const authError = document.getElementById("auth-error");
const logoutBtn = document.getElementById("logout-btn");
const unauthMenu = document.getElementById("unauth-menu");
const authMenu = document.getElementById("auth-menu");
const userGreeting = document.getElementById("user-greeting");
const adminLink = document.getElementById("admin-link");

// ฟังก์ชันเข้าสู่ระบบด้วย Google
const loginWithGoogle = async () => {
    try {
        // เปิด Popup ให้ผู้ใช้เลือกล็อกอินด้วย Google
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // ตรวจสอบว่าผู้ใช้นี้เคยมีข้อมูลใน Firestore หรือยัง
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // ถ้ายังไม่มี (ล็อกอินครั้งแรก) ให้สร้างข้อมูลใหม่
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                unlockedChapters: [], // ตอนที่ปลดล็อกแล้ว (array of chapterId)
                role: "user" // ค่าเริ่มต้นเป็น user ทั่วไป
            });
        }

        // ล็อกอินสำเร็จ ให้กลับไปหน้าแรก
        window.location.href = "index.html";
    } catch (error) {
        console.error("Login failed:", error);
        if (authError) {
            authError.textContent = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ: " + error.message;
            authError.classList.remove("hidden");
        }
    }
};

// ฟังก์ชันออกจากระบบ
const logout = async () => {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

// ตรวจจับสถานะการล็อกอิน (ผู้ใช้เข้ามาใหม่/ล็อกอิน/ล็อกเอาท์)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ถ้ามีการล็อกอินแล้ว
        if (unauthMenu && authMenu && userGreeting) {
            unauthMenu.classList.add("hidden");
            authMenu.classList.remove("hidden");
            userGreeting.textContent = `สวัสดี, ${user.displayName || user.email}`;
            
            // เช็ค role ว่าเป็น admin หรือไม่ เพื่อแสดงปุ่มไปหน้าจัดการระบบ
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.role === "admin" && adminLink) {
                    adminLink.classList.remove("hidden");
                }
            }
        }
        
        // ถ้าผู้ใช้ล็อกอินแล้วแต่ดันเผลอเข้ามาหน้า login.html อีก ให้กลับไปหน้าแรก
        if (window.location.pathname.includes("login.html")) {
            window.location.href = "index.html";
        }
    } else {
        // ถ้ายังไม่ได้ล็อกอิน
        if (unauthMenu && authMenu) {
            unauthMenu.classList.remove("hidden");
            authMenu.classList.add("hidden");
        }
    }
});

// ผูก Event Listener ให้กับปุ่มต่างๆ (ถ้าหน้าต่างปัจจุบันมีปุ่มนั้นๆ)
if (googleSignInBtn) {
    googleSignInBtn.addEventListener("click", loginWithGoogle);
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
}
