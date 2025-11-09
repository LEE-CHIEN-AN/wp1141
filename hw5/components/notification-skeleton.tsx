'use client';

import { Skeleton } from './skeleton';

export function NotificationSkeleton() {
  return (
    <div className="flex gap-3 border-b border-[#2F3336] p-4">
      {/* Avatar */}
      <Skeleton width={48} height={48} rounded="full" />

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton width={20} height={20} rounded="full" />
          <Skeleton width={200} height={16} />
        </div>
        <Skeleton width={100} height={12} />
        <Skeleton width="100%" height={60} rounded="lg" />
      </div>

      {/* Arrow */}
      <Skeleton width={20} height={20} rounded="full" />
    </div>
  );
}

export function NotificationSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, index) => (
        <NotificationSkeleton key={index} />
      ))}
    </div>
  );
}




