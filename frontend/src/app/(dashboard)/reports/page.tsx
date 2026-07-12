"use client";

import React, { useState, useEffect } from 'react';
import { usePermissions } from '../../../lib/hooks/usePermissions';
import PermissionDenied from '../../../components/shared/PermissionDenied';
import { api } from '../../../lib/api/client';
import {
  LineChart,
  BarChart,
  FileSpreadsheet,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  ArrowRightLeft,
  Wrench,
} from 'lucide-react';

export default function ReportsPage() {
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState<'utilization' | 'maintenance' | 'retirement'>('utilization');
  const [loading, setLoading] = useState(true);

  // Report statistics
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const calculateStats = async () => {
      try {
        setLoading(true);
        const assets = await api.assets.getAssets({});
        const maintenance = await api.maintenance.getMaintenance({});
        const allocations = await api.allocations.getAllocations({});

        // 1. Utilization stats
        const total = assets.length;
        const allocated = assets.filter((a) => a.status === 'ALLOCATED').length;
        const available = assets.filter((a) => a.status === 'AVAILABLE').length;
        const inRepair = assets.filter((a) => a.status === 'UNDER_MAINTENANCE').length;
        const rate = total > 0 ? Math.round((allocated / total) * 100) : 0;

        // 2. Maintenance stats
        const totalRepairs = maintenance.length;
        const resolvedRepairs = maintenance.filter((m) => m.status === 'RESOLVED').length;
        const totalCost = maintenance.reduce((sum, m) => sum + (m.cost || 0), 0);

        // 3. Retirement Risk
        const highRisk = assets.filter((a) => {
          const ageMonths = (Date.now() - new Date(a.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
          return (a.condition === 'Damaged' || a.condition === 'Fair') && ageMonths > 12;
        });

        setStats({
          utilization: { total, allocated, available, inRepair, rate },
          maintenance: { totalRepairs, resolvedRepairs, totalCost },
          retirement: { highRisk },
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    calculateStats();
  }, []);

  if (!permissions.canViewAllReports && !permissions.isDepartmentHead) {
    return <PermissionDenied />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <span className="text-sm font-medium text-slate-500">Compiling statistics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Perform audits reconciliation, inspect hardware age, and check utilization rates.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('utilization')}
            className={`pb-3 text-sm font-semibold border-b-2 focus:outline-none transition-all ${
              activeTab === 'utilization'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Asset Utilization Rate
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`pb-3 text-sm font-semibold border-b-2 focus:outline-none transition-all ${
              activeTab === 'maintenance'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Maintenance Repair Logs
          </button>
          <button
            onClick={() => setActiveTab('retirement')}
            className={`pb-3 text-sm font-semibold border-b-2 focus:outline-none transition-all ${
              activeTab === 'retirement'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Retirement & Quality Risks
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        {/* Tab 1: Utilization */}
        {activeTab === 'utilization' && stats && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
              Allocation Utilization Rates
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">Utilization Rate</span>
                <p className="text-3xl font-extrabold text-primary-600 mt-2">{stats.utilization.rate}%</p>
              </div>
              <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">Allocated Inventory</span>
                <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats.utilization.allocated}</p>
              </div>
              <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">In-stock Available</span>
                <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats.utilization.available}</p>
              </div>
              <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">Under Maintenance</span>
                <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats.utilization.inRepair}</p>
              </div>
            </div>

            {/* Custom visual progress bar chart */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Visual Distribution Chart</h4>
              <div className="w-full h-8 bg-slate-100 rounded-lg overflow-hidden flex text-xs font-bold text-white text-center">
                <div
                  className="bg-blue-500 flex items-center justify-center transition-all"
                  style={{ width: `${(stats.utilization.allocated / stats.utilization.total) * 100}%` }}
                >
                  {stats.utilization.allocated > 0 && 'Allocated'}
                </div>
                <div
                  className="bg-emerald-500 flex items-center justify-center transition-all"
                  style={{ width: `${(stats.utilization.available / stats.utilization.total) * 100}%` }}
                >
                  {stats.utilization.available > 0 && 'Available'}
                </div>
                <div
                  className="bg-orange-500 flex items-center justify-center transition-all"
                  style={{ width: `${(stats.utilization.inRepair / stats.utilization.total) * 100}%` }}
                >
                  {stats.utilization.inRepair > 0 && 'Repair'}
                </div>
              </div>
              <div className="flex justify-center space-x-6 text-xs text-slate-500">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span>Allocated ({stats.utilization.allocated})</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <span>Available ({stats.utilization.available})</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 bg-orange-500 rounded-full" />
                  <span>Maintenance ({stats.utilization.inRepair})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Maintenance */}
        {activeTab === 'maintenance' && stats && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
              Maintenance Costs & Activity
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">Total Repair Tickets</span>
                <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats.maintenance.totalRepairs}</p>
              </div>
              <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">Resolved Tasks</span>
                <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats.maintenance.resolvedRepairs}</p>
              </div>
              <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">Cumulative Cost (USD)</span>
                <p className="text-3xl font-extrabold text-primary-650 mt-2">${stats.maintenance.totalCost.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Retirement Risk */}
        {activeTab === 'retirement' && stats && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
              Retirement & Quality Risks
            </h3>

            <div className="space-y-4">
              {stats.retirement.highRisk.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-4 text-center">
                  Quality check cleared. No high risk physical assets flagged.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                        <th className="p-3">Asset Tag</th>
                        <th className="p-3">Asset Name</th>
                        <th className="p-3">Current Condition</th>
                        <th className="p-3">Risk Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.retirement.highRisk.map((a: any) => (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-650">{a.assetTag}</td>
                          <td className="p-3 font-semibold text-slate-800">{a.name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-50 border border-orange-200 text-orange-700">
                              {a.condition}
                            </span>
                          </td>
                          <td className="p-3 text-red-650 font-semibold text-xs flex items-center space-x-1">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Retirement Risk: Aging Hardware with {a.condition} condition.</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
