"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { usePermissions } from '../../../lib/hooks/usePermissions';
import { api } from '../../../lib/api/client';
import { Booking, Asset, Department, User } from '../../../lib/types';
import StatusBadge from '../../../components/shared/StatusBadge';
import EmptyState from '../../../components/shared/EmptyState';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Info,
  CalendarDays,
  Bookmark,
} from 'lucide-react';
import clsx from 'clsx';

export default function BookingCalendarPage() {
  const { user } = useAuth();
  const permissions = usePermissions();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter selection
  const [selectedAssetId, setSelectedAssetId] = useState('');

  // Drawer / Form trigger
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formAssetId, setFormAssetId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [purpose, setPurpose] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const allBookings = await api.bookings.getBookings({});
      const assets = await api.assets.getAssets({});
      const depts = await api.organization.getDepartments();
      const emps = await api.organization.getEmployees({});

      setResources(assets.filter((a) => a.isBookable));
      setDepartments(depts);
      setEmployees(emps);

      // Default filter selection to first bookable resource
      const bookable = assets.filter((a) => a.isBookable);
      if (bookable.length > 0 && !selectedAssetId) {
        setSelectedAssetId(bookable[0].id);
      }

      setBookings(allBookings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  // Filter bookings based on selected resource
  const filteredBookings = bookings.filter((b) => b.assetId === selectedAssetId);
  const activeBookings = filteredBookings.filter((b) => b.status !== 'CANCELLED');
  const selectedResource = resources.find((r) => r.id === selectedAssetId);

  // Handle booking form submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formAssetId || !startAt || !endAt || !purpose) {
      setError('Please fill in all required fields.');
      return;
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (start >= end) {
      setError('End date/time must be strictly after start date/time.');
      return;
    }

    if (start < new Date()) {
      setError('Cannot book slots in the past.');
      return;
    }

    setSaving(true);
    try {
      // Overlap verification: check if resource has overlapping booking
      const overlaps = activeBookings.filter(
        (b) =>
          b.assetId === formAssetId &&
          ((start >= new Date(b.startAt) && start < new Date(b.endAt)) ||
            (end > new Date(b.startAt) && end <= new Date(b.endAt)) ||
            (start <= new Date(b.startAt) && end >= new Date(b.endAt)))
      );

      if (overlaps.length > 0) {
        const conflict = overlaps[0];
        const holderName = employees.find((e) => e.id === conflict.bookedById)?.name || 'User';
        setError(
          `BOOKING_OVERLAP: This resource is already booked from ${new Date(
            conflict.startAt
          ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${new Date(
            conflict.endAt
          ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by ${holderName}.`
        );
        setSaving(false);
        return;
      }

      await api.bookings.createBooking({
        assetId: formAssetId,
        departmentId: formDeptId || null,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        purpose,
      });

      setDrawerOpen(false);
      loadBookings();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Booking failed.');
    } finally {
      setSaving(false);
    }
  };

  // Cancel booking
  const handleCancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await api.bookings.cancelBooking(id);
      loadBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel.');
    }
  };

  const resetForm = () => {
    setFormAssetId(selectedAssetId || '');
    setStartAt('');
    setEndAt('');
    setPurpose('');
    setFormDeptId('');
    setError('');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <span className="text-sm font-medium text-slate-500">Loading bookings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resource Booking</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reserve conference rooms, vehicles, and bookable equipment.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setFormAssetId(selectedAssetId || '');
            setDrawerOpen(true);
          }}
          className="btn-primary py-2 px-4 flex items-center space-x-1.5 w-fit"
        >
          <Plus className="w-5 h-5" />
          <span>New Reservation</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left side resources directory selection */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-slate-450 uppercase tracking-widest">
              Available Resources
            </h3>
            <div className="space-y-2">
              {resources.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No bookable resources registered.</p>
              ) : (
                resources.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedAssetId(r.id)}
                    className={clsx(
                      'w-full text-left p-3 rounded-lg border text-sm font-semibold flex items-center justify-between transition-all group',
                      selectedAssetId === r.id
                        ? 'border-primary-500 bg-primary-50/15 text-primary-650'
                        : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <div>
                      <span className="block truncate">{r.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{r.assetTag}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right side schedule list & timeline view */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-6">
              <Calendar className="w-5 h-5 text-primary-500" />
              <h3 className="text-base font-bold text-slate-800">
                Schedule calendar: {selectedResource?.name}
              </h3>
            </div>

            <div className="space-y-4">
              {activeBookings.length === 0 ? (
                <EmptyState
                  title="No active reservations"
                  description="Be the first to schedule this resource by clicking New Reservation."
                  icon={CalendarDays}
                />
              ) : (
                <div className="space-y-3">
                  {activeBookings.map((b) => {
                    const isOwn = b.bookedById === user?.id;
                    return (
                      <div
                        key={b.id}
                        className={clsx(
                          'p-4 border rounded-xl flex items-center justify-between gap-4 transition-all',
                          isOwn
                            ? 'border-l-4 border-l-primary-500 bg-primary-50/10 border-slate-200'
                            : 'border-slate-200 bg-slate-50/40'
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800 text-sm">{b.purpose}</span>
                            <StatusBadge status={b.status} />
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-slate-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {new Date(b.startAt).toLocaleString([], {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}{' '}
                                - {new Date(b.endAt).toLocaleTimeString([], { timeStyle: 'short' })}
                              </span>
                            </div>
                            <span>|</span>
                            <span>Booked by {b.bookedBy?.name || 'Unknown user'}</span>
                          </div>
                        </div>

                        {/* Actions: Cancel */}
                        {(isOwn || permissions.isAssetManager) && b.status === 'UPCOMING' && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            className="text-slate-400 hover:text-red-650 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Panel: New Reservation */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-slide-in">
            <div className="p-6 overflow-y-auto space-y-6">
              <h3 className="text-lg font-bold border-b border-slate-100 pb-3">New Reservation Form</h3>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-start space-x-2 animate-shake">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleBookingSubmit} id="booking-form" className="space-y-4">
                <div className="space-y-1">
                  <label className="form-label">Resource *</label>
                  <select
                    required
                    value={formAssetId}
                    onChange={(e) => setFormAssetId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select Resource</option>
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.assetTag})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="form-label">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="form-label">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="form-label">Purpose / Meeting Agenda *</label>
                  <input
                    type="text"
                    required
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Weekly Standup Meeting"
                    className="form-input"
                  />
                </div>

                {permissions.isDepartmentHead && (
                  <div className="space-y-1">
                    <label className="form-label">Book on Behalf of Department</label>
                    <select
                      value={formDeptId}
                      onChange={(e) => setFormDeptId(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Do not scope to department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </form>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button type="button" onClick={() => setDrawerOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" form="booking-form" disabled={saving} className="btn-primary">
                {saving ? 'Creating Reservation...' : 'Book Resource'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
