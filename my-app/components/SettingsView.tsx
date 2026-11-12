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
  RefreshCw
} from 'lucide-react';
import { School, GradeScaleItem } from '@/lib/types';

interface SettingsViewProps {
  onSchoolUpdated?: () => void;
}

export default function SettingsView({ onSchoolUpdated }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'school' | 'grading' | 'backup'>('school');
  const [school, setSchool] = useState<School | null>(null);
  const [gradingScale, setGradingScale] = useState<GradeScaleItem[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.school) setSchool(data.school);
      if (data.gradingScale) setGradingScale(data.gradingScale);
      if (data.stats) setStats(data.stats);
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

  const handleScaleChange = (index: number, field: keyof GradeScaleItem, value: any) => {
    const updated = [...gradingScale];
    (updated[index] as any)[field] = value;
    setGradingScale(updated);
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
        const blob = new Blob([JSON.stringify(data.backupData, null, 2)], { type: 'application/json' });
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
        if (!confirm('Warning: Restoring this backup will replace current database records. Continue?')) {
          return;
        }

        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore', backupData: json }),
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
    return <div className="py-20 text-center text-slate-400 text-xs">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              <span>School Settings & Configuration</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize institution profile, grading scale thresholds, and manage automated database backups.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('school')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'school' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              School Profile
            </button>
            <button
              onClick={() => setActiveTab('grading')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'grading' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              Grading Scales
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'backup' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              Database & Backup
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Tab 1: School Profile */}
      {activeTab === 'school' && (
        <form onSubmit={handleSaveSchool} className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-5 text-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Institutional Branding & Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">School Official Name *</label>
              <input
                type="text"
                value={school.name}
                onChange={e => setSchool({ ...school, name: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">School Motto</label>
              <input
                type="text"
                value={school.motto}
                onChange={e => setSchool({ ...school, motto: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">School Physical Address</label>
              <input
                type="text"
                value={school.address}
                onChange={e => setSchool({ ...school, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Telephone Number(s)</label>
              <input
                type="text"
                value={school.phone}
                onChange={e => setSchool({ ...school, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email Address</label>
              <input
                type="email"
                value={school.email}
                onChange={e => setSchool({ ...school, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Head Teacher / Principal Name</label>
              <input
                type="text"
                value={school.headTeacherName}
                onChange={e => setSchool({ ...school, headTeacherName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Proprietor / Director Name</label>
              <input
                type="text"
                value={school.principalName || ''}
                onChange={e =>
                  setSchool({ ...school, principalName: e.target.value })
                }
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
        <form onSubmit={handleSaveGrading} className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Grading System & Score Ranges</h3>
              <p className="text-slate-500 text-[11px]">System automatically assigns grades and remarks based on this table.</p>
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
                    <td className="py-2.5 px-3 font-black text-sm text-indigo-700">{item.grade}</td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.minScore}
                        onChange={e => handleScaleChange(idx, 'minScore', Number(e.target.value))}
                        className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-bold text-center"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.maxScore}
                        onChange={e => handleScaleChange(idx, 'maxScore', Number(e.target.value))}
                        className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-bold text-center"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.remark}
                        onChange={e => handleScaleChange(idx, 'remark', e.target.value)}
                        className="w-36 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-semibold"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={e => handleScaleChange(idx, 'description', e.target.value)}
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

      {/* Tab 3: Database & Backup */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* System Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Registered Pupils</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{stats.totalStudents || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Classes</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{stats.totalClasses || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Subjects</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{stats.totalSubjects || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Scores</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{stats.totalScores || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">System Users</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{stats.totalUsers || 0}</p>
            </div>
          </div>

          {/* Backup & Restore Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download Backup */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-indigo-700">
                <Download className="w-5 h-5" />
                <h4 className="font-bold text-sm text-slate-900">Download Database Backup</h4>
              </div>
              <p className="text-slate-500">
                Safely export the entire school database (pupils, grades, conduct, broadsheets, and settings) into a single, portable JSON backup file.
              </p>
              <button
                onClick={handleDownloadBackup}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export & Download Backup</span>
              </button>
            </div>

            {/* Restore Backup */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-amber-600">
                <Upload className="w-5 h-5" />
                <h4 className="font-bold text-sm text-slate-900">Restore from Backup File</h4>
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
    </div>
  );
}

