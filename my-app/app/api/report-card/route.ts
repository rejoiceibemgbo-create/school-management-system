
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SCHOOL_ID = 'sch_happy_home';

type Row = Record<string, any>;

function mapStudent(student: Row) {
  return {
    id: student.id,
    schoolId: student.school_id,
    admissionNumber: student.admission_number,
    firstName: student.first_name,
    lastName: student.last_name,
    middleName: student.middle_name || '',
    gender: student.gender,
    dateOfBirth: student.date_of_birth,
    classId: student.class_id,
    photoUrl: student.signed_photo_url || '',
    parentName: student.parent_name,
    parentPhone: student.parent_phone,
    parentEmail: student.parent_email || '',
    homeAddress: student.home_address,
    admissionDate: student.admission_date,
    status: student.status,
    createdAt: student.created_at,
    updatedAt: student.updated_at,
  };
}

function mapScore(score: Row, subject: Row | undefined) {
  return {
    id: score.id,
    schoolId: score.school_id,
    sessionId: score.session_id,
    termId: score.term_id,
    classId: score.class_id,
    studentId: score.student_id,
    subjectId: score.subject_id,
    homework: Number(score.homework || 0),
    test1: Number(score.test1 || 0),
    test2: Number(score.test2 || 0),
    caTotal: Number(score.ca_total || 0),
    exam: Number(score.exam || 0),
    overallTotal: Number(score.overall_total || 0),
    grade: score.grade || '',
    remark: score.remark || '',
    status: score.status || 'draft',
    teacherId: score.teacher_id || undefined,
    updatedAt: score.updated_at,
    subjectName: subject?.name || '',
    subjectOrder: Number(subject?.subject_order || 0),
  };
}

function mapConduct(record: Row | undefined) {
  if (!record) return undefined;

  return {
    id: record.id,
    schoolId: record.school_id,
    sessionId: record.session_id,
    termId: record.term_id,
    classId: record.class_id,
    studentId: record.student_id,
    punctuality: Number(record.punctuality || 0),
    regularity: Number(record.regularity || 0),
    neatness: Number(record.neatness || 0),
    honesty: Number(record.honesty || 0),
    obedience: Number(record.obedience || 0),
    respect: Number(record.respect || 0),
    participation: Number(record.participation || 0),
    cooperation: Number(record.cooperation || 0),
    leadership: Number(record.leadership || 0),
    responsibility: Number(record.responsibility || 0),
    updatedAt: record.updated_at,
  };
}

// Attendance now uses ONE mark per school day.
function mapAttendance(record: Row | undefined) {
  if (!record) return undefined;

  const totalDays = Math.max(
    0,
    Number(record.total_school_days || 0)
  );

  const daysPresent = Math.min(
    totalDays,
    Math.max(0, Number(record.days_present || 0))
  );

  const daysAbsent = Math.max(0, totalDays - daysPresent);

  return {
    id: record.id,
    schoolId: record.school_id,
    sessionId: record.session_id,
    termId: record.term_id,
    classId: record.class_id,
    studentId: record.student_id,
    totalSchoolDays: totalDays,
    totalMarks: totalDays,
    marksPresent: daysPresent,
    marksAbsent: daysAbsent,
    daysPresent,
    daysAbsent,
    updatedAt: record.updated_at,
  };
}

function mapComment(record: Row | undefined) {
  if (!record) return undefined;

  return {
    id: record.id,
    schoolId: record.school_id,
    sessionId: record.session_id,
    termId: record.term_id,
    classId: record.class_id,
    studentId: record.student_id,
    classTeacherComment: record.class_teacher_comment || '',
    headTeacherComment: record.head_teacher_comment || '',
    promotionStatus: record.promotion_status || 'Promoted',
    updatedAt: record.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const studentId = searchParams.get('studentId');
    const requestedClassId = searchParams.get('classId');
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');
    const selectedIdsParam = searchParams.get('selectedIds');

    if (!sessionId || !termId) {
      return NextResponse.json(
        { error: 'Session and Term are required' },
        { status: 400 }
      );
    }

    if (!studentId && !requestedClassId) {
      return NextResponse.json(
        { error: 'Either studentId or classId must be provided' },
        { status: 400 }
      );
    }

    let selectedStudent: Row | null = null;

    if (studentId) {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .eq('school_id', SCHOOL_ID)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return NextResponse.json(
          { error: 'Student or records not found' },
          { status: 404 }
        );
      }

      selectedStudent = data;
    }

    const targetClassId =
      requestedClassId || selectedStudent?.class_id;

    if (!targetClassId) {
      return NextResponse.json(
        { error: 'Student class could not be found' },
        { status: 404 }
      );
    }

    const [
      schoolRes,
      sessionRes,
      termRes,
      classRes,
      studentsRes,
      subjectsRes,
      scoresRes,
      conductRes,
      attendanceRes,
      commentsRes,
      gradingRes,
    ] = await Promise.all([
      supabase
        .from('schools')
        .select('*')
        .eq('id', SCHOOL_ID)
        .maybeSingle(),

      supabase
        .from('academic_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle(),

      supabase
        .from('academic_terms')
        .select('*')
        .eq('id', termId)
        .maybeSingle(),

      supabase
        .from('classes')
        .select('*')
        .eq('id', targetClassId)
        .eq('school_id', SCHOOL_ID)
        .maybeSingle(),

      supabase
        .from('students')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .eq('class_id', targetClassId)
        .order('last_name'),

      supabase
        .from('subjects')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .order('subject_order'),

      supabase
        .from('scores')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .eq('class_id', targetClassId)
        .eq('session_id', sessionId)
        .eq('term_id', termId),

      supabase
        .from('conduct_assessments')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .eq('class_id', targetClassId)
        .eq('session_id', sessionId)
        .eq('term_id', termId),

      supabase
        .from('attendance_records')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .eq('class_id', targetClassId)
        .eq('session_id', sessionId)
        .eq('term_id', termId),

      supabase
        .from('report_comments')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .eq('class_id', targetClassId)
        .eq('session_id', sessionId)
        .eq('term_id', termId),

      supabase
        .from('grading_scale')
        .select('*')
        .order('min_score'),
    ]);

    for (const result of [
      schoolRes,
      sessionRes,
      termRes,
      classRes,
      studentsRes,
      subjectsRes,
      scoresRes,
      conductRes,
      attendanceRes,
      commentsRes,
      gradingRes,
    ]) {
      if (result.error) throw result.error;
    }

    if (!sessionRes.data || !termRes.data || !classRes.data) {
      return NextResponse.json(
        { error: 'Class, session, or term not found' },
        { status: 404 }
      );
    }

    const students: Row[] = studentsRes.data || [];

    console.log('REPORT CARD STUDENTS:', {
      targetClassId,
      studentCount: students.length,
      students,
    });

    if (
      selectedStudent &&
      !students.some(
        (student) => student.id === selectedStudent!.id
      )
    ) {
      students.push(selectedStudent);
    }

    const studentsWithPhotoUrls: Row[] = await Promise.all(
      students.map(async (student): Promise<Row> => {
        let signedPhotoUrl = '';

        if (
          student.photo_url &&
          student.photo_url.startsWith(
            `${SCHOOL_ID}/${student.id}/`
          )
        ) {
          const {
            data: signedPhoto,
            error: photoError,
          } = await supabase.storage
            .from('student-photos')
            .createSignedUrl(student.photo_url, 3600);

          if (!photoError && signedPhoto?.signedUrl) {
            signedPhotoUrl = signedPhoto.signedUrl;
          } else {
            console.error(
              'Report card photo error:',
              photoError?.message
            );
          }
        }

        return {
          ...student,
          signed_photo_url: signedPhotoUrl,
        };
      })
    );

    const subjects: Row[] = subjectsRes.data || [];
    const scores: Row[] = scoresRes.data || [];
    const conductRecords: Row[] = conductRes.data || [];
    const attendanceRecords: Row[] = attendanceRes.data || [];
    const commentRecords: Row[] = commentsRes.data || [];
    const gradingScale: Row[] = gradingRes.data || [];

    const summaries = studentsWithPhotoUrls.map((student) => {
      const studentScores = scores
        .filter((score) => score.student_id === student.id)
        .map((score) => {
          const subject = subjects.find(
            (item) => item.id === score.subject_id
          );

          return mapScore(score, subject);
        })
        .sort((a, b) => a.subjectOrder - b.subjectOrder);

      const totalMarksObtained = studentScores.reduce(
        (sum, score) => sum + score.overallTotal,
        0
      );

      const totalPossibleMarks = studentScores.length * 100;

      const averageScore = studentScores.length
        ? Number(
            (totalMarksObtained / studentScores.length).toFixed(2)
          )
        : 0;

      const overallGrade = gradingScale.find(
        (item) =>
          averageScore >= Number(item.min_score) &&
          averageScore <= Number(item.max_score)
      );

      const conduct = conductRecords.find(
        (item) => item.student_id === student.id
      );

      const attendance = attendanceRecords.find(
        (item) => item.student_id === student.id
      );

      const comments = commentRecords.find(
        (item) => item.student_id === student.id
      );

      return {
        student: mapStudent(student),
        className: classRes.data!.name,
        scores: studentScores,
        conduct: mapConduct(conduct),
        attendance: mapAttendance(attendance),
        comments: mapComment(comments),
        totalMarksObtained,
        totalPossibleMarks,
        averageScore,
        overallGrade: overallGrade?.grade || '',
        overallRemark: overallGrade?.remark || '',
        subjectsPassed: studentScores.filter(
          (score) => score.overallTotal >= 40
        ).length,
        subjectsFailed: studentScores.filter(
          (score) => score.overallTotal < 40
        ).length,
        classPosition: 0,
        totalStudentsInClass: studentsWithPhotoUrls.length,
        classAverage: 0,
      };
    });

    const classAverage = summaries.length
      ? Number(
          (
            summaries.reduce(
              (sum, item) => sum + item.averageScore,
              0
            ) / summaries.length
          ).toFixed(2)
        )
      : 0;

    const sorted = [...summaries].sort(
      (a, b) => b.averageScore - a.averageScore
    );

    const positions = new Map<string, number>();
    let previousAverage: number | null = null;
    let currentPosition = 0;

    sorted.forEach((item, index) => {
      if (item.averageScore !== previousAverage) {
        currentPosition = index + 1;
        previousAverage = item.averageScore;
      }

      positions.set(item.student.id, currentPosition);
    });

    const reportCards = summaries.map((item) => ({
      ...item,
      classPosition: positions.get(item.student.id) || 0,
      classAverage,
    }));

    const school = schoolRes.data
      ? {
          id: schoolRes.data.id,
          name: schoolRes.data.name,
          motto: schoolRes.data.motto,
          address: schoolRes.data.address,
          phone: schoolRes.data.phone,
          email: schoolRes.data.email,
          logoUrl: '/logo.jpeg',
          principalName: schoolRes.data.head_teacher || '',
          headTeacherName: schoolRes.data.head_teacher || '',
          headTeacher: schoolRes.data.head_teacher || '',
        }
      : null;

    console.log('SCHOOL LOGO VALUE:', school?.logoUrl);

    const responseDetails = {
      school,
      sessionName: sessionRes.data.name || '',
      termName: termRes.data.name || '',
      nextTermBegins: termRes.data.next_term_begins || '',
      totalSchoolDays: Number(
        termRes.data.total_school_days || 60
      ),
      gradingScale: gradingScale.map((item) => ({
        id: item.id,
        grade: item.grade,
        minScore: Number(item.min_score),
        maxScore: Number(item.max_score),
        remark: item.remark,
        description: item.description || '',
      })),
    };

    if (studentId) {
      const reportCard = reportCards.find(
        (item) => item.student.id === studentId
      );

      if (!reportCard) {
        return NextResponse.json(
          { error: 'Student or records not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        reportCard,
        ...responseDetails,
      });
    }

    let selectedReportCards = reportCards;

    if (selectedIdsParam) {
      const selectedIds = selectedIdsParam.split(',');
      selectedReportCards = reportCards.filter((item) =>
        selectedIds.includes(item.student.id)
      );
    }

    return NextResponse.json({
      reportCards: selectedReportCards,
      ...responseDetails,
    });
  } catch (error) {
    console.error('Report card generation error:', error);

    return NextResponse.json(
      { error: 'Failed to generate report card' },
      { status: 500 }
    );
  }
}
