'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Search as SearchIcon, User, Filter, BookOpen, X } from 'lucide-react';
import WebtoonCard from '@/components/ui/WebtoonCard';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';



export default function SearchPage() {
  const { t } = useLanguage();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [searchAuthor, setSearchAuthor] = useState('');
  const [searchType, setSearchType] = useState<string>('all');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreInput, setGenreInput] = useState('');

  // Author Autocomplete States
  const [partnerUsers, setPartnerUsers] = useState<any[]>([]);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);

  // Webtoons Data State
  const [webtoons, setWebtoons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch partners on mount
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'partner'));
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPartnerUsers(users);
      } catch (err) {
        console.error("Error fetching partners:", err);
      }
    };
    
    const fetchWebtoons = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/webtoons?limit=500`);
        const result = await res.json();
        if (result.success) {
          setWebtoons(result.data || []);
        }
      } catch (err) {
        console.error("Error fetching webtoons", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartners();
    fetchWebtoons();
  }, []);

  const filteredAuthors = useMemo(() => {
    if (!searchAuthor) return [];
    return partnerUsers.filter(u => u.displayName?.toLowerCase().includes(searchAuthor.toLowerCase()));
  }, [searchAuthor, partnerUsers]);

  // Extract all unique genres from the database
  const ALL_GENRES = useMemo(() => {
    const genresSet = new Set<string>();
    webtoons.forEach(m => {
      if (m.tags && Array.isArray(m.tags)) {
        m.tags.forEach((t: string) => genresSet.add(t));
      }
    });
    return Array.from(genresSet);
  }, [webtoons]);

  // Available Genres after filtering by input and removing already selected
  const availableGenres = useMemo(() => {
    return ALL_GENRES.filter(g => 
      !selectedGenres.includes(g) && g.toLowerCase().includes(genreInput.toLowerCase())
    );
  }, [genreInput, selectedGenres, ALL_GENRES]);

  // Toggle Genre
  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  // Real-time Filtering
  const filteredResults = useMemo(() => {
    return webtoons.filter(item => {
      // Filter by Title
      if (searchTerm && !item.title?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Filter by Author
      if (searchAuthor && !(item.author || '').toLowerCase().includes(searchAuthor.toLowerCase())) {
        return false;
      }
      // Filter by Type
      if (searchType !== 'all' && item.type !== searchType) {
        return false;
      }
      // Filter by Genres (must contain ALL selected genres)
      if (selectedGenres.length > 0) {
        const itemGenres = item.tags || [];
        const hasAllGenres = selectedGenres.every(g => itemGenres.includes(g));
        if (!hasAllGenres) return false;
      }
      
      return true;
    });
  }, [searchTerm, searchAuthor, searchType, selectedGenres, webtoons]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <SearchIcon className="text-blue-600 dark:text-blue-500" size={32} />
            {t('search.title')}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2">{t('search.desc')}</p>
        </div>

        {/* Filters Top Bar */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 mb-8 shadow-sm transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            
            {/* Title / Chapter Search */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">{t('search.placeholder_title')}</label>
              <div className="relative">
                <SearchIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('search.placeholder_title')}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Author Search */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">{t('search.placeholder_author')}</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input 
                  type="text" 
                  value={searchAuthor}
                  onChange={(e) => {
                    setSearchAuthor(e.target.value);
                    setShowAuthorDropdown(true);
                  }}
                  onFocus={() => setShowAuthorDropdown(true)}
                  onBlur={() => setTimeout(() => setShowAuthorDropdown(false), 200)}
                  placeholder={t('search.placeholder_author')}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                {searchAuthor && (
                  <button onClick={() => setSearchAuthor('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 z-10">
                    <X size={16} />
                  </button>
                )}
                
                {/* Autocomplete Dropdown */}
                {showAuthorDropdown && filteredAuthors.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {filteredAuthors.map(author => (
                      <div 
                        key={author.id}
                        onClick={() => {
                          setSearchAuthor(author.displayName);
                          setShowAuthorDropdown(false);
                        }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors border-b border-slate-100 dark:border-zinc-800/50 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                          {author.photoURL ? (
                            <img src={author.photoURL} alt={author.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} className="text-slate-400 dark:text-zinc-500" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                          {author.displayName}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Work Type Select */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-2">ประเภทผลงาน</label>
              <div className="relative">
                <BookOpen size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <select 
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="all">{t('search.type_all')}</option>
                  <option value="webtoon">{t('search.type_comic')}</option>
                  <option value="novel">{t('search.type_novel')}</option>
                  <option value="art">{t('search.type_art')}</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end justify-end">
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSearchAuthor('');
                  setSearchType('all');
                  setSelectedGenres([]);
                }}
                className="w-full lg:w-auto px-6 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Filter size={16} /> ล้างตัวกรอง
              </button>
            </div>
            
          </div>

          {/* Genres Search and Select */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase mb-3">{t('search.genres')}</label>
            
            {/* Selected Genres Chips */}
            {selectedGenres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedGenres.map(genre => (
                  <span
                    key={genre}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-bold flex items-center gap-1 shadow-md shadow-blue-500/20"
                  >
                    {genre}
                    <button 
                      onClick={() => toggleGenre(genre)} 
                      className="hover:bg-white/20 p-0.5 rounded-full transition-colors ml-1"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search Input for Genres */}
            <div className="relative w-full md:w-1/2 mb-3">
              <input 
                type="text" 
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && genreInput.trim()) {
                    toggleGenre(genreInput.trim());
                    setGenreInput('');
                  }
                }}
                placeholder="พิมพ์ค้นหาหมวดหมู่ (หรือกด Enter เพื่อเพิ่มหมวดหมู่)..."
                className="w-full px-4 pr-10 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              {genreInput && (
                <button 
                  onClick={() => setGenreInput('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Available Genres (Filtered) */}
            {availableGenres.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableGenres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => { toggleGenre(genre); setGenreInput(''); }}
                    className="px-4 py-1.5 rounded-full text-sm font-medium bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all"
                  >
                    + {genre}
                  </button>
                ))}
              </div>
            ) : (
              genreInput && <p className="text-sm text-slate-500 dark:text-zinc-500">ไม่พบหมวดหมู่ที่ค้นหา</p>
            )}
          </div>
        </div>

        {/* Results Grid */}
        <div>
          <div className="mb-4 text-slate-500 dark:text-zinc-400 font-medium">
            พบผลลัพธ์ {filteredResults.length} รายการ
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="w-12 h-12 border-4 border-slate-200 dark:border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {filteredResults.map(item => (
                <div key={item.id} className="relative group">
                  <WebtoonCard 
                    id={item.id}
                    title={item.title}
                    coverUrl={item.coverUrl}
                    views={item.views}
                    rating={item.rating}
                    isNew={item.isNew}
                  />
                  {/* Additional info badge for type */}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 pointer-events-none uppercase">
                    {item.type}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm transition-colors text-center px-4">
              <div className="w-20 h-20 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <SearchIcon size={32} className="text-slate-400 dark:text-zinc-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('search.no_results')}</h3>
              <p className="text-slate-500 dark:text-zinc-400 max-w-sm">{t('search.no_results_desc')}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
