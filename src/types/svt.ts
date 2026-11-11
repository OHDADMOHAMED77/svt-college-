/**
 * SVT COLLÈGE PRO - Data Types & Models
 * Aligned with the Moroccan SVT College Curriculum (1AC, 2AC, 3AC)
 */

export type GradeLevel = '1AC' | '2AC' | '3AC';

export type UserRole = 'student' | 'teacher' | 'admin';

export type AppLanguage = 'fr' | 'ar';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  gradeLevel: GradeLevel;
  preferredLanguage: AppLanguage;
  points: number;
  level: number;
  streakDays: number;
  badges: string[];
  completedLessonIds: string[];
  quizScores: Record<string, number>; // quizId -> score / 20
  subscriptionPlan: 'free' | 'student_premium' | 'teacher_premium';
  subscriptionStatus: 'active' | 'expired' | 'pending';
}

export interface Definition {
  term: string;
  termAr: string;
  definition: string;
  definitionAr: string;
}

export interface ScientificDiagram {
  id: string;
  title: string;
  titleAr: string;
  caption: string;
  captionAr: string;
  type: 'cell' | 'respiration' | 'digestion' | 'plate_tectonics' | 'volcano' | 'stomata' | 'reflex_arc' | 'immune_response';
  labels: { x: number; y: number; text: string; textAr: string }[];
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'pdf' | 'video';
  title: string;
  titleAr?: string;
  url: string;
  description?: string;
}

export interface Lesson {
  id: string;
  gradeLevel: GradeLevel;
  semester: 1 | 2;
  themeId: string;
  themeTitle: string;
  themeTitleAr: string;
  chapterTitle: string;
  chapterTitleAr: string;
  title: string;
  titleAr: string;
  summary: string;
  summaryAr: string;
  objectives: string[];
  objectivesAr: string[];
  contentSections: {
    heading: string;
    headingAr: string;
    bodyMarkdown: string;
    bodyMarkdownAr: string;
    keyTakeaway?: string;
    keyTakeawayAr?: string;
  }[];
  definitions: Definition[];
  diagrams: ScientificDiagram[];
  mediaAttachments?: MediaAttachment[];
  embeddedExercises?: QuizQuestion[];
  status: 'published' | 'draft' | 'archived';
  isPremium: boolean;
  estimatedMinutes: number;
  linkedQuizId?: string;
  linkedExperimentId?: string;
}

export type QuestionType = 'qcm' | 'true_false' | 'fill_blanks' | 'diagram_label' | 'scientific_analysis';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  promptAr: string;
  options?: string[];
  optionsAr?: string[];
  correctAnswer: string | number | boolean | string[]; // index or text
  explanation: string;
  explanationAr: string;
  points: number;
  documentTitle?: string;
  documentText?: string;
  diagramType?: string;
}

export interface Quiz {
  id: string;
  lessonId?: string;
  gradeLevel: GradeLevel;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  durationMinutes: number;
  isExam: boolean; // true for official Moroccan practice exam (Examen Blanc)
  isPremium: boolean;
  questions: QuizQuestion[];
  passingScore: number; // e.g. 10 / 20
}

export interface QuizResult {
  id: string;
  quizId: string;
  quizTitle: string;
  gradeLevel: GradeLevel;
  studentId: string;
  studentName: string;
  score: number; // out of 20
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  completedAt: string;
  answers: Record<string, any>;
}

export interface VirtualExperiment {
  id: string;
  gradeLevel: GradeLevel;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  scientificConcept: string;
  scientificConceptAr: string;
  objective: string;
  objectiveAr: string;
  protocolSteps: { step: number; instruction: string; instructionAr: string }[];
  controls: {
    id: string;
    label: string;
    labelAr: string;
    type: 'slider' | 'toggle' | 'select' | 'button';
    min?: number;
    max?: number;
    step?: number;
    defaultValue: number | boolean | string;
    options?: { value: string; label: string; labelAr: string }[];
  }[];
  simulationType: 'photosynthesis' | 'respiration' | 'stomata' | 'digestion' | 'transpiration' | 'reflex_arc' | 'volcano';
}

export interface Badge {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  iconName: string;
  unlockedAt?: string;
  xpValue: number;
}

export interface ClassRoom {
  id: string;
  name: string;
  gradeLevel: GradeLevel;
  academicYear: string;
  accessCode: string;
  teacherId: string;
  teacherName: string;
  studentsCount: number;
  activeQuizzesCount: number;
  averageScore: number;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: 'student_premium' | 'teacher_premium';
  amountMAD: number;
  method: 'cmi_card' | 'wafacash' | 'bank_transfer';
  status: 'pending' | 'approved' | 'rejected';
  reference: string;
  createdAt: string;
  approvedAt?: string;
}
