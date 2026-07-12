"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api/client';
import { Mail, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setLoading(true);
    try {
      await api.auth.forgotPassword({ email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 to-primary-50/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full animate-scale-up">
        {/* Back Link */}
        <Link
          href="/login"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Login
        </Link>

        {submitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="inline-flex p-3 bg-emerald-50 text-emerald-500 rounded-full">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Check Your Email</h3>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              If an account exists for <strong>{email}</strong>, a password reset link has been logged to the server terminal output.
            </p>
            <button onClick={() => setSubmitted(false)} className="btn-secondary w-full mt-4">
              Try Another Email
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Reset Password</h2>
              <p className="text-sm text-slate-400 mt-1">
                Enter your email address and we will generate a password reset token.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2 animate-shake">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@assetflow.com"
                    className="form-input pl-10"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full h-11 mt-2">
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>Sending Token...</span>
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
