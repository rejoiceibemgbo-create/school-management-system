'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  FileText,
  Printer,
  Download,
  Filter,
  CheckSquare,
  Square,
  User as UserIcon,
  AlertCircle,
  Sparkles,
  Award,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { AcademicSession, AcademicTerm, SchoolClass, StudentReportSummary, School } from '@/lib/types';

export default function ReportCardView() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Mode: 'single' (individual view) or 'bulk' (all students)
  const [viewMode, setViewMode] = useState<'single' | 'bulk'>('single');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);

  const [reportCards, setReportCards] = useState<StudentReportSummary[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [metaInfo, setMetaInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Load initial dropdowns
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

  // Fetch report cards
  const loadReports = async () => {
    if (!selectedSession || !selectedTerm || !selectedClass) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/report-card?classId=${selectedClass}&sessionId=${selectedSession}&termId=${selectedTerm}`);
      const data = await res.json();
console.log('REPORT CARD STATUS:', res.status);
console.log('REPORT CARD DATA:', JSON.stringify(data, null, 2));

     if (!res.ok) {
  throw new Error(data.error || 'Failed to load report cards');
}

if (data.reportCards) {
  // Save the report cards received from the API
  setReportCards(data.reportCards);

  // Save school information
  setSchool(data.school || null);

  // Save academic information
  setMetaInfo({
    sessionName: data.sessionName,
    termName: data.termName,
    nextTermBegins: data.nextTermBegins,
    totalSchoolDays: data.totalSchoolDays,
    gradingScale: data.gradingScale,
  });

  if (data.reportCards.length > 0) {
    if (
      !selectedStudentId ||
      !data.reportCards.some(
        (r: any) => r.student.id === selectedStudentId
      )
    ) {
      setSelectedStudentId(data.reportCards[0].student.id);
    }

    setSelectedBulkIds(
      data.reportCards.map((r: any) => r.student.id)
    );
  } else {
    setSelectedStudentId('');
    setSelectedBulkIds([]);
  }
}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedSession, selectedTerm, selectedClass]);

  const formatOrdinal = (n: number) => {
    if (!n || n === 0) return '—';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Browser Print (Individual or Entire Class with CSS A4 Page Breaks)
  const handleBrowserPrint = () => {
    window.print();
  };

  // Generate and Download PDF using jsPDF
  const handleDownloadPDF = async (singleOnly: boolean = false) => {
    const element = printContainerRef.current;

    if (!element) {
      alert('Report card container was not found. Please refresh and try again.');
      return;
    }

    try {
      setGeneratingPdf(true);

      const cardsToRender = singleOnly
        ? reportCards.filter(r => r.student.id === selectedStudentId)
        : reportCards.filter(r => selectedBulkIds.includes(r.student.id));

      if (cardsToRender.length === 0) {
        alert('No report cards selected.');
        return;
      }

      // Only capture the report cards currently displayed in the selected view.
      const cardElements = Array.from(
        element.querySelectorAll<HTMLElement>('.single-report-card')
      );

      if (cardElements.length === 0) {
        throw new Error('No report cards are currently displayed. Please wait for them to load and try again.');
      }

      if (cardElements.length !== cardsToRender.length) {
        throw new Error(
          `The number of displayed report cards (${cardElements.length}) does not match the selected pupils (${cardsToRender.length}). Please try again.`
        );
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      for (let i = 0; i < cardElements.length; i++) {
        const cardEl = cardElements[i];

        // Wait for report-card images to finish loading before capturing.
        const images = Array.from(cardEl.querySelectorAll('img'));

        await Promise.all(
          images.map(async image => {
            if (!image.complete) {
              await new Promise<void>(resolve => {
                const finish = () => resolve();
                image.addEventListener('load', finish, { once: true });
                image.addEventListener('error', finish, { once: true });
              });
            }

            if (image.decode) {
              try {
                await image.decode();
              } catch {
                // An unavailable image should not stop the report from downloading.
              }
            }
          })
        );

        const canvas = await html2canvas(cardEl, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          imageTimeout: 15000,
          windowWidth: Math.max(cardEl.scrollWidth, cardEl.offsetWidth),
          windowHeight: Math.max(cardEl.scrollHeight, cardEl.offsetHeight),
          scrollX: 0,
          scrollY: 0,
        });

        if (!canvas.width || !canvas.height) {
          throw new Error(`Could not capture report card ${i + 1}.`);
        }

        const imageData = canvas.toDataURL('image/jpeg', 0.95);

        // Fit the complete report card inside one A4 page without cropping it.
        const widthRatio = usableWidth / canvas.width;
        const heightRatio = usableHeight / canvas.height;
        const scale = Math.min(widthRatio, heightRatio);

        const imageWidth = canvas.width * scale;
        const imageHeight = canvas.height * scale;
        const x = (pageWidth - imageWidth) / 2;
        const y = margin + (usableHeight - imageHeight) / 2;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          imageData,
          'JPEG',
          x,
          y,
          imageWidth,
          imageHeight,
          undefined,
          'FAST'
        );
      }

      const targetName = singleOnly && cardsToRender[0]
        ? `${cardsToRender[0].student.lastName}_${cardsToRender[0].student.firstName}`
        : `${classes.find(c => c.id === selectedClass)?.name || 'Class'}_Report_Cards`;

      const safeTargetName = targetName.replace(/[<>:"/\\|?*]/g, '_');
      const safeTermName = String(metaInfo.termName || 'Term').replace(/[<>:"/\\|?*]/g, '_');

      pdf.save(`${safeTargetName}_${safeTermName}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);

      const message = err instanceof Error ? err.message : String(err);
      alert(
        `Could not generate PDF: ${message}\n\nPlease try the Print button and choose "Save as PDF".`
      );
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Toggle selection for bulk printing
  const handleToggleBulkSelect = (id: string) => {
    setSelectedBulkIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllBulk = () => {
    if (selectedBulkIds.length === reportCards.length) {
      setSelectedBulkIds([]);
    } else {
      setSelectedBulkIds(reportCards.map(r => r.student.id));
    }
  };

  const activeReports = viewMode === 'single'
    ? reportCards.filter(r => r.student.id === selectedStudentId)
    : reportCards.filter(r => selectedBulkIds.includes(r.student.id));

  const currentClassObj = classes.find(c => c.id === selectedClass);

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Official Student Report Cards</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              School-branded academic report cards with conduct ratings, teacher remarks, signatures, and A4 print layout.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => handleDownloadPDF(viewMode === 'single')}
              disabled={loading || activeReports.length === 0 || generatingPdf}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>{generatingPdf ? 'Generating PDF...' : viewMode === 'single' ? 'Download PDF' : `Download All (${activeReports.length})`}</span>
            </button>

            <button
              onClick={handleBrowserPrint}
              disabled={loading || activeReports.length === 0}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{viewMode === 'single' ? 'Print Report Card' : `Print All Class (${activeReports.length})`}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
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

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              View Mode
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`py-1 text-xs font-semibold rounded-md transition-colors ${viewMode === 'single' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setViewMode('bulk')}
                className={`py-1 text-xs font-semibold rounded-md transition-colors ${viewMode === 'bulk' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
              >
                Class (Bulk)
              </button>
            </div>
          </div>
        </div>
        {/* Secondary Selector Row */}
        {viewMode === 'single' ? (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <label className="font-semibold text-slate-700 whitespace-nowrap">Select Pupil:</label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="w-full sm:max-w-md bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {reportCards.map(r => (
                <option key={r.student.id} value={r.student.id}>
                  {r.student.lastName} {r.student.firstName} ({r.student.admissionNumber}) — Position: {formatOrdinal(r.classPosition)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSelectAllBulk}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-300"
              >
                {selectedBulkIds.length === reportCards.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Select All ({reportCards.length})</span>
              </button>
              <span className="text-slate-500 text-[11px]">
                {selectedBulkIds.length} of {reportCards.length} pupils selected for print/download
              </span>
            </div>

            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {reportCards.map(r => {
                const isSelected = selectedBulkIds.includes(r.student.id);
                return (
                  <button
                    key={r.student.id}
                    onClick={() => handleToggleBulkSelect(r.student.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${isSelected
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                  >
                    {r.student.lastName} {r.student.firstName.charAt(0)}.
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Report Cards Preview Container */}
      <div ref={printContainerRef} className="space-y-8 report-card-container">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200 no-print">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Generating official student report cards...
          </div>
        ) : activeReports.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200 px-4 no-print">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-bold text-slate-800 text-sm">No report cards available for the selected pupils</p>
            <p className="text-slate-400 mt-1">Please register students and enter scores in the Score Entry module first.</p>
          </div>
        ) : (
          activeReports.map((report, cardIdx) => {
            const { student, className, scores, conduct, attendance, comments, totalMarksObtained, totalPossibleMarks, averageScore, overallGrade, overallRemark, subjectsPassed, subjectsFailed, classPosition, totalStudentsInClass, classAverage } = report;

            return (
              <div key={student.id} className="overflow-x-auto w-full pb-4 print:overflow-visible">
                <div
                  className="single-report-card page-break bg-white border border-slate-300 shadow-md rounded-xl p-5 sm:p-8 min-w-[650px] sm:min-w-0 max-w-[850px] mx-auto text-slate-900 transition-all print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:min-w-0"
                  style={{ minHeight: '1050px' }}
                >
                  {/* 1. School Header */}
                  <div className="border-b-2 border-indigo-900 pb-3 flex items-center justify-between gap-4">
                    <div className="w-20 h-20 relative shrink-0 rounded-full overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50">
                      {school?.logoUrl ? (
                        <img
                          src={school.logoUrl}
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-indigo-700 text-xs">
                          LOGO
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center">
                      <h1 className="text-xl sm:text-2xl font-black text-indigo-950 uppercase tracking-tight">
                        {school?.name || 'HAPPY HOME EDUCATIONAL CENTRE'}
                      </h1>
                      <p className="text-xs font-semibold text-indigo-800 italic mt-0.5">
                        &ldquo;{school?.motto || 'Excellence, Integrity and Wisdom'}&rdquo;
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{school?.address}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Tel: {school?.phone} &bull; Email: {school?.email}
                      </p>
                    </div>

                    <div className="w-20 shrink-0 text-center text-[10px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg p-1.5 hidden sm:block">
                      <p className="uppercase text-[9px] text-indigo-600">Official Report</p>
                      <p className="mt-0.5 font-black">{metaInfo.termName}</p>
                      <p className="text-[9px] text-slate-500">{metaInfo.sessionName}</p>
                    </div>
                  </div>

                  {/* Report Card Title Strip */}
                  <div className="bg-indigo-900 text-white text-center py-1 mt-2 rounded font-bold text-xs uppercase tracking-wider">
                    Continuous Assessment & Terminal Examination Report
                  </div>

                  {/* 2. Pupil Details Strip */}
                  <div className="grid grid-cols-12 gap-2 my-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    {/* Student Photo */}
                    <div className="col-span-3 sm:col-span-2 flex items-center justify-center">
                      <div className="w-16 h-18 bg-white border border-slate-300 rounded overflow-hidden flex items-center justify-center text-slate-400 font-bold text-sm shadow-2xs">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt="Pupil" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                    </div>

                    {/* Pupil Bio */}
                    <div className="col-span-9 sm:col-span-6 space-y-1">
                      <p className="text-sm font-bold text-slate-900 uppercase">
                        {student.lastName} {student.firstName} {student.middleName || ''}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Admission No: <strong className="font-mono text-slate-900">{student.admissionNumber}</strong>
                      </p>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-600">
                        <span>Gender: <strong>{student.gender}</strong></span>
                        <span>DOB: <strong>{student.dateOfBirth}</strong></span>
                      </div>
                    </div>

                    {/* Class & Academic Context */}
                    <div className="col-span-12 sm:col-span-4 bg-white p-2 rounded border border-slate-200 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Class:</span>
                        <strong className="text-slate-900">{className}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Session / Term:</span>
                        <strong>{metaInfo.sessionName} &bull; {metaInfo.termName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Class Size:</span>
                        <strong>{totalStudentsInClass} pupils</strong>
                      </div>
                    </div>
                  </div>

                  {/* 3. Academic Scores Table */}
                  <div className="overflow-x-auto mb-3">
                    <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 font-bold uppercase text-[10px]">
                          <th className="p-1.5 border border-slate-300 w-6 text-center">#</th>
                          <th className="p-1.5 border border-slate-300">Subject</th>
                          <th className="p-1.5 border border-slate-300 text-center w-12 bg-indigo-50/50">HW (10)</th>
                          <th className="p-1.5 border border-slate-300 text-center w-12 bg-indigo-50/50">T1 (10)</th>
                          <th className="p-1.5 border border-slate-300 text-center w-12 bg-indigo-50/50">T2 (20)</th>
                          <th className="p-1.5 border border-slate-300 text-center w-14 bg-blue-50 font-black">CA (40)</th>
                          <th className="p-1.5 border border-slate-300 text-center w-14 bg-purple-50">Exam (60)</th>
                          <th className="p-1.5 border border-slate-300 text-center w-16 bg-emerald-50 font-black">Total (100)</th>
                          <th className="p-1.5 border border-slate-300 text-center w-10">Grade</th>
                          <th className="p-1.5 border border-slate-300">Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scores.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="p-4 text-center text-slate-400 italic">
                              No subject marks recorded for this pupil yet.
                            </td>
                          </tr>
                        ) : (
                          scores.map((sc, scIdx) => (
                            <tr key={sc.id} className="hover:bg-slate-50">
                              <td className="p-1 border border-slate-300 text-center font-mono text-[10px] text-slate-400">{scIdx + 1}</td>
                              <td className="p-1 border border-slate-300 font-semibold text-slate-900">{sc.subjectName}</td>
                              <td className="p-1 border border-slate-300 text-center font-mono">{sc.homework}</td>
                              <td className="p-1 border border-slate-300 text-center font-mono">{sc.test1}</td>
                              <td className="p-1 border border-slate-300 text-center font-mono">{sc.test2}</td>
                              <td className="p-1 border border-slate-300 text-center font-mono font-bold bg-blue-50/50 text-blue-900">{sc.caTotal}</td>
                              <td className="p-1 border border-slate-300 text-center font-mono">{sc.exam}</td>
                              <td className="p-1 border border-slate-300 text-center font-mono font-black bg-emerald-50/50 text-slate-900">{sc.overallTotal}</td>
                              <td className="p-1 border border-slate-300 text-center font-black">
                                <span className={`inline-block px-1 rounded text-[10px] ${sc.grade === 'A' ? 'text-emerald-800' :
                                  sc.grade === 'B' ? 'text-blue-800' :
                                    sc.grade === 'C' ? 'text-cyan-800' :
                                      sc.grade === 'D' ? 'text-amber-800' :
                                        sc.grade === 'E' ? 'text-orange-800' : 'text-rose-700'
                                  }`}>
                                  {sc.grade}
                                </span>
                              </td>
                              <td className="p-1 border border-slate-300 text-[10px] font-medium">{sc.remark}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 4. Performance Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-50 border border-slate-300 rounded p-2 text-center text-xs mb-3">
                    <div className="border-r border-slate-200">
                      <span className="text-[9px] text-slate-500 uppercase font-semibold block">Total Marks</span>
                      <strong className="text-slate-900 font-mono text-sm">{totalMarksObtained} <span className="text-[10px] font-normal text-slate-400">/ {totalPossibleMarks}</span></strong>
                    </div>
                    <div className="border-r border-slate-200">
                      <span className="text-[9px] text-slate-500 uppercase font-semibold block">Average Score</span>
                      <strong className="text-indigo-700 font-mono text-sm">{averageScore}%</strong>
                    </div>
                    <div className="border-r border-slate-200">
                      <span className="text-[9px] text-slate-500 uppercase font-semibold block">Overall Grade</span>
                      <strong className="text-emerald-700 text-sm">{overallGrade}</strong>
                    </div>
                    <div className="border-r border-slate-200">
                      <span className="text-[9px] text-slate-500 uppercase font-semibold block">Class Position</span>
                      <strong className="text-amber-700 text-sm">{formatOrdinal(classPosition)}</strong>
                    </div>
                    <div className="border-r border-slate-200">
                      <span className="text-[9px] text-slate-500 uppercase font-semibold block">Class Average</span>
                      <strong className="text-slate-700 font-mono text-sm">{classAverage}%</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-semibold block">Passed / Failed</span>
                      <strong className="text-slate-900 text-xs">{subjectsPassed} P <span className="text-slate-400">|</span> <span className="text-rose-600">{subjectsFailed} F</span></strong>
                    </div>
                  </div>

                  {/* 5. General Conduct & Observable Behaviours Matrix */}
                  <div className="border border-slate-300 rounded p-2.5 mb-3 text-xs bg-white">
                    <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 pb-1">
                      <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-800">
                        General Conduct & Observable Behaviours (1 &mdash; 5)
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Rating Key: 5 = Excellent, 4 = Very Good, 3 = Good, 2 = Fair, 1 = Poor
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-1 text-[11px]">
                      {[
                        { label: 'Punctuality', val: conduct?.punctuality ?? 4 },
                        { label: 'Regularity', val: conduct?.regularity ?? 4 },
                        { label: 'Neatness', val: conduct?.neatness ?? 4 },
                        { label: 'Honesty', val: conduct?.honesty ?? 4 },
                        { label: 'Obedience', val: conduct?.obedience ?? 4 },
                        { label: 'Respect', val: conduct?.respect ?? 4 },
                        { label: 'Participation', val: conduct?.participation ?? 4 },
                        { label: 'Cooperation', val: conduct?.cooperation ?? 4 },
                        { label: 'Leadership', val: conduct?.leadership ?? 4 },
                        { label: 'Responsibility', val: conduct?.responsibility ?? 4 },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-0.5 border-b border-slate-100">
                          <span className="text-slate-600">{item.label}:</span>
                          <span className="font-black font-mono text-indigo-900 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                            {item.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6. Attendance & Next Term Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
                    {/* Attendance */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1">
                      <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block">Term Attendance</span>
                      <div className="flex justify-between text-[11px]">
                        <span>Total School Days:</span>
                        <strong>{attendance?.totalSchoolDays || metaInfo.totalSchoolDays || 60}</strong>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Days Present:</span>
                        <strong className="text-emerald-700">{attendance?.daysPresent ?? 60}</strong>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Days Absent:</span>
                        <strong className="text-rose-600">{attendance?.daysAbsent ?? 0}</strong>
                      </div>
                    </div>

                    {/* Resumption & Promotion */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1">
                      <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block">Terminal Advancement</span>
                      <div className="flex justify-between text-[11px]">
                        <span>Next Term Resumes:</span>
                        <strong className="text-indigo-800">{metaInfo.nextTermBegins || 'To be announced'}</strong>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Promotion Status:</span>
                        <strong className="text-emerald-700 font-bold">{comments?.promotionStatus || 'Promoted'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 7. Comments, Signatures & Stamp */}
                  <div className="border border-slate-300 rounded p-3 text-xs space-y-3 bg-white">
                    {/* Class Teacher Remark */}
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Class Teacher&apos;s Remark:</span>
                      <p className="font-medium text-slate-800 italic mt-0.5 text-[11px]">
                        &ldquo;{comments?.classTeacherComment || 'A good performance. Keep working hard to maintain high academic standards.'}&rdquo;
                      </p>
                    </div>

                    {/* Head Teacher Remark */}
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Head Teacher&apos;s Endorsement:</span>
                      <p className="font-medium text-slate-800 italic mt-0.5 text-[11px]">
                        &ldquo;{comments?.headTeacherComment || 'Promising result. Approved by Head Teacher for academic progression.'}&rdquo;
                      </p>
                    </div>

                    {/* Signatures & Stamp Area */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-center items-end text-[10px]">
                      {/* Class Teacher */}
                      <div>
                        <div className="h-9 border-b border-dashed border-slate-400 flex items-center justify-center italic text-slate-400">
                          Class Teacher Signature
                        </div>
                        <p className="font-semibold text-slate-700 mt-1">Class Teacher</p>
                      </div>

                      {/* Official Stamp */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-2 border-indigo-900/30 flex items-center justify-center p-1 text-center text-[8px] font-black uppercase text-indigo-900/60 leading-none">
                          School Official Stamp
                        </div>
                      </div>

                      {/* Head Teacher */}
                      <div>
                        <div className="h-9 border-b border-dashed border-slate-400 flex items-center justify-center italic text-slate-400">
                          {school?.headTeacherName || 'Head Teacher Signature'}
                        </div>
                        <p className="font-semibold text-slate-700 mt-1">Head Teacher / Principal</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}