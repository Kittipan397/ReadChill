"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Eye, Heart, Download, Palette, ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';

export default function ArtDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, userData } = useAuth();
  
  const [art, setArt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchArt = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/webtoons/${id}`);
        const result = await res.json();
        if (result.success && result.data.type === 'art') {
          setArt(result.data);
        } else {
          setErrorMsg("ไม่พบภาพวาดนี้ หรืออาจถูกลบไปแล้ว");
        }
      } catch (err) {
        setErrorMsg("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };
    fetchArt();
  }, [id]);

  const hasUnlocked = useMemo(() => {
    if (!art) return false;
    if (art.defaultPrice <= 0) return true;
    const unlockedArts = userData?.unlockedArts || [];
    return unlockedArts.includes(id);
  }, [art, userData?.unlockedArts]);

  const handlePurchase = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    const confirmBuy = window.confirm(`ยืนยันการซื้อภาพ "${art?.title}" ในราคา ${art?.defaultPrice} เหรียญ?`);
    if (!confirmBuy) return;

    setIsPurchasing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment/purchase-art`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          artId: id,
          price: art.defaultPrice
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("ซื้อภาพวาดสำเร็จ! คุณสามารถดาวน์โหลดภาพต้นฉบับได้แล้ว");
        router.refresh();
      } else {
        alert(data.message || "เกิดข้อผิดพลาดในการซื้อ");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleDownload = async () => {
    if (!user && art?.defaultPrice > 0) {
      router.push('/login');
      return;
    }

    setIsDownloading(true);
    try {
      let token = "";
      if (user) token = await user.getIdToken();
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/webtoons/art/${id}/download`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();

      if (data.success && data.data?.downloadUrl) {
        // Force download by creating a temporary anchor tag
        const link = document.createElement('a');
        link.href = data.data.downloadUrl;
        
        // Extract filename from URL or create a generic one
        const filename = data.data.downloadUrl.split('/').pop()?.split('?')[0] || `ReadChill_Art_${id}.jpg`;
        link.setAttribute('download', filename);
        
        document.body.appendChild(link);
        link.click();
        
        // Clean up and remove the link
        link.parentNode?.removeChild(link);

      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการดาวน์โหลดภาพ");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-pink-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!art || errorMsg) return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-zinc-200 mb-4">{errorMsg || "ไม่พบภาพวาด"}</h1>
      <Link href="/art" className="text-pink-600 hover:underline flex items-center gap-2">
        <ArrowLeft size={16} /> กลับหน้าหมวดหมู่ภาพวาด
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Link href="/art" className="inline-flex items-center gap-2 text-slate-500 hover:text-pink-600 dark:text-zinc-400 dark:hover:text-pink-500 transition-colors mb-6">
          <ArrowLeft size={18} /> ย้อนกลับ
        </Link>
        
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Image Preview Side */}
            <div className="relative bg-slate-200 dark:bg-zinc-950 flex items-center justify-center p-8 min-h-[400px]">
              <Image 
                src={art.coverUrl} 
                alt={art.title} 
                width={800} 
                height={800} 
                className="w-full max-w-md h-auto object-contain rounded-xl shadow-lg"
                unoptimized
              />
              {/* Watermark Overlay for visual cue */}
              {!hasUnlocked && art.defaultPrice > 0 && (
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                  <div className="text-white/40 text-4xl md:text-6xl font-black rotate-[-30deg] tracking-widest uppercase border-4 border-white/30 px-8 py-2 rounded-xl backdrop-blur-sm">
                    PREVIEW
                  </div>
                </div>
              )}
            </div>
            
            {/* Details Side */}
            <div className="p-8 md:p-12 flex flex-col justify-center space-y-6">
              <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 px-3 py-1 rounded-full text-xs font-bold w-fit">
                <Palette size={14} /> ภาพวาด (Artwork)
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black leading-tight">
                {art.title}
              </h1>
              
              <p className="text-slate-600 dark:text-zinc-400 text-lg">
                โดยนักวาด: <span className="font-bold text-slate-900 dark:text-white">{art.authorName || 'ไม่ระบุชื่อ'}</span>
              </p>
              
              <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-zinc-500">
                <span className="flex items-center gap-2"><Eye size={16}/> {art.views || 0} ครั้ง</span>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-zinc-800">
                <p className="text-slate-700 dark:text-zinc-300 leading-relaxed">
                  {art.description || 'ไม่มีคำอธิบายสำหรับผลงานชิ้นนี้'}
                </p>
              </div>
              
              <div className="pt-8">
                {hasUnlocked ? (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 transition-all text-lg disabled:opacity-70"
                  >
                    <Download size={22} />
                    {isDownloading ? 'กำลังโหลดภาพ...' : 'ดาวน์โหลดภาพต้นฉบับ (Hi-Res)'}
                  </motion.button>
                ) : (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                    className="w-full py-4 px-6 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-pink-500/30 transition-all text-lg disabled:opacity-70"
                  >
                    🪙 ซื้อภาพนี้ ({art.defaultPrice} เหรียญ)
                  </motion.button>
                )}
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
