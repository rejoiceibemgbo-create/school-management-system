import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { GradeScaleItem } from '@/lib/types';

export async function GET() {
  try {
    const database = db.read();
    return NextResponse.json({
      school: database.school,
      gradingScale: database.gradingScale,
      auditLogs: database.auditLogs.slice(0, 50),
      stats: {
        totalStudents: database.students.length,
        totalClasses: database.classes.length,
        totalSubjects: database.subjects.length,
        totalScores: database.scores.length,
        totalUsers: database.users.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { section } = body;
    const database = db.read();

    if (section === 'school') {
      database.school = {
        ...database.school,
        ...body.school,
        updatedAt: new Date().toISOString(),
      };
      db.write(database);
      db.logAudit('admin', 'Administrator', 'UPDATE_SCHOOL_SETTINGS', 'school', database.school.id, 'Updated school branding and contact profile');
      return NextResponse.json({ success: true, school: database.school });
    }

    if (section === 'grading_scale') {
      if (Array.isArray(body.gradingScale)) {
        database.gradingScale = body.gradingScale as GradeScaleItem[];
        db.write(database);
        db.logAudit('admin', 'Administrator', 'UPDATE_GRADING_SCALE', 'grading', undefined, 'Updated academic grading scale');
        return NextResponse.json({ success: true, gradingScale: database.gradingScale });
      }
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    const database = db.read();

    if (action === 'backup') {
      return NextResponse.json({
        backupData: database,
        timestamp: new Date().toISOString(),
        schoolName: database.school.name,
      });
    }

    if (action === 'restore') {
      const { backupData } = body;
      if (!backupData || !backupData.school) {
        return NextResponse.json({ error: 'Invalid backup file structure' }, { status: 400 });
      }

      db.write(backupData);
      db.logAudit('admin', 'Administrator', 'RESTORE_DATABASE', 'database', undefined, 'Restored database from backup file');
      return NextResponse.json({ success: true, message: 'Database restored successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

