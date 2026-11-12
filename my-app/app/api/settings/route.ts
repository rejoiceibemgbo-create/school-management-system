
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SCHOOL_ID = 'sch_happy_home';

function mapSchool(school: any) {
  if (!school) return null;

  return {
    id: school.id,
    name: school.name,
    motto: school.motto,
    address: school.address,
    phone: school.phone,
    email: school.email,
    logoUrl: school.logo_url,
    headTeacher: school.head_teacher,
    updatedAt: school.updated_at,
  };
}

function mapGradingScale(item: any) {
  return {
    id: item.id,
    minScore: Number(item.min_score),
    maxScore: Number(item.max_score),
    grade: item.grade,
    remark: item.remark,
  };
}

export async function GET() {
  try {
    const [
      schoolRes,
      gradingRes,
      auditRes,
      studentsRes,
      classesRes,
      subjectsRes,
      scoresRes,
      usersRes,
    ] = await Promise.all([
      supabase.from('schools').select('*').eq('id', SCHOOL_ID).maybeSingle(),
      supabase.from('grading_scale').select('*').order('min_score'),
      supabase
        .from('audit_logs')
        .select('*')
        .eq('school_id', SCHOOL_ID)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', SCHOOL_ID),
      supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', SCHOOL_ID),
      supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('school_id', SCHOOL_ID),
      supabase.from('scores').select('id', { count: 'exact', head: true }).eq('school_id', SCHOOL_ID),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('school_id', SCHOOL_ID),
    ]);

    if (schoolRes.error) throw schoolRes.error;
    if (gradingRes.error) throw gradingRes.error;
    if (auditRes.error) throw auditRes.error;
    if (studentsRes.error) throw studentsRes.error;
    if (classesRes.error) throw classesRes.error;
    if (subjectsRes.error) throw subjectsRes.error;
    if (scoresRes.error) throw scoresRes.error;
    if (usersRes.error) throw usersRes.error;

    return NextResponse.json({
      school: mapSchool(schoolRes.data),
      gradingScale: (gradingRes.data || []).map(mapGradingScale),
      auditLogs: (auditRes.data || []).map((log) => ({
        id: log.id,
        schoolId: log.school_id,
        userId: log.user_id,
        userName: log.user_name,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        details: log.details,
        createdAt: log.created_at,
      })),
      stats: {
        totalStudents: studentsRes.count || 0,
        totalClasses: classesRes.count || 0,
        totalSubjects: subjectsRes.count || 0,
        totalScores: scoresRes.count || 0,
        totalUsers: usersRes.count || 0,
      },
    });
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { section } = body;

    if (section === 'school') {
      const school = body.school || {};

      const { data, error } = await supabase
        .from('schools')
        .update({
          name: school.name,
          motto: school.motto,
          address: school.address,
          phone: school.phone,
          email: school.email,
          logo_url: school.logoUrl,
          head_teacher: school.headTeacher,
          updated_at: new Date().toISOString(),
        })
        .eq('id', SCHOOL_ID)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        school_id: SCHOOL_ID,
        user_id: null,
        user_name: 'Administrator',
        action: 'UPDATE_SCHOOL_SETTINGS',
        entity_type: 'school',
        entity_id: SCHOOL_ID,
        details: 'Updated school branding and contact profile',
      });

      return NextResponse.json({
        success: true,
        school: mapSchool(data),
      });
    }

    if (section === 'grading_scale') {
      if (!Array.isArray(body.gradingScale)) {
        return NextResponse.json(
          { error: 'Invalid grading scale data' },
          { status: 400 }
        );
      }

      const gradingRows = body.gradingScale.map((item: any) => ({
        id: item.id,
        min_score: Number(item.minScore),
        max_score: Number(item.maxScore),
        grade: item.grade,
        remark: item.remark,
      }));

      const { error: saveError } = await supabase
        .from('grading_scale')
        .upsert(gradingRows, { onConflict: 'id' });

      if (saveError) throw saveError;

      const { data, error } = await supabase
        .from('grading_scale')
        .select('*')
        .order('min_score');

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        school_id: SCHOOL_ID,
        user_id: null,
        user_name: 'Administrator',
        action: 'UPDATE_GRADING_SCALE',
        entity_type: 'grading',
        entity_id: null,
        details: 'Updated academic grading scale',
      });

      return NextResponse.json({
        success: true,
        gradingScale: (data || []).map(mapGradingScale),
      });
    }

    return NextResponse.json(
      { error: 'Invalid section' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'backup') {
      const tables = [
        'schools',
        'users',
        'classes',
        'subjects',
        'academic_sessions',
        'academic_terms',
        'students',
        'scores',
        'conduct_assessments',
        'attendance_records',
        'report_comments',
        'grading_scale',
        'result_approvals',
        'audit_logs',
      ];

      const backupData: Record<string, any[]> = {};

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*');

        if (error) throw error;
        backupData[table] = data || [];
      }

      return NextResponse.json({
        backupData,
        timestamp: new Date().toISOString(),
        schoolName: 'HAPPY HOME EDUCATIONAL CENTRE',
      });
    }

    if (action === 'restore') {
      const { backupData } = body;

      if (!backupData || typeof backupData !== 'object') {
        return NextResponse.json(
          { error: 'Invalid backup file structure' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Database restore is not enabled yet. Please contact your system administrator.',
        },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Settings request error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
