import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ResultApproval } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');

    const database = db.read();
    let approvals = [...database.resultApprovals];

    if (sessionId) approvals = approvals.filter(a => a.sessionId === sessionId);
    if (termId) approvals = approvals.filter(a => a.termId === termId);

    const detailedApprovals = approvals.map(app => {
      const cls = database.classes.find(c => c.id === app.classId);
      const sub = database.subjects.find(s => s.id === app.subjectId);
      const submitter = database.users.find(u => u.id === app.submittedBy);
      const reviewer = database.users.find(u => u.id === app.reviewedBy);
      return {
        ...app,
        className: cls ? cls.name : 'Unknown Class',
        subjectName: sub ? sub.name : 'All Subjects',
        submitterName: submitter ? submitter.fullName : 'Teacher',
        reviewerName: reviewer ? reviewer.fullName : undefined,
      };
    });

    return NextResponse.json({ approvals: detailedApprovals });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, approvalId, sessionId, termId, classId, subjectId, reviewerId, rejectionReason, submitterId } = body;
    const database = db.read();

    if (action === 'submit') {
      const newApproval: ResultApproval = {
        id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        schoolId: database.school.id,
        sessionId,
        termId,
        classId,
        subjectId,
        status: 'pending',
        submittedBy: submitterId || 'teacher',
        submittedAt: new Date().toISOString(),
      };
      database.resultApprovals.unshift(newApproval);
      db.write(database);
      db.logAudit(submitterId || 'teacher', 'Teacher', 'SUBMIT_FOR_APPROVAL', 'approval', newApproval.id, `Submitted results for approval`);
      return NextResponse.json({ success: true, approval: newApproval });
    }

    if (action === 'approve') {
      const index = database.resultApprovals.findIndex(a => a.id === approvalId);
      if (index !== -1) {
        database.resultApprovals[index].status = 'approved';
        database.resultApprovals[index].reviewedBy = reviewerId;
        database.resultApprovals[index].reviewedAt = new Date().toISOString();
      }

      // Mark matching scores as approved
      if (sessionId && termId && classId) {
        database.scores.forEach(sc => {
          if (sc.sessionId === sessionId && sc.termId === termId && sc.classId === classId) {
            if (!subjectId || sc.subjectId === subjectId) {
              sc.status = 'approved';
            }
          }
        });
      }

      db.write(database);
      db.logAudit(reviewerId || 'admin', 'Head Teacher / Admin', 'APPROVE_RESULTS', 'approval', approvalId, `Approved results`);
      return NextResponse.json({ success: true, message: 'Results approved successfully' });
    }

    if (action === 'reject') {
      const index = database.resultApprovals.findIndex(a => a.id === approvalId);
      if (index !== -1) {
        database.resultApprovals[index].status = 'rejected';
        database.resultApprovals[index].reviewedBy = reviewerId;
        database.resultApprovals[index].rejectionReason = rejectionReason || 'Needs correction';
        database.resultApprovals[index].reviewedAt = new Date().toISOString();
      }

      // Mark matching scores back to draft
      if (sessionId && termId && classId) {
        database.scores.forEach(sc => {
          if (sc.sessionId === sessionId && sc.termId === termId && sc.classId === classId) {
            if (!subjectId || sc.subjectId === subjectId) {
              sc.status = 'draft';
            }
          }
        });
      }

      db.write(database);
      db.logAudit(reviewerId || 'admin', 'Head Teacher / Admin', 'REJECT_RESULTS', 'approval', approvalId, `Rejected results: ${rejectionReason}`);
      return NextResponse.json({ success: true, message: 'Results rejected for correction' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process approval action' }, { status: 500 });
  }
}
