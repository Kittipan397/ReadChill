import { db, auth } from "./firebase.js";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp, onSnapshot, arrayUnion, arrayRemove, increment, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { uploadToCloudinary } from "./cloudinary.js";

// DOM Elements
const postFormContainer = document.getElementById("post-form-container");
const guestPrompt = document.getElementById("guest-prompt");
const requestForm = document.getElementById("request-form");
const reqTitle = document.getElementById("req-title");
const reqDesc = document.getElementById("req-desc");
const reqImage = document.getElementById("req-image");
const imagePreview = document.getElementById("image-preview");
const postError = document.getElementById("post-error");
const btnSubmitReq = document.getElementById("btn-submit-req");
const requestFeed = document.getElementById("request-feed");
const loadingSpinner = document.getElementById("loading-spinner");

let currentUser = null;
let unsubscribeRequests = null;
let currentSort = "createdAt"; // createdAt or upvotes

// Auth Check
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        postFormContainer.classList.remove("hidden");
        guestPrompt.classList.add("hidden");
    } else {
        postFormContainer.classList.add("hidden");
        guestPrompt.classList.remove("hidden");
    }
    
    // Refresh feed to show upvote states correctly
    loadFeed();
});

// Image Preview
reqImage.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = "block";
        };
        reader.readAsDataURL(file);
    } else {
        imagePreview.style.display = "none";
        imagePreview.src = "";
    }
});

// Submit Post
requestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const title = reqTitle.value.trim();
    const desc = reqDesc.value.trim();
    const file = reqImage.files[0];

    if (!title || !desc) {
        postError.textContent = "กรุณากรอกข้อมูลให้ครบถ้วน";
        return;
    }

    btnSubmitReq.disabled = true;
    btnSubmitReq.textContent = "กำลังโพสต์...";
    postError.textContent = "";

    try {
        let coverUrl = null;

        // Upload image if selected
        if (file) {
            coverUrl = await uploadToCloudinary(file);
        }

        // Add to Firestore
        await addDoc(collection(db, "requests"), {
            title: title,
            description: desc,
            coverUrl: coverUrl,
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            userPhoto: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email)}&background=1a90ff&color=fff`,
            upvotes: 0,
            upvotedBy: [],
            createdAt: serverTimestamp()
        });

        // Reset form
        requestForm.reset();
        imagePreview.style.display = "none";
        imagePreview.src = "";
        
    } catch (error) {
        console.error("Error posting request:", error);
        postError.textContent = "เกิดข้อผิดพลาด: " + error.message;
    } finally {
        btnSubmitReq.disabled = false;
        btnSubmitReq.textContent = "โพสต์รีเควส";
    }
});

// Sort Filters
document.getElementById("sort-recent").addEventListener("click", (e) => {
    document.getElementById("sort-recent").classList.add("active");
    document.getElementById("sort-popular").classList.remove("active");
    currentSort = "createdAt";
    loadFeed();
});

document.getElementById("sort-popular").addEventListener("click", (e) => {
    document.getElementById("sort-popular").classList.add("active");
    document.getElementById("sort-recent").classList.remove("active");
    currentSort = "upvotes";
    loadFeed();
});

// Load Feed
const loadFeed = () => {
    if (unsubscribeRequests) {
        unsubscribeRequests();
    }

    loadingSpinner.classList.remove("hidden");
    requestFeed.innerHTML = "";

    const q = query(collection(db, "requests"), orderBy(currentSort, "desc"));

    unsubscribeRequests = onSnapshot(q, (snapshot) => {
        loadingSpinner.classList.add("hidden");
        requestFeed.innerHTML = "";

        if (snapshot.empty) {
            requestFeed.innerHTML = "<p style='color: var(--text-secondary); text-align: center;'>ยังไม่มีรีเควสการ์ตูนในระบบ มารีเควสเรื่องแรกกันเลย!</p>";
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            renderRequestCard(id, data);
        });
    }, (error) => {
        console.error("Error listening to feed:", error);
        loadingSpinner.classList.add("hidden");
        requestFeed.innerHTML = `<p style="color: var(--danger); text-align: center;">เกิดข้อผิดพลาดในการดึงข้อมูล</p>`;
    });
};

const renderRequestCard = (id, data) => {
    const isUpvoted = currentUser ? (data.upvotedBy || []).includes(currentUser.uid) : false;
    
    // Time formatting
    let timeStr = "เพิ่งโพสต์";
    if (data.createdAt) {
        const date = data.createdAt.toDate();
        timeStr = date.toLocaleDateString("th-TH", { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    const card = document.createElement("div");
    card.className = "request-card";
    
    let imgHtml = "";
    if (data.coverUrl) {
        imgHtml = `<img src="${data.coverUrl}" class="request-image" alt="Request Cover">`;
    }

    card.innerHTML = `
        <div class="request-header">
            <div class="request-author">
                <img src="${data.userPhoto}" alt="Author" referrerpolicy="no-referrer">
                <div class="request-author-info">
                    <h4>${data.userName}</h4>
                    <span>${timeStr}</span>
                </div>
            </div>
        </div>
        <div class="request-content">
            <h3>${data.title}</h3>
            <p>${data.description}</p>
            ${imgHtml}
        </div>
        <div class="request-actions">
            <button class="action-btn upvote-btn ${isUpvoted ? 'upvoted' : ''}" onclick="window.toggleUpvote('${id}', ${isUpvoted})">
                <ion-icon name="${isUpvoted ? 'caret-up' : 'caret-up-outline'}"></ion-icon>
                <span>${data.upvotes || 0}</span>
            </button>
            <button class="action-btn comment-btn" onclick="window.toggleComments('${id}')">
                <ion-icon name="chatbubble-outline"></ion-icon>
                <span>แสดงความคิดเห็น</span>
            </button>
        </div>
        <div id="comments-${id}" class="comments-section hidden">
            <div class="comment-input-wrapper">
                <img src="${currentUser ? currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email)}` : 'https://ui-avatars.com/api/?name=Guest'}" alt="Me" referrerpolicy="no-referrer">
                <input type="text" id="comment-input-${id}" placeholder="${currentUser ? 'เขียนความคิดเห็น...' : 'กรุณาเข้าสู่ระบบก่อนคอมเมนต์'}" ${!currentUser ? 'disabled' : ''} onkeypress="if(event.key === 'Enter') window.submitComment('${id}')">
                <button onclick="window.submitComment('${id}')" ${!currentUser ? 'disabled' : ''}><ion-icon name="send"></ion-icon></button>
            </div>
            <div id="comment-list-${id}" class="comment-list">
                <!-- Comments rendered here -->
                <div style="text-align: center; color: var(--text-secondary); font-size: 0.9rem;">กำลังโหลดความคิดเห็น...</div>
            </div>
        </div>
    `;

    requestFeed.appendChild(card);
};

// Toggle Upvote (Global scope for inline onclick)
window.toggleUpvote = async (requestId, isCurrentlyUpvoted) => {
    if (!currentUser) {
        alert("กรุณาเข้าสู่ระบบก่อนทำการโหวต");
        return;
    }

    try {
        const reqRef = doc(db, "requests", requestId);
        
        if (isCurrentlyUpvoted) {
            await updateDoc(reqRef, {
                upvotes: increment(-1),
                upvotedBy: arrayRemove(currentUser.uid)
            });
        } else {
            await updateDoc(reqRef, {
                upvotes: increment(1),
                upvotedBy: arrayUnion(currentUser.uid)
            });
        }
    } catch (error) {
        console.error("Error toggling upvote:", error);
    }
};

// Toggle Comments visibility and load them
window.toggleComments = (requestId) => {
    const commentsSection = document.getElementById(`comments-${requestId}`);
    if (commentsSection.classList.contains("hidden")) {
        commentsSection.classList.remove("hidden");
        loadComments(requestId);
    } else {
        commentsSection.classList.add("hidden");
    }
};

// Submit Comment
window.submitComment = async (requestId) => {
    if (!currentUser) return;
    
    const inputField = document.getElementById(`comment-input-${requestId}`);
    const text = inputField.value.trim();
    
    if (!text) return;
    
    inputField.disabled = true;
    
    try {
        await addDoc(collection(db, "request_comments"), {
            requestId: requestId,
            text: text,
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            userPhoto: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email)}&background=1a90ff&color=fff`,
            createdAt: serverTimestamp()
        });
        
        inputField.value = "";
    } catch (error) {
        console.error("Error adding comment:", error);
        alert("เกิดข้อผิดพลาดในการส่งความคิดเห็น");
    } finally {
        inputField.disabled = false;
        inputField.focus();
    }
};

// Load Comments
const loadComments = (requestId) => {
    const commentList = document.getElementById(`comment-list-${requestId}`);
    
    const qSafe = query(collection(db, "request_comments"), where("requestId", "==", requestId));
    
    onSnapshot(qSafe, (snapshot) => {
        commentList.innerHTML = "";
        
        if (snapshot.empty) {
            commentList.innerHTML = "<p style='color: var(--text-secondary); text-align: center; font-size: 0.9rem;'>ยังไม่มีความคิดเห็น</p>";
            return;
        }
        
        // Sort client side since we didn't use orderBy (to avoid requiring an index on requestId + createdAt)
        const comments = [];
        snapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        
        comments.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
        
        comments.forEach(data => {
            let timeStr = "";
            if (data.createdAt) {
                const date = data.createdAt.toDate();
                timeStr = date.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' }) + " น.";
            }

            const item = document.createElement("div");
            item.className = "comment-item";
            item.innerHTML = `
                <img src="${data.userPhoto}" alt="User" referrerpolicy="no-referrer">
                <div class="comment-bubble">
                    <strong>${data.userName} <span style="font-weight: normal; opacity: 0.7; font-size: 0.8rem; margin-left: 0.5rem;">${timeStr}</span></strong>
                    <p>${data.text}</p>
                </div>
            `;
            commentList.appendChild(item);
        });
    });
};
