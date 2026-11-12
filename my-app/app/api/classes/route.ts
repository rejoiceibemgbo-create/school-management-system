
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SCHOOL_ID = 'sch_happy_home';

function mapClass(cls: any, studentCount = 0, teacherName = 'Unassigned') {
  return {
    id: cls.id,
    schoolId: cls.school_id,
    name: cls.name,
    arm: cls.arm || '',
    category: cls.category,
    order: cls.class_order,
    classTeacherId: cls.class_teacher_id || undefined,
    capacity: cls.capacity,
    createdAt: cls.created_at,
    studentCount,
    teacherName,
  };
}

async function logAudit(action: string, id: string, details: string) {
  const { error } = await supabase.from('audit_logs').insert({
    school_id: SCHOOL_ID,
    user_id: null,
    user_name: 'Administrator',
    action,
    entity_type: 'class',
    entity_id: id,
    details,
  });

  if (error) throw error;
}

export async function GET() {
  try {
    const [classesRes, studentsRes, usersRes] = await Promise.all([
      supabase
        .from('classes')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .order('class_order', { ascending: true }),

      supabase
        .from('students')
        .select('id, class_id')
        .eq('school_id', SCHOOL_ID)
        .eq('status', 'active'),

      supabase
        .from('users')
        .select('id, full_name')
        .eq('school_id', SCHOOL_ID),
    ]);

    if (classesRes.error) throw classesRes.error;
    if (studentsRes.error) throw studentsRes.error;
    if (usersRes.error) throw usersRes.error;

    const classes = (classesRes.data || []).map((cls) => {
      const studentCount = (studentsRes.data || []).filter(
        (student) => student.class_id === cls.id
      ).length;

      const teacher = (usersRes.data || []).find(
        (user) => user.id === cls.class_teacher_id
      );

      return mapClass(cls, studentCount, teacher?.full_name || 'Unassigned');
    });

    return NextResponse.json({ classes });
  } catch (error) {
    console.error('Fetch classes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Class name is required' },
        { status: 400 }
      );
    }

    const { data: existingClasses, error: fetchError } = await supabase
      .from('classes')
      .select('class_order')
      .eq('school_id', SCHOOL_ID);

    if (fetchError) throw fetchError;

    const nextOrder = existingClasses?.length
      ? Math.max(...existingClasses.map((cls) => Number(cls.class_order))) + 1
      : 1;

    const newClass = {
      id: `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      school_id: SCHOOL_ID,
      name: body.name.trim(),
      arm: body.arm?.trim() || '',
      category: body.category || 'primary',
      class_order: body.order ? Number(body.order) : nextOrder,
      class_teacher_id: body.classTeacherId || null,
      capacity: body.capacity ? Number(body.capacity) : 35,
    };

    const { data, error } = await supabase
      .from('classes')
      .insert(newClass)
      .select()
      .single();

    if (error) throw error;

    await logAudit(
      'CREATE_CLASS',
      data.id,
      `Created class: ${data.name}`
    );

    return NextResponse.json({
      success: true,
      class: mapClass(data),
    });
  } catch (error) {
    console.error('Create class error:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.arm !== undefined) updates.arm = body.arm.trim();
    if (body.category !== undefined) updates.category = body.category;
    if (body.order !== undefined) updates.class_order = Number(body.order);
    if (body.classTeacherId !== undefined) {
      updates.class_teacher_id = body.classTeacherId || null;
    }
    if (body.capacity !== undefined) updates.capacity = Number(body.capacity);

    const { data, error } = await supabase
      .from('classes')
      .update(updates)
      .eq('id', body.id)
      .eq('school_id', SCHOOL_ID)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    await logAudit(
      'UPDATE_CLASS',
      body.id,
      `Updated class: ${data.name}`
    );

    return NextResponse.json({
      success: true,
      class: mapClass(data),
    });
  } catch (error) {
    console.error('Update class error:', error);
    return NextResponse.json(
      { error: 'Failed to update class' },
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
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }

    const { count, error: countError } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', SCHOOL_ID)
      .eq('class_id', id);

    if (countError) throw countError;

    if ((count || 0) > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete class. It contains ${count} registered student(s). Reassign them first.`,
        },
        { status: 400 }
      );
    }

    const { data: deleted, error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)
      .eq('school_id', SCHOOL_ID)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!deleted) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    await logAudit(
      'DELETE_CLASS',
      id,
      `Deleted class: ${deleted.name}`
    );

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully',
    });
  } catch (error) {
    console.error('Delete class error:', error);
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    );
  }
}
