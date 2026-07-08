// ป้องกันการคลิกขวา
document.addEventListener('contextmenu', event => event.preventDefault());

// ป้องกันการลากรูปภาพ
document.addEventListener('dragstart', event => {
    if (event.target.tagName && event.target.tagName.toLowerCase() === 'img') {
        event.preventDefault();
    }
});

// ป้องกันการคลุมดำข้อความ
document.addEventListener('selectstart', event => event.preventDefault());

// ป้องกันคีย์บอร์ดชอร์ตคัต (F12, Ctrl+C, Ctrl+P, Ctrl+U, PrintScreen)
document.addEventListener('keydown', event => {
    // ป้องกัน F12
    if (event.key === 'F12' || event.keyCode === 123) {
        event.preventDefault();
    }
    // ป้องกัน Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
    if (event.ctrlKey && event.shiftKey && (event.key.toLowerCase() === 'i' || event.key.toLowerCase() === 'j' || event.key.toLowerCase() === 'c')) {
        event.preventDefault();
    }
    // ป้องกัน Ctrl+U (View Source), Ctrl+C (Copy), Ctrl+P (Print), Ctrl+S (Save)
    if (event.ctrlKey && (event.key.toLowerCase() === 'u' || event.key.toLowerCase() === 'c' || event.key.toLowerCase() === 'p' || event.key.toLowerCase() === 's')) {
        event.preventDefault();
    }
});


document.addEventListener('keyup', event => {
    if (event.key === 'PrintScreen' || event.keyCode === 44) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("ระบบป้องกันลิขสิทธิ์: ไม่อนุญาตให้คัดลอกหน้าจอจาก ReadChill");
        }
    }
});


window.addEventListener('blur', () => {
    const readerContainer = document.getElementById('reader-container');
    if (readerContainer) {
        readerContainer.style.filter = 'blur(10px)';
    }
});

window.addEventListener('focus', () => {
    const readerContainer = document.getElementById('reader-container');
    if (readerContainer) {
        readerContainer.style.filter = 'none';
    }
});
