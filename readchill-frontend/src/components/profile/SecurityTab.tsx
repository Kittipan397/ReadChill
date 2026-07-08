'use client';

import { useState, useEffect } from 'react';
import { Shield, Key, Link as LinkIcon, Monitor, CheckCircle2, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { sendPasswordResetEmail, linkWithPopup, unlink, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import Image from 'next/image';

interface Session {
  id: string;
  userAgent: string;
  ip: string;
  lastActive: any;
}

export default function SecurityTab() {
  const { user, sessionId } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetSent, setResetSent] = useState(false);
  const [linking, setLinking] = useState(false);

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchSessions = async () => {
      try {
        const q = query(collection(db, 'users', user.uid, 'sessions'), orderBy('lastActive', 'desc'));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
        setSessions(data);
      } catch (err) {
        console.error("Error fetching sessions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [user]);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setPasswordError('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (!user) return;
    
    setIsChangingPassword(true);
    setPasswordError('');
    
    try {
      const { updatePassword } = await import('firebase/auth');
      await updatePassword(user, newPassword);
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      alert('เปลี่ยนรหัสผ่านสำเร็จ!');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError('โปรดออกจากระบบและเข้าสู่ระบบใหม่อีกครั้งก่อนทำการเปลี่ยนรหัสผ่านเพื่อความปลอดภัย');
      } else {
        setPasswordError('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isGoogleLinked = user?.providerData.some(p => p.providerId === 'google.com');

  const handleLinkGoogle = async () => {
    if (!user) return;
    setLinking(true);
    try {
      const provider = new GoogleAuthProvider();
      if (isGoogleLinked) {
        // unlink
        await unlink(user, 'google.com');
      } else {
        // link
        await linkWithPopup(user, provider);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อบัญชี');
      }
    } finally {
      setLinking(false);
      window.location.reload(); // Refresh to update providerData
    }
  };

  const handleLogoutSession = async (sid: string) => {
    if (!user) return;
    if (confirm('คุณต้องการออกจากระบบเซสชันนี้ใช่หรือไม่?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'sessions', sid));
        setSessions(prev => prev.filter(s => s.id !== sid));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleLogoutAllOtherSessions = async () => {
    if (!user || !sessionId) return;
    if (confirm('คุณต้องการออกจากระบบเซสชันอื่นๆ ทั้งหมดใช่หรือไม่?')) {
      try {
        const otherSessions = sessions.filter(s => s.id !== sessionId);
        for (const s of otherSessions) {
          await deleteDoc(doc(db, 'users', user.uid, 'sessions', s.id));
        }
        setSessions(prev => prev.filter(s => s.id === sessionId));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleLogoutAll = async () => {
    if (!user) return;
    if (confirm('คุณต้องการออกจากระบบทุกอุปกรณ์ใช่หรือไม่?')) {
      try {
        for (const s of sessions) {
          await deleteDoc(doc(db, 'users', user.uid, 'sessions', s.id));
        }
        // Current device will be logged out automatically via the AuthContext snapshot listener
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getDeviceName = (ua: string) => {
    if (!ua) return 'Unknown Device';
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';
    
    return `${browser} on ${os}`;
  };

  return (
    <div className="text-left w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-full flex items-center justify-center">
          <Shield size={24} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">ความปลอดภัย</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">จัดการรหัสผ่านและความปลอดภัยของบัญชี</p>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-[#18181b] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 p-6 z-10">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">ตั้งรหัสผ่าน</h3>
            <p className="text-slate-500 dark:text-zinc-400 text-sm mb-6">ตั้งรหัสผ่านเพื่อใช้เข้าสู่ระบบด้วยอีเมลและรหัสผ่านได้</p>
            
            {passwordError && (
              <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4 border border-red-200 dark:border-red-500/20">
                {passwordError}
              </div>
            )}

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">รหัสผ่านใหม่</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">ยืนยันรหัสผ่าน</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="px-5 py-2.5 text-slate-600 dark:text-zinc-400 font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleChangePassword}
                disabled={isChangingPassword || !newPassword || !confirmPassword}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {isChangingPassword ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่าน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Section */}
      <div className="bg-white/70 dark:bg-[#121212]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold mb-2">
              <Key size={20} className="text-indigo-500" /> รหัสผ่าน
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-sm">ตั้งรหัสผ่านเพื่อให้สามารถเข้าสู่ระบบด้วยอีเมลและรหัสผ่านได้</p>
          </div>
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black px-6 py-2.5 rounded-xl font-bold transition-colors shadow-lg"
          >
            ตั้งรหัสผ่าน
          </button>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white/70 dark:bg-[#121212]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold mb-2">
          <LinkIcon size={20} className="text-teal-500" /> บัญชีที่เชื่อมต่อ
        </div>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mb-6">จัดการบัญชี Social ที่เชื่อมต่อกับบัญชีของคุณ</p>
        
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0 border border-slate-100 dark:border-none">
              <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={24} height={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-900 dark:text-white font-bold">Google</span>
                {isGoogleLinked && (
                  <span className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                    <CheckCircle2 size={12} /> เชื่อมต่อแล้ว
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-zinc-500 text-xs">{isGoogleLinked ? user?.email : 'คลิกเพื่อเชื่อมต่อบัญชี'}</p>
            </div>
          </div>
          <button 
            onClick={handleLinkGoogle}
            disabled={linking}
            className={`text-sm font-bold whitespace-nowrap px-4 py-2 rounded-xl transition-all ${isGoogleLinked ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20'}`}
          >
            {linking ? 'รอสักครู่...' : isGoogleLinked ? 'ยกเลิกการเชื่อมต่อ' : 'เชื่อมต่อ'}
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white/70 dark:bg-[#121212]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold mb-2">
          <Monitor size={20} className="text-rose-500" /> เซสชันที่ใช้งานอยู่
        </div>
        <p className="text-slate-500 dark:text-zinc-400 text-sm mb-6">อุปกรณ์ที่เข้าสู่ระบบด้วยบัญชีของคุณในขณะนี้</p>
        
        {loading ? (
          <div className="text-center py-8 text-slate-400 dark:text-zinc-500 animate-pulse font-medium">กำลังตรวจสอบเซสชัน...</div>
        ) : (
          <div className="space-y-4">
            {sessions.map(s => {
              const isCurrent = s.id === sessionId;
              return (
                <div key={s.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl transition-all hover:border-slate-300 dark:hover:border-zinc-700">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-slate-400 dark:text-zinc-500">
                      <Monitor size={24} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-slate-900 dark:text-white font-bold">{getDeviceName(s.userAgent)}</span>
                        {isCurrent && (
                          <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-medium">
                            เซสชันปัจจุบัน
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-zinc-500 text-[10px] sm:text-xs max-w-[200px] sm:max-w-md line-clamp-1" title={s.userAgent}>{s.userAgent}</p>
                      {s.ip && (
                        <p className="text-slate-500 dark:text-zinc-400 text-xs flex items-center gap-1 mt-1 font-mono bg-slate-200/50 dark:bg-black/30 px-2 py-0.5 rounded w-fit">
                          IP: {s.ip}
                        </p>
                      )}
                    </div>
                  </div>
                  {!isCurrent && (
                    <button 
                      onClick={() => handleLogoutSession(s.id)}
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2.5 rounded-xl transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-500/30"
                      title="ออกจากระบบอุปกรณ์นี้"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {sessions.length > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-200 dark:border-white/5">
            <button 
              onClick={handleLogoutAllOtherSessions}
              className="flex-1 flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-2xl transition-all group shadow-sm"
            >
              <div className="text-left">
                <div className="text-slate-900 dark:text-white font-bold group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">เตะเซสชันอื่นทั้งหมด</div>
                <div className="text-slate-500 dark:text-zinc-500 text-xs mt-1">ออกจากระบบในอุปกรณ์อื่นทั้งหมด ({sessions.length - 1} อุปกรณ์)</div>
              </div>
              <span className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 px-4 py-1.5 rounded-xl text-sm font-bold shadow-sm">เตะออก</span>
            </button>
            <button 
              onClick={handleLogoutAll}
              className="flex-1 flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-2xl transition-all group shadow-sm"
            >
              <div className="text-left">
                <div className="text-slate-900 dark:text-white font-bold group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">ออกจากระบบทุกอุปกรณ์</div>
                <div className="text-slate-500 dark:text-zinc-500 text-xs mt-1">รวมถึงอุปกรณ์ที่คุณกำลังใช้งานอยู่</div>
              </div>
              <span className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 px-4 py-1.5 rounded-xl text-sm font-bold shadow-sm">ออกจากระบบ</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
