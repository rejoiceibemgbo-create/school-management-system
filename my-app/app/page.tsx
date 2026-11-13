
'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import DashboardView from '@/components/DashboardView';
import StudentManagement from '@/components/StudentManagement';
import ClassManagement from '@/components/ClassManagement';
import SubjectManagement from '@/components/SubjectManagement';
import SessionTermManagement from '@/components/SessionTermManagement';
import ScoreEntry from '@/components/ScoreEntry';
import ConductAssessmentView from '@/components/ConductAssessmentView';
import AttendanceCommentsView from '@/components/AttendanceCommentsView';
import BroadsheetView from '@/components/BroadsheetView';
import ReportCardView from '@/components/ReportCardView';
import ResultManagementView from '@/components/ResultManagementView';
import SettingsView from '@/components/SettingsView';
import PasswordModal from '@/components/PasswordModal';
import LoginView from '@/components/LoginView';
import { User, School, AcademicSession, AcademicTerm } from '@/lib/types';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentSession, setCurrentSession] = useState<AcademicSession | null>(null);
  const [currentTerm, setCurrentTerm] = useState<AcademicTerm | null>(null);

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Initial load
  const loadInitialData = async () => {
    try {
      setLoading(true);

      const [authRes, sessRes, setRes] = await Promise.all([
        fetch('/api/auth'),
        fetch('/api/sessions'),
        fetch('/api/settings'),
      ]);

      const authData = await authRes.json();
      const sessData = await sessRes.json();
      const setData = await setRes.json();
      if (authRes.ok && authData.user) {
        setCurrentUser(authData.user);

        // Load the registered school users for the navbar dropdown.
        const usersRes = await fetch('/api/users');
        const usersData = await usersRes.json();

        if (usersRes.ok && Array.isArray(usersData.users)) {
          setAllUsers(usersData.users);
        } else {
          setAllUsers([]);
          console.error('Unable to load school users:', usersData.error);
        }
      } else {
        setCurrentUser(null);
        setAllUsers([]);
      }

      if (sessData.currentSession) {
        setCurrentSession(sessData.currentSession);
      }

      if (sessData.currentTerm) {
        setCurrentTerm(sessData.currentTerm);
      }

      if (setData.school) {
        setSchool(setData.school);
      }
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth', {
        method: 'DELETE',
      });

      if (!response.ok) {
        alert('Logout failed. Please try again.');
        return;
      }

      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      alert('Unable to log out. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />

          <p className="text-sm font-semibold text-white tracking-wide">
            Loading School Result Management System...
          </p>
        </div>
      </div>
    );
  }

  // If logged out, show Login page
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
        school={school}
        users={allUsers}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        school={school}
        currentSession={currentSession}
        currentTerm={currentTerm}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col flex-1 min-h-screen min-w-0">
        {/* Top Navbar */}
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          currentUser={currentUser}
          school={school}
          currentSession={currentSession}
          currentTerm={currentTerm}
          allUsers={allUsers}
          onSwitchUser={handleSwitchUser}
          onChangePasswordClick={() => setShowPasswordModal(true)}
          onLogout={handleLogout}
        />

        {/* Dynamic Main Page Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          {currentTab === 'dashboard' && (
            <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />
          )}

          {currentTab === 'students' && (
            <StudentManagement />
          )}

          {currentTab === 'classes' && (
            <ClassManagement />
          )}

          {currentTab === 'subjects' && (
            <SubjectManagement />
          )}

          {currentTab === 'sessions' && (
            <SessionTermManagement onSessionTermChanged={loadInitialData} />
          )}

          {currentTab === 'scores' && (
            <ScoreEntry currentUser={currentUser} />
          )}

          {currentTab === 'conduct' && (
            <ConductAssessmentView />
          )}

          {currentTab === 'attendance' && (
            <AttendanceCommentsView />
          )}

          {currentTab === 'broadsheet' && (
            <BroadsheetView />
          )}

          {currentTab === 'reports' && (
            <ReportCardView />
          )}

          {currentTab === 'approvals' && (
            <ResultManagementView currentUser={currentUser} />
          )}

          {currentTab === 'settings' && (
            <SettingsView onSchoolUpdated={loadInitialData} />
          )}
        </main>
      </div>

      {/* Change Password & Personal Profile Modal */}
      {showPasswordModal && (
        <PasswordModal
          currentUser={currentUser}
          onClose={() => setShowPasswordModal(false)}
          onUserUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
            loadInitialData();
          }}
        />
      )}
    </div>
  );
}
