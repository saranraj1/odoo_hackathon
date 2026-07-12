import React from 'react';
import { AssetStatus } from '../../lib/types';
import clsx from 'clsx';

interface StatusBadgeProps {
  status: AssetStatus | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toUpperCase();

  const theme = clsx(
    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border',
    {
      'bg-emerald-50 text-emerald-800 border-emerald-300': normalized === 'AVAILABLE' || normalized === 'ACTIVE' || normalized === 'APPROVED' || normalized === 'RESOLVED' || normalized === 'VERIFIED',
      'bg-blue-50 text-blue-800 border-blue-300': normalized === 'ALLOCATED' || normalized === 'UPCOMING' || normalized === 'ONGOING' || normalized === 'TECHNICIAN_ASSIGNED',
      'bg-amber-50 text-amber-800 border-amber-300': normalized === 'RESERVED' || normalized === 'PENDING' || normalized === 'REQUESTED' || normalized === 'IN_PROGRESS',
      'bg-orange-50 text-orange-800 border-orange-300': normalized === 'UNDER_MAINTENANCE' || normalized === 'DAMAGED',
      'bg-red-50 text-red-800 border-red-300': normalized === 'LOST' || normalized === 'REJECTED' || normalized === 'MISSING',
      'bg-slate-150 text-slate-700 border-slate-300': normalized === 'RETIRED' || normalized === 'CLOSED',
      'bg-slate-100 text-slate-500 border-slate-200 line-through': normalized === 'DISPOSED' || normalized === 'CANCELLED' || normalized === 'INACTIVE',
    }
  );

  return (
    <span className={theme}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75" />
      {status.replace('_', ' ')}
    </span>
  );
}
