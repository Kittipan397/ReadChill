import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const tabHistoryBtn = document.getElementById("tab-history");
const tabSavedBtn = document.getElementById("tab-saved");
const sectionHistory = document.getElementById("section-history");
const sectionSaved = document.getElementById("section-saved");

const historyGrid = document.getElementById("history-grid");
const savedGrid = document.getElementById("saved-grid");
const historyLoading = document.getElementById("history-loading");
const savedLoading = document.getElementById("saved-loading");
const historyEmpty = document.getElementById("history-empty");
const savedEmpty = document.getElementById("saved-empty");

let currentUser = null;

// Tab Switching Logic
window.switchTab = (tabName) => {
    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    window.history.pushState({}, '', url);

    // Update active button
    if (tabName === 'history') {
        tabHistoryBtn.classList.add('active');
        tabSavedBtn.classList.remove('active');
        sectionHistory.classList.remove('hidden');
        sectionSaved.classList.add('hidden');
        loadHistory();
    } else {
        tabSavedBtn.classList.add('active');
        tabHistoryBtn.classList.remove('active');
        sectionSaved.classList.remove('hidden');
        sectionHistory.classList.add('hidden');
        loadSaved();
    }
};

// Parse URL on load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') || 'history'; // default to history
    window.switchTab(tab);
});

// Load History
async function loadHistory() {
    if (!currentUser) return;
    
    historyLoading.classList.remove("hidden");
    historyGrid.innerHTML = '';
    historyEmpty.classList.add("hidden");

    try {
        // Fetch reading history from user document or subcollection
        // (Assuming you have a subcollection or array. We'll use mock data structure for now if empty)
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        let history = [];
        if (userSnap.exists() && userSnap.data().reading_history) {
            history = userSnap.data().reading_history;
        }

        historyLoading.classList.add("hidden");

        if (history.length === 0) {
            historyEmpty.classList.remove("hidden");
            historyEmpty.innerHTML = `
                <ion-icon name="time-outline" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></ion-icon>
                <p>คุณยังไม่ได้เริ่มอ่านการ์ตูนเรื่องไหนเลย!</p>
                <a href="index.html" class="btn-primary" style="display: inline-block; margin-top: 1rem;">ค้นหาการ์ตูน</a>
            `;
            return;
        }

        // Render history items (Requires manga data)
        historyGrid.innerHTML = history.map(item => {
            // Handle timestamp: could be Firestore Timestamp, plain Date string, or object
            let displayDate;
            if (item.timestamp) {
                if (typeof item.timestamp.toDate === 'function') {
                    displayDate = item.timestamp.toDate();
                } else if (item.timestamp.seconds) {
                    displayDate = new Date(item.timestamp.seconds * 1000);
                } else {
                    displayDate = new Date(item.timestamp);
                }
            } else {
                displayDate = new Date();
            }
            const dateStr = displayDate.toLocaleDateString('th-TH');

            return `
            <div class="manga-card">
                <a href="read.html?chapterId=${item.chapterId}" style="text-decoration:none;">
                    <div class="cover-wrapper">
                        <img src="${item.coverUrl || 'https://via.placeholder.com/500x700?text=No+Cover'}" alt="${item.title}" class="manga-cover" loading="lazy">
                        <div class="badge-top-right">อ่านล่าสุด</div>
                        <div class="reading-progress" style="position:absolute; bottom:0; width:100%; height:4px; background:rgba(0,0,0,0.5); z-index:5;">
                            <div class="reading-progress-bar" style="width: ${item.progressPercent || 0}%; height:100%; background:var(--accent-color);"></div>
                        </div>
                    </div>
                    <div class="manga-info">
                        <h3 class="manga-title">${item.title}</h3>
                        <div class="chapter-list">
                            <div class="chapter-item-row" style="justify-content:center;">
                                <span style="color:var(--accent-color);">อ่านถึงตอนที่ ${item.chapterNumber}</span>
                            </div>
                            <div class="chapter-item-row" style="justify-content:center; background:transparent; font-size:0.7rem; color:var(--text-secondary); padding:0;">
                                อัปเดตเมื่อ: ${dateStr}
                            </div>
                        </div>
                    </div>
                </a>
            </div>
        `;
        }).join('');

    } catch (error) {
        console.error("Error loading history:", error);
        historyLoading.classList.add("hidden");
        historyEmpty.classList.remove("hidden");
        historyEmpty.innerHTML = `<p style="color: var(--danger);">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>`;
    }
}

// Load Saved Mangas
async function loadSaved() {
    if (!currentUser) return;

    savedLoading.classList.remove("hidden");
    savedGrid.innerHTML = '';
    savedEmpty.classList.add("hidden");

    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        let savedIds = [];
        if (userSnap.exists() && userSnap.data().saved_mangas) {
            savedIds = userSnap.data().saved_mangas;
        }

        savedLoading.classList.add("hidden");

        if (savedIds.length === 0) {
            savedEmpty.classList.remove("hidden");
            savedEmpty.innerHTML = `
                <ion-icon name="bookmark-outline" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></ion-icon>
                <p>คุณยังไม่ได้บันทึกการ์ตูนเรื่องไหนไว้เลย</p>
                <a href="index.html" class="btn-primary" style="display: inline-block; margin-top: 1rem;">สำรวจการ์ตูน</a>
            `;
            return;
        }

        // Fetch manga details for saved IDs
        // Note: Firestore 'in' query has a max of 10. You may need to chunk this in production.
        const mangaRef = collection(db, "mangas");
        const q = query(mangaRef, where("__name__", "in", savedIds.slice(0, 10))); 
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
             savedEmpty.classList.remove("hidden");
             return;
        }

        let html = '';
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let typeBadge = '';
              if (data.type === 'novel') typeBadge = '<div class="badge-type badge-novel">NOVEL</div>';
              else if (data.type === 'manhwa') typeBadge = '<div class="badge-type badge-manhwa">MANHWA</div>';
              else if (data.type === 'manhua') typeBadge = '<div class="badge-type badge-manhua">MANHUA</div>';
              else if (data.type === 'manthai') typeBadge = '<div class="badge-type badge-manthai">MANTHAI</div>';
              else typeBadge = '<div class="badge-type badge-manga">MANGA</div>';
            html += `
                <div class="manga-card" onclick="window.location.href='manga.html?id=${docSnap.id}'">
                    <div class="cover-wrapper">
                        <img src="${data.coverUrl || data.coverImage || 'https://via.placeholder.com/500x700?text=No+Cover'}" alt="${data.title}" class="manga-cover" loading="lazy">
                        ${typeBadge}
                        <div class="badge-top-right">${data.tags && data.tags[0] ? data.tags[0] : (data.isPremium ? 'PREMIUM' : 'MANHWA')}</div>
                        <button class="unsave-btn" onclick="event.stopPropagation(); window.removeSaved('${docSnap.id}')" title="ลบออกจากที่บันทึกไว้">
                            <ion-icon name="bookmark"></ion-icon>
                        </button>
                    </div>
                    <div class="manga-info">
                        <h3 class="manga-title">${data.title}</h3>
                        <div class="chapter-list">
                            <div class="chapter-item-row" style="justify-content:center;">
                                <span><ion-icon name="star" style="color:gold;"></ion-icon> ${data.rating || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        savedGrid.innerHTML = html;

    } catch (error) {
        console.error("Error loading saved:", error);
        savedLoading.classList.add("hidden");
        savedEmpty.classList.remove("hidden");
        savedEmpty.innerHTML = `<p style="color: var(--danger);">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>`;
    }
}

// Remove from saved — ลบจริงจาก Firestore
window.removeSaved = async (mangaId) => {
    if (!currentUser) {
        alert("กรุณาเข้าสู่ระบบก่อน");
        return;
    }
    
    if (!confirm("ต้องการลบเรื่องนี้ออกจากรายการบันทึกหรือไม่?")) return;
    
    try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            saved_mangas: arrayRemove(mangaId)
        });
        
        // Reload saved list
        loadSaved();
    } catch (error) {
        console.error("Error removing saved manga:", error);
        alert("เกิดข้อผิดพลาดในการลบ: " + error.message);
    }
};

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        // User logged in, check which tab is active and load
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab') || 'history';
        if (tab === 'history') loadHistory();
        if (tab === 'saved') loadSaved();
    } else {
        // Not logged in
        historyLoading.classList.add("hidden");
        savedLoading.classList.add("hidden");
        
        historyEmpty.classList.remove("hidden");
        historyEmpty.innerHTML = `
            <ion-icon name="lock-closed-outline" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></ion-icon>
            <p>กรุณาเข้าสู่ระบบเพื่อดูประวัติการอ่าน</p>
            <a href="login.html" class="btn-primary" style="display: inline-block; margin-top: 1rem;">เข้าสู่ระบบ</a>
        `;

        savedEmpty.classList.remove("hidden");
        savedEmpty.innerHTML = `
            <ion-icon name="lock-closed-outline" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;"></ion-icon>
            <p>กรุณาเข้าสู่ระบบเพื่อดูเรื่องที่บันทึกไว้</p>
            <a href="login.html" class="btn-primary" style="display: inline-block; margin-top: 1rem;">เข้าสู่ระบบ</a>
        `;
    }
});
