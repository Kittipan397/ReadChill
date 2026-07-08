import { db, auth } from "./firebase.js";
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp, arrayUnion, getDoc, orderBy, increment, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { uploadToCloudinary } from "./cloudinary.js";
import { CustomCombobox } from "./combobox.js";

let selectMangaCb;
let manageMangaSelectCb;
let addMangaAuthorIdCb;
let editMangaAuthorIdCb;
let addChapterQuill;
let editChapterQuill;

const adminContent = document.getElementById("admin-content");
const unauthorizedMsg = document.getElementById("unauthorized-msg");

// --- Form Elements: Manga Series ---
const addMangaType = document.getElementById("add-manga-type");
const addMangaTitle = document.getElementById("add-manga-title");
const addMangaSynopsis = document.getElementById("add-manga-synopsis");
const addMangaAuthor = document.getElementById("add-manga-author");
const addMangaTags = document.getElementById("add-manga-tags");
const addMangaFreeCount = document.getElementById("add-manga-free-count");
const addMangaDefaultPrice = document.getElementById("add-manga-default-price");
const addMangaCover = document.getElementById("add-manga-cover");
const addMangaBtn = document.getElementById("add-manga-btn");
const addMangaMsg = document.getElementById("add-manga-msg");
const addMangaOwnerType = document.getElementById("add-manga-owner-type");
const addMangaRevenueShare = document.getElementById("add-manga-revenue-share");
const addMangaAuthorId = document.getElementById("add-manga-author-id");
const addRevenueShareGroup = document.getElementById("add-revenue-share-group");
const addAuthorIdGroup = document.getElementById("add-author-id-group");

// --- Form Elements: Chapter ---
const selectManga = document.getElementById("select-manga");
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
        
        if (user.email && user.email.toLowerCase() === "kittipan.g397@gmail.com") {
            // อนุญาตให้เข้าถึง
            unauthorizedMsg.classList.add("hidden");
            adminContent.classList.remove("hidden");
            // Init Quill Editors
            const initQuill = setInterval(() => {
                if (typeof Quill !== 'undefined') {
                    if (document.getElementById('add-chapter-editor') && !addChapterQuill) {
                        addChapterQuill = new Quill('#add-chapter-editor', { theme: 'snow' });
                    }
                    if (document.getElementById('edit-chapter-editor') && !editChapterQuill) {
                        editChapterQuill = new Quill('#edit-chapter-editor', { theme: 'snow' });
                    }
                    clearInterval(initQuill);
                }
            }, 500);

            // Initialize Comboboxes
            selectMangaCb = new CustomCombobox(selectManga, { placeholder: "ค้นหาเรื่องการ์ตูน..." });
            manageMangaSelectCb = new CustomCombobox(manageMangaSelect, { placeholder: "ค้นหาเรื่องการ์ตูน..." });
            addMangaAuthorIdCb = new CustomCombobox(addMangaAuthorId, { placeholder: "ค้นหานักเขียน..." });
            editMangaAuthorIdCb = new CustomCombobox(editMangaAuthorIdSelect, { placeholder: "ค้นหานักเขียน..." });
            
            // โหลดข้อมูล
            loadMangas();
            loadPendingPayments();
            loadPartnerAuthors();
            loadWithdrawals();
        } else {
            unauthorizedMsg.innerHTML = "<h2 style='color: var(--danger);'>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h2><a href='index.html'>กลับหน้าแรก</a>";
        }
    } catch (error) {
        console.error("Auth check error:", error);
    }
});

// Toggle Partner fields in Add form
addMangaOwnerType.addEventListener("change", () => {
    if (addMangaOwnerType.value === "partner") {
        addRevenueShareGroup.classList.remove("hidden");
        addAuthorIdGroup.classList.remove("hidden");
    } else {
        addRevenueShareGroup.classList.add("hidden");
        addAuthorIdGroup.classList.add("hidden");
    }
});

// Toggle Partner fields in Edit form
const editMangaOwnerType = document.getElementById("edit-manga-owner-type");
const editMangaRevenueShareInput = document.getElementById("edit-manga-revenue-share");
const editMangaAuthorIdSelect = document.getElementById("edit-manga-author-id");
const editRevenueShareGroup = document.getElementById("edit-revenue-share-group");
const editAuthorIdGroup = document.getElementById("edit-author-id-group");

editMangaOwnerType.addEventListener("change", () => {
    if (editMangaOwnerType.value === "partner") {
        editRevenueShareGroup.classList.remove("hidden");
        editAuthorIdGroup.classList.remove("hidden");
    } else {
        editRevenueShareGroup.classList.add("hidden");
        editAuthorIdGroup.classList.add("hidden");
    }
});

// Load Partner Authors (users with role === "partner")
const loadPartnerAuthors = async () => {
    try {
        const q = query(collection(db, "users"), where("role", "==", "partner"));
        const snapshot = await getDocs(q);

        const selects = [addMangaAuthorId, editMangaAuthorIdSelect];
        selects.forEach(sel => {
            sel.innerHTML = '<option value="">-- เลือกนักเขียน Partner --</option>';
        });

        if (snapshot.empty) {
            selects.forEach(sel => {
                sel.innerHTML = '<option value="">-- ยังไม่มีนักเขียน Partner --</option>';
            });
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const displayName = data.displayName || data.email || docSnap.id;
            
            const option1 = document.createElement("option");
            option1.value = docSnap.id;
            option1.textContent = displayName;
            option1.setAttribute("data-subtitle", data.email || "");
            if (data.profileUrl) option1.setAttribute("data-image", data.profileUrl);
            addMangaAuthorId.appendChild(option1);

            const option2 = document.createElement("option");
            option2.value = docSnap.id;
            option2.textContent = displayName;
            option2.setAttribute("data-subtitle", data.email || "");
            if (data.profileUrl) option2.setAttribute("data-image", data.profileUrl);
            editMangaAuthorIdSelect.appendChild(option2);
        });

        if (addMangaAuthorIdCb) addMangaAuthorIdCb.updateOptions();
        if (editMangaAuthorIdCb) editMangaAuthorIdCb.updateOptions();
    } catch (error) {
        console.error("Error loading partner authors:", error);
    }
};

// ==========================================
// 1. จัดการเรื่องการ์ตูน (Manga Series)
// ==========================================

const showMangaMsg = (text, type) => {
    addMangaMsg.textContent = text;
    addMangaMsg.style.color = type === "success" ? "var(--success)" : "var(--danger)";
};

// ฟังก์ชันแปลงลิงก์ Google Drive
const convertDriveLink = (url) => {
    if (!url) return url;
    
    // หา file ID จากลิงก์ Google Drive
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        // ใช้ uc?export=view เพื่อให้ได้ภาพความละเอียดเต็ม (Full Resolution)
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    
    return url;
};

let mangasData = {};

// ดึงรายชื่อการ์ตูนมาใส่ Dropdown
const loadMangas = async () => {
    try {
        const q = query(collection(db, "mangas"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        selectManga.innerHTML = '<option value="">-- เลือกเรื่องการ์ตูน --</option>';
        mangasData = {};
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            mangasData[docSnap.id] = data;
            const option = document.createElement("option");
            option.value = docSnap.id;
            option.textContent = data.title;
            if (data.coverUrl) option.setAttribute("data-image", data.coverUrl);
            selectManga.appendChild(option);
        });
        
        if (selectMangaCb) selectMangaCb.updateOptions();

        if (typeof populateManageMangaSelect === "function") {
            populateManageMangaSelect();
        }
    } catch (error) {
        console.error("Error loading mangas:", error);
        selectManga.innerHTML = '<option value="">-- เกิดข้อผิดพลาดในการโหลดรายชื่อ --</option>';
    }
};

// อัปโหลดเรื่องใหม่
addMangaBtn.addEventListener("click", async () => {
    const title = addMangaTitle.value.trim();
    const synopsis = addMangaSynopsis.value.trim();
    const author = addMangaAuthor.value.trim();
    const tagsStr = addMangaTags.value.trim();
    const freeCount = parseInt(addMangaFreeCount.value) || 0;
    const defaultPrice = parseFloat(addMangaDefaultPrice.value) || 0;
    const coverFile = addMangaCover.files[0];

    if (!title || !synopsis || !coverFile) {
        showMangaMsg("กรุณากรอกชื่อเรื่อง, เรื่องย่อ และเลือกรูปปก", "danger");
        return;
    }

    addMangaBtn.disabled = true;
    addMangaBtn.textContent = "กำลังอัปโหลดและบันทึกข้อมูล...";

    try {
        // อัปโหลดรูปหน้าปกไปที่ Cloudinary
        const coverUrl = await uploadToCloudinary(coverFile);

        // แยก Tag เป็น Array
        const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()) : [];

        await addDoc(collection(db, "mangas"), {
            type: addMangaType ? addMangaType.value : "manga",
            title: title,
            synopsis: synopsis,
            author: author || "ไม่ระบุ",
            tags: tags,
            coverUrl: coverUrl,
            freeChapterCount: freeCount,
            defaultPrice: defaultPrice,
            ownerType: addMangaOwnerType.value,
            authorId: addMangaOwnerType.value === "partner" ? addMangaAuthorId.value : null,
            revenueShare: addMangaOwnerType.value === "partner" ? (parseInt(addMangaRevenueShare.value) || 70) : 0,
            views: 0,
            rating: 0,
            status: "Ongoing",
            createdAt: serverTimestamp()
        });

        showMangaMsg("สร้างเรื่องการ์ตูนใหม่เรียบร้อยแล้ว!", "success");
        
        // ล้างฟอร์ม
        addMangaTitle.value = "";
        addMangaSynopsis.value = "";
        addMangaAuthor.value = "";
        addMangaTags.value = "";
        addMangaCover.value = "";

        // โหลด Dropdown ใหม่
        loadMangas();

    } catch (error) {
        console.error("Error adding manga:", error);
        showMangaMsg("เกิดข้อผิดพลาด: " + error.message, "danger");
    } finally {
        addMangaBtn.disabled = false;
        addMangaBtn.textContent = "สร้างเรื่องการ์ตูนใหม่";
    }
});


// ==========================================
// 2. จัดการตอนย่อย (Chapters)
// ==========================================

const showAddMsg = (text, type) => {
    addMsg.textContent = text;
    addMsg.style.color = type === "success" ? "var(--success)" : "var(--danger)";
};

const updateChapterPricing = () => {
    const mangaId = selectManga.value;
    const chapterNum = parseInt(addChapterNum.value);
    
    if (mangaId && !isNaN(chapterNum) && mangasData[mangaId]) {
        const manga = mangasData[mangaId];
        const freeCount = manga.freeChapterCount || 0;
        const defaultPrice = manga.defaultPrice || 5;
        
        if (chapterNum <= freeCount) {
            addIsFree.value = "true";
            priceGroup.classList.add("hidden");
        } else {
            addIsFree.value = "false";
            priceGroup.classList.remove("hidden");
            addPrice.value = defaultPrice;
        }
    }
};


selectManga.addEventListener("change", (e) => {
    updateChapterPricing();
    const mangaId = e.target.value;
    const imageContainer = document.getElementById('add-chapter-image-container');
    const contentContainer = document.getElementById('add-chapter-content-container');
    if (mangaId && mangasData[mangaId] && imageContainer && contentContainer) {
        const type = mangasData[mangaId].type || 'manga';
        if (type === 'novel') {
            imageContainer.classList.add('hidden');
            contentContainer.classList.remove('hidden');
        } else {
            imageContainer.classList.remove('hidden');
            contentContainer.classList.add('hidden');
        }
    }
});
addChapterNum.addEventListener("input", updateChapterPricing);

addIsFree.addEventListener("change", (e) => {
    if (e.target.value === "false") {
        priceGroup.classList.remove("hidden");
    } else {
        priceGroup.classList.add("hidden");
    }
});

addChapterBtn.addEventListener("click", async () => {
    const mangaId = selectManga.value;
    const mangaType = (mangasData[mangaId] && mangasData[mangaId].type) ? mangasData[mangaId].type : 'manga';
    const chapterNum = parseInt(addChapterNum.value);
    const isFree = addIsFree.value === "true";
    const price = isFree ? 0 : parseFloat(addPrice.value);
    const files = addImages.files;
    const contentHtml = addChapterQuill ? addChapterQuill.root.innerHTML : "";

    if (!mangaId) {
        showAddMsg("กรุณาเลือกเรื่องก่อน", "danger");
        return;
    }

    if (isNaN(chapterNum)) {
        showAddMsg("กรุณากรอกลำดับตอน", "danger");
        return;
    }
    
    if (mangaType !== 'novel' && files.length === 0) {
        showAddMsg("กรุณาเลือกไฟล์ภาพอย่างน้อย 1 ไฟล์", "danger");
        return;
    }
    
    if (mangaType === 'novel' && (!contentHtml || contentHtml === '<p><br></p>')) {
        showAddMsg("กรุณากรอกเนื้อหานิยาย", "danger");
        return;
    }

    if (!isFree && (isNaN(price) || price <= 0)) {
        showAddMsg("กรุณาระบุราคาให้ถูกต้อง", "danger");
        return;
    }

    addChapterBtn.disabled = true;
    addChapterBtn.textContent = "กำลังอัปโหลดและบันทึก...";
    showAddMsg("", "");

    try {
        let imageUrls = [];
        let chapterContent = null;
        
        if (mangaType !== 'novel') {
            const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
            for (let i = 0; i < sortedFiles.length; i++) {
                const file = sortedFiles[i];
                const url = await uploadToCloudinary(file);
                imageUrls.push(url);
            }
        } else {
            chapterContent = contentHtml;
        }

        await addDoc(collection(db, "chapters"), {
            mangaId: mangaId,
            chapterNumber: chapterNum,
            isFree: isFree,
            price: price,
            imageUrls: imageUrls,
            content: chapterContent,
            createdAt: serverTimestamp()
        });

        // อัปเดตเวลาอัปเดตล่าสุดของ Manga และเลขตอนล่าสุด
        await updateDoc(doc(db, "mangas", mangaId), {
            updatedAt: serverTimestamp(),
            latestChapter: chapterNum
        });

        showAddMsg("เพิ่มตอนใหม่เรียบร้อยแล้ว!", "success");
        
        addChapterNum.value = "";
        addImages.value = "";
        addPrice.value = "";

    } catch (error) {
        console.error("Error adding chapter:", error);
        showAddMsg("เกิดข้อผิดพลาด: " + error.message, "danger");
    } finally {
        addChapterBtn.disabled = false;
        addChapterBtn.textContent = "บันทึกตอนใหม่";
    }
});


// ==========================================
// 3. จัดการรายการชำระเงิน
// ==========================================

const loadPendingPayments = async () => {
    try {
        const q = query(collection(db, "payments"), where("status", "==", "pending"));
        const snapshot = await getDocs(q);
        
        const recentTbody = document.getElementById("payments-tbody-recent");
        const olderTbody = document.getElementById("payments-tbody-older");
        const searchInput = document.getElementById("search-payments");
        const dropdown = document.getElementById("payments-dropdown");

        if (!recentTbody || !olderTbody) return;
        
        let allHtml = [];
        
        if (snapshot.empty) {
            recentTbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>ไม่มีรายการรอดำเนินการ</td></tr>";
            olderTbody.innerHTML = "";
            if(dropdown) dropdown.style.display = "none";
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const email = data.userEmail || "ไม่ทราบอีเมล";
            const amount = data.bahtAmount || data.amount || 0;
            const coins = data.coinAmount || data.amount || 0;
            const slipUrl = data.slipUrl || "";

            const html = `
                <tr data-search="${email.toLowerCase()} ${amount}">
                    <td>${email}</td>
                    <td>${amount} ฿</td>
                    <td><span style="color: var(--text-primary); font-weight: 600;">🪙 ${coins}</span></td>
                    <td>${slipUrl ? `<a href="${slipUrl}" target="_blank" class="slip-link">ดูสลิป</a>` : '-'}</td>
                    <td>
                        <button class="btn-primary btn-sm" onclick="approveTopup('${id}', '${data.userId}', ${coins})">อนุมัติ</button>
                        <button class="btn-danger btn-sm" onclick="rejectPayment('${id}')">ปฏิเสธ</button>
                    </td>
                </tr>`;
            allHtml.push(html);
        });

        const renderPayments = (filter = "") => {
            const filtered = filter ? allHtml.filter(tr => tr.includes(`data-search="`) && tr.split(`data-search="`)[1].split(`"`)[0].includes(filter)) : allHtml;
            
            recentTbody.innerHTML = filtered.slice(0, 3).join("");
            olderTbody.innerHTML = filtered.slice(3).join("");

            if(dropdown) {
                if (filtered.length <= 3 && !filter) {
                    dropdown.style.display = "none";
                } else {
                    dropdown.style.display = "block";
                }
            }
        };

        renderPayments();

        if (searchInput) {
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);
            newSearchInput.addEventListener("input", (e) => {
                const filter = e.target.value.toLowerCase().trim();
                renderPayments(filter);
                if (filter && dropdown) dropdown.open = true;
            });
        }
    } catch (error) {
        console.error("Error loading payments:", error);
        document.getElementById("payments-tbody-recent").innerHTML = "<tr><td colspan='5' style='text-align:center; color: var(--danger);'>โหลดข้อมูลผิดพลาด</td></tr>";
    }
};

window.approveTopup = async (paymentId, userId, coinAmount) => {
    if (!confirm(`ยืนยันการอนุมัติเติมเหรียญจำนวน ${coinAmount} เหรียญ?`)) return;
    
    try {
        // อัปเดตสถานะ payment
        await updateDoc(doc(db, "payments", paymentId), {
            status: "approved",
            updatedAt: serverTimestamp()
        });
        
        // เพิ่มเหรียญให้ user
        await updateDoc(doc(db, "users", userId), {
            coins: increment(coinAmount)
        });
        
        alert("เติมเหรียญสำเร็จ!");
        loadPendingPayments();
    } catch (error) {
        console.error("Error approving topup:", error);
        alert("เกิดข้อผิดพลาดในการอนุมัติ");
    }
};

window.rejectPayment = async (paymentId) => {
    if (!confirm("ต้องการปฏิเสธสลิปนี้ใช่หรือไม่?")) return;
    
    try {
        await updateDoc(doc(db, "payments", paymentId), {
            status: "rejected",
            updatedAt: serverTimestamp()
        });
        
        alert("ปฏิเสธสลิปแล้ว");
        loadPendingPayments();
    } catch (error) {
        console.error("Error rejecting payment:", error);
        alert("เกิดข้อผิดพลาดในการปฏิเสธ");
    }
};

// ==========================================
// Manage Manga & Chapters Logic
// ==========================================
const manageMangaSelect = document.getElementById("manage-manga-select");
const manageMangaActions = document.getElementById("manage-manga-actions");
const manageChaptersContainer = document.getElementById("manage-chapters-container");
const manageChaptersTbody = document.getElementById("manage-chapters-tbody");

// Modals
const editMangaModal = document.getElementById("edit-manga-modal");
const editMangaType = document.getElementById("edit-manga-type");
const editMangaId = document.getElementById("edit-manga-id");
const editMangaTitle = document.getElementById("edit-manga-title");
const editMangaSynopsis = document.getElementById("edit-manga-synopsis");
const editMangaAuthor = document.getElementById("edit-manga-author");
const editMangaTags = document.getElementById("edit-manga-tags");
const editMangaFreeCount = document.getElementById("edit-manga-free-count");
const editMangaDefaultPrice = document.getElementById("edit-manga-default-price");
const editMangaCover = document.getElementById("edit-manga-cover");

const editChapterModal = document.getElementById("edit-chapter-modal");
const editChapterDisplayNum = document.getElementById("edit-chapter-display-num");
const editChapterId = document.getElementById("edit-chapter-id");
const editChapterNum = document.getElementById("edit-chapter-num");
const editChapterIsFree = document.getElementById("edit-chapter-is-free");
const editChapterPriceGroup = document.getElementById("edit-chapter-price-group");
const editChapterPrice = document.getElementById("edit-chapter-price");
const editChapterImages = document.getElementById("edit-chapter-images");

// Load Manage Manga Select
const populateManageMangaSelect = () => {
    manageMangaSelect.innerHTML = '<option value="">-- เลือกเรื่องการ์ตูน --</option>';
    for (const [id, data] of Object.entries(mangasData)) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = data.title;
        if (data.coverUrl) option.setAttribute("data-image", data.coverUrl);
        manageMangaSelect.appendChild(option);
    }
    if (manageMangaSelectCb) manageMangaSelectCb.updateOptions();
};

// Listen to Manage Manga Select
manageMangaSelect.addEventListener("change", async (e) => {
    const mangaId = e.target.value;
    if (!mangaId) {
        manageMangaActions.classList.add("hidden");
        manageChaptersContainer.classList.add("hidden");
        return;
    }
    
    manageMangaActions.classList.remove("hidden");
    manageChaptersContainer.classList.remove("hidden");
    await loadManageChapters(mangaId);
});

// Load Chapters for Manage
const loadManageChapters = async (mangaId) => {
    manageChaptersTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">กำลังโหลด...</td></tr>';
    try {
        const q = query(collection(db, "chapters"), where("mangaId", "==", mangaId), orderBy("chapterNumber", "desc"));
        const snap = await getDocs(q);
        
        manageChaptersTbody.innerHTML = "";
        if (snap.empty) {
            manageChaptersTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-secondary);">ยังไม่มีตอน</td></tr>';
            return;
        }

        snap.forEach(docSnap => {
            const ch = docSnap.data();
            const tr = document.createElement("tr");
            
            tr.innerHTML = `
                <td>ตอนที่ ${ch.chapterNumber}</td>
                <td><span class="status-badge ${ch.isFree ? 'status-approved' : 'status-pending'}">${ch.isFree ? 'ฟรี' : 'เสียเงิน'}</span></td>
                <td>${ch.isFree ? '-' : ch.price + ' 🪙'}</td>
                <td>
                    <button class="btn-sm" style="background:var(--accent-color); color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="openEditChapter('${docSnap.id}', '${mangaId}')">แก้ไข</button>
                    <button class="btn-sm" style="background:var(--danger); color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="deleteChapter('${docSnap.id}', '${mangaId}')">ลบ</button>
                </td>
            `;
            manageChaptersTbody.appendChild(tr);
            
            // Store chapter data temporarily in DOM element for easy access
            tr.dataset.chapter = JSON.stringify(ch);
        });
    } catch (error) {
        console.error("Error loading chapters:", error);
        manageChaptersTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger);">เกิดข้อผิดพลาด</td></tr>';
    }
};

// --- Manga Edit/Delete ---
document.getElementById("delete-manga-btn").addEventListener("click", async () => {
    const mangaId = manageMangaSelect.value;
    if (!mangaId) return;
    
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบการ์ตูนเรื่องนี้? (ตอนย่อยทั้งหมดจะถูกลบด้วย)")) {
        try {
            // Delete all chapters first
            const q = query(collection(db, "chapters"), where("mangaId", "==", mangaId));
            const snap = await getDocs(q);
            const deletePromises = [];
            snap.forEach(docSnap => {
                deletePromises.push(deleteDoc(doc(db, "chapters", docSnap.id)));
            });
            await Promise.all(deletePromises);
            
            // Delete Manga
            await deleteDoc(doc(db, "mangas", mangaId));
            
            alert("ลบการ์ตูนและตอนทั้งหมดเรียบร้อยแล้ว");
            
            // Reload
            manageMangaSelect.value = "";
            manageMangaActions.classList.add("hidden");
            manageChaptersContainer.classList.add("hidden");
            await loadMangas();
        } catch (error) {
            console.error("Error deleting manga:", error);
            alert("เกิดข้อผิดพลาดในการลบ");
        }
    }
});

document.getElementById("edit-manga-btn").addEventListener("click", () => {
    const mangaId = manageMangaSelect.value;
    if (!mangaId || !mangasData[mangaId]) return;
    
    const manga = mangasData[mangaId];
    editMangaId.value = mangaId;
    if(editMangaType) editMangaType.value = manga.type || "manga";
    editMangaTitle.value = manga.title || "";
    editMangaSynopsis.value = manga.synopsis || "";
    editMangaAuthor.value = manga.author || "";
    editMangaTags.value = (manga.tags || []).join(", ");
    editMangaFreeCount.value = manga.freeChapterCount || 0;
    editMangaDefaultPrice.value = manga.defaultPrice || 0;
    editMangaCover.value = ""; // Clear file input
    
    // Revenue Sharing fields
    editMangaOwnerType.value = manga.ownerType || "platform";
    editMangaRevenueShareInput.value = manga.revenueShare || 70;
    editMangaAuthorIdSelect.value = manga.authorId || "";
    if (manga.ownerType === "partner") {
        editRevenueShareGroup.classList.remove("hidden");
        editAuthorIdGroup.classList.remove("hidden");
    } else {
        editRevenueShareGroup.classList.add("hidden");
        editAuthorIdGroup.classList.add("hidden");
    }
    
    editMangaModal.classList.remove("hidden");
});

document.getElementById("cancel-manga-edit-btn").addEventListener("click", () => {
    editMangaModal.classList.add("hidden");
});

document.getElementById("save-manga-edit-btn").addEventListener("click", async () => {
    const id = editMangaId.value;
    const btn = document.getElementById("save-manga-edit-btn");
    btn.disabled = true;
    btn.textContent = "กำลังอัปโหลดและบันทึก...";
    
    try {
        const tags = editMangaTags.value.trim() ? editMangaTags.value.split(",").map(t => t.trim()) : [];
        const coverFile = editMangaCover.files[0];
        
        let updateData = {
            type: editMangaType ? editMangaType.value : "manga",
            title: editMangaTitle.value.trim(),
            synopsis: editMangaSynopsis.value.trim(),
            author: editMangaAuthor.value.trim(),
            tags: tags,
            freeChapterCount: parseInt(editMangaFreeCount.value) || 0,
            defaultPrice: parseFloat(editMangaDefaultPrice.value) || 0,
            ownerType: editMangaOwnerType.value,
            authorId: editMangaOwnerType.value === "partner" ? editMangaAuthorIdSelect.value : null,
            revenueShare: editMangaOwnerType.value === "partner" ? (parseInt(editMangaRevenueShareInput.value) || 70) : 0,
            updatedAt: serverTimestamp()
        };

        if (coverFile) {
            updateData.coverUrl = await uploadToCloudinary(coverFile);
        }
        
        await updateDoc(doc(db, "mangas", id), updateData);
        
        alert("อัปเดตข้อมูลการ์ตูนสำเร็จ");
        editMangaModal.classList.add("hidden");
        await loadMangas();
    } catch (error) {
        console.error("Error updating manga:", error);
        alert("เกิดข้อผิดพลาดในการอัปเดต");
    } finally {
        btn.disabled = false;
        btn.textContent = "บันทึกการแก้ไข";
    }
});

// --- Chapter Edit/Delete ---
window.deleteChapter = async (chapterId, mangaId) => {
    if (confirm("ต้องการลบตอนนี้ใช่หรือไม่?")) {
        try {
            await deleteDoc(doc(db, "chapters", chapterId));
            alert("ลบตอนสำเร็จ");
            loadManageChapters(mangaId);
        } catch (error) {
            console.error("Error deleting chapter:", error);
            alert("เกิดข้อผิดพลาดในการลบ");
        }
    }
};

window.openEditChapter = async (chapterId, mangaId) => {
    try {
        const snap = await getDoc(doc(db, "chapters", chapterId));
        if (!snap.exists()) return;
        const ch = snap.data();
        
        editChapterId.value = chapterId;
        editChapterDisplayNum.textContent = ch.chapterNumber;
        editChapterNum.value = ch.chapterNumber;
        editChapterIsFree.value = ch.isFree ? "true" : "false";
        editChapterPrice.value = ch.price || 0;
        
        if (ch.isFree) {
            editChapterPriceGroup.classList.add("hidden");
        } else {
            editChapterPriceGroup.classList.remove("hidden");
        }
        
        editChapterImages.value = ""; // Clear file input

        const mangaType = (mangasData[mangaId] && mangasData[mangaId].type) ? mangasData[mangaId].type : 'manga';
        const imageContainer = document.getElementById('edit-chapter-image-container');
        const contentContainer = document.getElementById('edit-chapter-content-container');

        if (mangaType === 'novel') {
            if (imageContainer) imageContainer.classList.add('hidden');
            if (contentContainer) contentContainer.classList.remove('hidden');
            if (editChapterQuill) {
                editChapterQuill.root.innerHTML = ch.content || '';
            }
        } else {
            if (imageContainer) imageContainer.classList.remove('hidden');
            if (contentContainer) contentContainer.classList.add('hidden');
        }
        
        editChapterModal.classList.remove("hidden");
    } catch (error) {
        console.error("Error opening edit chapter:", error);
    }
};

editChapterIsFree.addEventListener("change", (e) => {
    if (e.target.value === "true") {
        editChapterPriceGroup.classList.add("hidden");
    } else {
        editChapterPriceGroup.classList.remove("hidden");
    }
});

document.getElementById("cancel-chapter-edit-btn").addEventListener("click", () => {
    editChapterModal.classList.add("hidden");
});

document.getElementById("save-chapter-edit-btn").addEventListener("click", async () => {
    const id = editChapterId.value;
    const mangaId = manageMangaSelect.value;
    const btn = document.getElementById("save-chapter-edit-btn");
    btn.disabled = true;
    btn.textContent = "กำลังอัปโหลดและบันทึก...";
    
    try {
        const isFree = editChapterIsFree.value === "true";
        const price = isFree ? 0 : parseFloat(editChapterPrice.value);
        const files = editChapterImages.files;
        
        let updateData = {
            chapterNumber: parseInt(editChapterNum.value),
            isFree: isFree,
            price: price
        };
        
        
        const mangaType = (mangasData[mangaId] && mangasData[mangaId].type) ? mangasData[mangaId].type : 'manga';
        if (mangaType === 'novel') {
            if (editChapterQuill) {
                updateData.content = editChapterQuill.root.innerHTML;
            }
        } else {
            if (files && files.length > 0) {
                // เรียงลำดับไฟล์ตามชื่อ
                const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                const imageUrls = [];

                for (let i = 0; i < sortedFiles.length; i++) {
                    const file = sortedFiles[i];
                    const url = await uploadToCloudinary(file);
                    imageUrls.push(url);
                }
                updateData.imageUrls = imageUrls;
            }
        }
        
        await updateDoc(doc(db, "chapters", id), updateData);
        
        alert("อัปเดตข้อมูลตอนสำเร็จ");
        editChapterModal.classList.add("hidden");
        loadManageChapters(mangaId);
    } catch (error) {
        console.error("Error updating chapter:", error);
        alert("เกิดข้อผิดพลาดในการอัปเดต");
    } finally {
        btn.disabled = false;
        btn.textContent = "บันทึกการแก้ไข";
    }
});

// ==========================================
// User Management
// ==========================================
const searchUserEmail = document.getElementById("search-user-email");
const searchUserBtn = document.getElementById("search-user-btn");
const userSearchResult = document.getElementById("user-search-result");

if (searchUserBtn) {
    searchUserBtn.addEventListener("click", async () => {
        const email = searchUserEmail.value.trim().toLowerCase();
        if (!email) {
            alert("กรุณากรอกอีเมลที่ต้องการค้นหา");
            return;
        }

        searchUserBtn.disabled = true;
        searchUserBtn.textContent = "กำลังค้นหา...";
        userSearchResult.style.display = "block";
        userSearchResult.innerHTML = "<div class='loader' style='margin: 0 auto;'></div><p style='text-align:center; margin-top:1rem;'>กำลังค้นหา...</p>";

        try {
            console.log("Searching for email:", email);
            const q = query(collection(db, "users"), where("email", "==", email));
            const snapshot = await getDocs(q);
            console.log("Search result empty?", snapshot.empty);

            if (snapshot.empty) {
                userSearchResult.innerHTML = "<p style='color: var(--danger); text-align: center;'>ไม่พบผู้ใช้งานด้วยอีเมลนี้</p>";
            } else {
                let html = "";
                snapshot.forEach(docSnap => {
                    const user = docSnap.data();
                    const uid = docSnap.id;
                    const role = user.role || "user";
                    const isPartner = role === "partner";

                    html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                            <div>
                                <strong>${user.displayName || "ไม่มีชื่อ"}</strong><br>
                                <span style="font-size: 0.85rem; color: #888;">${user.email}</span><br>
                                <span style="font-size: 0.85rem; font-weight: bold; color: ${isPartner ? 'var(--text-primary)' : 'var(--text-primary)'};">สถานะ: ${role}</span>
                            </div>
                            <button class="btn-primary toggle-partner-btn" data-uid="${uid}" data-current-role="${role}" style="background-color: ${isPartner ? 'var(--card-border)' : 'var(--text-primary)'}; color: ${isPartner ? 'var(--text-primary)' : 'var(--bg-color)'};">
                                ${isPartner ? 'ปลดจาก Partner' : 'ตั้งเป็น Partner'}
                            </button>
                        </div>
                    `;
                });
                userSearchResult.innerHTML = html;

                document.querySelectorAll(".toggle-partner-btn").forEach(btn => {
                    btn.addEventListener("click", async (e) => {
                        const uid = e.target.getAttribute("data-uid");
                        const currentRole = e.target.getAttribute("data-current-role");
                        const newRole = currentRole === "partner" ? "user" : "partner";
                        
                        if (confirm(`คุณต้องการเปลี่ยนสถานะผู้ใช้นี้เป็น ${newRole} ใช่หรือไม่?`)) {
                            e.target.disabled = true;
                            e.target.textContent = "กำลังเปลี่ยน...";
                            try {
                                await updateDoc(doc(db, "users", uid), { role: newRole });
                                alert("เปลี่ยนสถานะเรียบร้อย");
                                searchUserBtn.click(); // ค้นหาใหม่เพื่ออัปเดต UI
                                loadPartnerAuthors(); // อัปเดตรายชื่อใน dropdown
                            } catch (err) {
                                console.error("Error updating role:", err);
                                alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
                                e.target.disabled = false;
                                e.target.textContent = currentRole === "partner" ? "ปลดจาก Partner" : "ตั้งเป็น Partner";
                            }
                        }
                    });
                });
            }
        } catch (error) {
            console.error("Error searching user:", error);
            userSearchResult.innerHTML = `<p style='color: var(--danger); text-align: center;'>เกิดข้อผิดพลาดในการค้นหา: ${error.message}</p>`;
            alert("เกิดข้อผิดพลาดในการค้นหา: " + error.message);
        } finally {
            searchUserBtn.disabled = false;
            searchUserBtn.textContent = "ค้นหา";
        }
    });
}

// ==========================================
// Withdrawal Requests
// ==========================================
const loadWithdrawals = async () => {
    try {
        const q = query(collection(db, "withdrawal_requests"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const recentTbody = document.getElementById("withdraw-tbody-recent");
        const olderTbody = document.getElementById("withdraw-tbody-older");
        const searchInput = document.getElementById("search-withdrawals");
        const dropdown = document.getElementById("withdrawals-dropdown");
        
        if (!recentTbody || !olderTbody) return;
        
        let allData = [];

        if (snapshot.empty) {
            recentTbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">ไม่มีคำขอถอนเงิน</td></tr>`;
            olderTbody.innerHTML = "";
            if(dropdown) dropdown.style.display = "none";
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleString("th-TH") : "ไม่ทราบเวลา";
            const statusStr = data.status === "completed" ? '<span style="color: var(--success);">โอนแล้ว</span>' : '<span style="color: var(--warning);">รอโอน</span>';
            const slipHtml = data.slipUrl ? `<a href="${data.slipUrl}" target="_blank" class="slip-link">ดูสลิป</a>` : '-';
            
            let actionHtml = '';
            if (data.status !== "completed") {
                actionHtml = `
                    <input type="file" id="slip-file-${id}" accept="image/*" style="font-size: 0.8rem; margin-bottom: 0.5rem; max-width: 150px;">
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-primary btn-sm confirm-withdraw-btn" data-id="${id}" data-uid="${data.partnerId}" data-amount="${data.amount}">ยืนยันโอนเงิน</button>
                        <button class="btn-primary btn-sm reject-withdraw-btn" data-id="${id}" style="background-color: var(--danger);">ลบคำขอ</button>
                    </div>`;
            }

            let paymentInfoHtml = '';
            if (data.qrCodeUrl) {
                paymentInfoHtml += `<a href="${data.qrCodeUrl}" target="_blank" style="color: var(--accent-color); text-decoration: underline; display: block; margin-bottom: 4px;">ดู QR Code</a>`;
            }
            if (data.bankDetails) {
                paymentInfoHtml += `<span style="font-size: 0.9em; white-space: pre-wrap;">${data.bankDetails}</span>`;
            }
            if (!paymentInfoHtml) {
                paymentInfoHtml = '-';
            }

            const searchKey = `${dateStr} ${data.partnerName || ''} ${data.partnerEmail || ''} ${data.status}`.toLowerCase();

            const html = `
                <tr data-search="${searchKey}">
                    <td>${dateStr}<br><small>${statusStr}</small></td>
                    <td>${data.partnerName || 'Unknown'}<br><small style="color: var(--text-secondary);">${data.partnerEmail || ''}</small></td>
                    <td><ion-icon name="logo-bitcoin" style="color: var(--accent-color);"></ion-icon> <strong>${data.amount}</strong></td>
                    <td>${paymentInfoHtml}</td>
                    <td>${slipHtml}</td>
                    <td>${actionHtml}</td>
                </tr>`;
            allData.push({ id, html, data });
        });

        const renderWithdrawals = (filter = "") => {
            const filtered = filter ? allData.filter(item => item.html.includes(`data-search="`) && item.html.split(`data-search="`)[1].split(`"`)[0].includes(filter)) : allData;
            
            recentTbody.innerHTML = filtered.slice(0, 3).map(item => item.html).join("");
            olderTbody.innerHTML = filtered.slice(3).map(item => item.html).join("");

            if(dropdown) {
                if (filtered.length <= 3 && !filter) {
                    dropdown.style.display = "none";
                } else {
                    dropdown.style.display = "block";
                }
            }
            
            setupWithdrawalListeners();
        };

        renderWithdrawals();

        if (searchInput) {
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);
            newSearchInput.addEventListener("input", (e) => {
                const filter = e.target.value.toLowerCase().trim();
                renderWithdrawals(filter);
                if (filter && dropdown) dropdown.open = true;
            });
        }
        
    } catch (err) {
        console.error("Error loading withdrawals:", err);
    }
};

function setupWithdrawalListeners() {
    document.querySelectorAll(".confirm-withdraw-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const uid = e.target.getAttribute("data-uid");
            const amount = parseFloat(e.target.getAttribute("data-amount"));
            const fileInput = document.getElementById(`slip-file-${id}`);

            if (!fileInput.files || fileInput.files.length === 0) {
                alert("กรุณาแนบสลิปการโอนเงินก่อนยืนยัน");
                return;
            }

            e.target.disabled = true;
            e.target.textContent = "กำลังอัปโหลด...";

            try {
                const { uploadToCloudinary } = await import("./cloudinary.js");
                const { doc, updateDoc, serverTimestamp, increment } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                const { db } = await import("./firebase.js");
                
                const slipUrl = await uploadToCloudinary(fileInput.files[0]);
                
                await updateDoc(doc(db, "withdrawal_requests", id), {
                    status: "completed",
                    slipUrl: slipUrl,
                    completedAt: serverTimestamp()
                });

                const userRef = doc(db, "users", uid);
                await updateDoc(userRef, {
                    earnedCoins: increment(-amount)
                });

                alert("ยืนยันการโอนเงินและล้างยอดสำเร็จ!");
                loadWithdrawals();
            } catch (err) {
                console.error("Error confirming withdrawal:", err);
                alert("เกิดข้อผิดพลาด: " + err.message);
                e.target.disabled = false;
                e.target.textContent = "ยืนยันโอนเงิน";
            }
        });
    });

    document.querySelectorAll(".reject-withdraw-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            if (!confirm("ต้องการลบคำขอถอนเงินนี้ทิ้งหรือไม่? (ยอดเงินจะไม่ถูกหัก)")) return;
            
            const id = e.target.getAttribute("data-id");
            e.target.disabled = true;
            e.target.textContent = "กำลังลบ...";
            
            try {
                const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                const { db } = await import("./firebase.js");
                await deleteDoc(doc(db, "withdrawal_requests", id));
                alert("ลบคำขอเรียบร้อยแล้ว");
                loadWithdrawals();
            } catch (err) {
                console.error("Error deleting withdrawal:", err);
                alert("เกิดข้อผิดพลาด: " + err.message);
                e.target.disabled = false;
                e.target.textContent = "ลบคำขอ";
            }
        });
    });
}

