'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Save,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  Calculator,
  HelpCircle,
  X,
  Search
} from 'lucide-react';
import { AcademicSession, AcademicTerm, SchoolClass, Subject, User } from '@/lib/types';

interface StudentScoreRow {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  gender: string;
  homework: number | string;
  test1: number | string;
  test2: number | string;
  caTotal: number;
  exam: number | string;
  overallTotal: number;
  grade: string;
  remark: string;
  status: 'draft' | 'submitted' | 'approved';
  hasRecord: boolean;
}

interface ScoreEntryProps {
  currentUser: User | null;
}

export default function ScoreEntry({ currentUser }: ScoreEntryProps) {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [rows, setRows] = useState<StudentScoreRow[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initial load
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [sessRes, clsRes, subRes] = await Promise.all([
          fetch('/api/sessions'),
          fetch('/api/classes'),
          fetch('/api/subjects'),
        ]);

        const sessData = await sessRes.json();
        const clsData = await clsRes.json();
        const subData = await subRes.json();

        if (sessData.sessions) {
          setSessions(sessData.sessions);
          const activeSess = sessData.sessions.find((s: AcademicSession) => s.isCurrent) || sessData.sessions[0];
          if (activeSess) setSelectedSession(activeSess.id);
        }
        if (sessData.terms) {
          setTerms(sessData.terms);
          const activeTerm = sessData.terms.find((t: AcademicTerm) => t.isCurrent) || sessData.terms[0];
          if (activeTerm) setSelectedTerm(activeTerm.id);
        }
        if (clsData.classes) {
          setClasses(clsData.classes);
          if (clsData.classes.length > 0) setSelectedClass(clsData.classes[0].id);
        }
        if (subData.subjects) {
          setSubjects(subData.subjects);
          if (subData.subjects.length > 0) setSelectedSubject(subData.subjects[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch score entries whenever selections change
  const loadScores = async () => {
    if (!selectedSession || !selectedTerm || !selectedClass || !selectedSubject) return;

    try {
      setLoading(true);
      const res = await fetch(
        `/api/scores?sessionId=${selectedSession}&termId=${selectedTerm}&classId=${selectedClass}&subjectId=${selectedSubject}`
      );
      const data = await res.json();

      if (data.students) {
        setRows(data.students);
        setIsLocked(data.isLocked || false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
  }, [selectedSession, selectedTerm, selectedClass, selectedSubject]);

  // Helper calculation for grade and remark
  const computeGradeAndRemark = (total: number) => {
    if (total >= 80) return { grade: 'A', remark: 'Excellent' };
    if (total >= 70) return { grade: 'B', remark: 'Very Good' };
    if (total >= 60) return { grade: 'C', remark: 'Good' };
    if (total >= 50) return { grade: 'D', remark: 'Fair' };
    if (total >= 40) return { grade: 'E', remark: 'Poor' };
    return { grade: 'F', remark: 'Very Poor' };
  };

  // Handle cell change with real-time automatic calculation
  const handleScoreChange = (
    index: number,
    field: 'homework' | 'test1' | 'test2' | 'exam',
    value: string
  ) => {
    const newRows = [...rows];
    const row = { ...newRows[index] };

    // Parse input
    const num = value === '' ? '' : Math.max(0, Number(value));

    // Bound checks
    if (field === 'homework') row.homework = num === '' ? '' : Math.min(10, num);
    if (field === 'test1') row.test1 = num === '' ? '' : Math.min(10, num);
    if (field === 'test2') row.test2 = num === '' ? '' : Math.min(20, num);
    if (field === 'exam') row.exam = num === '' ? '' : Math.min(60, num);

    // Automatic CA Total = Homework + Test1 + Test2
    const hw = Number(row.homework) || 0;
    const t1 = Number(row.test1) || 0;
    const t2 = Number(row.test2) || 0;
    const ex = Number(row.exam) || 0;

    row.caTotal = Number((hw + t1 + t2).toFixed(1));
    row.overallTotal = Number((row.caTotal + ex).toFixed(1));

    const { grade, remark } = computeGradeAndRemark(row.overallTotal);
    row.grade = grade;
    row.remark = remark;

    newRows[index] = row;
    setRows(newRows);
  };

  // Save drafts or submit
  const handleSaveScores = async (status: 'draft' | 'submitted') => {
    try {
      setSaving(true);
      setNotification(null);

      const payload = {
        sessionId: selectedSession,
        termId: selectedTerm,
        classId: selectedClass,
        subjectId: selectedSubject,
        status,
        teacherId: currentUser?.id,
        scores: rows.map(r => ({
          studentId: r.studentId,
          homework: Number(r.homework) || 0,
          test1: Number(r.test1) || 0,
          test2: Number(r.test2) || 0,
          exam: Number(r.exam) || 0,
        })),
      };

      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.error) {
        setNotification({ type: 'error', message: data.error });
        return;
      }

      setNotification({
        type: 'success',
        message: status === 'submitted'
          ? 'Results submitted successfully for administrative approval!'
          : 'Scores draft saved successfully!',
      });

      setShowConfirmModal(false);
      loadScores();
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to save scores' });
    } finally {
      setSaving(false);
    }
  };

  const filteredRows = rows.filter(r =>
    r.studentName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.admissionNumber.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const completedCount = rows.filter(r => Number(r.overallTotal) > 0).length;
  const currentClassObj = classes.find(c => c.id === selectedClass);
  const currentSubObj = subjects.find(s => s.id === selectedSubject);

  return (
    <div className="space-y-6">
      {/* Top Banner / Selection Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <span>Academic Score Entry Module</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter Continuous Assessment (40 marks) and Examination (60 marks) scores. Totals and grades calculate automatically.
            </p>
          </div>

          {/* Save / Submit Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => handleSaveScores('draft')}
              disabled={isLocked || saving || rows.length === 0}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-600" />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isLocked || saving || rows.length === 0}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Submit Results</span>
            </button>
          </div>
        </div>

        {/* Form Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
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
                <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? '(Active)' : ''}</option>
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
                <option key={t.id} value={t.id}>{t.name} {t.isCurrent ? '(Active)' : ''}</option>
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

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Locked Term Alert */}
      {isLocked && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This term is currently LOCKED by administration. Score entries cannot be modified.</span>
        </div>
      )}

      {/* Calculation & Grading Guide Pill Bar */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-indigo-900">
          <Calculator className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-[11px] sm:text-xs">
            <strong>Assessment Weights:</strong> HW (10) + Test 1 (10) + Test 2 (20) = <strong>CA 40</strong> | Exam = <strong>60</strong> | Total = <strong>100</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-slate-600 text-[11px]">
          <span>Completion: <strong className="text-indigo-700">{completedCount} of {rows.length} graded</strong></span>
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-100 text-[10px] sm:text-[11px]">
            A: 80-100 | B: 70-79 | C: 60-69 | D: 50-59 | E: 40-49 | F: 0-39
          </span>
        </div>
      </div>

      {/* Scores Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Table Search */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search pupils in class..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-800 focus:outline-hidden"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Class: <strong className="text-slate-800">{currentClassObj?.name}</strong> &bull; Subject: <strong className="text-slate-800">{currentSubObj?.name}</strong>
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading score records...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs px-4">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-bold text-slate-800 text-sm">No students found in {currentClassObj?.name || 'this class'}</p>
            <p className="text-slate-400 mt-1">Please register students to this class in the Student Registration module first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">Admission No</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-2 text-center w-24 bg-indigo-50/60">
                    HW <span className="font-normal text-[10px] block text-slate-500">(Max 10)</span>
                  </th>
                  <th className="py-3 px-2 text-center w-24 bg-indigo-50/60">
                    Test 1 <span className="font-normal text-[10px] block text-slate-500">(Max 10)</span>
                  </th>
                  <th className="py-3 px-2 text-center w-24 bg-indigo-50/60">
                    Test 2 <span className="font-normal text-[10px] block text-slate-500">(Max 20)</span>
                  </th>
                  <th className="py-3 px-2 text-center w-24 bg-blue-50 text-blue-900">
                    CA Total <span className="font-normal text-[10px] block text-blue-600">(Auto 40)</span>
                  </th>
                  <th className="py-3 px-2 text-center w-24 bg-purple-50/60">
                    Exam <span className="font-normal text-[10px] block text-slate-500">(Max 60)</span>
                  </th>
                  <th className="py-3 px-2 text-center w-24 bg-emerald-50 text-emerald-900 font-black">
                    Total <span className="font-normal text-[10px] block text-emerald-700">(Auto 100)</span>
                  </th>
                  <th className="py-3 px-2 text-center w-16">Grade</th>
                  <th className="py-3 px-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, idx) => {
                  const originalIndex = rows.findIndex(r => r.studentId === row.studentId);
                  const isPass = row.overallTotal >= 40;

                  return (
                    <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800">{row.admissionNumber}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{row.studentName}</td>

                      {/* Homework */}
                      <td className="py-2.5 px-2 bg-indigo-50/20 text-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.5"
                          disabled={isLocked}
                          value={row.homework}
                          onChange={e => handleScoreChange(originalIndex, 'homework', e.target.value)}
                          placeholder="0"
                          className="w-16 mx-auto text-center font-bold bg-white border border-slate-300 rounded px-1 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                        />
                      </td>

                      {/* Test 1 */}
                      <td className="py-2.5 px-2 bg-indigo-50/20 text-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.5"
                          disabled={isLocked}
                          value={row.test1}
                          onChange={e => handleScoreChange(originalIndex, 'test1', e.target.value)}
                          placeholder="0"
                          className="w-16 mx-auto text-center font-bold bg-white border border-slate-300 rounded px-1 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                        />
                      </td>

                      {/* Test 2 */}
                      <td className="py-2.5 px-2 bg-indigo-50/20 text-center">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          disabled={isLocked}
                          value={row.test2}
                          onChange={e => handleScoreChange(originalIndex, 'test2', e.target.value)}
                          placeholder="0"
                          className="w-16 mx-auto text-center font-bold bg-white border border-slate-300 rounded px-1 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                        />
                      </td>

                      {/* CA Total (Auto calculated) */}
                      <td className="py-2.5 px-2 text-center bg-blue-50/60 font-bold text-blue-900 font-mono">
                        {row.caTotal}
                      </td>

                      {/* Exam */}
                      <td className="py-2.5 px-2 bg-purple-50/20 text-center">
                        <input
                          type="number"
                          min="0"
                          max="60"
                          step="0.5"
                          disabled={isLocked}
                          value={row.exam}
                          onChange={e => handleScoreChange(originalIndex, 'exam', e.target.value)}
                          placeholder="0"
                          className="w-16 mx-auto text-center font-bold bg-white border border-slate-300 rounded px-1 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                        />
                      </td>

                      {/* Overall Total (Auto calculated) */}
                      <td className="py-2.5 px-2 text-center bg-emerald-50/60 font-black text-slate-900 font-mono text-sm">
                        {row.overallTotal}
                      </td>

                      {/* Grade */}
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-block w-7 py-0.5 rounded text-xs font-black ${row.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                            row.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                              row.grade === 'C' ? 'bg-cyan-100 text-cyan-800' :
                                row.grade === 'D' ? 'bg-amber-100 text-amber-800' :
                                  row.grade === 'E' ? 'bg-orange-100 text-orange-800' :
                                    row.grade === 'F' ? 'bg-rose-100 text-rose-800' : 'text-slate-400'
                          }`}>
                          {row.grade}
                        </span>
                      </td>

                      {/* Remark */}
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold ${isPass ? 'text-slate-800' : 'text-rose-600'}`}>
                          {row.remark}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal before Final Submission */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center space-x-2">
                <Send className="w-4 h-4" />
                <span>Submit Completed Results</span>
              </h3>
              <button onClick={() => setShowConfirmModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700">
                Are you ready to submit scores for <strong className="text-slate-900">{currentClassObj?.name}</strong> in <strong className="text-slate-900">{currentSubObj?.name}</strong>?
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-slate-600">
                <p>&bull; Total students: <strong>{rows.length}</strong></p>
                <p>&bull; Graded entries: <strong>{completedCount}</strong></p>
                <p>&bull; Status after submit: <strong>Pending Head Teacher Approval</strong></p>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveScores('submitted')}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

