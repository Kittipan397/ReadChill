import { auth, db, googleProvider } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ดึงองค์ประกอบจาก DOM
const googleSignInBtn = document.getElementById("google-signin-btn");
const emailLoginBtn = document.getElementById("email-login-btn");
const emailRegisterBtn = document.getElementById("email-register-btn");
const loginEmailInput = document.getElementById("login-email-input");
const loginPasswordInput = document.getElementById("login-password-input");
const regNameInput = document.getElementById("reg-name-input");
const regEmailInput = document.getElementById("reg-email-input");
const regPasswordInput = document.getElementById("reg-password-input");

const loginContainer = document.getElementById("login-container");
const registerContainer = document.getElementById("register-container");
const showRegisterLink = document.getElementById("show-register-link");
const showLoginLink = document.getElementById("show-login-link");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");

const authError = document.getElementById("auth-error");
const logoutBtn = document.getElementById("logout-btn");
const unauthMenu = document.getElementById("unauth-menu");
const authMenu = document.getElementById("auth-menu");
const userGreeting = document.getElementById("user-greeting");
const adminLink = document.getElementById("admin-link");

// ฟังก์ชันเข้าสู่ระบบด้วย Google
const loginWithGoogle = async () => {
    try {
        if (googleSignInBtn) {
            googleSignInBtn.innerHTML = '<div class="loader" style="width: 20px; height: 20px; margin-right: 10px; display: inline-block;"></div> กำลังเชื่อมต่อบัญชี Google...';
            googleSignInBtn.disabled = true;
        }
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
                role: "user", // ค่าเริ่มต้นเป็น user ทั่วไป
                coins: 0
            });
        }

        // ล็อกอินสำเร็จ ให้กลับไปหน้าแรก
        window.location.href = "index.html";
    } catch (error) {
        console.error("Login failed:", error);
        if (authError) {
            // เช็คว่าเป็น error จากการปิด popup หรือไม่
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                authError.textContent = "คุณได้ยกเลิกการเข้าสู่ระบบ";
            } else {
                authError.textContent = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ: " + error.message;
            }
            authError.classList.remove("hidden");
        }
        if (googleSignInBtn) {
            googleSignInBtn.innerHTML = '<ion-icon name="logo-google" style="margin-right: 0.5rem;"></ion-icon> เข้าสู่ระบบด้วย Google';
            googleSignInBtn.disabled = false;
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

// ฟังก์ชันเข้าสู่ระบบด้วย Email/Password
const loginWithEmail = async () => {
    const email = loginEmailInput?.value;
    const password = loginPasswordInput?.value;
    
    if (!email || !password) {
        if (authError) {
            authError.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
            authError.classList.remove("hidden");
        }
        return;
    }
    
    try {
        if (emailLoginBtn) {
            emailLoginBtn.innerHTML = '<div class="loader" style="width: 20px; height: 20px; display: inline-block;"></div>';
            emailLoginBtn.disabled = true;
        }
        
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Email login failed:", error);
        if (authError) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-login-credentials') {
                authError.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
            } else {
                authError.textContent = "เกิดข้อผิดพลาด: " + error.message;
            }
            authError.classList.remove("hidden");
        }
        if (emailLoginBtn) {
            emailLoginBtn.innerHTML = 'เข้าสู่ระบบ';
            emailLoginBtn.disabled = false;
        }
    }
};

// ฟังก์ชันสมัครสมาชิกด้วย Email/Password
const registerWithEmail = async () => {
    const name = regNameInput?.value || "";
    const email = regEmailInput?.value;
    const password = regPasswordInput?.value;
    
    if (!email || !password) {
        if (authError) {
            authError.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
            authError.classList.remove("hidden");
        }
        return;
    }
    
    if (password.length < 6) {
        if (authError) {
            authError.textContent = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
            authError.classList.remove("hidden");
        }
        return;
    }
    
    try {
        if (emailRegisterBtn) {
            emailRegisterBtn.innerHTML = '<div class="loader" style="width: 20px; height: 20px; display: inline-block;"></div>';
            emailRegisterBtn.disabled = true;
        }
        
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: name || user.email.split('@')[0],
            unlockedChapters: [],
            role: "user",
            coins: 0,
            earnedCoins: 0
        });
        
        window.location.href = "index.html";
    } catch (error) {
        console.error("Email registration failed:", error);
        if (authError) {
            if (error.code === 'auth/email-already-in-use') {
                authError.textContent = "อีเมลนี้มีผู้ใช้งานแล้ว";
            } else {
                authError.textContent = "เกิดข้อผิดพลาด: " + error.message;
            }
            authError.classList.remove("hidden");
        }
        if (emailRegisterBtn) {
            emailRegisterBtn.innerHTML = 'สมัครสมาชิก';
            emailRegisterBtn.disabled = false;
        }
    }
};

// ตรวจจับสถานะการล็อกอิน (ผู้ใช้เข้ามาใหม่/ล็อกอิน/ล็อกเอาท์)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ถ้ามีการล็อกอินแล้ว
        if (unauthMenu && authMenu && userGreeting) {
            unauthMenu.classList.add("hidden");
            authMenu.classList.remove("hidden");
            userGreeting.textContent = user.displayName || user.email || "User";
            
            const profileImg = document.getElementById("nav-profile-img");
            if (profileImg) {
                profileImg.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || "User")}&background=1a90ff&color=fff`;
            }
            
            // เช็ค role ว่าเป็น admin หรือไม่ เพื่อแสดงปุ่มไปหน้าจัดการระบบ
            const ADMIN_EMAIL = "kittipan.g397@gmail.com";
            
            // ใช้ email จากระบบล็อกอินตรวจสอบเลยเพื่อความรวดเร็ว
            if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                if (adminLink) adminLink.classList.remove("hidden");
                const sidebarAdminLink = document.getElementById("sidebar-admin-link");
                if (sidebarAdminLink) sidebarAdminLink.classList.remove("hidden");
            } else {
                if (adminLink) adminLink.classList.add("hidden");
                const sidebarAdminLink = document.getElementById("sidebar-admin-link");
                if (sidebarAdminLink) sidebarAdminLink.classList.add("hidden");
            }

            const userRef = doc(db, "users", user.uid);
            
            // Listen to real-time user data
            window.userUnsubscribe = onSnapshot(userRef, async (docSnap) => {
                if (!docSnap.exists()) {
                    // สร้างข้อมูลให้ผู้ใช้เก่าที่ยังไม่มีใน Firestore
                    try {
                        await setDoc(userRef, {
                            uid: user.uid,
                            email: user.email || "",
                            displayName: user.displayName || (user.email ? user.email.split('@')[0] : "User"),
                            unlockedChapters: [],
                            role: "user",
                            coins: 0,
                            earnedCoins: 0
                        });
                    } catch (e) {
                        console.error("Failed to create missing user doc:", e);
                    }
                    return; // snapshot จะ trigger ใหม่เมื่อสร้างเสร็จ
                }
                
                const userData = docSnap.data();
                    
                    // สร้างปุ่มเหรียญถ้ายังไม่มี
                    let coinLink = document.getElementById("coin-balance-link");
                    if (!coinLink) {
                        coinLink = document.createElement("a");
                        coinLink.id = "coin-balance-link";
                        coinLink.href = "topup.html";
                        coinLink.className = "coin-balance-link";
                        coinLink.innerHTML = `<ion-icon name="wallet"></ion-icon> <span id="coin-balance">0.00</span>`;
                        
                        // แทรกก่อน profile-menu
                        if (authMenu && authMenu.parentNode) {
                            authMenu.parentNode.insertBefore(coinLink, authMenu);
                        }
                    }
                    
                    // อัปเดตยอดเหรียญ
                    const coins = userData.coins || 0;
                    document.getElementById("coin-balance").textContent = coins.toFixed(2);
                    
                    // Update Sidebar Profile if exists
                    const sidebarProfileName = document.getElementById("sidebar-profile-name");
                    const sidebarProfileEmail = document.getElementById("sidebar-profile-email");
                    const sidebarProfileImg = document.getElementById("sidebar-profile-img");
                    const sidebarLoginBtn = document.getElementById("sidebar-login-btn");
                    const sidebarLogoutBtn = document.getElementById("sidebar-logout-btn");
                    
                    if (sidebarProfileName) {
                        sidebarProfileName.textContent = user.displayName || (user.email ? user.email.split('@')[0] : "User");
                        sidebarProfileEmail.innerHTML = `${user.email || "Facebook User"} <br> <span class="coins"><ion-icon name="wallet"></ion-icon> ${coins.toFixed(2)} เหรียญ</span>`;
                        sidebarProfileImg.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || "User")}&background=1a90ff&color=fff`;
                        
                        if (sidebarLoginBtn) sidebarLoginBtn.classList.add("hidden");
                        if (sidebarLogoutBtn) sidebarLogoutBtn.classList.remove("hidden");
                        
                        if (sidebarLogoutBtn && !sidebarLogoutBtn.dataset.listener) {
                            sidebarLogoutBtn.addEventListener("click", logout);
                            sidebarLogoutBtn.dataset.listener = "true";
                        }
                    }
                    
                    // เช็คเปลี่ยน role แอดมิน
                    if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                        if (userData.role !== "admin") {
                            await setDoc(userRef, { role: "admin" }, { merge: true });
                        }
                    } else {
                        if (userData.role === "admin") {
                            await setDoc(userRef, { role: "user" }, { merge: true });
                        }
                    }
                    
                    // แสดงปุ่ม Partner Dashboard ถ้ามี role เป็น partner
                    const sidebarPartnerLink = document.getElementById("sidebar-partner-link");
                    const partnerLink = document.getElementById("partner-link");
                    if (sidebarPartnerLink) {
                        if (userData.role === "partner") {
                            sidebarPartnerLink.classList.remove("hidden");
                            if (partnerLink) {
                                partnerLink.classList.remove("hidden");
                                const coinLinkElement = document.getElementById("coin-balance-link");
                                if (coinLinkElement && coinLinkElement.parentNode) {
                                    // Move partnerLink to sit right after coinLink (outside authMenu)
                                    coinLinkElement.parentNode.insertBefore(partnerLink, coinLinkElement.nextSibling);
                                    partnerLink.style.marginLeft = "0.2rem";
                                    partnerLink.style.marginRight = "0.5rem";
                                }
                            }
                        } else {
                            sidebarPartnerLink.classList.add("hidden");
                            if (partnerLink) partnerLink.classList.add("hidden");
                        }
                    } else if (partnerLink) {
                        if (userData.role === "partner") {
                            partnerLink.classList.remove("hidden");
                        } else {
                            partnerLink.classList.add("hidden");
                        }
                    }
                // เอา bracket ของ if (docSnap.exists()) ออก เพราะเราเปลี่ยนเป็น if (!docSnap.exists()) return; แทนแล้ว
            });
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
        
        // Reset Sidebar Profile
        const sidebarProfileName = document.getElementById("sidebar-profile-name");
        if (sidebarProfileName) {
            sidebarProfileName.textContent = "ผู้เยี่ยมชม";
            document.getElementById("sidebar-profile-email").textContent = "กรุณาเข้าสู่ระบบ";
            document.getElementById("sidebar-profile-img").src = "https://ui-avatars.com/api/?name=Guest";
            document.getElementById("sidebar-login-btn")?.classList.remove("hidden");
            document.getElementById("sidebar-logout-btn")?.classList.add("hidden");
            document.getElementById("sidebar-admin-link")?.classList.add("hidden");
            document.getElementById("sidebar-partner-link")?.classList.add("hidden");
        }
        if (window.userUnsubscribe) {
            window.userUnsubscribe();
        }
    }
});

// ผูก Event Listeners เฉพาะถ้ามีปุ่มอยู่ในหน้า
if (googleSignInBtn) {
    googleSignInBtn.addEventListener("click", loginWithGoogle);
}



if (emailLoginBtn) {
    emailLoginBtn.addEventListener("click", loginWithEmail);
}

if (emailRegisterBtn) {
    emailRegisterBtn.addEventListener("click", registerWithEmail);
}



if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
}
