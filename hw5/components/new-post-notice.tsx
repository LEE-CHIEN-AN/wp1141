'use client';

import { ArrowUp } from 'lucide-react';
import Image from 'next/image';
import { useRef, useEffect } from 'react';

interface NewPostNoticeProps {
  authors: Array<{
    id: string;
    name: string | null;
    userId: string | null;
    image: string | null;
  }>;
  onClick: () => void;
}

export function NewPostNotice({ authors, onClick }: NewPostNoticeProps) {
  const noticeRef = useRef<HTMLButtonElement>(null);

  // 確保橫幅在視圖中可見
  useEffect(() => {
    if (noticeRef.current) {
      noticeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [authors]);

  if (authors.length === 0) {
    return null;
  }

  // 只顯示前三個作者
  const displayAuthors = authors.slice(0, 3);

  return (
    <button
      ref={noticeRef}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-full bg-[#1DA1F2] px-4 py-3 text-white transition-all hover:bg-[#1a8cd8] active:scale-95"
    >
      <ArrowUp className="h-5 w-5 flex-shrink-0" />
      <div className="flex -space-x-2">
        {displayAuthors.map((author, index) => (
          <div
            key={author.id}
            className="relative h-8 w-8 rounded-full border-2 border-[#1DA1F2] bg-[#2F3336]"
            style={{ zIndex: displayAuthors.length - index }}
          >
            {author.image ? (
              <Image
                src={author.image}
                alt={author.name || author.userId || 'User'}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2F3336] text-xs font-semibold text-white">
                {author.name?.[0]?.toUpperCase() || author.userId?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        ))}
      </div>
      <span className="ml-2 text-sm font-semibold">posted</span>
    </button>
  );
}

