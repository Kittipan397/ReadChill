'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Eye, Star } from 'lucide-react';

interface MangaCardProps {
  id: string;
  title: string;
  coverUrl: string;
  views: number;
  rating: number;
  isNew?: boolean;
  type?: string;
}

export default function MangaCard({ id, title, coverUrl, views, rating, isNew, type }: MangaCardProps) {
  // Format views to 'K' or 'M'
  const formatViews = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const routeType = type === 'art' ? 'art' : type === 'novel' ? 'novel' : 'manga';

  return (
    <Link href={`/${routeType}/${id}`} className="block group">
      <div className="premium-card relative w-full aspect-[2/3] bg-zinc-200 dark:bg-zinc-800">
        {/* Cover Image */}
        <Image
          src={coverUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          /* Anti-copy measures */
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          priority={false}
        />
        
        {/* New Badge */}
        {isNew && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg z-10">
            NEW
          </div>
        )}

        {/* Gradient Overlay & Info */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 z-10">
          <h3 className="text-white font-bold text-sm sm:text-base line-clamp-2 mb-2 group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          
          <div className="flex items-center justify-between text-zinc-300 text-xs font-medium">
            <div className="flex items-center gap-1">
              <Star size={14} className="text-yellow-500 fill-yellow-500" />
              <span>{rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye size={14} />
              <span>{formatViews(views)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
