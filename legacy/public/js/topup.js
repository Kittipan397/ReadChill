import { auth, db, functions } from "./firebase.js";
import { collection, addDoc, doc, getDoc, updateDoc, increment, serverTimestamp, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { uploadToCloudinary } from "./cloudinary.js";

// DOM Elements
const topupContent = document.getElementById("topup-content");
const displayCoins = document.getElementById("display-coins");
const packageGrid = document.getElementById("package-grid");
const btnNext = document.getElementById("btn-next");

const customAmountInput = document.getElementById("custom-amount-input");
const customFeedback = document.getElementById("custom-feedback");
const customInputWrapper = document.getElementById("custom-input-wrapper");

// Views
const viewSelect = document.getElementById("view-select");
const viewHistory = document.getElementById("view-history");
const viewQr = document.getElementById("view-qr");
const viewUpload = document.getElementById("view-upload");
const viewSuccess = document.getElementById("view-success");

// History Elements
const tabTopup = document.getElementById("tab-topup");
const tabHistory = document.getElementById("tab-history");
const historyLoading = document.getElementById("history-loading");
const historyEmpty = document.getElementById("history-empty");
const historyList = document.getElementById("history-list");

// QR View Elements
const qrAmountText = document.getElementById("qr-amount-text");
const qrImage = document.getElementById("qr-image");
const countdownText = document.getElementById("countdown-text");
const btnBackQr = document.getElementById("btn-back-qr");
const btnCancelPay = document.getElementById("btn-cancel-pay");
const btnIPaid = document.getElementById("btn-i-paid");
const btnDownloadQr = document.getElementById("btn-download-qr");

// Upload View Elements
const btnBackUpload = document.getElementById("btn-back-upload");
const uploadAmountText = document.getElementById("upload-amount-text");
const slipFile = document.getElementById("slip-file");
const slipPreview = document.getElementById("slip-preview");
const btnSubmitSlip = document.getElementById("btn-submit-slip");

// Success View Elements
const btnBackSuccess = document.getElementById("btn-back-success");
const btnDone = document.getElementById("btn-done");
const successAmount = document.getElementById("success-amount");
const successCoins = document.getElementById("success-coins");
const successRef = document.getElementById("success-ref");
const successDate = document.getElementById("success-date");

const PROMPTPAY_NUMBER = "010753700088205"; // TUNGNGERN (คอมมิค)
let currentUser = null;
let selectedPackage = null;
let countdownInterval = null;

// Helper: อัปเดตข้อความบนปุ่ม submit ระหว่างรอ
function updateLoadingText(text) {
    if (btnSubmitSlip) {
        btnSubmitSlip.innerHTML = `<ion-icon name="sync-outline" class="animate-spin"></ion-icon> ${text}`;
    }
}

const packages = [
    { baht: 10, coins: 10, bonus: 0 },
    { baht: 50, coins: 50, bonus: 0 },
    { baht: 100, coins: 100, bonus: 4, tag: "แถม 4%" },
    { baht: 200, coins: 200, bonus: 12, tag: "แถม 6%" },
    { baht: 500, coins: 500, bonus: 40, tag: "แถม 8%" },
    { baht: 1000, coins: 1000, bonus: 100, tag: "คุ้มสุด แถม 10%" },
];

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    
    currentUser = user;
    
    // โหลด Coin ปัจจุบัน
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const coins = userSnap.data().coins || 0;
        displayCoins.textContent = coins.toFixed(2);
    }
    
    topupContent.classList.remove("hidden");
    renderPackages();
});

function renderPackages() {
    packageGrid.innerHTML = "";
    packages.forEach((pkg, index) => {
        const totalCoins = pkg.coins + pkg.bonus;
        const bonusHtml = pkg.bonus > 0 ? `<div class="pkg-bonus">${pkg.tag}</div>` : "";
        
        const div = document.createElement("div");
        div.className = "package-item";
        div.innerHTML = `
            ${bonusHtml}
            <div class="pkg-coin"><ion-icon name="sparkles"></ion-icon> ${totalCoins}</div>
            <div class="pkg-price">ราคา ${pkg.baht} บาท</div>
        `;
        
        div.onclick = () => {
            document.querySelectorAll(".package-item").forEach(el => el.classList.remove("active"));
            div.classList.add("active");
            selectedPackage = { ...pkg, totalCoins };
            btnNext.disabled = false;
            
            // Auto-fill custom input
            customAmountInput.value = pkg.baht;
            if (pkg.bonus > 0) {
                customFeedback.innerHTML = `<ion-icon name="sparkles"></ion-icon> จะได้รับรวม ${totalCoins} Coin (โบนัส +${pkg.bonus})`;
            } else {
                customFeedback.innerHTML = `<ion-icon name="checkmark-circle"></ion-icon> จะได้รับ ${totalCoins} Coin`;
            }
            customInputWrapper.classList.add("active");
        };
        
        packageGrid.appendChild(div);
    });
}

// Handle Custom Amount Input
customAmountInput.addEventListener("input", (e) => {
    let amount = parseInt(e.target.value);
    
    // Deselect predefined packages
    document.querySelectorAll(".package-item").forEach(el => el.classList.remove("active"));
    
    if (isNaN(amount) || amount < 3) {
        customFeedback.innerHTML = `<span style="color: var(--danger);"><ion-icon name="warning"></ion-icon> ขั้นต่ำ 3 บาท</span>`;
        btnNext.disabled = true;
        selectedPackage = null;
        customInputWrapper.classList.remove("active");
        return;
    }

    customInputWrapper.classList.add("active");

    // Calculate Bonus
    let bonusPercent = 0;
    if (amount >= 1000) bonusPercent = 10;
    else if (amount >= 500) bonusPercent = 8;
    else if (amount >= 200) bonusPercent = 6;
    else if (amount >= 100) bonusPercent = 4;

    let bonusCoins = Math.floor(amount * (bonusPercent / 100));
    let totalCoins = amount + bonusCoins;

    selectedPackage = {
        baht: amount,
        coins: amount,
        bonus: bonusCoins,
        totalCoins: totalCoins,
        tag: bonusPercent > 0 ? `แถม ${bonusPercent}%` : ""
    };

    if (bonusCoins > 0) {
        customFeedback.innerHTML = `<ion-icon name="sparkles"></ion-icon> จะได้รับรวม ${totalCoins} Coin (โบนัส +${bonusCoins})`;
    } else {
        customFeedback.innerHTML = `<ion-icon name="checkmark-circle"></ion-icon> จะได้รับ ${totalCoins} Coin`;
    }
    
    btnNext.disabled = false;
});

function switchView(viewId) {
    viewSelect.classList.add("hidden");
    viewHistory.classList.add("hidden");
    viewQr.classList.add("hidden");
    viewUpload.classList.add("hidden");
    viewSuccess.classList.add("hidden");
    
    document.getElementById(viewId).classList.remove("hidden");
}

// History Tab Switching Logic
window.switchMainTab = (tabId) => {
    if (tabId === 'topup') {
        tabTopup.classList.add('active');
        tabHistory.classList.remove('active');
        switchView("view-select");
    } else {
        tabHistory.classList.add('active');
        tabTopup.classList.remove('active');
        switchView("view-history");
        loadHistory();
    }
};

async function loadHistory() {
    if (!currentUser) return;
    
    historyLoading.classList.remove("hidden");
    historyEmpty.classList.add("hidden");
    historyList.innerHTML = "";

    try {
        const q = query(
            collection(db, "payments"),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        
        historyLoading.classList.add("hidden");
        
        if (querySnapshot.empty) {
            historyEmpty.classList.remove("hidden");
            return;
        }

        let html = "";
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'ไม่ทราบวันที่';
            
            let statusHtml = '';
            if (data.status === 'pending') statusHtml = `<span class="status-badge pending">รอตรวจสอบ</span>`;
            else if (data.status === 'approved') statusHtml = `<span class="status-badge approved">สำเร็จ</span>`;
            else if (data.status === 'rejected') statusHtml = `<span class="status-badge rejected">ถูกปฏิเสธ</span>`;

            // Default to topup format, but can handle purchases if added later
            let amountHtml = `<span style="color: var(--text-primary); font-weight: 700;">+${data.coinAmount || 0} 🪙</span>`;
            let typeLabel = "เติมเหรียญ";
            let typeIcon = "card-outline";

            if (data.type === 'unlock_chapter') {
                amountHtml = `<span style="color: var(--danger); font-weight: 700;">-${data.coinAmount || 0} 🪙</span>`;
                typeLabel = "ซื้อตอนการ์ตูน";
                typeIcon = "book-outline";
                if (!data.status) statusHtml = `<span class="status-badge approved">สำเร็จ</span>`; // Purchases are instant
            }

            html += `
                <div class="tx-item">
                    <div class="tx-item-icon">
                        <ion-icon name="${typeIcon}"></ion-icon>
                    </div>
                    <div class="tx-item-details">
                        <h4>${typeLabel}</h4>
                        <p>${dateStr}</p>
                    </div>
                    <div class="tx-item-amount" style="text-align: right;">
                        <div style="margin-bottom: 0.3rem;">${amountHtml}</div>
                        <div>${statusHtml}</div>
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading history:", error);
        historyLoading.classList.add("hidden");
        historyEmpty.classList.remove("hidden");
        historyEmpty.innerHTML = `<p style="color: var(--danger);">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}</p>`;
    }
}

// ---------------------------
// Step 1: Select -> QR
// ---------------------------
btnNext.onclick = () => {
    if (!selectedPackage) return;
    
    qrAmountText.textContent = `${selectedPackage.baht.toFixed(2)} ฿`;
    
    // Generate Bill Payment Payload for Tungngern
    // Generate Bill Payment Payload for Tungngern
    const billerId = "010753700088205";
    const ref1 = "WJ122990AV0965996GG"; // รหัสร้านค้า goes to Ref1
    const ref2 = "READCHILL";          // รหัสธุรกรรม goes to Ref2
    const ref3 = "0000";               // รหัสอ้างอิง 3 goes to Tag 62 Sub 07 (Terminal)
    
    const payload = generateBillPaymentPayload(billerId, ref1, ref2, ref3, selectedPackage.baht);
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(payload)}`;
    
    switchView("view-qr");
    startTimer(15 * 60); // 15 mins
};

function generateBillPaymentPayload(billerId, ref1, ref2, ref3, amount) {
    let payload = "000201010212"; // 12 for dynamic
    
    // Tag 30: Bill Payment
    let billerInfo = "0016A000000677010112"; // AID for Bill Payment
    billerInfo += "01" + billerId.length.toString().padStart(2, '0') + billerId;
    billerInfo += "02" + ref1.length.toString().padStart(2, '0') + ref1;
    if (ref2) {
        billerInfo += "03" + ref2.length.toString().padStart(2, '0') + ref2;
    }
    
    let tag30 = "30" + billerInfo.length.toString().padStart(2, '0') + billerInfo;
    payload += tag30;
    
    payload += "5303764"; // Currency THB
    
    if (amount > 0) {
        let amountStr = amount.toFixed(2);
        payload += "54" + amountStr.length.toString().padStart(2, '0') + amountStr;
    }
    
    payload += "5802TH"; // Country Code
    
    // Tag 62: Additional Data Field
    let additionalData = "";
    if (ref3) {
        additionalData += "07" + ref3.length.toString().padStart(2, '0') + ref3; // Terminal Label for Ref3
    }
    if (additionalData.length > 0) {
        payload += "62" + additionalData.length.toString().padStart(2, '0') + additionalData;
    }
    
    payload += "6304"; // Checksum tag
    
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) > 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    let checksumStr = crc.toString(16).toUpperCase().padStart(4, '0');
    return payload + checksumStr;
}

btnBackQr.onclick = () => {
    clearInterval(countdownInterval);
    switchView("view-select");
};

if (btnCancelPay) {
    btnCancelPay.onclick = () => {
        clearInterval(countdownInterval);
        switchView("view-select");
    };
}

btnDownloadQr.onclick = async () => {
    try {
        const originalBtnText = btnDownloadQr.innerHTML;
        btnDownloadQr.innerHTML = '<ion-icon name="sync-outline" class="animate-spin"></ion-icon> กำลังสร้างรูป...';
        btnDownloadQr.disabled = true;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // 1. โหลดรูปกรอบ (Frame)
        const frameImg = new Image();
        frameImg.src = "images/qr_topup.png";
        await new Promise((resolve, reject) => {
            frameImg.onload = resolve;
            frameImg.onerror = reject;
        });

        canvas.width = frameImg.width;
        canvas.height = frameImg.height;
        ctx.drawImage(frameImg, 0, 0);

        // 2. โหลด QR Code
        const response = await fetch(qrImage.src);
        const blob = await response.blob();
        const qrImg = new Image();
        qrImg.src = URL.createObjectURL(blob);
        
        await new Promise((resolve, reject) => {
            qrImg.onload = resolve;
            qrImg.onerror = reject;
        });

        // 3. วาด QR Code ทับลงในกรอบ (พิกัดตาม CSS)
        const qrWidth = canvas.width * 0.636;
        const qrHeight = canvas.height * 0.636;
        const qrX = canvas.width * 0.182;
        const qrY = canvas.height * 0.182;

        ctx.drawImage(qrImg, qrX, qrY, qrWidth, qrHeight);
        
        // 4. สร้างไฟล์และดาวน์โหลด
        const link = document.createElement("a");
        link.download = `ReadChill_Topup_${selectedPackage.baht}THB.png`;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(qrImg.src);
        
        btnDownloadQr.innerHTML = originalBtnText;
        btnDownloadQr.disabled = false;
    } catch (e) {
        console.error("Error generating QR composition:", e);
        // Fallback: โหลดเฉพาะ QR ธรรมดาถ้าติดปัญหา
        try {
            const link = document.createElement("a");
            const response = await fetch(qrImage.src);
            const blob = await response.blob();
            link.href = URL.createObjectURL(blob);
            link.download = `ReadChill_Topup_${selectedPackage.baht}THB_QR.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch(fallbackError) {
            alert("เกิดข้อผิดพลาดในการดาวน์โหลด กรุณาแคปหน้าจอแทนครับ");
        }
        
        btnDownloadQr.innerHTML = '<ion-icon name="download-outline"></ion-icon> ดาวน์โหลด QR Code';
        btnDownloadQr.disabled = false;
    }
};

function startTimer(seconds) {
    clearInterval(countdownInterval);
    let timeLeft = seconds;
    
    const updateDisplay = () => {
        const m = Math.floor(timeLeft / 60).toString().padStart(2, "0");
        const s = (timeLeft % 60).toString().padStart(2, "0");
        countdownText.textContent = `${m}:${s}`;
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            countdownText.textContent = "หมดเวลา";
            btnIPaid.disabled = true;
            btnIPaid.style.opacity = "0.5";
        }
    };
    
    updateDisplay();
    countdownInterval = setInterval(() => {
        timeLeft--;
        updateDisplay();
    }, 1000);
}

// ---------------------------
// Step 2: QR -> Upload Slip
// ---------------------------
btnIPaid.onclick = () => {
    clearInterval(countdownInterval);
    uploadAmountText.textContent = `${selectedPackage.baht.toFixed(2)} ฿`;
    switchView("view-upload");
};

btnBackUpload.onclick = () => {
    switchView("view-qr");
    // Resume timer practically... but for simplicity we can just restart or leave it stopped.
};

// Handle Slip Upload
slipFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            slipPreview.src = e.target.result;
            slipPreview.style.display = "inline-block";
            btnSubmitSlip.disabled = false;
        };
        reader.readAsDataURL(file);
    }
});

// ---------------------------
// Step 3: Upload -> Success
// ---------------------------
btnSubmitSlip.onclick = async () => {
    const file = slipFile.files[0];
    if (!file || !currentUser || !selectedPackage) return;
    
    btnSubmitSlip.disabled = true;
    btnSubmitSlip.innerHTML = `<ion-icon name="sync-outline" class="animate-spin"></ion-icon> กำลังตรวจสอบสลิป...`;

    try {
        // บีบอัดรูปภาพก่อนส่งผ่าน Proxy เพื่อป้องกันปัญหา Payload Too Large (Failed to fetch)
        const compressedFile = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_SIZE = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height && width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    } else if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name || "slip.jpg", { type: "image/jpeg" }));
                    }, "image/jpeg", 0.8);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });

        // 1. อัปโหลดรูปสลิปไปที่ Cloudinary เพื่อแก้ปัญหา CORS payload ขนาดใหญ่
        updateLoadingText("กำลังอัปโหลดรูปภาพ...");
        const slipUrl = await uploadToCloudinary(compressedFile);

        updateLoadingText("กำลังตรวจสอบสลิปและเติมเหรียญ...");
        const submitTopupFn = httpsCallable(functions, 'submitTopup');
        
        const result = await submitTopupFn({
            slipUrl: slipUrl,
            packageBaht: selectedPackage.baht,
            packageCoins: selectedPackage.totalCoins
        });
        
        const docRefId = result.data.docId || "PAYMENT";
        
        // Show Success
        const d = new Date();
        const refCode = docRefId.toUpperCase().substring(0, 8) + Date.now().toString().slice(-4);
        
        successAmount.textContent = `฿${selectedPackage.baht}`;
        successCoins.textContent = `🪙 ${selectedPackage.totalCoins}`;
        successRef.textContent = refCode;
        successDate.textContent = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        switchView("view-success");
        
    } catch (error) {
        console.error("Error submitting slip:", error);
        alert("ข้อผิดพลาด: " + error.message);
        btnSubmitSlip.disabled = false;
        btnSubmitSlip.innerHTML = `<ion-icon name="paper-plane-outline"></ion-icon> แจ้งโอนเงิน`;
    }
};

// ---------------------------
// Step 4: Success -> Done
// ---------------------------
const resetFlow = () => {
    window.location.href = "topup.html";
};

btnBackSuccess.onclick = resetFlow;
btnDone.onclick = resetFlow;
