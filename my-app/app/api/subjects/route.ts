
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Subject } from '@/lib/types';

const SCHOOL_ID = 'sch_happy_home';

function mapSubject(row: any): Subject {
  return {
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    code: row.code,
    category: row.category,
    isDefault: row.is_default,
    order: row.subject_order,
  };
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_id', SCHOOL_ID)
      .order('subject_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      subjects: (data || []).map(mapSubject),
    });
  } catch (error) {
    console.error('Fetch subjects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name?.trim() || !body.code?.trim()) {
      return NextResponse.json(
        { error: 'Subject name and code are required' },
        { status: 400 }
      );
    }

    const { data: lastSubject, error: orderError } = await supabase
      .from('subjects')
      .select('subject_order')
      .eq('school_id', SCHOOL_ID)
      .order('subject_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderError) throw orderError;

    const nextOrder = (lastSubject?.subject_order || 0) + 1;

    const newSubject = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      school_id: SCHOOL_ID,
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      category: body.category || 'core',
      is_default: false,
      subject_order: body.order ? Number(body.order) : nextOrder,
    };

    const { data, error } = await supabase
      .from('subjects')
      .insert(newSubject)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      subject: mapSubject(data),
    });
  } catch (error) {
    console.error('Create subject error:', error);
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.code !== undefined) updates.code = body.code.trim().toUpperCase();
    if (body.category !== undefined) updates.category = body.category;
    if (body.isDefault !== undefined) updates.is_default = body.isDefault;
    if (body.order !== undefined) updates.subject_order = Number(body.order);

    const { data, error } = await supabase
      .from('subjects')
      .update(updates)
      .eq('id', body.id)
      .eq('school_id', SCHOOL_ID)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      subject: mapSubject(data),
    });
  } catch (error) {
    console.error('Update subject error:', error);
    return NextResponse.json(
      { error: 'Failed to update subject' },
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
        { error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
      .eq('school_id', SCHOOL_ID)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Supabase subject deletion error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        { error: error.message || 'Database could not delete the subject' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Subject not found. It may already have been deleted.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subject deleted successfully',
    });

  } catch (error) {
    console.error('Delete subject request failed:', error);

    const message =
      error instanceof Error ? error.message : 'Unknown deletion error';

    const isConnectionError =
      message.toLowerCase().includes('fetch failed') ||
      message.toLowerCase().includes('socket');

    return NextResponse.json(
      {
        error: isConnectionError
          ? 'Could not connect to the database. Please try again.'
          : 'Failed to delete subject.',
      },
      { status: isConnectionError ? 503 : 500 }
    );
  }
}

