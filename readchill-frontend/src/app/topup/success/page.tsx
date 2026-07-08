'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Home, Coins } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function TopupSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { t } = useLanguage();

  useEffect(() => {
    // Optionally: We could call a backend endpoint here to verify the session if we don't rely entirely on webhooks,
    // but relying on webhooks is the recommended Stripe pattern.
    if (sessionId) {
      console.log('Payment session completed:', sessionId);
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-green-500/30 rounded-3xl p-8 md:p-12 text-center max-w-lg w-full relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full bg-green-500/5 pointer-events-none"></div>
        
        <div className="w-24 h-24 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-500 shadow-inner">
          <CheckCircle size={56} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">ชำระเงินสำเร็จ!</h1>
        <p className="text-slate-500 dark:text-zinc-400 mb-8 text-lg">
          ระบบกำลังเพิ่มเหรียญเข้าสู่บัญชีของคุณ (อาจใช้เวลาประมาณ 1-2 นาทีในการอัปเดต)
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/topup"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Coins size={20} /> เติมเหรียญเพิ่ม
          </Link>
          <Link 
            href="/"
            className="flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold py-4 px-6 rounded-xl transition-colors border border-slate-200 dark:border-zinc-700 flex items-center justify-center gap-2"
          >
            <Home size={20} /> กลับหน้าแรก
          </Link>
        </div>
        
        {sessionId && (
          <p className="mt-8 text-xs text-slate-400 dark:text-zinc-500 font-mono">
            Ref: {sessionId.substring(0, 15)}...
          </p>
        )}
      </div>
    </div>
  );
}
