"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../../lib/api/client';
import { Notification } from '../../lib/types';
import { Bell, LogOut, User, Settings, Check } from 'lucide-react';
import Link from 'next/link';
import { getNotificationRoute } from '../../lib/notificationRoute';

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch notifications
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const list = await api.notifications.getNotifications({ page: 1, limit: 5 });
        setNotifications(list);
      } catch (err) {
        console.error('Failed to fetch notifications in header:', err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

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

  // Dynamic breadcrumb mapping
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
    const isLast = index === pathSegments.length - 1;
    return { href, title, isLast };
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Breadcrumbs */}
      <nav className="flex text-sm font-medium text-slate-500">
        <Link href="/dashboard" className="hover:text-primary-500 transition-colors">
          Home
        </Link>
        {breadcrumbs.map((bc) => (
          <span key={bc.href} className="flex items-center">
            <span className="mx-2 text-slate-350 select-none">/</span>
            {bc.isLast ? (
              <span className="text-slate-800 font-semibold">{bc.title}</span>
            ) : (
              <Link href={bc.href} className="hover:text-primary-500 transition-colors">
                {bc.title}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Action triggers */}
      <div className="flex items-center space-x-4">
        {/* Notification bell dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileDropdownOpen(false);
            }}
            className="p-2 text-slate-500 rounded-full hover:bg-slate-100 hover:text-slate-800 focus:outline-none transition-colors relative"
          >
            <Bell className="w-5.5 h-5.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <span className="text-xs font-semibold text-slate-700">Recent Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-bold text-primary-500 hover:text-primary-600 focus:outline-none"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markRead(n.id);
                        setNotificationsOpen(false);
                        const route = getNotificationRoute(n.entityType, n.entityId);
                        router.push(route || '/notifications');
                      }}
                      className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors relative ${!n.readAt ? 'bg-primary-50/10' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="text-xs font-bold text-slate-800 pr-4">{n.title}</span>
                        {!n.readAt && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <span className="text-[9px] text-slate-400 block mt-1.5">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <Link
                href="/notifications"
                onClick={() => setNotificationsOpen(false)}
                className="block text-center text-[11px] font-semibold text-primary-500 py-2 border-t border-slate-100 hover:bg-slate-50 transition-colors"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>

        {/* User profile dropdown */}
        <div className="relative">
          {user && (
            <button
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm border border-primary-200">
                {user.name.split(' ').map((n) => n[0]).join('')}
              </div>
            </button>
          )}

          {profileDropdownOpen && user && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100">
              <div className="p-3 text-left">
                <div className="text-sm font-semibold text-slate-900 leading-none mb-1">
                  {user.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate mb-2">{user.email}</div>
                <span className="text-[10px] font-bold text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center px-4 py-2 text-xs font-medium text-slate-650 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                >
                  <User className="w-4 h-4 mr-2.5 text-slate-400" />
                  My Profile
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center px-4 py-2 text-xs font-medium text-slate-650 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2.5 text-slate-400" />
                  Settings
                </Link>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors focus:outline-none"
                >
                  <LogOut className="w-4 h-4 mr-2.5 text-red-400" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
