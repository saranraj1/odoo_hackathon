"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../providers/AuthProvider';
import { usePermissions } from '../../../../lib/hooks/usePermissions';
import { api } from '../../../../lib/api/client';
import { AuditCycle, AuditItem, Asset, User } from '../../../../lib/types';
import StatusBadge from '../../../../components/shared/StatusBadge';
import ConfirmDialog from '../../../../components/shared/ConfirmDialog';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  UserPlus,
  Loader2,
  Bookmark,
  Check,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

export default function AuditDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const permissions = usePermissions();

  const [cycle, setCycle] = useState<AuditCycle | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal triggers
  const [assignOpen, setAssignOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  // Form states - Assignment
  const [selectedAuditorIds, setSelectedAuditorIds] = useState<string[]>([]);
  const [assignScope, setAssignScope] = useState('');

  // Active view tabs: checklist vs discrepancy report
  const [viewTab, setViewTab] = useState<'checklist' | 'discrepancies'>('checklist');

  const loadCycleDetails = async () => {
    try {
      setLoading(true);
      const resData = await api.audits.getCycleById(params.id);
      setCycle(resData);
      setItems(resData.items || []);

      const allAssets = await api.assets.getAssets({});
      const emps = await api.organization.getEmployees({});

      setAssets(allAssets);
      setEmployees(emps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCycleDetails();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <span className="text-sm font-medium text-slate-500">Loading cycle details...</span>
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="text-center p-12">
        <h2 className="text-xl font-bold">Audit Cycle Not Found</h2>
        <Link href="/audits" className="btn-primary mt-4 inline-block">
          Return to List
        </Link>
      </div>
    );
  }

  // Activate cycle (DRAFT -> ACTIVE)
  const handleActivate = async () => {
    try {
      await api.audits.activateCycle(cycle.id);
      loadCycleDetails();
    } catch (err: any) {
      alert(err.message || 'Activation failed.');
    }
  };

  // Assign Auditors
  const handleAssignAuditors = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAuditorIds.length === 0) return;

    try {
      await api.audits.assignAuditors(cycle.id, { auditorIds: selectedAuditorIds, assignedScope: assignScope });
      setAssignOpen(false);
      setSelectedAuditorIds([]);
      loadCycleDetails();
    } catch (err: any) {
      alert(err.message || 'Assignment failed.');
    }
  };

  // Close cycle (ACTIVE -> CLOSED)
  const handleCloseCycle = async () => {
    try {
      await api.audits.closeCycle(cycle.id);
      setCloseConfirmOpen(false);
      loadCycleDetails();
    } catch (err: any) {
      alert(err.message || 'Closure failed.');
    }
  };

  // Auditor action: Verify item
  const handleVerifyItem = async (itemId: string, result: 'VERIFIED' | 'MISSING' | 'DAMAGED') => {
    try {
      await api.audits.submitItemVerification(cycle.id, itemId, { result });
      loadCycleDetails();
    } catch (err: any) {
      alert(err.message || 'Verification failed.');
    }
  };

  // Asset Manager: Resolve discrepancy
  const handleResolveDiscrepancy = async (itemId: string) => {
    try {
      await api.audits.submitItemVerification(cycle.id, itemId, { resolutionStatus: 'RESOLVED' });
      loadCycleDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve.');
    }
  };

  // Scoped lists
  const discrepancies = items.filter((item) => item.result === 'MISSING' || item.result === 'DAMAGED');
  const progressPercent = items.length
    ? Math.round((items.filter((i) => i.result !== 'PENDING').length / items.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/audits"
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-55 bg-white text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400">Governance Audit Details</span>
              <StatusBadge status={cycle.status} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">{cycle.name}</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2">
          {permissions.isAdmin && cycle.status === 'DRAFT' && (
            <button
              onClick={handleActivate}
              className="btn-primary py-2 px-4 flex items-center space-x-1.5 text-sm"
            >
              <Play className="w-4 h-4" />
              <span>Activate Cycle</span>
            </button>
          )}

          {permissions.isAdmin && cycle.status === 'ACTIVE' && (
            <>
              <button
                onClick={() => setAssignOpen(true)}
                className="btn-secondary py-2 px-4 flex items-center space-x-1.5 text-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Assign Auditors</span>
              </button>
              <button
                onClick={() => setCloseConfirmOpen(true)}
                className="btn-primary py-2 px-4 flex items-center space-x-1.5 text-sm bg-red-650 hover:bg-red-750"
              >
                <span>Close Cycle</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {cycle.status !== 'DRAFT' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
            <span>Audit checklist completion</span>
            <span>{progressPercent}% ({items.filter((i) => i.result !== 'PENDING').length} of {items.length} items)</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-primary-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      {cycle.status !== 'DRAFT' && (
        <div className="border-b border-slate-200">
          <div className="flex space-x-6">
            <button
              onClick={() => setViewTab('checklist')}
              className={clsx(
                'pb-3 text-sm font-semibold border-b-2 focus:outline-none',
                viewTab === 'checklist'
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              Audit Checklist
            </button>
            <button
              onClick={() => setViewTab('discrepancies')}
              className={clsx(
                'pb-3 text-sm font-semibold border-b-2 flex items-center space-x-1.5 focus:outline-none',
                viewTab === 'discrepancies'
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <span>Discrepancy Report</span>
              {discrepancies.filter((d) => d.resolutionStatus === 'UNRESOLVED').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Grid content panels */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        {cycle.status === 'DRAFT' ? (
          <div className="text-center py-12">
            <Bookmark className="w-12 h-12 mx-auto text-slate-350 mb-3" />
            <h3 className="text-lg font-bold text-slate-800">Draft Audit Cycle</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
              This audit cycle is currently a draft. Click Activate Cycle above to snapshot assets and launch auditor checks.
            </p>
          </div>
        ) : viewTab === 'checklist' ? (
          /* Tab: Checklist */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <th className="p-3">Asset</th>
                  <th className="p-3">Assigned Auditor</th>
                  <th className="p-3">Audit Result</th>
                  {cycle.status === 'ACTIVE' && <th className="p-3 text-right">Perform verification</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const assetObj = assets.find((a) => a.id === item.assetId);
                  const auditorObj = employees.find((e) => e.id === item.auditorId);
                  const isAssignedAuditor = item.auditorId === user?.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <span className="font-semibold text-slate-800">{assetObj?.name}</span>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {assetObj?.assetTag} | Loc: {assetObj?.location}
                        </div>
                      </td>
                      <td className="p-3 text-slate-650">
                        {auditorObj ? (
                          <span className="font-semibold">{auditorObj.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={item.result} />
                      </td>
                      {cycle.status === 'ACTIVE' && (
                        <td className="p-3 text-right">
                          {isAssignedAuditor && item.result === 'PENDING' ? (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleVerifyItem(item.id, 'VERIFIED')}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-355 text-emerald-700 text-xs font-bold rounded"
                              >
                                Verified
                              </button>
                              <button
                                onClick={() => handleVerifyItem(item.id, 'MISSING')}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-355 text-red-700 text-xs font-bold rounded"
                              >
                                Missing
                              </button>
                              <button
                                onClick={() => handleVerifyItem(item.id, 'DAMAGED')}
                                className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-355 text-orange-700 text-xs font-bold rounded"
                              >
                                Damaged
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              {!isAssignedAuditor ? 'Not Assigned Auditor' : 'Completed'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tab: Discrepancy Report */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <th className="p-3">Asset</th>
                  <th className="p-3">Discrepancy Issue</th>
                  <th className="p-3">Resolution status</th>
                  {cycle.status === 'ACTIVE' && permissions.canResolveDiscrepancies && (
                    <th className="p-3 text-right">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discrepancies.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                      Clear report. No asset discrepancies logged.
                    </td>
                  </tr>
                ) : (
                  discrepancies.map((item) => {
                    const assetObj = assets.find((a) => a.id === item.assetId);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <span className="font-semibold text-slate-800">{assetObj?.name}</span>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {assetObj?.assetTag}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded text-xs font-bold',
                              item.result === 'MISSING' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                            )}
                          >
                            {item.result}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={clsx(
                              'text-xs font-semibold',
                              item.resolutionStatus === 'RESOLVED' ? 'text-emerald-600' : 'text-amber-600'
                            )}
                          >
                            {item.resolutionStatus}
                          </span>
                        </td>
                        {cycle.status === 'ACTIVE' && permissions.canResolveDiscrepancies && (
                          <td className="p-3 text-right">
                            {item.resolutionStatus === 'UNRESOLVED' ? (
                              <button
                                onClick={() => handleResolveDiscrepancy(item.id)}
                                className="px-2.5 py-1 bg-primary-50 hover:bg-primary-100 border border-primary-300 text-primary-650 text-xs font-bold rounded"
                              >
                                Mark Resolved
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Resolved</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer: Assign Auditors */}
      {assignOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div onClick={() => setAssignOpen(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-slide-in">
            <div className="p-6 overflow-y-auto space-y-6">
              <h3 className="text-lg font-bold border-b border-slate-100 pb-3">Assign Cycle Auditors</h3>

              <form onSubmit={handleAssignAuditors} id="assign-form" className="space-y-4">
                <div className="space-y-1.5">
                  <label className="form-label">Select Auditors * (select multiple)</label>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2 custom-scrollbar">
                    {employees.map((e) => (
                      <label key={e.id} className="flex items-center space-x-2.5 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAuditorIds.includes(e.id)}
                          onChange={(checkbox) => {
                            if (checkbox.target.checked) {
                              setSelectedAuditorIds([...selectedAuditorIds, e.id]);
                            } else {
                              setSelectedAuditorIds(selectedAuditorIds.filter((id) => id !== e.id));
                            }
                          }}
                          className="w-4.5 h-4.5 text-primary-500 rounded focus:ring-primary-300"
                        />
                        <span>{e.name} ({e.email})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="form-label">Assignment scope description</label>
                  <input
                    type="text"
                    value={assignScope}
                    onChange={(e) => setAssignScope(e.target.value)}
                    placeholder="e.g. Verify laptops in Floor 3"
                    className="form-input"
                  />
                </div>
              </form>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button onClick={() => setAssignOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" form="assign-form" className="btn-primary">
                Assign & Distribute items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog: Close cycle */}
      <ConfirmDialog
        isOpen={closeConfirmOpen}
        title="Confirm permanent closing of Audit Cycle"
        message="Closing this audit cycle is permanent. Any unresolved Missing items will automatically transition the status of their associated assets to LOST. This cannot be undone."
        confirmLabel="Permanent Close"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleCloseCycle}
        onCancel={() => setCloseConfirmOpen(false)}
      />
    </div>
  );
}
