
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SCHOOL_ID = 'sch_happy_home';

type Row = Record<string, any>;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');
    const classId = searchParams.get('classId');

    const [
      sessionsRes,
      termsRes,
      studentsRes,
      classesRes,
      usersRes,
      subjectsRes,
      scoresRes,
      attendanceRes,
    ] = await Promise.all([
      supabase
        .from('academic_sessions')
        .select('*')
        .order('name'),

      supabase
        .from('academic_terms')
        .select('*')
        .order('name'),

      supabase
        .from('students')
        .select('*')
        .eq('school_id', SCHOOL_ID),

      supabase
        .from('classes')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .order('class_order'),

      supabase
        .from('users')
        .select('id, full_name, role')
        .eq('school_id', SCHOOL_ID),

      supabase
        .from('subjects')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .order('subject_order'),

      supabase
        .from('scores')
        .select('*')
        .eq('school_id', SCHOOL_ID),

      supabase
        .from('attendance_records')
        .select('*')
        .eq('school_id', SCHOOL_ID),
    ]);

    for (const result of [
      sessionsRes,
      termsRes,
      studentsRes,
      classesRes,
      usersRes,
      subjectsRes,
      scoresRes,
      attendanceRes,
    ]) {
      if (result.error) throw result.error;
    }

    const sessions: Row[] = sessionsRes.data || [];
    const terms: Row[] = termsRes.data || [];
    const students: Row[] = studentsRes.data || [];
    const classes: Row[] = classesRes.data || [];
    const users: Row[] = usersRes.data || [];
    const subjects: Row[] = subjectsRes.data || [];
    const allScores: Row[] = scoresRes.data || [];
    const allAttendance: Row[] = attendanceRes.data || [];

    const activeSession = sessionId
      ? sessions.find((s) => s.id === sessionId)
      : sessions.find((s) => s.is_current) || sessions[0];

    const activeTerm = termId
      ? terms.find((t) => t.id === termId)
      : terms.find((t) => t.is_current) || terms[0];

    const currentSessionId = activeSession?.id || '';
    const currentTermId = activeTerm?.id || '';

    // Students
    let relevantStudents = students;

    if (classId && classId !== 'all') {
      relevantStudents = relevantStudents.filter(
        (student) => student.class_id === classId
      );
    }

    const totalStudents = relevantStudents.length;
    const totalActiveStudents = relevantStudents.filter(
      (student) => student.status === 'active'
    ).length;

    // Classes, teachers and subjects
    const totalClasses = classes.length;
    const totalTeachers = users.filter(
      (user) => String(user.role || '').includes('teacher')
    ).length;
    const totalSubjects = subjects.length;

    // Scores for selected session and term
    let sessionScores = allScores.filter(
      (score) => score.session_id === currentSessionId
    );

    let filteredScores = sessionScores.filter(
      (score) => score.term_id === currentTermId
    );

    if (classId && classId !== 'all') {
      filteredScores = filteredScores.filter(
        (score) => score.class_id === classId
      );
    }

    // Students with results
    const studentsWithScoreIds = new Set(
      filteredScores.map((score) => score.student_id)
    );

    const studentsWithCompletedResults = studentsWithScoreIds.size;

    // Average and pass rate
    let overallAverage = 0;
    let overallPassRate = 0;

    if (filteredScores.length > 0) {
      const sum = filteredScores.reduce(
        (acc, score) => acc + Number(score.overall_total || 0),
        0
      );

      overallAverage = Number(
        (sum / filteredScores.length).toFixed(1)
      );

      const passedCount = filteredScores.filter(
        (score) => Number(score.overall_total || 0) >= 40
      ).length;

      overallPassRate = Number(
        ((passedCount / filteredScores.length) * 100).toFixed(1)
      );
    }

    // Chart 1: Student population by class
    const populationByClass = classes.map((cls) => ({
      className: cls.name,
      count: students.filter(
        (student) =>
          student.class_id === cls.id &&
          student.status === 'active'
      ).length,
    }));

    // Chart 2: Performance by subject
    const performanceBySubject = subjects.map((subject) => {
      const subScores = filteredScores.filter(
        (score) => score.subject_id === subject.id
      );

      const avg = subScores.length
        ? Number(
            (
              subScores.reduce(
                (acc, score) =>
                  acc + Number(score.overall_total || 0),
                0
              ) / subScores.length
            ).toFixed(1)
          )
        : 0;

      return {
        subjectName: subject.name,
        code: subject.code,
        average: avg,
        totalEntries: subScores.length,
      };
    });

    // Chart 3: Performance by class
    const performanceByClass = classes.map((cls) => {
      const classScores = sessionScores.filter(
        (score) =>
          score.term_id === currentTermId &&
          score.class_id === cls.id
      );

      const avg = classScores.length
        ? Number(
            (
              classScores.reduce(
                (acc, score) =>
                  acc + Number(score.overall_total || 0),
                0
              ) / classScores.length
            ).toFixed(1)
          )
        : 0;

      return {
        className: cls.name,
        average: avg,
      };
    });

    // Chart 4: Grade distribution
    const gradeDistribution: Record<string, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
      F: 0,
    };

    for (const score of filteredScores) {
      const grade = score.grade || '';

      if (grade) {
        gradeDistribution[grade] =
          (gradeDistribution[grade] || 0) + 1;
      }
    }

    // Chart 5: Performance across terms
    const termlyPerformance = terms
      .filter((term) => term.session_id === currentSessionId)
      .map((term) => {
        let termScores = sessionScores.filter(
          (score) => score.term_id === term.id
        );

        if (classId && classId !== 'all') {
          termScores = termScores.filter(
            (score) => score.class_id === classId
          );
        }

        const avg = termScores.length
          ? Number(
              (
                termScores.reduce(
                  (acc, score) =>
                    acc + Number(score.overall_total || 0),
                  0
                ) / termScores.length
              ).toFixed(1)
            )
          : 0;

        return {
          termName: term.name,
          average: avg,
        };
      });

    // Attendance statistics
    let attendanceRecords = allAttendance.filter(
      (record) =>
        record.session_id === currentSessionId &&
        record.term_id === currentTermId
    );

    if (classId && classId !== 'all') {
      attendanceRecords = attendanceRecords.filter(
        (record) => record.class_id === classId
      );
    }

    let avgAttendanceRate = 100;

    if (attendanceRecords.length > 0) {
      const totalDays = attendanceRecords.reduce(
        (acc, record) =>
          acc + Number(record.total_school_days || 0),
        0
      );

      const presentDays = attendanceRecords.reduce(
        (acc, record) =>
          acc + Number(record.days_present || 0),
        0
      );

      avgAttendanceRate =
        totalDays > 0
          ? Number(((presentDays / totalDays) * 100).toFixed(1))
          : 100;
    }

    // Convert database field names to the format expected by the frontend
    const formattedSessions = sessions.map((session) => ({
      ...session,
      isCurrent: session.is_current,
    }));

    const formattedTerms = terms.map((term) => ({
      ...term,
      sessionId: term.session_id,
      isCurrent: term.is_current,
    }));

    const formattedClasses = classes.map((cls) => ({
      id: cls.id,
      schoolId: cls.school_id,
      name: cls.name,
      arm: cls.arm || '',
      category: cls.category,
      order: cls.class_order,
      classTeacherId: cls.class_teacher_id,
      capacity: cls.capacity,
    }));

    return NextResponse.json({
      kpis: {
        totalStudents,
        totalActiveStudents,
        totalClasses,
        totalTeachers,
        totalSubjects,
        studentsWithCompletedResults,
        classAverage: overallAverage,
        overallPassRate,
        averageAttendanceRate: avgAttendanceRate,
      },
      charts: {
        populationByClass,
        performanceBySubject,
        performanceByClass,
        gradeDistribution,
        termlyPerformance,
      },
      activeSession: activeSession
        ? { ...activeSession, isCurrent: activeSession.is_current }
        : null,
      activeTerm: activeTerm
        ? {
            ...activeTerm,
            sessionId: activeTerm.session_id,
            isCurrent: activeTerm.is_current,
          }
        : null,
      sessions: formattedSessions,
      terms: formattedTerms,
      classes: formattedClasses,
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
