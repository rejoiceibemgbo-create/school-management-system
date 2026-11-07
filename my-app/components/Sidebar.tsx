'use client';

import React from 'react';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  UserPlus, 
  GraduationCap, 
  BookOpen, 
  CalendarDays, 
  FileSpreadsheet, 
  Award, 
  ClipboardCheck, 
  CheckSquare, 
  FileText, 
  Settings, 
  LogOut,
  X,
  School as SchoolIcon,
  Calendar
} from 'lucide-react';
import { User, School, AcademicSession, AcademicTerm } from '@/lib/types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  school: School | null;
  currentSession: AcademicSession | null;
  currentTerm: AcademicTerm | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  currentUser,
  school,
  currentSession,
  currentTerm,
  isOpen,
  setIsOpen,
  onLogout,
}: SidebarProps) {
  const role = currentUser?.role || 'school_admin';

  // Role permissions
  const canAccessRegistration = ['super_admin', 'school_admin', 'head_teacher'].includes(role);
  const canAccessClasses = ['super_admin', 'school_admin'].includes(role);
  const canAccessSubjects = ['super_admin', 'school_admin'].includes(role);
  const canAccessSessions = ['super_admin', 'school_admin', 'head_teacher'].includes(role);
  const canAccessScores = true; // All roles can access scores
  const canAccessConduct = ['super_admin', 'school_admin', 'head_teacher', 'class_teacher'].includes(role);
  const canAccessAttendance = ['super_admin', 'school_admin', 'head_teacher', 'class_teacher'].includes(role);
  const canAccessBroadsheet = ['super_admin', 'school_admin', 'head_teacher', 'class_teacher'].includes(role);
  const canAccessReportCards = true;
  const canAccessApprovals = ['super_admin', 'school_admin', 'head_teacher'].includes(role);
  const canAccessSettings = ['super_admin', 'school_admin'].includes(role);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { id: 'students', label: 'Student Registration', icon: UserPlus, show: canAccessRegistration },
    { id: 'classes', label: 'Class Management', icon: GraduationCap, show: canAccessClasses },
    { id: 'subjects', label: 'Subject Management', icon: BookOpen, show: canAccessSubjects },
    { id: 'sessions', label: 'Sessions & Terms', icon: CalendarDays, show: canAccessSessions },
    { id: 'scores', label: 'Score Entry', icon: FileSpreadsheet, show: canAccessScores },
    { id: 'conduct', label: 'Conduct Assessment', icon: Award, show: canAccessConduct },
    { id: 'attendance', label: 'Attendance & Comments', icon: ClipboardCheck, show: canAccessAttendance },
    { id: 'broadsheet', label: 'Class Broadsheet', icon: CheckSquare, show: canAccessBroadsheet },
    { id: 'reports', label: 'Student Report Cards', icon: FileText, show: canAccessReportCards },
    { id: 'approvals', label: 'Result Approvals', icon: CheckSquare, show: canAccessApprovals },
    { id: 'settings', label: 'School Settings', icon: Settings, show: canAccessSettings },
  ].filter(item => item.show);

  const getRoleBadge = (userRole: string) => {
    switch (userRole) {
      case 'super_admin': return { label: 'Super Admin', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'school_admin': return { label: 'School Admin', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'head_teacher': return { label: 'Head Teacher', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'class_teacher': return { label: 'Class Teacher', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'subject_teacher': return { label: 'Subject Teacher', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
      default: return { label: userRole.replace(/_/g, ' '), bg: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  const badge = getRoleBadge(role);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white shrink-0 border border-slate-700 flex items-center justify-center shadow-xs">
              <Image
                src={school?.logoUrl || '/logo.jpeg?v=2'}
                alt="School Logo"
                width={40}
                height={40}
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="overflow-hidden min-w-0">
              <h1 className="font-bold text-sm leading-tight text-white truncate" title={school?.name || 'Happy Home Educational Centre'}>
                {school?.name || 'Happy Home Educational Centre'}
              </h1>
              <p className="text-[11px] text-slate-400 truncate">Result Management System</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Close sidebar"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current user card */}
        <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{currentUser?.fullName || 'Logged In User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0 ${badge.bg}`}>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Active Session & Term Indicator in Sidebar */}
        <div className="mx-3 my-2 px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-indigo-300 min-w-0">
            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-semibold text-slate-200 truncate">{currentSession?.name || '2026/2027'}</span>
            <span className="text-slate-500 shrink-0">•</span>
            <span className="text-slate-300 truncate">{currentTerm?.name || 'First Term'}</span>
          </div>
          {currentTerm?.isLocked && (
            <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 text-[9px] rounded font-bold shrink-0 ml-1">
              LOCKED
            </span>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
