import React from 'react';
import { formatDistanceToNow } from 'date-fns';

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  actorName?: string;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'slate';
}

interface TimelineProps {
  events: TimelineEvent[];
}

export default function Timeline({ events }: TimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-sm text-slate-400 italic py-4 text-center">
        No history events recorded.
      </div>
    );
  }

  return (
    <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 py-2">
      {events.map((event, index) => {
        let dotColor = 'bg-slate-400';
        if (event.color === 'green') dotColor = 'bg-emerald-550 ring-4 ring-emerald-50';
        else if (event.color === 'blue') dotColor = 'bg-blue-550 ring-4 ring-blue-50';
        else if (event.color === 'amber') dotColor = 'bg-amber-550 ring-4 ring-amber-50';
        else if (event.color === 'red') dotColor = 'bg-red-550 ring-4 ring-red-50';

        return (
          <div key={event.id} className="relative group">
            {/* Dot marker */}
            <span
              className={`absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full flex items-center justify-center ${dotColor}`}
            />

            {/* Event entry card */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="text-sm font-semibold text-slate-800 leading-tight">
                  {event.title}
                </span>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{event.description}</p>
              {event.actorName && (
                <div className="flex items-center space-x-1 mt-1 text-[11px] text-slate-400 font-medium">
                  <span>Logged by:</span>
                  <span className="text-slate-600">{event.actorName}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
