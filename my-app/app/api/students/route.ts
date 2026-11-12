
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SCHOOL_ID = 'sch_happy_home';

function formatStudent(student: any, className = '') {
  return {
    id: student.id,
    schoolId: student.school_id,
    admissionNumber: student.admission_number,
    firstName: student.first_name,
    lastName: student.last_name,
    middleName: student.middle_name,
    gender: student.gender,
    dateOfBirth: student.date_of_birth,
    classId: student.class_id,
    className,
    photoUrl: student.photo_url,
    parentName: student.parent_name,
    parentPhone: student.parent_phone,
    parentEmail: student.parent_email,
    homeAddress: student.home_address,
    admissionDate: student.admission_date,
    status: student.status,
    createdAt: student.created_at,
    updatedAt: student.updated_at,
  };
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('students')
      .select('*')
      .eq('school_id', SCHOOL_ID)
      .order('created_at', { ascending: false });

    if (classId && classId !== 'all') {
      query = query.eq('class_id', classId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search?.trim()) {
      const term = search.trim().replace(/[%,().]/g, '');
      query = query.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,admission_number.ilike.%${term}%`
      );
    }

    const { data: students, error } = await query;

    if (error) {
      console.error('Fetch students error:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    const classIds = [
      ...new Set((students || []).map(student => student.class_id))
    ];

    const classNames: Record<string, string> = {};

    if (classIds.length > 0) {
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds);

      for (const schoolClass of classes || []) {
        classNames[schoolClass.id] = schoolClass.name;
      }
    }

    const formattedStudents = await Promise.all(
      (students || []).map(async student => {
        let photoUrl = '';

        if (student.photo_url) {
          const { data: signedPhoto, error: photoError } =
            await supabase.storage
              .from('student-photos')
              .createSignedUrl(student.photo_url, 3600);

          if (!photoError && signedPhoto?.signedUrl) {
            photoUrl = signedPhoto.signedUrl;
          } else {
            console.error(
              'Student photo URL error:',
              photoError?.message
            );
          }
        }

        return {
          ...formatStudent(
            student,
            classNames[student.class_id] || ''
          ),
          photoUrl,
        };
      })
    );

    return NextResponse.json({
      students: formattedStudents,
      total: formattedStudents.length,
    });
  } catch (error) {
    console.error('Fetch students error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      firstName,
      lastName,
      middleName,
      gender,
      dateOfBirth,
      classId,
      photoUrl,
      parentName,
      parentPhone,
      parentEmail,
      homeAddress,
      admissionNumber,
      admissionDate,
    } = body;

    if (!firstName || !lastName || !classId) {
      return NextResponse.json(
        { error: 'First name, last name and class are required' },
        { status: 400 }
      );
    }

    const { data: schoolClass, error: classError } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('school_id', SCHOOL_ID)
      .maybeSingle();

    if (classError || !schoolClass) {
      return NextResponse.json(
        { error: 'Selected class was not found' },
        { status: 400 }
      );
    }

    const finalAdmissionNumber =
      admissionNumber?.trim() ||
      `HH-${new Date().getFullYear()}-${Date.now()}`;

    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('admission_number', finalAdmissionNumber)
      .maybeSingle();

    if (existingStudent) {
      return NextResponse.json(
        { error: 'Admission number already exists' },
        { status: 409 }
      );
    }

    const newStudent = {
      id: `std_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      school_id: SCHOOL_ID,
      admission_number: finalAdmissionNumber,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      middle_name: middleName || null,
      gender: gender || 'Male',
      date_of_birth: dateOfBirth || '2018-01-01',
      class_id: classId,
      photo_url: photoUrl || null,
      parent_name: parentName || '',
      parent_phone: parentPhone || '',
      parent_email: parentEmail || null,
      home_address: homeAddress || '',
      admission_date: admissionDate || new Date().toISOString().split('T')[0],
      status: 'active',
    };

    const { data: student, error } = await supabase
      .from('students')
      .insert(newStudent)
      .select('*')
      .single();

    if (error) {
      console.error('Create student error:', error.message);

      return NextResponse.json(
        { error: 'Failed to register student' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Student registered successfully',
        student: formatStudent(student),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create student error:', error);

    return NextResponse.json(
      { error: 'Failed to register student' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const fields: Record<string, string> = {
      admissionNumber: 'admission_number',
      firstName: 'first_name',
      lastName: 'last_name',
      middleName: 'middle_name',
      gender: 'gender',
      dateOfBirth: 'date_of_birth',
      classId: 'class_id',
      photoUrl: 'photo_url',
      parentName: 'parent_name',
      parentPhone: 'parent_phone',
      parentEmail: 'parent_email',
      homeAddress: 'home_address',
      admissionDate: 'admission_date',
      status: 'status',
    };

    for (const [key, column] of Object.entries(fields)) {
      if (body[key] !== undefined) {
        updates[column] = body[key];
      }
    }

    const { data: student, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .eq('school_id', SCHOOL_ID)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Update student error:', error.message);

      return NextResponse.json(
        { error: 'Failed to update student' },
        { status: 500 }
      );
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Student updated successfully',
      student: formatStudent(student),
    });
  } catch (error) {
    console.error('Update student error:', error);

    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const { data: student, error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)
      .eq('school_id', SCHOOL_ID)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Delete student error:', error.message);

      return NextResponse.json(
        { error: 'Failed to delete student' },
        { status: 500 }
      );
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Delete student error:', error);

    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
