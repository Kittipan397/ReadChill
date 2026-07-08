"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShoppingBag, Plus, UploadCloud, Image as ImageIcon, Trash2, CheckCircle2, Loader2, X, Star } from "lucide-react";

interface ShopItem {
  id: string;
  partnerId: string;
  partnerName: string;
  type: "sticker" | "frame";
  name: string;
  price: number;
  coverUrl: string;
  imageUrls: string[]; // for sticker packs
  status: "active" | "inactive";
  createdAt: any;
}

export default function ShopManagement() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [type, setType] = useState<"sticker" | "frame">("sticker");
  const [name, setName] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState<number | "">(""); 
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [packFiles, setPackFiles] = useState<File[]>([]);
  const [packPreviews, setPackPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (user && (role === "admin" || role === "partner")) {
      fetchItems();
    }
  }, [user, role]);

  const fetchItems = async () => {
    try {
      let q;
      if (role === "admin") {
        q = query(collection(db, "shop_items"));
      } else {
        q = query(collection(db, "shop_items"), where("partnerId", "==", user?.uid));
      }
      const snap = await getDocs(q);
      const fetchedItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as ShopItem));
      // Sort by newest
      fetchedItems.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setItems(fetchedItems);
    } catch (error) {
      console.error("Error fetching items", error);
    }
  };

  const uploadImagesToProxy = async (files: File[]) => {
    let urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(Math.round(((i) / files.length) * 100));
      const formData = new FormData();
      formData.append("image", files[i]);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      urls.push(data.url);
    }
    setUploadProgress(100);
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverFile) return alert("Please upload a cover image");
    if (type === "sticker" && packFiles.length === 0) return alert("Please upload at least one sticker image for the pack");
    if (!isFree && (price === "" || Number(price) <= 0)) return alert("Please specify a valid price");

    const finalPrice = isFree ? 0 : Number(price);

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload Cover
      const coverUrls = await uploadImagesToProxy([coverFile]);
      const coverUrl = coverUrls[0];

      // 2. Upload Pack Files (if sticker)
      let imageUrls: string[] = [coverUrl]; // frame just uses coverUrl, but we'll store it as array too just in case
      if (type === "sticker" && packFiles.length > 0) {
        setUploadProgress(0); // reset progress for pack
        imageUrls = await uploadImagesToProxy(packFiles);
      }

      // 3. Save to Firestore
      await addDoc(collection(db, "shop_items"), {
        partnerId: user?.uid,
        partnerName: user?.displayName || "Unknown Partner",
        type,
        name,
        price: finalPrice,
        coverUrl,
        imageUrls: type === "sticker" ? imageUrls : [],
        status: "active",
        createdAt: serverTimestamp()
      });

      alert("Successfully created shop item!");
      setIsModalOpen(false);
      resetForm();
      fetchItems();
    } catch (error) {
      console.error(error);
      alert("Error uploading item");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setIsFree(false);
    setPrice("");
    setCoverFile(null);
    setCoverPreview("");
    setPackFiles([]);
    setPackPreviews([]);
    setType("sticker");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, "shop_items", id));
      fetchItems();
    } catch (error) {
      console.error(error);
      alert("Failed to delete item");
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ShoppingBag className="text-pink-500" />
            My Shop
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Manage your Stickers and Profile Frames for sale.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl transition-colors font-semibold"
        >
          <Plus size={20} />
          Create New Item
        </button>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Item</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Price (Coins)</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center italic text-slate-500">
                  No items found. Create your first sticker or frame!
                </td>
              </tr>
            ) : (
              items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                      <img src={item.coverUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-base">{item.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{role === 'admin' ? `By ${item.partnerName}` : item.type === 'sticker' ? item.imageUrls.length + ' items in pack' : 'Profile Frame'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.type === 'sticker' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                      {item.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 font-bold text-yellow-500">
                      <Star size={16} className="fill-yellow-500" />
                      {item.price}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Create Shop Item</h2>
              <button 
                onClick={() => !uploading && setIsModalOpen(false)} 
                disabled={uploading}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Item Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setType("sticker")}
                      className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-colors ${type === 'sticker' ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      Sticker Pack
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("frame")}
                      className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-colors ${type === 'frame' ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      Profile Frame
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Price (Coins)</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={() => setIsFree(true)}
                      className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${isFree ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}
                    >
                      Free (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFree(false)}
                      className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${!isFree ? 'bg-white dark:bg-slate-700 shadow-sm text-pink-600 dark:text-pink-400' : 'text-slate-500'}`}
                    >
                      Paid
                    </button>
                  </div>
                  {!isFree && (
                    <input 
                      type="number" 
                      required min="1" 
                      value={price === "" ? "" : price} 
                      onChange={e => setPrice(e.target.value === "" ? "" : Number(e.target.value))} 
                      className="w-full px-4 py-2 mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter price..."
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Item Name (e.g., Summer Vibes)</label>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter name..."
                />
              </div>

              {/* Cover Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cover Image (Thumbnail)</label>
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setCoverFile(e.target.files[0]);
                        setCoverPreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {coverPreview ? (
                    <div className="w-32 h-32 mx-auto relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="py-8 text-slate-500">
                      <ImageIcon size={48} className="mx-auto mb-3 text-slate-400" />
                      <p className="font-medium">Click to upload cover</p>
                      <p className="text-xs mt-1">Recommended: 400x400px (PNG/JPG)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pack Images Upload (Only for stickers) */}
              {type === "sticker" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Sticker Pack Images (Select multiple)</label>
                  <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          const filesArray = Array.from(e.target.files);
                          setPackFiles(filesArray);
                          const previews = filesArray.map(f => URL.createObjectURL(f));
                          setPackPreviews(previews);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    {packPreviews.length > 0 ? (
                      <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">{packPreviews.length} Stickers selected</div>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {packPreviews.map((preview, idx) => (
                            <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                              <img src={preview} alt={`Sticker ${idx}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-slate-500">
                        <UploadCloud size={48} className="mx-auto mb-3 text-slate-400" />
                        <p className="font-medium">Select multiple images</p>
                        <p className="text-xs mt-1">Select all stickers for this pack (PNG transparent recommended)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit / Progress */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={uploading}
                  className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="px-8 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Uploading {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Publish to Shop
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
