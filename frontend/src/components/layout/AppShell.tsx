"use client";

import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../providers/AuthProvider';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        {/* Splash loading */}
        <div className="w-12 h-12 rounded-xl bg-primary-500 text-white flex items-center justify-center font-bold text-2xl animate-bounce">
          AF
        </div>
        <div className="text-sm font-semibold text-slate-500 animate-pulse">
          Loading AssetFlow Session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null; // AuthProvider redirects to /login

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Fixed header bar */}
        <Header />

        {/* Dynamic page container */}
        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
