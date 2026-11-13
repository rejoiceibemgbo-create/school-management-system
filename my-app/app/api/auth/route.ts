
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import {
  createSessionToken,
  verifySessionToken,
} from '@/lib/auth-session';

const SCHOOL_ID = 'sch_happy_home';

// Verify the logged-in user before allowing account changes.
async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get('school_session')?.value;

  if (!token) return null;

  const session = verifySessionToken(token);

  if (!session || session.schoolId !== SCHOOL_ID) {
    return null;
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, school_id, status')
    .eq('id', session.userId)
    .eq('school_id', SCHOOL_ID)
    .maybeSingle();

  if (error || !user || user.status !== 'active') {
    return null;
  }

  return user;
}

// Remove sensitive database fields before returning a user.
function createSafeUser(user: any) {
  const {
    password_hash,
    school_id,
    full_name,
    assigned_class_id,
    assigned_subject_ids,
    created_at,
    ...otherFields
  } = user;

  return {
    ...otherFields,
    schoolId: school_id,
    fullName: full_name,
    assignedClassId: assigned_class_id,
    assignedSubjectIds: assigned_subject_ids,
    createdAt: created_at,
  };
}

// GET: Verify the current login session.
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

    if (!session || session.schoolId !== SCHOOL_ID) {
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
      .eq('school_id', SCHOOL_ID)
      .maybeSingle();

    if (error || !user || user.status !== 'active') {
      const response = NextResponse.json(
        { user: null },
        { status: 401 }
      );

      response.cookies.delete('school_session');
      return response;
    }

    return NextResponse.json({
      user: createSafeUser(user),
    });
  } catch (error) {
    console.error('Session verification error:', error);

    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}

// POST: Login, change password or update profile.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Change password.
    if (body.action === 'change_password') {
      const currentUser = await getAuthenticatedUser(request);

      if (!currentUser || body.userId !== currentUser.id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized.' },
          { status: 401 }
        );
      }

      const { newPassword } = body;

      if (
        typeof newPassword !== 'string' ||
        newPassword.length < 6 ||
        newPassword.length > 128
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Password must contain between 6 and 128 characters.',
          },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', currentUser.id)
        .eq('school_id', SCHOOL_ID);

      if (updateError) {
        console.error('Password change error:', updateError);

        return NextResponse.json(
          {
            success: false,
            error: 'Failed to update password. Please try again.',
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Password changed successfully.',
      });
    }

    // 2. Update personal profile.
    if (body.action === 'update_profile') {
      const currentUser = await getAuthenticatedUser(request);

      if (!currentUser || body.userId !== currentUser.id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized.' },
          { status: 401 }
        );
      }

      const cleanEmail = String(body.email || '').trim().toLowerCase();
      const cleanName = String(body.fullName || '').trim();

      if (!cleanEmail || !cleanName) {
        return NextResponse.json(
          {
            success: false,
            error: 'Full name and personal email are required.',
          },
          { status: 400 }
        );
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid email address.' },
          { status: 400 }
        );
      }

      const { data: existingUser, error: emailError } = await supabase
        .from('users')
        .select('id')
        .eq('school_id', SCHOOL_ID)
        .ilike('email', cleanEmail)
        .neq('id', currentUser.id)
        .maybeSingle();

      if (emailError) {
        console.error('Profile email lookup error:', emailError);

        return NextResponse.json(
          { success: false, error: 'Unable to verify email address.' },
          { status: 500 }
        );
      }

      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            error: 'This email address is already registered to another account.',
          },
          { status: 400 }
        );
      }

      const updateData: Record<string, any> = {
        email: cleanEmail,
        full_name: cleanName,
      };

      if (body.phone !== undefined) {
        updateData.phone = String(body.phone).trim() || null;
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', currentUser.id)
        .eq('school_id', SCHOOL_ID)
        .select('*')
        .single();

      if (updateError || !updatedUser) {
        console.error('Profile update error:', updateError);

        return NextResponse.json(
          { success: false, error: 'Failed to update profile.' },
          { status: 500 }
        );
      }

      const token = createSessionToken(
        updatedUser.id,
        updatedUser.school_id
      );

      const response = NextResponse.json({
        success: true,
        message: 'Account profile updated successfully.',
        user: createSafeUser(updatedUser),
      });

      response.cookies.set('school_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 8 * 60 * 60,
      });

      return response;
    }

    // 3. Standard staff login.
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required.',
        },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .eq('school_id', SCHOOL_ID)
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
        {
          success: false,
          error: 'Incorrect email or password.',
        },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          error: 'Incorrect email or password.',
        },
        { status: 401 }
      );
    }

    // Handle registrations awaiting approval.
    if (user.status === 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: 'Your registration is awaiting administrator approval.',
        },
        { status: 403 }
      );
    }

    // Handle rejected registrations.
    if (user.status === 'rejected') {
      return NextResponse.json(
        {
          success: false,
          error: 'Your registration was not approved. Please contact the school administrator.',
        },
        { status: 403 }
      );
    }

    // Handle inactive accounts.
    if (user.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: 'Your account is inactive. Please contact the school administrator.',
        },
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
        {
          success: false,
          error: 'School information could not be loaded.',
        },
        { status: 500 }
      );
    }

    const token = createSessionToken(user.id, user.school_id);

    const response = NextResponse.json({
      success: true,
      user: createSafeUser(user),
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
      {
        success: false,
        error: 'Login failed. Please try again.',
      },
      { status: 500 }
    );
  }
}

// DELETE: Log out.
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  response.cookies.delete('school_session');

  return response;
}
