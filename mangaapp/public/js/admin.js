import { db, storage, auth } from "./firebase.js";
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp, arrayUnion, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const adminContent = document.getElementById("admin-content");
const unauthorizedMsg = document.getElementById("unauthorized-msg");

// Form Elements
const addTitle = document.getElementById("add-title");
const addChapterNum = document.getElementById("add-chapter-num");
const addIsFree = document.getElementById("add-is-free");
const priceGroup = document.getElementById("price-group");
const addPrice = document.getElementById("add-price");
const addImages = document.getElementById("add-images");
const addChapterBtn = document.getElementById("add-chapter-btn");
const addMsg = document.getElementById("add-msg");

const paymentsTbody = document.getElementById("payments-tbody");

// ตรวจสอบสิทธิ์ Admin
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists() && userSnap.data().role === "admin") {
            // อนุญาตให้เข้าถึง
            unauthorizedMsg.classList.add("hidden");
            adminContent.classList.remove("hidden");
            
            // โหลดข้อมูล payments
            loadPendingPayments();
        } else {
            unauthorizedMsg.innerHTML = "<h2 style='color: var(--danger);'>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h2><a href='index.html'>กลับหน้าแรก</a>";
        }
    } catch (error) {
        console.error("Auth check error:", error);
    }
});

// ซ่อน/แสดงช่องราคาขึ้นอยู่กับว่าตั้งเป็นฟรีหรือเสียเงิน
addIsFree.addEventListener("change", (e) => {
    if (e.target.value === "false") {
        priceGroup.classList.remove("hidden");
    } else {
        priceGroup.classList.add("hidden");
    }
});

// อัปโหลดตอนใหม่
addChapterBtn.addEventListener("click", async () => {
    const title = addTitle.value.trim();
    const chapterNum = parseInt(addChapterNum.value);
    const isFree = addIsFree.value === "true";
    const price = isFree ? 0 : parseFloat(addPrice.value);
    const files = addImages.files;

    if (!title || isNaN(chapterNum) || files.length === 0) {
        showAddMsg("กรุณากรอกข้อมูลให้ครบถ้วนและเลือกรูปภาพอย่างน้อย 1 รูป", "danger");
        return;
    }

    if (!isFree && (isNaN(price) || price <= 0)) {
        showAddMsg("กรุณาระบุราคาให้ถูกต้อง", "danger");
        return;
    }

    addChapterBtn.disabled = true;
    addChapterBtn.textContent = "กำลังอัปโหลดรูปภาพและบันทึกข้อมูล...";

    try {
        const imageUrls = [];
        
        // อัปโหลดรูปทีละรูปตามลำดับ
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExt = file.name.split(".").pop();
            // จัดชื่อไฟล์ให้อ่านง่าย เช่น manga_1_page_0.jpg
            const fileName = `manga_images/ch_${chapterNum}_page_${i}_${Date.now()}.${fileExt}`;
            const storageRef = ref(storage, fileName);
            
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            imageUrls.push(url);
        }

        // บันทึกลง Firestore
        await addDoc(collection(db, "chapters"), {
            title: title,
            chapterNumber: chapterNum,
            isFree: isFree,
            price: price,
            imageUrls: imageUrls,
            createdAt: serverTimestamp()
        });

        showAddMsg("เพิ่มตอนใหม่เรียบร้อยแล้ว!", "success");
        
        // ล้างฟอร์ม
        addTitle.value = "";
        addChapterNum.value = "";
        addImages.value = "";
        addPrice.value = "5";

    } catch (error) {
        console.error("Error adding chapter:", error);
        showAddMsg("เกิดข้อผิดพลาด: " + error.message, "danger");
    } finally {
        addChapterBtn.disabled = false;
        addChapterBtn.textContent = "บันทึกตอนใหม่";
    }
});

const showAddMsg = (text, type) => {
    addMsg.textContent = text;
    addMsg.style.color = type === "success" ? "var(--success)" : "var(--danger)";
};

// ดึงรายการชำระเงินที่รออนุมัติ
const loadPendingPayments = async () => {
    try {
        const q = query(collection(db, "payments"), where("status", "==", "pending"));
        const snapshot = await getDocs(q);
        
        paymentsTbody.innerHTML = "";
        
        if (snapshot.empty) {
            paymentsTbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>ไม่มีรายการรอดำเนินการ</td></tr>";
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${data.userEmail}</td>
                <td>${data.chapterId}</td>
                <td>${data.amount} ฿</td>
                <td><a href="${data.slipUrl}" target="_blank" class="slip-link">ดูสลิป</a></td>
                <td>
                    <button class="btn-primary btn-sm" onclick="approvePayment('${id}', '${data.userId}', '${data.chapterId}')">อนุมัติ</button>
                    <button class="btn-danger btn-sm" onclick="rejectPayment('${id}')">ปฏิเสธ</button>
                </td>
            `;
            paymentsTbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading payments:", error);
        paymentsTbody.innerHTML = "<tr><td colspan='5' style='text-align:center; color: var(--danger);'>โหลดข้อมูลผิดพลาด</td></tr>";
    }
};

// อนุมัติการชำระเงิน (Global scope เพื่อให้ปุ่มเรียกใช้ได้)
window.approvePayment = async (paymentId, userId, chapterId) => {
    if (!confirm("ยืนยันการอนุมัติสลิปนี้?")) return;
    
    try {
        // 1. อัปเดตสถานะ payment
        await updateDoc(doc(db, "payments", paymentId), {
            status: "approved",
            updatedAt: serverTimestamp()
        });
        
        // 2. เพิ่ม chapterId ลงใน unlockedChapters ของ user
        await updateDoc(doc(db, "users", userId), {
            unlockedChapters: arrayUnion(chapterId)
        });
        
        alert("อนุมัติสำเร็จ!");
        loadPendingPayments(); // โหลดตารางใหม่
    } catch (error) {
        console.error("Error approving payment:", error);
        alert("เกิดข้อผิดพลาดในการอนุมัติ");
    }
};

// ปฏิเสธการชำระเงิน
window.rejectPayment = async (paymentId) => {
    if (!confirm("ต้องการปฏิเสธสลิปนี้ใช่หรือไม่?")) return;
    
    try {
        await updateDoc(doc(db, "payments", paymentId), {
            status: "rejected",
            updatedAt: serverTimestamp()
        });
        
        alert("ปฏิเสธสลิปแล้ว");
        loadPendingPayments(); // โหลดตารางใหม่
    } catch (error) {
        console.error("Error rejecting payment:", error);
        alert("เกิดข้อผิดพลาดในการปฏิเสธ");
    }
};
