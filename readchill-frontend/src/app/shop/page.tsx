"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, getDocs, doc, getDoc, updateDoc, setDoc, addDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sparkles, Star, CheckCircle, Search, ImageIcon, Image as LucideImage } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { useLanguage } from "@/context/LanguageContext";

interface ShopItem {
  id: string;
  partnerId: string;
  partnerName: string;
  type: "sticker" | "frame";
  name: string;
  price: number;
  coverUrl: string;
  imageUrls: string[];
}

export default function ShopPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "sticker" | "frame">("all");
  const [userCoins, setUserCoins] = useState(0);
  const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());
  const [activeFrame, setActiveFrame] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [equippingId, setEquippingId] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchItems = async () => {
    try {
      const snap = await getDocs(query(collection(db, "shop_items")));
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as ShopItem));
      setItems(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    if (!user) return;
    try {
      // Get coins & active frame
      const uDoc = await getDoc(doc(db, "users", user.uid));
      if (uDoc.exists()) {
        setUserCoins(uDoc.data().coins || 0);
        setActiveFrame(uDoc.data().activeFrame || null);
      }

      // Get inventory
      const invDoc = await getDoc(doc(db, "user_inventory", user.uid));
      if (invDoc.exists()) {
        const itemsArr = invDoc.data().items || [];
        setOwnedItems(new Set(itemsArr.map((i: any) => i.itemId)));
      }
    } catch (err) {
      console.error(err);
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
      alert(t('shop.equip_success'));
    } catch (err) {
      console.error(err);
      alert(t('shop.equip_error'));
    } finally {
      setEquippingId(null);
    }
  };

  const handleBuy = async (item: ShopItem) => {
    if (!user) return alert(t('shop.buy_login_required'));
    if (userCoins < item.price) return alert(t('shop.buy_not_enough_coins'));
    if (!confirm(t('shop.buy_confirm').replace('{name}', item.name).replace('{price}', item.price.toString()))) return;

    setBuyingId(item.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment/purchase-shop-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: item.id,
          type: item.type,
          name: item.name,
          coverUrl: item.coverUrl,
          imageUrls: item.imageUrls || [],
          partnerId: item.partnerId,
          price: item.price
        })
      });

      const data = await res.json();
      
      if (!data.success) {
        alert(data.message || t('shop.buy_error'));
        return;
      }

      alert(t('shop.buy_success'));
      fetchUserData(); // Refresh coins and inventory
    } catch (err) {
      console.error(err);
      alert(t('shop.buy_error'));
    } finally {
      setBuyingId(null);
    }
  };

  const filteredItems = activeTab === "all" ? items : items.filter(i => i.type === activeTab);

  return (
    <div className="bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white min-h-screen pb-20 transition-colors">
      
      <div className="max-w-6xl mx-auto px-4 pt-8">
        
        {/* Header & Wallet */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Sparkles className="text-pink-500" />
              {t('shop.title')}
            </h1>
            <p className="text-slate-500 dark:text-zinc-400">{t('shop.desc')}</p>
          </div>
          
          {user && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-colors">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">{t('shop.your_coins')}</p>
                <div className="flex items-center gap-2 font-bold text-yellow-500 text-xl">
                  <Star size={20} className="fill-yellow-500" /> {userCoins.toLocaleString()}
                </div>
              </div>
              <Link href="/topup" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
                {t('shop.topup')}
              </Link>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setActiveTab("all")}
            className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-colors border ${activeTab === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white' : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
          >
            {t('shop.tab_all')}
          </button>
          <button 
            onClick={() => setActiveTab("sticker")}
            className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-colors flex items-center gap-2 border ${activeTab === 'sticker' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
          >
            <ImageIcon size={18} /> {t('shop.tab_sticker')}
          </button>
          <button 
            onClick={() => setActiveTab("frame")}
            className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-colors flex items-center gap-2 border ${activeTab === 'frame' ? 'bg-purple-600 dark:bg-purple-500 text-white border-purple-600 dark:border-purple-500' : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
          >
            <LucideImage size={18} /> {t('shop.tab_frame')}
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">{t('shop.loading')}</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm transition-colors">
            {t('shop.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {filteredItems.map(item => {
              const isOwned = ownedItems.has(item.id);
              return (
                <div key={item.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group flex flex-col h-full cursor-pointer relative overflow-hidden shadow-sm">
                  
                  {isOwned && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 z-10">
                      <CheckCircle size={12} /> {t('shop.owned_badge')}
                    </div>
                  )}

                  <div className="aspect-square bg-slate-50 dark:bg-zinc-950 rounded-xl mb-3 overflow-hidden border border-slate-100 dark:border-zinc-800/50 relative flex items-center justify-center p-2">
                    <img src={item.coverUrl} alt={item.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  
                  <div className="flex-1 mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${item.type === 'sticker' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}>
                        {item.type === 'sticker' ? t('shop.tab_sticker') : t('shop.tab_frame')}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{item.partnerName}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
                    {isOwned ? (
                      item.type === "frame" ? (
                        activeFrame === item.coverUrl ? (
                          <button disabled className="w-full py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-xl text-sm font-bold cursor-not-allowed">
                            <CheckCircle size={16} className="inline mr-1" /> {t('shop.in_use')}
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleEquipFrame(item.coverUrl, item.id)}
                            disabled={equippingId === item.id}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-colors disabled:bg-purple-300 dark:disabled:bg-purple-900"
                          >
                            {equippingId === item.id ? t('shop.equipping') : t('shop.equip_btn')}
                          </button>
                        )
                      ) : (
                        <button disabled className="w-full py-2 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-xl text-sm font-bold cursor-not-allowed">
                          {t('shop.owned_btn')}
                        </button>
                      )
                    ) : (
                      <button 
                        onClick={() => handleBuy(item)}
                        disabled={buyingId === item.id}
                        className="w-full py-2 bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {buyingId === item.id ? t('shop.buying') : item.price === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">ฟรี (Free)</span>
                        ) : (
                          <>
                            <Star size={16} className="fill-yellow-500 text-yellow-500" /> {item.price.toLocaleString()}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  );
}
