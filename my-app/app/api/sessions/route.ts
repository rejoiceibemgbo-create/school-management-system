import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SCHOOL_ID = 'sch_happy_home';

export async function GET() {
  try {
    const [sessionsRes, termsRes] = await Promise.all([
      supabase
        .from('academic_sessions')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .order('name'),
      supabase
        .from('academic_terms')
        .select('*')
        .order('name'),
    ]);

    if (sessionsRes.error) throw sessionsRes.error;
    if (termsRes.error) throw termsRes.error;

    const sessions = (sessionsRes.data || []).map((s) => ({
      id: s.id,
      schoolId: s.school_id,
      name: s.name,
      isCurrent: s.is_current,
      startDate: s.start_date || '',
      endDate: s.end_date || '',
    }));

    const terms = (termsRes.data || []).map((t) => ({
      id: t.id,
      sessionId: t.session_id,
      name: t.name,
      isCurrent: t.is_current,
      nextTermBegins: t.next_term_begins || '',
      isLocked: Boolean(t.is_locked),
      totalSchoolDays: Number(t.total_school_days || 60),
    }));

    return NextResponse.json({
      sessions,
      terms,
      currentSession: sessions.find((s) => s.isCurrent) || sessions[0],
      currentTerm: terms.find((t) => t.isCurrent) || terms[0],
    });
  } catch (error) {
    console.error('Fetch sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions and terms' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== 'create_session') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Session name is required (e.g. 2026/2027)' },
        { status: 400 }
      );
    }

    const sessionId = `ses_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 6)}`;

    const isCurrent = Boolean(body.isCurrent);

    if (isCurrent) {
      const { error } = await supabase
        .from('academic_sessions')
        .update({ is_current: false })
        .eq('school_id', SCHOOL_ID);

      if (error) throw error;

      await supabase
        .from('academic_terms')
        .update({ is_current: false });
    }

    const { data: session, error: sessionError } = await supabase
      .from('academic_sessions')
      .insert({
        id: sessionId,
        school_id: SCHOOL_ID,
        name: body.name.trim(),
        is_current: isCurrent,
        start_date: body.startDate || '2026-09-01',
        end_date: body.endDate || '2027-07-20',
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    const termNames = ['First Term', 'Second Term', 'Third Term'];

    const createdTerms = termNames.map((name, index) => ({
      id: `term_${index + 1}_${sessionId}`,
      session_id: sessionId,
      name,
      is_current: index === 0 && isCurrent,
      next_term_begins: '',
      is_locked: false,
      total_school_days: 60,
    }));

    const { data: terms, error: termsError } = await supabase
      .from('academic_terms')
      .insert(createdTerms)
      .select();

    if (termsError) throw termsError;

    return NextResponse.json({
      success: true,
      session,
      terms,
    });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action, sessionId, termId, isLocked, nextTermBegins } = body;

    if (action === 'set_current_session') {
      const { error: resetError } = await supabase
        .from('academic_sessions')
        .update({ is_current: false })
        .eq('school_id', SCHOOL_ID);

      if (resetError) throw resetError;

      const { error } = await supabase
        .from('academic_sessions')
        .update({ is_current: true })
        .eq('id', sessionId)
        .eq('school_id', SCHOOL_ID);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    if (action === 'set_current_term') {
      const { data: term, error: termError } = await supabase
        .from('academic_terms')
        .select('session_id')
        .eq('id', termId)
        .maybeSingle();

      if (termError) throw termError;
      if (!term) {
        return NextResponse.json({ error: 'Term not found' }, { status: 404 });
      }

      const { error: resetError } = await supabase
        .from('academic_terms')
        .update({ is_current: false })
        .eq('session_id', term.session_id);

      if (resetError) throw resetError;

      const { error } = await supabase
        .from('academic_terms')
        .update({ is_current: true })
        .eq('id', termId);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    if (action === 'update_term') {
      const updates: Record<string, unknown> = {};

      if (isLocked !== undefined) updates.is_locked = Boolean(isLocked);
      if (nextTermBegins !== undefined) {
        updates.next_term_begins = nextTermBegins;
      }

      const { data: term, error } = await supabase
        .from('academic_terms')
        .update(updates)
        .eq('id', termId)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!term) {
        return NextResponse.json({ error: 'Term not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, term });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update session/term error:', error);
    return NextResponse.json(
      { error: 'Failed to update session or term' },
      { status: 500 }
    );
  }
}