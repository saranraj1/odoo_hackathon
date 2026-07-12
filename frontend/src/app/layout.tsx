import './globals.css';
import React from 'react';
import QueryProvider from '../providers/QueryProvider';
import { AuthProvider } from '../providers/AuthProvider';

export const metadata = {
  title: 'AssetFlow — Enterprise Asset & Resource Management',
  description: 'Enterprise Asset & Resource Management System for Odoo Hackathon',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-700 antialiased font-sans">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
