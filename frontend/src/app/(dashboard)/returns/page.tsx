"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { usePermissions } from '../../../lib/hooks/usePermissions';
import { api } from '../../../lib/api/client';
import { Allocation, Asset, User, Department } from '../../../lib/types';
import StatusBadge from '../../../components/shared/StatusBadge';
import EmptyState from '../../../components/shared/EmptyState';
import { ArrowLeftRight, CheckCircle2, History, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ReturnsPage() {
  const { user } = useAuth();
  const permissions = usePermissions();

  const [returnsHistory, setReturnsHistory] = useState<Allocation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReturns = async () => {
      try {
        setLoading(true);
        const allocations = await api.allocations.getAllocations({});
        const allAssets = await api.assets.getAssets({});
        const emps = await api.organization.getEmployees({});
        const depts = await api.organization.getDepartments();

        setAssets(allAssets);
        setUsers(emps);
        setDepartments(depts);

        // Filters allocations with status RETURNED
        const closed = allocations.filter((a) => a.status === 'RETURNED');
        setReturnsHistory(closed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadReturns();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <span className="text-sm font-medium text-slate-500">Loading returns...</span>
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
          <h1 className="text-2xl font-bold text-slate-900">Returns History</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse check-in notes, condition parameters, and historical asset return logs.
          </p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <th className="p-3">Asset</th>
                <th className="p-3">Former Holder</th>
                <th className="p-3">Check-in Date</th>
                <th className="p-3">Return Condition</th>
                <th className="p-3">Return Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returnsHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                    No returned assets logged yet.
                  </td>
                </tr>
              ) : (
                returnsHistory.map((a) => {
                  const assetObj = assets.find((as) => as.id === a.assetId);
                  const holder = users.find((u) => u.id === a.employeeId) || departments.find((d) => d.id === a.departmentId);

                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <span className="font-semibold text-slate-800">{assetObj?.name}</span>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {assetObj?.assetTag}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-slate-700">{holder?.name || 'Unknown holder'}</span>
                      </td>
                      <td className="p-3 text-slate-550">
                        {a.returnedAt ? new Date(a.returnedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-3 text-slate-700">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 border border-slate-200">
                          {a.returnCondition || 'Good'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate" title={a.checkInNotes || ''}>
                        {a.checkInNotes || <span className="italic text-slate-400">None</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
