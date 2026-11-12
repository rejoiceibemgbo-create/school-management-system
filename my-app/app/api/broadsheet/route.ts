
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
        { error: 'Missing session, term, or class' },
        { status: 400 }
      );
    }

    const [
      classRes,
      sessionRes,
      termRes,
      schoolRes,
      subjectsRes,
      studentsRes,
      scoresRes,
      gradingRes,
    ] = await Promise.all([
      supabase.from('classes').select('*').eq('id', classId).eq('school_id', SCHOOL_ID).maybeSingle(),
      supabase.from('academic_sessions').select('*').eq('id', sessionId).maybeSingle(),
      supabase.from('academic_terms').select('*').eq('id', termId).maybeSingle(),
      supabase.from('schools').select('*').eq('id', SCHOOL_ID).maybeSingle(),
      supabase.from('subjects').select('*').eq('school_id', SCHOOL_ID).order('subject_order'),
      supabase.from('students').select('*').eq('school_id', SCHOOL_ID).eq('class_id', classId).eq('status', 'active').order('last_name'),
      supabase.from('scores').select('*').eq('school_id', SCHOOL_ID).eq('class_id', classId).eq('session_id', sessionId).eq('term_id', termId),
      supabase.from('grading_scale').select('*').order('min_score'),
    ]);

    for (const result of [classRes, sessionRes, termRes, schoolRes, subjectsRes, studentsRes, scoresRes, gradingRes]) {
      if (result.error) throw result.error;
    }

    if (!classRes.data || !sessionRes.data || !termRes.data) {
      return NextResponse.json({ error: 'Class, session, or term not found' }, { status: 404 });
    }

    const subjects = (subjectsRes.data || []).map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      order: subject.subject_order,
    }));

    const gradingScale = gradingRes.data || [];
    const scores = scoresRes.data || [];

    const rows = (studentsRes.data || []).map((student) => {
      const studentScores = scores.filter((score) => score.student_id === student.id);
      const subjectScores = subjects.map((subject) => {
        const score = studentScores.find((item) => item.subject_id === subject.id);
        return {
          subjectId: subject.id,
          subjectName: subject.name,
          caTotal: Number(score?.ca_total || 0),
          exam: Number(score?.exam || 0),
          total: Number(score?.overall_total || 0),
          grade: score?.grade || '',
          remark: score?.remark || '',
        };
      });

      const recordedScores = studentScores.filter((score) => score.overall_total !== null);
      const totalScore = recordedScores.reduce((sum, score) => sum + Number(score.overall_total || 0), 0);
      const averageScore = recordedScores.length
        ? Number((totalScore / recordedScores.length).toFixed(2))
        : 0;

      const overallGrade = gradingScale.find(
        (item) => averageScore >= Number(item.min_score) && averageScore <= Number(item.max_score)
      );

      return {
        studentId: student.id,
        admissionNumber: student.admission_number,
        studentName: `${student.last_name} ${student.first_name} ${student.middle_name || ''}`.trim(),
        subjectScores,
        totalScore,
        averageScore,
        overallGrade: overallGrade?.grade || '',
        overallRemark: overallGrade?.remark || '',
        passedCount: recordedScores.filter((score) => Number(score.overall_total) >= 40).length,
        failedCount: recordedScores.filter((score) => Number(score.overall_total) < 40).length,
      };
    });

    rows.sort((a, b) => b.averageScore - a.averageScore || b.totalScore - a.totalScore);

    let previousAverage: number | null = null;
    let currentPosition = 0;

    const rankedRows = rows.map((row, index) => {
      if (row.averageScore !== previousAverage) {
        currentPosition = index + 1;
        previousAverage = row.averageScore;
      }
      return { ...row, position: currentPosition };
    });

    const classAverage = rows.length
      ? Number((rows.reduce((sum, row) => sum + row.averageScore, 0) / rows.length).toFixed(2))
      : 0;

    return NextResponse.json({
      class: classRes.data,
      session: sessionRes.data,
      term: termRes.data,
      school: schoolRes.data ? {
        id: schoolRes.data.id,
        name: schoolRes.data.name,
        motto: schoolRes.data.motto,
        address: schoolRes.data.address,
        phone: schoolRes.data.phone,
        email: schoolRes.data.email,
        logoUrl: schoolRes.data.logo_url,
        headTeacher: schoolRes.data.head_teacher,
      } : null,
      subjects,
      rows: rankedRows,
      stats: {
        totalStudents: rows.length,
        classAverage,
        passedOverall: rows.filter((row) => row.averageScore >= 40).length,
        failedOverall: rows.filter((row) => row.averageScore < 40).length,
        highestAverage: rows.length ? Math.max(...rows.map((row) => row.averageScore)) : 0,
        lowestAverage: rows.length ? Math.min(...rows.map((row) => row.averageScore)) : 0,
      },
    });
  } catch (error) {
    console.error('Fetch broadsheet error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch broadsheet' },
      { status: 500 }
    );
  }
}
