"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Send, Smile, Image as ImageIcon, X, Edit2, Trash2, Check } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

interface Comment {
  id: string;
  webtoonId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userFrame: string | null;
  text: string;
  stickerUrl: string | null;
  createdAt: any;
}

interface InventoryItem {
  itemId: string;
  type: "sticker" | "frame";
  name: string;
  coverUrl: string;
  imageUrls: string[];
}

export default function CommentSection({ webtoonId }: { webtoonId: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  
  // Sticker Picker State
  const [stickerPacks, setStickerPacks] = useState<InventoryItem[]>([]);
  const [activePackIdx, setActivePackIdx] = useState(0);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTextContent, setEditTextContent] = useState("");

  useEffect(() => {
    // 1. Fetch Comments
    const q = query(
      collection(db, "webtoon_comments"),
      where("webtoonId", "==", webtoonId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const rawComments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
      
      // เรียงลำดับฝั่ง Client เพื่อหลีกเลี่ยงการติด Error (ต้องการ Composite Index)
      rawComments.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setComments(rawComments);
    });

    return () => unsub();
  }, [webtoonId]);

  useEffect(() => {
    // 2. Fetch User's Sticker Packs
    if (user) {
      getDoc(doc(db, "user_inventory", user.uid)).then(snap => {
        if (snap.exists()) {
          const items: InventoryItem[] = snap.data().items || [];
          setStickerPacks(items.filter(i => i.type === "sticker"));
        }
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert(t('comments.err_login'));
    if (!text.trim() && !selectedSticker) return;

    try {
      // get user profile to check if they have a frame equipped
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const activeFrame = userDoc.exists() ? userDoc.data().activeFrame : null;

      await addDoc(collection(db, "webtoon_comments"), {
        webtoonId,
        userId: user.uid,
        userName: user.displayName || t('comments.default_user'),
        userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`,
        userFrame: activeFrame || null,
        text: text.trim(),
        stickerUrl: selectedSticker,
        createdAt: serverTimestamp()
      });

      setText("");
      setSelectedSticker(null);
      setShowStickerPicker(false);
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message || err}`);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบคอมเมนต์นี้?")) {
      try {
        await deleteDoc(doc(db, "webtoon_comments", commentId));
      } catch (err: any) {
        alert(`Error: ${err.message || err}`);
      }
    }
  };

  const handleEditSave = async (commentId: string) => {
    if (!editTextContent.trim()) return;
    try {
      await updateDoc(doc(db, "webtoon_comments", commentId), {
        text: editTextContent.trim()
      });
      setEditingId(null);
    } catch (err: any) {
      alert(`Error: ${err.message || err}`);
    }
  };

  const activePack = stickerPacks[activePackIdx];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 mt-8 shadow-sm transition-colors">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t('comments.title')} ({comments.length})</h3>

      {/* Input Section */}
      <div className="mb-8 relative">
        {selectedSticker && (
          <div className="relative inline-block mb-3 p-2 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 transition-colors">
            <button 
              onClick={() => setSelectedSticker(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:scale-110 transition-transform shadow-md"
            >
              <X size={14} />
            </button>
            <Image src={selectedSticker} alt="Selected Sticker" width={80} height={80} className="object-contain" unoptimized />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image 
              src={user?.photoURL || "https://ui-avatars.com/api/?name=Guest"} 
              alt="Avatar" 
              fill 
              className="rounded-full object-cover" 
              unoptimized
            />
          </div>
          
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={user ? t('comments.placeholder') : t('comments.placeholder_login')}
              disabled={!user}
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-xl py-3 pl-4 pr-12 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-60"
            />
            <button 
              type="button"
              onClick={() => setShowStickerPicker(!showStickerPicker)}
              disabled={!user}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${showStickerPicker ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-500' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'} disabled:opacity-50`}
              title={t('comments.sticker_tooltip')}
            >
              <Smile size={20} />
            </button>
          </div>

          <button 
            type="submit" 
            disabled={!user || (!text.trim() && !selectedSticker)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-500 text-white rounded-xl font-bold flex items-center justify-center transition-colors shadow-sm"
          >
            <Send size={18} />
          </button>
        </form>

        {/* Sticker Picker Dropdown */}
        {showStickerPicker && user && (
          <div className="absolute top-full mt-2 right-12 w-80 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden z-10 flex flex-col h-72 transition-colors">
            
            {/* Packs Header (Tabs) */}
            <div className="flex bg-slate-50 dark:bg-zinc-900 overflow-x-auto scrollbar-hide border-b border-slate-200 dark:border-zinc-800 transition-colors">
              {stickerPacks.length === 0 ? (
                <div className="p-3 text-sm text-slate-500 dark:text-zinc-400">{t('comments.no_stickers')}</div>
              ) : (
                stickerPacks.map((pack, idx) => (
                  <button 
                    key={pack.itemId}
                    onClick={() => setActivePackIdx(idx)}
                    className={`flex-shrink-0 p-2 border-b-2 transition-colors ${activePackIdx === idx ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-transparent hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                    title={pack.name}
                  >
                    <Image src={pack.coverUrl} alt="pack" width={32} height={32} className="object-contain" unoptimized />
                  </button>
                ))
              )}
            </div>

            {/* Sticker Grid */}
            <div className="flex-1 overflow-y-auto p-2">
              {stickerPacks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <ImageIcon size={32} className="text-slate-400 dark:text-zinc-600 mb-2" />
                  <p className="text-slate-500 dark:text-zinc-400 text-sm mb-3">{t('comments.sticker_empty_desc')}</p>
                  <a href="/shop" className="text-sm font-bold text-orange-600 dark:text-orange-500 hover:underline">{t('comments.go_shop')}</a>
                </div>
              ) : activePack ? (
                <div className="grid grid-cols-4 gap-2">
                  {activePack.imageUrls.map((url, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        setSelectedSticker(url);
                        setShowStickerPicker(false);
                      }}
                      className="aspect-square bg-slate-50 dark:bg-zinc-900 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-transparent hover:border-orange-500 transition-all flex items-center justify-center"
                    >
                      <Image src={url} alt={`sticker-${i}`} width={50} height={50} className="object-contain" unoptimized />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-zinc-500 py-8">{t('comments.empty')}</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="group flex gap-4">
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image 
                  src={comment.userAvatar} 
                  alt={comment.userName} 
                  fill 
                  className="rounded-full object-cover z-0" 
                  unoptimized
                />
                {/* Profile Frame logic */}
                {comment.userFrame && (
                  <div className="absolute -inset-1.5 z-10 pointer-events-none">
                    <Image 
                      src={comment.userFrame} 
                      alt="frame" 
                      fill 
                      className="object-contain scale-110" 
                      unoptimized 
                    />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-baseline justify-between mb-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{comment.userName}</span>
                    <span className="text-xs text-slate-500 dark:text-zinc-500">
                      {comment.createdAt?.toDate ? new Date(comment.createdAt.toDate()).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' }) : t('comments.just_now')}
                    </span>
                  </div>
                  
                  {user?.uid === comment.userId && (
                    <div className="flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditTextContent(comment.text);
                        }}
                        className="p-2 bg-slate-100 dark:bg-zinc-800 md:bg-transparent text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-all rounded-lg shadow-sm md:shadow-none active:scale-95"
                        title="แก้ไข"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(comment.id)}
                        className="p-2 bg-slate-100 dark:bg-zinc-800 md:bg-transparent text-slate-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-all rounded-lg shadow-sm md:shadow-none active:scale-95"
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                
                {editingId === comment.id ? (
                  <div className="flex items-center gap-2 mt-2 mb-3">
                    <input 
                      type="text" 
                      value={editTextContent}
                      onChange={(e) => setEditTextContent(e.target.value)}
                      className="flex-1 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-lg py-1.5 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                    <button onClick={() => handleEditSave(comment.id)} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    {comment.text && (
                      <p className="text-slate-700 dark:text-zinc-300 text-sm mb-2 whitespace-pre-wrap">{comment.text}</p>
                    )}
                    
                    {comment.stickerUrl && (
                      <div className="mt-2 bg-slate-50 dark:bg-transparent rounded-xl inline-block">
                        <Image src={comment.stickerUrl} alt="Sticker" width={100} height={100} className="object-contain" unoptimized />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
