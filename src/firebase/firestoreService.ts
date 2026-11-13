import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './config';
import type { ClassRoom, GradeLevel, Lesson, QuizResult } from '../types/svt';
import {
  ADMIN_EMAIL,
  buildUserProfileDocument,
  mergeLessonsWithCloud,
  prepareLessonForFirestore,
  type PersistedUserDoc,
} from './firestoreHelpers';

export {
  ADMIN_EMAIL,
  buildUserProfileDocument,
  mergeLessonsWithCloud,
  prepareLessonForFirestore,
  type PersistedUserDoc,
};

export async function syncUserProfileOnSignIn(
  firebaseUser: User,
  fallbackLocal?: {
    gradeLevel?: GradeLevel;
    preferredLanguage?: 'fr' | 'ar';
    points?: number;
    completedLessonIds?: string[];
    badges?: string[];
    quizScores?: Record<string, number>;
  }
): Promise<PersistedUserDoc> {
  const userPath = `users/${firebaseUser.uid}`;
  const userRef = doc(db, 'users', firebaseUser.uid);

  let existingDoc: Partial<PersistedUserDoc> | null = null;
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      existingDoc = snap.data() as Partial<PersistedUserDoc>;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
  }

  const profileDoc = buildUserProfileDocument(firebaseUser, existingDoc, fallbackLocal);

  if (!existingDoc) {
    try {
      await setDoc(userRef, profileDoc);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, userPath);
    }
  } else {
    try {
      await updateDoc(userRef, {
        displayName: profileDoc.displayName,
        updatedAt: profileDoc.updatedAt,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, userPath);
    }
  }

  return profileDoc;
}

export async function persistUserProgress(
  uid: string,
  updates: Partial<{
    displayName: string;
    gradeLevel: GradeLevel;
    preferredLanguage: 'fr' | 'ar';
    points: number;
    level: number;
    badges: string[];
    completedLessonIds: string[];
    quizScores: Record<string, number>;
  }>
): Promise<void> {
  if (!uid || uid.startsWith('guest')) return;
  const userPath = `users/${uid}`;
  const sanitized: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.displayName !== undefined) sanitized.displayName = updates.displayName.slice(0, 100);
  if (updates.gradeLevel !== undefined) sanitized.gradeLevel = updates.gradeLevel;
  if (updates.preferredLanguage !== undefined) sanitized.preferredLanguage = updates.preferredLanguage;
  if (updates.points !== undefined) {
    sanitized.points = Math.max(0, updates.points);
    sanitized.level = updates.level ?? Math.max(1, Math.floor(sanitized.points / 150) + 1);
  }
  if (updates.badges !== undefined) sanitized.badges = updates.badges.slice(0, 50);
  if (updates.completedLessonIds !== undefined) {
    sanitized.completedLessonIds = updates.completedLessonIds.slice(0, 500);
  }
  if (updates.quizScores !== undefined) sanitized.quizScores = updates.quizScores;

  try {
    await updateDoc(doc(db, 'users', uid), sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, userPath);
  }
}

export async function saveLessonToFirestore(lesson: Lesson): Promise<{ strippedLargeAttachment: boolean }> {
  const { lesson: prepared, strippedLargeAttachment } = prepareLessonForFirestore(lesson);
  const path = `lessons/${prepared.id}`;
  try {
    await setDoc(doc(db, 'lessons', prepared.id), prepared);
    return { strippedLargeAttachment };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteLessonFromFirestore(lessonId: string): Promise<void> {
  const path = `lessons/${lessonId}`;
  try {
    await deleteDoc(doc(db, 'lessons', lessonId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveQuizResultToFirestore(result: QuizResult): Promise<void> {
  const path = `results/${result.id}`;
  try {
    await setDoc(doc(db, 'results', result.id), result);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function loadClassesFromFirestore(
  teacherUid: string,
  isAdminUser: boolean
): Promise<ClassRoom[]> {
  try {
    const q = isAdminUser
      ? collection(db, 'classes')
      : query(collection(db, 'classes'), where('teacherId', '==', teacherUid));
    const snap = await getDocs(q);
    const items: ClassRoom[] = [];
    snap.forEach(docSnap => items.push(docSnap.data() as ClassRoom));
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'classes');
  }
}

export async function saveClassToFirestore(cls: ClassRoom): Promise<void> {
  const path = `classes/${cls.id}`;
  try {
    await setDoc(doc(db, 'classes', cls.id), cls);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}
