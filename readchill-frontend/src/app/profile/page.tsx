'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { 
  Camera, Pencil, Edit3, 
  BookOpen, Clock, 
  Bookmark, MessageSquare, Palette, Shield, X, ZoomIn, ZoomOut
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SecurityTab from '@/components/profile/SecurityTab';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { storage, db } from '@/lib/firebase';
import WebtoonCard from '@/components/ui/WebtoonCard';

export default function ProfilePage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('webtoons');

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'cover' | 'avatar' | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editFacebook, setEditFacebook] = useState("");
  const [editInstagram, setEditInstagram] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const [myWorks, setMyWorks] = useState<any[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchMyWorks = async () => {
      setLoadingWorks(true);
      try {
        const q = query(collection(db, 'webtoons'), where('authorId', '==', user.uid));
        const snapshot = await getDocs(q);
        const works = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMyWorks(works);
      } catch (error) {
        console.error("Error fetching works:", error);
      } finally {
        setLoadingWorks(false);
      }
    };
    fetchMyWorks();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Loading...</div>;
  }

  const coverUrl = userData?.coverUrl || "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=2000&auto=format&fit=crop";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'avatar') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      let imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl as string);
      setCropType(type);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
    // reset input so the same file can be selected again
    e.target.value = '';
  };

  const readFile = (file: File) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadImage = async () => {
    if (!imageSrc || !user || !croppedAreaPixels || !cropType) return;
    setIsUploading(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      if (!croppedImageBlob) throw new Error("Could not crop image");

      const storageRef = ref(storage, `users/${user.uid}/${cropType}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, croppedImageBlob);
      const downloadURL = await getDownloadURL(storageRef);

      if (cropType === 'cover') {
        await updateDoc(doc(db, 'users', user.uid), { coverUrl: downloadURL });
        alert('อัปเดตรูปหน้าปกสำเร็จ');
      } else {
        await updateProfile(user, { photoURL: downloadURL });
        await updateDoc(doc(db, 'users', user.uid), { photoURL: downloadURL });
        alert('อัปเดตรูปโปรไฟล์สำเร็จ');
      }

      setImageSrc(null); // Close modal
      setCropType(null);
      window.location.reload(); 
    } catch (error) {
      console.error(error);
      alert(`เกิดข้อผิดพลาดในการอัปโหลดรูป${cropType === 'cover' ? 'ปก' : 'โปรไฟล์'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      if (editDisplayName !== user.displayName) {
        await updateProfile(user, { displayName: editDisplayName });
      }

      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editDisplayName,
        bio: editBio,
        facebook: editFacebook,
        instagram: editInstagram
      });
      alert('บันทึกข้อมูลโปรไฟล์สำเร็จ');
      setIsEditProfileOpen(false);
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const openEditProfile = () => {
    setEditDisplayName(user?.displayName || "");
    setEditBio(userData?.bio || "");
    setEditFacebook(userData?.facebook || "");
    setEditInstagram(userData?.instagram || "");
    setIsEditProfileOpen(true);
  };

  const handleGoToCreatorStudio = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/custom-token`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      const data = await res.json();
      if (data.success && data.token) {
        window.open(`http://localhost:3001/login?token=${data.token}`, '_blank');
      } else {
        window.open('http://localhost:3001', '_blank');
      }
    } catch (error) {
      console.error("Error navigating to Creator Studio:", error);
      window.open('http://localhost:3001', '_blank');
    }
  };

  const tabs = [
    { id: 'artworks', label: 'ผลงานของฉัน', icon: Palette, hide: userData?.role !== 'artist' },
    { id: 'webtoons', label: 'เว็บตูน', icon: BookOpen },
    { id: 'novels', label: 'นิยาย', icon: BookOpen },
    { id: 'arts', label: 'ภาพวาด', icon: Palette },
    { id: 'comments', label: 'คอมเมนต์', icon: MessageSquare },
    { id: 'history', label: 'ประวัติการอ่าน', icon: Clock },
    { id: 'bookmarks', label: 'บันทึกไว้', icon: Bookmark },
    { id: 'security', label: 'ความปลอดภัย', icon: Shield },
  ].filter(tab => !tab.hide);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] pb-20 transition-colors">
      
      {/* Top subtle gradient background */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-blue-500/10 via-purple-500/5 to-transparent pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Column (Profile Card & Navigation) */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
            
            {/* Main Profile Card */}
            <div className="bg-white/70 dark:bg-[#121212]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl">
              
              {/* Mini Cover */}
              <div className="h-32 relative bg-zinc-800 group overflow-hidden rounded-t-3xl">
                <Image 
                  src={coverUrl} 
                  alt="Cover" 
                  fill 
                  className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                  unoptimized
                />
                <button 
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white p-2 rounded-full transition-all border border-white/10"
                >
                  <Camera size={16} />
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={coverInputRef} 
                  onChange={(e) => handleFileChange(e, 'cover')} 
                  className="hidden" 
                />
              </div>

              {/* Avatar & Info */}
              <div className="px-6 pb-6 relative flex flex-col items-center text-center">
                
                {/* Avatar */}
                <div className="relative -mt-16 w-32 h-32 z-10 group cursor-pointer mb-4" onClick={() => avatarInputRef.current?.click()}>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center">
                    <Camera size={24} className="text-white" />
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={avatarInputRef} 
                    onChange={(e) => handleFileChange(e, 'avatar')} 
                    className="hidden" 
                  />
                  <Image 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=1a90ff&color=fff`} 
                    alt="Profile" 
                    fill
                    className="rounded-full border-4 border-white dark:border-[#121212] object-cover z-0 bg-white dark:bg-[#121212] shadow-lg"
                    unoptimized
                  />
                  {userData?.activeFrame && (
                    <div className="absolute -inset-4 z-30 pointer-events-none mix-blend-screen">
                      <Image src={userData.activeFrame} alt="frame" fill className="object-contain scale-[1.15]" unoptimized />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2 mb-1">
                    {user.displayName || 'Member'}
                    <button onClick={openEditProfile} className="text-slate-400 hover:text-blue-500 transition-colors" title="แก้ไขชื่อ">
                      <Pencil size={14} />
                    </button>
                  </h1>
                  
                  <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium mb-4 flex items-center gap-2">
                    @{user.email?.split('@')[0]}
                    <span className="w-1 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full"></span>
                    {userData?.role === 'artist' ? (
                      <span className="text-pink-500 dark:text-pink-400 font-bold inline-flex items-center gap-1">
                        <Palette size={14} /> นักวาด
                      </span>
                    ) : (
                      'ผู้ใช้ทั่วไป'
                    )}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-center gap-6 w-full py-4 border-y border-slate-100 dark:border-white/5 mb-4">
                    <div className="flex flex-col items-center group cursor-pointer">
                      <strong className="text-slate-900 dark:text-white text-lg group-hover:text-blue-500 transition-colors">0</strong>
                      <span className="text-xs text-slate-500 dark:text-zinc-500">คอมเมนต์</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-white/5"></div>
                    <div className="flex flex-col items-center group cursor-pointer">
                      <strong className="text-slate-900 dark:text-white text-lg group-hover:text-pink-500 transition-colors">0</strong>
                      <span className="text-xs text-slate-500 dark:text-zinc-500">ถูกใจที่ได้รับ</span>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="w-full text-left mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">เกี่ยวกับฉัน</h3>
                      <button onClick={openEditProfile} className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium">
                        {userData?.bio ? 'แก้ไข' : '+ เพิ่ม'}
                      </button>
                    </div>
                    {userData?.bio ? (
                      <p className="text-slate-700 dark:text-zinc-300 text-sm whitespace-pre-wrap">{userData.bio}</p>
                    ) : (
                      <p className="text-slate-500 dark:text-zinc-500 text-sm italic">ยังไม่มีข้อมูลแนะนำตัว...</p>
                    )}
                    
                    {/* Social Links */}
                    {(userData?.facebook || userData?.instagram) && (
                      <div className="mt-4 flex flex-col gap-2">
                        {userData.facebook && (
                          <a href={userData.facebook} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
                            📘 Facebook
                          </a>
                        )}
                        {userData.instagram && (
                          <a href={userData.instagram.startsWith('http') ? userData.instagram : `https://instagram.com/${userData.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-pink-600 hover:underline flex items-center gap-1">
                            📸 Instagram
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <Link href="/inventory" className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95">
                    <Edit3 size={18} />
                    ตกแต่งโปรไฟล์
                  </Link>

                  {/* Creator Studio Link for Artists/Admins */}
                  {(userData?.role === 'artist' || userData?.role === 'admin' || userData?.role === 'partner') && (
                    <button onClick={handleGoToCreatorStudio} className="w-full mt-3 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95">
                      <Palette size={18} />
                      จัดการผลงาน (Creator Studio)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Vertical Navigation Tabs */}
            <div className="bg-white/70 dark:bg-[#121212]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/5 p-3 shadow-xl">
              <div className="flex flex-col gap-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                        isActive 
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm' 
                          : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-blue-600 dark:text-blue-400' : ''} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
          </div>

          {/* Right Column (Main Content Area) */}
          <div className="flex-1 min-w-0">
            {/* Tab Content */}
            {activeTab === 'security' ? (
              <SecurityTab />
            ) : ['webtoons', 'novels', 'arts', 'artworks'].includes(activeTab) ? (
              <div className="bg-white/70 dark:bg-[#121212]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/5 p-8 shadow-2xl min-h-[600px]">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h2>
                {loadingWorks ? (
                  <div className="flex justify-center py-20 text-slate-500">กำลังโหลดข้อมูล...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {myWorks
                      .filter(work => activeTab === 'artworks' ? true : work.type === activeTab.replace('s', '') || (activeTab === 'webtoons' && (work.type === 'comic' || work.type === 'webtoon')) || (activeTab === 'novels' && work.type === 'novel') || (activeTab === 'arts' && work.type === 'art'))
                      .map((work) => (
                      <WebtoonCard key={work.id} {...work} />
                    ))}
                    {myWorks.filter(work => activeTab === 'artworks' ? true : work.type === activeTab.replace('s', '') || (activeTab === 'webtoons' && (work.type === 'comic' || work.type === 'webtoon')) || (activeTab === 'novels' && work.type === 'novel') || (activeTab === 'arts' && work.type === 'art')).length === 0 && (
                      <div className="col-span-full py-20 text-center flex flex-col items-center">
                        <BookOpen size={48} className="text-slate-300 dark:text-zinc-700 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 dark:text-zinc-300 mb-2">ยังไม่มีผลงาน</h3>
                        <p className="text-slate-500 dark:text-zinc-500 text-sm">
                          คุณยังไม่ได้ลงผลงานในหมวดหมู่นี้ ลองเข้าไปจัดการที่ Creator Studio ได้เลย!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/70 dark:bg-[#121212]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/5 p-12 shadow-2xl min-h-[600px] flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-slate-100 dark:bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <BookOpen size={40} className="text-slate-300 dark:text-zinc-700" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">ยังไม่มีข้อมูล</h3>
                <p className="text-slate-500 dark:text-zinc-400 max-w-md leading-relaxed">
                  ดูเหมือนว่าคุณยังไม่มีกิจกรรมในส่วนนี้ ลองเริ่มต้นอ่านการ์ตูนเรื่องโปรดหรือคอมเมนต์พูดคุยกับเพื่อนๆ ดูสิ!
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Cropper Modal */}
      {imageSrc && cropType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => !isUploading && setImageSrc(null)}></div>
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#18181b] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 z-10 flex flex-col">
            
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">ครอปรูป{cropType === 'cover' ? 'หน้าปก' : 'โปรไฟล์'}</h3>
              <button 
                onClick={() => setImageSrc(null)} 
                disabled={isUploading}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-slate-500 dark:text-zinc-400 text-sm mb-4">ลากเพื่อเลื่อนตำแหน่ง ซูมเพื่อเลือกเฉพาะส่วนที่ต้องการ</p>
              
              <div className={`relative w-full bg-slate-100 dark:bg-black overflow-hidden mb-6 ${cropType === 'cover' ? 'h-64 sm:h-80 rounded-2xl' : 'h-80 sm:h-96 rounded-2xl'}`}>
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={cropType === 'cover' ? 3 / 1 : 1} 
                  cropShape={cropType === 'cover' ? 'rect' : 'round'}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  showGrid={cropType === 'cover'}
                />
              </div>

              <div className="flex items-center gap-4 mb-6 px-4">
                <ZoomOut size={20} className="text-slate-400 shrink-0" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <ZoomIn size={20} className="text-slate-400 shrink-0" />
              </div>

              <div className="flex justify-between gap-4">
                <button 
                  onClick={() => setImageSrc(null)}
                  disabled={isUploading}
                  className="flex-1 py-3 text-slate-600 dark:text-zinc-300 font-medium bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleUploadImage}
                  disabled={isUploading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {isUploading ? 'กำลังอัปโหลด...' : 'ใช้รูปนี้'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => !isSavingProfile && setIsEditProfileOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-[#18181b] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 z-10 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">แก้ไขโปรไฟล์</h3>
              <button 
                onClick={() => setIsEditProfileOpen(false)} 
                disabled={isSavingProfile}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">นามปากกา (Display Name)</label>
                <input 
                  type="text" 
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="ชื่อที่ใช้แสดงผล..."
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">แนะนำตัว (Bio)</label>
                <textarea 
                  rows={4}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="เขียนแนะนำตัวเองสั้นๆ..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ลิงก์ Facebook (ถ้ามี)</label>
                <input 
                  type="text" 
                  value={editFacebook}
                  onChange={(e) => setEditFacebook(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Instagram (ถ้ามี)</label>
                <input 
                  type="text" 
                  value={editInstagram}
                  onChange={(e) => setEditInstagram(e.target.value)}
                  placeholder="@username หรือลิงก์ IG"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 text-slate-600 dark:text-zinc-300 font-medium bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
