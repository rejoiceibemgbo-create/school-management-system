import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AttendanceRecord } from '@/lib/types';

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
    const records = database.attendanceRecords.filter(
      a => a.classId === classId && a.sessionId === sessionId && a.termId === termId
    );

    const termObj = database.terms.find(t => t.id === termId);
    const defaultDays = termObj?.totalSchoolDays || 60;

    const data = students.map(st => {
      const existing = records.find(r => r.studentId === st.id);
      return {
        studentId: st.id,
        admissionNumber: st.admissionNumber,
        studentName: `${st.lastName} ${st.firstName} ${st.middleName || ''}`.trim(),
        totalSchoolDays: existing?.totalSchoolDays ?? defaultDays,
        daysPresent: existing?.daysPresent ?? defaultDays,
        daysAbsent: existing?.daysAbsent ?? 0,
        hasRecord: !!existing,
      };
    });

    return NextResponse.json({ attendance: data, defaultDays });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, termId, classId, records } = body;

    if (!sessionId || !termId || !classId || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const database = db.read();

    for (const item of records) {
      if (!item.studentId) continue;

      const totalSchoolDays = Math.max(1, Number(item.totalSchoolDays) || 60);
      const daysPresent = Math.min(totalSchoolDays, Math.max(0, Number(item.daysPresent) || 0));
      const daysAbsent = Math.max(0, totalSchoolDays - daysPresent);

      const existingIndex = database.attendanceRecords.findIndex(
        a => a.studentId === item.studentId && a.sessionId === sessionId && a.termId === termId
      );

      const record: AttendanceRecord = {
        id: existingIndex !== -1 ? database.attendanceRecords[existingIndex].id : `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        schoolId: database.school.id,
        sessionId,
        termId,
        classId,
        studentId: item.studentId,
        totalSchoolDays,
        daysPresent,
        daysAbsent,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex !== -1) {
        database.attendanceRecords[existingIndex] = record;
      } else {
        database.attendanceRecords.push(record);
      }
    }

    db.write(database);
    return NextResponse.json({ success: true, message: 'Attendance records saved successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 });
  }
}
