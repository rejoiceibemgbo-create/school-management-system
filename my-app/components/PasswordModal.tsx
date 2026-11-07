'use client';

import React, { useState } from 'react';
import { KeyRound, X, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { User } from '@/lib/types';

interface PasswordModalProps {
  currentUser: User | null;
  onClose: () => void;
}

export default function PasswordModal({ currentUser, onClose }: PasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          userId: currentUser?.id,
          newPassword,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      setSuccess('Password changed successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <span>Change Account Password</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs flex items-center space-x-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Updating...' : 'Save Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

