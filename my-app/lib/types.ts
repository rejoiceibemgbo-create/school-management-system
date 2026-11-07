export type UserRole = 
  | 'super_admin' 
  | 'school_admin' 
  | 'head_teacher' 
  | 'class_teacher' 
  | 'subject_teacher';

export interface School {
  id: string;
  name: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  stampUrl?: string;
  headTeacherSignatureUrl?: string;
  principalName: string;
  headTeacherName: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  schoolId: string;
  fullName: string;
  email: string;
  password?: string; // Stored securely
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  assignedClassId?: string; // For class teachers
  assignedSubjectIds?: string[]; // For subject teachers
  status: 'active' | 'inactive';
  createdAt: string;
}

export type ClassCategory = 'nursery' | 'primary' | 'junior_secondary' | 'senior_secondary';

export interface SchoolClass {
  id: string;
  schoolId: string;
  name: string; // e.g. "Primary 1"
  arm?: string; // e.g. "Gold", "A"
  category: ClassCategory;
  order: number;
  classTeacherId?: string;
  capacity?: number;
  createdAt: string;
}

export interface Subject {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  category: 'core' | 'vocational' | 'elective';
  isDefault?: boolean;
  order: number;
}

export interface AcademicSession {
  id: string;
  schoolId: string;
  name: string; // e.g. "2025/2026", "2026/2027"
  isCurrent: boolean;
  startDate: string;
  endDate: string;
}

export interface AcademicTerm {
  id: string;
  sessionId: string;
  name: 'First Term' | 'Second Term' | 'Third Term';
  isCurrent: boolean;
  nextTermBegins?: string;
  isLocked: boolean;
  totalSchoolDays: number;
}

export interface Student {
  id: string;
  schoolId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  classId: string;
  photoUrl?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  homeAddress: string;
  admissionDate: string;
  status: 'active' | 'graduated' | 'transferred' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Score {
  id: string;
  schoolId: string;
  sessionId: string;
  termId: string;
  classId: string;
  studentId: string;
  subjectId: string;
  homework: number; // max 10
  test1: number; // max 10
  test2: number; // max 20
  caTotal: number; // max 40 (auto)
  exam: number; // max 60
  overallTotal: number; // max 100 (auto)
  grade: string; // A, B, C, D, E, F
  remark: string; // Excellent, etc.
  status: 'draft' | 'submitted' | 'approved';
  teacherId?: string;
  updatedAt: string;
}

export interface ConductAssessment {
  id: string;
  schoolId: string;
  sessionId: string;
  termId: string;
  classId: string;
  studentId: string;
  punctuality: number; // 1-5
  regularity: number; // 1-5
  neatness: number; // 1-5
  honesty: number; // 1-5
  obedience: number; // 1-5
  respect: number; // 1-5
  participation: number; // 1-5
  cooperation: number; // 1-5
  leadership: number; // 1-5
  responsibility: number; // 1-5
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  schoolId: string;
  sessionId: string;
  termId: string;
  classId: string;
  studentId: string;
  totalSchoolDays: number;
  daysPresent: number;
  daysAbsent: number;
  updatedAt: string;
}

export interface ReportComment {
  id: string;
  schoolId: string;
  sessionId: string;
  termId: string;
  classId: string;
  studentId: string;
  classTeacherComment: string;
  headTeacherComment: string;
  promotionStatus: 'Promoted' | 'Promoted on Trial' | 'Repeat' | 'Pending' | 'Graduated';
  updatedAt: string;
}

export interface GradeScaleItem {
  id: string;
  grade: string;
  minScore: number;
  maxScore: number;
  remark: string;
  description?: string;
}

export interface ResultApproval {
  id: string;
  schoolId: string;
  sessionId: string;
  termId: string;
  classId: string;
  subjectId?: string; // Optional if approving by whole class
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  reviewedBy?: string;
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface AuditLog {
  id: string;
  schoolId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  createdAt: string;
}

export interface StudentReportSummary {
  student: Student;
  className: string;
  scores: Array<Score & { subjectName: string; subjectOrder: number }>;
  conduct?: ConductAssessment;
  attendance?: AttendanceRecord;
  comments?: ReportComment;
  totalMarksObtained: number;
  totalPossibleMarks: number;
  averageScore: number;
  overallGrade: string;
  overallRemark: string;
  subjectsPassed: number;
  subjectsFailed: number;
  classPosition: number;
  totalStudentsInClass: number;
  classAverage: number;
}

export interface BroadsheetRow {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  gender: string;
  subjectScores: Record<string, number | null>; // subjectId -> overallTotal
  totalScore: number;
  averageScore: number;
  overallGrade: string;
  position: number;
  passedCount: number;
  failedCount: number;
}

