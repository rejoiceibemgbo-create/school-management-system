
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

    const [studentsRes, recordsRes, termRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, admission_number, first_name, last_name, middle_name')
        .eq('school_id', SCHOOL_ID)
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('last_name', { ascending: true }),

      supabase
        .from('attendance_records')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term_id', termId),

      supabase
        .from('academic_terms')
        .select('total_school_days')
        .eq('id', termId)
        .maybeSingle(),
    ]);

    if (studentsRes.error) throw studentsRes.error;
    if (recordsRes.error) throw recordsRes.error;
    if (termRes.error) throw termRes.error;

    const defaultDays = Number(termRes.data?.total_school_days) || 60;

    const data = (studentsRes.data || []).map((student) => {
      const existing = (recordsRes.data || []).find(
        (record) => record.student_id === student.id
      );

      return {
        studentId: student.id,
        admissionNumber: student.admission_number,
        studentName: `${student.last_name} ${student.first_name} ${student.middle_name || ''}`.trim(),
        totalSchoolDays: existing?.total_school_days ?? defaultDays,
        daysPresent: existing?.days_present ?? defaultDays,
        daysAbsent: existing?.days_absent ?? 0,
        hasRecord: !!existing,
      };
    });

    return NextResponse.json({
      attendance: data,
      defaultDays,
    });
  } catch (error) {
    console.error('Fetch attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, termId, classId, records } = body;

    if (!sessionId || !termId || !classId || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { data: term, error: termError } = await supabase
      .from('academic_terms')
      .select('is_locked')
      .eq('id', termId)
      .maybeSingle();

    if (termError) throw termError;

    if (term?.is_locked) {
      return NextResponse.json(
        { error: 'This term is locked. Attendance cannot be modified.' },
        { status: 403 }
      );
    }

    const attendanceRows = [];

    for (const item of records) {
      if (!item.studentId) continue;

      const totalSchoolDays = Math.max(
        1,
        Number(item.totalSchoolDays) || 60
      );

      const daysPresent = Math.min(
        totalSchoolDays,
        Math.max(0, Number(item.daysPresent) || 0)
      );

      const daysAbsent = Math.max(0, totalSchoolDays - daysPresent);

      const { data: existing, error: existingError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('school_id', SCHOOL_ID)
        .eq('student_id', item.studentId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
        .maybeSingle();

      if (existingError) throw existingError;

      attendanceRows.push({
        id: existing?.id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        school_id: SCHOOL_ID,
        session_id: sessionId,
        term_id: termId,
        class_id: classId,
        student_id: item.studentId,
        total_school_days: totalSchoolDays,
        days_present: daysPresent,
        days_absent: daysAbsent,
        updated_at: new Date().toISOString(),
      });
    }

    if (attendanceRows.length > 0) {
      const { error: saveError } = await supabase
        .from('attendance_records')
        .upsert(attendanceRows, { onConflict: 'id' });

      if (saveError) throw saveError;
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance records saved successfully',
    });
  } catch (error) {
    console.error('Save attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to save attendance' },
      { status: 500 }
    );
  }
}
