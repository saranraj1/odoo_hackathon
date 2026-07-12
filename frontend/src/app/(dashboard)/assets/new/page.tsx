"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '../../../../lib/hooks/usePermissions';
import PermissionDenied from '../../../../components/shared/PermissionDenied';
import { api } from '../../../../lib/api/client';
import { Category, Department } from '../../../../lib/types';
import { ArrowLeft, Loader2, Save, Image, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function AssetRegisterPage() {
  const router = useRouter();
  const permissions = usePermissions();

  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [condition, setCondition] = useState('Good');
  const [location, setLocation] = useState('');
  const [owningDepartmentId, setOwningDepartmentId] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [isBookable, setIsBookable] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    const loadFields = async () => {
      try {
        setLoading(true);
        const cats = await api.organization.getCategories();
        const depts = await api.organization.getDepartments();
        setCategories(cats);
        setDepartments(depts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadFields();
  }, []);

  if (!permissions.canRegisterAsset) {
    return <PermissionDenied />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !categoryId || !serialNumber || !owningDepartmentId || !location) {
      setError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description,
        categoryId,
        serialNumber,
        condition,
        location,
        owningDepartmentId,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate).toISOString() : new Date().toISOString(),
        acquisitionCost: parseFloat(acquisitionCost) || 0,
        isBookable,
        photoUrl: photoUrl || null,
      };

      await api.assets.registerAsset(payload);

      router.push('/assets');
    } catch (err: any) {
      setError(err.message || 'Failed to register asset.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <span className="text-sm font-medium text-slate-500">Loading fields...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link
          href="/assets"
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-55 bg-white text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Register Asset</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create an entry for a physical asset. A unique Asset Tag will be generated.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Asset Name */}
          <div className="space-y-1 md:col-span-2">
            <label className="form-label">Asset Name / Label *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="MacBook Pro 16-Inch M3"
              className="form-input"
            />
          </div>

          {/* Description */}
          <div className="space-y-1 md:col-span-2">
            <label className="form-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide technical specifications, manufacturer, or additional details..."
              className="form-input h-20 pt-2"
            />
          </div>

          {/* Classification Category */}
          <div className="space-y-1">
            <label className="form-label">Classification Category *</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="form-input"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Serial Number */}
          <div className="space-y-1">
            <label className="form-label">Serial Number / Unique Identifier *</label>
            <input
              type="text"
              required
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. SN-XYZ12345"
              className="form-input"
            />
          </div>

          {/* Owning Department */}
          <div className="space-y-1">
            <label className="form-label">Owning Department *</label>
            <select
              required
              value={owningDepartmentId}
              onChange={(e) => setOwningDepartmentId(e.target.value)}
              className="form-input"
            >
              <option value="">Select Owning Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Initial Location */}
          <div className="space-y-1">
            <label className="form-label">Location Room / Box *</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Office Desk 14 / Server Room B"
              className="form-input"
            />
          </div>

          {/* Condition */}
          <div className="space-y-1">
            <label className="form-label">Asset Condition *</label>
            <select
              required
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="form-input"
            >
              <option value="New">New</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Damaged">Damaged</option>
            </select>
          </div>

          {/* Acquisition Date */}
          <div className="space-y-1">
            <label className="form-label">Acquisition Date</label>
            <input
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Acquisition Cost */}
          <div className="space-y-1">
            <label className="form-label">Acquisition Cost (USD)</label>
            <input
              type="number"
              step="0.01"
              value={acquisitionCost}
              onChange={(e) => setAcquisitionCost(e.target.value)}
              placeholder="1200.00"
              className="form-input"
            />
          </div>

          {/* Shared bookable toggle */}
          <div className="space-y-1 flex items-center justify-between border border-slate-200 rounded-lg p-3 bg-slate-50/50 mt-4 md:mt-0">
            <div>
              <span className="text-sm font-semibold text-slate-800">Shared Resource</span>
              <p className="text-[10px] text-slate-400">Make this asset available for calendar scheduling</p>
            </div>
            <input
              type="checkbox"
              checked={isBookable}
              onChange={(e) => setIsBookable(e.target.checked)}
              className="w-5 h-5 text-primary-500 rounded border-slate-300 focus:ring-primary-300"
            />
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2 py-2 px-5">
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving asset...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Register & Create</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
