import { db, storage, auth } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// นำเข้า Library สำหรับสร้าง PromptPay QR
import generatePayload from "https://esm.sh/promptpay-qr";
import QRCode from "https://esm.sh/qrcode";

// ตั้งค่าเบอร์โทรศัพท์หรือหมายเลขบัตรประชาชนสำหรับรับเงิน
// (ในที่นี้ hardcode ไว้ก่อน สามารถเปลี่ยนให้ดึงจาก Firestore ได้ภายหลัง)
const PROMPTPAY_ID = "0812345678"; // เปลี่ยนเป็นเบอร์ของคุณ

const loadingSpinner = document.getElementById("loading-spinner");
const paymentContent = document.getElementById("payment-content");
const paymentDetails = document.getElementById("payment-details");
const qrcodeContainer = document.getElementById("qrcode-container");
const promptpayIdDisplay = document.getElementById("promptpay-id-display");
const slipUpload = document.getElementById("slip-upload");
const submitBtn = document.getElementById("submit-payment-btn");
const paymentMsg = document.getElementById("payment-msg");

let currentUser = null;
let currentChapterId = null;
let currentPrice = 0;

// ตรวจสอบสถานะล็อกอิน
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // ถ้ายังไม่ได้ล็อกอิน ให้กลับไปหน้าแรก
        window.location.href = "index.html";
        return;
    }
    currentUser = user;
    initPayment();
});

const initPayment = async () => {
    // ดึงข้อมูลจาก URL
    const urlParams = new URLSearchParams(window.location.search);
    currentChapterId = urlParams.get("chapterId");
    currentPrice = parseFloat(urlParams.get("price"));

    if (!currentChapterId || isNaN(currentPrice) || currentPrice <= 0) {
        alert("ข้อมูลการชำระเงินไม่ถูกต้อง");
        window.location.href = "index.html";
        return;
    }

    // แสดงรายละเอียด
    paymentDetails.textContent = `รหัสตอน: ${currentChapterId} | จำนวนเงินที่ต้องชำระ: ${currentPrice} บาท`;
    promptpayIdDisplay.textContent = PROMPTPAY_ID;

    // สร้าง QR Code
    try {
        const payload = generatePayload(PROMPTPAY_ID, { amount: currentPrice });
        // วาด QR Code ออกมาเป็น Data URL (รูป base64)
        const qrDataUrl = await QRCode.toDataURL(payload, {
            width: 250,
            margin: 2,
            color: {
                dark: "#000000",
                light: "#ffffff"
            }
        });

        // นำรูปมาแสดง
        const img = document.createElement("img");
        img.src = qrDataUrl;
        img.alt = "PromptPay QR Code";
        qrcodeContainer.appendChild(img);

        // ปิดโหลดและแสดงเนื้อหา
        loadingSpinner.classList.add("hidden");
        paymentContent.classList.remove("hidden");
    } catch (error) {
        console.error("Error generating QR Code:", error);
        alert("เกิดข้อผิดพลาดในการสร้าง QR Code");
    }
};

// จัดการเมื่อกดปุ่มส่งสลิป
submitBtn.addEventListener("click", async () => {
    const file = slipUpload.files[0];
    if (!file) {
        showMsg("กรุณาแนบสลิปการโอนเงิน", "danger");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "กำลังอัปโหลด...";

    try {
        // 1. อัปโหลดรูปสลิปไปที่ Firebase Storage
        const fileExt = file.name.split(".").pop();
        const fileName = `slips/${currentUser.uid}_${currentChapterId}_${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, file);
        const slipUrl = await getDownloadURL(storageRef);

        // 2. บันทึกข้อมูลลง Firestore (collection "payments")
        await addDoc(collection(db, "payments"), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            chapterId: currentChapterId,
            amount: currentPrice,
            slipUrl: slipUrl,
            status: "pending", // รอ admin อนุมัติ
            createdAt: serverTimestamp()
        });

        showMsg("ส่งหลักฐานเรียบร้อย กรุณารอแอดมินอนุมัติ", "success");
        // หน่วงเวลาเล็กน้อยแล้วกลับหน้าแรก
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);

    } catch (error) {
        console.error("Payment submission failed:", error);
        showMsg("เกิดข้อผิดพลาด: " + error.message, "danger");
        submitBtn.disabled = false;
        submitBtn.textContent = "ยืนยันการชำระเงิน";
    }
});

const showMsg = (text, type) => {
    paymentMsg.textContent = text;
    paymentMsg.style.color = type === "success" ? "var(--success)" : "var(--danger)";
    paymentMsg.classList.remove("hidden");
};
