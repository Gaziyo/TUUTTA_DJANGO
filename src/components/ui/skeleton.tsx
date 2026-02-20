import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-200/70 dark:bg-gray-800/70 ${className}`}
    />
  );
}

interface AdminTableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function AdminTableSkeleton({ rows = 6, columns = 5 }: AdminTableSkeletonProps) {
  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton key={idx} className="h-24 w-full" />
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 bg-gray-100/70 dark:bg-gray-900/50">
          {Array.from({ length: columns }).map((_, idx) => (
            <Skeleton key={idx} className="h-4 w-full" />
          ))}
        </div>
        <div className="divide-y divide-gray-200/60 dark:divide-gray-800/60">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-5 gap-4 p-4">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <Skeleton key={colIdx} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
