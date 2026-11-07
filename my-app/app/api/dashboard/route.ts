import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');
    const classId = searchParams.get('classId');

    const database = db.read();

    const activeSession = sessionId
      ? database.sessions.find(s => s.id === sessionId)
      : database.sessions.find(s => s.isCurrent) || database.sessions[0];

    const activeTerm = termId
      ? database.terms.find(t => t.id === termId)
      : database.terms.find(t => t.isCurrent) || database.terms[0];

    const currentSessionId = activeSession?.id || '';
    const currentTermId = activeTerm?.id || '';

    // Students filter
    let relevantStudents = database.students;
    if (classId && classId !== 'all') {
      relevantStudents = relevantStudents.filter(s => s.classId === classId);
    }
    const totalStudents = relevantStudents.length;
    const totalActiveStudents = relevantStudents.filter(s => s.status === 'active').length;

    // Classes & Teachers & Subjects
    const totalClasses = database.classes.length;
    const totalTeachers = database.users.filter(u => u.role.includes('teacher')).length;
    const totalSubjects = database.subjects.length;

    // Scores filtered by session, term, and optionally class
    let filteredScores = database.scores.filter(
      s => s.sessionId === currentSessionId && s.termId === currentTermId
    );
    if (classId && classId !== 'all') {
      filteredScores = filteredScores.filter(s => s.classId === classId);
    }

    // Students with completed results (students who have scores in at least 1 subject)
    const studentsWithScoreIds = new Set(filteredScores.map(s => s.studentId));
    const studentsWithCompletedResults = studentsWithScoreIds.size;

    // Overall Average and Pass Rate
    let overallAverage = 0;
    let overallPassRate = 0;
    if (filteredScores.length > 0) {
      const sum = filteredScores.reduce((acc, curr) => acc + curr.overallTotal, 0);
      overallAverage = Number((sum / filteredScores.length).toFixed(1));
      const passedCount = filteredScores.filter(s => s.overallTotal >= 40).length;
      overallPassRate = Number(((passedCount / filteredScores.length) * 100).toFixed(1));
    }

    // Chart 1: Student population by class
    const populationByClass = database.classes.map(cls => {
      const count = database.students.filter(s => s.classId === cls.id && s.status === 'active').length;
      return {
        className: cls.name,
        count,
      };
    });

    // Chart 2: Performance by subject
    const performanceBySubject = database.subjects.map(sub => {
      const subScores = filteredScores.filter(s => s.subjectId === sub.id);
      const avg = subScores.length > 0
        ? Number((subScores.reduce((acc, c) => acc + c.overallTotal, 0) / subScores.length).toFixed(1))
        : 0;
      return {
        subjectName: sub.name,
        code: sub.code,
        average: avg,
        totalEntries: subScores.length,
      };
    });

    // Chart 3: Performance by class
    const performanceByClass = database.classes.map(cls => {
      const classScores = database.scores.filter(
        s => s.sessionId === currentSessionId && s.termId === currentTermId && s.classId === cls.id
      );
      const avg = classScores.length > 0
        ? Number((classScores.reduce((acc, c) => acc + c.overallTotal, 0) / classScores.length).toFixed(1))
        : 0;
      return {
        className: cls.name,
        average: avg,
      };
    });

    // Chart 4: Grade distribution (A, B, C, D, E, F)
    const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    for (const sc of filteredScores) {
      if (gradeDistribution[sc.grade] !== undefined) {
        gradeDistribution[sc.grade]++;
      } else {
        gradeDistribution[sc.grade] = (gradeDistribution[sc.grade] || 0) + 1;
      }
    }

    // Chart 5: Termly academic performance trend
    const termlyPerformance = database.terms
      .filter(t => t.sessionId === currentSessionId)
      .map(term => {
        const termScores = database.scores.filter(
          s => s.sessionId === currentSessionId && s.termId === term.id && (classId && classId !== 'all' ? s.classId === classId : true)
        );
        const avg = termScores.length > 0
          ? Number((termScores.reduce((acc, c) => acc + c.overallTotal, 0) / termScores.length).toFixed(1))
          : 0;
        return {
          termName: term.name,
          average: avg,
        };
      });

    // Attendance stats
    const attendanceRecords = database.attendanceRecords.filter(
      a => a.sessionId === currentSessionId && a.termId === currentTermId && (classId && classId !== 'all' ? a.classId === classId : true)
    );
    let avgAttendanceRate = 100;
    if (attendanceRecords.length > 0) {
      const totalDays = attendanceRecords.reduce((acc, a) => acc + a.totalSchoolDays, 0);
      const presentDays = attendanceRecords.reduce((acc, a) => acc + a.daysPresent, 0);
      avgAttendanceRate = totalDays > 0 ? Number(((presentDays / totalDays) * 100).toFixed(1)) : 100;
    }

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
      activeSession,
      activeTerm,
      sessions: database.sessions,
      terms: database.terms,
      classes: database.classes,
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
