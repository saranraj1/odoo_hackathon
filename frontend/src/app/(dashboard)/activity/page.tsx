"use client";

import React, { useState, useEffect } from 'react';
import { usePermissions } from '../../../lib/hooks/usePermissions';
import PermissionDenied from '../../../components/shared/PermissionDenied';
import { api } from '../../../lib/api/client';
import { ActivityLog } from '../../../lib/types';
import EmptyState from '../../../components/shared/EmptyState';
import { Activity, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ActivityLogsPage() {
  const permissions = usePermissions();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const allLogs = await api.reports.getActivityLogs({});
        setLogs(allLogs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (permissions.canViewAllActivityLogs) {
      loadLogs();
    }
  }, [permissions]);

  if (!permissions.canViewAllActivityLogs) {
    return <PermissionDenied />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <span className="text-sm font-medium text-slate-500">Loading audit trail...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link
          href="/dashboard"
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-55 bg-white text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse append-only ledger tracking all organizational allocations, promotions, and status flips.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action code</th>
                <th className="p-3">Impacted Model</th>
                <th className="p-3">Entity reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                    No activity logs recorded.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-500 text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-slate-700">
                      {log.actor?.name || 'System'}
                    </td>
                    <td className="p-3 font-mono text-[11px] font-bold text-primary-650 bg-primary-50/20 px-2 py-0.5 rounded w-fit">
                      {log.action}
                    </td>
                    <td className="p-3 font-medium text-slate-800">{log.entityType}</td>
                    <td className="p-3 font-mono text-xs text-slate-400">{log.entityId}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
