
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SCHOOL_ID = 'sch_happy_home';

async function calculateGradeAndRemark(score: number) {
  const { data, error } = await supabase
    .from('grading_scale')
    .select('min_score, max_score, grade, remark');

  if (error) throw error;

  const matchingGrade = (data || []).find(
    (item) =>
      score >= Number(item.min_score) &&
      score <= Number(item.max_score)
  );

  return {
    grade: matchingGrade?.grade || 'F',
    remark: matchingGrade?.remark || 'Needs Improvement',
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const studentId = searchParams.get('studentId');

    let scoresQuery = supabase
      .from('scores')
      .select('*')
      .eq('school_id', SCHOOL_ID);

    if (sessionId) scoresQuery = scoresQuery.eq('session_id', sessionId);
    if (termId) scoresQuery = scoresQuery.eq('term_id', termId);
    if (classId) scoresQuery = scoresQuery.eq('class_id', classId);
    if (subjectId) scoresQuery = scoresQuery.eq('subject_id', subjectId);
    if (studentId) scoresQuery = scoresQuery.eq('student_id', studentId);

    const { data: scores, error: scoresError } = await scoresQuery;

    if (scoresError) throw scoresError;

    if (classId && subjectId) {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(
          'id, admission_number, first_name, last_name, middle_name, gender'
        )
        .eq('school_id', SCHOOL_ID)
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('last_name', { ascending: true });

      if (studentsError) throw studentsError;

      let isLocked = false;

      if (termId) {
        const { data: term, error: termError } = await supabase
          .from('academic_terms')
          .select('is_locked')
          .eq('id', termId)
          .maybeSingle();

        if (termError) throw termError;

        isLocked = term?.is_locked || false;
      }

      const studentScoreEntries = (students || []).map((student) => {
        const existingScore = (scores || []).find(
          (score) =>
            score.student_id === student.id &&
            score.subject_id === subjectId
        );

        return {
          studentId: student.id,
          admissionNumber: student.admission_number,
          studentName: `${student.last_name} ${student.first_name} ${student.middle_name || ''}`.trim(),
          gender: student.gender,
          scoreId: existingScore?.id || null,
          homework: existingScore?.homework ?? 0,
          test1: existingScore?.test1 ?? 0,
          test2: existingScore?.test2 ?? 0,
          caTotal: existingScore?.ca_total ?? 0,
          exam: existingScore?.exam ?? 0,
          overallTotal: existingScore?.overall_total ?? 0,
          grade: existingScore?.grade || '-',
          remark: existingScore?.remark || '-',
          status: existingScore?.status || 'draft',
          hasRecord: !!existingScore,
        };
      });

      return NextResponse.json({
        students: studentScoreEntries,
        isLocked,
        totalStudents: studentScoreEntries.length,
      });
    }

    return NextResponse.json({
      scores: (scores || []).map((score) => ({
        id: score.id,
        schoolId: score.school_id,
        sessionId: score.session_id,
        termId: score.term_id,
        classId: score.class_id,
        studentId: score.student_id,
        subjectId: score.subject_id,
        homework: score.homework,
        test1: score.test1,
        test2: score.test2,
        caTotal: score.ca_total,
        exam: score.exam,
        overallTotal: score.overall_total,
        grade: score.grade,
        remark: score.remark,
        status: score.status,
        teacherId: score.teacher_id,
        updatedAt: score.updated_at,
      })),
    });
  } catch (error) {
    console.error('Fetch scores error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch scores' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      sessionId,
      termId,
      classId,
      subjectId,
      scores,
      status = 'draft',
      teacherId,
    } = body;

    if (!sessionId || !termId || !classId || !subjectId) {
      return NextResponse.json(
        { error: 'Session, Term, Class, and Subject are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json(
        { error: 'No scores provided' },
        { status: 400 }
      );
    }

    const { data: term, error: termError } = await supabase
      .from('academic_terms')
      .select('is_locked')
      .eq('id', termId)
      .maybeSingle();

    if (termError) throw termError;

    if (term?.is_locked) {
      return NextResponse.json(
        { error: 'This term is locked. Scores cannot be modified.' },
        { status: 403 }
      );
    }

    let savedCount = 0;

    for (const entry of scores) {
      const studentId = entry.studentId;

      if (!studentId) continue;

      const homework = Math.min(10, Math.max(0, Number(entry.homework) || 0));
      const test1 = Math.min(10, Math.max(0, Number(entry.test1) || 0));
      const test2 = Math.min(20, Math.max(0, Number(entry.test2) || 0));
      const exam = Math.min(60, Math.max(0, Number(entry.exam) || 0));

      // Calculate totals for grading.
      // Supabase generates ca_total and overall_total in the database.
      const caTotal = Number((homework + test1 + test2).toFixed(1));
      const overallTotal = Number((caTotal + exam).toFixed(1));

      const { grade, remark } =
        await calculateGradeAndRemark(overallTotal);

      const { data: existingScore, error: existingError } = await supabase
        .from('scores')
        .select('id')
        .eq('school_id', SCHOOL_ID)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      // Do not include generated columns ca_total or overall_total.
      const scoreRecord = {
        school_id: SCHOOL_ID,
        session_id: sessionId,
        term_id: termId,
        class_id: classId,
        student_id: studentId,
        subject_id: subjectId,
        homework,
        test1,
        test2,
        exam,
        grade,
        remark,
        status: status === 'submitted' ? 'submitted' : 'draft',
        teacher_id: teacherId || null,
        updated_at: new Date().toISOString(),
      };

      let saveError;

      if (existingScore) {
        const result = await supabase
          .from('scores')
          .update(scoreRecord)
          .eq('id', existingScore.id)
          .eq('school_id', SCHOOL_ID);

        saveError = result.error;
      } else {
        const result = await supabase
          .from('scores')
          .insert({
            ...scoreRecord,
            id: `scr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          });

        saveError = result.error;
      }

      if (saveError) throw saveError;

      savedCount++;
    }

    const [{ data: subject }, { data: schoolClass }] = await Promise.all([
      supabase
        .from('subjects')
        .select('name')
        .eq('id', subjectId)
        .maybeSingle(),

      supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .maybeSingle(),
    ]);

// Create or update the pending approval record.
if (status === 'submitted' && savedCount > 0) {
  const { data: existingApproval, error: approvalCheckError } =
    await supabase
      .from('result_approvals')
      .select('id')
      .eq('school_id', SCHOOL_ID)
      .eq('session_id', sessionId)
      .eq('term_id', termId)
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

  if (approvalCheckError) throw approvalCheckError;
  console.log('APPROVAL CHECK:', {
  status,
  savedCount,
  sessionId,
  termId,
  classId,
  subjectId,
  existingApproval,
});

  if (existingApproval) {
    const { error } = await supabase
      .from('result_approvals')
      .update({
        submitted_by: teacherId || null,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', existingApproval.id)
      .eq('school_id', SCHOOL_ID);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('result_approvals')
      .insert({
        id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        school_id: SCHOOL_ID,
        session_id: sessionId,
        term_id: termId,
        class_id: classId,
        subject_id: subjectId,
        status: 'pending',
        submitted_by: teacherId || null,
        submitted_at: new Date().toISOString(),
      });

    if (error) throw error;
  }
}
    const auditAction =
      status === 'submitted' ? 'SUBMIT_SCORES' : 'SAVE_SCORES_DRAFT';

    const auditDetails = `${
      status === 'submitted' ? 'Submitted' : 'Saved draft'
    } scores for ${savedCount} student(s) in ${
      schoolClass?.name || 'Class'
    } (${subject?.name || 'Subject'})`;

    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        school_id: SCHOOL_ID,
        user_id: teacherId || null,
        user_name: 'Teacher',
        action: auditAction,
        entity_type: 'score',
        entity_id: `${classId}_${subjectId}`,
        details: auditDetails,
      });

    if (auditError) throw auditError;

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${savedCount} score records (${status})`,
      savedCount,
    });
  } catch (error) {
    console.error('Save scores error:', error);

    return NextResponse.json(
      { error: 'Failed to save scores' },
      { status: 500 }
    );
  }
}
