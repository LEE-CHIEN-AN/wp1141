'use client';

import { Skeleton } from './skeleton';
import { PostSkeletonList } from './post-skeleton';

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-[#2F3336] bg-black px-4 py-3">
        <Skeleton width={24} height={24} rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton width={150} height={20} />
          <Skeleton width={100} height={14} />
        </div>
      </div>

      {/* Banner */}
      <div className="relative h-48 w-full bg-[#2F3336]">
        <Skeleton width="100%" height="100%" rounded="none" />
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4">
        <div className="relative -mt-16 mb-4">
          {/* Avatar */}
          <Skeleton width={128} height={128} rounded="full" className="border-4 border-black" />
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Skeleton width={200} height={24} />
            <Skeleton width={120} height={16} />
          </div>

          <div className="space-y-2">
            <Skeleton width="100%" height={16} />
            <Skeleton width="90%" height={16} />
          </div>

          <div className="flex items-center gap-4">
            <Skeleton width={80} height={16} />
            <Skeleton width={80} height={16} />
            <Skeleton width={80} height={16} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#2F3336]">
        <div className="flex">
          <Skeleton width="50%" height={48} rounded="none" />
          <Skeleton width="50%" height={48} rounded="none" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <PostSkeletonList count={3} />
      </div>
    </div>
  );
}




