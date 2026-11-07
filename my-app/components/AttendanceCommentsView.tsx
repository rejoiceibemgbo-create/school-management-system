'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Save, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';
import { AcademicSession, AcademicTerm, SchoolClass } from '@/lib/types';

interface AttendanceCommentRow {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  totalSchoolDays: number;
  daysPresent: number;
  daysAbsent: number;
  classTeacherComment: string;
  headTeacherComment: string;
  promotionStatus: 'Promoted' | 'Promoted on Trial' | 'Repeat' | 'Pending' | 'Graduated';
}

const TEACHER_COMMENT_PRESETS = [
  'An excellent, disciplined and hardworking pupil. Keep it up!',
  'Has shown remarkable academic improvement this term.',
  'A very calm and attentive student. Good effort.',
  'Needs to be more punctual and focus on core subjects.',
  'Satisfactory academic progress. Capable of higher achievement.',
];

const HEAD_TEACHER_PRESETS = [
  'A commendable result. Approved for advancement.',
  'Very good performance. Maintain this zeal.',
  'Satisfactory result. Work harder in the coming term.',
  'Good potential. Needs consistent study habits.',
];

export default function AttendanceCommentsView() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const [rows, setRows] = useState<AttendanceCommentRow[]>([]);
  const [defaultSchoolDays, setDefaultSchoolDays] = useState(60);
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

  const loadData = async () => {
    if (!selectedSession || !selectedTerm || !selectedClass) return;

    try {
      setLoading(true);
      const [attRes, cmtRes] = await Promise.all([
        fetch(`/api/attendance?sessionId=${selectedSession}&termId=${selectedTerm}&classId=${selectedClass}`),
        fetch(`/api/comments?sessionId=${selectedSession}&termId=${selectedTerm}&classId=${selectedClass}`),
      ]);

      const attData = await attRes.json();
      const cmtData = await cmtRes.json();

      if (attData.attendance && cmtData.comments) {
        setDefaultSchoolDays(attData.defaultDays || 60);

        const combined: AttendanceCommentRow[] = attData.attendance.map((att: any) => {
          const cmt = cmtData.comments.find((c: any) => c.studentId === att.studentId);
          return {
            studentId: att.studentId,
            admissionNumber: att.admissionNumber,
            studentName: att.studentName,
            totalSchoolDays: att.totalSchoolDays,
            daysPresent: att.daysPresent,
            daysAbsent: att.daysAbsent,
            classTeacherComment: cmt?.classTeacherComment || '',
            headTeacherComment: cmt?.headTeacherComment || '',
            promotionStatus: cmt?.promotionStatus || 'Promoted',
          };
        });

        setRows(combined);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSession, selectedTerm, selectedClass]);

  const handleAttendanceChange = (index: number, presentVal: number) => {
    const newRows = [...rows];
    const row = { ...newRows[index] };
    row.daysPresent = Math.min(row.totalSchoolDays, Math.max(0, presentVal));
    row.daysAbsent = Math.max(0, row.totalSchoolDays - row.daysPresent);
    newRows[index] = row;
    setRows(newRows);
  };

  const handleCommentChange = (index: number, field: 'classTeacherComment' | 'headTeacherComment' | 'promotionStatus', val: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: val };
    setRows(newRows);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setNotification(null);

      // Save attendance
      const attPayload = {
        sessionId: selectedSession,
        termId: selectedTerm,
        classId: selectedClass,
        records: rows.map(r => ({
          studentId: r.studentId,
          totalSchoolDays: r.totalSchoolDays,
          daysPresent: r.daysPresent,
        })),
      };

      // Save comments
      const cmtPayload = {
        sessionId: selectedSession,
        termId: selectedTerm,
        classId: selectedClass,
        comments: rows.map(r => ({
          studentId: r.studentId,
          classTeacherComment: r.classTeacherComment,
          headTeacherComment: r.headTeacherComment,
          promotionStatus: r.promotionStatus,
        })),
      };

      await Promise.all([
        fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attPayload),
        }),
        fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cmtPayload),
        }),
      ]);

      setNotification('Attendance and report comments successfully saved!');
      loadData();
    } catch (err) {
      alert('Failed to save records');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              <span>Attendance & Teacher Comments</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record term attendance days, Class Teacher remarks, Head Teacher endorsements, and promotion statuses.
            </p>
          </div>

          <button
            onClick={handleSaveAll}
            disabled={saving || rows.length === 0}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Records'}</span>
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

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Cards List for Students */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Loading records...</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-slate-400 text-xs border border-slate-200">
          No students registered in this class.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, idx) => (
            <div key={row.studentId} className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              {/* Pupil info & Attendance */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{row.studentName}</h4>
                    <span className="text-[11px] font-mono text-slate-500">{row.admissionNumber}</span>
                  </div>
                </div>

                {/* Attendance inputs */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs self-stretch sm:self-auto">
                  <span className="font-semibold text-slate-600">Attendance:</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500">Days Present:</span>
                    <input
                      type="number"
                      min="0"
                      max={row.totalSchoolDays}
                      value={row.daysPresent}
                      onChange={e => handleAttendanceChange(idx, Number(e.target.value))}
                      className="w-14 text-center font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5"
                    />
                  </div>
                  <span className="text-slate-400">/</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500">Total:</span>
                    <strong className="text-slate-800">{row.totalSchoolDays}</strong>
                  </div>
                  <span className="text-slate-400">|</span>
                  <span className="text-rose-600 font-semibold">{row.daysAbsent} Absent</span>
                </div>
              </div>

              {/* Comments & Promotion Status Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                {/* Class Teacher Comment */}
                <div className="lg:col-span-5 space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Class Teacher&apos;s Remark</span>
                    <span className="text-[10px] text-slate-400 font-normal">Official Report Card Comment</span>
                  </label>
                  <textarea
                    rows={2}
                    value={row.classTeacherComment}
                    onChange={e => handleCommentChange(idx, 'classTeacherComment', e.target.value)}
                    placeholder="Enter customized remark for this pupil..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {TEACHER_COMMENT_PRESETS.slice(0, 3).map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleCommentChange(idx, 'classTeacherComment', preset)}
                        className="text-[10px] bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 px-2 py-0.5 rounded border border-slate-200 transition-colors truncate max-w-[200px]"
                        title={preset}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Head Teacher Comment */}
                <div className="lg:col-span-5 space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Head Teacher&apos;s Endorsement</span>
                    <span className="text-[10px] text-slate-400 font-normal">Principal/Head Remarks</span>
                  </label>
                  <textarea
                    rows={2}
                    value={row.headTeacherComment}
                    onChange={e => handleCommentChange(idx, 'headTeacherComment', e.target.value)}
                    placeholder="Enter head teacher endorsement..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {HEAD_TEACHER_PRESETS.slice(0, 2).map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleCommentChange(idx, 'headTeacherComment', preset)}
                        className="text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 px-2 py-0.5 rounded border border-slate-200 transition-colors truncate max-w-[200px]"
                        title={preset}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Promotion Status */}
                <div className="lg:col-span-2 space-y-1.5">
                  <label className="font-bold text-slate-700 block">Promotion Status</label>
                  <select
                    value={row.promotionStatus}
                    onChange={e => handleCommentChange(idx, 'promotionStatus', e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900"
                  >
                    <option value="Promoted">Promoted</option>
                    <option value="Promoted on Trial">Promoted on Trial</option>
                    <option value="Repeat">Repeat</option>
                    <option value="Pending">Pending</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

