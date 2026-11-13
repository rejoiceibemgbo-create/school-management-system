
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySessionToken } from '@/lib/auth-session';
import bcrypt from 'bcryptjs';

const SCHOOL_ID = 'sch_happy_home';

const ALLOWED_ROLES = [
  'school_admin',
  'head_teacher',
  'class_teacher',
  'subject_teacher',
];

const ALLOWED_STATUSES = [
  'active',
  'inactive',
  'pending',
  'rejected',
];

// Verify that the requester is an active user of this school.
async function getRequester(request: NextRequest) {
  const token = request.cookies.get('school_session')?.value;

  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);

  if (!session || session.schoolId !== SCHOOL_ID) {
    return null;
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, school_id, status, role')
    .eq('id', session.userId)
    .eq('school_id', SCHOOL_ID)
    .maybeSingle();

  if (error || !user || user.status !== 'active') {
    return null;
  }

  return { session, user };
}

// GET: Load staff accounts.
export async function GET(request: NextRequest) {
  try {
    const requester = await getRequester(request);

    if (!requester) {
      return NextResponse.json(
        { error: 'Unauthorized or inactive account' },
        { status: 401 }
      );
    }

    const isAdmin = requester.user.role === 'school_admin';

    const { data: users, error } = await supabase
      .from('users')
      .select(
        'id, full_name, email, role, phone, assigned_class_id, status, created_at'
      )
      .eq('school_id', SCHOOL_ID)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Load school users error:', error);
      return NextResponse.json(
        { error: 'Unable to load school users' },
        { status: 500 }
      );
    }

    const safeUsers = (users || []).map((user) => ({
      id: user.id,
      fullName: user.full_name,
      email: isAdmin ? user.email : '',
      role: user.role,
      phone: isAdmin ? user.phone || '' : '',
      assignedClassId: user.assigned_class_id || '',
      status: user.status,
      createdAt: user.created_at,
    }));

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { error: 'Failed to load school users' },
      { status: 500 }
    );
  }
}

// POST: Administrator creates a staff account.
export async function POST(request: NextRequest) {
  try {
    const requester = await getRequester(request);

    if (!requester || requester.user.role !== 'school_admin') {
      return NextResponse.json(
        { error: 'Only the school administrator can create staff accounts.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const cleanEmail = String(body.email || '').trim().toLowerCase();
    const cleanName = String(body.fullName || '').trim();
    const cleanPassword = String(body.password || '');
    const cleanRole = String(body.role || 'class_teacher').trim();

    if (!cleanEmail || !cleanName || !cleanPassword) {
      return NextResponse.json(
        { error: 'Full name, email and password are required.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (cleanPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must contain at least 8 characters.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.includes(cleanRole)) {
      return NextResponse.json(
        { error: 'Invalid staff role.' },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', SCHOOL_ID)
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (existingError) {
      console.error('Email lookup error:', existingError);
      return NextResponse.json(
        { error: 'Unable to verify email address.' },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: 'This email address is already registered.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 12);

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      school_id: SCHOOL_ID,
      full_name: cleanName,
      email: cleanEmail,
      password_hash: passwordHash,
      role: cleanRole,
      assigned_class_id: body.assignedClassId || null,
      phone: body.phone ? String(body.phone).trim() : null,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('users')
      .insert([newUser]);

    if (insertError) {
      console.error('Insert user error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create staff account.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Staff account created successfully.',
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        assignedClassId: newUser.assigned_class_id,
        phone: newUser.phone,
        status: newUser.status,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user account.' },
      { status: 500 }
    );
  }
}

// PUT: Administrator updates a staff account or approves/rejects registration.
export async function PUT(request: NextRequest) {
  try {
    const requester = await getRequester(request);

    if (!requester || requester.user.role !== 'school_admin') {
      return NextResponse.json(
        { error: 'Only the school administrator can update staff accounts.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      id,
      fullName,
      email,
      role,
      assignedClassId,
      phone,
      password,
      status,
    } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'A valid user ID is required.' },
        { status: 400 }
      );
    }

    if (id === requester.user.id && (role || status)) {
      return NextResponse.json(
        { error: 'You cannot change your own role or account status.' },
        { status: 400 }
      );
    }

    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .eq('school_id', SCHOOL_ID)
      .maybeSingle();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Staff account not found.' },
        { status: 404 }
      );
    }

    if (targetUser.role === 'super_admin') {
      return NextResponse.json(
        { error: 'This account cannot be modified here.' },
        { status: 403 }
      );
    }

    const updateFields: Record<string, any> = {};

    if (fullName !== undefined) {
      const cleanName = String(fullName).trim();

      if (!cleanName) {
        return NextResponse.json(
          { error: 'Full name cannot be empty.' },
          { status: 400 }
        );
      }

      updateFields.full_name = cleanName;
    }

    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return NextResponse.json(
          { error: 'Please enter a valid email address.' },
          { status: 400 }
        );
      }

      const { data: existing, error: emailError } = await supabase
        .from('users')
        .select('id')
        .eq('school_id', SCHOOL_ID)
        .ilike('email', cleanEmail)
        .neq('id', id)
        .maybeSingle();

      if (emailError) {
        return NextResponse.json(
          { error: 'Unable to verify email address.' },
          { status: 500 }
        );
      }

      if (existing) {
        return NextResponse.json(
          { error: 'This email address is already in use.' },
          { status: 400 }
        );
      }

      updateFields.email = cleanEmail;
    }

    if (role !== undefined) {
      if (!ALLOWED_ROLES.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid staff role.' },
          { status: 400 }
        );
      }

      updateFields.role = role;
    }

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid account status.' },
          { status: 400 }
        );
      }

      updateFields.status = status;
    }

    if (assignedClassId !== undefined) {
      updateFields.assigned_class_id = assignedClassId || null;
    }

    if (phone !== undefined) {
      updateFields.phone = phone ? String(phone).trim() : null;
    }

    if (password !== undefined && password !== '') {
      if (typeof password !== 'string' || password.length < 8) {
        return NextResponse.json(
          { error: 'Password must contain at least 8 characters.' },
          { status: 400 }
        );
      }

      updateFields.password_hash = await bcrypt.hash(password, 12);
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'No changes were provided.' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateFields)
      .eq('id', id)
      .eq('school_id', SCHOOL_ID);

    if (updateError) {
      console.error('Update user error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update staff account.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Staff account updated successfully.',
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user.' },
      { status: 500 }
    );
  }
}
