'use client';

import React, { useState, useEffect } from 'react';
import { GraduationCap, Plus, Edit2, Trash2, Users, X, Save } from 'lucide-react';
import { SchoolClass, User } from '@/lib/types';

export default function ClassManagement() {
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);

  const [formName, setFormName] = useState('');
  const [formArm, setFormArm] = useState('');
  const [formCategory, setFormCategory] = useState<'nursery' | 'primary' | 'junior_secondary' | 'senior_secondary'>('primary');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formCapacity, setFormCapacity] = useState(35);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clsRes, authRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/auth'),
      ]);
      const clsData = await clsRes.json();
      const authData = await authRes.json();

      if (clsData.classes) setClasses(clsData.classes);
      if (authData.users) {
        setTeachers(authData.users.filter((u: User) => u.role.includes('teacher')));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingClass(null);
    setFormName('');
    setFormArm('');
    setFormCategory('primary');
    setFormTeacherId('');
    setFormCapacity(35);
    setShowModal(true);
  };

  const handleOpenEdit = (cls: any) => {
    setEditingClass(cls);
    setFormName(cls.name);
    setFormArm(cls.arm || '');
    setFormCategory(cls.category || 'primary');
    setFormTeacherId(cls.classTeacherId || '');
    setFormCapacity(cls.capacity || 35);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Class name is required (e.g. Primary 1)');
      return;
    }

    try {
      const payload = {
        name: formName.trim(),
        arm: formArm.trim(),
        category: formCategory,
        classTeacherId: formTeacherId || undefined,
        capacity: Number(formCapacity) || 35,
      };

      if (editingClass) {
        await fetch('/api/classes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingClass.id, ...payload }),
        });
      } else {
        await fetch('/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      loadData();
    } catch (err) {
      alert('Failed to save class');
    }
  };

  const handleDelete = async (cls: any) => {
    if (!confirm(`Are you sure you want to delete ${cls.name}?`)) return;

    try {
      const res = await fetch(`/api/classes?id=${cls.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      loadData();
    } catch (err) {
      alert('Failed to delete class');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <span>Class Management</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure school classes (Primary 1–5, Nursery, Junior & Senior Secondary) and assign class teachers.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Class</span>
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(cls => (
          <div key={cls.id} className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 hover:border-indigo-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {cls.category.replace('_', ' ')}
                </span>
                <div className="space-x-1">
                  <button
                    onClick={() => handleOpenEdit(cls)}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded-md"
                    title="Edit Class"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cls)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                    title="Delete Class"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{cls.name}</h3>
              {cls.arm && <p className="text-xs text-slate-500 font-medium">Arm: {cls.arm}</p>}

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Class Teacher:</span>
                  <span className="font-semibold text-slate-800">{cls.teacherName || 'Not Assigned'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Registered Pupils:</span>
                  <span className="font-bold text-indigo-600 flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{cls.studentCount} / {cls.capacity || 35}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingClass ? `Edit Class: ${editingClass.name}` : 'Add New Class'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Class Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Primary 1, Nursery 2, JSS 1"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Arm / Stream</label>
                  <input
                    type="text"
                    placeholder="e.g. Gold, A"
                    value={formArm}
                    onChange={e => setFormArm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Section Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="nursery">Nursery</option>
                    <option value="primary">Primary</option>
                    <option value="junior_secondary">Junior Secondary (JSS)</option>
                    <option value="senior_secondary">Senior Secondary (SS)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Class Teacher</label>
                <select
                  value={formTeacherId}
                  onChange={e => setFormTeacherId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                >
                  <option value="">-- No Teacher Assigned --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName} ({t.role.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Maximum Capacity</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={formCapacity}
                  onChange={e => setFormCapacity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
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
                  <span>Save Class</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

