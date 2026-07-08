import { auth, db, functions } from "./firebase.js";
import { doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc, arrayUnion, arrayRemove, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

// ดึง id จาก URL (เช่น manga.html?id=123)
const urlParams = new URLSearchParams(window.location.search);
const mangaId = urlParams.get('id');

let currentUser = null;
let currentCoins = 0;
let unlockedChapters = [];
let mangaDataCache = null;

// Modal Elements
const purchaseModal = document.getElementById("purchase-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const cancelBuyBtn = document.getElementById("cancel-buy-btn");
const confirmBuyBtn = document.getElementById("confirm-buy-btn");
const modalCover = document.getElementById("modal-cover");
const modalMangaTitle = document.getElementById("modal-manga-title");
const modalChapterNum = document.getElementById("modal-chapter-num");
const modalPrice = document.getElementById("modal-price");
const modalCurrentCoin = document.getElementById("modal-current-coin");
const modalPriceDeduct = document.getElementById("modal-price-deduct");
const modalRemainingCoin = document.getElementById("modal-remaining-coin");

let selectedChapter = null;

const loadingSpinner = document.getElementById("loading-spinner");
const mangaContent = document.getElementById("manga-content");

// Elements
const mangaCover = document.getElementById("manga-cover");
const mangaTitle = document.getElementById("manga-title");
const mangaAuthor = document.getElementById("manga-author");
const mangaSynopsis = document.getElementById("manga-synopsis");
const mangaTags = document.getElementById("manga-tags");
const chapterList = document.getElementById("chapter-list");

const loadMangaDetail = async () => {
    if (!mangaId) {
        document.querySelector("main").innerHTML = "<h2 style='text-align:center; color:var(--danger);'>ไม่พบเรื่องการ์ตูนที่ต้องการ</h2>";
        return;
    }

    try {
        // 1. ดึงข้อมูลเรื่องย่อ (Manga Series)
        const mangaRef = doc(db, "mangas", mangaId);
        const mangaSnap = await getDoc(mangaRef);

        if (!mangaSnap.exists()) {
            document.querySelector("main").innerHTML = "<h2 style='text-align:center; color:var(--danger);'>การ์ตูนเรื่องนี้ถูกลบไปแล้ว หรือไม่มีอยู่จริง</h2>";
            return;
        }

        const mangaData = mangaSnap.data();
        
        mangaTitle.textContent = mangaData.title;
        mangaAuthor.innerHTML = `<ion-icon name="person"></ion-icon> ${mangaData.author || "ไม่ระบุผู้แต่ง"}`;
        mangaSynopsis.textContent = mangaData.synopsis || "ไม่มีเรื่องย่อ";
        mangaCover.src = mangaData.coverUrl || 'https://via.placeholder.com/500x700?text=No+Cover';

        // แสดง Badge ประเภทเรื่อง
        const typeBadgeEl = document.getElementById("manga-type-badge");
        if (typeBadgeEl) {
            if (mangaData.type === 'novel') {
                typeBadgeEl.textContent = 'NOVEL';
                typeBadgeEl.className = 'badge-type badge-novel';
            } else if (mangaData.type === 'manhwa') {
                typeBadgeEl.textContent = 'MANHWA';
                typeBadgeEl.className = 'badge-type badge-manhwa';
            } else if (mangaData.type === 'manhua') {
                typeBadgeEl.textContent = 'MANHUA';
                typeBadgeEl.className = 'badge-type badge-manhua';
            } else if (mangaData.type === 'manthai') {
                typeBadgeEl.textContent = 'MANTHAI';
                typeBadgeEl.className = 'badge-type badge-manthai';
            } else {
                typeBadgeEl.textContent = 'MANGA';
                typeBadgeEl.className = 'badge-type badge-manga';
            }
            typeBadgeEl.style.display = 'inline-block';
            typeBadgeEl.style.position = 'static';
            typeBadgeEl.style.marginBottom = '0.8rem';
        }

        // วาด Tags
        mangaTags.innerHTML = "";
        if (mangaData.tags && Array.isArray(mangaData.tags)) {
            mangaData.tags.forEach(tag => {
                if(tag.trim() === "") return;
                const span = document.createElement("span");
                span.className = "tag";
                span.textContent = tag;
                mangaTags.appendChild(span);
            });
        }

        mangaDataCache = mangaData;
        mangaDataCache.id = mangaId; // เก็บ document ID ไว้ด้วยเพื่อใช้ตอนซื้อตอน

        // Setup Follow Button
        const followBtn = document.getElementById("follow-btn");
        if (followBtn) {
            let isFollowing = false;
            
            // Check if already following
            if (currentUser) {
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists() && userSnap.data().saved_mangas && userSnap.data().saved_mangas.includes(mangaId)) {
                    isFollowing = true;
                }
            }

            const updateFollowBtnState = () => {
                if (isFollowing) {
                    followBtn.innerHTML = `<ion-icon name="checkmark-circle"></ion-icon> กำลังติดตาม`;
                    followBtn.style.background = 'var(--success)';
                } else {
                    followBtn.innerHTML = `<ion-icon name="bookmark"></ion-icon> ติดตามเรื่องนี้`;
                    followBtn.style.background = 'var(--accent-color)';
                }
            };
            
            updateFollowBtnState();

            followBtn.addEventListener("click", async () => {
                if (!currentUser) {
                    alert("กรุณาเข้าสู่ระบบก่อนติดตามเรื่องนี้");
                    window.location.href = "login.html";
                    return;
                }
                
                try {
                    followBtn.disabled = true;
                    const userRef = doc(db, "users", currentUser.uid);
                    
                    if (isFollowing) {
                        await updateDoc(userRef, {
                            saved_mangas: arrayRemove(mangaId)
                        });
                        isFollowing = false;
                    } else {
                        await updateDoc(userRef, {
                            saved_mangas: arrayUnion(mangaId)
                        });
                        isFollowing = true;
                    }
                    
                    updateFollowBtnState();
                } catch (error) {
                    console.error("Error updating follow state:", error);
                    alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
                } finally {
                    followBtn.disabled = false;
                }
            });
        }

        // 2. ดึงรายการตอน (Chapters)
        const q = query(
            collection(db, "chapters"), 
            where("mangaId", "==", mangaId),
            orderBy("chapterNumber", "desc") // ตอนล่าสุดอยู่บน
        );
        
        const chaptersSnap = await getDocs(q);
        
        chapterList.innerHTML = "";
        
        if (chaptersSnap.empty) {
            chapterList.innerHTML = "<div style='padding: 2rem; text-align: center; color: var(--text-secondary);'>ยังไม่มีตอนสำหรับเรื่องนี้</div>";
        } else {
            chaptersSnap.forEach(docSnap => {
                const chapterData = docSnap.data();
                const chId = docSnap.id;
                
                const item = document.createElement("a");
                item.className = "chapter-item";
                
                const isFree = chapterData.isFree;
                const isUnlocked = isFree || unlockedChapters.includes(chId);
                
                if (isUnlocked) {
                    item.href = `read.html?chapterId=${chId}`;
                } else {
                    item.href = "javascript:void(0)";
                    item.onclick = () => openPurchaseModal(chId, chapterData);
                }
                
                // แปลงวันที่ (ถ้ามี)
                let dateStr = "";
                if (chapterData.createdAt) {
                    const d = chapterData.createdAt.toDate();
                    dateStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                }

                // ปุ่มสไตล์ Ridibooks
                let buttonHtml = "";
                if (isUnlocked) {
                    buttonHtml = `<button style="padding: 0.5rem 1.2rem; border-radius: 6px; background: rgba(255,255,255,0.1); color: var(--text-primary); border: 1px solid var(--card-border); font-weight: 500; cursor: pointer; transition: all 0.2s;">อ่าน</button>`;
                } else {
                    buttonHtml = `<div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.3rem;">
                           <button style="padding: 0.5rem 1.2rem; border-radius: 6px; background: var(--danger); color: #fff; border: none; font-weight: 500; cursor: pointer; box-shadow: 0 2px 8px rgba(229, 57, 53, 0.3); transition: all 0.2s;">ซื้อตอน</button>
                           <span style="color: var(--danger); font-size: 0.75rem; font-weight: 600;"><ion-icon name="cash"></ion-icon> ${chapterData.price} เหรียญ</span>
                       </div>`;
                }

                item.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                        <div class="chapter-name">ตอนที่ ${chapterData.chapterNumber} ${!isUnlocked ? '<ion-icon name="lock-closed" style="font-size: 0.8rem; margin-left: 5px; color: var(--text-secondary);"></ion-icon>' : ''}</div>
                        <div class="chapter-meta">${dateStr}</div>
                    </div>
                    <div style="flex-shrink: 0; margin-left: 1rem;">
                        ${buttonHtml}
                    </div>
                `;
                
                chapterList.appendChild(item);
            });
        }

        // แสดงผล
        loadingSpinner.classList.add("hidden");
        mangaContent.classList.remove("hidden");

    } catch (error) {
        console.error("Error loading manga detail:", error);
        document.querySelector("main").innerHTML = `<h2 style='text-align:center; color:var(--danger);'>เกิดข้อผิดพลาด: ${error.message}</h2>`;
    }
};

// Modal Logic
const openPurchaseModal = (chId, chapterData) => {
    if (!currentUser) {
        alert("กรุณาเข้าสู่ระบบก่อนซื้อตอน");
        window.location.href = "login.html";
        return;
    }

    selectedChapter = { id: chId, ...chapterData };
    
    modalCover.src = mangaDataCache.coverUrl || 'https://via.placeholder.com/500x700';
    modalMangaTitle.textContent = mangaDataCache.title;
    modalChapterNum.textContent = chapterData.chapterNumber;
    modalPrice.textContent = chapterData.price;
    modalCurrentCoin.textContent = currentCoins.toFixed(2);
    modalPriceDeduct.textContent = chapterData.price.toFixed(2);
    
    const remaining = currentCoins - chapterData.price;
    modalRemainingCoin.textContent = `🪙 ${remaining.toFixed(2)}`;
    
    if (remaining < 0) {
        modalRemainingCoin.style.color = "var(--danger)";
        confirmBuyBtn.innerHTML = `<ion-icon name="wallet"></ion-icon> ไปเติมเหรียญ`;
        confirmBuyBtn.onclick = () => window.location.href = "topup.html";
    } else {
        modalRemainingCoin.style.color = "var(--success)";
        confirmBuyBtn.innerHTML = `<ion-icon name="cart"></ion-icon> ยืนยันการซื้อ`;
        confirmBuyBtn.onclick = handlePurchase;
    }

    purchaseModal.classList.remove("hidden");
    purchaseModal.style.display = "flex";
};

const closePurchaseModal = () => {
    purchaseModal.classList.add("hidden");
    purchaseModal.style.display = "none";
    selectedChapter = null;
};

if (closeModalBtn) closeModalBtn.addEventListener("click", closePurchaseModal);
if (cancelBuyBtn) cancelBuyBtn.addEventListener("click", closePurchaseModal);

const handlePurchase = async () => {
    if (!currentUser || !selectedChapter) return;
    
    if (currentCoins < selectedChapter.price) {
        alert("เหรียญไม่พอ กรุณาเติมเหรียญ");
        window.location.href = "topup.html";
        return;
    }

    confirmBuyBtn.disabled = true;
    confirmBuyBtn.textContent = "กำลังดำเนินการ...";

    try {
        const buyChapterFn = httpsCallable(functions, 'buyChapter');
        
        await buyChapterFn({
            mangaId: mangaDataCache.id,
            chapterId: selectedChapter.id,
            chapterNumber: selectedChapter.chapterNumber,
            price: selectedChapter.price,
            authorId: mangaDataCache && mangaDataCache.ownerType === "partner" && mangaDataCache.authorId ? mangaDataCache.authorId : "admin",
            revenueShare: mangaDataCache && mangaDataCache.revenueShare ? mangaDataCache.revenueShare : 70
        });
        
        const purchasedChapterId = selectedChapter.id;
        confirmBuyBtn.textContent = "สำเร็จ! กำลังเข้าสู่เนื้อหา...";
        confirmBuyBtn.style.background = "var(--success)";
        
        setTimeout(() => {
            closePurchaseModal();
            window.location.href = `read.html?chapterId=${purchasedChapterId}`;
        }, 800);
        
    } catch (error) {
        console.error("Error purchasing chapter:", error);
        if (error.code === "functions/failed-precondition") {
            alert("เหรียญไม่เพียงพอ กรุณาเติมเหรียญ");
        } else if (error.code === "functions/already-exists") {
            alert("คุณได้ปลดล็อกตอนนี้ไปแล้ว");
            window.location.href = `read.html?chapterId=${selectedChapter.id}`;
        } else {
            alert("เกิดข้อผิดพลาดในการซื้อตอน: " + error.message);
        }
        confirmBuyBtn.disabled = false;
        confirmBuyBtn.innerHTML = `<ion-icon name="cart"></ion-icon> ยืนยันการซื้อ`;
    }
};

// ติดตาม Auth State
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            currentCoins = data.coins || 0;
            unlockedChapters = data.unlockedChapters || [];
        }
    }
    // โหลดหน้าเมื่อรู้ Auth
    loadMangaDetail();
});
