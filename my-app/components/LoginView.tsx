
'use client';

import React, { useState } from 'react';
import {
  LogIn,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  UserPlus,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import { User as UserType, School } from '@/lib/types';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
  school: School | null;
  users: UserType[];
}

export default function LoginView({
  onLoginSuccess,
}: LoginViewProps) {
  const [isRegistering, setIsRegistering] = useState(false);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [fullName, setFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // General state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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

      if (!res.ok || !data.success || !data.user) {
        setError(
          data.error || 'Unable to sign in. Please try again.'
        );
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

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (registerPassword.length < 8) {
      setError('Your password must contain at least 8 characters.');
      return;
    }

    if (registerPassword !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: registerEmail.trim(),
          phone: phone.trim(),
          password: registerPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      setSuccess(
        'Registration submitted successfully! Your account is awaiting administrator approval. You can sign in after your account has been approved.'
      );

      // Keep the email available for signing in after approval.
      setEmail(registerEmail.trim());
      setFullName('');
      setRegisterEmail('');
      setPhone('');
      setRegisterPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Registration error:', err);
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-10 sm:px-6 lg:px-8">

      {/* School identity */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="mx-auto w-24 h-24 bg-white rounded-full p-2 shadow-xl border-4 border-indigo-400/30 flex items-center justify-center overflow-hidden mb-4">
          <img
            src="/logo.jpeg"
            alt="Happy Home School Logo"
            className="w-full h-full object-contain"
          />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
          HAPPY HOME EDUCATIONAL CENTRE
        </h2>

        <p className="mt-1 text-xs text-indigo-200">
          School Result Management System
        </p>
      </div>

      {/* Login and registration panel */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">

          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">
              {isRegistering ? 'Create Staff Account' : 'Staff Sign In'}
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              {isRegistering
                ? 'Register using your personal details.'
                : 'Sign in using your registered personal email.'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-start space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {!isRegistering && (
            <form onSubmit={handleLogin} className="space-y-4">

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Personal Email Address
                </label>

                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your personal email"
                    autoComplete="username"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-indigo-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors text-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Signing in...' : 'Sign In to Portal'}</span>
              </button>
            </form>
          )}

          {/* REGISTRATION FORM */}
          {isRegistering && (
            <form onSubmit={handleRegistration} className="space-y-4">

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>

                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={100}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Personal Email Address
                </label>

                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    placeholder="Enter your personal email"
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number (Optional)
                </label>

                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Create Password
                </label>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-indigo-600"
                    aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 mt-1">
                  Use at least 8 characters.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Enter your password again"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                Your registration must be approved by the school administrator before you can access the portal.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors text-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Submitting...' : 'Submit Registration'}</span>
              </button>
            </form>
          )}

          {/* Switch between login and registration */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              {isRegistering
                ? 'Already have an account?'
                : 'Are you a staff member without an account?'}
            </p>

            <button
              type="button"
              onClick={switchMode}
              className="mt-2 text-xs font-bold text-indigo-700 hover:text-indigo-900"
            >
              {isRegistering
                ? 'Back to Sign In'
                : 'Create Staff Account'}
            </button>
          </div>

          <p className="mt-5 text-[10px] text-slate-400 text-center">
            Happy Home Educational Centre
          </p>
        </div>
      </div>
    </div>
  );
}
