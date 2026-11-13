
'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  School as SchoolIcon,
  Award,
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Users,
  Plus,
  KeyRound,
  Mail,
  Edit,
  X,
  Lock,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { School, GradeScaleItem, SchoolClass, User } from '@/lib/types';

interface SettingsViewProps {
  onSchoolUpdated?: () => void;
}

export default function SettingsView({ onSchoolUpdated }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'school' | 'grading' | 'staff' | 'backup'>('school');
  const [school, setSchool] = useState<School | null>(null);
  const [gradingScale, setGradingScale] = useState<GradeScaleItem[]>([]);
  const [stats, setStats] = useState<any>({});
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Staff Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalFullName, setModalFullName] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalRole, setModalRole] = useState('class_teacher');
  const [modalClassId, setModalClassId] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSaving, setModalSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const [setRes, clsRes, usrRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/classes'),
        fetch('/api/users'),
      ]);

      const setData = await setRes.json();
      const clsData = await clsRes.json();
      const usrData = await usrRes.json();

      if (setData.school) setSchool(setData.school);
      if (setData.gradingScale) setGradingScale(setData.gradingScale);
      if (setData.stats) setStats(setData.stats);
      if (clsData.classes) setClasses(clsData.classes);
      if (usrData.users) setUsers(usrData.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;

    try {
      setSaving(true);

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'school',
          school,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setNotification('School profile and branding updated successfully!');
        if (onSchoolUpdated) onSchoolUpdated();
      }
    } catch (err) {
      alert('Failed to update school profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGrading = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'grading_scale',
          gradingScale,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setNotification('Grading scale updated successfully!');
      }
    } catch (err) {
      alert('Failed to update grading scale');
    } finally {
      setSaving(false);
    }
  };

  const handleScaleChange = (
    index: number,
    field: keyof GradeScaleItem,
    value: any
  ) => {
    const updated = [...gradingScale];
    (updated[index] as any)[field] = value;
    setGradingScale(updated);
  };

  // Open Modal to Add User
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setModalFullName('');
    setModalEmail('');
    setModalRole('class_teacher');
    setModalClassId(classes[0]?.id || '');
    setModalPhone('');
    setModalPassword('password123');
    setModalError('');
    setShowUserModal(true);
  };

  // Open Modal to Edit User
  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setModalFullName(u.fullName);
    setModalEmail(u.email);
    setModalRole(u.role);
    setModalClassId(u.assignedClassId || '');
    setModalPhone(u.phone || '');
    setModalPassword('');
    setModalError('');
    setShowUserModal(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    const cleanEmail = modalEmail.trim().toLowerCase();
    const cleanName = modalFullName.trim();

    if (!cleanName || !cleanEmail) {
      setModalError('Full name and personal email are required.');
      return;
    }

    try {
      setModalSaving(true);

      if (editingUser) {
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            fullName: cleanName,
            email: cleanEmail,
            role: modalRole,
            assignedClassId: modalClassId || null,
            phone: modalPhone.trim(),
            password: modalPassword ? modalPassword.trim() : undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setModalError(data.error || 'Failed to update staff account.');
          return;
        }

        setNotification(
          `Updated account for ${cleanName}. They can now sign in with ${cleanEmail}.`
        );
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: cleanName,
            email: cleanEmail,
            role: modalRole,
            assignedClassId: modalClassId || null,
            phone: modalPhone.trim(),
            password: modalPassword || 'password123',
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setModalError(data.error || 'Failed to create staff account.');
          return;
        }

        setNotification(
          `Created new staff account for ${cleanName} with personal email ${cleanEmail}.`
        );
      }

      setShowUserModal(false);
      await loadSettings();
    } catch (err) {
      setModalError('Failed to save staff account.');
    } finally {
      setModalSaving(false);
    }
  };

  // Approve or reject a staff registration
  const handleStaffApproval = async (
    user: User,
    status: 'active' | 'rejected'
  ) => {
    const action = status === 'active' ? 'approve' : 'reject';

    if (!confirm(`Are you sure you want to ${action} ${user.fullName}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setNotification(data.error || `Failed to ${action} staff account.`);
        return;
      }

      setNotification(
        status === 'active'
          ? `${user.fullName} has been approved and can now sign in.`
          : `${user.fullName}'s registration has been rejected.`
      );

      await loadSettings();
    } catch (error) {
      console.error(error);
      setNotification(`Could not ${action} staff account. Please try again.`);
    }
  };

  // 1-Click Database Backup
  const handleDownloadBackup = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' }),
      });

      const data = await res.json();

      if (data.backupData) {
        const blob = new Blob(
          [JSON.stringify(data.backupData, null, 2)],
          { type: 'application/json' }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `School_System_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Backup failed');
    }
  };

  // Restore Database from JSON
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const json = JSON.parse(text);

        if (
          !confirm(
            'Warning: Restoring this backup will replace current database records. Continue?'
          )
        ) {
          return;
        }

        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'restore',
            backupData: json,
          }),
        });

        const data = await res.json();

        if (data.success) {
          alert('Database restored successfully! The page will now reload.');
          window.location.reload();
        } else {
          alert(data.error || 'Restore failed');
        }
      } catch (err) {
        alert('Invalid backup JSON file.');
      }
    };

    reader.readAsText(file);
  };

  if (loading || !school) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              <span>School Settings &amp; Configuration</span>
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Customize institution profile, grading scale thresholds, manage staff personal login accounts, and backup data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('school')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'school'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              School Profile
            </button>

            <button
              onClick={() => setActiveTab('grading')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'grading'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Grading Scales
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'staff'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Staff Accounts &amp; Logins
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'backup'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Database &amp; Backup
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

      {/* Tab 1: School Profile */}
      {activeTab === 'school' && (
        <form
          onSubmit={handleSaveSchool}
          className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-5 text-xs"
        >
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Institutional Branding &amp; Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                School Official Name *
              </label>
              <input
                type="text"
                value={school.name}
                onChange={(e) => setSchool({ ...school, name: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                School Motto
              </label>
              <input
                type="text"
                value={school.motto}
                onChange={(e) => setSchool({ ...school, motto: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                School Physical Address
              </label>
              <input
                type="text"
                value={school.address}
                onChange={(e) => setSchool({ ...school, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Official Telephone Number(s)
              </label>
              <input
                type="text"
                value={school.phone}
                onChange={(e) => setSchool({ ...school, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Official Email Address
              </label>
              <input
                type="email"
                value={school.email}
                onChange={(e) => setSchool({ ...school, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Head Teacher / Principal Name
              </label>
              <input
                type="text"
                value={school.headTeacherName}
                onChange={(e) =>
                  setSchool({ ...school, headTeacherName: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Proprietor / Director Name
              </label>
              <input
                type="text"
                value={school.principalName || ''}
                onChange={(e) =>
                  setSchool({ ...school, principalName: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save School Profile'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Grading Scale */}
      {activeTab === 'grading' && (
        <form
          onSubmit={handleSaveGrading}
          className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-5 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Grading System &amp; Score Ranges
              </h3>
              <p className="text-slate-500 text-[11px]">
                System automatically assigns grades and remarks based on this table.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-3">Grade</th>
                  <th className="py-2.5 px-3">Minimum Score</th>
                  <th className="py-2.5 px-3">Maximum Score</th>
                  <th className="py-2.5 px-3">Remark</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {gradingScale.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-black text-sm text-indigo-700">
                      {item.grade}
                    </td>

                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.minScore}
                        onChange={(e) =>
                          handleScaleChange(idx, 'minScore', Number(e.target.value))
                        }
                        className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-bold text-center"
                      />
                    </td>

                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.maxScore}
                        onChange={(e) =>
                          handleScaleChange(idx, 'maxScore', Number(e.target.value))
                        }
                        className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-bold text-center"
                      />
                    </td>

                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.remark}
                        onChange={(e) =>
                          handleScaleChange(idx, 'remark', e.target.value)
                        }
                        className="w-36 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-semibold"
                      />
                    </td>

                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) =>
                          handleScaleChange(idx, 'description', e.target.value)
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-600"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Grading Scale'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Staff Accounts & Personal Logins */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Staff &amp; Teacher Accounts</span>
              </h3>

              <p className="text-slate-500 text-[11px] mt-0.5">
                Every staff member logs into the portal using their own personal email address and secure password.
              </p>
            </div>

            <button
              onClick={handleOpenAddUser}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg font-semibold shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Account</span>
            </button>
          </div>

          {/* Pending Staff Registrations */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-amber-900 text-sm">
                  Pending Staff Registrations
                </h4>

                <p className="text-[11px] text-amber-700 mt-1">
                  Review and approve or reject new staff account requests.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">
                {users.filter((u) => u.status === 'pending').length} Pending
              </span>
            </div>

            {users.filter((u) => u.status === 'pending').length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                There are no pending staff registrations.
              </p>
            ) : (
              <div className="space-y-2">
                {users
                  .filter((u) => u.status === 'pending')
                  .map((u) => (
                    <div
                      key={u.id}
                      className="bg-white border border-amber-100 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          {u.fullName}
                        </p>

                        <p className="text-slate-600 mt-1">{u.email}</p>

                        {u.phone && (
                          <p className="text-slate-500 mt-1">{u.phone}</p>
                        )}

                        <p className="text-[10px] text-amber-700 mt-1 font-semibold">
                          Awaiting administrator approval
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStaffApproval(u, 'active')}
                          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStaffApproval(u, 'rejected')}
                          className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Existing Staff Accounts Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-3">Staff Name</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Assigned Class</th>
                  <th className="py-2.5 px-3">Personal Login Email</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const assignedClass = classes.find(
                    (c) => c.id === u.assignedClassId
                  );

                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900 flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px]">
                          {u.fullName.charAt(0)}
                        </div>
                        <span>{u.fullName}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'school_admin' || u.role === 'super_admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'head_teacher'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {assignedClass ? (
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold text-[11px]">
                            {assignedClass.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            None / All
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono font-medium text-slate-700">
                        <div className="flex items-center space-x-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {u.phone || (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-md font-semibold text-[11px] transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit / Password</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Database & Backup */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* System Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Registered Pupils
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {stats.totalStudents || 0}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Classes
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {stats.totalClasses || 0}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Subjects
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {stats.totalSubjects || 0}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Total Scores
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {stats.totalScores || 0}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Staff Users
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {users.length || stats.totalUsers || 0}
              </p>
            </div>
          </div>

          {/* Backup & Restore Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-indigo-700">
                <Download className="w-5 h-5" />
                <h4 className="font-bold text-sm text-slate-900">
                  Download Database Backup
                </h4>
              </div>

              <p className="text-slate-500">
                Safely export the entire school database (pupils, grades, conduct, broadsheets, and settings) into a single, portable JSON backup file.
              </p>

              <button
                onClick={handleDownloadBackup}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export &amp; Download Backup</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-amber-600">
                <Upload className="w-5 h-5" />
                <h4 className="font-bold text-sm text-slate-900">
                  Restore from Backup File
                </h4>
              </div>

              <p className="text-slate-500">
                Restore student records, classes, and marks from a previously exported backup file.
              </p>

              <label className="w-full flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-lg border border-slate-300 transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-slate-600" />
                <span>Select Backup JSON File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Staff Account Create / Edit Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>
                  {editingUser
                    ? 'Edit Staff Account & Password'
                    : 'Add New Staff Account'}
                </span>
              </h3>

              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Staff Full Name *
                </label>
                <input
                  type="text"
                  value={modalFullName}
                  onChange={(e) => setModalFullName(e.target.value)}
                  required
                  placeholder="e.g. Miss Helen Daniel"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Personal Email Address *{' '}
                  <span className="text-indigo-600 font-bold">
                    (Used for Login)
                  </span>
                </label>
                <input
                  type="email"
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  required
                  placeholder="e.g. helen.daniel@yahoo.com or gmail.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    System Role
                  </label>
                  <select
                    value={modalRole}
                    onChange={(e) => setModalRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-semibold"
                  >
                    <option value="class_teacher">Class Teacher</option>
                    <option value="subject_teacher">Subject Teacher</option>
                    <option value="head_teacher">Head Teacher</option>
                    <option value="school_admin">School Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Class
                  </label>
                  <select
                    value={modalClassId}
                    onChange={(e) => setModalClassId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-semibold"
                  >
                    <option value="">None / All Classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={modalPhone}
                  onChange={(e) => setModalPhone(e.target.value)}
                  placeholder="e.g. 08034445555"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {editingUser
                    ? 'Set New Password (Leave blank to keep current)'
                    : 'Initial Password *'}
                </label>
                <input
                  type="password"
                  value={modalPassword}
                  onChange={(e) => setModalPassword(e.target.value)}
                  required={!editingUser}
                  placeholder={
                    editingUser
                      ? 'Enter new password or leave blank'
                      : 'Minimum 6 characters (e.g. password123)'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs flex items-center space-x-1 disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {modalSaving
                      ? 'Saving...'
                      : editingUser
                        ? 'Update Account'
                        : 'Create Staff Account'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
