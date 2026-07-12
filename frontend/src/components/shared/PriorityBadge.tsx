import React from 'react';
import { Priority } from '../../lib/types';
import clsx from 'clsx';

interface PriorityBadgeProps {
  priority: Priority;
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const normalized = priority.toUpperCase();

  const theme = clsx(
    'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border-l-4',
    {
      'bg-slate-50 text-slate-700 border-l-slate-400 border-y border-r border-slate-200': normalized === 'LOW',
      'bg-blue-50 text-blue-800 border-l-blue-500 border-y border-r border-blue-200': normalized === 'MEDIUM',
      'bg-orange-50 text-orange-800 border-l-orange-500 border-y border-r border-orange-200': normalized === 'HIGH',
      'bg-red-50 text-red-800 border-l-red-500 border-y border-r border-red-200': normalized === 'CRITICAL' || normalized === 'URGENT',
    }
  );

  return <span className={theme}>{priority}</span>;
}
