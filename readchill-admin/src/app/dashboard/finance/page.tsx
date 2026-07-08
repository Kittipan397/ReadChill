"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, setDoc, serverTimestamp, updateDoc, where, getDoc } from "firebase/firestore";
import { Wallet, CheckCircle2, XCircle, Clock, UploadCloud, Trash2 } from "lucide-react";

export default function FinancePage() {
  const { user, role } = useAuth();
  
  // States for Admin
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [totalSystemCoins, setTotalSystemCoins] = useState(0);

  // States for Partner
  const [partnerCoins, setPartnerCoins] = useState(0);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState<number | "">("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // New Admin states
  const [adminSearch, setAdminSearch] = useState("");
  const [adminSlips, setAdminSlips] = useState<{ [key: string]: File | null }>({});
  const [adminProcessingId, setAdminProcessingId] = useState<string | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (user && role) {
      fetchData();
    }
  }, [user, role]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (role === "admin") {
        // Fetch ALL withdrawal requests
        const q = query(collection(db, "withdrawal_requests"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setAllRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        // Fetch all users to calculate total outstanding earnedCoins and build users map
        const usersSnap = await getDocs(collection(db, "users"));
        let totalCoins = 0;
        const uMap: Record<string, any> = {};
        usersSnap.forEach(doc => {
          const data = doc.data();
          uMap[doc.id] = data;
          if (data.earnedCoins) totalCoins += data.earnedCoins;
        });
        setTotalSystemCoins(totalCoins);
        setUsersMap(uMap);

      } else if (role === "partner") {
        // Fetch Partner's earnedCoins
        const userRef = doc(db, "users", user!.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setPartnerCoins(userSnap.data().earnedCoins || 0);
        }

        // Fetch Partner's requests
        const q = query(
          collection(db, "withdrawal_requests"), 
          where("partnerId", "==", user!.uid)
        );
        const snap = await getDocs(q);
        // Sort manually if index is missing
        const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        reqs.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setMyRequests(reqs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("อัปโหลดไฟล์ไม่สำเร็จ");
    const data = await res.json();
    return data.url;
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setErrorMsg("กรุณาระบุจำนวนเหรียญที่ต้องการเบิกให้ถูกต้อง");
      return;
    }
    if (amount > partnerCoins) {
      setErrorMsg("ยอดเงินของคุณไม่พอให้เบิก");
      return;
    }
    if (!bankDetails && !qrFile) {
      setErrorMsg("กรุณาระบุบัญชีธนาคาร หรือแนบ QR Code รับเงิน");
      return;
    }

    setSubmitting(true);
    try {
      let qrCodeUrl = null;
      if (qrFile) {
        qrCodeUrl = await uploadFile(qrFile);
      }

      // Calculate 1% fee
      const fee = amount * 0.01;
      const transferAmount = amount - fee;

      const newReqRef = doc(collection(db, "withdrawal_requests"));
      
      // Deduct coins from user immediately
      const userRef = doc(db, "users", user!.uid);
      
      // Note: In production, this should be a Firestore Transaction!
      // Here we assume it's fine for demo, or we can just update it
      await updateDoc(userRef, {
        earnedCoins: partnerCoins - amount
      });

      // Save Request
      await setDoc(newReqRef, {
        partnerId: user!.uid,
        partnerEmail: user!.email,
        partnerName: user!.displayName,
        requestAmount: amount,
        feeAmount: fee,
        transferAmount: transferAmount,
        bankDetails: bankDetails,
        qrCodeUrl: qrCodeUrl,
        status: "pending",
        createdAt: serverTimestamp()
      });

      setSuccessMsg("ส่งคำขอเบิกเงินสำเร็จ!");
      setWithdrawAmount("");
      setBankDetails("");
      setQrFile(null);
      setQrPreview(null);
      
      fetchData(); // Refresh Data
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async (request: any) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะยกเลิกคำขอนี้? เหรียญจะถูกคืนเข้าสู่ระบบ")) return;
    
    try {
      const reqRef = doc(db, "withdrawal_requests", request.id);
      
      // Refund coins
      const userRef = doc(db, "users", user!.uid);
      await updateDoc(userRef, {
        earnedCoins: partnerCoins + request.requestAmount
      });
      
      // Delete request
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(reqRef);
      
      fetchData();
    } catch (err) {
      console.error(err);
      alert("ยกเลิกคำขอไม่สำเร็จ");
    }
  };

  const handleAdminAction = async (requestId: string, action: "approved" | "rejected", amountRefund: number, partnerId: string) => {
    if (!confirm(`ยืนยันการทำรายการ ${action} ?`)) return;
    setAdminProcessingId(requestId);
    try {
      let slipUrl = null;
      if (action === "approved" && adminSlips[requestId]) {
        slipUrl = await uploadFile(adminSlips[requestId]!);
      }

      const reqRef = doc(db, "withdrawal_requests", requestId);
      const updateData: any = {
        status: action,
        updatedAt: serverTimestamp()
      };
      if (slipUrl) {
        updateData.slipUrl = slipUrl;
      }

      await updateDoc(reqRef, updateData);

      // If rejected, refund the coins back to the partner
      if (action === "rejected") {
        const { increment } = await import("firebase/firestore");
        const partnerRef = doc(db, "users", partnerId);
        await updateDoc(partnerRef, {
          earnedCoins: increment(amountRefund)
        });
      }

      setAdminSlips(prev => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("ทำรายการไม่สำเร็จ");
    } finally {
      setAdminProcessingId(null);
    }
  };

  const filteredRequests = allRequests.filter(req => {
    if (!adminSearch) return true;
    const search = adminSearch.toLowerCase();
    const dateStr = req.createdAt?.toDate?.() ? new Date(req.createdAt.toDate()).toLocaleDateString('th-TH') : "";
    return (
      (req.partnerName || "").toLowerCase().includes(search) ||
      (req.partnerEmail || "").toLowerCase().includes(search) ||
      dateStr.includes(search)
    );
  });

  if (loading) {
    return <div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</div>;
  }

  // ================= ADMIN VIEW =================
  if (role === "admin") {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Admin Finance Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">ยอดเหรียญค้างจ่าย (Total Outstanding Coins)</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{totalSystemCoins.toFixed(2)} 🪙</h3>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Wallet size={32} />
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">คำขอเบิกเงินที่รอดำเนินการ</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {allRequests.filter(r => r.status === "pending").length} รายการ
              </h3>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl">
              <Clock size={32} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800 dark:text-white">คำขอถอนเงิน (Withdrawal Requests)</h3>
            <input 
              type="text" 
              placeholder="ค้นหานักเขียน หรือวันที่..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full md:w-64"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">วันที่</th>
                  <th className="px-6 py-4">นักเขียน (Partner)</th>
                  <th className="px-6 py-4 text-emerald-600">ยอดเงิน (เหรียญ)</th>
                  <th className="px-6 py-4">ข้อมูลรับเงิน</th>
                  <th className="px-6 py-4">สลิปโอนเงิน</th>
                  <th className="px-6 py-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 dark:text-white">
                        {req.createdAt?.toDate?.() ? new Date(req.createdAt.toDate()).toLocaleString('th-TH') : "-"}
                      </p>
                      <div className="mt-1">
                        {req.status === "pending" && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-bold">รอโอน</span>}
                        {req.status === "approved" && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">โอนแล้ว</span>}
                        {req.status === "rejected" && <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">ปฏิเสธ</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 dark:text-white">
                        {req.partnerName || usersMap[req.partnerId]?.displayName || (req.partnerEmail ? req.partnerEmail.split('@')[0] : "Unknown")}
                      </p>
                      <p className="text-xs text-slate-500">{req.partnerEmail}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                      ฿{(req.transferAmount || req.requestAmount || 0).toFixed(2)}
                      <p className="text-xs text-slate-400 font-normal mt-1">หักยอด: {req.requestAmount} 🪙</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs truncate max-w-[150px] font-medium">{req.bankDetails || "-"}</p>
                      {req.qrCodeUrl && (
                        <a href={req.qrCodeUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs inline-block mt-1">
                          ดู QR Code
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {req.status === "pending" ? (
                        <input 
                          type="file" 
                          accept="image/*"
                          className="text-xs max-w-[150px]"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setAdminSlips(prev => ({ ...prev, [req.id]: e.target.files![0] }));
                            }
                          }}
                        />
                      ) : (
                        req.slipUrl ? (
                          <a href={req.slipUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">
                            ดูสลิป
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === "pending" && (
                        <div className="flex flex-col items-end gap-2">
                          <button 
                            disabled={adminProcessingId === req.id}
                            onClick={() => handleAdminAction(req.id, "approved", req.requestAmount, req.partnerId)} 
                            className="px-3 py-1.5 bg-white border border-slate-300 dark:border-slate-600 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-bold disabled:opacity-50"
                          >
                            {adminProcessingId === req.id ? "กำลังโอน..." : "ยืนยันโอนเงิน"}
                          </button>
                          <button 
                            disabled={adminProcessingId === req.id}
                            onClick={() => handleAdminAction(req.id, "rejected", req.requestAmount, req.partnerId)} 
                            className="px-3 py-1.5 bg-white border border-slate-300 dark:border-slate-600 dark:bg-slate-800 hover:bg-red-50 text-slate-800 dark:text-white rounded-lg text-xs font-bold disabled:opacity-50"
                          >
                            ลบคำขอ
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">ไม่มีคำขอเบิกเงิน</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ================= PARTNER VIEW =================
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Revenue & Withdrawal</h2>
      
      {/* Revenue Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-lg flex items-center justify-between">
        <div>
          <p className="text-blue-100 font-medium mb-1">ยอดเงินคงเหลือของคุณ (Net Balance)</p>
          <div className="flex items-end gap-3">
            <h3 className="text-5xl font-bold">{partnerCoins.toFixed(2)}</h3>
            <span className="text-xl font-medium mb-1">เหรียญ (🪙)</span>
          </div>
          <p className="text-xs text-blue-200 mt-2">* ยอดนี้คือยอดสุทธิหลังหักส่วนแบ่ง (73/27) แล้ว</p>
        </div>
        <div className="p-4 bg-white/20 backdrop-blur-sm rounded-full hidden md:block">
          <Wallet size={48} className="text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Withdraw Form */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6">แจ้งเบิกเงิน (Withdraw)</h3>
          
          <form onSubmit={handleWithdrawSubmit} className="space-y-5">
            {errorMsg && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{errorMsg}</div>}
            {successMsg && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm">{successMsg}</div>}

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                จำนวนเหรียญที่ต้องการเบิก <span className="text-red-500">*</span>
              </label>
              <input 
                type="number"
                min="1"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="เช่น 100"
              />
              {Number(withdrawAmount) > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  ระบบจะหักค่าธรรมเนียมโอน 1% คุณจะได้รับโอนจริง: <b className="text-emerald-600">฿{(Number(withdrawAmount) * 0.99).toFixed(2)}</b>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                ข้อมูลบัญชีธนาคาร (เลขบัญชี / ชื่อบัญชี)
              </label>
              <input 
                type="text"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                placeholder="เช่น 123-4-56789-0 กสิกร นายกิตติพันธ์"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                หรือแนบรูป QR Code รับเงิน (PromptPay)
              </label>
              
              <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors">
                {qrPreview ? (
                  <img src={qrPreview} alt="QR" className="h-full object-contain p-1" />
                ) : (
                  <div className="flex flex-col items-center text-slate-500">
                    <UploadCloud size={24} className="mb-1" />
                    <span className="text-sm font-medium">คลิกเพื่อเลือกไฟล์ QR Code</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setQrFile(e.target.files[0]);
                      setQrPreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }} 
                />
              </label>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? "กำลังส่งคำขอ..." : "ยืนยันการแจ้งเบิกเงิน"}
            </button>
          </form>
        </div>

        {/* Withdraw History */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">ประวัติการเบิกเงิน (History)</h3>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {myRequests.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">ยังไม่มีประวัติการเบิกเงิน</p>
            ) : (
              myRequests.map(req => (
                <div key={req.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl relative group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-800 dark:text-white text-lg">฿{(req.transferAmount || req.requestAmount || 0).toFixed(2)}</span>
                    {req.status === "pending" && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-bold">รอตรวจสอบ</span>}
                    {req.status === "approved" && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">สำเร็จ</span>}
                    {req.status === "rejected" && <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">ถูกปฏิเสธ</span>}
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>หักยอด: {req.requestAmount} 🪙 (รวมค่าธรรมเนียม 1%)</span>
                    <span>{new Date(req.createdAt?.toDate?.() || Date.now()).toLocaleDateString('th-TH')}</span>
                  </div>

                  {req.status === "pending" && (
                    <button 
                      onClick={() => handleDeleteRequest(req)}
                      className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="ยกเลิกคำขอ"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
