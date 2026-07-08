"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy, updateDoc } from "firebase/firestore";
// TipTap Editor
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';

import { 
  ArrowLeft, UploadCloud, FileText, Image as ImageIcon, Plus, CheckCircle2, Loader2, Trash2, LayoutList,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight, Undo, Redo
} from "lucide-react";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function ChapterManager({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  
  const [manga, setManga] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chapterNum, setChapterNum] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState(0);
  
  // Manga/Art states (Image Array)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Translation state
  const [translatingChapters, setTranslatingChapters] = useState<string[]>([]);
  
  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Novel state (TipTap Editor)
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'พิมพ์เนื้อหานิยายที่นี่...',
      }),
      CharacterCount,
      TextStyle,
      FontFamily,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`draft_manga_${id}`, editor.getHTML());
        setLastSaved(new Date());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert text-slate-900 dark:text-white max-w-none focus:outline-none min-h-[300px] p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
      },
    },
  });

  useEffect(() => {
    fetchMangaAndChapters();
  }, [id]);

  useEffect(() => {
    if (editor && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`draft_manga_${id}`);
      if (saved && editor.isEmpty) {
        editor.commands.setContent(saved);
      }
    }
  }, [editor, id]);

  const fetchMangaAndChapters = async () => {
    setLoading(true);
    try {
      const mangaRef = doc(db, "mangas", id);
      const mangaSnap = await getDoc(mangaRef);
      if (mangaSnap.exists()) {
        const data = mangaSnap.data();
        setManga({ id: mangaSnap.id, ...data });
        // Set default chapter number based on existing chapters
        setPrice(data.defaultPrice || 5);
      } else {
        router.push("/dashboard/content");
        return;
      }

      // Fetch Chapters
      // We assume chapter is ordered by chapterNumber or createdAt
      const q = query(collection(db, "chapters")); 
      // Filter manually for now if no index
      const snap = await getDocs(q);
      const chaps = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((c: any) => c.mangaId === id);
      
      chaps.sort((a: any, b: any) => {
        const numA = parseFloat(a.chapterNumber) || 0;
        const numB = parseFloat(b.chapterNumber) || 0;
        return numB - numA;
      });

      setChapters(chaps);
      setChapterNum((chaps.length + 1).toString());

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      addFiles(files);
    }
  }, [selectedFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addFiles(files);
    }
  };

  const addFiles = (files: File[]) => {
    // Sort files by name naturally to keep pages in order
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    
    setSelectedFiles(prev => [...prev, ...files]);
    
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviewUrls(prev => [...prev, ...urls]);
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);

    const newUrls = [...previewUrls];
    newUrls.splice(index, 1);
    setPreviewUrls(newUrls);
  };

  const uploadImagesToProxy = async (files: File[]) => {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(Math.round(((i) / files.length) * 100));
      const formData = new FormData();
      formData.append("image", files[i]);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`อัปโหลดล้มเหลวที่ไฟล์ ${files[i].name}`);
      }
      
      const data = await res.json();
      urls.push(data.url);
    }
    setUploadProgress(100);
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!chapterNum) {
      setErrorMsg("กรุณาระบุตอนที่");
      return;
    }

    if (manga?.type !== "novel" && selectedFiles.length === 0) {
      setErrorMsg("กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป");
      return;
    }

    if (manga?.type === "novel" && (!editor || editor.isEmpty)) {
      setErrorMsg("กรุณาพิมพ์เนื้อหานิยาย");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      let imageUrls: string[] = [];
      let novelContent: string | null = null;

      if (manga?.type !== "novel") {
        imageUrls = await uploadImagesToProxy(selectedFiles);
      } else {
        novelContent = editor?.getHTML() || null;
      }

      // Save chapter to Firestore
      const newChapterRef = await addDoc(collection(db, "chapters"), {
        mangaId: id,
        chapterNumber: chapterNum,
        isFree: isFree,
        price: isFree ? 0 : Number(price),
        imageUrls: manga?.type !== "novel" ? imageUrls : null,
        content: manga?.type === "novel" ? novelContent : null,
        createdAt: serverTimestamp()
      });

      // Update Manga latestChapters
      const mangaRef = doc(db, "mangas", id);
      let latest = manga.latestChapters || [];
      latest.unshift({
        id: newChapterRef.id,
        chapterNumber: chapterNum,
        isFree,
        createdAt: new Date().toISOString()
      });
      if (latest.length > 2) latest = latest.slice(0, 2);

      await updateDoc(mangaRef, {
        updatedAt: serverTimestamp(),
        latestChapters: latest
      });

      setSuccessMsg("เพิ่มตอนใหม่สำเร็จ!");
      
      // Trigger background translation for novels
      if (manga?.type === "novel" && novelContent) {
        triggerTranslation(newChapterRef.id, novelContent);
      }
      
      // Clear auto-save draft
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`draft_manga_${id}`);
      }
      setLastSaved(null);
      
      // Reset
      setSelectedFiles([]);
      setPreviewUrls([]);
      setChapterNum((parseFloat(chapterNum) + 1).toString());
      if (editor) editor.commands.setContent('');
      
      fetchMangaAndChapters();
      
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg("");
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setUploading(false);
    }
  };

  const triggerTranslation = async (chapterId: string, content: string) => {
    setTranslatingChapters(prev => [...prev, chapterId]);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        const translations = await res.json();
        const chapterRef = doc(db, "chapters", chapterId);
        await updateDoc(chapterRef, {
          translations: translations
        });
        // Refresh chapter list to show new translation badges
        fetchMangaAndChapters();
      }
    } catch (err) {
      console.error("Translation trigger failed", err);
    } finally {
      setTranslatingChapters(prev => prev.filter(id => id !== chapterId));
    }
  };


  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 size={32} className="animate-spin text-blue-500" />
    </div>
  );

  if (!manga) return <div>ไม่พบข้อมูล</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/content" className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-4">
            <img src={manga.coverUrl} alt="Cover" className="w-16 h-16 object-cover rounded-lg shadow-sm" />
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white line-clamp-1">{manga.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium rounded-full uppercase tracking-wider">
                  {manga.type}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {chapters.length} ตอน
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus size={20} />
          เพิ่มตอนใหม่
        </button>
      </div>

      {/* Chapters List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <LayoutList size={18} className="text-slate-400" /> 
            รายชื่อตอนทั้งหมด
          </h3>
        </div>
        
        {chapters.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            ยังไม่มีตอนใดๆ กรุณากดปุ่ม <b>"เพิ่มตอนใหม่"</b>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400">
                    {chapter.chapterNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-white">ตอนที่ {chapter.chapterNumber}</h4>
                      {translatingChapters.includes(chapter.id) && (
                        <span className="flex items-center gap-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider animate-pulse">
                          <Loader2 size={10} className="animate-spin" /> Translating...
                        </span>
                      )}
                      {chapter.translations && Object.values(chapter.translations).some(t => typeof t === "string" && t.length > 0) && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                          🌐 EN, ZH, JA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(chapter.createdAt?.toDate?.() || Date.now()).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                </div>
                <div>
                  {chapter.isFree ? (
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium rounded-full text-xs">
                      อ่านฟรี
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium rounded-full text-xs">
                      🪙 {chapter.price} เหรียญ
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Chapter Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center pt-10 px-4 overflow-y-auto pb-10">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col h-fit">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="text-blue-500" />
                เพิ่มตอนใหม่
              </h3>
              <button 
                onClick={() => !uploading && setIsModalOpen(false)} 
                disabled={uploading}
                className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              >
                <Trash2 size={20} className="opacity-0" /> {/* dummy for spacing */}
                <span className="absolute right-6 top-5">❌</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-6">
              
              {errorMsg && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{errorMsg}</div>
              )}
              {successMsg && (
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium">{successMsg}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ตอนที่ (Number) <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={chapterNum}
                    onChange={(e) => setChapterNum(e.target.value)}
                    placeholder="เช่น 1, 1.5, 2" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none" 
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ราคาการอ่าน</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setIsFree(true)}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${isFree ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      อ่านฟรี
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFree(false)}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${!isFree ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      ติดเหรียญ
                    </button>
                  </div>
                </div>
              </div>

              {!isFree && (
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 p-4 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-orange-700 dark:text-orange-400">ราคาเหรียญ (Coins):</span>
                  <input 
                    type="number" 
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-32 px-4 py-2 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-white dark:bg-slate-900 outline-none text-right font-bold text-orange-600" 
                  />
                </div>
              )}

              <hr className="border-slate-200 dark:border-slate-700 my-2" />

              {/* Content Editor area based on Manga Type */}
              {manga.type === "novel" ? (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FileText size={18} className="text-emerald-500" />
                    เนื้อหานิยาย (Novel Content)
                  </label>
                  {/* TipTap Toolbar */}
                  <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-b-0 rounded-t-xl p-2 flex gap-1 flex-wrap text-slate-700 dark:text-slate-300 items-center">
                    <select
                      onChange={(e) => {
                        if (e.target.value === '') {
                          editor?.chain().focus().unsetFontFamily().run();
                        } else {
                          editor?.chain().focus().setFontFamily(e.target.value).run();
                        }
                      }}
                      value={editor?.getAttributes('textStyle').fontFamily || ''}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none w-36 focus:ring-2 focus:ring-blue-500 shadow-sm"
                    >
                      <option value="">ฟอนต์มาตรฐาน</option>
                      <option value="Sarabun">Sarabun (ทางการ)</option>
                      <option value="Prompt">Prompt (โมเดิร์น)</option>
                      <option value="Kanit">Kanit (อ่านง่าย)</option>
                      <option value="Mali">Mali (ลายมือ)</option>
                      <option value="Niramit">Niramit (เรียบหรู)</option>
                      <option value="Chakra Petch">Chakra (ไซไฟ)</option>
                    </select>

                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center hidden sm:block" />

                    <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-2 rounded ${editor?.isActive('bold') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="ตัวหนา"><Bold size={18} /></button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-2 rounded ${editor?.isActive('italic') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="ตัวเอียง"><Italic size={18} /></button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} className={`p-2 rounded ${editor?.isActive('underline') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="ขีดเส้นใต้"><UnderlineIcon size={18} /></button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} className={`p-2 rounded ${editor?.isActive('strike') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="ขีดฆ่า"><Strikethrough size={18} /></button>
                    
                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
                    
                    <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded ${editor?.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="หัวข้อ 1"><Heading1 size={18} /></button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded ${editor?.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="หัวข้อ 2"><Heading2 size={18} /></button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-2 rounded ${editor?.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="หัวข้อ 3"><Heading3 size={18} /></button>

                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
                    
                    <button type="button" onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={`p-2 rounded ${editor?.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="จัดชิดซ้าย"><AlignLeft size={18} /></button>
                    <button type="button" onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={`p-2 rounded ${editor?.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="จัดกึ่งกลาง"><AlignCenter size={18} /></button>
                    <button type="button" onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={`p-2 rounded ${editor?.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="จัดชิดขวา"><AlignRight size={18} /></button>

                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />

                    <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-2 rounded ${editor?.isActive('bulletList') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="รายการแบบจุด"><List size={18} /></button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`p-2 rounded ${editor?.isActive('orderedList') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="รายการแบบตัวเลข"><ListOrdered size={18} /></button>
                    <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={`p-2 rounded ${editor?.isActive('blockquote') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="กล่องข้อความอ้างอิง"><Quote size={18} /></button>

                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />

                    <button type="button" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent" title="ย้อนกลับ (Undo)"><Undo size={18} /></button>
                    <button type="button" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent" title="ทำซ้ำ (Redo)"><Redo size={18} /></button>
                  </div>
                  <EditorContent editor={editor} />
                  {/* Editor Footer / Auto-save / Word Count */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-xl p-3 px-4 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex gap-4">
                      <span>
                        <strong className="text-slate-700 dark:text-slate-300">{editor?.storage.characterCount.words() || 0}</strong> คำ (Words)
                      </span>
                      <span>
                        <strong className="text-slate-700 dark:text-slate-300">{editor?.storage.characterCount.characters() || 0}</strong> ตัวอักษร (Characters)
                      </span>
                    </div>
                    <div>
                      {lastSaved ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 font-medium">
                          <CheckCircle2 size={14} />
                          บันทึกอัตโนมัติเมื่อ {lastSaved.toLocaleTimeString('th-TH')}
                        </span>
                      ) : (
                        <span>พร้อมเขียน...</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <ImageIcon size={18} className="text-blue-500" />
                    อัปโหลดรูปภาพ ({previewUrls.length} รูป)
                  </label>

                  <div 
                    onDrop={handleFileDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-8 text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <UploadCloud size={48} className="mx-auto text-blue-500 mb-4" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">ลากรูปภาพมาวางที่นี่ หรือ</p>
                    <label className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition-colors shadow-sm">
                      เลือกไฟล์รูปภาพ
                      <input 
                        type="file" 
                        multiple 
                        accept="image/jpeg,image/png,image/webp" 
                        onChange={handleFileInput}
                        className="hidden" 
                      />
                    </label>
                    <p className="text-xs text-slate-500 mt-4">ไฟล์จะต้องถูกเรียงชื่อตามตัวอักษร เช่น 001.jpg, 002.jpg</p>
                  </div>

                  {previewUrls.length > 0 && (
                    <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                        {previewUrls.map((url, idx) => (
                          <div key={idx} className="relative group aspect-[2/3] bg-slate-200 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700">
                            <img src={url} alt={`Page ${idx}`} className="w-full h-full object-cover" />
                            <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded font-bold">
                              {idx + 1}
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={24} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Bar */}
              {uploading && (
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm font-bold text-blue-600">
                    <span>กำลังอัปโหลดและประมวลผล...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300 ease-out" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4 mt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={uploading}
                  className="px-6 py-3 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={uploading}
                  className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {uploading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                  เผยแพร่ตอนนี้เลย
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
