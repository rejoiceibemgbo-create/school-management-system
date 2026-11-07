import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ReportComment } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');
    const classId = searchParams.get('classId');

    if (!sessionId || !termId || !classId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const database = db.read();
    const students = database.students.filter(s => s.classId === classId && s.status === 'active');
    const comments = database.reportComments.filter(
      c => c.classId === classId && c.sessionId === sessionId && c.termId === termId
    );

    const data = students.map(st => {
      const existing = comments.find(c => c.studentId === st.id);
      return {
        studentId: st.id,
        admissionNumber: st.admissionNumber,
        studentName: `${st.lastName} ${st.firstName} ${st.middleName || ''}`.trim(),
        classTeacherComment: existing?.classTeacherComment || '',
        headTeacherComment: existing?.headTeacherComment || '',
        promotionStatus: existing?.promotionStatus || 'Promoted',
        hasRecord: !!existing,
      };
    });

    return NextResponse.json({ comments: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, termId, classId, comments } = body;

    if (!sessionId || !termId || !classId || !Array.isArray(comments)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const database = db.read();

    for (const item of comments) {
      if (!item.studentId) continue;

      const existingIndex = database.reportComments.findIndex(
        c => c.studentId === item.studentId && c.sessionId === sessionId && c.termId === termId
      );

      const record: ReportComment = {
        id: existingIndex !== -1 ? database.reportComments[existingIndex].id : `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        schoolId: database.school.id,
        sessionId,
        termId,
        classId,
        studentId: item.studentId,
        classTeacherComment: item.classTeacherComment || '',
        headTeacherComment: item.headTeacherComment || '',
        promotionStatus: item.promotionStatus || 'Promoted',
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex !== -1) {
        database.reportComments[existingIndex] = record;
      } else {
        database.reportComments.push(record);
      }
    }

    db.write(database);
    return NextResponse.json({ success: true, message: 'Comments saved successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save comments' }, { status: 500 });
  }
}
