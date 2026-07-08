"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import { Package, CheckCircle, Image as ImageIcon } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

interface InventoryItem {
  itemId: string;
  type: "sticker" | "frame";
  name: string;
  coverUrl: string;
  imageUrls: string[];
}

export default function InventoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [activeFrame, setActiveFrame] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sticker" | "frame">("sticker");

  useEffect(() => {
    if (!authLoading && user) {
      fetchInventory();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchInventory = async () => {
    if (!user) return;
    try {
      // Get user data for active frame
      const uDoc = await getDoc(doc(db, "users", user.uid));
      if (uDoc.exists()) {
        setActiveFrame(uDoc.data().activeFrame || null);
      }

      // Get inventory items
      const invDoc = await getDoc(doc(db, "user_inventory", user.uid));
      if (invDoc.exists()) {
        setItems(invDoc.data().items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipFrame = async (coverUrl: string, itemId: string) => {
    if (!user) return;
    setEquippingId(itemId);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        activeFrame: coverUrl
      });
      setActiveFrame(coverUrl);
    } catch (err) {
      console.error(err);
      alert(t('inventory.error_equip'));
    } finally {
      setEquippingId(null);
    }
  };

  const handleUnequipFrame = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        activeFrame: null
      });
      setActiveFrame(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center transition-colors">
        <div className="w-12 h-12 border-4 border-slate-200 dark:border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 transition-colors">
        <Package size={64} className="text-slate-400 dark:text-zinc-700 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('inventory.login_required')}</h2>
        <p className="text-slate-500 dark:text-zinc-400">{t('inventory.login_desc')}</p>
      </div>
    );
  }

  const filteredItems = items.filter(item => item.type === activeTab);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-12 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-2xl">
              <Package size={32} className="text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('inventory.title')}</h1>
              <p className="text-slate-500 dark:text-zinc-400">{t('inventory.desc')}</p>
            </div>
          </div>
          
          <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 transition-colors">
            <button 
              onClick={() => setActiveTab("sticker")}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === "sticker" ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
            >
              {t('inventory.tab_sticker')} ({items.filter(i => i.type === "sticker").length})
            </button>
            <button 
              onClick={() => setActiveTab("frame")}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === "frame" ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
            >
              {t('inventory.tab_frame')} ({items.filter(i => i.type === "frame").length})
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center mt-12 transition-colors shadow-sm">
            <ImageIcon size={64} className="text-slate-300 dark:text-zinc-700 mb-6" />
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('inventory.empty_title')}</h3>
            <p className="text-slate-500 dark:text-zinc-400 mb-6">{t('inventory.empty_desc')}</p>
            <Link href="/shop" className="btn-primary">{t('inventory.go_shop')}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map(item => (
              <div key={item.itemId} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col shadow-sm">
                <div className="aspect-square relative bg-slate-50 dark:bg-zinc-950 p-6 flex items-center justify-center border-b border-slate-200 dark:border-zinc-800 group">
                  <Image 
                    src={item.coverUrl} 
                    alt={item.name} 
                    fill 
                    className={`object-contain p-4 transition-transform group-hover:scale-110 ${item.type === 'frame' ? 'scale-110' : ''}`}
                    unoptimized
                  />
                  
                  {/* Status Badges */}
                  {item.type === "frame" && activeFrame === item.coverUrl && (
                    <div className="absolute top-3 left-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-500/20 backdrop-blur-sm z-10 flex items-center gap-1">
                      <CheckCircle size={14} /> {t('inventory.in_use')}
                    </div>
                  )}
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-4">{item.name}</h3>
                  
                  <div className="mt-auto">
                    {item.type === "frame" ? (
                      activeFrame === item.coverUrl ? (
                        <button 
                          onClick={handleUnequipFrame}
                          className="w-full py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-white rounded-xl text-sm font-bold transition-colors"
                        >
                          {t('inventory.unequip')}
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleEquipFrame(item.coverUrl, item.itemId)}
                          disabled={equippingId === item.itemId}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:bg-blue-300 dark:disabled:bg-blue-900 disabled:text-blue-100 dark:disabled:text-blue-300"
                        >
                          {equippingId === item.itemId ? t('inventory.equipping') : t('inventory.equip')}
                        </button>
                      )
                    ) : (
                      <button className="w-full py-2.5 bg-emerald-50 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-bold cursor-default border border-emerald-200 dark:border-zinc-700">
                        {t('inventory.ready_to_use')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
