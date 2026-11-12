
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { supabase } from '@/lib/supabase';
import { verifySessionToken } from '@/lib/auth-session';



const BUCKET_NAME = 'student-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: NextRequest) {
  let uploadedPath: string | null = null;

  try {
    // 1. Verify the login session.
    const token = request.cookies.get('school_session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Please log in first.' },
        { status: 401 }
      );
    }

    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json(
        { error: 'Your session has expired. Please log in again.' },
        { status: 401 }
      );
    }

    // 2. Confirm that the account still exists and is active.
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, school_id, status')
      .eq('id', session.userId)
      .eq('school_id', session.schoolId)
      .eq('status', 'active')
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Your account is not authorized.' },
        { status: 401 }
      );
    }

    // 3. Read the submitted student ID and image.
    const formData = await request.formData();
    const studentId = formData.get('studentId');
    const file = formData.get('file');

    if (
      typeof studentId !== 'string' ||
      !studentId.trim() ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        { error: 'Student ID and photo are required.' },
        { status: 400 }
      );
    }

    // 4. Validate the image.
    const extension = ALLOWED_TYPES[file.type];

    if (!extension) {
      return NextResponse.json(
        { error: 'Please select a JPG, PNG or WEBP image.' },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'The photo must be smaller than 5 MB.' },
        { status: 400 }
      );
    }

    // 5. Confirm that the student belongs to this user's school.
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('school_id', session.schoolId)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found or access denied.' },
        { status: 404 }
      );
    }

    // 6. Upload the image to the private Supabase bucket.
    const filePath =
      `${session.schoolId}/${studentId}/${randomUUID()}.${extension}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Student photo upload error:', uploadError.message);

      return NextResponse.json(
        { error: 'Failed to upload student photo.' },
        { status: 500 }
      );
    }

    uploadedPath = filePath;

    // 7. Save the private storage path in the student record.
    const { data: updatedStudent, error: updateError } = await supabase
      .from('students')
      .update({
        photo_url: filePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)
      .eq('school_id', session.schoolId)
      .select('id, photo_url')
      .maybeSingle();

    if (updateError || !updatedStudent) {
      // Remove the uploaded file if saving its path fails.
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      uploadedPath = null;

      console.error('Student photo database update error:', updateError?.message);

      return NextResponse.json(
        { error: 'Photo uploaded but could not be saved to the student record.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Student photo uploaded successfully.',
      photoPath: updatedStudent.photo_url,
    });
  } catch (error) {
    console.error('Student photo upload error:', error);

    if (uploadedPath) {
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([uploadedPath]);
    }

    return NextResponse.json(
      { error: 'An error occurred while uploading the photo.' },
      { status: 500 }
    );
  }
}
