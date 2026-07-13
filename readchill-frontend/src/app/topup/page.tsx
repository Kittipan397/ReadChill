'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot, collection, query, where, orderBy, getDocs, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { CreditCard, Sparkles, CheckCircle, AlertTriangle, ChevronRight, Upload, History, Loader2, Download, Clock, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function TopupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [coins, setCoins] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'topup' | 'history'>('topup');
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  
  // Real workflow states
  const [step, setStep] = useState<'select' | 'qr' | 'upload' | 'success'>('select');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Predefined packages
  const packages = [
    { baht: 20, coins: 20, bonus: 0 },
    { baht: 50, coins: 50, bonus: 0 },
    { baht: 50, coins: 50, bonus: 0 },
    { baht: 100, coins: 100, bonus: 4 },
    { baht: 300, coins: 300, bonus: 18 },
    { baht: 500, coins: 500, bonus: 40 },
    { baht: 1000, coins: 1000, bonus: 100 },
  ];

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    
    if (user) {
      const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setCoins(docSnap.data().coins || 0);
        }
      });
      return () => unsub();
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (activeTab === 'history' && user) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const q = query(
            collection(db, "payments"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
          );
          const snap = await getDocs(q);
          const histData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setHistoryList(histData);
        } catch (error) {
          console.error("Error fetching history:", error);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [activeTab, user]);

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomAmount(val);
    setSelectedPkg(null);
  };

  const getActivePackage = () => {
    if (selectedPkg) {
      return {
        ...selectedPkg,
        totalCoins: selectedPkg.coins + (selectedPkg.bonus || 0)
      };
    }
    
    const amt = parseInt(customAmount);
    if (isNaN(amt) || amt < 3) return null;

    let bonusPercent = 0;
    if (amt >= 1000) bonusPercent = 10;
    else if (amt >= 500) bonusPercent = 8;
    else if (amt >= 200) bonusPercent = 6;
    else if (amt >= 100) bonusPercent = 4;

    const bonusCoins = Math.floor(amt * (bonusPercent / 100));
    return {
      baht: amt,
      coins: amt,
      bonus: bonusCoins,
      totalCoins: amt + bonusCoins
    };
  };

  const activePkgData = getActivePackage();

  const startTimer = () => {
    setTimeLeft(15 * 60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleNext = () => {
    if (activePkgData) {
      setStep('qr');
      setSlipFile(null);
      setSlipPreview(null);
      setErrorMessage(null);
      startTimer();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipFile(file);
      const url = URL.createObjectURL(file);
      setSlipPreview(url);
    }
  };

  const generateBillPaymentPayload = (amount: number) => {
    const billerId = "010753700088205";
    const ref1 = "WJ122990AV0965996GG";
    const ref2 = "READCHILL";
    const ref3 = "0000";
    
    let payload = "000201010212"; // 12 for dynamic
    
    let billerInfo = "0016A000000677010112";
    billerInfo += "01" + billerId.length.toString().padStart(2, '0') + billerId;
    billerInfo += "02" + ref1.length.toString().padStart(2, '0') + ref1;
    if (ref2) {
        billerInfo += "03" + ref2.length.toString().padStart(2, '0') + ref2;
    }
    
    let tag30 = "30" + billerInfo.length.toString().padStart(2, '0') + billerInfo;
    payload += tag30;
    
    payload += "5303764"; // Currency THB
    
    if (amount > 0) {
        let amountStr = amount.toFixed(2);
        payload += "54" + amountStr.length.toString().padStart(2, '0') + amountStr;
    }
    
    payload += "5802TH"; // Country Code
    
    let additionalData = "";
    if (ref3) {
        additionalData += "07" + ref3.length.toString().padStart(2, '0') + ref3;
    }
    if (additionalData.length > 0) {
        payload += "62" + additionalData.length.toString().padStart(2, '0') + additionalData;
    }
    
    payload += "6304"; // Checksum tag
    
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) > 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    let checksumStr = crc.toString(16).toUpperCase().padStart(4, '0');
    return payload + checksumStr;
  };

  const handleDownloadQr = async () => {
    if (!activePkgData) return;
    try {
      setIsDownloading(true);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const frameImg = new window.Image();
      frameImg.src = "/images/qr_topup.png"; 
      
      try {
        await new Promise((resolve, reject) => {
          frameImg.onload = resolve;
          frameImg.onerror = reject;
        });

        canvas.width = frameImg.width;
        canvas.height = frameImg.height;
        ctx.drawImage(frameImg, 0, 0);

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(generateBillPaymentPayload(activePkgData.baht))}`;
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        const qrImg = new window.Image();
        qrImg.src = URL.createObjectURL(blob);
        
        await new Promise((resolve, reject) => {
          qrImg.onload = resolve;
          qrImg.onerror = reject;
        });

        const qrWidth = canvas.width * 0.636;
        const qrHeight = canvas.height * 0.636;
        const qrX = canvas.width * 0.182;
        const qrY = canvas.height * 0.182;

        ctx.drawImage(qrImg, qrX, qrY, qrWidth, qrHeight);
        
        const link = document.createElement("a");
        link.download = `ReadChill_Topup_${activePkgData.baht}THB.png`;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(qrImg.src);
      } catch (e) {
        // Fallback to downloading raw QR without frame
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(generateBillPaymentPayload(activePkgData.baht))}`;
        const link = document.createElement("a");
        const response = await fetch(qrUrl);
        const blob = await response.blob();
        link.href = URL.createObjectURL(blob);
        link.download = `ReadChill_Topup_${activePkgData.baht}THB_QR.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการดาวน์โหลด กรุณาแคปหน้าจอแทนครับ");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmitSlip = async () => {
    if (!slipFile || !activePkgData || !user) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. อัปโหลดรูปลง Cloudinary เพื่อให้ได้ URL ไปให้ Go Backend ตรวจสอบ
      const formData = new FormData();
      formData.append("file", slipFile);
      formData.append("upload_preset", "readchill_unsigned");

      const cloudinaryRes = await fetch("https://api.cloudinary.com/v1_1/t5bapifi/auto/upload", {
        method: "POST",
        body: formData,
      });

      if (!cloudinaryRes.ok) {
        throw new Error("อัปโหลดรูปลงระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }
      
      const cloudinaryData = await cloudinaryRes.json();
      const downloadURL = cloudinaryData.secure_url;

      if (!downloadURL) {
        throw new Error("ระบบไม่สามารถอัปโหลดสลิปได้ (ไม่พบ URL)");
      }

      // 2. เรียกใช้ Go Backend API สำหรับการตรวจสอบและทำ Transaction
      const token = await user.getIdToken();
      const payload = {
        slipUrl: downloadURL,
        packageBaht: activePkgData.baht,
        packageCoins: activePkgData.coins,
        bonusCoins: activePkgData.bonus || 0,
        userId: user.uid
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment/submit-slip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.message || 'การตรวจสอบสลิปไม่สำเร็จ');
      }

      // ถ้าสำเร็จ Go Backend จะอัปเดต Coins และสร้าง Payment History ใน Firestore ให้เรียบร้อยแล้ว
      setStep('success');

    } catch (err: any) {
      console.error('Submit slip error:', err);
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white transition-colors pb-12">
      <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 pt-8 pb-4 transition-colors">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">{t('topup.title')}</h1>
          
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-xl relative overflow-hidden mb-6">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <p className="text-blue-100 mb-1 font-medium">{t('topup.balance')}</p>
            <div className="flex items-center gap-2">
              <Sparkles className="text-yellow-400" size={32} />
              <span className="text-4xl font-black text-white">{coins.toLocaleString()}</span>
              <span className="text-xl font-medium text-blue-100 mt-2">{t('topup.coins')}</span>
            </div>
          </div>

          <div className="flex gap-4 border-b border-slate-200 dark:border-zinc-800">
            <button 
              className={`pb-3 px-2 font-medium text-lg transition-colors border-b-2 ${activeTab === 'topup' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300'}`}
              onClick={() => { setActiveTab('topup'); setStep('select'); }}
            >
              {t('topup.tab_topup')}
            </button>
            <button 
              className={`pb-3 px-2 font-medium text-lg transition-colors border-b-2 ${activeTab === 'history' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300'}`}
              onClick={() => setActiveTab('history')}
            >
              {t('topup.tab_history')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        
        {activeTab === 'topup' && (
          <div className="space-y-6">
            {/* STEP 1: SELECT */}
            {step === 'select' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CreditCard className="text-blue-500" /> {t('topup.select_package')}
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {packages.map((pkg, idx) => {
                    const total = pkg.coins + pkg.bonus;
                    const isActive = selectedPkg?.baht === pkg.baht;
                    return (
                      <div 
                        key={idx}
                        onClick={() => { setSelectedPkg(pkg); setCustomAmount(''); }}
                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700'}`}
                      >
                        {pkg.bonus > 0 && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                            {t('topup.bonus').replace('{percent}', Math.round((pkg.bonus/pkg.coins)*100).toString())}
                          </div>
                        )}
                        <div className="text-center mt-2">
                          <div className="flex items-center justify-center gap-1 text-xl font-bold text-yellow-500 mb-1">
                            <Sparkles size={18} /> {total.toLocaleString()}
                          </div>
                          <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                            {t('topup.price').replace('{amount}', pkg.baht.toString())}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 transition-colors">
                  <label className="block text-sm font-medium text-slate-500 dark:text-zinc-400 mb-2">{t('topup.custom_amount')}</label>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 font-medium">฿</span>
                      <input 
                        type="number"
                        min="3"
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-lg transition-all"
                        placeholder={t('topup.placeholder')}
                      />
                    </div>
                  </div>

                  <div className="mt-4 min-h-[24px]">
                    {customAmount && parseInt(customAmount) < 3 ? (
                      <p className="text-red-500 dark:text-red-400 flex items-center gap-2 text-sm font-medium"><AlertTriangle size={16} /> {t('topup.min_amount')}</p>
                    ) : activePkgData ? (
                      <p className="text-green-600 dark:text-green-400 flex items-center gap-2 text-sm font-medium">
                        <CheckCircle size={16} /> {t('topup.will_receive').replace('{amount}', activePkgData.totalCoins.toLocaleString())} {activePkgData.bonus > 0 && t('topup.bonus_plus').replace('{amount}', activePkgData.bonus.toString())}
                      </p>
                    ) : null}
                  </div>
                </div>

                <button 
                  onClick={handleNext}
                  disabled={!activePkgData}
                  className="w-full mt-8 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  {t('topup.pay_btn').replace('{amount}', activePkgData?.baht?.toString() || '0')} <ChevronRight size={20} />
                </button>
              </div>
            )}

            {/* STEP 2: QR CODE */}
            {step === 'qr' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 md:p-10 text-center transition-colors shadow-sm">
                <h2 className="text-2xl font-bold mb-2">{t('topup.qr_title')}</h2>
                <p className="text-slate-500 dark:text-zinc-400 mb-6">{t('topup.qr_desc').replace('{baht}', activePkgData?.baht?.toString() || '0').replace('{coins}', activePkgData?.totalCoins?.toString() || '0')}</p>
                
                <div className="bg-slate-50 dark:bg-zinc-950 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 inline-block mb-6 relative">
                  <div className="w-64 h-64 bg-white rounded-xl flex items-center justify-center shadow-inner overflow-hidden relative mx-auto">
                    {activePkgData && (
                      <Image 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(generateBillPaymentPayload(activePkgData.baht))}`}
                        alt="PromptPay QR Code"
                        fill
                        className="object-contain p-2"
                        unoptimized
                      />
                    )}
                  </div>
                  
                  <div className={`mt-4 flex items-center justify-center gap-2 font-medium ${timeLeft <= 0 ? 'text-red-500' : 'text-slate-600 dark:text-zinc-400'}`}>
                     <Clock size={18} /> {timeLeft > 0 ? `เวลาที่เหลือ ${formatTime(timeLeft)}` : "หมดเวลา"}
                  </div>
                </div>

                <div className="max-w-xs mx-auto space-y-3">
                  <button 
                    onClick={handleDownloadQr} 
                    disabled={isDownloading}
                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    {isDownloading ? <><Loader2 className="animate-spin" size={18}/> กำลังบันทึก...</> : <><Download size={18} /> บันทึก QR Code</>}
                  </button>

                  <button 
                    onClick={() => {
                        if (timerRef.current) clearInterval(timerRef.current);
                        setStep('upload');
                    }} 
                    disabled={timeLeft <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    แจ้งชำระเงินแล้ว
                  </button>
                  <button 
                    onClick={() => {
                        if (timerRef.current) clearInterval(timerRef.current);
                        setStep('select');
                    }} 
                    className="w-full bg-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 font-bold py-3 rounded-xl transition-all"
                  >
                    {t('topup.cancel')}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: UPLOAD SLIP */}
            {step === 'upload' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 md:p-10 text-center transition-colors">
                <h2 className="text-2xl font-bold mb-2">{t('topup.upload_title')}</h2>
                <p className="text-slate-500 dark:text-zinc-400 mb-8">{t('topup.upload_desc').replace('{amount}', activePkgData?.baht?.toString() || '0')}</p>
                
                {errorMessage && (
                  <div className="mb-6 bg-red-50 dark:bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-left flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                    <p className="font-medium text-sm">{errorMessage}</p>
                  </div>
                )}

                <label className="block border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-500 bg-slate-50 dark:bg-zinc-950 rounded-2xl p-12 mb-8 cursor-pointer transition-colors flex flex-col items-center justify-center group overflow-hidden relative">
                  <input type="file" className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} disabled={isSubmitting} />
                  
                  {slipPreview ? (
                    <div className="absolute inset-0 w-full h-full">
                      <Image src={slipPreview} alt="Slip preview" fill className="object-contain" />
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Upload className="text-white mb-2" size={32} />
                         <span className="text-white font-medium">เปลี่ยนรูปภาพ</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-white dark:bg-zinc-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 rounded-full flex items-center justify-center mb-4 transition-colors shadow-sm">
                        <Upload className="text-slate-400 group-hover:text-blue-500" size={32} />
                      </div>
                      <p className="text-slate-700 dark:text-zinc-300 font-medium">{t('topup.click_upload')}</p>
                      <p className="text-slate-500 text-sm mt-2">{t('topup.drag_upload')}</p>
                    </>
                  )}
                </label>

                <div className="flex flex-col gap-4 max-w-sm mx-auto">
                  <button 
                    onClick={handleSubmitSlip} 
                    disabled={!slipFile || isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-zinc-700 disabled:text-slate-500 dark:disabled:text-zinc-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="animate-spin" size={20} /> กำลังตรวจสอบสลิป...</>
                    ) : (
                      <><CheckCircle size={20} /> ยืนยันการโอนเงิน</>
                    )}
                  </button>
                  <button 
                    onClick={() => setStep('qr')} 
                    disabled={isSubmitting}
                    className="text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors py-2 font-medium"
                  >
                    {t('topup.back')}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: SUCCESS */}
            {step === 'success' && (
              <div className="animate-in zoom-in duration-500 bg-white dark:bg-zinc-900 border border-green-500/30 rounded-2xl p-6 md:p-10 text-center relative overflow-hidden transition-colors shadow-xl">
                <div className="absolute top-0 left-0 w-full h-full bg-green-500/5 pointer-events-none"></div>
                <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-500">
                  <CheckCircle size={48} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('topup.success_title')}</h2>
                <p className="text-slate-500 dark:text-zinc-400 mb-8">{t('topup.success_desc').replace('{amount}', activePkgData?.totalCoins?.toLocaleString() || '0')}</p>
                
                <button onClick={() => { setStep('select'); setSelectedPkg(null); setCustomAmount(''); }} className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white font-bold py-3 px-8 rounded-xl transition-colors border border-slate-200 dark:border-zinc-700 shadow-sm">
                  {t('topup.new_transaction')}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-500">
            {loadingHistory ? (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-12 flex items-center justify-center text-slate-500">
                <Loader2 className="animate-spin" size={32} />
              </div>
            ) : historyList.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-12 text-center transition-colors shadow-sm">
                <History className="text-slate-300 dark:text-zinc-700 mx-auto mb-4" size={56} />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('topup.no_history')}</h3>
                <p className="text-slate-500 dark:text-zinc-400">{t('topup.no_history_desc')}</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {historyList.map((item) => (
                    <div key={item.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <ImageIcon size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white mb-0.5">เติมเหรียญ {item.amount} บาท</p>
                          <p className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-2">
                             {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'รอสักครู่...'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-yellow-500 text-lg mb-0.5">+{item.coinsAdded} 🪙</p>
                        {item.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2.5 py-1 rounded-md">
                            <CheckCircle size={12} /> สำเร็จ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md">
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
