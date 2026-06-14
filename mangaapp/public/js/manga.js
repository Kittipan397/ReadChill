import { db } from "./firebase.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const mangaContainer = document.getElementById("manga-container");
const loadingSpinner = document.getElementById("loading-spinner");

// ฟังก์ชันดึงรายการการ์ตูน (chapters) ทั้งหมดจาก Firestore
const fetchMangas = async () => {
    try {
        const chaptersRef = collection(db, "chapters");
        // เรียงลำดับตาม chapterNumber จากน้อยไปมาก
        const q = query(chaptersRef, orderBy("chapterNumber", "asc"));
        const snapshot = await getDocs(q);
        
        const chapters = [];
        snapshot.forEach(doc => {
            chapters.push({ id: doc.id, ...doc.data() });
        });
        
        renderMangas(chapters);
    } catch (error) {
        console.error("Error fetching mangas:", error);
        if (mangaContainer) {
            mangaContainer.innerHTML = "<p style='color: var(--danger); text-align: center; grid-column: 1/-1;'>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>";
        }
    } finally {
        if (loadingSpinner) {
            loadingSpinner.classList.add("hidden");
        }
    }
};

// ฟังก์ชันสร้างการ์ด HTML และแสดงผล
const renderMangas = (chapters) => {
    if (!mangaContainer) return;
    
    mangaContainer.innerHTML = ""; // เคลียร์ของเก่าก่อน
    mangaContainer.classList.remove("hidden"); // แสดง container

    if (chapters.length === 0) {
        mangaContainer.innerHTML = "<p style='text-align: center; grid-column: 1/-1;'>ยังไม่มีการ์ตูนในระบบ</p>";
        return;
    }

    chapters.forEach(chapter => {
        // ใช้ภาพแรกใน imageUrls เป็นภาพหน้าปก
        const coverImage = (chapter.imageUrls && chapter.imageUrls.length > 0) 
            ? chapter.imageUrls[0] 
            : "https://via.placeholder.com/250x350?text=No+Cover";
            
        const isFreeHtml = chapter.isFree 
            ? `<span class="badge free">อ่านฟรี</span>` 
            : `<span class="badge paid">ซื้อตอน (${chapter.price || 0} ฿)</span>`;

        const card = document.createElement("div");
        card.className = "manga-card";
        card.innerHTML = `
            <img src="${coverImage}" alt="${chapter.title}" class="manga-cover" loading="lazy">
            <div class="manga-info">
                <h3 class="manga-title">${chapter.title}</h3>
                <p class="manga-chapter">ตอนที่ ${chapter.chapterNumber}</p>
                <div class="manga-actions">
                    ${isFreeHtml}
                    <button class="btn-primary" onclick="readChapter('${chapter.id}')">อ่านเลย</button>
                </div>
            </div>
        `;
        mangaContainer.appendChild(card);
    });
};

// ฟังก์ชันนำทางไปยังหน้าอ่านการ์ตูน (ใช้ global scope เพื่อให้เรียกจาก onclick ใน html string ได้)
window.readChapter = (chapterId) => {
    // พาผู้ใช้ไปยังหน้า read.html พร้อมแนบ ID เป็น Query Parameter
    window.location.href = `read.html?id=${chapterId}`;
};

// ถ้าอยู่ในหน้า index.html (มี manga-container) ให้ดึงข้อมูลมาแสดง
if (mangaContainer) {
    fetchMangas();
}

// ==========================================
// ลอจิกสำหรับหน้า read.html
// ==========================================
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./firebase.js";

const readerContainer = document.getElementById("reader-container");
const chapterHeader = document.getElementById("chapter-header");
const chapterTitle = document.getElementById("chapter-title");
const lockedOverlay = document.getElementById("locked-overlay");
const buyChapterBtn = document.getElementById("buy-chapter-btn");

const loadChapterForReading = async () => {
    // ดึง id จาก URL (เช่น read.html?id=xyz123)
    const urlParams = new URLSearchParams(window.location.search);
    const chapterId = urlParams.get("id");

    if (!chapterId) {
        chapterTitle.textContent = "ไม่พบตอนที่คุณต้องการอ่าน";
        chapterHeader.classList.remove("hidden");
        loadingSpinner.classList.add("hidden");
        return;
    }

    try {
        const chapterRef = doc(db, "chapters", chapterId);
        const chapterSnap = await getDoc(chapterRef);

        if (!chapterSnap.exists()) {
            chapterTitle.textContent = "ตอนที่คุณค้นหาถูกลบไปแล้วหรือไม่ก็ไม่มีอยู่จริง";
            chapterHeader.classList.remove("hidden");
            loadingSpinner.classList.add("hidden");
            return;
        }

        const chapterData = chapterSnap.data();
        chapterTitle.textContent = `${chapterData.title} (ตอนที่ ${chapterData.chapterNumber})`;
        chapterHeader.classList.remove("hidden");

        if (chapterData.isFree) {
            // ถ้าอ่านฟรี โหลดรูปได้เลย
            renderImages(chapterData.imageUrls);
        } else {
            // ถ้าไม่ฟรี ต้องเช็ค Auth
            checkAuthAndUnlockStatus(chapterId, chapterData);
        }

    } catch (error) {
        console.error("Error loading chapter:", error);
        chapterTitle.textContent = "เกิดข้อผิดพลาดในการโหลดตอน";
        chapterHeader.classList.remove("hidden");
        loadingSpinner.classList.add("hidden");
    }
};

const checkAuthAndUnlockStatus = (chapterId, chapterData) => {
    // ตรวจสอบการล็อกอิน
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // ยังไม่ได้ล็อกอิน ให้แสดงหน้าต่างล็อกตอน
            showLocked(chapterId, chapterData.price);
        } else {
            // ล็อกอินแล้ว ตรวจสอบว่าเคยซื้อหรือยัง
            try {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const unlocked = userData.unlockedChapters || [];
                    
                    if (unlocked.includes(chapterId) || userData.role === "admin") {
                        // ปลดล็อกแล้ว หรือเป็น admin โหลดรูปได้เลย
                        renderImages(chapterData.imageUrls);
                    } else {
                        // ยังไม่ได้ซื้อ
                        showLocked(chapterId, chapterData.price);
                    }
                }
            } catch (error) {
                console.error("Error checking user unlock status:", error);
                showLocked(chapterId, chapterData.price);
            }
        }
    });
};

const showLocked = (chapterId, price) => {
    loadingSpinner.classList.add("hidden");
    lockedOverlay.classList.remove("hidden");
    buyChapterBtn.textContent = `ซื้อตอน (${price || 0} ฿)`;
    
    // เมื่อกดซื้อ พาไปหน้า payment
    buyChapterBtn.onclick = () => {
        window.location.href = `payment.html?chapterId=${chapterId}&price=${price || 0}`;
    };
};

const renderImages = (imageUrls) => {
    loadingSpinner.classList.add("hidden");
    readerContainer.classList.remove("hidden");
    
    if (!imageUrls || imageUrls.length === 0) {
        readerContainer.innerHTML = "<p>ตอนนี้ยังไม่มีรูปภาพอัปโหลด</p>";
        return;
    }

    readerContainer.innerHTML = "";
    imageUrls.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.className = "reader-image";
        img.loading = "lazy";
        readerContainer.appendChild(img);
    });
};

if (readerContainer) {
    loadChapterForReading();
}
