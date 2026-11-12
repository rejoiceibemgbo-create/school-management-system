
'use client';

import React, { useState } from 'react';
import {
  LogIn,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { User, School } from '@/lib/types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  school: School | null;
  users: User[];
}

export default function LoginView({
  onLoginSuccess,
  school,
}: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setError('Incorrect email or password. Please try again.');
        return;
      }

      if (res.status === 403) {
        setError('Your account is inactive. Please contact your administrator.');
        return;
      }

      if (!res.ok || !data.success || !data.user) {
        setError(data.error || 'Unable to sign in. Please try again.');
        return;
      }

      onLoginSuccess(data.user);
    } catch (err) {
      console.error('Login connection error:', err);
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-24 h-24 bg-white rounded-full p-2 shadow-xl border-4 border-indigo-400/30 flex items-center justify-center overflow-hidden mb-4">
          <img
            src={school?.logoUrl || '/logo.jpeg'}
            alt="Happy Home School Logo"
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/logo.jpeg';
            }}
          />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
          {school?.name || 'HAPPY HOME EDUCATIONAL CENTRE'}
        </h2>

        <p className="mt-1 text-xs text-indigo-200">
          School Result Management System &bull; Secure Portal
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100 text-xs">

          <form onSubmit={handleLogin} className="space-y-4">

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email Address
              </label>

              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your registered email"
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Password
              </label>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-slate-500 hover:text-indigo-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="mt-1 text-[10px] text-slate-400">
                Use the eye icon to check your password before signing in.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors text-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
              </span>
            </button>

          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500">
              Access is restricted to registered school staff.
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Contact your School Administrator if you need an account.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
