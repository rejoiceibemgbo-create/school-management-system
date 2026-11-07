import fs from 'fs';
import path from 'path';
import { 
  School, 
  User, 
  SchoolClass, 
  Subject, 
  AcademicSession, 
  AcademicTerm, 
  Student, 
  Score, 
  ConductAssessment, 
  AttendanceRecord, 
  ReportComment, 
  GradeScaleItem, 
  ResultApproval, 
  AuditLog, 
  BroadsheetRow, 
  StudentReportSummary 
} from './types';
import { 
  INITIAL_SCHOOL, 
  INITIAL_USERS, 
  INITIAL_CLASSES, 
  INITIAL_SUBJECTS, 
  INITIAL_SESSIONS, 
  INITIAL_TERMS, 
  DEFAULT_GRADING_SCALE 
} from './seed-data';

export interface DatabaseSchema {
  school: School;
  users: User[];
  classes: SchoolClass[];
  subjects: Subject[];
  sessions: AcademicSession[];
  terms: AcademicTerm[];
  students: Student[];
  scores: Score[];
  conductAssessments: ConductAssessment[];
  attendanceRecords: AttendanceRecord[];
  reportComments: ReportComment[];
  gradingScale: GradeScaleItem[];
  resultApprovals: ResultApproval[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'school-db.json');

function ensureDataDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialDatabase(): DatabaseSchema {
  return {
    school: INITIAL_SCHOOL,
    users: INITIAL_USERS,
    classes: INITIAL_CLASSES,
    subjects: INITIAL_SUBJECTS,
    sessions: INITIAL_SESSIONS,
    terms: INITIAL_TERMS,
    students: [], // Clean, empty student list ready for user registration
    scores: [],
    conductAssessments: [],
    attendanceRecords: [],
    reportComments: [],
    gradingScale: DEFAULT_GRADING_SCALE,
    resultApprovals: [],
    auditLogs: [
      {
        id: 'log_init',
        schoolId: INITIAL_SCHOOL.id,
        userId: 'system',
        userName: 'System Initialization',
        action: 'SYSTEM_INIT',
        entityType: 'database',
        details: 'Initial database configured for Happy Home Educational Centre with zero students.',
        createdAt: new Date().toISOString(),
      }
    ],
  };
}

export class Database {
  private static instance: Database;
  private memoryCache: DatabaseSchema | null = null;

  private constructor() {
    ensureDataDirectory();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public read(): DatabaseSchema {
    ensureDataDirectory();
    if (this.memoryCache) {
      return this.memoryCache;
    }

    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDatabase();
      this.write(initial);
      return initial;
    }

    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw) as DatabaseSchema;
      // Ensure all arrays exist
      if (!Array.isArray(data.students)) data.students = [];
      if (!Array.isArray(data.scores)) data.scores = [];
      if (!Array.isArray(data.conductAssessments)) data.conductAssessments = [];
      if (!Array.isArray(data.attendanceRecords)) data.attendanceRecords = [];
      if (!Array.isArray(data.reportComments)) data.reportComments = [];
      if (!Array.isArray(data.resultApprovals)) data.resultApprovals = [];
      if (!Array.isArray(data.auditLogs)) data.auditLogs = [];
      if (!Array.isArray(data.classes)) data.classes = INITIAL_CLASSES;
      if (!Array.isArray(data.subjects)) data.subjects = INITIAL_SUBJECTS;
      if (!Array.isArray(data.gradingScale)) data.gradingScale = DEFAULT_GRADING_SCALE;

      this.memoryCache = data;
      return data;
    } catch (e) {
      console.error('Error reading database file, resetting to initial:', e);
      const initial = getInitialDatabase();
      this.write(initial);
      return initial;
    }
  }

  public write(data: DatabaseSchema): void {
    ensureDataDirectory();
    this.memoryCache = data;
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public logAudit(userId: string, userName: string, action: string, entityType: string, entityId: string | undefined, details: string): void {
    const db = this.read();
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      schoolId: db.school.id,
      userId,
      userName,
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString(),
    };
    db.auditLogs.unshift(newLog);
    if (db.auditLogs.length > 500) {
      db.auditLogs = db.auditLogs.slice(0, 500); // keep last 500
    }
    this.write(db);
  }

  // --- Student Methods ---
  public generateAdmissionNumber(): string {
    const db = this.read();
    const currentYear = new Date().getFullYear();
    const prefix = 'HHEC';
    // Count existing students
    const count = db.students.length + 1;
    const sequence = String(count).padStart(3, '0');
    return `${prefix}/${currentYear}/${sequence}`;
  }

  public calculateGradeAndRemark(totalScore: number): { grade: string; remark: string } {
    const db = this.read();
    const scale = db.gradingScale || DEFAULT_GRADING_SCALE;
    const item = scale.find(s => totalScore >= s.minScore && totalScore <= s.maxScore);
    if (item) {
      return { grade: item.grade, remark: item.remark };
    }
    if (totalScore >= 80) return { grade: 'A', remark: 'Excellent' };
    if (totalScore >= 70) return { grade: 'B', remark: 'Very Good' };
    if (totalScore >= 60) return { grade: 'C', remark: 'Good' };
    if (totalScore >= 50) return { grade: 'D', remark: 'Fair' };
    if (totalScore >= 40) return { grade: 'E', remark: 'Poor' };
    return { grade: 'F', remark: 'Very Poor' };
  }

  // Calculate Broadsheet and positions with tie handling
  public getBroadsheet(classId: string, sessionId: string, termId: string): { rows: BroadsheetRow[]; classAverage: number } {
    const db = this.read();
    const students = db.students.filter(s => s.classId === classId && s.status === 'active');
    const classScores = db.scores.filter(s => s.classId === classId && s.sessionId === sessionId && s.termId === termId);

    if (students.length === 0) {
      return { rows: [], classAverage: 0 };
    }

    const rows: Array<Omit<BroadsheetRow, 'position'>> = students.map(student => {
      const studentScores = classScores.filter(s => s.studentId === student.id);
      const subjectMap: Record<string, number | null> = {};
      let total = 0;
      let countWithScores = 0;
      let passed = 0;
      let failed = 0;

      for (const sc of studentScores) {
        subjectMap[sc.subjectId] = sc.overallTotal;
        total += sc.overallTotal;
        countWithScores++;
        if (sc.overallTotal >= 40) {
          passed++;
        } else {
          failed++;
        }
      }

      const average = countWithScores > 0 ? Number((total / countWithScores).toFixed(1)) : 0;
      const { grade } = this.calculateGradeAndRemark(average);

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        studentName: `${student.lastName} ${student.firstName} ${student.middleName || ''}`.trim(),
        gender: student.gender,
        subjectScores: subjectMap,
        totalScore: total,
        averageScore: average,
        overallGrade: grade,
        passedCount: passed,
        failedCount: failed,
      };
    });

    // Sort descending by average score, then by total score
    rows.sort((a, b) => b.averageScore - a.averageScore || b.totalScore - a.totalScore);

    // Assign positions with standard competition ranking (e.g. 1, 2, 2, 4)
    let currentPosition = 1;
    const finalRows: BroadsheetRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && rows[i].averageScore === rows[i - 1].averageScore) {
        finalRows.push({
          ...rows[i],
          position: finalRows[i - 1].position,
        });
      } else {
        currentPosition = i + 1;
        finalRows.push({
          ...rows[i],
          position: currentPosition,
        });
      }
    }

    const overallTotalSum = finalRows.reduce((sum, r) => sum + r.averageScore, 0);
    const classAvg = finalRows.length > 0 ? Number((overallTotalSum / finalRows.length).toFixed(1)) : 0;

    return { rows: finalRows, classAverage: classAvg };
  }

  // Get complete report summary for a student
  public getStudentReportSummary(studentId: string, sessionId: string, termId: string): StudentReportSummary | null {
    const db = this.read();
    const student = db.students.find(s => s.id === studentId);
    if (!student) return null;

    const schoolClass = db.classes.find(c => c.id === student.classId);
    const className = schoolClass ? schoolClass.name : 'Unknown Class';

    // Get all subjects
    const allSubjects = [...db.subjects].sort((a, b) => a.order - b.order);

    // Scores
    const studentScores = db.scores.filter(
      s => s.studentId === studentId && s.sessionId === sessionId && s.termId === termId
    );

    // Join subject details
    const scoresWithSubjects = studentScores.map(score => {
      const sub = allSubjects.find(s => s.id === score.subjectId);
      return {
        ...score,
        subjectName: sub ? sub.name : 'Unknown Subject',
        subjectOrder: sub ? sub.order : 999,
      };
    }).sort((a, b) => a.subjectOrder - b.subjectOrder);

    // Broadsheet for position and class average
    const broadsheet = this.getBroadsheet(student.classId, sessionId, termId);
    const studentRow = broadsheet.rows.find(r => r.studentId === studentId);
    const classPosition = studentRow ? studentRow.position : 0;
    const totalStudentsInClass = broadsheet.rows.length;
    const classAverage = broadsheet.classAverage;

    let totalMarksObtained = 0;
    let totalPossibleMarks = 0;
    let passedCount = 0;
    let failedCount = 0;

    for (const sc of studentScores) {
      totalMarksObtained += sc.overallTotal;
      totalPossibleMarks += 100;
      if (sc.overallTotal >= 40) {
        passedCount++;
      } else {
        failedCount++;
      }
    }

    const averageScore = studentScores.length > 0 
      ? Number((totalMarksObtained / studentScores.length).toFixed(1)) 
      : 0;
    const { grade: overallGrade, remark: overallRemark } = this.calculateGradeAndRemark(averageScore);

    // Conduct
    const conduct = db.conductAssessments.find(
      c => c.studentId === studentId && c.sessionId === sessionId && c.termId === termId
    );

    // Attendance
    const attendance = db.attendanceRecords.find(
      a => a.studentId === studentId && a.sessionId === sessionId && a.termId === termId
    );

    // Comments
    const comments = db.reportComments.find(
      c => c.studentId === studentId && c.sessionId === sessionId && c.termId === termId
    );

    return {
      student,
      className,
      scores: scoresWithSubjects,
      conduct,
      attendance,
      comments,
      totalMarksObtained,
      totalPossibleMarks,
      averageScore,
      overallGrade,
      overallRemark,
      subjectsPassed: passedCount,
      subjectsFailed: failedCount,
      classPosition,
      totalStudentsInClass,
      classAverage,
    };
  }
}

export const db = Database.getInstance();
