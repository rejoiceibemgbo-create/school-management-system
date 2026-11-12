import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SCHOOL_ID = 'sch_happy_home';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');

    if (studentId && sessionId && termId) {
      const { data: conduct, error } = await supabase
        .from('conduct_assessments')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .eq('student_id', studentId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
        .maybeSingle();

      if (error) throw error;

      return NextResponse.json({ conduct: conduct || null });
    }

    if (classId && sessionId && termId) {
      const [studentsRes, assessmentsRes] = await Promise.all([
        supabase
          .from('students')
          .select('id, admission_number, first_name, last_name, middle_name')
          .eq('school_id', SCHOOL_ID)
          .eq('class_id', classId)
          .eq('status', 'active')
          .order('last_name', { ascending: true }),

        supabase
          .from('conduct_assessments')
          .select('*')
          .eq('school_id', SCHOOL_ID)
          .eq('class_id', classId)
          .eq('session_id', sessionId)
          .eq('term_id', termId),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (assessmentsRes.error) throw assessmentsRes.error;

      const result = (studentsRes.data || []).map((student) => {
        const existing = (assessmentsRes.data || []).find(
          (assessment) => assessment.student_id === student.id
        );

        return {
          studentId: student.id,
          admissionNumber: student.admission_number,
          studentName: `${student.last_name} ${student.first_name} ${student.middle_name || ''}`.trim(),
          punctuality: existing?.punctuality ?? 4,
          regularity: existing?.regularity ?? 4,
          neatness: existing?.neatness ?? 4,
          honesty: existing?.honesty ?? 4,
          obedience: existing?.obedience ?? 4,
          respect: existing?.respect ?? 4,
          participation: existing?.participation ?? 4,
          cooperation: existing?.cooperation ?? 4,
          leadership: existing?.leadership ?? 4,
          responsibility: existing?.responsibility ?? 4,
          hasRecord: !!existing,
        };
      });

      return NextResponse.json({ students: result });
    }

    return NextResponse.json(
      { error: 'Missing parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Fetch conduct assessments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conduct assessments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, termId, classId, assessments } = body;

    if (!sessionId || !termId || !classId || !Array.isArray(assessments)) {
      return NextResponse.json(
        { error: 'Missing required assessment parameters' },
        { status: 400 }
      );
    }

    const conductRows = [];

    for (const item of assessments) {
      if (!item.studentId) continue;

      const { data: existing, error: existingError } = await supabase
        .from('conduct_assessments')
        .select('id')
        .eq('school_id', SCHOOL_ID)
        .eq('student_id', item.studentId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
        .maybeSingle();

      if (existingError) throw existingError;

      conductRows.push({
        id: existing?.id || `cnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        school_id: SCHOOL_ID,
        session_id: sessionId,
        term_id: termId,
        class_id: classId,
        student_id: item.studentId,
        punctuality: Math.min(5, Math.max(1, Number(item.punctuality) || 4)),
        regularity: Math.min(5, Math.max(1, Number(item.regularity) || 4)),
        neatness: Math.min(5, Math.max(1, Number(item.neatness) || 4)),
        honesty: Math.min(5, Math.max(1, Number(item.honesty) || 4)),
        obedience: Math.min(5, Math.max(1, Number(item.obedience) || 4)),
        respect: Math.min(5, Math.max(1, Number(item.respect) || 4)),
        participation: Math.min(5, Math.max(1, Number(item.participation) || 4)),
        cooperation: Math.min(5, Math.max(1, Number(item.cooperation) || 4)),
        leadership: Math.min(5, Math.max(1, Number(item.leadership) || 4)),
        responsibility: Math.min(5, Math.max(1, Number(item.responsibility) || 4)),
        updated_at: new Date().toISOString(),
      });
    }

    if (conductRows.length > 0) {
      const { error: saveError } = await supabase
        .from('conduct_assessments')
        .upsert(conductRows, { onConflict: 'id' });

      if (saveError) throw saveError;
    }

    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        school_id: SCHOOL_ID,
        user_id: null,
        user_name: 'Teacher',
        action: 'SAVE_CONDUCT',
        entity_type: 'conduct',
        entity_id: classId,
        details: 'Updated conduct assessments for class students',
      });

    if (auditError) throw auditError;

    return NextResponse.json({
      success: true,
      message: 'Conduct assessments saved successfully',
    });
  } catch (error) {
    console.error('Save conduct assessments error:', error);
    return NextResponse.json(
      { error: 'Failed to save conduct assessments' },
      { status: 500 }
    );
  }
}