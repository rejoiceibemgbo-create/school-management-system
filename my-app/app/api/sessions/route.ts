import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AcademicSession, AcademicTerm } from '@/lib/types';

export async function GET() {
  try {
    const database = db.read();
    return NextResponse.json({
      sessions: database.sessions,
      terms: database.terms,
      currentSession: database.sessions.find(s => s.isCurrent) || database.sessions[0],
      currentTerm: database.terms.find(t => t.isCurrent) || database.terms[0],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions and terms' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    const database = db.read();

    if (action === 'create_session') {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: 'Session name is required (e.g. 2026/2027)' }, { status: 400 });
      }

      const newSession: AcademicSession = {
        id: `ses_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        schoolId: database.school.id,
        name: body.name.trim(),
        isCurrent: Boolean(body.isCurrent),
        startDate: body.startDate || '2026-09-01',
        endDate: body.endDate || '2027-07-20',
      };

      if (newSession.isCurrent) {
        database.sessions.forEach(s => { s.isCurrent = false; });
      }

      database.sessions.push(newSession);

      // Automatically generate 3 terms for this session
      const termNames: Array<'First Term' | 'Second Term' | 'Third Term'> = ['First Term', 'Second Term', 'Third Term'];
      const createdTerms: AcademicTerm[] = termNames.map((tName, idx) => ({
        id: `term_${idx + 1}_${newSession.id}`,
        sessionId: newSession.id,
        name: tName,
        isCurrent: idx === 0 && newSession.isCurrent,
        nextTermBegins: '',
        isLocked: false,
        totalSchoolDays: 60,
      }));

      database.terms.push(...createdTerms);
      db.write(database);
      db.logAudit('admin', 'Administrator', 'CREATE_SESSION', 'session', newSession.id, `Created academic session: ${newSession.name}`);

      return NextResponse.json({ success: true, session: newSession, terms: createdTerms });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action, sessionId, termId, isLocked, nextTermBegins } = body;
    const database = db.read();

    if (action === 'set_current_session') {
      database.sessions.forEach(s => {
        s.isCurrent = s.id === sessionId;
      });
      db.write(database);
      db.logAudit('admin', 'Administrator', 'SET_CURRENT_SESSION', 'session', sessionId, `Activated session`);
      return NextResponse.json({ success: true });
    }

    if (action === 'set_current_term') {
      database.terms.forEach(t => {
        t.isCurrent = t.id === termId;
      });
      db.write(database);
      db.logAudit('admin', 'Administrator', 'SET_CURRENT_TERM', 'term', termId, `Activated term`);
      return NextResponse.json({ success: true });
    }

    if (action === 'update_term') {
      const term = database.terms.find(t => t.id === termId);
      if (!term) return NextResponse.json({ error: 'Term not found' }, { status: 404 });

      if (isLocked !== undefined) term.isLocked = Boolean(isLocked);
      if (nextTermBegins !== undefined) term.nextTermBegins = nextTermBegins;

      db.write(database);
      return NextResponse.json({ success: true, term });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update session or term' }, { status: 500 });
  }
}

