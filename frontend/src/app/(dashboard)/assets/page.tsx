"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { usePermissions } from '../../../lib/hooks/usePermissions';
import { api } from '../../../lib/api/client';
import { Asset, Category, Department } from '../../../lib/types';
import StatusBadge from '../../../components/shared/StatusBadge';
import EmptyState from '../../../components/shared/EmptyState';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Plus,
  QrCode,
  MapPin,
  Calendar,
  Layers,
  Building,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AssetDirectoryPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const router = useRouter();

  // Lists
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    const loadAssets = async () => {
      try {
        setLoading(true);
        // Load categories and depts for filters
        const cats = await api.organization.getCategories();
        const depts = await api.organization.getDepartments();
        setCategories(cats);
        setDepartments(depts);

        // Fetch assets
        const mockAssetsList = await api.assets.getAssets({});

        // Map categories and departments to assets for UI display
        const enriched = mockAssetsList.map((asset) => {
          const category = cats.find((c) => c.id === asset.categoryId);
          const department = depts.find((d) => d.id === asset.owningDepartmentId);
          return {
            ...asset,
            category,
            owningDepartment: department,
          };
        });

        // Filter based on roles
        let scoped = enriched;
        if (permissions.isEmployee) {
          const allAllocations = await api.allocations.getAllocations({});
          const myAllocations = allAllocations.filter((a) => a.employeeId === user?.id && a.status === 'ACTIVE');
          const myAllocatedAssetIds = myAllocations.map((a) => a.assetId);
          scoped = enriched.filter((a) => myAllocatedAssetIds.includes(a.id));
        } else if (permissions.isDepartmentHead && user?.departmentId) {
          scoped = enriched.filter((a) => a.owningDepartmentId === user.departmentId);
        }

        setAssets(scoped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadAssets();
  }, [user, permissions]);

  // Client side filters implementation for fast search preview
  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.assetTag.toLowerCase().includes(search.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !filterCategory || a.categoryId === filterCategory;
    const matchesStatus = !filterStatus || a.status === filterStatus;
    const matchesDepartment = !filterDepartment || a.owningDepartmentId === filterDepartment;
    const matchesCondition = !filterCondition || a.condition === filterCondition;

    return matchesSearch && matchesCategory && matchesStatus && matchesDepartment && matchesCondition;
  });

  const clearFilters = () => {
    setSearch('');
    setFilterCategory('');
    setFilterStatus('');
    setFilterDepartment('');
    setFilterCondition('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {permissions.isEmployee ? 'My Allocated Assets' : 'Asset Directory'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {permissions.isEmployee
              ? 'View details and history of physical resources currently assigned to you.'
              : 'Search and inspect organizational physical assets and resources.'}
          </p>
        </div>
        {permissions.canRegisterAsset && (
          <button
            onClick={() => router.push('/assets/new')}
            className="btn-primary py-2 px-4 flex items-center space-x-2 w-fit"
          >
            <Plus className="w-5 h-5" />
            <span>Register Asset</span>
          </button>
        )}
      </div>

      {/* Filter and View Toggles */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, tag, serial..."
            className="form-input pl-10"
          />
        </div>

        {/* Action Toggles */}
        <div className="flex items-center space-x-2">
          {!permissions.isEmployee && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'btn-secondary flex items-center space-x-1.5 py-2 px-3 text-xs',
                showFilters ? 'bg-primary-50 border-primary-300 text-primary-650' : ''
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
            </button>
          )}

          <div className="border border-slate-350 rounded-lg flex overflow-hidden bg-white shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'p-2 hover:bg-slate-50 focus:outline-none transition-colors',
                viewMode === 'grid' ? 'bg-slate-100 text-primary-500 border-r border-slate-200' : 'text-slate-400'
              )}
            >
              <LayoutGrid className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={clsx(
                'p-2 hover:bg-slate-50 focus:outline-none transition-colors',
                viewMode === 'table' ? 'bg-slate-100 text-primary-500 border-l border-slate-200' : 'text-slate-400'
              )}
            >
              <List className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded filters panel */}
      {showFilters && !permissions.isEmployee && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-down">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-550 uppercase">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="form-input h-9"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-550 uppercase">Lifecycle Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-input h-9"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ALLOCATED">Allocated</option>
              <option value="RESERVED">Reserved</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              <option value="LOST">Lost</option>
              <option value="RETIRED">Retired</option>
              <option value="DISPOSED">Disposed</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-550 uppercase">Department Scope</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="form-input h-9"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-550 uppercase">Condition</label>
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="form-input h-9"
            >
              <option value="">All Conditions</option>
              <option value="New">New</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Damaged">Damaged</option>
            </select>
          </div>

          {(filterCategory || filterStatus || filterDepartment || filterCondition || search) && (
            <div className="col-span-full pt-2 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-red-600 hover:underline focus:outline-none"
              >
                Clear all active filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-40 bg-white border border-slate-200 rounded-xl" />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <EmptyState
          title="No assets match query"
          description="Try modifying search keywords or clearing status filter criteria."
          icon={Package}
          actionLabel="Reset filters"
          onAction={clearFilters}
        />
      ) : viewMode === 'grid' ? (
        /* Grid Display */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => router.push(`/assets/${asset.id}`)}
              className="card flex flex-col justify-between h-48 cursor-pointer select-none"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">
                    {asset.assetTag}
                  </span>
                  <StatusBadge status={asset.status} />
                </div>
                <h3 className="text-base font-bold text-slate-800 line-clamp-1 leading-tight">
                  {asset.name}
                </h3>
                <div className="flex items-center text-xs text-slate-450 mt-1 space-x-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{asset.category?.name}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[120px]">{asset.location}</span>
                </div>
                {asset.currentHolder ? (
                  <div className="flex items-center space-x-1 font-semibold text-slate-700">
                    <div className="w-5 h-5 bg-slate-200 text-[9px] rounded-full flex items-center justify-center">
                      {asset.currentHolder.name[0]}
                    </div>
                    <span className="truncate max-w-[100px]">{asset.currentHolder.name}</span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Unassigned</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table Display */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <th className="p-3">Asset Tag</th>
                  <th className="p-3">Asset Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Current Holder</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => router.push(`/assets/${asset.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="p-3 font-mono font-bold text-slate-650">{asset.assetTag}</td>
                    <td className="p-3 font-semibold text-slate-800">{asset.name}</td>
                    <td className="p-3 text-slate-600">{asset.category?.name}</td>
                    <td className="p-3 text-slate-650">{asset.owningDepartment?.name || '—'}</td>
                    <td className="p-3 text-slate-500">{asset.location}</td>
                    <td className="p-3 text-slate-700">
                      {asset.currentHolder ? (
                        <span className="font-semibold">{asset.currentHolder.name}</span>
                      ) : (
                        <span className="text-slate-405 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={asset.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
