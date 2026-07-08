"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Star, Eye, Clock, List, Play, ShoppingCart, X, Bookmark } from 'lucide-react';
import CommentSection from '@/components/comments/CommentSection';
import { useLanguage } from '@/context/LanguageContext';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, increment, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Chapter {
  id: string;
  number: number;
  title: string;
  date: string;
  isLocked: boolean;
  price?: number;
  hasUnlocked?: boolean;
}

export default function MangaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { t } = useLanguage();
  const { user, userData } = useAuth();
  
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localIsSaved, setLocalIsSaved] = useState(false);

  const mangaId = id;
  const [mangaBase, setMangaBase] = useState<any>(null);
  const [isLoadingManga, setIsLoadingManga] = useState(true);

  useEffect(() => {
    const fetchManga = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/mangas/${mangaId}`);
        const result = await res.json();
        if (result.success) {
          setMangaBase(result.data);
        } else {
          console.error("Manga not found");
        }
      } catch (err) {
        console.error("Error fetching manga", err);
      } finally {
        setIsLoadingManga(false);
      }
    };
    fetchManga();
  }, [mangaId]);

  const manga = useMemo(() => {
    if (!mangaBase) return null;
    const unlocked = userData?.unlockedChapters || [];
    return {
      ...mangaBase,
      chapters: (mangaBase.chapters || []).map((ch: any) => ({
        ...ch,
        isLocked: ch.isLocked && !unlocked.includes(`${mangaBase.id}_${ch.id}`),
        hasUnlocked: ch.isLocked && unlocked.includes(`${mangaBase.id}_${ch.id}`)
      }))
    };
  }, [mangaBase, userData?.unlockedChapters]);

  useEffect(() => {
    if (manga && userData?.savedMangas) {
      setLocalIsSaved(userData.savedMangas.includes(manga.id));
    }
  }, [manga, userData?.savedMangas]);

  if (isLoadingManga || !manga) return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center transition-colors">
      <div className="w-12 h-12 border-4 border-slate-200 dark:border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );

  const formatViews = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleChapterClick = (chapter: Chapter) => {
    if (chapter.isLocked) {
      if (!user) {
        router.push('/login');
        return;
      }
      setSelectedChapter(chapter);
    } else {
      router.push(`/manga/${manga.id}/chapter/${chapter.id}`);
    }
  };

  const handlePurchase = async () => {
    if (!selectedChapter || !userData || !user) return;
    const currentCoins = userData.coins || 0;
    const price = selectedChapter.price || 0;
    
    if (currentCoins < price) {
      // Not enough coins
      router.push('/topup');
      return;
    }

    setIsPurchasing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment/purchase-chapter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mangaId: manga.id,
          chapterId: selectedChapter.id,
          price: price
        })
      });

      const data = await res.json();
      
      if (!data.success) {
        alert(data.message || 'เกิดข้อผิดพลาดในการซื้อตอน');
        return;
      }
      
      setSelectedChapter(null);
      router.push(`/manga/${manga.id}/chapter/${selectedChapter.id}`);
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setIsSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/mangas/${manga.id}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setLocalIsSaved(data.isSaved);
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกเรื่อง');
      }
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการบันทึกเรื่อง');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPurchaseModal = () => {
    if (!selectedChapter) return null;
    const currentCoins = userData?.coins || 0;
    const price = selectedChapter.price || 0;
    const remaining = currentCoins - price;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedChapter(null)}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
            <div className="flex items-center gap-2 text-white font-bold">
              <ShoppingCart size={20} className="text-red-500" />
              <span>ยืนยันการซื้อตอน</span>
            </div>
            <button 
              onClick={() => setSelectedChapter(null)}
              className="text-zinc-400 hover:text-white p-1"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4 md:p-6 space-y-6">
            <p className="text-zinc-400 text-sm">ตรวจสอบรายละเอียดก่อนทำการซื้อตอนนี้</p>
            
            {/* Chapter Box */}
            <div className="flex gap-4 p-4 bg-zinc-900/50 border border-red-900/30 rounded-xl">
              <div className="w-16 h-24 relative rounded-lg overflow-hidden shrink-0">
                <Image src={manga.coverUrl} alt={manga.title} fill className="object-cover" unoptimized />
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-white font-bold line-clamp-1">{manga.title}</h3>
                <span className="text-zinc-400 text-sm mt-1">ตอนที่ {selectedChapter.number} {selectedChapter.title}</span>
                <span className="inline-flex items-center gap-1 mt-2 text-yellow-500 font-bold text-sm">
                  🪙 {price} เหรียญ
                </span>
              </div>
            </div>

            {/* Price Summary */}
            <div className="space-y-3 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">ยอดเหรียญปัจจุบัน</span>
                <span className="text-yellow-500 font-bold">🪙 {currentCoins}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">ราคาตอนนี้</span>
                <span className="text-red-400 font-bold">- 🪙 {price}</span>
              </div>
              <div className="h-px bg-zinc-800/80 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-300 font-medium">ยอดคงเหลือหลังซื้อ</span>
                <span className={`font-bold ${remaining < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {remaining < 0 ? 'เหรียญไม่พอ' : `🪙 ${remaining}`}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 p-4 border-t border-zinc-800/50 bg-zinc-900/50">
            <button 
              onClick={() => setSelectedChapter(null)}
              className="flex-1 py-3 text-zinc-400 hover:text-white font-medium bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button 
              onClick={handlePurchase}
              disabled={isPurchasing}
              className={`flex-1 py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                remaining < 0 
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20'
              }`}
            >
              {isPurchasing ? 'กำลังประมวลผล...' : remaining < 0 ? 'เติมเหรียญ' : 'ยืนยันการซื้อ'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-12 transition-colors">
      <AnimatePresence>
        {renderPurchaseModal()}
      </AnimatePresence>

      {/* Backdrop */}
      <div className="relative h-[40vh] md:h-[50vh] w-full border-b border-slate-200 dark:border-zinc-800 transition-colors">
        <Image
          src={manga.coverUrl}
          alt={manga.title}
          fill
          className="object-cover opacity-30 blur-sm"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/60 dark:from-zinc-950 dark:via-zinc-950/60 to-transparent transition-colors" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Cover Image */}
          <div className="shrink-0 mx-auto md:mx-0 w-48 md:w-64">
            <div className="aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-900 transition-colors">
              <Image
                src={manga.coverUrl}
                alt={manga.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left pt-2 md:pt-16">
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">{manga.title}</h1>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-600 dark:text-zinc-400 text-sm font-medium mb-6">
              <span className="flex items-center gap-1 text-yellow-500">
                <Star size={16} className="fill-yellow-500" /> {manga.rating}
              </span>
              <span className="flex items-center gap-1">
                <Eye size={16} /> {formatViews(manga.views)}
              </span>
              <span className="flex items-center gap-1">
                {t('manga.author')} 
                {manga.authorId ? (
                  <Link href={`/creator/${manga.authorId}`} className="text-blue-600 dark:text-blue-400 hover:underline font-bold">
                    {manga.author}
                  </Link>
                ) : (
                  <span>{manga.author}</span>
                )}
              </span>
              <span className="text-blue-600 dark:text-blue-400">{manga.status}</span>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
              {manga.tags.map((tag: string) => (
                <span key={tag} className="px-3 py-1 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-full text-xs font-medium border border-slate-200 dark:border-zinc-700 shadow-sm transition-colors">
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-slate-600 dark:text-zinc-300 leading-relaxed mb-8 max-w-3xl line-clamp-4 md:line-clamp-none text-sm md:text-base">
              {manga.description}
            </p>

            <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-8">
              <Link href={`/manga/${manga.id}/chapter/${manga.chapters[0]?.id || ''}`} className="btn-primary flex items-center justify-center gap-2 px-8 py-3 text-lg flex-1 md:flex-none">
                <Play size={20} className="fill-current" /> {t('manga.start_reading')}
              </Link>
              <button 
                onClick={handleToggleSave}
                disabled={isSaving}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold transition-all border ${
                  localIsSaved 
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' 
                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700'
                }`}
              >
                <Bookmark size={20} className={localIsSaved ? "fill-current" : ""} /> 
                {isSaving ? 'กำลังโหลด...' : localIsSaved ? 'บันทึกแล้ว' : 'บันทึกเรื่อง'}
              </button>
            </div>
          </div>
        </div>

        {/* Chapter List */}
        <div className="mt-16">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-zinc-800 pb-4 transition-colors">
            <List className="text-blue-600 dark:text-blue-500" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('manga.chapter_list')}</h2>
            <span className="text-slate-500 dark:text-zinc-500 text-sm ml-2">{t('manga.total')} {manga.chapters.length} {t('manga.chapters')}</span>
          </div>

          <div className="grid gap-3">
            {manga.chapters.map((chapter: Chapter) => (
              <button 
                key={chapter.id} 
                onClick={() => handleChapterClick(chapter)}
                className="group w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 transition-all shadow-sm text-left"
              >
                <div className="flex flex-col">
                  <span className="text-slate-900 dark:text-white font-medium text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {t('manga.chapter_prefix')} {chapter.number} {chapter.title}
                  </span>
                  <span className="text-slate-500 dark:text-zinc-500 text-sm flex items-center gap-1 mt-1">
                    <Clock size={14} /> {chapter.date}
                  </span>
                </div>
                
                <div>
                  {chapter.isLocked ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-50 dark:bg-zinc-800 text-yellow-600 dark:text-yellow-500 rounded-full text-sm font-bold border border-yellow-200 dark:border-yellow-500/30 transition-colors">
                      🪙 {chapter.price} {t('manga.coins')}
                    </span>
                  ) : chapter.hasUnlocked ? (
                    <span className="inline-block px-3 py-1 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-sm font-bold border border-green-200 dark:border-green-500/20 transition-colors">
                      ปลดล็อกแล้ว
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-sm font-bold border border-blue-200 dark:border-blue-500/20 transition-colors">
                      {t('manga.free')}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Comment Section */}
        <CommentSection mangaId={manga.id} />
      </div>
    </div>
  );
}
