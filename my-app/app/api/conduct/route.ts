import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ConductAssessment } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');

    const database = db.read();

    if (studentId && sessionId && termId) {
      const conduct = database.conductAssessments.find(
        c => c.studentId === studentId && c.sessionId === sessionId && c.termId === termId
      );
      return NextResponse.json({ conduct: conduct || null });
    }

    if (classId && sessionId && termId) {
      const students = database.students.filter(s => s.classId === classId && s.status === 'active');
      const assessments = database.conductAssessments.filter(
        c => c.classId === classId && c.sessionId === sessionId && c.termId === termId
      );

      const result = students.map(st => {
        const existing = assessments.find(a => a.studentId === st.id);
        return {
          studentId: st.id,
          admissionNumber: st.admissionNumber,
          studentName: `${st.lastName} ${st.firstName} ${st.middleName || ''}`.trim(),
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

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch conduct assessments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, termId, classId, assessments } = body;

    if (!sessionId || !termId || !classId || !Array.isArray(assessments)) {
      return NextResponse.json({ error: 'Missing required assessment parameters' }, { status: 400 });
    }

    const database = db.read();

    for (const item of assessments) {
      if (!item.studentId) continue;

      const existingIndex = database.conductAssessments.findIndex(
        c => c.studentId === item.studentId && c.sessionId === sessionId && c.termId === termId
      );

      const record: ConductAssessment = {
        id: existingIndex !== -1 ? database.conductAssessments[existingIndex].id : `cnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        schoolId: database.school.id,
        sessionId,
        termId,
        classId,
        studentId: item.studentId,
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
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex !== -1) {
        database.conductAssessments[existingIndex] = record;
      } else {
        database.conductAssessments.push(record);
      }
    }

    db.write(database);
    db.logAudit('teacher', 'Teacher', 'SAVE_CONDUCT', 'conduct', `${classId}`, `Updated conduct assessments for class students`);

    return NextResponse.json({ success: true, message: 'Conduct assessments saved successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save conduct assessments' }, { status: 500 });
  }
}
