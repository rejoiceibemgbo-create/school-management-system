-- PostgreSQL & Supabase Database Schema for Happy Home Educational Centre
-- School Result Management System

-- Enable UUID extension if on PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Schools Table
CREATE TABLE IF NOT EXISTS schools (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    motto VARCHAR(255),
    address TEXT,
    phone VARCHAR(100),
    email VARCHAR(150),
    logo_url TEXT,
    stamp_url TEXT,
    principal_name VARCHAR(150),
    head_teacher_name VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & Staff Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin', 'school_admin', 'head_teacher', 'class_teacher', 'subject_teacher')),
    phone VARCHAR(50),
    avatar_url TEXT,
    assigned_class_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Classes Table
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    arm VARCHAR(50),
    category VARCHAR(50) NOT NULL CHECK (category IN ('nursery', 'primary', 'junior_secondary', 'senior_secondary')),
    class_order INT NOT NULL,
    class_teacher_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    capacity INT DEFAULT 35,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL,
    category VARCHAR(30) DEFAULT 'core' CHECK (category IN ('core', 'vocational', 'elective')),
    is_default BOOLEAN DEFAULT TRUE,
    subject_order INT NOT NULL
);

-- 5. Academic Sessions Table
CREATE TABLE IF NOT EXISTS academic_sessions (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE
);

-- 6. Academic Terms Table
CREATE TABLE IF NOT EXISTS academic_terms (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL CHECK (name IN ('First Term', 'Second Term', 'Third Term')),
    is_current BOOLEAN DEFAULT FALSE,
    next_term_begins DATE,
    is_locked BOOLEAN DEFAULT FALSE,
    total_school_days INT DEFAULT 60
);

-- 7. Students Table
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
    date_of_birth DATE NOT NULL,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE RESTRICT,
    photo_url TEXT,
    parent_name VARCHAR(150) NOT NULL,
    parent_phone VARCHAR(50) NOT NULL,
    parent_email VARCHAR(150),
    home_address TEXT NOT NULL,
    admission_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'transferred', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Scores Table (Compound Unique Constraint)
CREATE TABLE IF NOT EXISTS scores (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE CASCADE,
    term_id VARCHAR(50) REFERENCES academic_terms(id) ON DELETE CASCADE,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE CASCADE,
    homework NUMERIC(4,1) DEFAULT 0 CHECK (homework >= 0 AND homework <= 10),
    test1 NUMERIC(4,1) DEFAULT 0 CHECK (test1 >= 0 AND test1 <= 10),
    test2 NUMERIC(4,1) DEFAULT 0 CHECK (test2 >= 0 AND test2 <= 20),
    ca_total NUMERIC(4,1) GENERATED ALWAYS AS (homework + test1 + test2) STORED,
    exam NUMERIC(4,1) DEFAULT 0 CHECK (exam >= 0 AND exam <= 60),
    overall_total NUMERIC(5,1) GENERATED ALWAYS AS (homework + test1 + test2 + exam) STORED,
    grade VARCHAR(5) NOT NULL,
    remark VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
    teacher_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_subject_score UNIQUE (session_id, term_id, student_id, subject_id)
);

-- 9. Conduct Assessments Table (1-5 Ratings)
CREATE TABLE IF NOT EXISTS conduct_assessments (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE CASCADE,
    term_id VARCHAR(50) REFERENCES academic_terms(id) ON DELETE CASCADE,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    punctuality INT DEFAULT 5 CHECK (punctuality BETWEEN 1 AND 5),
    regularity INT DEFAULT 5 CHECK (regularity BETWEEN 1 AND 5),
    neatness INT DEFAULT 5 CHECK (neatness BETWEEN 1 AND 5),
    honesty INT DEFAULT 5 CHECK (honesty BETWEEN 1 AND 5),
    obedience INT DEFAULT 5 CHECK (obedience BETWEEN 1 AND 5),
    respect INT DEFAULT 5 CHECK (respect BETWEEN 1 AND 5),
    participation INT DEFAULT 5 CHECK (participation BETWEEN 1 AND 5),
    cooperation INT DEFAULT 5 CHECK (cooperation BETWEEN 1 AND 5),
    leadership INT DEFAULT 5 CHECK (leadership BETWEEN 1 AND 5),
    responsibility INT DEFAULT 5 CHECK (responsibility BETWEEN 1 AND 5),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_conduct UNIQUE (session_id, term_id, student_id)
);

-- 10. Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE CASCADE,
    term_id VARCHAR(50) REFERENCES academic_terms(id) ON DELETE CASCADE,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    total_school_days INT DEFAULT 60,
    days_present INT DEFAULT 60,
    days_absent INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_attendance UNIQUE (session_id, term_id, student_id)
);

-- 11. Report Comments Table
CREATE TABLE IF NOT EXISTS report_comments (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE CASCADE,
    term_id VARCHAR(50) REFERENCES academic_terms(id) ON DELETE CASCADE,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    class_teacher_comment TEXT,
    head_teacher_comment TEXT,
    promotion_status VARCHAR(50) DEFAULT 'Promoted',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_report_comments UNIQUE (session_id, term_id, student_id)
);

-- 12. Grading Scale Table
CREATE TABLE IF NOT EXISTS grading_scale (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    grade VARCHAR(5) NOT NULL,
    min_score NUMERIC(4,1) NOT NULL,
    max_score NUMERIC(4,1) NOT NULL,
    remark VARCHAR(50) NOT NULL,
    description TEXT
);

-- 13. Result Approvals Table
CREATE TABLE IF NOT EXISTS result_approvals (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES academic_sessions(id) ON DELETE CASCADE,
    term_id VARCHAR(50) REFERENCES academic_terms(id) ON DELETE CASCADE,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    subject_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_by VARCHAR(50) REFERENCES users(id),
    reviewed_by VARCHAR(50) REFERENCES users(id),
    rejection_reason TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 14. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

