"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { User, Shield, Mail, Calendar, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../../lib/api/client';
import { Department } from '../../../lib/types';

export default function ProfilePage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const list = await api.organization.getDepartments();
        setDepartments(list);
      } catch (err) {
        console.error(err);
      }
    };
    loadDepts();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your credentials, department scope, and account security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left card: User profile details */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center space-y-4 h-fit">
          <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-2xl mx-auto border border-primary-250 shadow-xs">
            {user.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
            <span className="text-[10px] font-bold text-primary-500 bg-primary-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1.5 inline-block">
              {user.role.replace('_', ' ')}
            </span>
          </div>

          <div className="pt-4 border-t border-slate-100 text-left space-y-3 text-sm">
            <div className="flex items-center text-slate-550 justify-between">
              <span className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-slate-400" />
                Email Address
              </span>
              <span className="font-semibold text-slate-800">{user.email}</span>
            </div>
            <div className="flex items-center text-slate-550 justify-between">
              <span className="flex items-center">
                <Shield className="w-4 h-4 mr-2 text-slate-400" />
                Department
              </span>
              <span className="font-semibold text-slate-800">
                {departments.find((d) => d.id === user.departmentId)?.name || 'Unassigned'}
              </span>
            </div>
            <div className="flex items-center text-slate-550 justify-between">
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                Status
              </span>
              <span className="font-bold text-emerald-600">Active</span>
            </div>
          </div>
        </div>

        {/* Right card: Password reset form */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2.5">
              Change Account Password
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Input your existing password and choose a new secure credential.
            </p>
          </div>

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg flex items-center space-x-2">
              <CheckCircle2 className="w-4.5 h-4.5" />
              <span>Password successfully updated.</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1">
              <label className="form-label">Current Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <KeyRound className="w-4.5 h-4.5" />
                </span>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pl-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="form-label">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <KeyRound className="w-4.5 h-4.5" />
                </span>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pl-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="form-label">Confirm New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <KeyRound className="w-4.5 h-4.5" />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pl-10"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={loading} className="btn-primary flex items-center space-x-2 py-2 px-5">
                {loading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
