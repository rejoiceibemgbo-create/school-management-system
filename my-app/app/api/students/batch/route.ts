import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Student } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { students: incomingStudents } = body;

    if (!Array.isArray(incomingStudents) || incomingStudents.length === 0) {
      return NextResponse.json({ error: 'No student data provided for import' }, { status: 400 });
    }

    const database = db.read();
    const currentYear = new Date().getFullYear();
    const imported: Student[] = [];
    let nextNum = database.students.length + 1;

    for (const item of incomingStudents) {
      if (!item.firstName || !item.lastName) continue;

      let admissionNumber = item.admissionNumber?.trim();
      if (!admissionNumber) {
        admissionNumber = `HHEC/${currentYear}/${String(nextNum).padStart(3, '0')}`;
        nextNum++;
      }

      // Check if duplicate admission number already exists, generate a fresh one if so
      while (database.students.some(s => s.admissionNumber.toLowerCase() === admissionNumber.toLowerCase())) {
        admissionNumber = `HHEC/${currentYear}/${String(nextNum).padStart(3, '0')}`;
        nextNum++;
      }

      // Find class ID by name or fallback
      let classId = item.classId;
      if (!classId && item.className) {
        const matchedClass = database.classes.find(
          c => c.name.toLowerCase() === item.className.trim().toLowerCase()
        );
        if (matchedClass) classId = matchedClass.id;
      }
      if (!classId) {
        classId = database.classes[0]?.id || 'cls_pri_1';
      }

      const newStudent: Student = {
        id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        schoolId: database.school.id,
        admissionNumber,
        firstName: item.firstName.trim(),
        lastName: item.lastName.trim(),
        middleName: item.middleName?.trim() || '',
        gender: (item.gender?.toLowerCase().startsWith('f') ? 'Female' : 'Male'),
        dateOfBirth: item.dateOfBirth || '2018-01-01',
        classId,
        parentName: item.parentName?.trim() || '',
        parentPhone: item.parentPhone?.trim() || '',
        parentEmail: item.parentEmail?.trim() || '',
        homeAddress: item.homeAddress?.trim() || '',
        admissionDate: item.admissionDate || new Date().toISOString().split('T')[0],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      database.students.push(newStudent);
      imported.push(newStudent);
    }

    db.write(database);
    db.logAudit(
      'admin',
      'Administrator',
      'BATCH_IMPORT_STUDENTS',
      'student',
      undefined,
      `Imported ${imported.length} students via Excel/CSV`
    );

    return NextResponse.json({
      success: true,
      count: imported.length,
      students: imported,
    });
  } catch (error) {
    console.error('Batch import error:', error);
    return NextResponse.json({ error: 'Failed to import students' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { studentIds, targetClassId, action } = body;

    const database = db.read();

    if (action === 'promote') {
      if (!Array.isArray(studentIds) || !targetClassId) {
        return NextResponse.json({ error: 'Student IDs and target class are required' }, { status: 400 });
      }

      const targetClass = database.classes.find(c => c.id === targetClassId);
      if (!targetClass) {
        return NextResponse.json({ error: 'Target class does not exist' }, { status: 400 });
      }

      let promotedCount = 0;
      for (const id of studentIds) {
        const student = database.students.find(s => s.id === id);
        if (student) {
          student.classId = targetClassId;
          student.updatedAt = new Date().toISOString();
          promotedCount++;
        }
      }

      db.write(database);
      db.logAudit(
        'admin',
        'Administrator',
        'BATCH_PROMOTE',
        'student',
        undefined,
        `Promoted ${promotedCount} students to ${targetClass.name}`
      );

      return NextResponse.json({
        success: true,
        message: `Successfully promoted ${promotedCount} students to ${targetClass.name}`,
      });
    }

    return NextResponse.json({ error: 'Invalid batch action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to perform batch operation' }, { status: 500 });
  }
}

