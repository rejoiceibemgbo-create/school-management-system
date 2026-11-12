import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SCHOOL_ID = 'sch_happy_home';

function mapStudent(student: any) {
  return {
    id: student.id,
    schoolId: student.school_id,
    admissionNumber: student.admission_number,
    firstName: student.first_name,
    lastName: student.last_name,
    middleName: student.middle_name || '',
    gender: student.gender,
    dateOfBirth: student.date_of_birth || '',
    classId: student.class_id,
    parentName: student.parent_name || '',
    parentPhone: student.parent_phone || '',
    parentEmail: student.parent_email || '',
    homeAddress: student.home_address || '',
    admissionDate: student.admission_date || '',
    status: student.status,
    createdAt: student.created_at,
    updatedAt: student.updated_at,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { students: incomingStudents } = body;

    if (!Array.isArray(incomingStudents) || incomingStudents.length === 0) {
      return NextResponse.json(
        { error: 'No student data provided for import' },
        { status: 400 }
      );
    }

    const [{ data: existingStudents, error: studentsError }, { data: classes, error: classesError }] =
      await Promise.all([
        supabase
          .from('students')
          .select('admission_number')
          .eq('school_id', SCHOOL_ID),
        supabase
          .from('classes')
          .select('id, name')
          .eq('school_id', SCHOOL_ID)
          .order('class_order'),
      ]);

    if (studentsError) throw studentsError;
    if (classesError) throw classesError;

    const existingAdmissionNumbers = new Set(
      (existingStudents || []).map((s) =>
        String(s.admission_number || '').toLowerCase()
      )
    );

    const currentYear = new Date().getFullYear();
    let nextNum = (existingStudents?.length || 0) + 1;
    const imported: any[] = [];

    for (const item of incomingStudents) {
      if (!item.firstName || !item.lastName) continue;

      let admissionNumber = item.admissionNumber?.trim();

      if (!admissionNumber) {
        admissionNumber = `HHEC/${currentYear}/${String(nextNum).padStart(3, '0')}`;
        nextNum++;
      }

      while (existingAdmissionNumbers.has(admissionNumber.toLowerCase())) {
        admissionNumber = `HHEC/${currentYear}/${String(nextNum).padStart(3, '0')}`;
        nextNum++;
      }

      existingAdmissionNumbers.add(admissionNumber.toLowerCase());

      let classId = item.classId;

      if (!classId && item.className) {
        const matchedClass = (classes || []).find(
          (c) => c.name.toLowerCase() === item.className.trim().toLowerCase()
        );

        if (matchedClass) classId = matchedClass.id;
      }

      if (!classId) {
        classId = classes?.[0]?.id || 'cls_pri_1';
      }

      const studentId = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newStudent = {
        id: studentId,
        school_id: SCHOOL_ID,
        admission_number: admissionNumber,
        first_name: item.firstName.trim(),
        last_name: item.lastName.trim(),
        middle_name: item.middleName?.trim() || '',
        gender: item.gender?.toLowerCase().startsWith('f') ? 'Female' : 'Male',
        date_of_birth: item.dateOfBirth || '2018-01-01',
        class_id: classId,
        parent_name: item.parentName?.trim() || '',
        parent_phone: item.parentPhone?.trim() || '',
        parent_email: item.parentEmail?.trim() || '',
        home_address: item.homeAddress?.trim() || '',
        admission_date: item.admissionDate || now.split('T')[0],
        status: 'active',
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('students')
        .insert(newStudent)
        .select()
        .single();

      if (error) throw error;

      imported.push(mapStudent(data));
    }

    return NextResponse.json({
      success: true,
      count: imported.length,
      students: imported,
    });
  } catch (error) {
    console.error('Batch import error:', error);
    return NextResponse.json(
      { error: 'Failed to import students' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { studentIds, targetClassId, action } = body;

    if (action !== 'promote') {
      return NextResponse.json(
        { error: 'Invalid batch action' },
        { status: 400 }
      );
    }

    if (!Array.isArray(studentIds) || !targetClassId) {
      return NextResponse.json(
        { error: 'Student IDs and target class are required' },
        { status: 400 }
      );
    }

    const { data: targetClass, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('id', targetClassId)
      .eq('school_id', SCHOOL_ID)
      .maybeSingle();

    if (classError) throw classError;

    if (!targetClass) {
      return NextResponse.json(
        { error: 'Target class does not exist' },
        { status: 400 }
      );
    }

    let promotedCount = 0;

    for (const id of studentIds) {
      const { data, error } = await supabase
        .from('students')
        .update({
          class_id: targetClassId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('school_id', SCHOOL_ID)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (data) promotedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully promoted ${promotedCount} students to ${targetClass.name}`,
    });
  } catch (error) {
    console.error('Batch promotion error:', error);
    return NextResponse.json(
      { error: 'Failed to perform batch operation' },
      { status: 500 }
    );
  }
}