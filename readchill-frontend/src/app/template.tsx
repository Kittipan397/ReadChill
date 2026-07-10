'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <>{children}</>;

  return (
    <>
      {/* Samurai Slash Top Half */}
      <motion.div
        key={`slash-top-${pathname}`}
        initial={{ y: 0 }}
        animate={{ y: '-100vh' }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.76, 0, 0.24, 1] }}
        className="fixed top-0 left-0 w-full h-[55vh] bg-zinc-950 z-[100] origin-top pointer-events-none"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 calc(100% - 10vh))' }}
      >
        <div className="absolute bottom-0 left-0 w-[150%] h-[2px] bg-red-600 shadow-[0_0_15px_#ef4444] transform rotate-[-5deg] origin-bottom-left" />
      </motion.div>

      {/* Samurai Slash Bottom Half */}
      <motion.div
        key={`slash-bottom-${pathname}`}
        initial={{ y: 0 }}
        animate={{ y: '100vh' }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.76, 0, 0.24, 1] }}
        className="fixed bottom-0 left-0 w-full h-[55vh] bg-zinc-950 z-[100] origin-bottom pointer-events-none"
        style={{ clipPath: 'polygon(0 10vh, 100% 0, 100% 100%, 0 100%)' }}
      >
        <div className="absolute top-0 left-0 w-[150%] h-[2px] bg-red-600 shadow-[0_0_15px_#ef4444] transform rotate-[-5deg] origin-top-left" />
      </motion.div>

      {/* The Quick Slash Line Flash */}
      <motion.div
        key={`slash-flash-${pathname}`}
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed top-[45vh] left-[-10%] w-[120%] h-[4px] bg-white z-[101] pointer-events-none origin-left shadow-[0_0_30px_white]"
        style={{ transform: 'rotate(-5deg)' }}
      />

      {/* Page Content Fade In */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        {children}
      </motion.div>
    </>
  );
}
