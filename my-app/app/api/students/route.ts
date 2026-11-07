import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Student } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase();

    const database = db.read();
    let students = [...database.students];

    if (classId && classId !== 'all') {
      students = students.filter(s => s.classId === classId);
    }

    if (status && status !== 'all') {
      students = students.filter(s => s.status === status);
    }

    if (search) {
      students = students.filter(s => 
        s.firstName.toLowerCase().includes(search) ||
        s.lastName.toLowerCase().includes(search) ||
        (s.middleName && s.middleName.toLowerCase().includes(search)) ||
        s.admissionNumber.toLowerCase().includes(search) ||
        s.parentPhone.includes(search) ||
        s.parentName.toLowerCase().includes(search)
      );
    }

    // Attach class name
    const studentsWithClass = students.map(student => {
      const cls = database.classes.find(c => c.id === student.classId);
      return {
        ...student,
        className: cls ? cls.name : 'Unknown Class',
      };
    });

    return NextResponse.json({
      students: studentsWithClass,
      total: students.length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const database = db.read();

    const admissionNumber = body.admissionNumber?.trim() || db.generateAdmissionNumber();

    // Check duplicate admission number
    const existing = database.students.find(
      s => s.admissionNumber.toLowerCase() === admissionNumber.toLowerCase()
    );
    if (existing) {
      return NextResponse.json({ error: 'A student with this admission number already exists' }, { status: 400 });
    }

    if (!body.firstName?.trim() || !body.lastName?.trim()) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }

    if (!body.classId) {
      return NextResponse.json({ error: 'Class assignment is required' }, { status: 400 });
    }

    const newStudent: Student = {
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      schoolId: database.school.id,
      admissionNumber,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      middleName: body.middleName?.trim() || '',
      gender: body.gender || 'Male',
      dateOfBirth: body.dateOfBirth || '2018-01-01',
      classId: body.classId,
      photoUrl: body.photoUrl || '',
      parentName: body.parentName?.trim() || '',
      parentPhone: body.parentPhone?.trim() || '',
      parentEmail: body.parentEmail?.trim() || '',
      homeAddress: body.homeAddress?.trim() || '',
      admissionDate: body.admissionDate || new Date().toISOString().split('T')[0],
      status: body.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    database.students.push(newStudent);
    db.write(database);
    db.logAudit(
      'admin',
      'Administrator',
      'CREATE_STUDENT',
      'student',
      newStudent.id,
      `Registered student ${newStudent.firstName} ${newStudent.lastName} (${newStudent.admissionNumber})`
    );

    return NextResponse.json({ success: true, student: newStudent });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Failed to register student' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const database = db.read();

    const index = database.students.findIndex(s => s.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const current = database.students[index];

    // Check admission number conflict if changed
    if (body.admissionNumber && body.admissionNumber !== current.admissionNumber) {
      const conflict = database.students.find(
        s => s.id !== body.id && s.admissionNumber.toLowerCase() === body.admissionNumber.toLowerCase()
      );
      if (conflict) {
        return NextResponse.json({ error: 'Admission number already in use by another student' }, { status: 400 });
      }
    }

    database.students[index] = {
      ...current,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    db.write(database);
    db.logAudit(
      'admin',
      'Administrator',
      'UPDATE_STUDENT',
      'student',
      body.id,
      `Updated student information for ${database.students[index].firstName} ${database.students[index].lastName}`
    );

    return NextResponse.json({ success: true, student: database.students[index] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const database = db.read();
    const index = database.students.findIndex(s => s.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const student = database.students[index];
    // Archive or remove
    database.students.splice(index, 1);
    db.write(database);

    db.logAudit(
      'admin',
      'Administrator',
      'DELETE_STUDENT',
      'student',
      id,
      `Removed student record: ${student.firstName} ${student.lastName} (${student.admissionNumber})`
    );

    return NextResponse.json({ success: true, message: 'Student removed successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
