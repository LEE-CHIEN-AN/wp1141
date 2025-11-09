'use client';

import { Skeleton } from './skeleton';

export function UserSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton width={40} height={40} rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton width={100} height={16} />
        <Skeleton width={80} height={14} />
      </div>
      <Skeleton width={80} height={32} rounded="full" />
    </div>
  );
}

export function UserSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <UserSkeleton key={index} />
      ))}
    </div>
  );
}




