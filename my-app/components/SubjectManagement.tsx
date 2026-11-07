'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, X, Save, CheckCircle2 } from 'lucide-react';
import { Subject } from '@/lib/types';

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState<'core' | 'vocational' | 'elective'>('core');

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subjects');
      const data = await res.json();
      if (data.subjects) setSubjects(data.subjects);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setFormName('');
    setFormCode('');
    setFormCategory('core');
    setShowModal(true);
  };

  const handleOpenEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setFormName(sub.name);
    setFormCode(sub.code);
    setFormCategory(sub.category);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      alert('Subject name and code are required');
      return;
    }

    try {
      const payload = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        category: formCategory,
      };

      if (editingSubject) {
        await fetch('/api/subjects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingSubject.id, ...payload }),
        });
      } else {
        await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      loadSubjects();
    } catch (err) {
      alert('Failed to save subject');
    }
  };

  const handleDelete = async (sub: Subject) => {
    if (!confirm(`Are you sure you want to delete ${sub.name}?`)) return;

    try {
      const res = await fetch(`/api/subjects?id=${sub.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      loadSubjects();
    } catch (err) {
      alert('Failed to delete subject');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Subject Management</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage school curriculum subjects ({subjects.length} active subjects registered).
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Subject</span>
          </button>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-4">Subject Code</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Curriculum Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((sub, idx) => (
                <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{sub.name}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-indigo-600">{sub.code}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                      sub.category === 'core' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      sub.category === 'vocational' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      {sub.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center space-x-1 text-emerald-600 text-[11px] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Standard Curriculum</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <button
                      onClick={() => handleOpenEdit(sub)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md"
                      title="Edit Subject"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(sub)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSubject ? `Edit Subject: ${editingSubject.name}` : 'Add New Subject'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  placeholder="e.g. French, Coding & Robotics"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Code * (e.g. FRE, COD)</label>
                <input
                  type="text"
                  placeholder="e.g. FRE"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Category</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                >
                  <option value="core">Core Subject</option>
                  <option value="vocational">Vocational / Skill Subject</option>
                  <option value="elective">Elective Subject</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Subject</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

