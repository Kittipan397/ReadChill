// ==========================================
// ลอจิกสำหรับหน้า read.html
// ==========================================
import { auth, db, functions } from "./firebase.js";
import { doc, getDoc, updateDoc, arrayUnion, increment, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

const readerContainer = document.getElementById("reader-container");
const novelReaderContainer = document.getElementById("novel-reader-container");
const chapterHeader = document.getElementById("chapter-header");
const chapterTitle = document.getElementById("chapter-title");
const lockedOverlay = document.getElementById("locked-overlay");
const buyChapterBtn = document.getElementById("buy-chapter-btn");
const loadingSpinner = document.getElementById("loading-spinner");

let currentUser = null;
let currentCoins = 0;
let mangaDataCache = null;
let currentChapterData = null;
let currentChapterId = null;

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

const loadChapterForReading = async () => {
    // ดึง id จาก URL (เช่น read.html?chapterId=xyz123)
    const urlParams = new URLSearchParams(window.location.search);
    const chapterId = urlParams.get("chapterId") || urlParams.get("id"); // รองรับทั้งสองแบบเผื่อไว้

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
        currentChapterData = chapterData;
        currentChapterId = chapterId;

        // ดึงชื่อเรื่องการ์ตูนจาก mangaId
        let mangaTitleText = "ไม่ระบุเรื่อง";
        if (chapterData.mangaId) {
            const mangaRef = doc(db, "mangas", chapterData.mangaId);
            const mangaSnap = await getDoc(mangaRef);
            if (mangaSnap.exists()) {
                mangaDataCache = mangaSnap.data();
                mangaTitleText = mangaDataCache.title;
            }
        }

        // ดึง Custom Fonts ของผู้เขียนมาแสดงผล
        if (mangaDataCache && mangaDataCache.authorId) {
            try {
                const authorRef = doc(db, "users", mangaDataCache.authorId);
                const authorSnap = await getDoc(authorRef);
                if (authorSnap.exists()) {
                    const customFonts = authorSnap.data().custom_fonts || [];
                    if (customFonts.length > 0) {
                        let styleStr = customFonts.map(f => `
                            @font-face { font-family: '${f.name}'; src: url('${f.url}'); }
                            .ql-font-${f.name} { font-family: '${f.name}'; }
                        `).join('\n');
                        
                        let styleTag = document.getElementById('custom-fonts-style');
                        if (!styleTag) {
                            styleTag = document.createElement('style');
                            styleTag.id = 'custom-fonts-style';
                            document.head.appendChild(styleTag);
                        }
                        styleTag.innerHTML = styleStr;
                    }
                }
            } catch (err) {
                console.error("Error loading custom fonts for reader:", err);
            }
        }

        chapterTitle.textContent = `${mangaTitleText} (ตอนที่ ${chapterData.chapterNumber})`;
        chapterHeader.classList.remove("hidden");
        
        // Setup Reader Nav
        if (typeof setupReaderNav === "function") {
            setupReaderNav(chapterData.mangaId, chapterData.chapterNumber);
        }
        
        // Setup Reader Top Bar
        const backBtn = document.getElementById("back-to-manga-btn");
        const topTitle = document.getElementById("reader-top-title");
        if (backBtn) {
            backBtn.href = `manga.html?id=${chapterData.mangaId}`;
        }
        if (topTitle) {
            topTitle.textContent = `${mangaTitleText} - ตอนที่ ${chapterData.chapterNumber}`;
        }
        document.title = `${mangaTitleText} ตอนที่ ${chapterData.chapterNumber} - อ่านการ์ตูน ReadChill`;

        if (chapterData.isFree) {
            // ถ้าอ่านฟรี โหลดรูปได้เลย
            if (chapterData.content) {
                renderNovel(chapterData.content);
            } else {
                renderImages(chapterData.imageUrls);
            }
            saveReadingHistory(chapterData);
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
        currentUser = user;
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
                    currentCoins = userData.coins || 0;
                    const unlocked = userData.unlockedChapters || [];
                    
                    if (unlocked.includes(chapterId) || userData.role === "admin") {
                        // ปลดล็อกแล้ว หรือเป็น admin โหลดรูปได้เลย
                        lockedOverlay.classList.add("hidden");
                        if (chapterData.content) {
                            renderNovel(chapterData.content);
                        } else {
                            renderImages(chapterData.imageUrls);
                        }
                        saveReadingHistory(chapterData);
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
    buyChapterBtn.innerHTML = `<ion-icon name="cart"></ion-icon> ซื้อตอน (${price || 0} 🪙)`;
    
    buyChapterBtn.onclick = () => openPurchaseModal(chapterId, currentChapterData);
};

const renderNovel = (content) => {
    loadingSpinner.classList.add("hidden");
    readerContainer.classList.add("hidden");
    
    if (novelReaderContainer) {
        novelReaderContainer.classList.remove("hidden");
        novelReaderContainer.innerHTML = content;
    }
    
    const readerImageCounter = document.getElementById("reader-image-counter");
    if (readerImageCounter) {
        readerImageCounter.style.display = "none";
    }
    
    setTimeout(updateReadingProgress, 300);
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
        let finalUrl = url;
        // Fix for all types of Google Drive links to use full resolution
        const ucMatch = url.match(/uc\?export=view&id=([a-zA-Z0-9_-]+)/);
        const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
        
        let fileId = null;
        if (ucMatch && ucMatch[1]) fileId = ucMatch[1];
        else if (lh3Match && lh3Match[1]) fileId = lh3Match[1];
        else if (dMatch && dMatch[1]) fileId = dMatch[1];

        if (fileId) {
            finalUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
        
        // อัปเกรดความคมชัดของภาพที่มาจาก Cloudinary ให้เป็น q_100 (คุณภาพสูงสุด 100%)
        if (finalUrl.includes('res.cloudinary.com')) {
            finalUrl = finalUrl.replace('f_auto,q_auto', 'f_auto,q_100');
            // กรณีไม่มี q_auto ให้เติมเข้าไปเลย
            if (!finalUrl.includes('q_100')) {
                finalUrl = finalUrl.replace('f_auto', 'f_auto,q_100');
            }
        }

        const img = document.createElement("img");
        img.src = finalUrl;
        img.className = "reader-image";
        img.loading = "lazy";
        // Add load event listener to update progress when images start rendering
        img.onload = () => updateReadingProgress();
        readerContainer.appendChild(img);
    });
    
    // Initial call
    setTimeout(updateReadingProgress, 300);
};

if (readerContainer) {
    loadChapterForReading();
}

const saveReadingHistory = async (chapterData) => {
    if (!chapterData || !chapterData.mangaId || !currentChapterId || !mangaDataCache) return;
    const currentMangaId = chapterData.mangaId;
    
    const doSave = async (user) => {
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            
            let history = [];
            if (userSnap.exists() && userSnap.data().reading_history) {
                history = userSnap.data().reading_history;
            }
            
            // Remove existing entry for THIS mangaId
            history = history.filter(item => item.mangaId !== currentMangaId);
            
            // Add new entry to the BEGINNING
            history.unshift({
                mangaId: currentMangaId,
                chapterId: currentChapterId,
                title: mangaDataCache.title || "",
                coverUrl: mangaDataCache.coverUrl || "",
                chapterNumber: chapterData.chapterNumber || 1,
                progressPercent: 100,
                timestamp: new Date()
            });
            
            // Keep only top 50 histories
            if (history.length > 50) history = history.slice(0, 50);
            
            await updateDoc(userRef, { reading_history: history });
        } catch (error) {
            console.error("Error saving history:", error);
        }
    };

    if (currentUser) {
        doSave(currentUser);
    } else {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                doSave(user);
                setTimeout(() => {
                    if (unsubscribe) unsubscribe();
                }, 0);
            }
        });
    }
};

// Modal Logic
const openPurchaseModal = (chId, chapterData) => {
    if (!currentUser) {
        alert("กรุณาเข้าสู่ระบบก่อนซื้อตอน");
        window.location.href = "login.html";
        return;
    }
    
    modalCover.src = (mangaDataCache && mangaDataCache.coverUrl) ? mangaDataCache.coverUrl : 'https://via.placeholder.com/500x700';
    modalMangaTitle.textContent = (mangaDataCache && mangaDataCache.title) ? mangaDataCache.title : 'ไม่ระบุเรื่อง';
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
};

if (closeModalBtn) closeModalBtn.addEventListener("click", closePurchaseModal);
if (cancelBuyBtn) cancelBuyBtn.addEventListener("click", closePurchaseModal);

const handlePurchase = async () => {
    if (!currentUser || !currentChapterId || !currentChapterData) return;
    
    if (currentCoins < currentChapterData.price) {
        alert("เหรียญไม่พอ กรุณาเติมเหรียญ");
        window.location.href = "topup.html";
        return;
    }

    confirmBuyBtn.disabled = true;
    confirmBuyBtn.textContent = "กำลังดำเนินการ...";

    try {
        // เรียกใช้งาน Cloud Function `buyChapter` แทนการหักเงินฝั่ง Client
        const buyChapterFn = httpsCallable(functions, 'buyChapter');
        
        await buyChapterFn({
            mangaId: currentChapterData.mangaId,
            chapterId: currentChapterId,
            chapterNumber: currentChapterData.chapterNumber,
            price: currentChapterData.price,
            authorId: mangaDataCache && mangaDataCache.ownerType === "partner" && mangaDataCache.authorId ? mangaDataCache.authorId : "admin",
            revenueShare: mangaDataCache && mangaDataCache.revenueShare ? mangaDataCache.revenueShare : 70
        });
        
        confirmBuyBtn.textContent = "สำเร็จ! ขอให้อ่านให้สนุกครับ";
        confirmBuyBtn.style.background = "var(--success)";
        
        setTimeout(() => {
            closePurchaseModal();
            lockedOverlay.classList.add("hidden");
            
            // อัปเดตเหรียญปัจจุบันในตัวแปรเผื่อไว้
            currentCoins -= currentChapterData.price;
            
            // รีโหลดเนื้อหาตอน
            loadChapterData(currentChapterId);
            
            if (currentChapterData.content) {
                renderNovel(currentChapterData.content);
            } else {
                renderImages(currentChapterData.imageUrls);
            }
            saveReadingHistory(currentChapterData);
        }, 800);
        
    } catch (error) {
        console.error("Error purchasing chapter:", error);
        // Catch HTTP Callable errors (e.g., insufficient coins)
        if (error.code === "functions/failed-precondition") {
            alert("เหรียญไม่เพียงพอ กรุณาเติมเหรียญ");
        } else if (error.code === "functions/already-exists") {
            alert("คุณได้ปลดล็อกตอนนี้ไปแล้ว");
        } else {
            alert("เกิดข้อผิดพลาดในการซื้อตอน กรุณาลองใหม่อีกครั้ง");
        }
        confirmBuyBtn.disabled = false;
        confirmBuyBtn.innerHTML = `<ion-icon name="cart"></ion-icon> ยืนยันการซื้อ`;
    }
};

// ==========================================
// Reader Navigation Bar Logic
// ==========================================
const readerNavBar = document.getElementById("reader-nav-bar");
const readerChapterSelect = document.getElementById("reader-chapter-select");
const readerPrevBtn = document.getElementById("reader-prev-btn");
const readerNextBtn = document.getElementById("reader-next-btn");

const setupReaderNav = async (mangaId, currentChNum) => {
    // Show the nav bar immediately so progress bar works even if chapter fetch fails
    readerNavBar.classList.remove("hidden");
    
    if (!mangaId) return;

    try {
        // Fetch all chapters for this manga, sort locally to avoid missing index error
        const q = query(
            collection(db, "chapters"),
            where("mangaId", "==", mangaId)
        );
        const snap = await getDocs(q);
        
        if (snap.empty) return;

        const chaptersList = [];
        snap.forEach(docSnap => {
            chaptersList.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort chapters numerically by chapterNumber
        chaptersList.sort((a, b) => parseFloat(a.chapterNumber) - parseFloat(b.chapterNumber));

        // Populate Select
        readerChapterSelect.innerHTML = "";
        let currentIndex = -1;

        chaptersList.forEach((ch, index) => {
            const option = document.createElement("option");
            option.value = ch.id;
            option.textContent = `ตอนที่ ${ch.chapterNumber}`;
            if (ch.chapterNumber === currentChNum) {
                option.selected = true;
                currentIndex = index;
            }
            readerChapterSelect.appendChild(option);
        });

        // Setup Prev/Next Buttons
        if (currentIndex > 0) {
            const prevCh = chaptersList[currentIndex - 1];
            readerPrevBtn.onclick = () => window.location.href = `read.html?chapterId=${prevCh.id}`;
            readerPrevBtn.disabled = false;
        } else {
            readerPrevBtn.disabled = true;
        }

        if (currentIndex < chaptersList.length - 1 && currentIndex !== -1) {
            const nextCh = chaptersList[currentIndex + 1];
            readerNextBtn.onclick = () => window.location.href = `read.html?chapterId=${nextCh.id}`;
            readerNextBtn.disabled = false;
        } else {
            readerNextBtn.disabled = true;
        }

        // Setup Select onChange
        readerChapterSelect.addEventListener("change", (e) => {
            if (e.target.value) {
                window.location.href = `read.html?chapterId=${e.target.value}`;
            }
        });

    } catch (error) {
        console.error("Error setting up reader nav:", error);
    }
};

// ==========================================
// Auto-hide Reader Navbars on Scroll
// ==========================================
let lastScrollTop = 0;
let isScrolling = false;

window.addEventListener("scroll", () => {
    isScrolling = true;
    updateReadingProgress();
}, { passive: true });

setInterval(() => {
    if (isScrolling) {
        handleScrollAutoHiding();
        isScrolling = false;
    }
}, 250);

// ==========================================
// Reading Progress & Image Counter
// ==========================================
function updateReadingProgress() {
    // 1. Update Progress Bar
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    let scrolled = 0;
    if (height > 0) {
        scrolled = (winScroll / height) * 100;
    }
    const progressBar = document.getElementById("reader-progress-bar");
    if (progressBar) {
        progressBar.style.width = scrolled + "%";
    }

    // 2. Update Image Counter
    const images = document.querySelectorAll(".reader-image");
    if (images.length === 0) return;
    
    let currentIndex = 0;
    const viewportCenter = window.innerHeight / 2;
    
    for (let i = 0; i < images.length; i++) {
        const rect = images[i].getBoundingClientRect();
        if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
            currentIndex = i;
            break;
        } else if (rect.top > viewportCenter && i === 0) {
            currentIndex = 0;
            break;
        } else if (rect.top > viewportCenter && i > 0) {
            currentIndex = i - 1;
            break;
        }
    }
    
    if (winScroll + window.innerHeight >= document.documentElement.scrollHeight - 50) {
        currentIndex = images.length - 1;
    }
    
    const counterDisplay = document.getElementById("reader-image-counter");
    if (counterDisplay) {
        counterDisplay.textContent = `${currentIndex + 1}/${images.length}`;
    }
}

function handleScrollAutoHiding() {
    const st = window.pageYOffset || document.documentElement.scrollTop;
    const readerTopBar = document.getElementById("reader-top-bar");
    const readerNavBar = document.getElementById("reader-nav-bar");
    const scrollTopBtn = document.getElementById("scroll-top-btn");
    
    // Toggle scroll top button visibility
    if (scrollTopBtn) {
        if (st > 300) {
            scrollTopBtn.classList.add("visible");
        } else {
            scrollTopBtn.classList.remove("visible");
        }
    }

    if (!readerTopBar || !readerNavBar) return;

    // Always show if at the very top
    if (st <= 100) {
        readerTopBar.classList.remove("nav-hidden-top");
        readerNavBar.classList.remove("nav-hidden-bottom");
        lastScrollTop = st;
        return;
    }

    // Scroll Down -> Hide
    if (st > lastScrollTop) {
        readerTopBar.classList.add("nav-hidden-top");
        readerNavBar.classList.add("nav-hidden-bottom");
    } 
    // Scroll Up -> Show
    else if (st < lastScrollTop) {
        readerTopBar.classList.remove("nav-hidden-top");
        readerNavBar.classList.remove("nav-hidden-bottom");
    }

    // Reached bottom -> Show navbars
    if ((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight - 50) {
        readerNavBar.classList.remove("nav-hidden-bottom");
        readerTopBar.classList.remove("nav-hidden-top");
    }

    lastScrollTop = st;
}

// Setup Scroll to Top Button
document.addEventListener("DOMContentLoaded", () => {
    const scrollTopBtn = document.getElementById("scroll-top-btn");
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
});
