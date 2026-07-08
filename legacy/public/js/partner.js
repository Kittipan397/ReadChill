import { db, auth, storage } from "./firebase.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp, getDoc, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { uploadToCloudinary } from "./cloudinary.js";
import { CustomCombobox } from "./combobox.js";

const partnerContent = document.getElementById("partner-content");
const unauthorizedMsg = document.getElementById("unauthorized-msg");

let addChapterQuill;
let editChapterQuill;
let selectMangaCb;
let manageMangaSelectCb;

// Initialize Quill
const initQuill = (customFonts = []) => {
    if (typeof Quill !== 'undefined') {
        const Font = Quill.import('formats/font');
        const customFontNames = customFonts.map(f => f.name);
        
        // Add fonts to whitelist
        Font.whitelist = [...customFontNames, 'sans-serif', 'serif', 'monospace'];
        Quill.register(Font, true);

        // Inject font styles
        let styleStr = customFonts.map(f => `
            @font-face { font-family: '${f.name}'; src: url('${f.url}'); }
            .ql-font-${f.name} { font-family: '${f.name}'; }
            .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="${f.name}"]::before,
            .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="${f.name}"]::before {
                content: '${f.name}';
                font-family: '${f.name}';
            }
        `).join('\n');
        
        let styleTag = document.getElementById('custom-fonts-style');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'custom-fonts-style';
            document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = styleStr;

        const quillOptions = {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'font': Font.whitelist }],
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'color': [] }, { 'background': [] }],
                    ['clean']
                ]
            }
        };
        
        if (addChapterQuill) { document.querySelector('#add-chapter-editor .ql-toolbar')?.remove(); }
        if (editChapterQuill) { document.querySelector('#edit-chapter-editor .ql-toolbar')?.remove(); }

        addChapterQuill = new Quill('#add-chapter-editor', quillOptions);
        editChapterQuill = new Quill('#edit-chapter-editor', quillOptions);
    } else {
        setTimeout(() => initQuill(customFonts), 100);
    }
};

let currentPartnerUid = null;
let currentPartnerEmail = null;
let currentPartnerBalance = 0;
let availablePartnerBalance = 0;

// Dashboard Elements
const partnerBalance = document.getElementById("partner-balance");
const partnerMangaCount = document.getElementById("partner-manga-count");
const requestWithdrawBtn = document.getElementById("request-withdraw-btn");

// Modals
const withdrawModal = document.getElementById("withdraw-modal");
const withdrawAmountInput = document.getElementById("withdraw-amount-input");
const withdrawMaxDisplay = document.getElementById("withdraw-max-display");
const confirmWithdrawBtn = document.getElementById("confirm-withdraw-btn");
const cancelWithdrawBtn = document.getElementById("cancel-withdraw-btn");

// Create Manga Elements
const addMangaType = document.getElementById("add-manga-type");
const addMangaTitle = document.getElementById("add-manga-title");
const addMangaSynopsis = document.getElementById("add-manga-synopsis");
const addMangaTags = document.getElementById("add-manga-tags");
const addMangaFreeCount = document.getElementById("add-manga-free-count");
const addMangaDefaultPrice = document.getElementById("add-manga-default-price");
const addMangaCover = document.getElementById("add-manga-cover");
const addMangaBtn = document.getElementById("add-manga-btn");
const addMangaMsg = document.getElementById("add-manga-msg");

// Add Chapter Elements
const selectManga = document.getElementById("select-manga");
const addChapterNum = document.getElementById("add-chapter-num");
const addIsFree = document.getElementById("add-is-free");
const priceGroup = document.getElementById("price-group");
const addPrice = document.getElementById("add-price");
const addImages = document.getElementById("add-images");
const addChapterBtn = document.getElementById("add-chapter-btn");
const addMsg = document.getElementById("add-msg");

// Manage Chapters / Manga
const manageMangaSelect = document.getElementById("manage-manga-select");
const editMangaBtn = document.getElementById("edit-manga-btn");
const deleteMangaBtn = document.getElementById("delete-manga-btn");
const manageChaptersContainer = document.getElementById("manage-chapters-container");
const manageChaptersTbody = document.getElementById("manage-chapters-tbody");

// Edit Manga Modal
const editMangaModal = document.getElementById("edit-manga-modal");
const editMangaId = document.getElementById("edit-manga-id");
const editMangaType = document.getElementById("edit-manga-type");
const editMangaTitle = document.getElementById("edit-manga-title");
const editMangaSynopsis = document.getElementById("edit-manga-synopsis");
const editMangaTags = document.getElementById("edit-manga-tags");
const editMangaFreeCount = document.getElementById("edit-manga-free-count");
const editMangaDefaultPrice = document.getElementById("edit-manga-default-price");
const editMangaCover = document.getElementById("edit-manga-cover");
const saveMangaEditBtn = document.getElementById("save-manga-edit-btn");
const cancelMangaEditBtn = document.getElementById("cancel-manga-edit-btn");

// Edit Chapter Modal
const editChapterModal = document.getElementById("edit-chapter-modal");
const editChapterDisplayNum = document.getElementById("edit-chapter-display-num");
const editChapterId = document.getElementById("edit-chapter-id");
const editChapterNum = document.getElementById("edit-chapter-num");
const editChapterIsFree = document.getElementById("edit-chapter-is-free");
const editChapterPriceGroup = document.getElementById("edit-chapter-price-group");
const editChapterPrice = document.getElementById("edit-chapter-price");
const editChapterImages = document.getElementById("edit-chapter-images");
const saveChapterEditBtn = document.getElementById("save-chapter-edit-btn");
const cancelChapterEditBtn = document.getElementById("cancel-chapter-edit-btn");

// Check Auth & Role
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists() && userSnap.data().role === "partner") {
            currentPartnerUid = user.uid;
            currentPartnerEmail = user.email;
            currentPartnerBalance = userSnap.data().earnedCoins || 0;
            
            // Load Custom Fonts
            const customFonts = userSnap.data().custom_fonts || [];
            renderCustomFontsList(customFonts);
            
            // Init Quill with custom fonts
            initQuill(customFonts);

            // Initialize Comboboxes
            selectMangaCb = new CustomCombobox(selectManga, { placeholder: "ค้นหาเรื่องการ์ตูน..." });
            manageMangaSelectCb = new CustomCombobox(manageMangaSelect, { placeholder: "ค้นหาเรื่องการ์ตูน..." });

            unauthorizedMsg.classList.add("hidden");
            partnerContent.classList.remove("hidden");
            
            // Load Initial Data
            partnerBalance.textContent = "...";
            loadPartnerMangas();
            loadWithdrawalHistory();
            
        } else {
            unauthorizedMsg.innerHTML = "<h2 style='color: var(--danger);'>คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะนักเขียน Partner เท่านั้น)</h2><a href='index.html'>กลับหน้าแรก</a>";
        }
    } catch (error) {
        console.error("Error checking role:", error);
        unauthorizedMsg.innerHTML = "<p style='color: var(--danger);'>เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์</p>";
    }
});

// ==========================================
// Custom Fonts System
// ==========================================
const addFontBtn = document.getElementById("add-font-btn");
const addFontName = document.getElementById("add-font-name");
const addFontFile = document.getElementById("add-font-file");
const addFontMsg = document.getElementById("add-font-msg");
const customFontsList = document.getElementById("custom-fonts-list");

const renderCustomFontsList = (fonts) => {
    if (fonts.length === 0) {
        customFontsList.innerHTML = "<p style='color: var(--text-secondary);'>ยังไม่มีฟอนต์ส่วนตัว</p>";
        return;
    }
    
    let html = `<ul style="list-style: none; padding: 0;">`;
    fonts.forEach(f => {
        html += `<li style="padding: 0.8rem; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-family: '${f.name}'; font-size: 1.1rem;">${f.name}</span>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">✓ พร้อมใช้งาน</span>
        </li>`;
    });
    html += `</ul>`;
    customFontsList.innerHTML = html;
};

if (addFontBtn) {
    addFontBtn.addEventListener("click", async () => {
        const name = addFontName.value.trim();
        const file = addFontFile.files[0];
        
        if (!name || !file) {
            addFontMsg.textContent = "กรุณากรอกชื่อและเลือกไฟล์ฟอนต์";
            addFontMsg.style.color = "var(--danger)";
            return;
        }
        
        // ตรวจสอบชื่อฟอนต์ (ให้เป็นอักษรภาษาอังกฤษ/ตัวเลข ไม่มีช่องว่าง)
        if (!/^[a-zA-Z0-9]+$/.test(name)) {
            addFontMsg.textContent = "ชื่อฟอนต์ต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น (ห้ามมีช่องว่าง)";
            addFontMsg.style.color = "var(--danger)";
            return;
        }
        
        addFontBtn.disabled = true;
        addFontMsg.textContent = "กำลังอัปโหลดฟอนต์ กรุณารอสักครู่...";
        addFontMsg.style.color = "var(--text-secondary)";
        
        try {
            // Upload to Firebase Storage instead of Cloudinary to support TTF/OTF properly
            const fontRef = ref(storage, `fonts/${currentPartnerUid}/${name}_${Date.now()}`);
            await uploadBytes(fontRef, file);
            const url = await getDownloadURL(fontRef);
            
            // Save to Firestore
            const userRef = doc(db, "users", currentPartnerUid);
            const userSnap = await getDoc(userRef);
            let fonts = userSnap.data().custom_fonts || [];
            
            // Check if name already exists
            if (fonts.find(f => f.name === name)) {
                throw new Error("มีชื่อฟอนต์นี้อยู่แล้ว");
            }
            
            fonts.push({ name, url });
            await updateDoc(userRef, { custom_fonts: fonts });
            
            addFontMsg.textContent = "อัปโหลดสำเร็จ! รีเฟรชหน้าเพื่อใช้งาน";
            addFontMsg.style.color = "var(--success)";
            
            addFontName.value = "";
            addFontFile.value = "";
            
            renderCustomFontsList(fonts);
            
        } catch (error) {
            console.error("Error uploading font:", error);
            addFontMsg.textContent = "เกิดข้อผิดพลาด: " + error.message;
            addFontMsg.style.color = "var(--danger)";
        } finally {
            addFontBtn.disabled = false;
        }
    });
}

// ==========================================
// Withdraw System
// ==========================================
requestWithdrawBtn.addEventListener("click", () => {
    if (availablePartnerBalance <= 0) {
        alert("คุณไม่มียอดเงินที่สามารถถอนได้ หรือยอดเงินถูกใช้กับรายการที่กำลังรอโอนไปหมดแล้ว");
        return;
    }
    document.getElementById("withdraw-qr-code").value = "";
    document.getElementById("withdraw-bank-details").value = "";
    
    withdrawMaxDisplay.textContent = availablePartnerBalance.toFixed(2);
    withdrawAmountInput.max = availablePartnerBalance;
    withdrawAmountInput.value = availablePartnerBalance.toFixed(2);
    
    withdrawModal.classList.remove("hidden");
});

cancelWithdrawBtn.addEventListener("click", () => {
    withdrawModal.classList.add("hidden");
});

confirmWithdrawBtn.addEventListener("click", async () => {
    if (availablePartnerBalance <= 0) return;
    
    const withdrawAmount = parseFloat(withdrawAmountInput.value);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        alert("กรุณาระบุยอดเงินที่ถูกต้อง");
        return;
    }
    if (withdrawAmount > availablePartnerBalance) {
        alert("ยอดเงินที่ระบุเกินกว่ายอดเงินที่ถอนได้");
        return;
    }
    
    const qrFile = document.getElementById("withdraw-qr-code").files[0];
    const bankDetails = document.getElementById("withdraw-bank-details").value.trim();
    
    if (!qrFile && !bankDetails) {
        alert("กรุณาแนบ QR Code หรือกรอกข้อมูลบัญชีรับเงิน");
        return;
    }
    
    confirmWithdrawBtn.disabled = true;
    confirmWithdrawBtn.textContent = "กำลังดำเนินการ...";
    
    try {
        let qrCodeUrl = "";
        if (qrFile) {
            qrCodeUrl = await uploadToCloudinary(qrFile);
        }
        
        await addDoc(collection(db, "withdrawal_requests"), {
            partnerId: currentPartnerUid,
            partnerEmail: currentPartnerEmail,
            amount: withdrawAmount,
            status: "pending",
            qrCodeUrl: qrCodeUrl,
            bankDetails: bankDetails,
            createdAt: serverTimestamp()
        });
        
        alert("แจ้งถอนเงินสำเร็จ! กรุณารอแอดมินดำเนินการโอนเงินและแนบสลิป");
        withdrawModal.classList.add("hidden");
        loadWithdrawalHistory();
    } catch (error) {
        console.error("Withdraw request error:", error);
        alert("เกิดข้อผิดพลาดในการแจ้งถอน");
    } finally {
        confirmWithdrawBtn.disabled = false;
        confirmWithdrawBtn.textContent = "ยืนยันถอนเงิน";
    }
});

// ==========================================
// Withdrawal History
// ==========================================
const loadWithdrawalHistory = async () => {
    try {
        const q = query(
            collection(db, "withdrawal_requests"), 
            where("partnerId", "==", currentPartnerUid)
        );
        const snapshot = await getDocs(q);
        
        const recentTbody = document.getElementById("withdrawal-history-tbody-recent");
        const olderTbody = document.getElementById("withdrawal-history-tbody-older");
        const searchInput = document.getElementById("search-partner-withdrawals");
        const dropdown = document.getElementById("partner-withdrawals-dropdown");
        
        if (!recentTbody || !olderTbody) return;
        
        recentTbody.innerHTML = "";
        olderTbody.innerHTML = "";
        
        if (snapshot.empty) {
            recentTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">ยังไม่มีประวัติการถอนเงิน</td></tr>';
            if(dropdown) dropdown.style.display = "none";
            return;
        }

        let pendingTotal = 0;
        const records = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            records.push({ id: docSnap.id, ...data });
            if (data.status === "pending") {
                pendingTotal += (data.amount || 0);
            }
        });
        
        if (typeof availablePartnerBalance !== "undefined") {
            availablePartnerBalance = Math.max(0, currentPartnerBalance - pendingTotal);
            if (partnerBalance) partnerBalance.textContent = availablePartnerBalance.toFixed(2);
        }
        
        records.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });

        let allHtml = [];
        records.forEach(data => {
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleString("th-TH") : "ไม่ทราบเวลา";
            const statusStr = data.status === "completed" 
                ? '<span style="color: var(--success); font-weight: bold;">โอนแล้ว</span>' 
                : '<span style="color: var(--warning); font-weight: bold;">รอโอน</span>';
            const slipHtml = data.slipUrl 
                ? `<a href="${data.slipUrl}" target="_blank" style="color: var(--accent-color); text-decoration: underline;">ดูสลิป</a>` 
                : '-';

            const searchKey = `${dateStr} ${data.status === 'completed' ? 'โอนแล้ว completed' : 'รอโอน pending'} ${data.amount}`.toLowerCase();

            const html = `
                <tr data-search="${searchKey}">
                    <td>${dateStr}</td>
                    <td>${data.amount.toFixed(2)}</td>
                    <td>${statusStr}</td>
                    <td>${slipHtml}</td>
                </tr>
            `;
            allHtml.push(html);
        });

        const renderWithdrawals = (filter = "") => {
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
        
    } catch (error) {
        console.error("Error loading withdrawal history:", error);
        const recentTbody = document.getElementById("withdrawal-history-tbody-recent");
        if (recentTbody) recentTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger);">เกิดข้อผิดพลาดในการโหลดประวัติ</td></tr>';
    }
};

// ==========================================
// Create Manga
// ==========================================
addMangaBtn.addEventListener("click", async () => {
    const type = addMangaType.value;
    const title = addMangaTitle.value.trim();
    const synopsis = addMangaSynopsis.value.trim();
    const tags = addMangaTags.value.split(",").map(t => t.trim()).filter(t => t);
    const freeCount = parseInt(addMangaFreeCount.value) || 0;
    const defaultPrice = parseFloat(addMangaDefaultPrice.value) || 0;
    const coverFile = addMangaCover.files[0];

    if (!title || !coverFile) {
        addMangaMsg.textContent = "กรุณากรอกชื่อเรื่องและอัปโหลดรูปหน้าปก";
        addMangaMsg.style.color = "var(--danger)";
        return;
    }

    addMangaBtn.disabled = true;
    addMangaBtn.textContent = "กำลังอัปโหลดและสร้างเรื่อง...";
    addMangaMsg.textContent = "";

    try {
        // Upload cover
        const coverUrl = await uploadToCloudinary(coverFile);

        // Save to Firestore
        await addDoc(collection(db, "mangas"), {
            type,
            title,
            synopsis,
            author: currentPartnerEmail.split('@')[0], // ใช้ชื่อหน้า email เป็นนามปากกาชั่วคราว
            tags,
            coverUrl,
            freeChapterCount: freeCount,
            defaultPrice: defaultPrice,
            views: 0,
            rating: 5.0,
            unlockedBy: [],
            ownerType: "partner", // บังคับเป็น partner
            revenueShare: 73, // ส่วนแบ่งเริ่มต้น 73%
            authorId: currentPartnerUid, // อ้างอิงตัวเอง
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        addMangaMsg.textContent = "สร้างเรื่องการ์ตูนสำเร็จ!";
        addMangaMsg.style.color = "var(--success)";
        
        // Reset form
        addMangaTitle.value = "";
        addMangaSynopsis.value = "";
        addMangaTags.value = "";
        addMangaCover.value = "";
        
        // Refresh manga lists
        loadPartnerMangas();
        
    } catch (error) {
        console.error("Error creating manga:", error);
        addMangaMsg.textContent = "เกิดข้อผิดพลาด: " + error.message;
        addMangaMsg.style.color = "var(--danger)";
    } finally {
        addMangaBtn.disabled = false;
        addMangaBtn.textContent = "สร้างเรื่องการ์ตูนใหม่";
    }
});

// ==========================================
// Load & Manage Mangas
// ==========================================
const loadPartnerMangas = async () => {
    if (!currentPartnerUid) return;
    
    try {
        const q = query(collection(db, "mangas"), where("authorId", "==", currentPartnerUid));
        const snapshot = await getDocs(q);
        
        partnerMangaCount.textContent = snapshot.size;
        
        let html = '<option value="">-- เลือกเรื่อง --</option>';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const typeStr = data.type || 'manga';
            html += `<option value="${docSnap.id}" data-type="${typeStr}">${data.title}</option>`;
        });
        
        selectManga.innerHTML = html;
        manageMangaSelect.innerHTML = html;

        if (selectMangaCb) selectMangaCb.updateOptions();
        if (manageMangaSelectCb) manageMangaSelectCb.updateOptions();
        
    } catch (error) {
        console.error("Error loading mangas:", error);
    }
};

manageMangaSelect.addEventListener("change", (e) => {
    const mangaId = e.target.value;
    if (mangaId) {
        editMangaBtn.style.display = "block";
        deleteMangaBtn.style.display = "block";
        manageChaptersContainer.classList.remove("hidden");
        loadManageChapters(mangaId);
    } else {
        editMangaBtn.style.display = "none";
        deleteMangaBtn.style.display = "none";
        manageChaptersContainer.classList.add("hidden");
    }
});

// Edit Manga
editMangaBtn.addEventListener("click", async () => {
    const mangaId = manageMangaSelect.value;
    if (!mangaId) return;
    try {
        const docSnap = await getDoc(doc(db, "mangas", mangaId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            editMangaId.value = mangaId;
            editMangaType.value = data.type || "manga";
            editMangaTitle.value = data.title;
            editMangaSynopsis.value = data.synopsis || "";
            editMangaTags.value = data.tags ? data.tags.join(", ") : "";
            editMangaFreeCount.value = data.freeChapterCount || 0;
            editMangaDefaultPrice.value = data.defaultPrice || 0;
            editMangaCover.value = ""; // clear file input
            editMangaModal.classList.remove("hidden");
        }
    } catch (error) {
        console.error("Error fetching manga:", error);
    }
});

cancelMangaEditBtn.addEventListener("click", () => {
    editMangaModal.classList.add("hidden");
});

saveMangaEditBtn.addEventListener("click", async () => {
    const mangaId = editMangaId.value;
    saveMangaEditBtn.disabled = true;
    saveMangaEditBtn.textContent = "กำลังบันทึก...";
    
    try {
        const type = editMangaType.value;
        const title = editMangaTitle.value.trim();
        const synopsis = editMangaSynopsis.value.trim();
        const tags = editMangaTags.value.split(",").map(t => t.trim()).filter(t => t);
        const freeCount = parseInt(editMangaFreeCount.value) || 0;
        const defaultPrice = parseFloat(editMangaDefaultPrice.value) || 0;
        const coverFile = editMangaCover.files[0];
        
        let updateData = {
            type, title, synopsis, tags,
            freeChapterCount: freeCount,
            defaultPrice,
            updatedAt: serverTimestamp()
        };
        
        if (coverFile) {
            updateData.coverUrl = await uploadToCloudinary(coverFile);
        }
        
        await updateDoc(doc(db, "mangas", mangaId), updateData);
        alert("อัปเดตข้อมูลเรื่องการ์ตูนสำเร็จ");
        editMangaModal.classList.add("hidden");
        loadPartnerMangas(); // รีเฟรช select
        manageMangaSelect.value = mangaId;
    } catch (error) {
        console.error("Error updating manga:", error);
        alert("เกิดข้อผิดพลาดในการอัปเดต");
    } finally {
        saveMangaEditBtn.disabled = false;
        saveMangaEditBtn.textContent = "บันทึกการแก้ไข";
    }
});

// Delete Manga
deleteMangaBtn.addEventListener("click", async () => {
    const mangaId = manageMangaSelect.value;
    if (!mangaId) return;
    
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเรื่องการ์ตูนนี้? (ตอนทั้งหมดของการ์ตูนนี้จะไม่สามารถเข้าถึงได้)")) {
        try {
            await deleteDoc(doc(db, "mangas", mangaId));
            alert("ลบเรื่องการ์ตูนสำเร็จ");
            loadPartnerMangas();
            editMangaBtn.style.display = "none";
            deleteMangaBtn.style.display = "none";
            manageChaptersContainer.classList.add("hidden");
        } catch (error) {
            console.error("Error deleting manga:", error);
            alert("เกิดข้อผิดพลาดในการลบ");
        }
    }
});

const loadManageChapters = async (mangaId) => {
    try {
        const q = query(collection(db, "chapters"), where("mangaId", "==", mangaId), orderBy("chapterNumber", "desc"));
        const snapshot = await getDocs(q);
        manageChaptersTbody.innerHTML = "";

        if (snapshot.empty) {
            manageChaptersTbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">ยังไม่มีตอน</td></tr>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            const typeStr = data.isFree 
                ? '<span style="color: var(--success); font-weight: 600;">✓ อ่านฟรี</span>' 
                : '<span style="color: #f59e0b; font-weight: 600;">🪙 เสียเงิน</span>';
            const priceStr = data.isFree ? '0' : data.price;
            
            let detailStr;
            if (data.content) {
                // Novel chapter - show character count
                const textContent = data.content.replace(/<[^>]*>/g, '');
                const charCount = textContent.length;
                detailStr = `<span style="color: #b05cff;">📖 ${charCount.toLocaleString()} ตัวอักษร</span>`;
            } else {
                detailStr = `<span style="color: #1de9b6;">🖼️ ${data.imageUrls?.length || 0} รูป</span>`;
            }
            
            manageChaptersTbody.innerHTML += `
                <tr>
                    <td>ตอนที่ ${data.chapterNumber}</td>
                    <td>${typeStr}</td>
                    <td>${priceStr}</td>
                    <td>${detailStr}</td>
                    <td>
                        <button class="btn-primary btn-sm edit-chapter-btn" style="background-color: #f59e0b;" data-id="${id}">แก้ไข</button>
                        <button class="btn-primary btn-sm delete-chapter-btn" style="background-color: var(--danger);" data-id="${id}">ลบ</button>
                    </td>
                </tr>
            `;
        });
        
        // Add event listeners for edit buttons
        document.querySelectorAll(".edit-chapter-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.getAttribute("data-id");
                await openEditChapterModal(id);
            });
        });

        // Add event listeners for delete buttons
        document.querySelectorAll(".delete-chapter-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.getAttribute("data-id");
                if(confirm("คุณแน่ใจหรือไม่ว่าต้องการลบตอนที่ " + id + " ? ข้อมูลจะไม่สามารถกู้คืนได้")) {
                    await deleteDoc(doc(db, "chapters", id));
                    alert("ลบตอนสำเร็จ");
                    loadManageChapters(mangaId);
                }
            });
        });

    } catch (error) {
        console.error("Error loading chapters:", error);
    }
};

// ==========================================
// Add Chapter
// ==========================================
selectManga.addEventListener("change", (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const type = selectedOption ? selectedOption.getAttribute('data-type') : 'manga';
    const imageContainer = document.getElementById('add-chapter-image-container');
    const contentContainer = document.getElementById('add-chapter-content-container');
    
    if (type === 'novel') {
        imageContainer.classList.add('hidden');
        contentContainer.classList.remove('hidden');
    } else {
        imageContainer.classList.remove('hidden');
        contentContainer.classList.add('hidden');
    }
});

addIsFree.addEventListener("change", (e) => {
    if (e.target.value === "true") {
        priceGroup.classList.add("hidden");
    } else {
        priceGroup.classList.remove("hidden");
    }
});

addChapterBtn.addEventListener("click", async () => {
    const mangaId = selectManga.value;
    const selectedOption = selectManga.options[selectManga.selectedIndex];
    const mangaType = selectedOption ? selectedOption.getAttribute('data-type') : 'manga';
    const chapterNum = parseInt(addChapterNum.value);
    const isFree = addIsFree.value === "true";
    const price = isFree ? 0 : parseFloat(addPrice.value);
    const files = addImages.files;
    const contentHtml = addChapterQuill.root.innerHTML;

    if (!mangaId) {
        addMsg.textContent = "กรุณาเลือกเรื่อง";
        addMsg.style.color = "var(--danger)";
        return;
    }

    if (!chapterNum) {
        addMsg.textContent = "กรุณากรอกลำดับตอน";
        addMsg.style.color = "var(--danger)";
        return;
    }
    
    if (mangaType !== 'novel' && files.length === 0) {
        addMsg.textContent = "กรุณาเลือกไฟล์ภาพอย่างน้อย 1 ไฟล์";
        addMsg.style.color = "var(--danger)";
        return;
    }
    
    if (mangaType === 'novel' && (!contentHtml || contentHtml === '<p><br></p>')) {
        addMsg.textContent = "กรุณากรอกเนื้อหานิยาย";
        addMsg.style.color = "var(--danger)";
        return;
    }

    if (!isFree && (!price || price <= 0)) {
        addMsg.textContent = "กรุณากำหนดราคาสำหรับตอนที่เสียเงิน";
        addMsg.style.color = "var(--danger)";
        return;
    }

    addChapterBtn.disabled = true;
    addChapterBtn.textContent = "กำลังอัปโหลด...";
    addMsg.textContent = "";

    try {
        let imageUrls = [];
        let content = null;
        
        if (mangaType !== 'novel') {
            const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
            for (let i = 0; i < sortedFiles.length; i++) {
                const file = sortedFiles[i];
                const url = await uploadToCloudinary(file);
                imageUrls.push(url);
                addChapterBtn.textContent = `กำลังอัปโหลด (${i + 1}/${sortedFiles.length})...`;
            }
        } else {
            content = contentHtml;
        }

        // บันทึกข้อมูลลง Firestore
        const newChapterRef = await addDoc(collection(db, "chapters"), {
            mangaId,
            chapterNumber: chapterNum,
            isFree,
            price,
            imageUrls: mangaType !== 'novel' ? imageUrls : null,
            content: mangaType === 'novel' ? content : null,
            createdAt: serverTimestamp()
        });

        // อัปเดต updatedAt และ latestChapters ของการ์ตูน
        const mangaRef = doc(db, "mangas", mangaId);
        const mangaSnap = await getDoc(mangaRef);
        if (mangaSnap.exists()) {
            let latest = mangaSnap.data().latestChapters || [];
            latest.unshift({
                id: newChapterRef.id,
                chapterNumber: chapterNum,
                isFree,
                createdAt: new Date().toISOString() // Use string for local cache, though it will be overwritten by serverTimestamp on fetch
            });
            // Keep only latest 2
            if (latest.length > 2) {
                latest = latest.slice(0, 2);
            }
            await updateDoc(mangaRef, {
                updatedAt: serverTimestamp(),
                latestChapters: latest
            });
        }

        addMsg.textContent = "เพิ่มตอนใหม่สำเร็จ!";
        addMsg.style.color = "var(--success)";

        // ล้างค่าฟอร์ม
        addChapterNum.value = "";
        addImages.value = "";
        if(manageMangaSelect.value === mangaId) {
            loadManageChapters(mangaId);
        }

    } catch (error) {
        console.error("Error adding chapter:", error);
        addMsg.textContent = "เกิดข้อผิดพลาด: " + error.message;
        addMsg.style.color = "var(--danger)";
    } finally {
        addChapterBtn.disabled = false;
        addChapterBtn.textContent = "อัปโหลดตอนใหม่";
    }
});

// ==========================================
// Edit Chapter Modal logic
// ==========================================
editChapterIsFree.addEventListener("change", (e) => {
    if (e.target.value === "true") {
        editChapterPriceGroup.classList.add("hidden");
    } else {
        editChapterPriceGroup.classList.remove("hidden");
    }
});

const openEditChapterModal = async (chapterId) => {
    try {
        const docSnap = await getDoc(doc(db, "chapters", chapterId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            editChapterId.value = chapterId;
            editChapterNum.value = data.chapterNumber;
            editChapterDisplayNum.textContent = data.chapterNumber;
            editChapterIsFree.value = data.isFree ? "true" : "false";
            
            if (data.isFree) {
                editChapterPriceGroup.classList.add("hidden");
            } else {
                editChapterPriceGroup.classList.remove("hidden");
                editChapterPrice.value = data.price || 0;
            }
            
            const selectedOption = manageMangaSelect.options[manageMangaSelect.selectedIndex];
            const mangaType = selectedOption ? selectedOption.getAttribute('data-type') : 'manga';
            const imageContainer = document.getElementById('edit-chapter-image-container');
            const contentContainer = document.getElementById('edit-chapter-content-container');
            
            if (mangaType === 'novel') {
                imageContainer.classList.add('hidden');
                contentContainer.classList.remove('hidden');
                editChapterQuill.root.innerHTML = data.content || '';
            } else {
                imageContainer.classList.remove('hidden');
                contentContainer.classList.add('hidden');
                editChapterImages.value = ""; // Clear file input
            }
            
            editChapterModal.classList.remove("hidden");
        }
    } catch (error) {
        console.error("Error getting chapter:", error);
        alert("เกิดข้อผิดพลาดในการดึงข้อมูลตอน");
    }
};

cancelChapterEditBtn.addEventListener("click", () => {
    editChapterModal.classList.add("hidden");
});

saveChapterEditBtn.addEventListener("click", async () => {
    const id = editChapterId.value;
    const mangaId = manageMangaSelect.value;
    const btn = saveChapterEditBtn;
    btn.disabled = true;
    btn.textContent = "กำลังอัปโหลดและบันทึก...";
    
    try {
        const isFree = editChapterIsFree.value === "true";
        const price = isFree ? 0 : parseFloat(editChapterPrice.value);
        const files = editChapterImages.files;
        
        const selectedOption = manageMangaSelect.options[manageMangaSelect.selectedIndex];
        const mangaType = selectedOption ? selectedOption.getAttribute('data-type') : 'manga';
        
        let updateData = {
            chapterNumber: parseInt(editChapterNum.value),
            isFree: isFree,
            price: price
        };
        
        if (mangaType === 'manga') {
            if (files && files.length > 0) {
                const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                const imageUrls = [];

                for (let i = 0; i < sortedFiles.length; i++) {
                    const file = sortedFiles[i];
                    const url = await uploadToCloudinary(file);
                    imageUrls.push(url);
                }
                updateData.imageUrls = imageUrls;
            }
        } else {
            updateData.content = editChapterQuill.root.innerHTML;
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
