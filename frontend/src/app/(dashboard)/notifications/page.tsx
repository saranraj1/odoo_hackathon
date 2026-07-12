"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { api } from '../../../lib/api/client';
import { Notification } from '../../../lib/types';
import StatusBadge from '../../../components/shared/StatusBadge';
import EmptyState from '../../../components/shared/EmptyState';
import { Bell, Loader2, Trash2, CheckSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getNotificationRoute } from '../../../lib/notificationRoute';

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const list = await api.notifications.getNotifications({ page: 1, limit: 50 });
      setNotifications(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user?.id]);

  const markRead = async (id: string) => {
    try {
      await api.notifications.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.notifications.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        <span className="text-sm font-medium text-slate-500">Loading inbox...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            Stay updated on your asset allocations, transfer status, and bookings.
          </p>
        </div>
        {notifications.filter((n) => !n.readAt).length > 0 && (
          <button
            onClick={markAllRead}
            className="btn-secondary py-2 px-4 flex items-center space-x-1.5 text-xs w-fit"
          >
            <CheckSquare className="w-4 h-4 text-primary-500" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Inbox List */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        {notifications.length === 0 ? (
          <EmptyState
            title="Inbox is clean"
            description="You have no notifications or messages at the moment."
            icon={Bell}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  markRead(n.id);
                  const route = getNotificationRoute(n.entityType, n.entityId);
                  if (route) router.push(route);
                }}
                className={`py-4 flex items-start justify-between cursor-pointer hover:bg-slate-50/50 px-2 rounded-lg transition-colors relative ${
                  !n.readAt ? 'bg-primary-50/5' : ''
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`p-2 rounded-full shrink-0 ${
                      !n.readAt ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{n.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-400 block mt-2">
                      {new Date(n.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.readAt && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-500 shrink-0 mt-2 ml-4" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
