'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  History, 
  Lock, 
  Unlock, 
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { AcademicSession, AcademicTerm, User } from '@/lib/types';

interface ResultManagementViewProps {
  currentUser: User | null;
}

export default function ResultManagementView({ currentUser }: ResultManagementViewProps) {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  const [approvals, setApprovals] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'approvals' | 'audit'>('approvals');

  const [rejectingApprovalId, setRejectingApprovalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessRes, setRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/settings'),
      ]);
      const sessData = await sessRes.json();
      const setData = await setRes.json();

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
      if (setData.auditLogs) {
        setAuditLogs(setData.auditLogs);
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

  const loadApprovals = async () => {
    if (!selectedSession || !selectedTerm) return;
    try {
      const res = await fetch(`/api/approvals?sessionId=${selectedSession}&termId=${selectedTerm}`);
      const data = await res.json();
      if (data.approvals) {
        setApprovals(data.approvals);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [selectedSession, selectedTerm]);

  const handleApprove = async (approval: any) => {
    try {
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          approvalId: approval.id,
          sessionId: approval.sessionId,
          termId: approval.termId,
          classId: approval.classId,
          subjectId: approval.subjectId,
          reviewerId: currentUser?.id,
        }),
      });
      loadApprovals();
      loadData();
    } catch (err) {
      alert('Approval failed');
    }
  };

  const handleReject = async () => {
    if (!rejectingApprovalId) return;

    try {
      const app = approvals.find(a => a.id === rejectingApprovalId);
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          approvalId: rejectingApprovalId,
          sessionId: app?.sessionId,
          termId: app?.termId,
          classId: app?.classId,
          subjectId: app?.subjectId,
          reviewerId: currentUser?.id,
          rejectionReason,
        }),
      });
      setRejectingApprovalId(null);
      setRejectionReason('');
      loadApprovals();
      loadData();
    } catch (err) {
      alert('Rejection failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              <span>Result Management & Moderation</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve submitted class results, reject for correction, and inspect the system audit trail.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'approvals' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Pending Approvals
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              System Audit Trail
            </button>
          </div>
        </div>

        {/* Filters */}
        {activeTab === 'approvals' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Academic Session
              </label>
              <select
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold"
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
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold"
              >
                {terms.filter(t => t.sessionId === selectedSession).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'approvals' ? (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {approvals.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs px-4">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-sm">No Pending Result Submissions</p>
              <p className="text-slate-400 mt-1">When teachers submit scores for a class, they will appear here for Head Teacher endorsement.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Submitted By</th>
                    <th className="py-3 px-4">Submission Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {approvals.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{app.className}</td>
                      <td className="py-3 px-4 font-semibold text-indigo-700">{app.subjectName}</td>
                      <td className="py-3 px-4 text-slate-700">{app.submitterName}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{new Date(app.submittedAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          app.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          app.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {app.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(app)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingApprovalId(app.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded font-semibold text-xs"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {app.status !== 'pending' && (
                          <span className="text-slate-400 text-[11px] italic">Reviewed by {app.reviewerName || 'Admin'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Audit Trail Table */
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Immutable System Audit Trail (Last 50 Events)</span>
            </h3>
            <span className="text-slate-400 text-[11px] font-mono">{auditLogs.length} events logged</span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{log.userName}</td>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-700 text-[10px]">{log.action}</td>
                    <td className="py-2 px-3 uppercase text-slate-500 font-medium">{log.entityType}</td>
                    <td className="py-2 px-3 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingApprovalId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-rose-600 text-white font-bold text-sm">
              Reject Results for Correction
            </div>
            <div className="p-5 space-y-3 text-xs">
              <label className="block font-semibold text-slate-700">
                Reason / Feedback for Teacher:
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g. Please verify exam scores for pupil #4 and re-calculate CA..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
              />
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setRejectingApprovalId(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

