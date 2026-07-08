import { db } from "./firebase.js";
import { collection, getDocs, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { timeAgo } from "./utils.js";

// DOM Elements
const searchInput = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const btnReset = document.getElementById("btn-reset");

const tagsFilterPills = document.querySelectorAll("#tags-filter .filter-pill");
const typeFilterPills = document.querySelectorAll("#type-filter .filter-pill");
const statusFilterPills = document.querySelectorAll("#status-filter .filter-pill");
const sortFilterPills = document.querySelectorAll("#sort-filter .filter-pill");

const mangaContainer = document.getElementById("manga-container");
const loadingSpinner = document.getElementById("loading-spinner");
const resultsCount = document.getElementById("results-count");
const paginationContainer = document.getElementById("pagination-container");

let allMangas = [];
let filteredMangas = [];
let currentPage = 1;
const itemsPerPage = 12;

let currentFilter = {
    search: "",
    type: "all",
    tag: "all",
    status: "all",
    sort: "newest"
};

// Initialize
const init = async () => {
    loadingSpinner.classList.remove("hidden");
    
    try {
        const q = query(collection(db, "mangas"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        snapshot.forEach(doc => {
            allMangas.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        applyFilters();
    } catch (error) {
        console.error("Error fetching mangas:", error);
        mangaContainer.innerHTML = `<p style="color: var(--danger); text-align: center; grid-column: 1/-1;">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}</p>`;
    } finally {
        loadingSpinner.classList.add("hidden");
        mangaContainer.classList.remove("hidden");
        paginationContainer.classList.remove("hidden");
    }
    
    setupEventListeners();
};

const setupEventListeners = () => {
    // Dropdown Container
    const searchInputWrapper = document.querySelector(".combobox-input-wrapper");
    let dropdown = document.getElementById("autocomplete-dropdown");
    if (!dropdown) {
        dropdown = document.createElement("div");
        dropdown.id = "autocomplete-dropdown";
        dropdown.className = "combobox-dropdown";
        searchInputWrapper.appendChild(dropdown);
    }
    
    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!searchInputWrapper.contains(e.target)) {
            dropdown.classList.remove("active");
        }
    });

    const updateAutocomplete = (query) => {
        if (!query) {
            dropdown.classList.remove("active");
            return;
        }
        
        const suggestions = allMangas.filter(manga => {
            const tMatch = manga.title && manga.title.toLowerCase().includes(query);
            const aMatch = manga.author && manga.author.toLowerCase().includes(query);
            return tMatch || aMatch;
        }).slice(0, 5); // top 5
        
        if (suggestions.length === 0) {
            dropdown.innerHTML = `<div class="combobox-empty">ไม่พบข้อมูลที่ตรงกัน</div>`;
        } else {
            dropdown.innerHTML = suggestions.map(s => `
                <div class="combobox-item" onclick="window.location.href='manga.html?id=${s.id}'">
                    <img src="${s.coverUrl || 'https://via.placeholder.com/500x700?text=No+Cover'}" class="combobox-item-img" onerror="this.src='images/placeholder.jpg'">
                    <div class="combobox-item-text">
                        <span class="combobox-item-title">${s.title}</span>
                        ${s.author ? `<span class="combobox-item-subtitle">${s.author}</span>` : ''}
                    </div>
                    <ion-icon name="arrow-forward-outline" class="combobox-item-action"></ion-icon>
                </div>
            `).join("");
        }
        dropdown.classList.add("active");
    };

    // Pill Click Handlers
    const setupPills = (pills, filterKey) => {
        pills.forEach(pill => {
            pill.addEventListener("click", (e) => {
                pills.forEach(p => p.classList.remove("active"));
                e.target.classList.add("active");
                currentFilter[filterKey] = e.target.dataset.value;
                currentPage = 1;
                applyFilters();
            });
        });
    };

    setupPills(tagsFilterPills, "tag");
    setupPills(typeFilterPills, "type");
    setupPills(statusFilterPills, "status");
    setupPills(sortFilterPills, "sort");

    // Search input
    btnSearch.addEventListener("click", () => {
        currentFilter.search = searchInput.value.trim().toLowerCase();
        currentPage = 1;
        applyFilters();
    });

    searchInput.addEventListener("input", (e) => {
        const val = searchInput.value.trim().toLowerCase();
        currentFilter.search = val;
        currentPage = 1;
        applyFilters();
        updateAutocomplete(val);
    });

    searchInput.addEventListener("focus", () => {
        if (searchInput.value.trim().toLowerCase()) {
            updateAutocomplete(searchInput.value.trim().toLowerCase());
        }
    });

    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const val = searchInput.value.trim().toLowerCase();
            currentFilter.search = val;
            currentPage = 1;
            applyFilters();
            dropdown.classList.remove("active");
        }
    });

    // Reset
    btnReset.addEventListener("click", () => {
        currentFilter = {
            search: "",
            type: "all",
            tag: "all",
            status: "all",
            sort: "newest"
        };
        searchInput.value = "";
        
        // Reset pills UI
        [tagsFilterPills, typeFilterPills, statusFilterPills, sortFilterPills].forEach(pills => {
            pills.forEach(p => p.classList.remove("active"));
            pills[0].classList.add("active"); // Set "all" to active
        });
        
        currentPage = 1;
        applyFilters();
    });
};

const applyFilters = () => {
    // 1. Filter
    filteredMangas = allMangas.filter(manga => {
        // Search Filter
        if (currentFilter.search) {
            const searchStr = currentFilter.search;
            const titleMatch = manga.title && manga.title.toLowerCase().includes(searchStr);
            const authorMatch = manga.author && manga.author.toLowerCase().includes(searchStr);
            const descMatch = manga.description && manga.description.toLowerCase().includes(searchStr);
            
            if (!titleMatch && !authorMatch && !descMatch) {
                return false;
            }
        }
        
        // Type Filter
        if (currentFilter.type !== "all") {
            const docType = manga.type || 'manga'; // Default to manga if not specified
            if (docType.toLowerCase() !== currentFilter.type.toLowerCase()) {
                return false;
            }
        }
        
        // Tag Filter
        if (currentFilter.tag !== "all") {
            if (!manga.tags || !manga.tags.some(t => t.toLowerCase() === currentFilter.tag.toLowerCase())) {
                return false;
            }
        }
        
        // Status Filter
        if (currentFilter.status !== "all") {
            if (!manga.status || manga.status.toLowerCase() !== currentFilter.status.toLowerCase()) {
                return false;
            }
        }
        
        return true;
    });

    const getTime = (ts) => {
        if (!ts) return 0;
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        if (ts.seconds) return ts.seconds * 1000;
        return new Date(ts).getTime() || 0;
    };

    // 2. Sort
    filteredMangas.sort((a, b) => {
        switch (currentFilter.sort) {
            case "newest":
                return getTime(b.createdAt) - getTime(a.createdAt);
            case "updates":
                // Fallback to createdAt if updatedAt doesn't exist
                const timeA = getTime(a.updatedAt) || getTime(a.createdAt);
                const timeB = getTime(b.updatedAt) || getTime(b.createdAt);
                return timeB - timeA;
            case "popular":
                return (b.views || 0) - (a.views || 0);
            case "rating":
                return (b.rating || 0) - (a.rating || 0);
            default:
                return 0;
        }
    });

    resultsCount.textContent = filteredMangas.length;
    renderPage();
};

const renderPage = () => {
    mangaContainer.innerHTML = "";
    
    if (filteredMangas.length === 0) {
        mangaContainer.innerHTML = `<p style="color: var(--text-secondary); text-align: center; grid-column: 1/-1; padding: 3rem 0;">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</p>`;
        paginationContainer.innerHTML = "";
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredMangas.length);
    const paginatedItems = filteredMangas.slice(startIndex, endIndex);

    paginatedItems.forEach(manga => {
        const coverUrl = manga.coverUrl || 'https://via.placeholder.com/400x600?text=No+Cover';
        
        let badgeHtml = '';
            if (manga.type === 'novel') {
                badgeHtml = '<div class="badge-type badge-novel">NOVEL</div>';
            } else if (manga.type === 'manhwa') {
                badgeHtml = '<div class="badge-type badge-manhwa">MANHWA</div>';
            } else if (manga.type === 'manhua') {
                badgeHtml = '<div class="badge-type badge-manhua">MANHUA</div>';
            } else if (manga.type === 'manthai') {
                badgeHtml = '<div class="badge-type badge-manthai">MANTHAI</div>';
            } else {
                badgeHtml = '<div class="badge-type badge-manga">MANGA</div>';
            }

        const card = document.createElement("div");
        card.className = "manga-card";
        card.onclick = () => { window.location.href = `manga.html?id=${manga.id}`; };

        let colorBadge = manga.type !== 'novel' ? '<div class="badge-bottom-left"><ion-icon name="color-palette"></ion-icon> COLOR</div>' : '';

        card.innerHTML = `
            <div class="cover-wrapper">
                ${badgeHtml}
                ${colorBadge}
                <img src="${coverUrl}" alt="${manga.title}" class="manga-cover" loading="lazy">
            </div>
            <div class="manga-info">
                <h3 class="manga-title">${manga.title}</h3>
                <div class="chapter-list" id="search-chapter-list-${manga.id}">
                    <!-- chapters will be loaded here -->
                </div>
            </div>
        `;
        mangaContainer.appendChild(card);

        // Render chapters from cached latestChapters array or fetch dynamically
        const listEl = document.getElementById(`search-chapter-list-${manga.id}`);
        if (listEl) {
            if (!manga.latestChapters || manga.latestChapters.length === 0) {
                // Fallback to fetch from chapters collection
                import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js").then(({ query, collection, where, orderBy, limit, getDocs }) => {
                    const chQ = query(collection(db, "chapters"), where("mangaId", "==", manga.id), orderBy("chapterNumber", "desc"), limit(2));
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
                });
            } else {
                let html = '';
                manga.latestChapters.forEach(chData => {
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

    renderPagination();
};

const renderPagination = () => {
    const totalPages = Math.ceil(filteredMangas.length / itemsPerPage);
    paginationContainer.innerHTML = "";

    if (totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.innerHTML = `<ion-icon name="chevron-back-outline"></ion-icon>`;
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    paginationContainer.appendChild(prevBtn);

    // Page Numbers (Simple approach for now)
    for (let i = 1; i <= totalPages; i++) {
        // Show max 5 page buttons around current page
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            const pageBtn = document.createElement("button");
            pageBtn.className = `page-btn ${i === currentPage ? "active" : ""}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                currentPage = i;
                renderPage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            paginationContainer.appendChild(pageBtn);
        } else if (
            (i === currentPage - 3 && i > 2) || 
            (i === currentPage + 3 && i < totalPages - 1)
        ) {
            const dots = document.createElement("span");
            dots.style.color = "var(--text-secondary)";
            dots.style.margin = "0 0.2rem";
            dots.textContent = "...";
            paginationContainer.appendChild(dots);
        }
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.innerHTML = `<ion-icon name="chevron-forward-outline"></ion-icon>`;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    paginationContainer.appendChild(nextBtn);
};

// Start
init();
