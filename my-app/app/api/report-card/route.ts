import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');
    const selectedIdsParam = searchParams.get('selectedIds');

    if (!sessionId || !termId) {
      return NextResponse.json({ error: 'Session and Term are required' }, { status: 400 });
    }

    const database = db.read();
    const school = database.school;
    const sessionObj = database.sessions.find(s => s.id === sessionId);
    const termObj = database.terms.find(t => t.id === termId);
    const gradingScale = database.gradingScale;

    // Single student report card
    if (studentId) {
      const summary = db.getStudentReportSummary(studentId, sessionId, termId);
      if (!summary) {
        return NextResponse.json({ error: 'Student or records not found' }, { status: 404 });
      }

      return NextResponse.json({
        reportCard: summary,
        school,
        sessionName: sessionObj?.name || '',
        termName: termObj?.name || '',
        nextTermBegins: termObj?.nextTermBegins || '',
        totalSchoolDays: termObj?.totalSchoolDays || 60,
        gradingScale,
      });
    }

    // Bulk class report cards
    if (classId) {
      let targetStudents = database.students.filter(s => s.classId === classId && s.status === 'active');

      if (selectedIdsParam) {
        const selectedIds = selectedIdsParam.split(',');
        targetStudents = targetStudents.filter(s => selectedIds.includes(s.id));
      }

      const reportCards = targetStudents
        .map(st => db.getStudentReportSummary(st.id, sessionId, termId))
        .filter((r): r is NonNullable<typeof r> => r !== null);

      return NextResponse.json({
        reportCards,
        school,
        sessionName: sessionObj?.name || '',
        termName: termObj?.name || '',
        nextTermBegins: termObj?.nextTermBegins || '',
        totalSchoolDays: termObj?.totalSchoolDays || 60,
        gradingScale,
      });
    }

    return NextResponse.json({ error: 'Either studentId or classId must be provided' }, { status: 400 });
  } catch (error) {
    console.error('Report card generation error:', error);
    return NextResponse.json({ error: 'Failed to generate report card' }, { status: 500 });
  }
}
