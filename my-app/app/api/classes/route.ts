import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SchoolClass } from '@/lib/types';

export async function GET() {
  try {
    const database = db.read();
    const classesWithMeta = database.classes.map(cls => {
      const studentCount = database.students.filter(s => s.classId === cls.id && s.status === 'active').length;
      const teacher = database.users.find(u => u.id === cls.classTeacherId);
      return {
        ...cls,
        studentCount,
        teacherName: teacher ? teacher.fullName : 'Unassigned',
      };
    }).sort((a, b) => a.order - b.order);

    return NextResponse.json({ classes: classesWithMeta });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const database = db.read();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Class name is required' }, { status: 400 });
    }

    const nextOrder = database.classes.length > 0 ? Math.max(...database.classes.map(c => c.order)) + 1 : 1;

    const newClass: SchoolClass = {
      id: `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      schoolId: database.school.id,
      name: body.name.trim(),
      arm: body.arm?.trim() || '',
      category: body.category || 'primary',
      order: body.order ? Number(body.order) : nextOrder,
      classTeacherId: body.classTeacherId || undefined,
      capacity: body.capacity ? Number(body.capacity) : 35,
      createdAt: new Date().toISOString(),
    };

    database.classes.push(newClass);
    db.write(database);
    db.logAudit('admin', 'Administrator', 'CREATE_CLASS', 'class', newClass.id, `Created class: ${newClass.name}`);

    return NextResponse.json({ success: true, class: newClass });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const database = db.read();

    const index = database.classes.findIndex(c => c.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    database.classes[index] = {
      ...database.classes[index],
      ...body,
    };

    db.write(database);
    db.logAudit('admin', 'Administrator', 'UPDATE_CLASS', 'class', body.id, `Updated class: ${database.classes[index].name}`);

    return NextResponse.json({ success: true, class: database.classes[index] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    const database = db.read();
    const studentCount = database.students.filter(s => s.classId === id).length;
    if (studentCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete class. It contains ${studentCount} registered student(s). Reassign them first.` 
      }, { status: 400 });
    }

    const index = database.classes.findIndex(c => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const deleted = database.classes.splice(index, 1)[0];
    db.write(database);
    db.logAudit('admin', 'Administrator', 'DELETE_CLASS', 'class', id, `Deleted class: ${deleted.name}`);

    return NextResponse.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
  }
}

