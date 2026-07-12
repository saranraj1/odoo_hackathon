import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  isOverdue?: boolean;
  onClick?: () => void;
}

export default function KpiCard({
  label,
  value,
  icon: Icon,
  description,
  isOverdue = false,
  onClick,
}: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white border rounded-xl p-5 shadow-sm transition-all duration-200 select-none',
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : '',
        isOverdue ? 'border-l-4 border-l-amber-500 bg-amber-50/20' : 'border-slate-200'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="p-2.5 rounded-lg bg-primary-50 text-primary-500">
          <Icon className="w-5 h-5" />
        </div>
        {isOverdue && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Overdue Action
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-slate-900 leading-none tracking-tight mb-1.5">
        {value}
      </div>
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </div>
      {description && <div className="text-xs text-slate-500 mt-2">{description}</div>}
    </div>
  );
}
