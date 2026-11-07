'use client';

import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Check, Lock, Unlock, Calendar, Clock, X, Save } from 'lucide-react';
import { AcademicSession, AcademicTerm } from '@/lib/types';

interface SessionTermManagementProps {
  onSessionTermChanged?: () => void;
}

export default function SessionTermManagement({ onSessionTermChanged }: SessionTermManagementProps) {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('2027/2028');
  const [startDate, setStartDate] = useState('2027-09-08');
  const [endDate, setEndDate] = useState('2028-07-20');

  // Term editing
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [resumptionDate, setResumptionDate] = useState('');
  const [schoolDays, setSchoolDays] = useState(60);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sessions');
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
      if (data.terms) setTerms(data.terms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSetActiveSession = async (sessionId: string) => {
    try {
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_current_session', sessionId }),
      });
      loadData();
      if (onSessionTermChanged) onSessionTermChanged();
    } catch (err) {
      alert('Failed to activate session');
    }
  };

  const handleSetActiveTerm = async (termId: string) => {
    try {
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_current_term', termId }),
      });
      loadData();
      if (onSessionTermChanged) onSessionTermChanged();
    } catch (err) {
      alert('Failed to activate term');
    }
  };

  const handleToggleLockTerm = async (term: AcademicTerm) => {
    try {
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_term',
          termId: term.id,
          isLocked: !term.isLocked,
        }),
      });
      loadData();
    } catch (err) {
      alert('Failed to toggle lock');
    }
  };

  const handleOpenEditTerm = (term: AcademicTerm) => {
    setEditingTerm(term);
    setResumptionDate(term.nextTermBegins || '');
    setSchoolDays(term.totalSchoolDays || 60);
  };

  const handleSaveTermSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerm) return;

    try {
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_term',
          termId: editingTerm.id,
          nextTermBegins: resumptionDate,
        }),
      });
      setEditingTerm(null);
      loadData();
    } catch (err) {
      alert('Failed to update term');
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_session',
          name: newSessionName.trim(),
          startDate,
          endDate,
          isCurrent: false,
        }),
      });
      setShowAddSessionModal(false);
      loadData();
    } catch (err) {
      alert('Failed to create session');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
              <span>Academic Sessions & Terms</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control academic calendar years, term activation, lock status, and next term resumption dates.
            </p>
          </div>

          <button
            onClick={() => setShowAddSessionModal(true)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Academic Session</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sessions Column */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Academic Sessions</h3>
          <div className="space-y-3">
            {sessions.map(sess => (
              <div 
                key={sess.id} 
                className={`bg-white rounded-xl shadow-xs border p-4 transition-all ${
                  sess.isCurrent ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-900 text-base">{sess.name}</h4>
                      {sess.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          CURRENT ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {sess.startDate} &mdash; {sess.endDate}
                    </p>
                  </div>

                  {!sess.isCurrent && (
                    <button
                      onClick={() => handleSetActiveSession(sess.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
                    >
                      Make Active
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Terms Column */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Terms in Current Session</h3>
          <div className="space-y-3">
            {terms.map(term => (
              <div 
                key={term.id}
                className={`bg-white rounded-xl shadow-xs border p-4 transition-all ${
                  term.isCurrent ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-900 text-sm">{term.name}</h4>
                      {term.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ACTIVE TERM
                        </span>
                      )}
                      {term.isLocked ? (
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <Lock className="w-3 h-3" />
                          <span>LOCKED</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Unlock className="w-3 h-3" />
                          <span>OPEN</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 space-x-3">
                      <span>Total School Days: <strong>{term.totalSchoolDays || 60}</strong></span>
                      {term.nextTermBegins && (
                        <span>Next Resumption: <strong>{term.nextTermBegins}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleToggleLockTerm(term)}
                      className={`p-2 rounded-lg text-xs font-semibold border transition-colors ${
                        term.isLocked
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={term.isLocked ? 'Unlock Term' : 'Lock Term (Prevent Edits)'}
                    >
                      {term.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleOpenEditTerm(term)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200"
                    >
                      Dates
                    </button>

                    {!term.isCurrent && (
                      <button
                        onClick={() => handleSetActiveTerm(term.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Term Dates Modal */}
      {editingTerm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Term Dates: {editingTerm.name}</h3>
              <button onClick={() => setEditingTerm(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTermSettings} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Next Term Resumption Date</label>
                <input
                  type="date"
                  value={resumptionDate}
                  onChange={e => setResumptionDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTerm(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Dates</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Session Modal */}
      {showAddSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Create Academic Session</h3>
              <button onClick={() => setShowAddSessionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Name *</label>
                <input
                  type="text"
                  placeholder="e.g. 2027/2028"
                  value={newSessionName}
                  onChange={e => setNewSessionName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Session Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Session End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSessionModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Create Session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

