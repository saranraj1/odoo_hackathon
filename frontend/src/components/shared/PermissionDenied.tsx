import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PermissionDenied() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-white border border-slate-200 rounded-xl max-w-lg mx-auto my-12 shadow-sm">
      <div className="p-4 bg-red-50 text-red-500 rounded-full mb-4">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
      <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
        You do not have the required permissions or role configurations to access this page. Please contact your system administrator if you believe this is an error.
      </p>
      <div className="flex space-x-3">
        <button onClick={() => router.back()} className="btn-secondary">
          Go Back
        </button>
        <button onClick={() => router.push('/dashboard')} className="btn-primary">
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
