"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermissions } from '../../lib/hooks/usePermissions';
import { useAuth } from '../../providers/AuthProvider';
import {
  LayoutDashboard,
  Building2,
  Package,
  ArrowRightLeft,
  Calendar,
  Wrench,
  SearchCode,
  LineChart,
  History,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
} from 'lucide-react';
import clsx from 'clsx';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const permissions = usePermissions();
  const [collapsed, setCollapsed] = useState(false);

  // Group menu config
  const menuConfig = [
    {
      group: 'Main',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, show: true },
        { name: 'Notifications', path: '/notifications', icon: Bell, show: true },
      ],
    },
    {
      group: 'Inventory & Setup',
      items: [
        {
          name: 'Organization Setup',
          path: '/organization',
          icon: Building2,
          show: permissions.isAdmin || permissions.isAssetManager || permissions.isDepartmentHead,
        },
        { name: 'Asset Directory', path: '/assets', icon: Package, show: true },
      ],
    },
    {
      group: 'Workflows',
      items: [
        {
          name: 'Allocations & Transfers',
          path: '/allocations',
          icon: ArrowRightLeft,
          show: true,
        },
        { name: 'Resource Booking', path: '/bookings', icon: Calendar, show: true },
        {
          name: 'Maintenance Requests',
          path: '/maintenance',
          icon: Wrench,
          show: true,
        },
      ],
    },
    {
      group: 'Governance',
      items: [
        { name: 'Audit Cycles', path: '/audits', icon: SearchCode, show: true },
        {
          name: 'Reports & Analytics',
          path: '/reports',
          icon: LineChart,
          show: permissions.canViewAllReports || permissions.isDepartmentHead,
        },
        {
          name: 'Activity Logs',
          path: '/activity',
          icon: History,
          show: permissions.canViewAllActivityLogs,
        },
      ],
    },
  ];

  return (
    <aside
      className={clsx(
        'bg-slate-800 text-slate-350 border-r border-slate-700 h-screen sticky top-0 flex flex-col justify-between transition-all duration-300 z-30',
        collapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      {/* Brand logo header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
              AF
            </div>
            {!collapsed && (
              <span className="text-white font-bold tracking-tight text-base truncate">
                AssetFlow
              </span>
            )}
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
          {menuConfig.map((group) => {
            const visibleItems = group.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group} className="space-y-1.5">
                {!collapsed && (
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3">
                    {group.group}
                  </h4>
                )}
                <ul className="space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = pathname.startsWith(item.path);
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.path}
                          className={clsx(
                            'flex items-center py-2.5 px-3 rounded-md font-medium text-sm transition-all duration-150 relative group',
                            isActive
                              ? 'text-white bg-primary-600 shadow-xs'
                              : 'hover:text-slate-200 hover:bg-slate-700/50'
                          )}
                        >
                          <item.icon className="w-5 h-5 shrink-0" />
                          {!collapsed && <span className="ml-3 truncate">{item.name}</span>}
                          {collapsed && (
                            <span className="absolute left-16 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-md z-40">
                              {item.name}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer controls toggle */}
      <div className="p-3 border-t border-slate-700 flex flex-col space-y-2 bg-slate-800/80">
        {!collapsed && user && (
          <div className="flex items-center space-x-3 px-3 py-1.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-200 text-sm shrink-0">
              {user.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div className="truncate">
              <div className="text-sm font-semibold text-white truncate leading-tight">
                {user.name}
              </div>
              <span className="text-[10px] font-bold text-primary-300 uppercase bg-primary-500/10 px-1.5 py-0.5 rounded-full">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center p-2 rounded-md hover:text-white hover:bg-slate-700 transition-colors w-full"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <div className="flex items-center w-full justify-start px-1 space-x-3">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
