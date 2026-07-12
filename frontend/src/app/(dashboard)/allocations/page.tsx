"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { usePermissions } from '../../../lib/hooks/usePermissions';
import { api } from '../../../lib/api/client';
import { Allocation, TransferRequest, Asset, User, Department } from '../../../lib/types';
import StatusBadge from '../../../components/shared/StatusBadge';
import EmptyState from '../../../components/shared/EmptyState';
import DecisionDialog from '../../../components/shared/DecisionDialog';
import {
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  User as UserIcon,
  Building,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

export default function AllocationsPage() {
  const { user } = useAuth();
  const permissions = usePermissions();

  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Decision Modal
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRequest | null>(null);

  const loadAllocationsData = async () => {
    try {
      setLoading(true);
      const allAllocations = await api.allocations.getAllocations({});
      const allTransfers = await api.allocations.getTransfers({});
      const allAssets = await api.assets.getAssets({});
      const depts = await api.organization.getDepartments();
      const emps = await api.organization.getEmployees({});

      setAssets(allAssets);
      setUsers(emps);
      setDepartments(depts);

      // Scoping logic
      let scopedAllocations = allAllocations;
      let scopedTransfers = allTransfers;

      if (permissions.isEmployee) {
        scopedAllocations = allAllocations.filter((a) => a.employeeId === user?.id);
        scopedTransfers = allTransfers.filter(
          (t) => t.requestedById === user?.id || t.toEmployeeId === user?.id
        );
      } else if (permissions.isDepartmentHead && user?.departmentId) {
        scopedAllocations = allAllocations.filter((a) => a.departmentId === user.departmentId);
        scopedTransfers = allTransfers.filter(
          (t) => t.toDepartmentId === user.departmentId || t.toEmployeeId && emps.find(e => e.id === t.toEmployeeId)?.departmentId === user.departmentId
        );
      }

      setAllocations(scopedAllocations);
      setTransfers(scopedTransfers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllocationsData();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Transfer Approval/Rejection decision
  const handleDecisionSubmit = async (decision: 'APPROVED' | 'REJECTED', note: string) => {
    if (!selectedTransfer) return;

    try {
      await api.allocations.updateTransfer(selectedTransfer.id, {
        status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        decisionNote: note || null,
      });

      loadAllocationsData();
    } catch (err: any) {
      alert(err.message || 'Operation failed.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <span className="text-sm font-medium text-slate-500">Loading allocations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Allocations & Transfers</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor active asset holders and handle organizational transfer requests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left allocations list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">
              Active Allocations
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                    <th className="p-3">Asset</th>
                    <th className="p-3">Holder</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.filter((a) => a.status === 'ACTIVE').length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                        No active asset allocations.
                      </td>
                    </tr>
                  ) : (
                    allocations
                      .filter((a) => a.status === 'ACTIVE')
                      .map((a) => {
                        const assetObj = assets.find((as) => as.id === a.assetId);
                        const holderName =
                          users.find((u) => u.id === a.employeeId)?.name ||
                          departments.find((d) => d.id === a.departmentId)?.name ||
                          'Unknown Holder';
                        const isOverdue = a.expectedReturnAt && new Date(a.expectedReturnAt) < new Date();

                        return (
                          <tr key={a.id} className="hover:bg-slate-55 transition-colors">
                            <td className="p-3">
                              <span className="font-semibold text-slate-800">{assetObj?.name}</span>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {assetObj?.assetTag}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-medium text-slate-700">{holderName}</span>
                            </td>
                            <td className="p-3">
                              {a.expectedReturnAt ? (
                                <span
                                  className={clsx(
                                    'text-xs font-bold flex items-center space-x-1',
                                    isOverdue ? 'text-red-650' : 'text-slate-500'
                                  )}
                                >
                                  {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                                  <span>{new Date(a.expectedReturnAt).toLocaleDateString()}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400">Continuous</span>
                              )}
                            </td>
                            <td className="p-3">
                              <StatusBadge status="ACTIVE" />
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

        {/* Right transfer requests queue */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">
              Transfer Requests Queue
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {transfers.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-6">
                  Clear queue. No transfer requests.
                </p>
              ) : (
                transfers.map((t) => {
                  const assetObj = assets.find((as) => as.id === t.assetId);
                  const requester = users.find((u) => u.id === t.requestedById);
                  const recipient =
                    users.find((u) => u.id === t.toEmployeeId)?.name ||
                    departments.find((d) => d.id === t.toDepartmentId)?.name ||
                    'Recipient';

                  return (
                    <div
                      key={t.id}
                      className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/50 hover:bg-white transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-slate-700">{assetObj?.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {assetObj?.assetTag}
                          </span>
                        </div>
                        <StatusBadge status={t.status} />
                      </div>

                      <div className="text-xs space-y-1 bg-white p-2.5 rounded border border-slate-100 shadow-xs">
                        <div className="flex items-center text-slate-550 justify-between">
                          <span>Requested By:</span>
                          <span className="font-semibold text-slate-800">{requester?.name}</span>
                        </div>
                        <div className="flex items-center text-slate-550 justify-between">
                          <span>Recipient:</span>
                          <span className="font-semibold text-slate-800">{recipient}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed italic bg-slate-50 p-2 rounded">
                        &quot;{t.reason}&quot;
                      </p>

                      <div className="text-[10px] text-slate-400">
                        Submitted {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                      </div>

                      {t.status === 'REQUESTED' && permissions.canApproveTransfers && (
                        <div className="flex space-x-2 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setSelectedTransfer(t);
                              setDecisionOpen(true);
                            }}
                            className="btn-primary py-1 px-3 text-xs flex-1 flex items-center justify-center space-x-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Action decision</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Dialog */}
      <DecisionDialog
        isOpen={decisionOpen}
        title="Approve / Reject Asset Transfer"
        message="Please review this request. Rejections require a decision note justification."
        onDecision={handleDecisionSubmit}
        onClose={() => {
          setDecisionOpen(false);
          setSelectedTransfer(null);
        }}
      />
    </div>
  );
}
