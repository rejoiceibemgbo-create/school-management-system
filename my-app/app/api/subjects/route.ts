import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Subject } from '@/lib/types';

export async function GET() {
  try {
    const database = db.read();
    const subjects = [...database.subjects].sort((a, b) => a.order - b.order);
    return NextResponse.json({ subjects });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const database = db.read();

    if (!body.name?.trim() || !body.code?.trim()) {
      return NextResponse.json({ error: 'Subject name and code are required' }, { status: 400 });
    }

    const nextOrder = database.subjects.length > 0 ? Math.max(...database.subjects.map(s => s.order)) + 1 : 1;

    const newSubject: Subject = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      schoolId: database.school.id,
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      category: body.category || 'core',
      isDefault: false,
      order: body.order ? Number(body.order) : nextOrder,
    };

    database.subjects.push(newSubject);
    db.write(database);
    db.logAudit('admin', 'Administrator', 'CREATE_SUBJECT', 'subject', newSubject.id, `Created subject: ${newSubject.name}`);

    return NextResponse.json({ success: true, subject: newSubject });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const database = db.read();

    const index = database.subjects.findIndex(s => s.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    database.subjects[index] = {
      ...database.subjects[index],
      ...body,
    };

    db.write(database);
    db.logAudit('admin', 'Administrator', 'UPDATE_SUBJECT', 'subject', body.id, `Updated subject: ${database.subjects[index].name}`);

    return NextResponse.json({ success: true, subject: database.subjects[index] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }

    const database = db.read();
    const index = database.subjects.findIndex(s => s.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const deleted = database.subjects.splice(index, 1)[0];
    db.write(database);
    db.logAudit('admin', 'Administrator', 'DELETE_SUBJECT', 'subject', id, `Deleted subject: ${deleted.name}`);

    return NextResponse.json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
  }
}

