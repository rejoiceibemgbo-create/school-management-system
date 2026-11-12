
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SCHOOL_ID = 'sch_happy_home';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');

    let query = supabase
      .from('result_approvals')
      .select('*')
      .eq('school_id', SCHOOL_ID)
      .order('submitted_at', { ascending: false });

    if (sessionId) query = query.eq('session_id', sessionId);
    if (termId) query = query.eq('term_id', termId);

    const { data: approvals, error } = await query;

    if (error) throw error;

    const [classesRes, subjectsRes, usersRes] = await Promise.all([
      supabase.from('classes').select('id, name'),
      supabase.from('subjects').select('id, name'),
      supabase.from('users').select('id, full_name'),
    ]);

    if (classesRes.error) throw classesRes.error;
    if (subjectsRes.error) throw subjectsRes.error;
    if (usersRes.error) throw usersRes.error;

    const detailedApprovals = (approvals || []).map((app) => {
      const cls = (classesRes.data || []).find((item) => item.id === app.class_id);
      const sub = (subjectsRes.data || []).find((item) => item.id === app.subject_id);
      const submitter = (usersRes.data || []).find((item) => item.id === app.submitted_by);
      const reviewer = (usersRes.data || []).find((item) => item.id === app.reviewed_by);

      return {
        id: app.id,
        schoolId: app.school_id,
        sessionId: app.session_id,
        termId: app.term_id,
        classId: app.class_id,
        subjectId: app.subject_id,
        status: app.status,
        submittedBy: app.submitted_by,
        submittedAt: app.submitted_at,
        reviewedBy: app.reviewed_by,
        reviewedAt: app.reviewed_at,
        rejectionReason: app.rejection_reason,
        className: cls?.name || 'Unknown Class',
        subjectName: sub?.name || 'All Subjects',
        submitterName: submitter?.full_name || 'Teacher',
        reviewerName: reviewer?.full_name,
      };
    });

    return NextResponse.json({ approvals: detailedApprovals });
  } catch (error) {
    console.error('Fetch approvals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      action,
      approvalId,
      sessionId,
      termId,
      classId,
      subjectId,
      reviewerId,
      rejectionReason,
      submitterId,
    } = body;

    const now = new Date().toISOString();

    if (action === 'submit') {
      const newApproval = {
        id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        school_id: SCHOOL_ID,
        session_id: sessionId,
        term_id: termId,
        class_id: classId,
        subject_id: subjectId || null,
        status: 'pending',
        submitted_by: submitterId || null,
        submitted_at: now,
      };

      const { data, error } = await supabase
        .from('result_approvals')
        .insert(newApproval)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        school_id: SCHOOL_ID,
        user_id: submitterId || null,
        user_name: 'Teacher',
        action: 'SUBMIT_FOR_APPROVAL',
        entity_type: 'approval',
        entity_id: newApproval.id,
        details: 'Submitted results for approval',
      });

      return NextResponse.json({ success: true, approval: data });
    }

    if (action === 'approve' || action === 'reject') {
      if (!approvalId) {
        return NextResponse.json(
          { error: 'Approval ID is required' },
          { status: 400 }
        );
      }

      const isApproved = action === 'approve';
      const newStatus = isApproved ? 'approved' : 'rejected';

      const { data: updatedApproval, error: approvalError } = await supabase
        .from('result_approvals')
        .update({
          status: newStatus,
          reviewed_by: reviewerId || null,
          reviewed_at: now,
          ...(isApproved
            ? {}
            : { rejection_reason: rejectionReason || 'Needs correction' }),
        })
        .eq('id', approvalId)
        .eq('school_id', SCHOOL_ID)
        .select()
        .single();

      if (approvalError) throw approvalError;

      if (sessionId && termId && classId) {
        let scoresQuery = supabase
          .from('scores')
          .update({ status: isApproved ? 'approved' : 'draft' })
          .eq('session_id', sessionId)
          .eq('term_id', termId)
          .eq('class_id', classId);

        if (subjectId) {
          scoresQuery = scoresQuery.eq('subject_id', subjectId);
        }

        const { error: scoresError } = await scoresQuery;
        if (scoresError) throw scoresError;
      }

      const auditAction = isApproved ? 'APPROVE_RESULTS' : 'REJECT_RESULTS';
      const auditDetails = isApproved
        ? 'Approved results'
        : `Rejected results: ${rejectionReason || 'Needs correction'}`;

      const { error: auditError } = await supabase.from('audit_logs').insert({
        school_id: SCHOOL_ID,
        user_id: reviewerId || null,
        user_name: 'Head Teacher / Admin',
        action: auditAction,
        entity_type: 'approval',
        entity_id: approvalId,
        details: auditDetails,
      });

      if (auditError) throw auditError;

      return NextResponse.json({
        success: true,
        approval: updatedApproval,
        message: isApproved
          ? 'Results approved successfully'
          : 'Results rejected for correction',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Process approval error:', error);
    return NextResponse.json(
      { error: 'Failed to process approval action' },
      { status: 500 }
    );
  }
}
