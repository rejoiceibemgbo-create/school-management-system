
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

const SCHOOL_ID = 'sch_happy_home';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const phone = body.phone
      ? String(body.phone).trim()
      : null;

    // Validate required fields.
    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Full name, email and password are required.' },
        { status: 400 }
      );
    }

    if (fullName.length > 100) {
      return NextResponse.json(
        { error: 'Full name is too long.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must contain at least 8 characters.' },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: 'Password is too long.' },
        { status: 400 }
      );
    }

    // Check whether the email is already registered.
    const { data: existing, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', SCHOOL_ID)
      .ilike('email', email)
      .maybeSingle();

    if (lookupError) {
      console.error('Registration email lookup error:', lookupError);

      return NextResponse.json(
        { error: 'Unable to process registration right now.' },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: 'This email address is already registered.' },
        { status: 409 }
      );
    }

    // Securely hash the applicant's password.
    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      school_id: SCHOOL_ID,
      full_name: fullName,
      email,
      password_hash: passwordHash,

      // Applicants cannot select their own role or class.
      role: 'class_teacher',
      assigned_class_id: null,

      phone,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('users')
      .insert([newUser]);

    if (insertError) {
      console.error('Registration insert error:', insertError);

      return NextResponse.json(
        { error: 'Registration could not be completed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Registration submitted successfully. Your account is awaiting administrator approval.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
