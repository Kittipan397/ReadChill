import { db } from "./firebase.js";
import { collection, getDocs, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { timeAgo } from "./utils.js";

const mangaContainer = document.getElementById("manga-container");
const novelContainer = document.getElementById("novel-container");
const mangaLoading = document.getElementById("manga-loading");
const novelLoading = document.getElementById("novel-loading");

const loadMangas = async () => {
    mangaLoading.classList.remove("hidden");
    novelLoading.classList.remove("hidden");
    mangaContainer.innerHTML = "";
    novelContainer.innerHTML = "";

    try {
        const q = query(collection(db, "mangas"), orderBy("createdAt", "desc"), limit(40));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            mangaContainer.innerHTML = "<p style='color: var(--text-secondary); grid-column: 1 / -1; text-align: center;'>ยังไม่มีเรื่องในระบบ</p>";
            novelContainer.innerHTML = "<p style='color: var(--text-secondary); grid-column: 1 / -1; text-align: center;'>ยังไม่มีนิยายในระบบ</p>";
            return;
        }

        let mangaCount = 0;
        let novelCount = 0;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            // ตรวจสอบว่ามีแท็กไหมเพื่อทำป้าย (Mockup ง่ายๆ)
            const badgeClass = data.isPremium ? "paid" : "free";
            const badgeText = data.isPremium ? "พรีเมียม" : (data.tags && data.tags[0] ? data.tags[0] : "ฟรี");
            const card = document.createElement("div");
            card.className = "manga-card";
            card.onclick = () => {
                window.location.href = `manga.html?id=${id}`;
            };

            const coverUrl = data.coverUrl || 'https://via.placeholder.com/400x600?text=No+Cover';
            
            // Add Badge based on type
            let badgeHtml = '';
            if (data.type === 'novel') {
                badgeHtml = '<div class="badge-type badge-novel">NOVEL</div>';
            } else if (data.type === 'manhwa') {
                badgeHtml = '<div class="badge-type badge-manhwa">MANHWA</div>';
            } else if (data.type === 'manhua') {
                badgeHtml = '<div class="badge-type badge-manhua">MANHUA</div>';
            } else if (data.type === 'manthai') {
                badgeHtml = '<div class="badge-type badge-manthai">MANTHAI</div>';
            } else {
                badgeHtml = '<div class="badge-type badge-manga">MANGA</div>';
            }

            let colorBadge = data.type !== 'novel' ? '<div class="badge-bottom-left"><ion-icon name="color-palette"></ion-icon> COLOR</div>' : '';

            card.innerHTML = `
                <div class="cover-wrapper">
                    ${badgeHtml}
                    ${colorBadge}
                    <img src="${coverUrl}" alt="${data.title}" class="manga-cover" loading="lazy">
                </div>
                <div class="manga-info">
                    <h3 class="manga-title">${data.title}</h3>
                    <div class="chapter-list" id="idx-chapter-list-${id}">
                        <!-- chapters will be loaded here -->
                    </div>
                </div>
            `;
            
            if (data.type === 'novel') {
                novelContainer.appendChild(card);
                novelCount++;
            } else {
                mangaContainer.appendChild(card);
                mangaCount++;
            }

            // Render chapters from cached latestChapters array or fetch dynamically
            const listEl = document.getElementById(`idx-chapter-list-${id}`);
            if (listEl) {
                if (!data.latestChapters || data.latestChapters.length === 0) {
                    // Fallback to fetch from chapters collection
                    const chQ = query(collection(db, "chapters"), where("mangaId", "==", id), orderBy("chapterNumber", "desc"), limit(2));
                    getDocs(chQ).then(chSnap => {
                        if (chSnap.empty) {
                            listEl.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-secondary); padding-top: 0.5rem;">ยังไม่มีตอน</div>';
                        } else {
                            let html = '';
                            chSnap.forEach(docSnapCh => {
                                const chData = docSnapCh.data();
                                const timeStr = chData.createdAt ? timeAgo(chData.createdAt.toDate()) : 'ไม่นานมานี้';
                                const isPremium = !chData.isFree;
                                html += `
                                    <div class="chapter-item-row">
                                        <span>ตอนที่ ${chData.chapterNumber} ${isPremium ? '<ion-icon name="lock-closed" style="font-size: 0.8rem; margin-left: 5px; color: var(--text-secondary);"></ion-icon>' : ''}</span>
                                        <span class="chapter-time">${timeStr}</span>
                                    </div>
                                `;
                            });
                            listEl.innerHTML = html;
                        }
                    }).catch(err => {
                        console.error("Error fetching chapters for fallback:", err);
                        listEl.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-secondary); padding-top: 0.5rem;">ยังไม่มีตอน</div>';
                    });
                } else {
                    let html = '';
                    data.latestChapters.forEach(chData => {
                        // Check if createdAt is string or timestamp
                        let d = new Date();
                        if (chData.createdAt) {
                            d = (typeof chData.createdAt === 'string') ? new Date(chData.createdAt) : chData.createdAt.toDate();
                        }
                        const timeStr = timeAgo(d);
                        const isPremium = !chData.isFree;
                        
                        html += `
                            <div class="chapter-item-row">
                                <span>ตอนที่ ${chData.chapterNumber} ${isPremium ? '<ion-icon name="lock-closed" style="font-size: 0.8rem; margin-left: 5px; color: var(--text-secondary);"></ion-icon>' : ''}</span>
                                <span class="chapter-time">${timeStr}</span>
                            </div>
                        `;
                    });
                    listEl.innerHTML = html;
                }
            }
        });
        
        if (mangaCount === 0) {
            mangaContainer.innerHTML = "<p style='color: var(--text-secondary); grid-column: 1 / -1; text-align: center;'>ยังไม่มีมังงะ/การ์ตูนในระบบ</p>";
        }
        if (novelCount === 0) {
            novelContainer.innerHTML = "<p style='color: var(--text-secondary); grid-column: 1 / -1; text-align: center;'>ยังไม่มีนิยายในระบบ</p>";
        }

    } catch (error) {
        console.error("Error loading items:", error);
        mangaContainer.innerHTML = "<p style='color: var(--danger); grid-column: 1 / -1; text-align: center;'>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>";
    } finally {
        mangaLoading.classList.add("hidden");
        novelLoading.classList.add("hidden");
    }
};

// เริ่มโหลดข้อมูล
loadMangas();
