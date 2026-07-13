"use client";

import WebtoonDetailPage from '@/app/webtoon/[id]/page';

export default function NovelDetailPage() {
  // Reuse webtoon detail UI for novels — backend uses same /api/v1/webtoons/:id
  return <WebtoonDetailPage />;
}
