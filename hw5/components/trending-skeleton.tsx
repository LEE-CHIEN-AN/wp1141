'use client';

import { Skeleton } from './skeleton';

export function TrendingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-start justify-between rounded-lg p-2">
          <div className="flex-1 space-y-2">
            <Skeleton width={120} height={16} />
            <Skeleton width={80} height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}




