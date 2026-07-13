export const dynamic = 'force-dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Flame, BookOpen, Palette, Eye } from 'lucide-react';
import WebtoonCard from '@/components/ui/WebtoonCard';
import Pagination from '@/components/ui/Pagination';
import T from '@/components/ui/T';
import HeroSection from '@/components/home/HeroSection';

async function getWebtoons(page: number, limit: number, type: string) {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://readchill-574138149891.asia-southeast1.run.app';
    const res = await fetch(`${API_BASE}/api/v1/webtoons?page=${page}&limit=${limit}&type=${type}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch data');
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching webtoons:', error);
    return [];
  }
}

export default async function Home({ searchParams }: { searchParams: { page?: string } }) {
  const ITEMS_PER_PAGE = 24;
  const params = await searchParams;
  const currentPage = parseInt(params.page || '1');
  
  // Note: Home page treats "webtoon" as the primary webtoon type
  const displayWebtoons = await getWebtoons(currentPage, ITEMS_PER_PAGE, "webtoon");
  const hasNextPage = displayWebtoons.length === ITEMS_PER_PAGE;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white transition-colors">
      {/* Hero Section */}
      <HeroSection />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Popular Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 border-l-4 border-red-600 pl-3 leading-none text-white">
                อัพเดทล่าสุด
              </h2>
              <Link href={`/search`} className="text-zinc-400 hover:text-white text-xs font-medium flex items-center gap-1 border border-zinc-800 rounded-full px-4 py-1 transition-colors">
                ทั้งหมด <ArrowRight size={12} />
              </Link>
            </div>
            
            {/* Tabs */}
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800">
              <Link href="/" className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white shadow-sm">
                <BookOpen size={18} /> เว็บตูน
              </Link>
              <Link href="/novel" className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white">
                <BookOpen size={18} /> นิยาย
              </Link>
              <Link href="/art" className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white">
                <Palette size={18} /> ภาพวาด
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {displayWebtoons.length > 0 ? (
              displayWebtoons.map((webtoon: any) => (
                <WebtoonCard key={webtoon.id} {...webtoon} />
              ))
            ) : (
              <p className="text-slate-500 dark:text-zinc-500 col-span-full text-center py-10"><T path="home.no_data" /></p>
            )}
          </div>
          
          <Pagination hasNextPage={hasNextPage} />
        </div>

      </main>
    </div>
  );
}
