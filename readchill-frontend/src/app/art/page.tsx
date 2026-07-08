import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, Palette, Eye } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import T from '@/components/ui/T';
import HeroSection from '@/components/home/HeroSection';

async function getMangas() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/mangas`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch data');
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching mangas:', error);
    return [];
  }
}

export default async function ArtPage({ searchParams }: { searchParams: { page?: string } }) {
  const mangas = await getMangas();
  
  // Only art for Art page
  const artMangas = mangas.filter((m: any) => m.type === 'art');

  // Sort by updatedAt or createdAt (latest updates)
  const sortedMangas = [...artMangas].sort((a: any, b: any) => {
    const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
    const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
    return timeB - timeA; // Descending (latest first)
  });

  const ITEMS_PER_PAGE = 24;
  const currentPage = parseInt(searchParams.page || '1');
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayMangas = sortedMangas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(sortedMangas.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white transition-colors">
      <HeroSection />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 border-l-4 border-red-600 pl-3 leading-none text-white">
                อัพเดทล่าสุด
              </h2>
              <Link href="/search" className="text-zinc-400 hover:text-white text-xs font-medium flex items-center gap-1 border border-zinc-800 rounded-full px-4 py-1 transition-colors">
                ทั้งหมด <ArrowRight size={12} />
              </Link>
            </div>
            
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800">
              <Link href="/" className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white">
                <BookOpen size={18} /> คอมมิก
              </Link>
              <Link href="/novel" className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white">
                <BookOpen size={18} /> นิยาย
              </Link>
              <Link href="/art" className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors bg-pink-600 text-white shadow-sm">
                <Palette size={18} /> ภาพวาด
              </Link>
            </div>
          </div>

          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {displayMangas.length > 0 ? (
              displayMangas.map((art: any) => (
                <Link href={`/art/${art.id}`} key={art.id} className="block group relative rounded-2xl overflow-hidden bg-slate-200 dark:bg-zinc-800 break-inside-avoid shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                  <Image 
                    src={art.coverUrl} 
                    alt={art.title} 
                    width={500} 
                    height={500} 
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" 
                    unoptimized 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                    <h3 className="text-white font-bold text-sm md:text-base line-clamp-2">{art.title}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-zinc-300 text-xs flex items-center gap-1"><Eye size={12}/> {art.views || 0}</span>
                      {art.defaultPrice > 0 ? (
                        <span className="text-yellow-400 font-bold text-xs bg-yellow-400/20 px-2 py-1 rounded-full backdrop-blur-md">🪙 {art.defaultPrice}</span>
                      ) : (
                        <span className="text-blue-400 font-bold text-xs bg-blue-400/20 px-2 py-1 rounded-full backdrop-blur-md">ฟรี</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-slate-500 dark:text-zinc-500 col-span-full text-center py-10 w-full"><T path="home.no_data" /></p>
            )}
          </div>
          
          <Pagination totalPages={totalPages} />
        </div>
      </main>
    </div>
  );
}
