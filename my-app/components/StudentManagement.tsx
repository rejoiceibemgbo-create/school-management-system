'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  Eye,
  ArrowRightCircle,
  CheckSquare,
  X,
  Save,
  Camera,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, SchoolClass } from '@/lib/types';

interface StudentManagementProps {
  onStudentCountChange?: () => void;
}

export default function StudentManagement({ onStudentCountChange }: StudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [promoteTargetClass, setPromoteTargetClass] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: 'Male' as 'Male' | 'Female',
    dateOfBirth: '2018-05-15',
    classId: '',
    admissionNumber: '',
    photoUrl: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    homeAddress: '',
    admissionDate: new Date().toISOString().split('T')[0],
    status: 'active' as const,
  });

  const [importRows, setImportRows] = useState<any[]>([]);
  const [importError, setImportError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch classes and students
  const loadData = async () => {
    try {
      setLoading(true);
      const [clsRes, stdRes] = await Promise.all([
        fetch('/api/classes'),
        fetch(`/api/students?classId=${selectedClass}&status=${selectedStatus}&search=${encodeURIComponent(searchQuery)}`),
      ]);
      const clsData = await clsRes.json();
      const stdData = await stdRes.json();

      if (clsData.classes) {
        setClasses(clsData.classes);
        if (!formData.classId && clsData.classes.length > 0) {
          setFormData(prev => ({ ...prev, classId: clsData.classes[0].id }));
        }
      }
      if (stdData.students) {
        setStudents(stdData.students);
      }
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedStatus, searchQuery]);

  const handleOpenAdd = () => {
    // Generate preview admission number based on count
    const count = students.length + 1;
    const year = new Date().getFullYear();
    const autoAdm = `HHEC/${year}/${String(count).padStart(3, '0')}`;

    setFormData({
      firstName: '',
      lastName: '',
      middleName: '',
      gender: 'Male',
      dateOfBirth: '2018-05-15',
      classId: classes[0]?.id || '',
      admissionNumber: autoAdm,
      photoUrl: '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      homeAddress: '',
      admissionDate: new Date().toISOString().split('T')[0],
      status: 'active',
    });
    setShowAddModal(true);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.classId) {
      alert('First name, last name, and class are required.');
      return;
    }

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setShowAddModal(false);
      loadData();
      if (onStudentCountChange) onStudentCountChange();
    } catch (err) {
      alert('Failed to register student');
    }
  };

  const handleOpenEdit = (student: Student) => {
    setActiveStudent(student);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName || '',
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      classId: student.classId,
      admissionNumber: student.admissionNumber,
      photoUrl: student.photoUrl || '',
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail || '',
      homeAddress: student.homeAddress,
      admissionDate: student.admissionDate,
      status: student.status as any,
    });
    setShowEditModal(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;

    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeStudent.id,
          ...formData,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setShowEditModal(false);
      loadData();
    } catch (err) {
      alert('Failed to update student');
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete or remove ${student.firstName} ${student.lastName}? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/students?id=${student.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      loadData();
      if (onStudentCountChange) onStudentCountChange();
    } catch (err) {
      alert('Failed to delete student');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(students.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBatchPromote = async () => {
    if (selectedStudentIds.length === 0 || !promoteTargetClass) {
      alert('Please select students and a target class for promotion.');
      return;
    }

    try {
      const res = await fetch('/api/students/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'promote',
          studentIds: selectedStudentIds,
          targetClassId: promoteTargetClass,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      alert(data.message);
      setShowPromoteModal(false);
      setSelectedStudentIds([]);
      loadData();
    } catch (err) {
      alert('Promotion failed');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (students.length === 0) {
      alert('No students to export.');
      return;
    }

    const exportData = students.map(s => {
      const cls = classes.find(c => c.id === s.classId);
      return {
        'Admission Number': s.admissionNumber,
        'First Name': s.firstName,
        'Last Name': s.lastName,
        'Middle Name': s.middleName || '',
        'Gender': s.gender,
        'Class': cls?.name || 'Class',
        'Date of Birth': s.dateOfBirth,
        'Parent Name': s.parentName,
        'Parent Phone': s.parentPhone,
        'Parent Email': s.parentEmail || '',
        'Home Address': s.homeAddress,
        'Admission Date': s.admissionDate,
        'Status': s.status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, `Happy_Home_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Download Sample Template for Excel Import
  const handleDownloadTemplate = () => {
    const template = [
      {
        'First Name': 'John',
        'Last Name': 'Doe',
        'Middle Name': 'Chukwu',
        'Gender': 'Male',
        'Class': 'Primary 1',
        'Date of Birth': '2018-04-12',
        'Parent Name': 'Mr. & Mrs. Doe',
        'Parent Phone': '08031234567',
        'Parent Email': 'parent@example.com',
        'Home Address': 'Plot 4, Golden Avenue',
      },
      {
        'First Name': 'Mary',
        'Last Name': 'Johnson',
        'Middle Name': 'Ngozi',
        'Gender': 'Female',
        'Class': 'Primary 1',
        'Date of Birth': '2018-07-25',
        'Parent Name': 'Chief Johnson',
        'Parent Phone': '08123456789',
        'Parent Email': 'johnson@example.com',
        'Home Address': '15 Victoria Street',
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Student_Import_Template.xlsx');
  };

  // Handle Excel File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          setImportError('Uploaded file contains no rows or data.');
          return;
        }

        // Map column names
        const mapped = data.map((row: any) => ({
          firstName: row['First Name'] || row['FirstName'] || row['FIRST NAME'] || '',
          lastName: row['Last Name'] || row['LastName'] || row['LAST NAME'] || row['Surname'] || '',
          middleName: row['Middle Name'] || row['MiddleName'] || '',
          gender: row['Gender'] || row['Sex'] || 'Male',
          className: row['Class'] || row['CLASS'] || 'Primary 1',
          dateOfBirth: row['Date of Birth'] || row['DOB'] || '2018-01-01',
          parentName: row['Parent Name'] || row['Guardian'] || '',
          parentPhone: String(row['Parent Phone'] || row['Phone'] || ''),
          parentEmail: row['Parent Email'] || row['Email'] || '',
          homeAddress: row['Home Address'] || row['Address'] || '',
        }));

        setImportRows(mapped);
      } catch (err) {
        setImportError('Failed to parse Excel file. Please use the sample template format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (importRows.length === 0) return;

    try {
      const res = await fetch('/api/students/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: importRows }),
      });
      const data = await res.json();
      if (data.error) {
        setImportError(data.error);
        return;
      }
      alert(`Successfully imported ${data.count} student(s)!`);
      setShowImportModal(false);
      setImportRows([]);
      loadData();
      if (onStudentCountChange) onStudentCountChange();
    } catch (err) {
      setImportError('Import failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Student Registration & Records</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage pupil admissions, personal details, classes, and batch operations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Student</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Import Excel</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export Excel</span>
            </button>

            {selectedStudentIds.length > 0 && (
              <button
                onClick={() => setShowPromoteModal(true)}
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                <ArrowRightCircle className="w-4 h-4" />
                <span>Promote ({selectedStudentIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, admission no, or parent phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="all">All Classes ({classes.length})</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Enrolled</option>
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading student records...
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">No students registered yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Your student registry is ready. Click the button below to register your first student, or import a spreadsheet.
            </p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register First Student</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.length === students.length && students.length > 0}
                      onChange={handleSelectAll}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3.5">Admission No</th>
                  <th className="py-3 px-3.5">Student Name</th>
                  <th className="py-3 px-3.5">Class</th>
                  <th className="py-3 px-3.5">Gender</th>
                  <th className="py-3 px-3.5">Parent / Contact</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(student => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(student.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3.5 font-mono font-medium text-slate-900">
                        {student.admissionNumber}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs uppercase overflow-hidden">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                            ) : (
                              student.firstName.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {student.lastName} {student.firstName} {student.middleName || ''}
                            </p>
                            <p className="text-[10px] text-slate-400">DOB: {student.dateOfBirth}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-800">
                        {(student as any).className || 'Class'}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${student.gender === 'Female' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                          {student.gender}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <p className="text-slate-800 font-medium truncate max-w-[140px]">{student.parentName || '—'}</p>
                        <p className="text-[10px] text-slate-500">{student.parentPhone || '—'}</p>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${student.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                            student.status === 'graduated' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right space-x-1">
                        <button
                          onClick={() => {
                            setActiveStudent(student);
                            setShowProfileModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(student)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit Information"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete / Archive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL 1: REGISTER STUDENT MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-indigo-400" />
                  <span>Register New Student</span>
                </h3>
                <p className="text-xs text-slate-400">Enter pupil bio-data and parent details</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admission Number <span className="text-slate-400 font-normal">(Auto-Generated)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.admissionNumber}
                    onChange={e => setFormData({ ...formData, admissionNumber: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enrolled Class *
                  </label>
                  <select
                    value={formData.classId}
                    onChange={e => setFormData({ ...formData, classId: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Surname / Last Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Okonkwo"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Chidera"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    placeholder="e.g. David"
                    value={formData.middleName}
                    onChange={e => setFormData({ ...formData, middleName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Date</label>
                  <input
                    type="date"
                    value={formData.admissionDate}
                    onChange={e => setFormData({ ...formData, admissionDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Parent & Contact Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Parent / Guardian Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Mr. & Mrs. Okonkwo"
                      value={formData.parentName}
                      onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 0803 123 4567"
                      value={formData.parentPhone}
                      onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Home Address</label>
                    <input
                      type="text"
                      placeholder="e.g. 14 Victory Crescent, Off School Road"
                      value={formData.homeAddress}
                      onChange={e => setFormData({ ...formData, homeAddress: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Student Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT STUDENT MODAL --- */}
      {showEditModal && activeStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base flex items-center space-x-2">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  <span>Edit Student Information</span>
                </h3>
                <p className="text-xs text-slate-400">Updating record for {activeStudent.firstName} {activeStudent.lastName}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Number</label>
                  <input
                    type="text"
                    value={formData.admissionNumber}
                    onChange={e => setFormData({ ...formData, admissionNumber: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Enrolled Class</label>
                  <select
                    value={formData.classId}
                    onChange={e => setFormData({ ...formData, classId: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Surname *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={e => setFormData({ ...formData, middleName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium"
                  >
                    <option value="active">Active Enrolled</option>
                    <option value="graduated">Graduated</option>
                    <option value="transferred">Transferred</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Parent & Contact Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Parent / Guardian Name</label>
                    <input
                      type="text"
                      value={formData.parentName}
                      onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Phone</label>
                    <input
                      type="text"
                      value={formData.parentPhone}
                      onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Home Address</label>
                    <input
                      type="text"
                      value={formData.homeAddress}
                      onChange={e => setFormData({ ...formData, homeAddress: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: VIEW PROFILE MODAL --- */}
      {showProfileModal && activeStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 p-6 text-white text-center relative shrink-0">
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-20 h-20 rounded-full bg-white text-indigo-700 font-bold text-2xl flex items-center justify-center mx-auto shadow-md border-4 border-indigo-400/40 uppercase">
                {activeStudent.photoUrl ? (
                  <img src={activeStudent.photoUrl} alt="Photo" className="w-full h-full object-cover rounded-full" />
                ) : (
                  activeStudent.firstName.charAt(0)
                )}
              </div>
              <h3 className="text-lg font-bold mt-2">
                {activeStudent.lastName} {activeStudent.firstName} {activeStudent.middleName || ''}
              </h3>
              <p className="text-xs text-indigo-200 font-mono">{activeStudent.admissionNumber}</p>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Class</span>
                  <span className="font-bold text-slate-800 text-sm">{(activeStudent as any).className || 'Primary 1'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Gender</span>
                  <span className="font-bold text-slate-800">{activeStudent.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date of Birth</span>
                  <span className="font-semibold text-slate-700">{activeStudent.dateOfBirth}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Admission Date</span>
                  <span className="font-semibold text-slate-700">{activeStudent.admissionDate}</span>
                </div>
              </div>

              <div className="space-y-2 pb-3 border-b border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Parent Contact</span>
                <p className="font-semibold text-slate-800">Name: <span className="font-normal text-slate-600">{activeStudent.parentName || '—'}</span></p>
                <p className="font-semibold text-slate-800">Phone: <span className="font-normal text-slate-600">{activeStudent.parentPhone || '—'}</span></p>
                <p className="font-semibold text-slate-800">Address: <span className="font-normal text-slate-600">{activeStudent.homeAddress || '—'}</span></p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: BATCH PROMOTE MODAL --- */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-amber-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center space-x-2">
                <ArrowRightCircle className="w-5 h-5" />
                <span>Promote Selected Students</span>
              </h3>
              <button onClick={() => setShowPromoteModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                You have selected <span className="font-bold text-slate-900">{selectedStudentIds.length}</span> pupil(s) for promotion to the next class.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Target Destination Class:
                </label>
                <select
                  value={promoteTargetClass}
                  onChange={e => setPromoteTargetClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold"
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  onClick={() => setShowPromoteModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchPromote}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Confirm Promotion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: IMPORT EXCEL MODAL --- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>Import Students from Excel / CSV</span>
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div>
                  <p className="font-bold text-emerald-900">Need the correct column format?</p>
                  <p className="text-[11px] text-emerald-700">Download the pre-formatted Excel template.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Get Template</span>
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Excel file (.xlsx or .csv):
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importRows.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-800">
                    Previewing <span className="text-indigo-600 font-bold">{importRows.length}</span> students ready to import:
                  </p>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">Class</th>
                          <th className="p-2">Gender</th>
                          <th className="p-2">Parent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importRows.slice(0, 10).map((r, i) => (
                          <tr key={i}>
                            <td className="p-2 font-medium">{r.lastName} {r.firstName}</td>
                            <td className="p-2">{r.className}</td>
                            <td className="p-2">{r.gender}</td>
                            <td className="p-2 text-slate-500">{r.parentName || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importRows.length > 10 && (
                    <p className="text-[10px] text-slate-400 text-right">+ {importRows.length - 10} more rows...</p>
                  )}
                </div>
              )}

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportRows([]);
                  }}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importRows.length === 0}
                  onClick={handleConfirmImport}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs"
                >
                  Import {importRows.length} Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

