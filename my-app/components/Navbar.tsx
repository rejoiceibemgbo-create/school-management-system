
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Menu,
  Calendar,
  KeyRound,
  User as UserIcon,
  ChevronDown,
  Check,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { User, AcademicSession, AcademicTerm, School } from '@/lib/types';

interface NavbarProps {
  onToggleSidebar: () => void;
  currentUser: User | null;
  school: School | null;
  currentSession: AcademicSession | null;
  currentTerm: AcademicTerm | null;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  onChangePasswordClick: () => void;
  onLogout: () => void;
}

export default function Navbar({
  onToggleSidebar,
  currentUser,
  school,
  currentSession,
  currentTerm,
  allUsers,
  onChangePasswordClick,
  onLogout,
}: NavbarProps) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        roleMenuRef.current &&
        !roleMenuRef.current.contains(event.target as Node)
      ) {
        setShowRoleMenu(false);
      }

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
      <div className="px-2.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-3 max-w-full">

        {/* Left Section */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink min-w-0">

          {/* Mobile Sidebar Button */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg flex items-center justify-center focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors shrink-0"
            aria-label="Open Navigation Menu"
            title="Open Menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>

          {/* School Logo and Name */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            <div className="relative w-5 h-5 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-white border border-slate-200 shrink-0 flex items-center justify-center shadow-2xs">
              <Image
                src={school?.logoUrl || '/logo.jpeg?v=2'}
                alt="School Logo"
                width={22}
                height={22}
                className="object-contain"
                unoptimized
              />
            </div>

            <h1 className="text-[9.5px] sm:text-[11px] md:text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
              {school?.name || 'Happy Home Educational Centre'}
            </h1>
          </div>

          {/* Academic Session and Term */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-indigo-50 text-indigo-950 border border-indigo-200/80 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 ml-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />

            <span className="font-bold">
              {currentSession?.name || '2026/2027'}
            </span>

            <span className="text-indigo-400">•</span>

            <span>{currentTerm?.name || 'First Term'}</span>

            {currentTerm?.isLocked && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[10px] rounded font-bold">
                LOCKED
              </span>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">

          {/* School Staff Dropdown */}
          <div className="relative" ref={roleMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowRoleMenu(!showRoleMenu);
                setShowProfileMenu(false);
              }}
              className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold transition-colors border border-slate-300/80 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shrink-0"
              title="View school staff"
              aria-expanded={showRoleMenu}
            >
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600 shrink-0" />

              <span className="capitalize text-indigo-800 text-[10px] sm:text-xs max-w-[65px] sm:max-w-none truncate font-bold">
                {currentUser?.role?.replace(/_/g, ' ') || 'Admin'}
              </span>

              <ChevronDown
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500 shrink-0 transition-transform ${
                  showRoleMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Staff Dropdown Content */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">

                <div className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                  <span>School Staff</span>

                  <span className="text-[10px] font-normal text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {allUsers.length} Active
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto py-1">

                  {allUsers.length > 0 ? (
                    allUsers.map((user) => {
                      const isSelected = currentUser?.id === user.id;

                      return (
                        <div
                          key={user.id}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-50/80 font-bold text-indigo-950'
                              : 'text-slate-700'
                          }`}
                        >
                          <div className="truncate mr-2 min-w-0">
                            <p className="truncate font-semibold">
                              {user.fullName}
                              {isSelected ? ' (You)' : ''}
                            </p>

                            <p className="text-[10px] text-slate-400 truncate">
                              {user.email}
                            </p>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono capitalize">
                              {user.role?.replace(/_/g, ' ') || 'Staff'}
                            </span>

                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="px-3 py-4 text-xs text-slate-500 text-center">
                      No active school users found.
                    </p>
                  )}

                </div>
              </div>
            )}
          </div>

          {/* Change Password Button */}
          <button
            type="button"
            onClick={onChangePasswordClick}
            className="hidden sm:inline-flex p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200 shrink-0"
            title="Change Password"
            aria-label="Change Password"
          >
            <KeyRound className="w-4 h-4" />
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowRoleMenu(false);
              }}
              className="flex items-center space-x-1 pl-1 sm:pl-2 border-l border-slate-200 hover:opacity-85 focus:outline-hidden"
              title="User Account Menu"
              aria-label="User Account Menu"
              aria-expanded={showProfileMenu}
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-600 text-white font-bold text-[10px] sm:text-xs flex items-center justify-center shrink-0 shadow-2xs ring-2 ring-indigo-100">
                {currentUser?.fullName?.charAt(0) || (
                  <UserIcon className="w-3 h-3" />
                )}
              </div>

              <span className="text-xs font-bold text-slate-800 hidden md:inline truncate max-w-[130px]">
                {currentUser?.fullName?.split(' ')[0]}
              </span>

              <ChevronDown className="w-3 h-3 text-slate-500 hidden md:inline shrink-0" />
            </button>

            {/* Profile Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">

                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentUser?.fullName}
                  </p>

                  <p className="text-[11px] text-slate-500 truncate">
                    {currentUser?.email}
                  </p>

                  <div className="mt-1 flex items-center space-x-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-800 capitalize">
                      {currentUser?.role?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-2 border-b border-slate-100 text-[11px] text-slate-600 space-y-1">

                  <div className="flex justify-between">
                    <span className="text-slate-400">Session:</span>

                    <span className="font-semibold text-slate-800">
                      {currentSession?.name || '2026/2027'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Term:</span>

                    <span className="font-semibold text-slate-800">
                      {currentTerm?.name || 'First Term'}
                    </span>
                  </div>
                </div>

                <div className="py-1">

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onChangePasswordClick();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />

                    <span>Change Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition-colors font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />

                    <span>Sign Out</span>
                  </button>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
