import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');

    if (!classId || !sessionId || !termId) {
      return NextResponse.json({ error: 'Class, Session, and Term are required' }, { status: 400 });
    }

    const database = db.read();
    const classObj = database.classes.find(c => c.id === classId);
    const sessionObj = database.sessions.find(s => s.id === sessionId);
    const termObj = database.terms.find(t => t.id === termId);

    const { rows, classAverage } = db.getBroadsheet(classId, sessionId, termId);

    // Get subjects for columns
    const subjects = [...database.subjects].sort((a, b) => a.order - b.order);

    // Compute summary stats
    const totalStudents = rows.length;
    const passedOverall = rows.filter(r => r.averageScore >= 40).length;
    const overallPassRate = totalStudents > 0 ? Number(((passedOverall / totalStudents) * 100).toFixed(1)) : 0;
    const highestAverage = rows.length > 0 ? Math.max(...rows.map(r => r.averageScore)) : 0;
    const lowestAverage = rows.length > 0 ? Math.min(...rows.map(r => r.averageScore)) : 0;

    return NextResponse.json({
      className: classObj ? classObj.name : 'Unknown Class',
      sessionName: sessionObj ? sessionObj.name : '',
      termName: termObj ? termObj.name : '',
      school: database.school,
      subjects,
      rows,
      statistics: {
        totalStudents,
        classAverage,
        overallPassRate,
        highestAverage,
        lowestAverage,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate broadsheet' }, { status: 500 });
  }
}
