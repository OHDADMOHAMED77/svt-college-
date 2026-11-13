import type { GradeLevel, Lesson, UserProfile, UserRole } from '../types/svt';

export const ADMIN_EMAIL = 'ohdadmohamed77@gmail.com';
export const SAFE_FIRESTORE_DOC_BYTES = 800 * 1024;

export interface PersistedUserDoc extends UserProfile {
  createdAt?: string;
  updatedAt?: string;
}

export function buildUserProfileDocument(
  firebaseUser: { uid: string; email?: string | null; displayName?: string | null; emailVerified?: boolean },
  existingDoc?: Partial<PersistedUserDoc> | null,
  fallbackLocal?: {
    gradeLevel?: GradeLevel;
    preferredLanguage?: 'fr' | 'ar';
    points?: number;
    completedLessonIds?: string[];
    badges?: string[];
    quizScores?: Record<string, number>;
  }
): PersistedUserDoc {
  const isEmailAdmin =
    firebaseUser.email === ADMIN_EMAIL && firebaseUser.emailVerified !== false;
  const resolvedRole: UserRole = isEmailAdmin
    ? 'admin'
    : (existingDoc?.role as UserRole) || 'student';

  const nowIso = new Date().toISOString();
  const points =
    typeof existingDoc?.points === 'number'
      ? existingDoc.points
      : fallbackLocal?.points ?? 120;
  const level = Math.max(1, Math.floor(points / 150) + 1);

  return {
    uid: firebaseUser.uid,
    email: (firebaseUser.email || '').slice(0, 128),
    displayName: (
      existingDoc?.displayName ||
      firebaseUser.displayName ||
      firebaseUser.email?.split('@')[0] ||
      'Élève SVT'
    ).slice(0, 100),
    role: resolvedRole,
    gradeLevel: existingDoc?.gradeLevel || fallbackLocal?.gradeLevel || '3AC',
    preferredLanguage: existingDoc?.preferredLanguage || fallbackLocal?.preferredLanguage || 'fr',
    points: Math.max(0, points),
    level,
    streakDays: typeof existingDoc?.streakDays === 'number' ? existingDoc.streakDays : 1,
    badges: Array.isArray(existingDoc?.badges)
      ? existingDoc.badges.slice(0, 50)
      : (fallbackLocal?.badges || ['badge_first_quiz']).slice(0, 50),
    completedLessonIds: Array.isArray(existingDoc?.completedLessonIds)
      ? existingDoc.completedLessonIds.slice(0, 500)
      : (fallbackLocal?.completedLessonIds || ['lesson_1ac_milieu_naturel']).slice(0, 500),
    quizScores: existingDoc?.quizScores || fallbackLocal?.quizScores || {},
    subscriptionPlan: existingDoc?.subscriptionPlan || 'free',
    subscriptionStatus: existingDoc?.subscriptionStatus || 'active',
    createdAt: existingDoc?.createdAt || nowIso,
    updatedAt: nowIso,
  };
}

export function prepareLessonForFirestore(lesson: Lesson): {
  lesson: Lesson;
  strippedLargeAttachment: boolean;
} {
  const normalized: Lesson = {
    ...lesson,
    title: (lesson.title || 'Cours SVT').slice(0, 200),
    titleAr: (lesson.titleAr || lesson.title || '').slice(0, 200),
    themeTitle: (lesson.themeTitle || '').slice(0, 200),
    themeTitleAr: (lesson.themeTitleAr || '').slice(0, 200),
    chapterTitle: (lesson.chapterTitle || '').slice(0, 200),
    chapterTitleAr: (lesson.chapterTitleAr || '').slice(0, 200),
    summary: (lesson.summary || '').slice(0, 2000),
    summaryAr: (lesson.summaryAr || '').slice(0, 2000),
    objectives: (lesson.objectives || []).slice(0, 30),
    objectivesAr: (lesson.objectivesAr || []).slice(0, 30),
    mediaAttachments: (lesson.mediaAttachments || []).slice(0, 30),
  };

  let serializedSize = JSON.stringify(normalized).length;
  let strippedLargeAttachment = false;

  if (serializedSize > SAFE_FIRESTORE_DOC_BYTES && normalized.mediaAttachments) {
    // Strip largest inline data URI attachments first (e.g., original PDF > 200KB) so smaller extracted images remain synced
    const indexedBySize = normalized.mediaAttachments
      .map((att, index) => ({ index, size: att.url?.startsWith('data:') ? att.url.length : 0 }))
      .filter(entry => entry.size > 0)
      .sort((a, b) => b.size - a.size);

    for (const entry of indexedBySize) {
      if (serializedSize <= SAFE_FIRESTORE_DOC_BYTES) break;
      const att = normalized.mediaAttachments[entry.index];
      if (att.url && att.url.startsWith('data:') && (att.url.length > 200 * 1024 || serializedSize > SAFE_FIRESTORE_DOC_BYTES)) {
        strippedLargeAttachment = true;
        normalized.mediaAttachments[entry.index] = {
          ...att,
          url: '',
          description: `${att.description || att.title} (Fichier local volumineux > 800 Ko)`,
        };
        serializedSize = JSON.stringify(normalized).length;
      }
    }
  }

  return { lesson: normalized, strippedLargeAttachment };
}

export function mergeLessonsWithCloud(
  localLessons: Lesson[],
  cloudLessons: Lesson[]
): Lesson[] {
  const map = new Map<string, Lesson>();
  for (const lesson of localLessons) {
    map.set(lesson.id, lesson);
  }
  for (const cloudLesson of cloudLessons) {
    const existingLocal = map.get(cloudLesson.id);
    if (existingLocal && cloudLesson.mediaAttachments && existingLocal.mediaAttachments) {
      const mergedAttachments = cloudLesson.mediaAttachments.map((cloudAtt, idx) => {
        if (!cloudAtt.url && existingLocal.mediaAttachments?.[idx]?.url) {
          return { ...cloudAtt, url: existingLocal.mediaAttachments[idx].url };
        }
        return cloudAtt;
      });
      map.set(cloudLesson.id, { ...cloudLesson, mediaAttachments: mergedAttachments });
    } else {
      map.set(cloudLesson.id, cloudLesson);
    }
  }
  return Array.from(map.values());
}
