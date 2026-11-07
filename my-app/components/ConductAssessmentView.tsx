'use client';

import React, { useState, useEffect } from 'react';
import { Award, Save, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { AcademicSession, AcademicTerm, SchoolClass } from '@/lib/types';

interface StudentConductRow {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  punctuality: number;
  regularity: number;
  neatness: number;
  honesty: number;
  obedience: number;
  respect: number;
  participation: number;
  cooperation: number;
  leadership: number;
  responsibility: number;
  hasRecord: boolean;
}

export default function ConductAssessmentView() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const [rows, setRows] = useState<StudentConductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [sessRes, clsRes] = await Promise.all([
          fetch('/api/sessions'),
          fetch('/api/classes'),
        ]);
        const sessData = await sessRes.json();
        const clsData = await clsRes.json();

        if (sessData.sessions) {
          setSessions(sessData.sessions);
          const activeSess = sessData.sessions.find((s: any) => s.isCurrent) || sessData.sessions[0];
          if (activeSess) setSelectedSession(activeSess.id);
        }
        if (sessData.terms) {
          setTerms(sessData.terms);
          const activeTerm = sessData.terms.find((t: any) => t.isCurrent) || sessData.terms[0];
          if (activeTerm) setSelectedTerm(activeTerm.id);
        }
        if (clsData.classes) {
          setClasses(clsData.classes);
          if (clsData.classes.length > 0) setSelectedClass(clsData.classes[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMetadata();
  }, []);

  const loadConduct = async () => {
    if (!selectedSession || !selectedTerm || !selectedClass) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/conduct?sessionId=${selectedSession}&termId=${selectedTerm}&classId=${selectedClass}`);
      const data = await res.json();
      if (data.students) {
        setRows(data.students);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConduct();
  }, [selectedSession, selectedTerm, selectedClass]);

  const handleRatingChange = (index: number, field: keyof StudentConductRow, value: number) => {
    const newRows = [...rows];
    (newRows[index] as any)[field] = value;
    setRows(newRows);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setNotification(null);

      const res = await fetch('/api/conduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession,
          termId: selectedTerm,
          classId: selectedClass,
          assessments: rows,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification('Conduct and behavioural ratings saved successfully!');
        loadConduct();
      }
    } catch (err) {
      alert('Failed to save conduct ratings');
    } finally {
      setSaving(false);
    }
  };

  const traits = [
    { key: 'punctuality', label: 'Punctuality' },
    { key: 'regularity', label: 'Regularity' },
    { key: 'neatness', label: 'Neatness' },
    { key: 'honesty', label: 'Honesty' },
    { key: 'obedience', label: 'Obedience' },
    { key: 'respect', label: 'Respect' },
    { key: 'participation', label: 'Participation' },
    { key: 'cooperation', label: 'Cooperation' },
    { key: 'leadership', label: 'Leadership' },
    { key: 'responsibility', label: 'Responsibility' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>General Conduct & Observable Behaviours</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Grade pupils on 10 behavioural and character traits (Rated 1 to 5). Displayed on official student report cards.
            </p>
          </div>

          <button
            onClick={handleSaveAll}
            disabled={saving || rows.length === 0}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Conduct Ratings'}</span>
          </button>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Academic Session
            </label>
            <select
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Term
            </label>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {terms.filter(t => t.sessionId === selectedSession).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Rating Guide Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
        <span className="font-bold flex items-center space-x-1 text-slate-900">
          <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
          <span>Rating Key:</span>
        </span>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="font-semibold text-emerald-700">5 = Excellent</span>
          <span className="font-semibold text-blue-700">4 = Very Good</span>
          <span className="font-semibold text-cyan-700">3 = Good</span>
          <span className="font-semibold text-amber-700">2 = Fair</span>
          <span className="font-semibold text-rose-700">1 = Poor</span>
        </div>
      </div>

      {/* Conduct Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">Loading conduct records...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs px-4">
            No students found in this class. Please register students first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3 min-w-[160px]">Student Name</th>
                  {traits.map(t => (
                    <th key={t.key} className="py-3 px-2 text-center min-w-[70px]">
                      {t.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-900">{row.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{row.admissionNumber}</p>
                    </td>

                    {traits.map(t => {
                      const val = (row as any)[t.key] || 4;
                      return (
                        <td key={t.key} className="py-2 px-1 text-center">
                          <select
                            value={val}
                            onChange={e => handleRatingChange(idx, t.key as any, Number(e.target.value))}
                            className={`w-12 text-center font-bold border rounded py-1 px-0.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden ${
                              val === 5 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                              val === 4 ? 'bg-blue-50 text-blue-800 border-blue-300' :
                              val === 3 ? 'bg-cyan-50 text-cyan-800 border-cyan-300' :
                              val === 2 ? 'bg-amber-50 text-amber-800 border-amber-300' :
                              'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value={5}>5</option>
                            <option value={4}>4</option>
                            <option value={3}>3</option>
                            <option value={2}>2</option>
                            <option value={1}>1</option>
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

