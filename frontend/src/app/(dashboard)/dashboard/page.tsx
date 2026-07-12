"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { usePermissions } from '../../../lib/hooks/usePermissions';
import { api } from '../../../lib/api/client';
import KpiCard from '../../../components/shared/KpiCard';
import StatusBadge from '../../../components/shared/StatusBadge';
import {
  Package,
  Activity,
  Calendar,
  AlertTriangle,
  ArrowRightLeft,
  Wrench,
  ChevronRight,
  ClipboardList,
  PlusCircle,
  CalendarDays,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const snapshot = await api.dashboard.getSnapshot();
        setData(snapshot);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 shimmer bg-slate-200 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 shimmer bg-white border border-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 shimmer bg-white border border-slate-200 rounded-xl" />
          <div className="h-96 shimmer bg-white border border-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Dashboard</h1>
          <p className="text-sm text-slate-450 mt-1">
            Hello, <span className="font-semibold text-slate-700">{user?.name}</span>. Here is your operational overview.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full border border-primary-200 w-fit">
          Role: {user?.role.replace('_', ' ')}
        </div>
      </div>

      {/* KPI grid row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {!permissions.isEmployee && (
          <KpiCard
            label="Assets Available"
            value={data.kpis.assetsAvailable}
            icon={Package}
            onClick={() => router.push('/assets?status=AVAILABLE')}
          />
        )}
        <KpiCard
          label={permissions.isEmployee ? 'My Active Assets' : 'Assets Allocated'}
          value={data.kpis.assetsAllocated}
          icon={ArrowRightLeft}
          onClick={() => router.push(permissions.isEmployee ? '/assets' : '/assets?status=ALLOCATED')}
        />
        <KpiCard
          label={permissions.isEmployee ? 'My Repairs Pending' : 'Maintenance Today'}
          value={data.kpis.maintenanceToday}
          icon={Wrench}
          onClick={() => router.push('/maintenance')}
        />
        <KpiCard
          label={permissions.isEmployee ? 'My Active Bookings' : 'Active Bookings'}
          value={data.kpis.activeBookings}
          icon={Calendar}
          onClick={() => router.push('/bookings')}
        />
        <KpiCard
          label="Pending Transfers"
          value={data.kpis.pendingTransfers}
          icon={ArrowRightLeft}
          onClick={() => router.push('/allocations')}
        />
        <KpiCard
          label={permissions.isEmployee ? 'My Overdue Returns' : 'Upcoming Returns'}
          value={data.kpis.upcomingReturns}
          icon={AlertTriangle}
          isOverdue={data.kpis.upcomingReturns > 0}
          onClick={() => router.push('/allocations')}
        />
      </div>

      {/* Primary content layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left wider block */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue returns warnings */}
          {data.overdueReturns.length > 0 && (
            <div className="bg-amber-50/50 border border-amber-250 rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-2.5 mb-4 text-amber-800">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold">Overdue Return Alerts</h3>
              </div>
              <div className="divide-y divide-amber-100 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {data.overdueReturns.map((item: any) => (
                  <div
                    key={item.allocationId}
                    onClick={() => router.push(`/assets/${item.assetId}`)}
                    className="py-3 flex items-center justify-between text-sm cursor-pointer hover:bg-amber-50 rounded px-2 transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{item.assetName}</span>{' '}
                      <span className="text-slate-400 font-mono">({item.assetTag})</span>
                      <div className="text-xs text-slate-500 mt-1">Held by: {item.employeeName}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-red-650">
                        Due: {new Date(item.expectedReturnAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity Logs */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-800">
                <Activity className="w-5 h-5" />
                <h3 className="text-base font-bold">Recent Activity Timeline</h3>
              </div>
              <Link
                href="/activity"
                className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center"
              >
                View all logs <ChevronRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>
            <div className="space-y-4">
              {data.recentActivity.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  No system logs recorded yet.
                </p>
              ) : (
                data.recentActivity.map((log: any) => (
                  <div key={log.id} className="flex items-start text-sm space-x-3">
                    <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0 animate-pulse" />
                    <div className="flex-1">
                      <p className="text-slate-700 leading-normal">
                        <strong className="text-slate-900">{log.actor?.name || 'System'}</strong> performed action{' '}
                        <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono">
                          {log.action}
                        </span>{' '}
                        on model <strong className="text-slate-800">{log.entityType}</strong>.
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right narrower sidebar */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">
              Quick Operations
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {permissions.canRegisterAsset && (
                <button
                  onClick={() => router.push('/assets/new')}
                  className="flex items-center justify-between p-3.5 border border-slate-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/10 text-left text-sm font-semibold transition-all group"
                >
                  <span className="flex items-center space-x-2.5">
                    <PlusCircle className="w-5 h-5 text-primary-500" />
                    <span>Register New Asset</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors" />
                </button>
              )}
              <button
                onClick={() => router.push('/bookings')}
                className="flex items-center justify-between p-3.5 border border-slate-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/10 text-left text-sm font-semibold transition-all group"
              >
                <span className="flex items-center space-x-2.5">
                  <CalendarDays className="w-5 h-5 text-primary-500" />
                  <span>Book Shared Resource</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors" />
              </button>
              <button
                onClick={() => router.push('/maintenance')}
                className="flex items-center justify-between p-3.5 border border-slate-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/10 text-left text-sm font-semibold transition-all group"
              >
                <span className="flex items-center space-x-2.5">
                  <Wrench className="w-5 h-5 text-primary-500" />
                  <span>Raise Repair Request</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors" />
              </button>
              {permissions.canViewAllReports && (
                <button
                  onClick={() => router.push('/reports')}
                  className="flex items-center justify-between p-3.5 border border-slate-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/10 text-left text-sm font-semibold transition-all group"
                >
                  <span className="flex items-center space-x-2.5">
                    <FileSpreadsheet className="w-5 h-5 text-primary-500" />
                    <span>Run Analytics Reports</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors" />
                </button>
              )}
            </div>
          </div>

          {/* Pending Approvals Feed */}
          {!permissions.isEmployee && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-2 text-slate-800 mb-4 border-b border-slate-100 pb-3">
                <ClipboardList className="w-5 h-5" />
                <h3 className="text-base font-bold">Pending Approvals Queue</h3>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {data.pendingApprovals.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    Clear queue. No pending actions.
                  </p>
                ) : (
                  data.pendingApprovals.map((app: any) => (
                    <div
                      key={app.id}
                      onClick={() =>
                        router.push(app.type === 'transfer' ? '/allocations' : '/maintenance')
                      }
                      className="p-3 border border-slate-100 hover:border-primary-250 rounded-lg cursor-pointer bg-slate-50/50 hover:bg-white transition-all text-xs"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-700 capitalize">{app.type} Request</span>
                        <StatusBadge status="PENDING" />
                      </div>
                      <p className="text-slate-500 truncate">{app.title}</p>
                      <span className="text-[10px] text-slate-450 block mt-1.5">
                        Received {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
