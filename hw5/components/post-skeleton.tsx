'use client';

import { Skeleton } from './skeleton';

export function PostSkeleton() {
  return (
    <div className="border-b border-[#2F3336] p-4">
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

          {/* Post Content */}
          <div className="space-y-2">
            <Skeleton width="100%" height={16} />
            <Skeleton width="90%" height={16} />
            <Skeleton width="70%" height={16} />
          </div>

          {/* Media Placeholder (optional) */}
          <Skeleton width="100%" height={200} rounded="lg" />

          {/* Actions */}
          <div className="flex items-center gap-6">
            <Skeleton width={60} height={20} />
            <Skeleton width={60} height={20} />
            <Skeleton width={60} height={20} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, index) => (
        <PostSkeleton key={index} />
      ))}
    </div>
  );
}




