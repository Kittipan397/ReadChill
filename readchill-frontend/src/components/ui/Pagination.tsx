'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  hasNextPage?: boolean;
}

export default function Pagination({ hasNextPage = false }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;

  if (currentPage === 1 && !hasNextPage) return null;

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-4 mt-12 mb-8">
      {/* Prev */}
      {currentPage > 1 ? (
        <Link 
          href={createPageUrl(currentPage - 1)}
          className="px-6 py-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:-translate-y-1 hover:shadow-md hover:border-red-500/50 transition-all font-semibold"
        >
          <ChevronLeft size={20} className="mr-1" /> หน้าก่อนหน้า
        </Link>
      ) : (
        <div className="px-6 py-2.5 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-800/50 text-slate-400 dark:text-zinc-600 cursor-not-allowed font-semibold">
          <ChevronLeft size={20} className="mr-1" /> หน้าก่อนหน้า
        </div>
      )}

      {/* Current Page */}
      <div className="w-10 h-10 flex items-center justify-center rounded-xl font-bold bg-red-600 text-white shadow-lg shadow-red-600/20 border-transparent">
        {currentPage}
      </div>

      {/* Next */}
      {hasNextPage ? (
        <Link 
          href={createPageUrl(currentPage + 1)}
          className="px-6 py-2.5 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:-translate-y-1 hover:shadow-md hover:border-red-500/50 transition-all font-semibold"
        >
          หน้าถัดไป <ChevronRight size={20} className="ml-1" />
        </Link>
      ) : (
        <div className="px-6 py-2.5 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-800/50 text-slate-400 dark:text-zinc-600 cursor-not-allowed font-semibold">
          หน้าถัดไป <ChevronRight size={20} className="ml-1" />
        </div>
      )}
    </div>
  );
}
