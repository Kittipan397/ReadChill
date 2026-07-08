// จัดการ Dark/Light Mode
function initTheme() {
    // เลือกปุ่มสลับธีมทั้งสองตัว (จาก nav หลัก และ reader-top-bar)
    const themeToggles = document.querySelectorAll('#theme-toggle, #reader-theme-toggle');
    if (themeToggles.length === 0) {
        console.warn("Theme toggle button not found!");
        return;
    }

    // ดึงค่า theme จาก localStorage ถ้าไม่มีให้ใช้โหมด dark
    const currentTheme = localStorage.getItem('theme') || 'dark';

    // ตั้งค่าเริ่มต้นตอนโหลดหน้า
    if (currentTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggles.forEach(btn => btn.innerHTML = '<ion-icon name="moon"></ion-icon>');
    } else {
        document.body.classList.remove('light-mode');
        themeToggles.forEach(btn => btn.innerHTML = '<ion-icon name="sunny"></ion-icon>');
    }

    // เมื่อกดปุ่มสลับโหมด
    themeToggles.forEach(themeToggle => {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            
            // สลับไอคอนทุกปุ่ม
            themeToggles.forEach(btn => {
                btn.innerHTML = isLight 
                    ? '<ion-icon name="moon"></ion-icon>' 
                    : '<ion-icon name="sunny"></ion-icon>';
            });
                
            console.log("Theme switched to:", isLight ? "light" : "dark");
        });
    });
}

// Ensure DOM is fully parsed
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}

// --- Sidebar Logic ---
document.addEventListener("DOMContentLoaded", () => {
    // We add this in DOMContentLoaded because these elements might be added at the end of body
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const sidebar = document.getElementById("mobile-sidebar");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const sidebarCloseBtn = document.getElementById("sidebar-close");

    if (hamburgerBtn && sidebar && sidebarOverlay) {
        const openSidebar = () => {
            sidebar.classList.add("active");
            sidebarOverlay.classList.add("active");
            document.body.style.overflow = "hidden"; // Prevent scrolling behind
        };

        const closeSidebar = () => {
            sidebar.classList.remove("active");
            sidebarOverlay.classList.remove("active");
            document.body.style.overflow = "";
        };

        hamburgerBtn.addEventListener("click", openSidebar);
        sidebarCloseBtn?.addEventListener("click", closeSidebar);
        sidebarOverlay.addEventListener("click", closeSidebar);
    }
});
