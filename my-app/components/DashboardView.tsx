'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  GraduationCap, 
  BookOpen, 
  Award, 
  TrendingUp, 
  Percent, 
  CheckCircle2, 
  Calendar,
  Filter,
  ArrowRight,
  UserPlus,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { AcademicSession, AcademicTerm, SchoolClass } from '@/lib/types';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const fetchDashboardData = async (sessId?: string, tId?: string, clsId?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (sessId) params.append('sessionId', sessId);
      if (tId) params.append('termId', tId);
      if (clsId && clsId !== 'all') params.append('classId', clsId);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      const json = await res.json();
      if (json && !json.error) {
        setData(json);
        if (!selectedSession && json.activeSession) {
          setSelectedSession(json.activeSession.id);
        }
        if (!selectedTerm && json.activeTerm) {
          setSelectedTerm(json.activeTerm.id);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedSession, selectedTerm, selectedClass);
  }, [selectedSession, selectedTerm, selectedClass]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading school analytics dashboard...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalStudents: 0,
    totalActiveStudents: 0,
    totalClasses: 0,
    totalTeachers: 0,
    totalSubjects: 0,
    studentsWithCompletedResults: 0,
    classAverage: 0,
    overallPassRate: 0,
    averageAttendanceRate: 100,
  };

  const charts = data?.charts || {
    populationByClass: [],
    performanceBySubject: [],
    performanceByClass: [],
    gradeDistribution: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
    termlyPerformance: [],
  };

  const maxPop = Math.max(...charts.populationByClass.map((c: any) => c.count), 1);
  const gradeDistribution: Record<string, number> = (charts.gradeDistribution as Record<string, number>) || {};
  const totalGrades: number = Number(Object.values(gradeDistribution).reduce((a: number, b: any) => a + (Number(b) || 0), 0)) || 1;

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-slate-800">
            <Filter className="w-5 h-5 text-indigo-600 shrink-0" />
            <h2 className="font-bold text-base">Academic Filters</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Session Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Academic Session
              </label>
              <select
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {data?.sessions?.map((s: AcademicSession) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isCurrent ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Term Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Term
              </label>
              <select
                value={selectedTerm}
                onChange={e => setSelectedTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {data?.terms
                  ?.filter((t: AcademicTerm) => t.sessionId === selectedSession)
                  .map((t: AcademicTerm) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isCurrent ? '(Active)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Class Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Class Scope
              </label>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">All Classes</option>
                {data?.classes?.map((c: SchoolClass) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Students */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-4.5 hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">{kpis.totalStudents}</p>
            <span className="text-xs text-emerald-600 font-medium">Registered</span>
          </div>
        </div>

        {/* Active Students */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-4.5 hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Students</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">{kpis.totalActiveStudents}</p>
            <span className="text-xs text-slate-500">Currently enrolled</span>
          </div>
        </div>

        {/* Classes & Teachers */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-4.5 hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Classes & Staff</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">{kpis.totalClasses} <span className="text-sm font-normal text-slate-500">Classes</span></p>
            <span className="text-xs text-purple-700 font-semibold">{kpis.totalTeachers} Teachers</span>
          </div>
        </div>

        {/* Total Subjects */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-4.5 hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Subjects</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">{kpis.totalSubjects}</p>
            <span className="text-xs text-slate-500">Curriculum</span>
          </div>
        </div>

        {/* Results Completed */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-4.5 hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Results Computed</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">{kpis.studentsWithCompletedResults}</p>
            <span className="text-xs text-slate-500">Students with marks</span>
          </div>
        </div>

        {/* Class Average */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-4.5 hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Term Average</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">{kpis.classAverage}%</p>
            <span className="text-xs text-slate-500">Overall Mean</span>
          </div>
        </div>

        {/* Overall Pass Rate */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-4.5 hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Pass Rate</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">{kpis.overallPassRate}%</p>
            <span className="text-xs text-emerald-600 font-medium">≥ 40% Pass mark</span>
          </div>
        </div>

        {/* Average Attendance */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-4.5 hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg. Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">{kpis.averageAttendanceRate}%</p>
            <span className="text-xs text-slate-500">Class Attendance</span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('students')}
          className="flex items-center justify-between p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-left hover:bg-indigo-100/80 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Register Student</p>
              <p className="text-[11px] text-slate-500">Add or import pupil records</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('scores')}
          className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-left hover:bg-emerald-100/80 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Score Entry Module</p>
              <p className="text-[11px] text-slate-500">Enter CA & Exam scores</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('broadsheet')}
          className="flex items-center justify-between p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-left hover:bg-purple-100/80 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Class Broadsheet</p>
              <p className="text-[11px] text-slate-500">View rankings & master sheet</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('reports')}
          className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-left hover:bg-rose-100/80 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Student Report Cards</p>
              <p className="text-[11px] text-slate-500">A4 print & bulk PDF download</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-rose-600 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Student Population by Class */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Student Enrollment by Class</h3>
              <p className="text-xs text-slate-500">Active students in Primary 1–5</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Total: {kpis.totalStudents}
            </span>
          </div>

          {charts.populationByClass.length === 0 || kpis.totalStudents === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No students registered yet. Click &quot;Register Student&quot; to begin.
            </div>
          ) : (
            <div className="space-y-3">
              {charts.populationByClass.map((c: any, idx: number) => {
                const percent = Math.round((c.count / maxPop) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>{c.className}</span>
                      <span className="font-bold">{c.count} students</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 2: Grade Distribution */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Grade Distribution (A - F)</h3>
              <p className="text-xs text-slate-500">Performance across all entered scores</p>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="grid grid-cols-6 gap-2 text-center my-4 min-w-[280px]">
              {[
                { grade: 'A', count: gradeDistribution.A || 0, bg: 'bg-emerald-500', text: 'text-emerald-700', label: '80-100' },
                { grade: 'B', count: gradeDistribution.B || 0, bg: 'bg-blue-500', text: 'text-blue-700', label: '70-79' },
                { grade: 'C', count: gradeDistribution.C || 0, bg: 'bg-cyan-500', text: 'text-cyan-700', label: '60-69' },
                { grade: 'D', count: gradeDistribution.D || 0, bg: 'bg-amber-500', text: 'text-amber-700', label: '50-59' },
                { grade: 'E', count: gradeDistribution.E || 0, bg: 'bg-orange-500', text: 'text-orange-700', label: '40-49' },
                { grade: 'F', count: gradeDistribution.F || 0, bg: 'bg-rose-500', text: 'text-rose-700', label: '0-39' },
              ].map(item => {
                const heightPercent = totalGrades > 0 ? Math.max(10, Math.round((item.count / totalGrades) * 100)) : 10;
                return (
                  <div key={item.grade} className="flex flex-col items-center justify-end h-36">
                    <span className="text-[11px] font-bold text-slate-700 mb-1">{item.count}</span>
                    <div className="w-full bg-slate-100 rounded-t-md h-24 flex items-end justify-center p-1">
                      <div
                        className={`w-full ${item.bg} rounded-t-xs transition-all duration-500`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-900 mt-1">{item.grade}</span>
                    <span className="text-[9px] text-slate-400 whitespace-nowrap">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart 3: Performance by Class */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Academic Average by Class</h3>
              <p className="text-xs text-slate-500">Term score averages comparison</p>
            </div>
          </div>

          <div className="space-y-3">
            {charts.performanceByClass.map((cls: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>{cls.className}</span>
                  <span className="font-bold">{cls.average}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      cls.average >= 70 ? 'bg-emerald-500' :
                      cls.average >= 50 ? 'bg-indigo-500' :
                      cls.average >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, cls.average)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Termly Performance Trend */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Termly Academic Progression</h3>
              <p className="text-xs text-slate-500">Average trend across terms in {selectedSession ? 'active session' : ''}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            {charts.termlyPerformance.map((t: any, idx: number) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-xs font-semibold text-slate-500 mb-1">{t.termName}</p>
                <p className="text-2xl font-black text-indigo-700">{t.average}%</p>
                <span className="text-[10px] text-slate-400">Class Mean</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
