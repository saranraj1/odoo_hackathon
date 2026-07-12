import React from 'react';

export function SkeletonElement({ className }: { className?: string }) {
  return <div className={`shimmer bg-slate-200 rounded ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
      <div className="bg-slate-50 border-b border-slate-200 h-10 flex items-center px-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonElement key={i} className="h-4 flex-1 mx-2" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="h-12 flex items-center px-4">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonElement key={c} className="h-4 flex-1 mx-2" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <SkeletonElement className="w-10 h-10 rounded-lg" />
            <SkeletonElement className="w-16 h-5 rounded-full" />
          </div>
          <SkeletonElement className="h-6 w-3/4" />
          <SkeletonElement className="h-4 w-1/2" />
          <div className="pt-2 flex gap-2">
            <SkeletonElement className="h-8 flex-1 rounded-md" />
            <SkeletonElement className="h-8 w-12 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center space-x-6">
        <SkeletonElement className="w-24 h-24 rounded-lg" />
        <div className="flex-1 space-y-3">
          <SkeletonElement className="h-7 w-1/3" />
          <SkeletonElement className="h-4 w-1/6" />
          <SkeletonElement className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <SkeletonElement className="h-6 w-1/4" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonElement className="h-3 w-1/3" />
                <SkeletonElement className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <SkeletonElement className="h-6 w-1/2" />
          <SkeletonElement className="w-20 h-20 rounded-full mx-auto" />
          <SkeletonElement className="h-4 w-2/3 mx-auto" />
          <SkeletonElement className="h-4 w-1/2 mx-auto" />
        </div>
      </div>
    </div>
  );
}
