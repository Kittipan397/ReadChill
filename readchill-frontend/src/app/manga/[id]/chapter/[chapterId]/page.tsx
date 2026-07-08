'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Settings, List, MessageSquare, Heart, Loader2 } from 'lucide-react';
import CommentSection from '@/components/comments/CommentSection';
import { useAntiCopy } from '@/hooks/useAntiCopy';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function ReaderPage({ params }: { params: Promise<{ id: string, chapterId: string }> }) {
  const { id, chapterId } = use(params);
  const { t } = useLanguage();
  // Use Anti-Copy Hook
  useAntiCopy('reader-container');
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  
  // Donation States
  const [donateAmount, setDonateAmount] = useState<string>('10');
  const [isDonating, setIsDonating] = useState(false);
  const [donateSuccess, setDonateSuccess] = useState(false);

  // Mock data for images
  const chapterImages = [
    'https://images.unsplash.com/photo-1542840410-3092f99611a3?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop',
  ];

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleDonate = async () => {
    if (!user) {
      alert(t('reader.donate_login'));
      return;
    }
    
    const amount = parseInt(donateAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsDonating(true);
    setDonateSuccess(false);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists() || (userDoc.data().coins || 0) < amount) {
        alert(t('reader.donate_not_enough'));
        setIsDonating(false);
        return;
      }
      
      // Deduct coins from user
      await updateDoc(userRef, {
        coins: increment(-amount)
      });
      
      // Add transaction to 'donations' collection (mocking sending to partner)
      await addDoc(collection(db, 'donations'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        mangaId: id,
        chapterId: chapterId,
        amount: amount,
        createdAt: serverTimestamp()
      });
      
      setDonateSuccess(true);
      setTimeout(() => setDonateSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert(t('reader.donate_error'));
    } finally {
      setIsDonating(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen relative overflow-hidden transition-colors">


      {/* Top Navbar (Reader specific) */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between transition-colors shadow-sm">
        <div className="flex items-center gap-4">
          <Link href={`/manga/${id}`} className="p-2 bg-slate-100 dark:bg-zinc-900 rounded-full text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-slate-900 dark:text-white font-bold text-lg leading-tight line-clamp-1 transition-colors">เกิดใหม่ทั้งทีก็เป็นสไลม์ไปซะแล้ว</h1>
            <p className="text-slate-500 dark:text-zinc-500 text-sm transition-colors">{t('reader.chapter_prefix')} {chapterId}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors" title={t('reader.settings')}>
            <Settings size={20} />
          </button>
          <button className="p-2 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors" title={t('reader.chapter_select')}>
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Reader Container */}
      <div id="reader-container" className="max-w-3xl mx-auto flex flex-col items-center bg-slate-100 dark:bg-zinc-950 relative transition-colors shadow-sm">
        {isLoading ? (
          <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-slate-200 dark:border-zinc-800 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin transition-colors"></div>
            <p className="text-slate-500 dark:text-zinc-500 transition-colors">{t('reader.loading_images')}</p>
          </div>
        ) : (
          <div className="w-full relative">
            {chapterImages.map((src, idx) => (
              <div key={idx} className="relative w-full aspect-auto min-h-[50vh]">
                {/* Watermark */}
                <div className="absolute inset-0 z-10 flex items-center justify-center opacity-5 dark:opacity-10 pointer-events-none select-none transition-opacity">
                  <h1 className="text-5xl font-black text-slate-900 dark:text-white rotate-[-45deg] whitespace-nowrap transition-colors">ReadChill</h1>
                </div>

                <Image
                  src={src}
                  alt={`Page ${idx + 1}`}
                  width={1200}
                  height={1800}
                  className="w-full h-auto select-none pointer-events-none block"
                  loading={idx === 0 ? "eager" : "lazy"} // Eager load first page, lazy load rest
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Support Artist (Donate) */}
      {!isLoading && (
        <div className="max-w-3xl mx-auto mt-8 mb-4 px-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm transition-colors">
            <div className="w-16 h-16 bg-pink-100 dark:bg-pink-500/10 rounded-full flex items-center justify-center mb-4">
              <Heart size={32} className="text-pink-500 fill-pink-500 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('reader.support_artist')}</h3>
            <p className="text-slate-500 dark:text-zinc-400 text-sm mb-6 max-w-md">
              {t('reader.support_desc')}
            </p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {[10, 50, 100].map(amount => (
                <button
                  key={amount}
                  onClick={() => setDonateAmount(amount.toString())}
                  className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center ${
                    donateAmount === amount.toString()
                      ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30 border-pink-500'
                      : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:border-pink-300 dark:hover:border-pink-500/50'
                  }`}
                >
                  <Heart size={16} className={`mr-1.5 ${donateAmount === amount.toString() ? 'text-white' : 'text-pink-500'}`} />
                  {amount}
                </button>
              ))}
              <div className="relative">
                <input 
                  type="number" 
                  min="1"
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  className="w-28 px-3 py-2 pl-8 text-center rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                  placeholder={t('reader.custom_amount')}
                />
                <Heart size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-500 pointer-events-none" />
              </div>
            </div>
            
            <button
              onClick={handleDonate}
              disabled={isDonating || !donateAmount || parseInt(donateAmount) <= 0}
              className="w-full sm:w-auto min-w-[200px] px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-xl shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDonating ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Heart size={20} className="fill-white" />
                  {t('reader.donate_btn').replace('{amount}', donateAmount || '0')}
                </>
              )}
            </button>
            
            {donateSuccess && (
              <div className="mt-4 text-green-600 dark:text-green-400 text-sm font-medium animate-bounce">
                {t('reader.donate_success')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      {!isLoading && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 p-4 flex items-center justify-between mb-8 rounded-xl shadow-sm transition-colors">
          <button className="flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors">
            <ChevronLeft size={20} /> <span className="hidden sm:inline">{t('reader.prev_chapter')}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-500 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-600/20 transition-colors">
            <MessageSquare size={18} /> <span className="hidden sm:inline">{t('reader.comments')}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-white font-medium bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 rounded-lg shadow-sm dark:shadow-lg dark:shadow-blue-500/20 transition-all">
            <span className="hidden sm:inline">{t('reader.next_chapter')}</span> <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Chapter Comments */}
      {!isLoading && (
        <div className="max-w-3xl mx-auto px-4 pb-12">
          <CommentSection mangaId={`${id}_chapter_${chapterId}`} />
        </div>
      )}
    </div>
  );
}
