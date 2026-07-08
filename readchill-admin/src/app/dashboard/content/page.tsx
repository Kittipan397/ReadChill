"use client";

import { useState, useRef, useEffect } from "react";
import { BookOpen, Image as ImageIcon, FileText, Plus, UploadCloud, X, CheckCircle2, Loader2, Edit3, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, doc, deleteDoc } from "firebase/firestore";
import Link from "next/link";

export default function ContentManager() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<"manga" | "novel" | "art">("manga");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mangas, setMangas] = useState<any[]>([]);
  const [loadingMangas, setLoadingMangas] = useState(true);

  // Form States
  const [formType, setFormType] = useState<"manga" | "novel" | "art">("manga");
  const [formTitle, setFormTitle] = useState("");
  const [formSynopsis, setFormSynopsis] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formFreeCount, setFormFreeCount] = useState(0);
  const [formPrice, setFormPrice] = useState(0);
  const [formOwnerType, setFormOwnerType] = useState("partner");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFormAuthor(user.displayName || user.email?.split('@')[0] || "");
      fetchMangas();
    }
  }, [user]);

  const fetchMangas = async () => {
    setLoadingMangas(true);
    try {
      // For Admin, show all. For partner, show only their own.
      let q = collection(db, "mangas");
      if (role === "partner") {
        q = query(q, where("authorId", "==", user?.uid)) as any;
      }
      // Note: we might need a composite index if we combine where and orderBy in Firestore
      // For simplicity in this demo without creating indexes manually, we just fetch and sort locally
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by createdAt descending locally
      data.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (new Date(a.createdAt || 0).getTime());
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (new Date(b.createdAt || 0).getTime());
        return timeB - timeA;
      });
      
      setMangas(data);
    } catch (err) {
      console.error("Error fetching content:", err);
    } finally {
      setLoadingMangas(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบผลงานนี้?")) {
      try {
        await deleteDoc(doc(db, "mangas", id));
        fetchMangas();
      } catch (err) {
        console.error("Error deleting", err);
        alert("ไม่สามารถลบผลงานได้");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeFile = () => {
    setFormFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    if (!formTitle || !formFile) {
      setErrorMsg("กรุณากรอกชื่อเรื่องและอัปโหลดรูปหน้าปก");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload Cover via Proxy API
      const formData = new FormData();
      formData.append("image", formFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed: " + await uploadRes.text());
      }

      const uploadData = await uploadRes.json();
      const coverUrl = uploadData.url;

      // 2. Prepare Tags array
      const tagsArray = formTags.split(",").map(t => t.trim()).filter(t => t);

      // 3. Save to Firestore
      await addDoc(collection(db, "mangas"), {
        type: formType,
        title: formTitle,
        synopsis: formSynopsis,
        author: formAuthor,
        tags: tagsArray,
        coverUrl: coverUrl,
        freeChapterCount: Number(formFreeCount),
        defaultPrice: Number(formPrice),
        ownerType: formOwnerType,
        revenueShare: 73, // Default 73%
        authorId: user?.uid,
        views: 0,
        rating: 5.0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setSuccessMsg("สร้างเรื่องใหม่สำเร็จ!");
      
      // Reset form
      setFormTitle("");
      setFormSynopsis("");
      setFormTags("");
      removeFile();
      
      fetchMangas();
      
      // Auto close modal after 1.5s
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg("");
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setUploading(false);
    }
  };

  const filteredContent = mangas.filter(m => m.type === activeTab);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Content Manager</h2>
          <p className="text-slate-500 dark:text-slate-400">อัปโหลดและจัดการผลงาน มังงะ นิยาย และ งานวาด</p>
        </div>
        <button 
          onClick={() => {
            setFormType(activeTab);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus size={20} />
          สร้างเรื่องใหม่
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("manga")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "manga" 
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <BookOpen size={16} /> มังงะ / คอมมิค
        </button>
        <button
          onClick={() => setActiveTab("novel")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "novel" 
              ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" 
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FileText size={16} /> นิยายออนไลน์
        </button>
        <button
          onClick={() => setActiveTab("art")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "art" 
              ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm" 
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ImageIcon size={16} /> อาร์ตแกลเลอรี
        </button>
      </div>

      {/* Content Grid */}
      {loadingMangas ? (
        <div className="flex justify-center p-12">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : filteredContent.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-400">
            {activeTab === "manga" && <BookOpen size={36} />}
            {activeTab === "novel" && <FileText size={36} />}
            {activeTab === "art" && <ImageIcon size={36} />}
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
            ไม่พบผลงานในหมวดหมู่นี้
          </h3>
          <p className="text-slate-500 max-w-md">
            คุณยังไม่มีผลงานในหมวด {activeTab === "manga" ? "มังงะ" : activeTab === "novel" ? "นิยาย" : "ภาพวาด"} กดปุ่ม "สร้างเรื่องใหม่" ด้านบนเพื่อเริ่มต้น
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredContent.map(content => (
            <div key={content.id} className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all">
              <div className="aspect-[2/3] relative overflow-hidden bg-slate-100 dark:bg-slate-700">
                <img 
                  src={content.coverUrl} 
                  alt={content.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  {content.type === 'art' ? (
                    <button 
                      onClick={() => handleDelete(content.id)}
                      className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-center font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} /> ลบผลงาน
                    </button>
                  ) : (
                    <Link 
                      href={`/dashboard/content/${content.id}`} 
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-center font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> จัดการตอนย่อย
                    </Link>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1" title={content.title}>{content.title}</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">โดย {content.author}</p>
                
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-medium">
                    {content.defaultPrice > 0 ? `🪙 ${content.defaultPrice}/ตอน` : 'อ่านฟรี'}
                  </span>
                  <span className="text-slate-400">{content.views || 0} views</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-Page Modal for Creating Content */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl min-h-screen sm:min-h-0 sm:my-8 sm:rounded-3xl shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sm:rounded-t-3xl">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="text-blue-500" />
                เพิ่มเรื่องใหม่ (New Series)
              </h3>
              <button 
                onClick={() => !uploading && setIsModalOpen(false)} 
                disabled={uploading}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 md:p-8 flex-1 overflow-y-auto space-y-8">
              
              {errorMsg && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/30 flex items-start gap-3">
                  <X className="shrink-0 mt-0.5" size={18} />
                  <p>{errorMsg}</p>
                </div>
              )}
              
              {successMsg && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-900/30 flex items-start gap-3">
                  <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
                  <p>{successMsg}</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Cover Image */}
                <div className="lg:col-span-1 space-y-4">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    {formType === 'art' ? 'รูปภาพผลงาน (Artwork)' : 'หน้าปก (Cover Image)'} <span className="text-red-500">*</span>
                  </label>
                  
                  <div className={`relative group w-full ${formType === 'art' ? 'aspect-auto min-h-[300px]' : 'aspect-[2/3]'} bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-center overflow-hidden hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors`}>
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            type="button"
                            onClick={removeFile}
                            className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-transform hover:scale-110"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <UploadCloud size={48} className="text-blue-500 mb-4" />
                        <p className="font-medium text-slate-700 dark:text-slate-300">คลิกเพื่ออัปโหลด{formType === 'art' ? 'ผลงาน' : 'หน้าปก'}</p>
                        {formType !== 'art' && <p className="text-xs text-slate-500 mt-2">สัดส่วน 2:3 (JPG, PNG, WEBP)</p>}
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/jpeg,image/png,image/webp" 
                      className="hidden" 
                    />
                  </div>
                </div>

                {/* Right Column: Details */}
                <div className="lg:col-span-2 space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ประเภท (Type)</label>
                      <select 
                        value={formType}
                        onChange={(e: any) => setFormType(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="manga">มังงะ / คอมมิค (Manga/Comic)</option>
                        <option value="novel">นิยาย (Novel)</option>
                        <option value="art">ภาพวาด (Art Gallery)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        ชื่อเรื่อง (Title) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="เช่น วันพีซ (One Piece)" 
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      {formType === 'art' ? 'คำอธิบาย (Description)' : 'เรื่องย่อ (Synopsis)'}
                    </label>
                    <textarea 
                      rows={4}
                      value={formSynopsis}
                      onChange={(e) => setFormSynopsis(e.target.value)}
                      placeholder={formType === 'art' ? "อธิบายเกี่ยวกับผลงานชิ้นนี้..." : "เล่าเรื่องย่อคร่าวๆ..."}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ผู้แต่ง / สตูดิโอ</label>
                      <input 
                        type="text" 
                        value={formAuthor}
                        onChange={(e) => setFormAuthor(e.target.value)}
                        placeholder="เช่น เออิจิโระ โอดะ" 
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">แท็ก / หมวดหมู่ (คั่นด้วยลูกน้ำ)</label>
                      <input 
                        type="text" 
                        value={formTags}
                        onChange={(e) => setFormTags(e.target.value)}
                        placeholder="เช่น Action, Fantasy, Shounen" 
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                    </div>
                  </div>



                  <div className={`grid grid-cols-1 md:grid-cols-2 ${formType !== 'art' ? 'lg:grid-cols-3' : ''} gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800`}>
                    {formType !== 'art' && (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">จำนวนตอนที่ให้อ่านฟรี</label>
                        <input 
                          type="number" 
                          min="0"
                          value={formFreeCount}
                          onChange={(e) => setFormFreeCount(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        {formType === 'art' ? 'ราคาผลงาน (เหรียญ)' : 'ราคาต่อตอน (เหรียญ)'}
                      </label>
                      <input 
                        type="number" 
                        min="0"
                        value={formPrice}
                        onChange={(e) => setFormPrice(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ประเภทเจ้าของลิขสิทธิ์</label>
                      <select 
                        value={formOwnerType}
                        onChange={(e) => setFormOwnerType(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="partner">แพลตฟอร์ม (ลิขสิทธิ์แท้)</option>
                        <option value="user_generated">นักเขียนอิสระ</option>
                      </select>
                    </div>
                  </div>

                </div>
              </div>
              
              {/* Footer Buttons */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={uploading}
                  className="px-8 py-3 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={uploading}
                  className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> กำลังอัปโหลด...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} /> สร้างเรื่องใหม่
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
