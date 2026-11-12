
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { createSessionToken,verifySessionToken } from '@/lib/auth-session';


export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('school_session')?.value;

    if (!token) {
      return NextResponse.json(
        { user: null },
        { status: 401 }
      );
    }

    const session = verifySessionToken(token);

    if (!session) {
      const response = NextResponse.json(
        { user: null },
        { status: 401 }
      );

      response.cookies.delete('school_session');
      return response;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.userId)
      .eq('school_id', session.schoolId)
      .single();

    if (error || !user || user.status !== 'active') {
      const response = NextResponse.json(
        { user: null },
        { status: 401 }
      );

      response.cookies.delete('school_session');
      return response;
    }

    const {
      password_hash,
      school_id,
      full_name,
      assigned_class_id,
      assigned_subject_ids,
      created_at,
      ...otherFields
    } = user;

    return NextResponse.json({
      user: {
        ...otherFields,
        schoolId: school_id,
        fullName: full_name,
        assignedClassId: assigned_class_id,
        assignedSubjectIds: assigned_subject_ids,
        createdAt: created_at,
      },
    });
  } catch (error) {
    console.error('Session verification error:', error);

    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .eq('school_id', 'sch_happy_home')
      .maybeSingle();

    if (error) {
      console.error('Login database error:', error);
      return NextResponse.json(
        { success: false, error: 'Unable to verify login.' },
        { status: 500 }
      );
    }

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { success: false, error: 'Incorrect email or password.' },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, error: 'Incorrect email or password.' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'This account is inactive.' },
        { status: 403 }
      );
    }

    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('*')
      .eq('id', user.school_id)
      .single();

    if (schoolError || !school) {
      console.error('School lookup error:', schoolError);
      return NextResponse.json(
        { success: false, error: 'School information could not be loaded.' },
        { status: 500 }
      );
    }

    const {
      password_hash,
      school_id,
      full_name,
      assigned_class_id,
      assigned_subject_ids,
      created_at,
      ...otherFields
    } = user;

    const safeUser = {
      ...otherFields,
      schoolId: school_id,
      fullName: full_name,
      assignedClassId: assigned_class_id,
      assignedSubjectIds: assigned_subject_ids,
      createdAt: created_at,
    };

    const token = createSessionToken(user.id, user.school_id);

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      school: {
        id: school.id,
        name: school.name,
        motto: school.motto,
        address: school.address,
        phone: school.phone,
        email: school.email,
        logoUrl: school.logo_url,
        principalName: school.principal_name,
        headTeacherName: school.head_teacher_name,
      },
    });

    response.cookies.set('school_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  response.cookies.delete('school_session');

  return response;
}
