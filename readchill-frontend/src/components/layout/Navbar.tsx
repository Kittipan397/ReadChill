'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, CreditCard, Library, MessageCircle, LogIn, Menu, X, LogOut, Package, Sun, Moon, Globe, UserIcon as User, ShoppingBag, Archive, Settings, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/context/LanguageContext';

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { user, userData, loading, logout } = useAuth();
  
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => setMounted(true), []);

  const navLinks = [
    { name: t('nav.home'), href: '/', icon: <Home size={18} /> },
    { name: t('nav.search'), href: '/search', icon: <Search size={18} /> },
    { name: t('nav.shop'), href: '/shop', icon: <Package size={18} /> },
    { name: t('nav.topup'), href: '/topup', icon: <CreditCard size={18} /> },
    { name: t('nav.library'), href: '/library', icon: <Library size={18} /> },
    { name: t('nav.contact'), href: '/request', icon: <MessageCircle size={18} /> },
  ];

  return (
    <>
      <nav className="glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
                  R
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white hidden sm:block">ReadChill</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="flex items-center space-x-2">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={`nav-link ${isActive ? 'active' : ''}`}
                    >
                      {link.icon}
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User Actions & Toggles */}
            <div className="hidden md:flex items-center gap-4">
              
              {/* Language Toggle */}
              <button
                onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
                className="flex items-center gap-1 text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white transition-colors"
                title={language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
              >
                <Globe size={18} />
                <span className="text-sm font-bold uppercase">{language}</span>
              </button>

              {/* Theme Toggle */}
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/50"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              )}

              {loading ? (
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse"></div>
              ) : user ? (
                <div className="relative">
                  <button 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2 focus:outline-none relative w-10 h-10"
                  >
                    <Image 
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=1a90ff&color=fff`} 
                      alt="Profile" 
                      fill
                      className="rounded-full border-2 border-transparent hover:border-blue-500 transition-colors object-cover z-0"
                      unoptimized
                    />
                    {userData?.activeFrame && (
                      <div className="absolute -inset-1.5 z-10 pointer-events-none">
                        <Image src={userData.activeFrame} alt="frame" fill className="object-contain scale-110" unoptimized />
                      </div>
                    )}
                  </button>
                  
                  <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-4 w-72 bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-6 flex flex-col items-center border-b border-slate-100 dark:border-zinc-800/50">
                        <div className="relative w-16 h-16 mb-3">
                          <Image 
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=1a90ff&color=fff`} 
                            alt="Profile" 
                            fill
                            className="rounded-full object-cover z-0"
                            unoptimized
                          />
                          {userData?.activeFrame && (
                            <div className="absolute -inset-2 z-10 pointer-events-none">
                              <Image src={userData.activeFrame} alt="frame" fill className="object-contain scale-110" unoptimized />
                            </div>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white truncate w-full text-center">{user.displayName || 'Member'}</h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 truncate w-full text-center">@{user.email?.split('@')[0]}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-500 truncate w-full text-center mt-0.5">{user.email}</p>
                        
                        <Link href="/topup" onClick={() => setIsProfileMenuOpen(false)} className="mt-4 flex items-center justify-center gap-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-4 py-1.5 rounded-full border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors">
                          <span className="text-sm font-bold">🪙 {userData?.coins || 0} เหรียญ</span>
                        </Link>
                      </div>

                      <div className="p-2 space-y-0.5">
                        <Link href="/profile" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors">
                          <User size={18} />
                          <span>โปรไฟล์</span>
                        </Link>
                        <Link href="/shop" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors">
                          <ShoppingBag size={18} />
                          <span>ร้านค้า</span>
                        </Link>
                        <Link href="/inventory" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors">
                          <Archive size={18} />
                          <span>คลังของฉัน</span>
                        </Link>
                        <div className="h-px bg-slate-100 dark:bg-zinc-800/50 my-1 mx-2"></div>
                        <Link href="/settings" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors">
                          <Settings size={18} />
                          <span>การตั้งค่า</span>
                        </Link>
                        <Link href="/security" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors">
                          <Shield size={18} />
                          <span>ความปลอดภัย</span>
                        </Link>
                        
                        <div className="h-px bg-slate-100 dark:bg-zinc-800/50 my-1 mx-2"></div>
                        <button 
                          onClick={() => {
                            logout();
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 rounded-xl text-left transition-colors"
                        >
                          <LogOut size={18} />
                          <span>ออกจากระบบ</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link href="/login" className="btn-primary flex items-center gap-2">
                  <LogIn size={18} />
                  <span>{t('login')}</span>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              {/* Language Toggle Mobile */}
              <button
                onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
                className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white p-2"
              >
                <span className="text-xs font-bold uppercase">{language}</span>
              </button>

              {/* Theme Toggle Mobile */}
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white p-2"
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-md focus:outline-none"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 absolute w-full z-40"
          >
            <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`nav-link flex w-full ${isActive ? 'active' : ''}`}
                  >
                    {link.icon}
                    <span>{link.name}</span>
                  </Link>
                );
              })}
              <div className="pt-4 pb-2 border-t border-slate-200 dark:border-zinc-800 mt-4">
                {user ? (
                  <>
                    <div className="flex items-center px-3 mb-4 mt-2">
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <Image 
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=1a90ff&color=fff`} 
                          alt="Profile" 
                          fill
                          className="rounded-full object-cover z-0"
                          unoptimized
                        />
                        {userData?.activeFrame && (
                          <div className="absolute -inset-1 z-10 pointer-events-none">
                            <Image src={userData.activeFrame} alt="frame" fill className="object-contain scale-110" unoptimized />
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="text-base font-bold leading-none text-slate-900 dark:text-white truncate">{user.displayName || t('profile.member')}</div>
                        <div className="text-sm font-medium leading-none text-slate-500 dark:text-zinc-400 mt-1.5 truncate">{user.email}</div>
                      </div>
                    </div>
                    
                    <div className="px-3 mb-4">
                      <Link href="/topup" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-4 py-2 rounded-xl border border-yellow-500/20">
                        <span className="font-bold">🪙 {userData?.coins || 0} เหรียญ</span>
                      </Link>
                    </div>

                    <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white font-medium rounded-xl transition-colors">
                      <User size={20} />
                      <span>โปรไฟล์</span>
                    </Link>
                    <Link href="/shop" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white font-medium rounded-xl transition-colors">
                      <ShoppingBag size={20} />
                      <span>ร้านค้า</span>
                    </Link>
                    <Link href="/inventory" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white font-medium rounded-xl transition-colors">
                      <Archive size={20} />
                      <span>คลังของฉัน</span>
                    </Link>
                    <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white font-medium rounded-xl transition-colors">
                      <Settings size={20} />
                      <span>การตั้งค่า</span>
                    </Link>
                    <Link href="/security" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white font-medium rounded-xl transition-colors">
                      <Shield size={20} />
                      <span>ความปลอดภัย</span>
                    </Link>
                    
                    <div className="h-px bg-slate-200 dark:bg-zinc-800 my-2 mx-4"></div>
                    <button
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 px-3 py-2 font-medium text-left"
                    >
                      <LogOut size={18} />
                      <span>{t('logout')}</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 font-medium"
                  >
                    <LogIn size={18} />
                    <span>{t('login')}</span>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
