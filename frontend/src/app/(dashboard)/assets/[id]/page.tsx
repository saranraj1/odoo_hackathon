"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../providers/AuthProvider';
import { usePermissions } from '../../../../lib/hooks/usePermissions';
import { api } from '../../../../lib/api/client';
import { Asset, Allocation, TransferRequest, MaintenanceRequest, User, Department } from '../../../../lib/types';
import StatusBadge from '../../../../components/shared/StatusBadge';
import Timeline, { TimelineEvent } from '../../../../components/shared/Timeline';
import ConfirmDialog from '../../../../components/shared/ConfirmDialog';
import {
  ArrowLeft,
  Loader2,
  Calendar,
  MapPin,
  Tag,
  Wrench,
  ChevronRight,
  ArrowRightLeft,
  FileSpreadsheet,
  Info,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

export default function AssetDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'allocation' | 'maintenance'>('overview');

  // Modal triggers
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);

  // Form states - Allocate
  const [holderType, setHolderType] = useState<'employee' | 'department'>('employee');
  const [allocEmployeeId, setAllocEmployeeId] = useState('');
  const [allocDeptId, setAllocDeptId] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [allocNotes, setAllocNotes] = useState('');
  const [allocError, setAllocError] = useState('');
  const [conflictHolder, setConflictHolder] = useState<any>(null);

  // Form states - Transfer
  const [transEmployeeId, setTransEmployeeId] = useState('');
  const [transReason, setTransReason] = useState('');
  const [transError, setTransError] = useState('');

  // Form states - Return
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnNotes, setReturnNotes] = useState('');

  // Form states - Maintenance
  const [maintPriority, setMaintPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintError, setMaintError] = useState('');

  // Lists for dropdowns
  const [employees, setEmployees] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const loadAssetDetails = async () => {
    try {
      setLoading(true);
      const mockAsset = await api.assets.getAssetById(params.id);
      if (!mockAsset) {
        setAsset(null);
        return;
      }

      // Enrichment
      const cats = await api.organization.getCategories();
      const depts = await api.organization.getDepartments();
      const emps = await api.organization.getEmployees({});

      setEmployees(emps);
      setDepartments(depts);

      const enriched = {
        ...mockAsset,
        category: cats.find((c) => c.id === mockAsset.categoryId),
        owningDepartment: depts.find((d) => d.id === mockAsset.owningDepartmentId),
      };

      setAsset(enriched);

      // Scoped history listings
      const allAllocations = await api.allocations.getAllocations({});
      const allMaintenance = await api.maintenance.getMaintenance({});
      const assetAllocations = allAllocations.filter((a) => a.assetId === params.id);
      const assetMaintenance = allMaintenance.filter((m) => m.assetId === params.id);

      setAllocations(assetAllocations);
      setMaintenance(assetMaintenance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssetDetails();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <span className="text-sm font-medium text-slate-500">Loading details...</span>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center p-12">
        <h2 className="text-xl font-bold">Asset Not Found</h2>
        <p className="text-sm text-slate-400 mt-2">The requested asset does not exist in our directory.</p>
        <Link href="/assets" className="btn-primary mt-4 inline-block">
          Return to Directory
        </Link>
      </div>
    );
  }

  // Lifecycle steps array
  const steps = ['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'];
  const currentStepIdx = steps.indexOf(asset.status);

  // Allocate submit handler
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocError('');

    if (holderType === 'employee' && !allocEmployeeId) {
      setAllocError('Please select an employee.');
      return;
    }
    if (holderType === 'department' && !allocDeptId) {
      setAllocError('Please select a department.');
      return;
    }

    try {
      // Conflict detection: If asset status is not AVAILABLE
      if (asset.status !== 'AVAILABLE') {
        const holderName = asset.currentHolder?.name || 'Unknown Holder';
        setConflictHolder({ name: holderName, department: asset.owningDepartment?.name || 'Unknown Department' });
        setConflictOpen(true);
        setAllocateOpen(false);
        return;
      }

      await api.allocations.allocateAsset({
        assetId: asset.id,
        employeeId: holderType === 'employee' ? allocEmployeeId : null,
        departmentId: holderType === 'department' ? allocDeptId : null,
        expectedReturnAt: expectedReturn ? new Date(expectedReturn).toISOString() : null,
      });

      setAllocateOpen(false);
      loadAssetDetails();
    } catch (err: any) {
      setAllocError(err.message || 'Allocation failed.');
    }
  };

  // Return submit handler
  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeAlloc = allocations.find((a) => a.status === 'ACTIVE');
      if (activeAlloc) {
        await api.allocations.returnAsset(activeAlloc.id, {
          returnCondition,
          checkInNotes: returnNotes,
        });
      }

      setReturnOpen(false);
      loadAssetDetails();
    } catch (err: any) {
      alert(err.message || 'Return check-in failed.');
    }
  };

  // Transfer submit handler
  const handleTransferRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransError('');
    if (!transEmployeeId) {
      setTransError('Please select recipient.');
      return;
    }
    if (transReason.length < 10) {
      setTransError('Transfer reason must be at least 10 characters.');
      return;
    }

    try {
      const activeAlloc = allocations.find((a) => a.status === 'ACTIVE');

      await api.allocations.createTransfer({
        assetId: asset.id,
        sourceAllocationId: activeAlloc?.id || '',
        toEmployeeId: transEmployeeId,
        toDepartmentId: null,
        reason: transReason,
      });

      setTransferOpen(false);
      setConflictOpen(false);
      loadAssetDetails();
      router.push('/allocations');
    } catch (err: any) {
      setTransError(err.message || 'Request failed.');
    }
  };

  // Maintenance submit handler
  const handleRaiseMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaintError('');
    if (maintDesc.length < 10) {
      setMaintError('Description must be at least 10 characters.');
      return;
    }

    try {
      await api.maintenance.createRequest({
        assetId: asset.id,
        priority: maintPriority,
        issueDescription: maintDesc,
      });

      setMaintOpen(false);
      loadAssetDetails();
      router.push('/maintenance');
    } catch (err: any) {
      setMaintError(err.message || 'Failed to raise request.');
    }
  };

  // History mapping to timeline
  const timelineEvents: TimelineEvent[] = allocations.map((a) => {
    const actor = employees.find((e) => e.id === a.allocatedById);
    const holder = employees.find((e) => e.id === a.employeeId) || departments.find((d) => d.id === a.departmentId);
    return {
      id: a.id,
      title: a.status === 'ACTIVE' ? 'Asset Allocated' : 'Asset Returned',
      description: a.status === 'ACTIVE'
        ? `Allocated to holder: ${holder?.name || 'Unknown Holder'} (Expected return: ${a.expectedReturnAt ? new Date(a.expectedReturnAt).toLocaleDateString() : 'None'})`
        : `Returned in condition: ${a.returnCondition}. Notes: ${a.checkInNotes || 'None'}`,
      timestamp: a.createdAt,
      actorName: actor?.name,
      color: a.status === 'ACTIVE' ? 'blue' : 'green',
    };
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/assets"
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-55 bg-white text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-wider">{asset.assetTag}</span>
              {asset.isBookable && (
                <span className="text-[10px] font-bold text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full uppercase">
                  Shared
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">{asset.name}</h1>
          </div>
        </div>

        {/* Dynamic actions block */}
        <div className="flex flex-wrap gap-2">
          {permissions.canAllocateAsset && asset.status === 'AVAILABLE' && (
            <button onClick={() => setAllocateOpen(true)} className="btn-primary flex items-center space-x-1.5 py-2">
              <ArrowRightLeft className="w-4 h-4" />
              <span>Allocate Resource</span>
            </button>
          )}

          {permissions.canAllocateAsset && asset.status === 'ALLOCATED' && (
            <button onClick={() => setReturnOpen(true)} className="btn-primary py-2 bg-emerald-600 hover:bg-emerald-700">
              <span>Approve Return</span>
            </button>
          )}

          {permissions.canAllocateAsset && asset.status === 'ALLOCATED' && (
            <button
              onClick={() => {
                // Trigger conflict modal
                const holderName = asset.currentHolder?.name || 'Unknown Holder';
                setConflictHolder({ name: holderName, department: asset.owningDepartment?.name || 'Unknown Department' });
                setConflictOpen(true);
              }}
              className="btn-secondary py-2"
            >
              Force Allocate (Conflict)
            </button>
          )}

          {asset.status === 'ALLOCATED' && (user?.id === asset.currentHolder?.id || permissions.isEmployee) && (
            <>
              <button onClick={() => setTransferOpen(true)} className="btn-primary py-2">
                Request Transfer
              </button>
              <button onClick={() => setMaintOpen(true)} className="btn-secondary py-2 flex items-center space-x-1">
                <Wrench className="w-4 h-4" />
                <span>Request Repair</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lifecycle stepper */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-semibold text-slate-450 uppercase tracking-widest">Asset Lifecycle Status</h3>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          {steps.map((st, i) => {
            const isCurrent = st === asset.status;
            const isPast = i < currentStepIdx;

            return (
              <div key={st} className="flex-1 flex flex-col items-center relative group">
                {/* Stepper Dot */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 ${
                    isCurrent
                      ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                      : isPast
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isPast ? '✓' : i + 1}
                </div>
                {/* Stepper Label */}
                <span
                  className={`text-[10px] font-bold mt-2 uppercase tracking-wider ${
                    isCurrent ? 'text-primary-600 font-extrabold' : 'text-slate-550'
                  }`}
                >
                  {st.replace('_', ' ')}
                </span>

                {/* Progress bar line connection */}
                {i < steps.length - 1 && (
                  <div
                    className={`hidden md:block absolute top-3 left-[calc(50%+12px)] w-[calc(100%-24px)] h-0.5 z-0 ${
                      i < currentStepIdx ? 'bg-emerald-450' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Details block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs bar */}
          <div className="border-b border-slate-200">
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={clsx(
                  'pb-3 text-sm font-semibold flex items-center space-x-1.5 border-b-2 focus:outline-none',
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                <Info className="w-4.5 h-4.5" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('allocation')}
                className={clsx(
                  'pb-3 text-sm font-semibold flex items-center space-x-1.5 border-b-2 focus:outline-none',
                  activeTab === 'allocation'
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                <ArrowRightLeft className="w-4.5 h-4.5" />
                <span>Allocation History</span>
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={clsx(
                  'pb-3 text-sm font-semibold flex items-center space-x-1.5 border-b-2 focus:outline-none',
                  activeTab === 'maintenance'
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                <Wrench className="w-4.5 h-4.5" />
                <span>Maintenance History</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
                    Specifications
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {asset.description || 'No description summary provided for this asset.'}
                  </p>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Serial Number</span>
                      <p className="font-semibold text-slate-800 font-mono mt-0.5">{asset.serialNumber}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Category</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{asset.category?.name}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Location Room / Zone</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{asset.location}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Condition</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{asset.condition}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Acquisition Cost</span>
                      <p className="font-semibold text-slate-800 mt-0.5">${asset.acquisitionCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Acquisition Date</span>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {new Date(asset.acquisitionDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Allocation */}
            {activeTab === 'allocation' && <Timeline events={timelineEvents} />}

            {/* Tab: Maintenance */}
            {activeTab === 'maintenance' && (
              <div className="space-y-4">
                {maintenance.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-4 text-center">
                    No maintenance records found for this asset.
                  </p>
                ) : (
                  maintenance.map((m) => (
                    <div key={m.id} className="p-4 border border-slate-200 rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Issue reported</span>
                        <StatusBadge status={m.status} />
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{m.issueDescription}</p>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Cost: ${m.cost || 0}</span>
                        <span>Date: {new Date(m.reportedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Holder widget */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
          <h3 className="text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">
            Current Possession
          </h3>
          {asset.currentHolder ? (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xl mx-auto border border-primary-200 shadow-xs">
                {asset.currentHolder.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">{asset.currentHolder.name}</h4>
                <span className="text-[10px] font-bold text-primary-500 uppercase tracking-wide">
                  {asset.currentHolder.type} Holder
                </span>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Held Since</span>
                </div>
                <span className="font-semibold">
                  {allocations.find((a) => a.status === 'ACTIVE')?.createdAt
                    ? new Date(allocations.find((a) => a.status === 'ACTIVE')!.createdAt).toLocaleDateString()
                    : 'Recent'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <UserIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm italic">Unassigned</p>
              <p className="text-xs max-w-[180px] mx-auto mt-1 leading-relaxed">
                This asset is currently in inventory and available for allocation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Allocate Form */}
      {allocateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={() => setAllocateOpen(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <form
            onSubmit={handleAllocate}
            className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-md w-full mx-4 relative z-10 space-y-4"
          >
            <h3 className="text-base font-bold border-b border-slate-100 pb-2">Allocate Asset</h3>

            {allocError && <p className="text-xs text-red-650 font-semibold">{allocError}</p>}

            <div className="space-y-1">
              <label className="form-label">Holder Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHolderType('employee')}
                  className={clsx(
                    'py-2 rounded-md border text-xs font-semibold',
                    holderType === 'employee' ? 'border-primary-500 bg-primary-50/20 text-primary-650' : 'border-slate-350'
                  )}
                >
                  Employee
                </button>
                <button
                  type="button"
                  onClick={() => setHolderType('department')}
                  className={clsx(
                    'py-2 rounded-md border text-xs font-semibold',
                    holderType === 'department' ? 'border-primary-500 bg-primary-50/20 text-primary-650' : 'border-slate-350'
                  )}
                >
                  Department
                </button>
              </div>
            </div>

            {holderType === 'employee' ? (
              <div className="space-y-1">
                <label className="form-label">Select Employee</label>
                <select
                  value={allocEmployeeId}
                  onChange={(e) => setAllocEmployeeId(e.target.value)}
                  className="form-input"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="form-label">Select Department</label>
                <select value={allocDeptId} onChange={(e) => setAllocDeptId(e.target.value)} className="form-input">
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="form-label">Expected Return Date (Optional)</label>
              <input
                type="date"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="space-y-1">
              <label className="form-label">Purpose / Allocation Notes</label>
              <textarea
                value={allocNotes}
                onChange={(e) => setAllocNotes(e.target.value)}
                placeholder="Details of allocation purpose..."
                className="form-input h-16 pt-2"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setAllocateOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Confirm Allocation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Allocation Conflict (ASSET_ALREADY_ALLOCATED) */}
      {conflictOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={() => setConflictOpen(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <div className="bg-white rounded-xl border-l-4 border-l-amber-500 shadow-xl p-6 max-w-md w-full mx-4 relative z-10 space-y-4 animate-shake">
            <h3 className="text-base font-bold text-amber-900">Asset Already Allocated</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong>{asset.name}</strong> is currently allocated to{' '}
              <strong className="text-slate-800">{conflictHolder?.name || 'Unknown Holder'}</strong> ({conflictHolder?.department || 'Unknown Department'}). Double-allocation is prohibited.
            </p>
            <p className="text-xs text-slate-500">
              You cannot complete allocation. You may request a Transfer Request from the current holder instead.
            </p>
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button onClick={() => setConflictOpen(false)} className="btn-secondary">
                Close
              </button>
              <button onClick={() => { setConflictOpen(false); setTransferOpen(true); }} className="btn-primary">
                Request Transfer Instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Request Transfer */}
      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={() => setTransferOpen(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <form
            onSubmit={handleTransferRequest}
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 relative z-10 space-y-4"
          >
            <h3 className="text-base font-bold border-b border-slate-100 pb-2">Request Asset Transfer</h3>
            {transError && <p className="text-xs text-red-650 font-semibold">{transError}</p>}

            <div className="space-y-1">
              <label className="form-label">Transfer Recipient *</label>
              <select
                value={transEmployeeId}
                onChange={(e) => setTransEmployeeId(e.target.value)}
                className="form-input"
              >
                <option value="">Select Recipient</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="form-label">Reason / Justification * (min 10 chars)</label>
              <textarea
                required
                value={transReason}
                onChange={(e) => setTransReason(e.target.value)}
                placeholder="Reason for transfer request..."
                className="form-input h-20 pt-2"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setTransferOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Return Form */}
      {returnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={() => setReturnOpen(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <form
            onSubmit={handleReturn}
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 relative z-10 space-y-4"
          >
            <h3 className="text-base font-bold border-b border-slate-100 pb-2">Check-In Returned Asset</h3>

            <div className="space-y-1">
              <label className="form-label">Returned Condition</label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                className="form-input"
              >
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="form-label">Check-in Notes</label>
              <textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Any observations on check-in..."
                className="form-input h-20 pt-2"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setReturnOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary bg-emerald-600 hover:bg-emerald-700">
                Confirm Return
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Raise Maintenance */}
      {maintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={() => setMaintOpen(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <form
            onSubmit={handleRaiseMaintenance}
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 relative z-10 space-y-4"
          >
            <h3 className="text-base font-bold border-b border-slate-100 pb-2">Raise Maintenance Request</h3>
            {maintError && <p className="text-xs text-red-650 font-semibold">{maintError}</p>}

            <div className="space-y-1">
              <label className="form-label">Priority Level</label>
              <select
                value={maintPriority}
                onChange={(e) => setMaintPriority(e.target.value as any)}
                className="form-input"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="form-label">Description of Issue * (min 10 chars)</label>
              <textarea
                required
                value={maintDesc}
                onChange={(e) => setMaintDesc(e.target.value)}
                placeholder="Describe fault details..."
                className="form-input h-20 pt-2"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setMaintOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
