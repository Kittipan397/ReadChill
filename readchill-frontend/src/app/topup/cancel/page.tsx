'use client';

import Link from 'next/link';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function TopupCancelPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-red-500/30 rounded-3xl p-8 md:p-12 text-center max-w-lg w-full shadow-2xl">
        <div className="w-24 h-24 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-500 shadow-inner">
          <XCircle size={56} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">ยกเลิกการชำระเงิน</h1>
        <p className="text-slate-500 dark:text-zinc-400 mb-8 text-lg">
          คุณได้ยกเลิกการทำรายการ หรือการชำระเงินไม่สำเร็จ หากมีข้อสงสัยโปรดติดต่อทีมงาน
        </p>

        <Link 
          href="/topup"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <ArrowLeft size={20} /> กลับไปหน้าเติมเหรียญ
        </Link>
      </div>
    </div>
  );
}
