"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { usePermissions } from '../../../lib/hooks/usePermissions';
import { api } from '../../../lib/api/client';
import { AuditCycle, Department } from '../../../lib/types';
import StatusBadge from '../../../components/shared/StatusBadge';
import EmptyState from '../../../components/shared/EmptyState';
import { ClipboardList, Plus, Loader2, Calendar, FileText, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuditsListPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();

  const [cycles, setCycles] = useState<AuditCycle[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopeDeptId, setScopeDeptId] = useState('');
  const [scopeLoc, setScopeLoc] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');

  const loadAudits = async () => {
    try {
      setLoading(true);
      const allCycles = await api.audits.getCycles({});
      const depts = await api.organization.getDepartments();

      setDepartments(depts);

      // Filter list based on auditor assignment in details
      let scoped = allCycles;
      if (permissions.isEmployee && user) {
        scoped = allCycles.filter(c => c.createdById === user.id);
      }

      setCycles(scoped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
  }, [user, permissions]);

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !start || !end) {
      setError('Please enter name and date ranges.');
      return;
    }

    try {
      await api.audits.createCycle({
        name,
        scopeDepartmentId: scopeDeptId || null,
        scopeLocation: scopeLoc || null,
        startDate: new Date(start).toISOString(),
        endDate: new Date(end).toISOString(),
      });

      setDrawerOpen(false);
      setName('');
      setScopeDeptId('');
      setScopeLoc('');
      setStart('');
      setEnd('');
      loadAudits();
    } catch (err: any) {
      setError(err.message || 'Failed to create audit cycle.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <span className="text-sm font-medium text-slate-500">Loading audit cycles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Structured Governance Audits</h1>
          <p className="text-sm text-slate-500 mt-1">
            Conduct cyclic physical verifications of enterprise assets and track discrepancies.
          </p>
        </div>
        {permissions.isAdmin && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="btn-primary py-2 px-4 flex items-center space-x-1.5 w-fit"
          >
            <Plus className="w-5 h-5" />
            <span>Create Audit Cycle</span>
          </button>
        )}
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cycles.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title="No audit cycles registered"
              description="Initiate a periodic physical audit to enforce asset presence integrity."
              icon={ClipboardList}
            />
          </div>
        ) : (
          cycles.map((c) => {
            const scopeDept = departments.find((d) => d.id === c.scopeDepartmentId);
            return (
              <div
                key={c.id}
                onClick={() => router.push(`/audits/${c.id}`)}
                className="card flex flex-col justify-between h-48 cursor-pointer select-none"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <StatusBadge status={c.status} />
                    <span className="text-[10px] font-bold text-slate-400">
                      Scope: {scopeDept?.name || c.scopeLocation || 'All Assets'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 line-clamp-1 leading-tight">
                    {c.name}
                  </h3>
                  <div className="flex items-center space-x-1 text-xs text-slate-450 mt-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-primary-500 font-semibold">
                  <span>Audit Progress checklist</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Drawer: Create Cycle */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-slide-in">
            <div className="p-6 overflow-y-auto space-y-6">
              <h3 className="text-lg font-bold border-b border-slate-100 pb-3">Initiate Audit Cycle</h3>

              {error && <div className="p-3 bg-red-50 text-red-700 rounded text-xs">{error}</div>}

              <form onSubmit={handleCreateCycle} id="audit-form" className="space-y-4">
                <div className="space-y-1">
                  <label className="form-label">Audit Cycle Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Q3 Hardware Verification Audit"
                    className="form-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="form-label">Scope Department (Optional)</label>
                  <select
                    value={scopeDeptId}
                    onChange={(e) => setScopeDeptId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Full org-wide scope</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="form-label">Scope Location Room (Optional)</label>
                  <input
                    type="text"
                    value={scopeLoc}
                    onChange={(e) => setScopeLoc(e.target.value)}
                    placeholder="e.g. Main Lab 3A"
                    className="form-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="form-label">End Date *</label>
                  <input
                    type="date"
                    required
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="form-input"
                  />
                </div>
              </form>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button onClick={() => setDrawerOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" form="audit-form" className="btn-primary">
                Save Draft Cycle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
