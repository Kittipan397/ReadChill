'use client';

import { useEffect } from 'react';

export function useAntiCopy(containerId: string = 'reader-container') {
  useEffect(() => {
    // Prevent Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    // Prevent Dragging Images
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName && target.tagName.toLowerCase() === 'img') {
        e.preventDefault();
      }
    };
    document.addEventListener('dragstart', handleDragStart);

    // Prevent Text Selection
    const handleSelectStart = (e: Event) => e.preventDefault();
    document.addEventListener('selectstart', handleSelectStart);

    // Prevent Shortcuts (F12, Ctrl+C, Ctrl+P, Ctrl+S, Ctrl+U)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
      }
      if (
        e.ctrlKey &&
        e.shiftKey &&
        (e.key.toLowerCase() === 'i' || e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'c')
      ) {
        e.preventDefault();
      }
      if (
        e.ctrlKey &&
        (e.key.toLowerCase() === 'u' ||
          e.key.toLowerCase() === 'c' ||
          e.key.toLowerCase() === 'p' ||
          e.key.toLowerCase() === 's')
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Print Screen Overwrite
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('ระบบป้องกันลิขสิทธิ์: ไม่อนุญาตให้คัดลอกหน้าจอจาก ReadChill');
        }
      }
    };
    document.addEventListener('keyup', handleKeyUp);

    // Blur content when window loses focus
    const handleBlur = () => {
      const readerContainer = document.getElementById(containerId);
      if (readerContainer) {
        readerContainer.style.filter = 'blur(15px)';
      }
    };

    const handleFocus = () => {
      const readerContainer = document.getElementById(containerId);
      if (readerContainer) {
        readerContainer.style.filter = 'none';
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // Cleanup listeners on unmount
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [containerId]);
}
