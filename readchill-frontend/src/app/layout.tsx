import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { LanguageProvider } from '@/context/LanguageContext';

export const metadata: Metadata = {
  title: 'ReadChill - อาณาจักรการ์ตูนของคุณ',
  description: 'ReadChill - แหล่งรวมมังงะและคอมมิคคุณภาพ อ่านฟรี อ่านเพลิน ได้ทุกที่ทุกเวลา',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LanguageProvider>
            <AuthProvider>
              <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-300">
                <Navbar />
                <main className="flex-1 flex flex-col">
                  {children}
                </main>
                
                <footer className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-8 mt-12 transition-colors duration-300">
                  <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 dark:text-zinc-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} ReadChill. All rights reserved.</p>
                  </div>
                </footer>
              </div>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
