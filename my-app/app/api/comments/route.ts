
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SCHOOL_ID = 'sch_happy_home';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');
    const classId = searchParams.get('classId');

    if (!sessionId || !termId || !classId) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      );
    }

    const [studentsRes, commentsRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, admission_number, first_name, last_name, middle_name')
        .eq('school_id', SCHOOL_ID)
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('last_name'),

      supabase
        .from('report_comments')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term_id', termId),
    ]);

    if (studentsRes.error) throw studentsRes.error;
    if (commentsRes.error) throw commentsRes.error;

    const data = (studentsRes.data || []).map((student) => {
      const existing = (commentsRes.data || []).find(
        (comment) => comment.student_id === student.id
      );

      return {
        studentId: student.id,
        admissionNumber: student.admission_number,
        studentName: `${student.last_name} ${student.first_name} ${student.middle_name || ''}`.trim(),
        classTeacherComment: existing?.class_teacher_comment || '',
        headTeacherComment: existing?.head_teacher_comment || '',
        promotionStatus: existing?.promotion_status || 'Promoted',
        hasRecord: !!existing,
      };
    });

    return NextResponse.json({ comments: data });
  } catch (error) {
    console.error('Fetch comments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, termId, classId, comments } = body;

    if (!sessionId || !termId || !classId || !Array.isArray(comments)) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    for (const item of comments) {
      if (!item.studentId) continue;

      const { data: existing, error: findError } = await supabase
        .from('report_comments')
        .select('id')
        .eq('school_id', SCHOOL_ID)
        .eq('student_id', item.studentId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
        .maybeSingle();

      if (findError) throw findError;

      const record = {
        school_id: SCHOOL_ID,
        session_id: sessionId,
        term_id: termId,
        class_id: classId,
        student_id: item.studentId,
        class_teacher_comment: item.classTeacherComment || '',
        head_teacher_comment: item.headTeacherComment || '',
        promotion_status: item.promotionStatus || 'Promoted',
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from('report_comments')
          .update(record)
          .eq('id', existing.id)
          .eq('school_id', SCHOOL_ID);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('report_comments')
          .insert({
            id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            ...record,
          });

        if (error) throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Comments saved successfully',
    });
  } catch (error) {
    console.error('Save comments error:', error);
    return NextResponse.json(
      { error: 'Failed to save comments' },
      { status: 500 }
    );
  }
}
