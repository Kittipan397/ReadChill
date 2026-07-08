'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, PencilRuler } from 'lucide-react';
import T from '@/components/ui/T';

export default function HeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: 'spring', 
        stiffness: 70, 
        damping: 15 
      } 
    }
  };

  return (
    <section className="relative overflow-hidden border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-black">
      {/* Monochrome, Eye-friendly subtle pattern background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-30"></div>
      
      {/* Subtle top/bottom gradients for smooth blending */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white dark:from-black dark:via-transparent dark:to-black"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-36 flex flex-col items-center text-center">
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center w-full"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 text-sm font-medium shadow-sm transition-colors">
              <PencilRuler size={16} />
              <span><T path="home.update_daily" /></span>
            </div>
          </motion.div>
          
          {/* Main Title */}
          <motion.h1 variants={itemVariants} className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6 leading-tight">
            <T path="home.hero_title_1" /> <br className="hidden sm:block" />
            <span className="text-slate-500 dark:text-zinc-400">
              <T path="home.hero_title_2" />
            </span>
          </motion.h1>
          
          {/* Description */}
          <motion.p variants={itemVariants} className="text-slate-600 dark:text-zinc-400 text-lg sm:text-xl max-w-2xl mb-12 leading-relaxed">
            <T path="home.hero_desc" />
          </motion.p>
          
          {/* Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link 
              href="/search" 
              className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black text-lg px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <T path="home.start_reading" />
              <ArrowRight size={20} />
            </Link>
            <Link 
              href="/topup" 
              className="bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-white text-lg font-medium px-8 py-3.5 rounded-xl transition-all border border-slate-200 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-500 text-center shadow-sm active:scale-95"
            >
              <T path="home.topup" />
            </Link>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
