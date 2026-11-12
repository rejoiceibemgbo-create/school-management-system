
'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  Download,
  Printer,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  AcademicSession,
  AcademicTerm,
  SchoolClass,
  Subject,
} from '@/lib/types';

export default function BroadsheetView() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const [broadsheetData, setBroadsheetData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch sessions, terms and classes
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
            sessData.sessions.find((s: any) => s.isCurrent) ||
            sessData.sessions[0];

          if (activeSess) {
            setSelectedSession(activeSess.id);
          }
        }

        if (sessData.terms) {
          setTerms(sessData.terms);

          const activeTerm =
            sessData.terms.find((t: any) => t.isCurrent) ||
            sessData.terms[0];

          if (activeTerm) {
            setSelectedTerm(activeTerm.id);
          }
        }

        if (clsData.classes) {
          setClasses(clsData.classes);

          if (clsData.classes.length > 0) {
            setSelectedClass(clsData.classes[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
      }
    };

    fetchMetadata();
  }, []);

  // Load broadsheet data
  const loadBroadsheet = async () => {
    if (!selectedSession || !selectedTerm || !selectedClass) {
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `/api/broadsheet?classId=${selectedClass}&sessionId=${selectedSession}&termId=${selectedTerm}`
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        console.error('Broadsheet loading error:', data.error);
        setBroadsheetData(null);
        return;
      }

      setBroadsheetData(data);
    } catch (err) {
      console.error('Error loading broadsheet:', err);
      setBroadsheetData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBroadsheet();
  }, [selectedSession, selectedTerm, selectedClass]);

  // Print broadsheet
  const handlePrint = () => {
    window.print();
  };

  // Export broadsheet to Excel
  const handleExportExcel = () => {
    if (
      !broadsheetData ||
      !Array.isArray(broadsheetData.rows) ||
      broadsheetData.rows.length === 0
    ) {
      alert('No broadsheet data to export.');
      return;
    }

    const subjects: Subject[] = broadsheetData.subjects || [];

    const excelRows = broadsheetData.rows.map((r: any) => {
      const rowObj: any = {
        Position: r.position,
        'Admission Number': r.admissionNumber,
        'Student Name': r.studentName,
        Gender: r.gender || '',
      };

      subjects.forEach((sub) => {
        rowObj[sub.name] = r.subjectScores?.[sub.id] ?? '-';
      });

      rowObj['Total Score'] = r.totalScore;
      rowObj['Average %'] = r.averageScore;
      rowObj['Grade'] = r.overallGrade;
      rowObj['Passed'] = r.passedCount;
      rowObj['Failed'] = r.failedCount;

      return rowObj;
    });

    // Create Excel worksheet
    const ws = XLSX.utils.json_to_sheet(excelRows);

    // Create Excel workbook
    const wb = XLSX.utils.book_new();

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Broadsheet');

    const className = String(
      broadsheetData.className || 'Class'
    ).replace(/\s+/g, '_');

    const termName = String(
      broadsheetData.termName || 'Term'
    ).replace(/\s+/g, '_');

    const filename = `Broadsheet_${className}_${termName}.xlsx`;

    // Download Excel file
    XLSX.writeFile(wb, filename);
  };

  // Format student position
  const formatOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;

    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const rows = broadsheetData?.rows || [];
  const subjects: Subject[] = broadsheetData?.subjects || [];

  const stats = broadsheetData?.statistics || {
    totalStudents: 0,
    classAverage: 0,
    overallPassRate: 0,
    highestAverage: 0,
    lowestAverage: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <span>Class Result Summary (Master Broadsheet)</span>
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive ranking and master performance sheet for all students in the class.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-auto">
            <button
              onClick={handleExportExcel}
              disabled={rows.length === 0}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={rows.length === 0}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print Broadsheet</span>
            </button>
          </div>
        </div>

        {/* Filters */}
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
      </div>

      {/* Class KPI Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 no-print">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 sm:p-3.5 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
            Total Pupils
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {stats.totalStudents}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 sm:p-3.5 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
            Class Average
          </span>
          <p className="text-xl font-bold text-indigo-600 mt-1">
            {stats.classAverage}%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 sm:p-3.5 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
            Highest Average
          </span>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {stats.highestAverage}%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 sm:p-3.5 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
            Lowest Average
          </span>
          <p className="text-xl font-bold text-rose-600 mt-1">
            {stats.lowestAverage}%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 sm:p-3.5 text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
            Class Pass Rate
          </span>
          <p className="text-xl font-bold text-teal-600 mt-1">
            {stats.overallPassRate}%
          </p>
        </div>
      </div>

      {/* Broadsheet Print Header */}
      <div className="hidden print:block text-center pb-4 border-b border-black mb-4">
        <h1 className="text-xl font-black uppercase tracking-wide">
          {broadsheetData?.school?.name || 'HAPPY HOME EDUCATIONAL CENTRE'}
        </h1>

        <p className="text-xs uppercase font-medium">
          {broadsheetData?.school?.address}
        </p>

        <p className="text-sm font-bold uppercase mt-1">
          OFFICIAL MASTER RESULT BROADSHEET &mdash; {broadsheetData?.className} ({broadsheetData?.sessionName} &bull; {broadsheetData?.termName})
        </p>
      </div>

      {/* Master Broadsheet Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden broadsheet-print-container">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Compiling class master broadsheet...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs px-4">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            No registered pupils or score records in this class.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b-2 border-slate-300 text-slate-800 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2 text-center w-12 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                    Pos.
                  </th>

                  <th className="py-3 px-3 min-w-[170px] sticky left-12 bg-slate-100 z-10 border-r border-slate-200">
                    Pupil Name &amp; No.
                  </th>

                  <th className="py-3 px-2 text-center w-12 border-r border-slate-200">
                    Gen
                  </th>

                  {/* Subject Columns */}
                  {subjects.map((s) => (
                    <th
                      key={s.id}
                      className="py-3 px-2 text-center min-w-[50px] border-r border-slate-200"
                      title={s.name}
                    >
                      <span className="truncate block font-mono">
                        {s.code}
                      </span>
                    </th>
                  ))}

                  <th className="py-3 px-2 text-center w-16 bg-indigo-50 font-black border-r border-slate-200">
                    Total
                  </th>

                  <th className="py-3 px-2 text-center w-16 bg-blue-50 font-black border-r border-slate-200">
                    Avg %
                  </th>

                  <th className="py-3 px-2 text-center w-12 bg-slate-50 font-black border-r border-slate-200">
                    Grd
                  </th>

                  <th className="py-3 px-2 text-center w-12 text-emerald-700">
                    Pass
                  </th>

                  <th className="py-3 px-2 text-center w-12 text-rose-700">
                    Fail
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((row: any) => {
                  return (
                    <tr
                      key={row.studentId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        row.position === 1
                          ? 'bg-amber-50/30'
                          : row.position === 2
                            ? 'bg-slate-50/50'
                            : row.position === 3
                              ? 'bg-orange-50/20'
                              : ''
                      }`}
                    >
                      {/* Position */}
                      <td className="py-2.5 px-2 text-center font-bold sticky left-0 bg-white z-10 border-r border-slate-200">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-black ${
                            row.position === 1
                              ? 'bg-amber-400 text-amber-950 shadow-2xs'
                              : row.position === 2
                                ? 'bg-slate-300 text-slate-900'
                                : row.position === 3
                                  ? 'bg-orange-300 text-orange-950'
                                  : 'text-slate-600'
                          }`}
                        >
                          {formatOrdinal(row.position)}
                        </span>
                      </td>

                      {/* Name & Admission Number */}
                      <td className="py-2.5 px-3 sticky left-12 bg-white z-10 border-r border-slate-200">
                        <p className="font-bold text-slate-900 truncate max-w-[160px]">
                          {row.studentName}
                        </p>

                        <p className="text-[10px] text-slate-400 font-mono">
                          {row.admissionNumber}
                        </p>
                      </td>

                      {/* Gender */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-200 text-slate-500 font-medium text-[11px]">
                        {row.gender?.charAt(0) || '—'}
                      </td>

                      {/* Subject Scores */}
                      {subjects.map((s) => {
                        const score = row.subjectScores?.[s.id];
                        const isScorePass =
                          score !== undefined &&
                          score !== null &&
                          score >= 40;

                        return (
                          <td
                            key={s.id}
                            className={`py-2 px-1 text-center font-mono border-r border-slate-100 ${
                              score === undefined || score === null
                                ? 'text-slate-300'
                                : isScorePass
                                  ? 'font-medium text-slate-800'
                                  : 'font-bold text-rose-600 bg-rose-50/30'
                            }`}
                          >
                            {score ?? '—'}
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900 bg-indigo-50/50 border-r border-slate-200">
                        {row.totalScore}
                      </td>

                      {/* Average */}
                      <td className="py-2.5 px-2 text-center font-mono font-black text-indigo-700 bg-blue-50/50 border-r border-slate-200">
                        {row.averageScore}%
                      </td>

                      {/* Grade */}
                      <td className="py-2.5 px-2 text-center font-bold border-r border-slate-200">
                        <span
                          className={`inline-block w-6 py-0.5 rounded text-[11px] font-black ${
                            row.overallGrade === 'A'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.overallGrade === 'B'
                                ? 'bg-blue-100 text-blue-800'
                                : row.overallGrade === 'C'
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : row.overallGrade === 'D'
                                    ? 'bg-amber-100 text-amber-800'
                                    : row.overallGrade === 'E'
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {row.overallGrade}
                        </span>
                      </td>

                      {/* Passed & Failed counts */}
                      <td className="py-2.5 px-2 text-center font-bold text-emerald-700">
                        {row.passedCount}
                      </td>

                      <td className="py-2.5 px-2 text-center font-bold text-rose-600">
                        {row.failedCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
