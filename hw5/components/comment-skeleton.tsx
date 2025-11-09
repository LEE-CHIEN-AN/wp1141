'use client';

import { Skeleton } from './skeleton';

export function CommentSkeleton({ level = 0 }: { level?: number }) {
  return (
    <div className={`border-b border-[#2F3336] p-4 ${level > 0 ? 'ml-8 border-l-2 border-[#2F3336]' : ''}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton width={40} height={40} rounded="full" />

        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* User Info */}
          <div className="flex items-center gap-2">
            <Skeleton width={100} height={16} />
            <Skeleton width={80} height={14} />
            <Skeleton width={60} height={14} />
          </div>

          {/* Comment Content */}
          <div className="space-y-2">
            <Skeleton width="100%" height={16} />
            <Skeleton width="85%" height={16} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <Skeleton width={50} height={20} />
            <Skeleton width={50} height={20} />
            <Skeleton width={50} height={20} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommentSkeletonList({ count = 3, level = 0 }: { count?: number; level?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, index) => (
        <CommentSkeleton key={index} level={level} />
      ))}
    </div>
  );
}




