
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SCHOOL_ID = 'sch_happy_home';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const classId = searchParams.get('classId');
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');

    if (!classId || !sessionId || !termId) {
      return NextResponse.json(
        { error: 'Class, Session, and Term are required' },
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
      supabase.from('classes').select('*').eq('id', classId).maybeSingle(),

      supabase.from('academic_sessions').select('*').eq('id', sessionId).maybeSingle(),

      supabase.from('academic_terms').select('*').eq('id', termId).maybeSingle(),

      supabase.from('schools').select('*').eq('id', SCHOOL_ID).maybeSingle(),

      supabase
        .from('subjects')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .order('subject_order', { ascending: true }),

      supabase
        .from('students')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .eq('class_id', classId)
        .eq('status', 'active'),

      supabase
        .from('scores')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .eq('class_id', classId)
        .eq('session_id', sessionId)
        .eq('term_id', termId),

      supabase
        .from('grading_scale')
        .select('min_score, max_score, grade')
    ]);

    if (classRes.error) throw classRes.error;
    if (sessionRes.error) throw sessionRes.error;
    if (termRes.error) throw termRes.error;
    if (schoolRes.error) throw schoolRes.error;
    if (subjectsRes.error) throw subjectsRes.error;
    if (studentsRes.error) throw studentsRes.error;
    if (scoresRes.error) throw scoresRes.error;
    if (gradingRes.error) throw gradingRes.error;

    const subjects = (subjectsRes.data || []).map((subject) => ({
      ...subject,
      order: subject.subject_order,
    }));

    const calculateGrade = (score: number) => {
      const grade = (gradingRes.data || []).find(
        (item) =>
          score >= Number(item.min_score) &&
          score <= Number(item.max_score)
      );

      if (grade) return grade.grade;
      if (score >= 80) return 'A';
      if (score >= 70) return 'B';
      if (score >= 60) return 'C';
      if (score >= 50) return 'D';
      if (score >= 40) return 'E';
      return 'F';
    };

    const students = studentsRes.data || [];
    const classScores = scoresRes.data || [];

    const rows = students.map((student) => {
      const studentScores = classScores.filter(
        (score) => score.student_id === student.id
      );

      const subjectMap: Record<string, number | null> = {};
      let total = 0;
      let passed = 0;
      let failed = 0;

      for (const score of studentScores) {
        subjectMap[score.subject_id] = score.overall_total;
        total += Number(score.overall_total);

        if (Number(score.overall_total) >= 40) {
          passed++;
        } else {
          failed++;
        }
      }

      const average =
        studentScores.length > 0
          ? Number((total / studentScores.length).toFixed(1))
          : 0;

      return {
        studentId: student.id,
        admissionNumber: student.admission_number,
        studentName: `${student.last_name} ${student.first_name} ${student.middle_name || ''}`.trim(),
        gender: student.gender,
        subjectScores: subjectMap,
        totalScore: total,
        averageScore: average,
        overallGrade: calculateGrade(average),
        passedCount: passed,
        failedCount: failed,
      };
    });

    rows.sort(
      (a, b) =>
        b.averageScore - a.averageScore ||
        b.totalScore - a.totalScore
    );

    const finalRows = rows.map((row, index) => {
      const position =
        index > 0 &&
        row.averageScore === rows[index - 1].averageScore
          ? (rows[index - 1] as typeof row & { position: number }).position
          : index + 1;

      return { ...row, position };
    });

    const totalStudents = finalRows.length;

    const classAverage =
      totalStudents > 0
        ? Number(
            (
              finalRows.reduce((sum, row) => sum + row.averageScore, 0) /
              totalStudents
            ).toFixed(1)
          )
        : 0;

    const passedOverall = finalRows.filter(
      (row) => row.averageScore >= 40
    ).length;

    const overallPassRate =
      totalStudents > 0
        ? Number(((passedOverall / totalStudents) * 100).toFixed(1))
        : 0;

    const highestAverage =
      totalStudents > 0
        ? Math.max(...finalRows.map((row) => row.averageScore))
        : 0;

    const lowestAverage =
      totalStudents > 0
        ? Math.min(...finalRows.map((row) => row.averageScore))
        : 0;

    const school = schoolRes.data
      ? {
          id: schoolRes.data.id,
          name: schoolRes.data.name,
          motto: schoolRes.data.motto,
          address: schoolRes.data.address,
          phone: schoolRes.data.phone,
          email: schoolRes.data.email,
          logoUrl: schoolRes.data.logo_url,
          headTeacher: schoolRes.data.head_teacher,
        }
      : null;

    return NextResponse.json({
      className: classRes.data?.name || 'Unknown Class',
      sessionName: sessionRes.data?.name || '',
      termName: termRes.data?.name || '',
      school,
      subjects,
      rows: finalRows,
      statistics: {
        totalStudents,
        classAverage,
        overallPassRate,
        highestAverage,
        lowestAverage,
      },
    });
  } catch (error) {
    console.error('Generate broadsheet error:', error);

    return NextResponse.json(
      { error: 'Failed to generate broadsheet' },
      { status: 500 }
    );
  }
}
