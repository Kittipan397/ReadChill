'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { BookOpen, History, Bookmark, LockOpen, ArrowRight, Star, Library } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';

export default function LibraryPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'history' | 'saved' | 'unlocked'>('history');

  const [savedMangas, setSavedMangas] = useState<any[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  useEffect(() => {
    if (activeTab === 'saved' && user) {
      const fetchSaved = async () => {
        setIsLoadingSaved(true);
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/saved-mangas`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const result = await res.json();
          if (result.success) {
            setSavedMangas(result.data || []);
          }
        } catch (error) {
          console.error("Failed to fetch saved mangas", error);
        } finally {
          setIsLoadingSaved(false);
        }
      };
      fetchSaved();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center transition-colors">
      <div className="w-12 h-12 border-4 border-slate-200 dark:border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );

  // Mock Data
  const historyMangas = [
    {
      id: 'lD47y3pc5qlC6hBBQHtO',
      title: 'เกิดใหม่ทั้งทีก็เป็นสไลม์ไปซะแล้ว',
      coverUrl: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=600&auto=format&fit=crop',
      lastRead: 'ตอนที่ 42 - การประชุมจอมมาร',
      progress: 80,
      timestamp: '2 ชั่วโมงที่แล้ว'
    },
    {
      id: '3BsOnQJ5GDS4KEfX3ap4',
      title: 'Solo Leveling - ลุยเดี่ยวอัพเลเวล',
      coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop',
      lastRead: 'ตอนที่ 155 - เงาที่ตื่นขึ้น',
      progress: 100,
      timestamp: 'เมื่อวานนี้'
    }
  ];

  // Use real unlocked chapters from userData
  const realUnlocked = user && userData?.unlockedChapters ? userData.unlockedChapters.map((chStr: string) => {
    const [mangaId, chapterId] = chStr.split('_');
    // We mock the title/details since we don't fetch all manga here yet
    return {
      mangaId,
      mangaTitle: mangaId === 'lD47y3pc5qlC6hBBQHtO' ? 'เกิดใหม่ทั้งทีก็เป็นสไลม์ไปซะแล้ว' : 'จอมเวทย์ฝึกหัด',
      chapter: mangaId === 'lD47y3pc5qlC6hBBQHtO' && chapterId === '4' ? 'ตอนที่ 4 - หมู่บ้านก็อบลิน' : `ตอนที่ ${chapterId}`,
      price: 10,
      unlockDate: 'วันนี้'
    };
  }) : [];

  const unlockedChapters = realUnlocked;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 pt-10 pb-6 relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-500 rounded-xl">
              <Library size={32} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{t('library.title')}</h1>
              <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('library.desc')}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-zinc-800">
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'history' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
            >
              <History size={18} /> {t('library.tab_history')}
            </button>
            <button 
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'saved' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
            >
              <Bookmark size={18} /> {t('library.tab_saved')}
            </button>
            <button 
              onClick={() => setActiveTab('unlocked')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'unlocked' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
            >
              <LockOpen size={18} /> {t('library.tab_unlocked')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {historyMangas.map((manga) => (
                <Link href={`/manga/${manga.id}`} key={manga.id} className="group flex gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm">
                  <div className="w-24 aspect-[2/3] relative rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-zinc-800">
                    <Image src={manga.coverUrl} alt={manga.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex flex-col py-1 overflow-hidden">
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{manga.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 line-clamp-1 flex-1">{manga.lastRead}</p>
                    
                    <div className="mt-2">
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${manga.progress}%` }}></div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500">
                        <span>{t('library.read_progress').replace('{percent}', manga.progress.toString())}</span>
                        <span className="flex items-center gap-1"><History size={12} /> {manga.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* SAVED TAB */}
        {activeTab === 'saved' && (
          <div className="animate-in fade-in duration-500">
            {isLoadingSaved ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 border-4 border-slate-200 dark:border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : savedMangas.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 border-dashed rounded-2xl shadow-sm">
                <Bookmark size={48} className="text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('library.no_saved')}</h3>
                <p className="text-slate-500 dark:text-zinc-500 mb-6">{t('library.no_saved_desc')}</p>
                <Link href="/" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
                  {t('library.go_read')} <ArrowRight size={18} />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedMangas.map((manga) => (
                  <Link href={`/manga/${manga.id}`} key={manga.id} className="group flex gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm">
                    <div className="w-24 aspect-[2/3] relative rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-zinc-800">
                      <Image src={manga.coverUrl} alt={manga.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="flex flex-col py-1 overflow-hidden">
                      <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{manga.title}</h3>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(manga.tags || []).slice(0, 2).map((tag: string) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-auto flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500">
                        <span className="flex items-center gap-1 text-yellow-500"><Star size={12} className="fill-current" /> {manga.rating}</span>
                        <span>{manga.status}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* UNLOCKED TAB */}
        {activeTab === 'unlocked' && (
          <div className="animate-in fade-in duration-500">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4 font-medium">{t('library.col_title')}</th>
                      <th className="px-6 py-4 font-medium">{t('library.col_price')}</th>
                      <th className="px-6 py-4 font-medium">{t('library.col_date')}</th>
                      <th className="px-6 py-4 text-right font-medium">{t('library.col_action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {unlockedChapters.map((chapter: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{chapter.mangaTitle}</div>
                          <div className="text-slate-500 dark:text-zinc-500 mt-1">{chapter.chapter}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
                            🪙 {chapter.price} Coins
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">
                          {chapter.unlockDate}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/manga/${chapter.mangaId}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1">
                            {t('library.read_again')} <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
