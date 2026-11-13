
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  Save,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { AcademicSession, AcademicTerm, SchoolClass } from '@/lib/types';

type PromotionStatus =
  | 'Promoted'
  | 'Promoted on Trial'
  | 'Repeat'
  | 'Pending'
  | 'Graduated';

interface AttendanceCommentRow {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  totalSchoolDays: number;
  marksPresent: number;
  marksAbsent: number;
  daysPresent: number;
  daysAbsent: number;
  classTeacherComment: string;
  headTeacherComment: string;
  promotionStatus: PromotionStatus;
}

interface FetchedAttendance {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  totalSchoolDays: number;
  marksPresent?: number;
  daysPresent?: number;
  daysAbsent?: number;
}

interface FetchedComment {
  studentId: string;
  classTeacherComment?: string;
  headTeacherComment?: string;
  promotionStatus?: PromotionStatus;
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

  const [termTotalDays, setTermTotalDays] = useState<number>(60);
  const [rows, setRows] = useState<AttendanceCommentRow[]>([]);
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
          const activeSess =
            sessData.sessions.find((s: AcademicSession) => s.isCurrent) ||
            sessData.sessions[0];

          if (activeSess) setSelectedSession(activeSess.id);
        }

        if (sessData.terms) {
          setTerms(sessData.terms);
          const activeTerm =
            sessData.terms.find((t: AcademicTerm) => t.isCurrent) ||
            sessData.terms[0];

          if (activeTerm) {
            setSelectedTerm(activeTerm.id);
            setTermTotalDays(activeTerm.totalSchoolDays || 60);
          }
        }

        if (clsData.classes) {
          setClasses(clsData.classes);
          if (clsData.classes.length > 0) {
            setSelectedClass(clsData.classes[0].id);
          }
        }
      } catch (error) {
        console.error('Metadata load error:', error);
      }
    };

    fetchMetadata();
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedSession || !selectedTerm || !selectedClass) return;

    try {
      setLoading(true);

      const [attRes, cmtRes] = await Promise.all([
        fetch(
          `/api/attendance?sessionId=${selectedSession}&termId=${selectedTerm}&classId=${selectedClass}`
        ),
        fetch(
          `/api/comments?sessionId=${selectedSession}&termId=${selectedTerm}&classId=${selectedClass}`
        ),
      ]);

      const attData = await attRes.json();
      const cmtData = await cmtRes.json();

      if (!attRes.ok || !cmtRes.ok) {
        throw new Error('Could not load attendance or comments.');
      }

      if (attData.attendance && cmtData.comments) {
        const defaultDays =
          Number(attData.termTotalDays || attData.defaultDays) || 60;

        setTermTotalDays(defaultDays);

        const combined: AttendanceCommentRow[] = attData.attendance.map(
          (att: FetchedAttendance) => {
            const cmt = cmtData.comments.find(
              (c: FetchedComment) => c.studentId === att.studentId
            );

            const stuDays = Number(att.totalSchoolDays) || defaultDays;

            const present = Math.min(
              stuDays,
              Math.max(
                0,
                Number(att.marksPresent ?? att.daysPresent ?? 0)
              )
            );

            const absent = stuDays - present;

            return {
              studentId: att.studentId,
              admissionNumber: att.admissionNumber,
              studentName: att.studentName,
              totalSchoolDays: stuDays,
              marksPresent: present,
              marksAbsent: absent,
              daysPresent: present,
              daysAbsent: absent,
              classTeacherComment: cmt?.classTeacherComment || '',
              headTeacherComment: cmt?.headTeacherComment || '',
              promotionStatus: cmt?.promotionStatus || 'Promoted',
            };
          }
        );

        setRows(combined);
      }
    } catch (error) {
      console.error('Data load error:', error);
      setNotification('Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  }, [selectedSession, selectedTerm, selectedClass]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Change the total school days for the term.
  const handleTermTotalDaysChange = (newDays: number) => {
    const validDays = Math.min(365, Math.max(1, Number(newDays) || 1));
    setTermTotalDays(validDays);
  };

  // Apply the term's total days to all pupils.
  const handleApplyDaysToAll = () => {
    const updated = rows.map((r) => {
      const newTotal = termTotalDays;

      const present = Math.min(
        newTotal,
        Math.round(
          (r.daysPresent / Math.max(1, r.totalSchoolDays)) * newTotal
        )
      );

      const absent = newTotal - present;

      return {
        ...r,
        totalSchoolDays: newTotal,
        marksPresent: present,
        marksAbsent: absent,
        daysPresent: present,
        daysAbsent: absent,
      };
    });

    setRows(updated);
    setNotification(
      `Applied ${termTotalDays} total school days to all pupils.`
    );
  };

  // Mark every pupil present for all school days.
  const handleMarkAllFull = () => {
    const updated = rows.map((r) => ({
      ...r,
      marksPresent: r.totalSchoolDays,
      marksAbsent: 0,
      daysPresent: r.totalSchoolDays,
      daysAbsent: 0,
    }));

    setRows(updated);
    setNotification('All pupils have been marked fully present.');
  };

  // Change an individual pupil's total school days.
  const handleStudentTotalDaysChange = (
    index: number,
    newTotalDays: number
  ) => {
    const validDays = Math.min(
      365,
      Math.max(1, Number(newTotalDays) || 1)
    );

    setRows((previous) =>
      previous.map((r, i) => {
        if (i !== index) return r;

        const present = Math.min(r.daysPresent, validDays);
        const absent = validDays - present;

        return {
          ...r,
          totalSchoolDays: validDays,
          marksPresent: present,
          marksAbsent: absent,
          daysPresent: present,
          daysAbsent: absent,
        };
      })
    );
  };

  // Enter the number of days an individual pupil attended.
  const handleDaysPresentChange = (index: number, value: number) => {
    setRows((previous) =>
      previous.map((r, i) => {
        if (i !== index) return r;

        const present = Math.min(
          r.totalSchoolDays,
          Math.max(0, Number.isFinite(value) ? Math.floor(value) : 0)
        );

        const absent = r.totalSchoolDays - present;

        return {
          ...r,
          marksPresent: present,
          marksAbsent: absent,
          daysPresent: present,
          daysAbsent: absent,
        };
      })
    );
  };

  // Quick attendance options for an individual pupil.
  const handleQuickStudentAttendance = (
    index: number,
    action: 'full' | 'minus1' | 'minus2'
  ) => {
    setRows((previous) =>
      previous.map((r, i) => {
        if (i !== index) return r;

        let present = r.daysPresent;

        if (action === 'full') {
          present = r.totalSchoolDays;
        } else if (action === 'minus1') {
          present = Math.max(0, present - 1);
        } else if (action === 'minus2') {
          present = Math.max(0, present - 2);
        }

        const absent = r.totalSchoolDays - present;

        return {
          ...r,
          marksPresent: present,
          marksAbsent: absent,
          daysPresent: present,
          daysAbsent: absent,
        };
      })
    );
  };

  const handleCommentChange = (
    index: number,
    field:
      | 'classTeacherComment'
      | 'headTeacherComment'
      | 'promotionStatus',
    val: string
  ) => {
    setRows((previous) =>
      previous.map((r, i) => {
        if (i !== index) return r;

        if (field === 'promotionStatus') {
          return { ...r, promotionStatus: val as PromotionStatus };
        }

        return { ...r, [field]: val };
      })
    );
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setNotification(null);

      const attPayload = {
        sessionId: selectedSession,
        termId: selectedTerm,
        classId: selectedClass,
        termTotalDays,
        records: rows.map((r) => ({
          studentId: r.studentId,
          totalSchoolDays: r.totalSchoolDays,
          marksPresent: r.daysPresent,
          daysPresent: r.daysPresent,
        })),
      };

      const cmtPayload = {
        sessionId: selectedSession,
        termId: selectedTerm,
        classId: selectedClass,
        comments: rows.map((r) => ({
          studentId: r.studentId,
          classTeacherComment: r.classTeacherComment,
          headTeacherComment: r.headTeacherComment,
          promotionStatus: r.promotionStatus,
        })),
      };

      const [attRes, cmtRes] = await Promise.all([
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

      if (!attRes.ok || !cmtRes.ok) {
        throw new Error('One or more records could not be saved.');
      }

      setNotification(
        `Attendance and comments saved successfully! (${termTotalDays} school days, 1 mark per day).`
      );

      await loadData();
    } catch (error) {
      console.error('Save records error:', error);
      setNotification(
        error instanceof Error ? error.message : 'Failed to save records.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              <span>Attendance &amp; Teacher Comments</span>
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Editable school days &bull; 1 mark per school day &bull; Class
              and Head Teacher Remarks.
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

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Academic Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {terms
                .filter((t) => t.sessionId === selectedSession)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Editable Term Days Configuration */}
        <div className="mt-5 pt-4 border-t border-slate-100 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <label className="text-xs font-bold text-slate-800">
                Total School Days for Term:
              </label>
            </div>

            <div className="flex items-center space-x-1.5">
              <input
                type="number"
                min="1"
                max="365"
                value={termTotalDays}
                onChange={(e) =>
                  handleTermTotalDaysChange(Number(e.target.value))
                }
                className="w-18 bg-white border border-indigo-300 rounded-lg px-2 py-1 text-xs font-black text-indigo-700 text-center shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="text-xs font-semibold text-slate-600">
                Days
              </span>
            </div>

            <div className="hidden sm:inline-block h-4 w-px bg-indigo-200" />

            <div className="flex items-center gap-2 text-xs text-indigo-900 font-medium">
              <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[11px] font-bold">
                1 Mark / Day
              </span>
              <span>
                Total Possible Marks:{' '}
                <strong className="text-indigo-900 font-black">
                  {termTotalDays}
                </strong>
              </span>
            </div>
          </div>

          {/* Quick Class Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleApplyDaysToAll}
              className="text-xs bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
              title="Apply this total school days count to all pupils"
            >
              Apply Days to All
            </button>

            <button
              type="button"
              onClick={handleMarkAllFull}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center space-x-1"
              title="Set full attendance for all pupils"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark All Full (100%)</span>
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Students List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          Loading records...
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-slate-400 text-xs border border-slate-200">
          No students registered in this class. Register pupils from the
          Students tab to record attendance and comments.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, idx) => (
            <div
              key={row.studentId}
              className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4"
            >
              {/* Pupil Information and Attendance */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 border-b border-slate-100 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {row.studentName}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      {row.admissionNumber}
                    </span>
                  </div>
                </div>

                {/* One Mark Per Day Attendance Controls */}
                <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  {/* Total Days */}
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500 text-[11px] font-medium">
                      Total Days:
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={row.totalSchoolDays}
                      onChange={(e) =>
                        handleStudentTotalDaysChange(
                          idx,
                          Number(e.target.value)
                        )
                      }
                      className="w-14 text-center font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800"
                      title="Editable total school days for this pupil"
                    />
                  </div>

                  <span className="text-slate-300">|</span>

                  {/* Days Present */}
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                    <span className="text-emerald-800 font-semibold text-[11px]">
                      Days Present:
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={row.totalSchoolDays}
                      step="1"
                      value={row.daysPresent}
                      onChange={(e) =>
                        handleDaysPresentChange(idx, Number(e.target.value))
                      }
                      className="w-14 text-center font-black bg-white border border-emerald-300 rounded px-1 py-1 text-emerald-900 text-xs"
                      title="Enter the number of days this pupil attended"
                    />
                    <span className="text-[10px] text-emerald-700 font-medium">
                      / {row.totalSchoolDays}
                    </span>
                  </div>

                  {/* Attendance Summary */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Days Absent
                      </span>
                      <strong className="text-rose-600 font-black">
                        {row.daysAbsent}
                      </strong>
                    </div>

                    <div className="text-right pl-3 border-l border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Total Marks
                      </span>
                      <strong className="text-indigo-700 font-black">
                        {row.marksPresent}/{row.totalSchoolDays}
                      </strong>
                    </div>
                  </div>

                  {/* Quick Attendance Buttons */}
                  <div className="flex items-center flex-wrap gap-1 pl-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickStudentAttendance(idx, 'full')
                      }
                      className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-semibold text-[10px] transition-colors"
                      title="Set full attendance"
                    >
                      Full
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleQuickStudentAttendance(idx, 'minus1')
                      }
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded font-semibold text-[10px] transition-colors"
                      title="Reduce attendance by one day"
                    >
                      -1 day
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleQuickStudentAttendance(idx, 'minus2')
                      }
                      className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded font-semibold text-[10px] transition-colors"
                      title="Reduce attendance by two days"
                    >
                      -2 days
                    </button>
                  </div>
                </div>
              </div>

              {/* Comments and Promotion Status */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                {/* Class Teacher Comment */}
                <div className="lg:col-span-5 space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Class Teacher&apos;s Remark</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Official Report Card Comment
                    </span>
                  </label>

                  <textarea
                    rows={2}
                    value={row.classTeacherComment}
                    onChange={(e) =>
                      handleCommentChange(
                        idx,
                        'classTeacherComment',
                        e.target.value
                      )
                    }
                    placeholder="Enter customized remark for this pupil..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />

                  <div className="flex flex-wrap gap-1.5">
                    {TEACHER_COMMENT_PRESETS.slice(0, 3).map(
                      (preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() =>
                            handleCommentChange(
                              idx,
                              'classTeacherComment',
                              preset
                            )
                          }
                          className="text-[10px] bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 px-2 py-0.5 rounded border border-slate-200 transition-colors truncate max-w-[200px]"
                          title={preset}
                        >
                          + {preset}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Head Teacher Comment */}
                <div className="lg:col-span-5 space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Head Teacher&apos;s Endorsement</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Principal/Head Remarks
                    </span>
                  </label>

                  <textarea
                    rows={2}
                    value={row.headTeacherComment}
                    onChange={(e) =>
                      handleCommentChange(
                        idx,
                        'headTeacherComment',
                        e.target.value
                      )
                    }
                    placeholder="Enter head teacher endorsement..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />

                  <div className="flex flex-wrap gap-1.5">
                    {HEAD_TEACHER_PRESETS.slice(0, 2).map(
                      (preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() =>
                            handleCommentChange(
                              idx,
                              'headTeacherComment',
                              preset
                            )
                          }
                          className="text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 px-2 py-0.5 rounded border border-slate-200 transition-colors truncate max-w-[200px]"
                          title={preset}
                        >
                          + {preset}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Promotion Status */}
                <div className="lg:col-span-2 space-y-1.5">
                  <label className="font-bold text-slate-700 block">
                    Promotion Status
                  </label>

                  <select
                    value={row.promotionStatus}
                    onChange={(e) =>
                      handleCommentChange(
                        idx,
                        'promotionStatus',
                        e.target.value
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900"
                  >
                    <option value="Promoted">Promoted</option>
                    <option value="Promoted on Trial">
                      Promoted on Trial
                    </option>
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
