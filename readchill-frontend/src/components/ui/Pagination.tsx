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
          className="px-6 py-2 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors font-medium"
        >
          <ChevronLeft size={20} className="mr-1" /> หน้าก่อนหน้า
        </Link>
      ) : (
        <div className="px-6 py-2 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800/50 text-slate-300 dark:text-zinc-600 cursor-not-allowed font-medium">
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
          className="px-6 py-2 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors font-medium"
        >
          หน้าถัดไป <ChevronRight size={20} className="ml-1" />
        </Link>
      ) : (
        <div className="px-6 py-2 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800/50 text-slate-300 dark:text-zinc-600 cursor-not-allowed font-medium">
          หน้าถัดไป <ChevronRight size={20} className="ml-1" />
        </div>
      )}
    </div>
  );
}
