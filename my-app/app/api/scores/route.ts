import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Score } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const studentId = searchParams.get('studentId');

    const database = db.read();
    let scores = [...database.scores];

    if (sessionId) scores = scores.filter(s => s.sessionId === sessionId);
    if (termId) scores = scores.filter(s => s.termId === termId);
    if (classId) scores = scores.filter(s => s.classId === classId);
    if (subjectId) scores = scores.filter(s => s.subjectId === subjectId);
    if (studentId) scores = scores.filter(s => s.studentId === studentId);

    // If querying by class and subject, return students in that class merged with their existing score or empty score structure
    if (classId && subjectId) {
      const classStudents = database.students.filter(s => s.classId === classId && s.status === 'active');
      const termObj = database.terms.find(t => t.id === termId);
      const isLocked = termObj?.isLocked || false;

      const studentScoreEntries = classStudents.map(student => {
        const existingScore = scores.find(s => s.studentId === student.id);
        return {
          studentId: student.id,
          admissionNumber: student.admissionNumber,
          studentName: `${student.lastName} ${student.firstName} ${student.middleName || ''}`.trim(),
          gender: student.gender,
          scoreId: existingScore?.id || null,
          homework: existingScore?.homework ?? 0,
          test1: existingScore?.test1 ?? 0,
          test2: existingScore?.test2 ?? 0,
          caTotal: existingScore?.caTotal ?? 0,
          exam: existingScore?.exam ?? 0,
          overallTotal: existingScore?.overallTotal ?? 0,
          grade: existingScore?.grade || '-',
          remark: existingScore?.remark || '-',
          status: existingScore?.status || 'draft',
          hasRecord: !!existingScore,
        };
      });

      return NextResponse.json({
        students: studentScoreEntries,
        isLocked,
        totalStudents: classStudents.length,
      });
    }

    return NextResponse.json({ scores });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, termId, classId, subjectId, scores, status = 'draft', teacherId } = body;

    if (!sessionId || !termId || !classId || !subjectId) {
      return NextResponse.json({ error: 'Session, Term, Class, and Subject are required' }, { status: 400 });
    }

    const database = db.read();

    // Check if term is locked
    const term = database.terms.find(t => t.id === termId);
    if (term?.isLocked) {
      return NextResponse.json({ error: 'This term is locked. Scores cannot be modified.' }, { status: 403 });
    }

    if (!Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json({ error: 'No scores provided' }, { status: 400 });
    }

    let savedCount = 0;

    for (const entry of scores) {
      const studentId = entry.studentId;
      if (!studentId) continue;

      // Validate bounds
      const homework = Math.min(10, Math.max(0, Number(entry.homework) || 0));
      const test1 = Math.min(10, Math.max(0, Number(entry.test1) || 0));
      const test2 = Math.min(20, Math.max(0, Number(entry.test2) || 0));
      const exam = Math.min(60, Math.max(0, Number(entry.exam) || 0));

      // Automated calculations
      const caTotal = Number((homework + test1 + test2).toFixed(1));
      const overallTotal = Number((caTotal + exam).toFixed(1));
      const { grade, remark } = db.calculateGradeAndRemark(overallTotal);

      // Check existing
      const existingIndex = database.scores.findIndex(
        s => s.sessionId === sessionId && s.termId === termId && s.studentId === studentId && s.subjectId === subjectId
      );

      const scoreRecord: Score = {
        id: existingIndex !== -1 ? database.scores[existingIndex].id : `scr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        schoolId: database.school.id,
        sessionId,
        termId,
        classId,
        studentId,
        subjectId,
        homework,
        test1,
        test2,
        caTotal,
        exam,
        overallTotal,
        grade,
        remark,
        status: status === 'submitted' ? 'submitted' : 'draft',
        teacherId: teacherId || undefined,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex !== -1) {
        database.scores[existingIndex] = scoreRecord;
      } else {
        database.scores.push(scoreRecord);
      }
      savedCount++;
    }

    db.write(database);

    const subjectObj = database.subjects.find(s => s.id === subjectId);
    const classObj = database.classes.find(c => c.id === classId);

    db.logAudit(
      teacherId || 'teacher',
      'Teacher',
      status === 'submitted' ? 'SUBMIT_SCORES' : 'SAVE_SCORES_DRAFT',
      'score',
      `${classId}_${subjectId}`,
      `${status === 'submitted' ? 'Submitted' : 'Saved draft'} scores for ${savedCount} student(s) in ${classObj?.name || 'Class'} (${subjectObj?.name || 'Subject'})`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${savedCount} score records (${status})`,
      savedCount,
    });
  } catch (error) {
    console.error('Save scores error:', error);
    return NextResponse.json({ error: 'Failed to save scores' }, { status: 500 });
  }
}
