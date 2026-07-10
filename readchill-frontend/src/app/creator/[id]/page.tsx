'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BookOpen, Palette, Star, Eye } from 'lucide-react';
import Link from 'next/link';

export default function CreatorProfilePage() {
  const params = useParams();
  const id = params.id as string;
  
  const [creator, setCreator] = useState<any>(null);
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'webtoons' | 'art'>('webtoons');

  useEffect(() => {
    const fetchCreatorData = async () => {
      try {
        // Fetch Creator Profile
        const creatorDoc = await getDoc(doc(db, 'users', id));
        if (creatorDoc.exists()) {
          setCreator(creatorDoc.data());
        }

        // Fetch Creator Works
        const q = query(collection(db, 'webtoons'), where('authorId', '==', id));
        const querySnapshot = await getDocs(q);
        const worksData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort by created At or views if necessary, for now just set
        setWorks(worksData);
      } catch (error) {
        console.error("Error fetching creator data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchCreatorData();
    }
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-200 dark:border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
    </div>;
  }

  if (!creator) {
    return <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center text-slate-500">
      ไม่พบข้อมูลนักเขียน
    </div>;
  }

  const coverUrl = creator.coverUrl || "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=2000&auto=format&fit=crop";
  const avatarUrl = creator.photoURL || `https://ui-avatars.com/api/?name=${creator.displayName || 'Creator'}&background=1a90ff&color=fff`;

  const comics = works.filter(w => w.type !== 'art');
  const arts = works.filter(w => w.type === 'art');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] pb-20 transition-colors">
      
      {/* Cover */}
      <div className="w-full h-64 md:h-80 relative bg-zinc-800 overflow-hidden">
        <Image 
          src={coverUrl} 
          alt="Cover" 
          fill 
          className="object-cover" 
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mt-20 md:-mt-32">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Left Column (Profile Info) */}
          <div className="w-full md:w-80 shrink-0">
            <div className="bg-white/70 dark:bg-[#121212]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-2xl flex flex-col items-center text-center">
              
              <div className="relative w-32 h-32 mb-4">
                <Image 
                  src={avatarUrl} 
                  alt={creator.displayName || 'Creator'} 
                  fill
                  className="rounded-full border-4 border-white dark:border-[#121212] object-cover bg-white shadow-lg"
                  unoptimized
                />
                {creator.activeFrame && (
                  <div className="absolute -inset-4 z-30 pointer-events-none">
                    <Image src={creator.activeFrame} alt="frame" fill className="object-contain scale-[1.15]" unoptimized />
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {creator.displayName || 'Creator'}
              </h1>
              
              <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium mb-4 flex items-center gap-2 justify-center">
                {creator.role === 'artist' || creator.role === 'partner' ? (
                  <span className="text-pink-500 dark:text-pink-400 font-bold inline-flex items-center gap-1">
                    <Palette size={14} /> ครีเอเตอร์
                  </span>
                ) : (
                  'นักเขียน'
                )}
              </p>

              <div className="w-full text-left mb-6 pt-4 border-t border-slate-100 dark:border-white/5">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">เกี่ยวกับ</h3>
                {creator.bio ? (
                  <p className="text-slate-700 dark:text-zinc-300 text-sm whitespace-pre-wrap">{creator.bio}</p>
                ) : (
                  <p className="text-slate-500 dark:text-zinc-500 text-sm italic">ยังไม่มีข้อมูลแนะนำตัว...</p>
                )}
                
                {/* Social Links */}
                {(creator.facebook || creator.instagram) && (
                  <div className="mt-4 flex flex-col gap-2">
                    {creator.facebook && (
                      <a href={creator.facebook} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
                        📘 Facebook
                      </a>
                    )}
                    {creator.instagram && (
                      <a href={creator.instagram.startsWith('http') ? creator.instagram : `https://instagram.com/${creator.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-pink-600 hover:underline flex items-center gap-1">
                        📸 Instagram
                      </a>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Right Column (Works) */}
          <div className="flex-1 mt-6 md:mt-24">
            
            <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-white/5 pb-4">
              <button 
                onClick={() => setActiveTab('webtoons')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors ${activeTab === 'webtoons' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
              >
                <BookOpen size={18} />
                เว็บตูน / นิยาย ({comics.length})
              </button>
              <button 
                onClick={() => setActiveTab('art')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors ${activeTab === 'art' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
              >
                <Palette size={18} />
                ภาพวาด ({arts.length})
              </button>
            </div>

            {activeTab === 'webtoons' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {comics.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-500">ไม่มีผลงาน</div>
                ) : (
                  comics.map(webtoon => (
                    <Link href={`/webtoon/${webtoon.id}`} key={webtoon.id} className="group flex flex-col gap-3">
                      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-slate-200 dark:bg-zinc-800 shadow-md group-hover:shadow-xl transition-all group-hover:-translate-y-1">
                        <Image src={webtoon.coverUrl} alt={webtoon.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" unoptimized />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                          <span className="text-white text-xs font-bold flex items-center gap-1"><Star size={12} className="fill-yellow-500 text-yellow-500"/> {webtoon.rating || '0.0'}</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-500 transition-colors">{webtoon.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                          <span className="flex items-center gap-1"><Eye size={12} /> {webtoon.views || 0}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {activeTab === 'art' && (
              <div className="columns-2 md:columns-3 gap-4 space-y-4">
                {arts.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-500">ไม่มีผลงานภาพวาด</div>
                ) : (
                  arts.map(art => (
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
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
