/**
 * Shared Utility Functions for ReadChill
 */

/**
 * แปลง Date เป็นข้อความ "เมื่อ X ที่แล้ว" แบบภาษาไทย
 * @param {Date} date 
 * @returns {string}
 */
export function timeAgo(date) {
    if (!date) return "";
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " ปี";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " เดือน";
    interval = seconds / 86400;
    if (interval >= 1) return Math.floor(interval) + " วัน";
    interval = seconds / 3600;
    if (interval >= 1) return Math.floor(interval) + " ชั่วโมง";
    interval = seconds / 60;
    if (interval >= 1) return Math.floor(interval) + " นาที";
    return Math.max(0, Math.floor(seconds)) + " วินาที";
}
