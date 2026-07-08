"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { Send, CheckCircle2, AlertCircle, PenTool, Image as ImageIcon, Link as LinkIcon, MessageCircle, Palette } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function RequestPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState({
    penName: "",
    contactInfo: "",
    portfolioUrl: "",
    description: "",
    workType: "novel" // novel or comic
  });
  
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setErrorMsg(t('request.err_login'));
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      // Check if user already submitted a pending request
      const q = query(
        collection(db, "partner_requests"), 
        where("uid", "==", user.uid),
        where("status", "==", "pending")
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setErrorMsg(t('request.err_pending'));
        setStatus("error");
        return;
      }

      await addDoc(collection(db, "partner_requests"), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
        ...formData,
        status: "pending",
        createdAt: serverTimestamp()
      });

      setStatus("success");
    } catch (err: any) {
      console.error("Submit error", err);
      setErrorMsg(err.message || t('request.err_general'));
      setStatus("error");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center text-slate-900 dark:text-white transition-colors">{t('request.loading')}</div>;

  return (
    <div className="bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white min-h-screen pb-20 transition-colors">
      
      <main className="max-w-6xl mx-auto px-4 pt-12">
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 mb-4 shadow-sm dark:shadow-lg dark:shadow-blue-500/10 transition-colors">
            <MessageCircle size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-3">{t('request.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            {t('request.desc')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          
          {/* Left Column: Facebook Page Embed */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-sm dark:shadow-xl flex flex-col items-center transition-colors">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-500 font-serif font-black text-2xl">f</span> {t('request.fb_title')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 text-center">
              {t('request.fb_desc')}
            </p>
            
            <div className="w-full bg-white rounded-xl overflow-hidden shadow-inner flex justify-center p-2" style={{ minHeight: '500px' }}>
              <iframe 
                src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fprofile.php%3Fid%3D61590779608149&tabs=timeline&width=400&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId" 
                width="400" 
                height="500" 
                style={{ border: 'none', overflow: 'hidden', maxWidth: '100%' }} 
                scrolling="no" 
                frameBorder="0" 
                allowFullScreen={true} 
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              ></iframe>
            </div>
          </div>

          {/* Right Column: Application Form */}
          <div>
            {status === "success" ? (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-8 text-center transition-colors">
            <CheckCircle2 size={48} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-2">{t('request.success_title')}</h2>
            <p className="text-emerald-600 dark:text-emerald-200/70 mb-6">
              {t('request.success_desc')}
            </p>
            <Link href="/" className="inline-block px-6 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium rounded-xl transition-colors">
              {t('request.back_home')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm dark:shadow-xl transition-colors">
            
            {!user && (
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 p-4 rounded-xl flex items-start gap-3 transition-colors">
                <AlertCircle className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{t('request.not_logged_in')}</p>
                  <p className="text-sm opacity-80 mt-1">
                    {t('request.please_login')} <Link href="/login" className="underline font-bold">{t('request.login_link')}</Link> {t('request.or_register')}
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 transition-colors">
                <AlertCircle className="shrink-0 mt-0.5" />
                <p className="font-medium">{errorMsg}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('request.email_label')}</label>
                <input 
                  type="email" 
                  value={user?.email || ""} 
                  disabled 
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-500 cursor-not-allowed outline-none transition-colors"
                  placeholder={t('request.email_placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('request.penname_label')} <span className="text-red-500 dark:text-red-400">*</span></label>
                <input 
                  type="text" 
                  name="penName"
                  required
                  value={formData.penName}
                  onChange={handleChange}
                  disabled={!user || status === "loading"}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                  placeholder={t('request.penname_placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('request.type_label')} <span className="text-red-500 dark:text-red-400">*</span></label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${formData.workType === 'novel' ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'}`}>
                    <input type="radio" name="workType" value="novel" checked={formData.workType === 'novel'} onChange={handleChange} className="hidden" />
                    <PenTool size={18} /> {t('request.type_novel')}
                  </label>
                  <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${formData.workType === 'comic' ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'}`}>
                    <input type="radio" name="workType" value="comic" checked={formData.workType === 'comic'} onChange={handleChange} className="hidden" />
                    <ImageIcon size={18} /> {t('request.type_comic')}
                  </label>
                  <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${formData.workType === 'art' ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'}`}>
                    <input type="radio" name="workType" value="art" checked={formData.workType === 'art'} onChange={handleChange} className="hidden" />
                    <Palette size={18} /> {t('request.type_art')}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('request.contact_label')} <span className="text-red-500 dark:text-red-400">*</span></label>
                <input 
                  type="text" 
                  name="contactInfo"
                  required
                  value={formData.contactInfo}
                  onChange={handleChange}
                  disabled={!user || status === "loading"}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                  placeholder={t('request.contact_placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                  <LinkIcon size={16} className="text-slate-400 dark:text-slate-500" />
                  {t('request.portfolio_label')}
                </label>
                <input 
                  type="url" 
                  name="portfolioUrl"
                  value={formData.portfolioUrl}
                  onChange={handleChange}
                  disabled={!user || status === "loading"}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                  placeholder="https://"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('request.desc_label')} <span className="text-red-500 dark:text-red-400">*</span></label>
                <textarea 
                  name="description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  disabled={!user || status === "loading"}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 resize-none"
                  placeholder={t('request.desc_placeholder')}
                ></textarea>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={!user || status === "loading"}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 text-white font-bold rounded-xl transition-colors shadow-sm dark:shadow-lg dark:shadow-blue-500/20 flex items-center justify-center gap-2 disabled:cursor-not-allowed mt-8"
            >
              {status === "loading" ? (
                <span className="flex items-center gap-2">{t('request.sending')}</span>
              ) : (
                <>
                  <Send size={20} />
                  {t('request.submit_btn')}
                </>
              )}
            </button>

          </form>
        )}
          </div>
        </div>
      </main>
    </div>
  );
}
