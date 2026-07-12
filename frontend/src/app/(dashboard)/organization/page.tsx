"use client";

import React, { useState, useEffect } from 'react';
import { usePermissions } from '../../../lib/hooks/usePermissions';
import PermissionDenied from '../../../components/shared/PermissionDenied';
import { api } from '../../../lib/api/client';
import { Department, Category, User } from '../../../lib/types';
import StatusBadge from '../../../components/shared/StatusBadge';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import {
  Users,
  Layers,
  FolderTree,
  Building,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  UserX,
  UserCheck,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

export default function OrgSetupPage() {
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState<'departments' | 'categories' | 'employees'>('departments');

  // Master lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms drawers toggles
  const [deptDrawerOpen, setDeptDrawerOpen] = useState(false);
  const [catDrawerOpen, setCatDrawerOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);

  // Form states - Dept
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptParentId, setDeptParentId] = useState('');
  const [deptHeadId, setDeptHeadId] = useState('');
  const [deptStatus, setDeptStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [deptError, setDeptError] = useState('');

  // Form states - Category
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catError, setCatError] = useState('');

  // Promotion confirmations
  const [promoUser, setPromoUser] = useState<User | null>(null);
  const [targetRole, setTargetRole] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetching using actual API wrappers
      const deptsList = await api.organization.getDepartments();
      const catsList = await api.organization.getCategories();
      const empsList = await api.organization.getEmployees({});

      setDepartments(deptsList);
      setCategories(catsList);
      setEmployees(empsList);
    } catch (err) {
      console.error('Failed to load organization data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (permissions.isAdmin) {
      loadData();
    }
  }, [permissions.isAdmin]);

  if (!permissions.isAdmin) {
    return <PermissionDenied />;
  }

  // Handle department submit
  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptError('');
    if (!deptName || !deptCode) {
      setDeptError('Name and code are required.');
      return;
    }

    try {
      const payload = {
        name: deptName,
        code: deptCode.toUpperCase(),
        parentDepartmentId: deptParentId || null,
        headUserId: deptHeadId || null,
        status: deptStatus,
      };

      if (selectedDept) {
        await api.organization.updateDepartment(selectedDept.id, payload);
      } else {
        await api.organization.createDepartment(payload);
      }

      setDeptDrawerOpen(false);
      loadData();
      resetDeptForm();
    } catch (err: any) {
      setDeptError(err.message || 'Operation failed.');
    }
  };

  // Handle category submit
  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');
    if (!catName || !catDesc) {
      setCatError('Name and description are required.');
      return;
    }

    try {
      const payload = {
        name: catName,
        description: catDesc,
        metadataSchema: selectedCat?.metadataSchema || null,
        status: selectedCat ? selectedCat.status : 'ACTIVE',
      };

      if (selectedCat) {
        await api.organization.updateCategory(selectedCat.id, payload);
      } else {
        await api.organization.createCategory(payload);
      }

      setCatDrawerOpen(false);
      loadData();
      resetCatForm();
    } catch (err: any) {
      setCatError(err.message || 'Operation failed.');
    }
  };

  // Handle user deactivation toggle
  const toggleUserStatus = async (user: User) => {
    try {
      const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.organization.updateEmployee(user.id, { status: nextStatus });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update employee status.');
    }
  };

  // Handle Promotion
  const handlePromotionConfirm = async () => {
    if (!promoUser) return;
    try {
      await api.organization.promoteEmployee(promoUser.id, targetRole as any);
      setPromoUser(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Promotion failed.');
    }
  };

  const resetDeptForm = () => {
    setSelectedDept(null);
    setDeptName('');
    setDeptCode('');
    setDeptParentId('');
    setDeptHeadId('');
    setDeptStatus('ACTIVE');
    setDeptError('');
  };

  const resetCatForm = () => {
    setSelectedCat(null);
    setCatName('');
    setCatDesc('');
    setCatError('');
  };

  const openEditDept = (dept: Department) => {
    setSelectedDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptParentId(dept.parentDepartmentId || '');
    setDeptHeadId(dept.headUserId || '');
    setDeptStatus(dept.status);
    setDeptDrawerOpen(true);
  };

  const openEditCat = (cat: Category) => {
    setSelectedCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description);
    setCatDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <span className="text-sm font-medium text-slate-500">Loading Org Data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organization Setup</h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain departments, asset classifications, and employees.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('departments')}
            className={clsx(
              'pb-4 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all focus:outline-none',
              activeTab === 'departments'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <FolderTree className="w-4.5 h-4.5" />
            <span>Departments</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={clsx(
              'pb-4 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all focus:outline-none',
              activeTab === 'categories'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <Layers className="w-4.5 h-4.5" />
            <span>Asset Categories</span>
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={clsx(
              'pb-4 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all focus:outline-none',
              activeTab === 'employees'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <Users className="w-4.5 h-4.5" />
            <span>Employee Directory</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {/* Tab 1: Departments */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">Departments Directory</h3>
              <button
                onClick={() => {
                  resetDeptForm();
                  setDeptDrawerOpen(true);
                }}
                className="btn-primary py-1.5 px-3 flex items-center space-x-1.5 text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Department</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                    <th className="p-3">Dept Code</th>
                    <th className="p-3">Department Name</th>
                    <th className="p-3">Parent Department</th>
                    <th className="p-3">Department Head</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                        No departments registered yet.
                      </td>
                    </tr>
                  ) : (
                    departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-650">{dept.code}</td>
                        <td className="p-3 font-semibold text-slate-800">{dept.name}</td>
                        <td className="p-3 text-slate-500">
                          {dept.parentDepartment ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium">
                              {dept.parentDepartment.name}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-3 text-slate-700">
                          {dept.headUser ? (
                            <div className="flex items-center space-x-1.5">
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center">
                                {dept.headUser.name.split(' ').map((n) => n[0]).join('')}
                              </div>
                              <span className="font-medium text-xs">{dept.headUser.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={dept.status} />
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openEditDept(dept)}
                            className="btn-ghost p-1 text-slate-500 hover:text-primary-500 focus:outline-none"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Categories */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">Classification Categories</h3>
              <button
                onClick={() => {
                  resetCatForm();
                  setCatDrawerOpen(true);
                }}
                className="btn-primary py-1.5 px-3 flex items-center space-x-1.5 text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-400 italic">
                  No asset categories defined.
                </div>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all space-y-3 relative group"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-sm">{cat.name}</h4>
                      <StatusBadge status={cat.status} />
                    </div>
                    <p className="text-xs text-slate-500 min-h-[40px] leading-relaxed line-clamp-2">
                      {cat.description}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-semibold text-slate-400 uppercase">
                      <span>Custom Fields: {Object.keys(cat.metadataSchema || {}).length}</span>
                      <button
                        onClick={() => openEditCat(cat)}
                        className="text-primary-500 hover:text-primary-600 focus:outline-none"
                      >
                        Edit Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Employee Directory */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800">System Employee Directory</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                    <th className="p-3">Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-250 font-bold flex items-center justify-center text-slate-700">
                            {emp.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <span className="font-semibold text-slate-800">{emp.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-500">{emp.email}</td>
                      <td className="p-3 text-slate-700">
                        {emp.department ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold">
                            {emp.department.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No department</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold text-primary-500 bg-primary-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {emp.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={emp.status} />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Status toggle */}
                          <button
                            onClick={() => toggleUserStatus(emp)}
                            title={emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            className="btn-ghost p-1 text-slate-400 hover:text-red-500"
                          >
                            {emp.status === 'ACTIVE' ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-emerald-500" />
                            )}
                          </button>
                          {/* Role promo select */}
                          <select
                            value={emp.role}
                            onChange={(e) => {
                              setPromoUser(emp);
                              setTargetRole(e.target.value);
                            }}
                            className="text-xs p-1 border border-slate-350 rounded focus:outline-none focus:ring-1 focus:ring-primary-300"
                          >
                            <option value="EMPLOYEE">Employee</option>
                            <option value="DEPARTMENT_HEAD">Dept Head</option>
                            <option value="ASSET_MANAGER">Asset Manager</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Drawer: Create/Edit Department */}
      {deptDrawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setDeptDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          />
          {/* Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-slide-in">
            <div className="p-6 overflow-y-auto space-y-6">
              <h3 className="text-lg font-bold border-b border-slate-100 pb-3">
                {selectedDept ? `Edit Department: ${selectedDept.code}` : 'Register New Department'}
              </h3>

              {deptError && <div className="p-3 bg-red-50 text-red-700 rounded text-xs">{deptError}</div>}

              <form onSubmit={handleDeptSubmit} id="dept-form" className="space-y-4">
                <div className="space-y-1">
                  <label className="form-label">Department Code</label>
                  <input
                    type="text"
                    required
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                    placeholder="ENG"
                    disabled={!!selectedDept}
                    className="form-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="form-label">Department Name</label>
                  <input
                    type="text"
                    required
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="Engineering Department"
                    className="form-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="form-label">Parent Department (Optional)</label>
                  <select
                    value={deptParentId}
                    onChange={(e) => setDeptParentId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">No parent department</option>
                    {departments
                      .filter((d) => !selectedDept || d.id !== selectedDept.id)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="form-label">Department Head (Optional)</label>
                  <select
                    value={deptHeadId}
                    onChange={(e) => setDeptHeadId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">No assigned head</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.email})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedDept && (
                  <div className="space-y-1">
                    <label className="form-label">Department Status</label>
                    <select
                      value={deptStatus}
                      onChange={(e) => setDeptStatus(e.target.value as any)}
                      className="form-input"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                )}
              </form>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button onClick={() => setDeptDrawerOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" form="dept-form" className="btn-primary">
                Save Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Create/Edit Category */}
      {catDrawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            onClick={() => setCatDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-slide-in">
            <div className="p-6 overflow-y-auto space-y-6">
              <h3 className="text-lg font-bold border-b border-slate-100 pb-3">
                {selectedCat ? 'Edit Classification Category' : 'Create Asset Category'}
              </h3>

              {catError && <div className="p-3 bg-red-50 text-red-700 rounded text-xs">{catError}</div>}

              <form onSubmit={handleCatSubmit} id="cat-form" className="space-y-4">
                <div className="space-y-1">
                  <label className="form-label">Category Name</label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Electronics"
                    disabled={!!selectedCat}
                    className="form-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="form-label">Description Summary</label>
                  <textarea
                    required
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Brief description of the classification group..."
                    className="form-input h-20 pt-2"
                  />
                </div>
              </form>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button onClick={() => setCatDrawerOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" form="cat-form" className="btn-primary">
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!promoUser}
        title="Confirm Promotion Administrative Action"
        message={`Are you sure you want to promote ${promoUser?.name} to role "${targetRole.replace('_', ' ')}"? This action is auditable and will write to activity logs.`}
        confirmLabel="Execute Promotion"
        cancelLabel="Cancel"
        onConfirm={handlePromotionConfirm}
        onCancel={() => {
          setPromoUser(null);
          setTargetRole('');
        }}
      />
    </div>
  );
}
