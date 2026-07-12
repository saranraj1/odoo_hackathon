"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { usePermissions } from '../../../lib/hooks/usePermissions';
import { api } from '../../../lib/api/client';
import { MaintenanceRequest, Asset, User } from '../../../lib/types';
import StatusBadge from '../../../components/shared/StatusBadge';
import PriorityBadge from '../../../components/shared/PriorityBadge';
import EmptyState from '../../../components/shared/EmptyState';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import {
  Wrench,
  Plus,
  Play,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

export default function MaintenancePage() {
  const { user } = useAuth();
  const permissions = usePermissions();

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Kanban view vs list tabs
  const [activeTab, setActiveTab] = useState<'my-requests' | 'assigned'>('my-requests');

  // Drawer detail actions
  const [selectedReq, setSelectedReq] = useState<MaintenanceRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignTechId, setAssignTechId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Resolve form dialog
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resNotes, setResNotes] = useState('');
  const [resCost, setResCost] = useState('');
  const [resCondition, setResCondition] = useState('Good');
  const [resError, setResError] = useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const maint = await api.maintenance.getMaintenance({});
      const allAssets = await api.assets.getAssets({});
      const emps = await api.organization.getEmployees({});

      setAssets(allAssets);
      setEmployees(emps);

      // Filter based on roles
      let scoped = maint;
      if (permissions.isEmployee) {
        scoped = maint.filter((m) => m.reporterId === user?.id || m.technicianId === user?.id);
      } else if (permissions.isDepartmentHead && user?.departmentId) {
        scoped = maint.filter((m) => {
          const assetObj = allAssets.find((as) => as.id === m.assetId);
          return assetObj?.owningDepartmentId === user.departmentId;
        });
      }

      setRequests(scoped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deciding: Approve ticket
  const handleApprove = async (id: string) => {
    try {
      await api.maintenance.updateRequest(id, { status: 'APPROVED' });
      const reqObj = requests.find((r) => r.id === id);
      if (reqObj) {
        await api.assets.updateAsset(reqObj.assetId, { status: 'UNDER_MAINTENANCE' });
      }
      setDetailOpen(false);
      loadRequests();
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    }
  };

  // Deciding: Reject ticket
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRejectError('');
    if (!rejectReason.trim()) {
      setRejectError('Please state rejection reason notes.');
      return;
    }
    if (!selectedReq) return;

    try {
      await api.maintenance.updateRequest(selectedReq.id, {
        status: 'REJECTED',
        approvalNote: rejectReason,
      });
      setDetailOpen(false);
      setShowRejectForm(false);
      setRejectReason('');
      loadRequests();
    } catch (err: any) {
      setRejectError(err.message || 'Operation failed.');
    }
  };

  // Deciding: Assign Technician
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !assignTechId) return;

    try {
      await api.maintenance.updateRequest(selectedReq.id, {
        status: 'TECHNICIAN_ASSIGNED',
        technicianId: assignTechId,
      });
      setDetailOpen(false);
      loadRequests();
    } catch (err: any) {
      alert(err.message || 'Assignment failed.');
    }
  };

  // Technician: Start work order
  const handleStartWork = async (id: string) => {
    try {
      await api.maintenance.updateRequest(id, { status: 'IN_PROGRESS' });
      loadRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to start.');
    }
  };

  // Technician: Submit Resolve form
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResError('');
    if (resNotes.length < 10) {
      setResError('Resolution notes must be at least 10 characters.');
      return;
    }
    if (!selectedReq) return;

    try {
      await api.maintenance.updateRequest(selectedReq.id, {
        status: 'RESOLVED',
        resolution: resNotes,
        cost: parseFloat(resCost) || 0,
        resolvedAt: new Date().toISOString(),
      });

      const allocations = await api.allocations.getAllocations({});
      const activeAlloc = allocations.find((a) => a.assetId === selectedReq.assetId && a.status === 'ACTIVE');
      await api.assets.updateAsset(selectedReq.assetId, {
        status: activeAlloc ? 'ALLOCATED' : 'AVAILABLE',
        condition: resCondition,
      });

      setResolveOpen(false);
      setSelectedReq(null);
      setResNotes('');
      setResCost('');
      loadRequests();
    } catch (err: any) {
      setResError(err.message || 'Operation failed.');
    }
  };

  // Scoped lists for list/tab view
  const myRequests = requests.filter((r) => r.reporterId === user?.id);
  const assignedRequests = requests.filter((r) => r.technicianId === user?.id);

  // Kanban columns mapping
  const columns = ['PENDING', 'APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <span className="text-sm font-medium text-slate-500">Loading maintenance...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Maintenance & Fault Upkeep</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor asset repairs, assign technicians, and close work orders.
        </p>
      </div>

      {permissions.isAssetManager ? (
        /* Kanban Board View (Asset Manager only) */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {columns.map((col) => {
            const colRequests = requests.filter((r) => r.status === col);
            return (
              <div key={col} className="bg-slate-100 rounded-xl p-4 min-w-[240px] flex flex-col space-y-3 h-fit max-h-[600px] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                    {col.replace('_', ' ')}
                  </h4>
                  <span className="text-xs font-bold text-slate-500">({colRequests.length})</span>
                </div>

                <div className="space-y-3">
                  {colRequests.map((req) => {
                    const assetObj = assets.find((a) => a.id === req.assetId);
                    return (
                      <div
                        key={req.id}
                        onClick={() => {
                          setSelectedReq(req);
                          setAssignTechId(req.technicianId || '');
                          setDetailOpen(true);
                        }}
                        className="bg-white border border-slate-200 hover:border-primary-300 rounded-lg p-3.5 shadow-xs cursor-pointer hover:-translate-y-[1px] transition-all select-none space-y-2.5"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-800 text-xs">{assetObj?.name}</span>
                          <PriorityBadge priority={req.priority} />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                          {req.issueDescription}
                        </p>
                        <div className="text-[10px] text-slate-400">
                          Reported {formatDistanceToNow(new Date(req.reportedAt), { addSuffix: true })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Tabbed List View (Employees / Technicians) */
        <div className="space-y-4">
          <div className="border-b border-slate-200">
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveTab('my-requests')}
                className={clsx(
                  'pb-3 text-sm font-semibold border-b-2 focus:outline-none',
                  activeTab === 'my-requests'
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                My Reported Faults
              </button>
              <button
                onClick={() => setActiveTab('assigned')}
                className={clsx(
                  'pb-3 text-sm font-semibold border-b-2 focus:outline-none',
                  activeTab === 'assigned'
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                Assigned Work Orders
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            {activeTab === 'my-requests' ? (
              myRequests.length === 0 ? (
                <EmptyState
                  title="No reported issues"
                  description="Physical assets currently assigned to you have no reported faults."
                  icon={Wrench}
                />
              ) : (
                <div className="space-y-4">
                  {myRequests.map((req) => {
                    const assetObj = assets.find((a) => a.id === req.assetId);
                    return (
                      <div
                        key={req.id}
                        className="p-4 border border-slate-100 rounded-lg flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800 text-sm">{assetObj?.name}</span>
                            <StatusBadge status={req.status} />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{req.issueDescription}</p>
                          <span className="text-[10px] text-slate-400 block mt-1.5">
                            Reported {new Date(req.reportedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <PriorityBadge priority={req.priority} />
                      </div>
                    );
                  })}
                </div>
              )
            ) : assignedRequests.length === 0 ? (
              <EmptyState
                title="Clear schedule"
                description="No maintenance work orders have been assigned to you."
                icon={Wrench}
              />
            ) : (
              <div className="space-y-4">
                {assignedRequests.map((req) => {
                  const assetObj = assets.find((a) => a.id === req.assetId);
                  return (
                    <div
                      key={req.id}
                      className="p-4 border border-slate-150 rounded-lg flex items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800 text-sm">{assetObj?.name}</span>
                          <StatusBadge status={req.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{req.issueDescription}</p>
                        <span className="text-[10px] text-slate-400 block mt-1.5">
                          Assigned {new Date(req.reportedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <PriorityBadge priority={req.priority} />
                        {req.status === 'TECHNICIAN_ASSIGNED' && (
                          <button
                            onClick={() => handleStartWork(req.id)}
                            className="btn-primary py-1.5 px-3 text-xs flex items-center space-x-1"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Start Work</span>
                          </button>
                        )}
                        {req.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setResolveOpen(true);
                            }}
                            className="btn-primary py-1.5 px-3 text-xs flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawer Panel: Approve & Assign Details (Asset Manager only) */}
      {detailOpen && selectedReq && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div onClick={() => setDetailOpen(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-slide-in">
            <div className="p-6 overflow-y-auto space-y-6">
              <h3 className="text-lg font-bold border-b border-slate-100 pb-3">Repair Request Overview</h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Asset Tag</span>
                  <span className="font-mono font-bold text-slate-700">
                    {assets.find((a) => a.id === selectedReq.assetId)?.assetTag}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Priority Level</span>
                  <PriorityBadge priority={selectedReq.priority} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Possession Holder</span>
                  <span className="font-semibold text-slate-800">
                    {employees.find((e) => e.id === selectedReq.reporterId)?.name}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 font-semibold block">Fault Description</span>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg leading-relaxed">
                    {selectedReq.issueDescription}
                  </p>
                </div>
              </div>

              {/* Action 1: Pending decisions (Approve/Reject) */}
              {selectedReq.status === 'PENDING' && !showRejectForm && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleApprove(selectedReq.id)}
                    className="btn-primary w-full py-2 flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Approve ticket</span>
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="btn-secondary w-full py-2 text-red-650 hover:bg-red-50"
                  >
                    Reject ticket
                  </button>
                </div>
              )}

              {/* Reject forms justification note */}
              {showRejectForm && (
                <form onSubmit={handleRejectSubmit} className="space-y-3 pt-4 border-t border-slate-100">
                  {rejectError && <p className="text-xs text-red-650 font-semibold">{rejectError}</p>}
                  <div className="space-y-1">
                    <label className="form-label">State Rejection Note *</label>
                    <textarea
                      required
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Why is this maintenance request rejected..."
                      className="form-input h-16 pt-2"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="btn-secondary flex-1 py-1.5"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-danger flex-1 py-1.5 bg-red-650">
                      Submit Rejection
                    </button>
                  </div>
                </form>
              )}

              {/* Action 2: Approved tickets (Assign Technician) */}
              {selectedReq.status === 'APPROVED' && (
                <form onSubmit={handleAssign} className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="form-label">Assign Maintenance Technician</label>
                    <select
                      required
                      value={assignTechId}
                      onChange={(e) => setAssignTechId(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select Technician</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn-primary w-full py-2">
                    Assign Technician
                  </button>
                </form>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setDetailOpen(false)} className="btn-secondary">
                Close details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: Resolve work order */}
      {resolveOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={() => setResolveOpen(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <form
            onSubmit={handleResolveSubmit}
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 relative z-10 space-y-4"
          >
            <h3 className="text-base font-bold border-b border-slate-100 pb-2">Resolve Work Order</h3>
            {resError && <p className="text-xs text-red-650 font-semibold">{resError}</p>}

            <div className="space-y-1">
              <label className="form-label">Work Completed Notes * (min 10 chars)</label>
              <textarea
                required
                value={resNotes}
                onChange={(e) => setResNotes(e.target.value)}
                placeholder="Details of repair actions..."
                className="form-input h-20 pt-2"
              />
            </div>

            <div className="space-y-1">
              <label className="form-label">Total Repair Cost (USD)</label>
              <input
                type="number"
                step="0.01"
                value={resCost}
                onChange={(e) => setResCost(e.target.value)}
                placeholder="150.00"
                className="form-input"
              />
            </div>

            <div className="space-y-1">
              <label className="form-label">Post-repair Asset Condition</label>
              <select
                value={resCondition}
                onChange={(e) => setResCondition(e.target.value)}
                className="form-input"
              >
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setResolveOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary bg-emerald-650">
                Submit Resolution
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
