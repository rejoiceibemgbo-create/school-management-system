'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { LogIn, Lock, Mail, AlertCircle, School as SchoolIcon, ShieldCheck } from 'lucide-react';
import { User, School } from '@/lib/types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  school: School | null;
  users: User[];
}

export default function LoginView({ onLoginSuccess, school, users }: LoginViewProps) {
  const [email, setEmail] = useState('admin@happyhome.edu');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      onLoginSuccess(data.user);
    } catch (err) {
      setError('Login connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: User) => {
    setEmail(u.email);
    setPassword('password123');
    onLoginSuccess(u);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* School Logo */}
        <div className="mx-auto w-20 h-20 bg-white rounded-full p-2 shadow-xl border-4 border-indigo-400/30 flex items-center justify-center overflow-hidden mb-4">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <SchoolIcon className="w-10 h-10 text-indigo-600" />
          )}
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
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@happyhome.edu"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors text-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              Instant 1-Click Role Access (Testing)
            </p>
            <div className="space-y-1.5">
              {users.slice(0, 5).map(u => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u)}
                  type="button"
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-900 transition-colors text-left"
                >
                  <div className="truncate mr-2">
                    <p className="font-semibold truncate">{u.fullName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white border border-slate-200 text-indigo-700 shrink-0 capitalize">
                    {u.role.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

