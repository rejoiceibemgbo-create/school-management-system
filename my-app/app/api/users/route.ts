
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySessionToken } from '@/lib/auth-session';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('school_session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Confirm that the logged-in user belongs to this school.
    const { data: currentUser, error: authError } = await supabase
      .from('users')
      .select('id, school_id, status')
      .eq('id', session.userId)
      .eq('school_id', session.schoolId)
      .single();

    if (authError || !currentUser || currentUser.status !== 'active') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Retrieve only the basic details needed for the dropdown.
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('school_id', session.schoolId)
      .eq('status', 'active')
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
      email: user.email,
      role: user.role,
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
