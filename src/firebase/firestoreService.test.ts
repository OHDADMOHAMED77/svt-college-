import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_EMAIL,
  buildUserProfileDocument,
  mergeLessonsWithCloud,
  prepareLessonForFirestore,
} from './firestoreHelpers';
import type { Lesson } from '../types/svt';

test('buildUserProfileDocument grants admin only to verified admin email and defaults others to student', () => {
  const adminProfile = buildUserProfileDocument({
    uid: 'uid_admin',
    email: ADMIN_EMAIL,
    displayName: 'Mohamed Admin',
    emailVerified: true,
  });
  assert.equal(adminProfile.role, 'admin');
  assert.equal(adminProfile.uid, 'uid_admin');

  const studentProfile = buildUserProfileDocument({
    uid: 'uid_student',
    email: 'eleve@example.com',
    displayName: 'Youssef',
    emailVerified: true,
  });
  assert.equal(studentProfile.role, 'student');
  assert.equal(studentProfile.subscriptionPlan, 'free');
});

test('buildUserProfileDocument preserves existing teacher role and progress', () => {
  const teacherProfile = buildUserProfileDocument(
    { uid: 'uid_t1', email: 'prof@example.com', emailVerified: true },
    { role: 'teacher', points: 450, completedLessonIds: ['l1', 'l2'], gradeLevel: '2AC' }
  );
  assert.equal(teacherProfile.role, 'teacher');
  assert.equal(teacherProfile.points, 450);
  assert.equal(teacherProfile.level, 4);
  assert.equal(teacherProfile.gradeLevel, '2AC');
  assert.deepEqual(teacherProfile.completedLessonIds, ['l1', 'l2']);
});

test('prepareLessonForFirestore strips oversized inline base64 data URIs above Firestore ceiling', () => {
  const hugeDataUri = 'data:application/pdf;base64,' + 'A'.repeat(900 * 1024);
  const sampleLesson: Lesson = {
    id: 'lesson_big',
    gradeLevel: '3AC',
    semester: 1,
    themeId: 't1',
    themeTitle: 'Unité 1',
    themeTitleAr: 'الوحدة 1',
    chapterTitle: 'Chapitre 1',
    chapterTitleAr: 'الفصل 1',
    title: 'La digestion',
    titleAr: 'الهضم',
    summary: 'Résumé',
    summaryAr: 'ملخص',
    objectives: ['Obj 1'],
    objectivesAr: ['هدف 1'],
    contentSections: [],
    definitions: [],
    diagrams: [],
    mediaAttachments: [
      { id: 'm1', type: 'pdf', title: 'Grand PDF', url: hugeDataUri, description: '1 Mo PDF' },
    ],
    status: 'published',
    isPremium: false,
    estimatedMinutes: 30,
  };

  const { lesson, strippedLargeAttachment } = prepareLessonForFirestore(sampleLesson);
  assert.equal(strippedLargeAttachment, true);
  assert.equal(lesson.mediaAttachments?.[0].url, '');
  assert.ok(JSON.stringify(lesson).length < 800 * 1024);
});

test('mergeLessonsWithCloud preserves large local attachment URLs when cloud stripped them', () => {
  const local: Lesson[] = [
    {
      id: 'l_ppt',
      gradeLevel: '2AC',
      semester: 1,
      themeId: 't1',
      themeTitle: 'U1',
      themeTitleAr: 'و1',
      chapterTitle: 'C1',
      chapterTitleAr: 'ف1',
      title: 'Volcans',
      titleAr: 'البراكين',
      summary: 'S',
      summaryAr: 'م',
      objectives: [],
      objectivesAr: [],
      contentSections: [],
      definitions: [],
      diagrams: [],
      mediaAttachments: [
        { id: 'm1', type: 'ppt', title: 'Slides', url: 'data:application/vnd.ms-powerpoint;base64,XYZ' },
      ],
      status: 'published',
      isPremium: false,
      estimatedMinutes: 20,
    },
  ];
  const cloud: Lesson[] = [
    {
      ...local[0],
      title: 'Volcans (Mis à jour)',
      mediaAttachments: [{ id: 'm1', type: 'ppt', title: 'Slides', url: '' }],
    },
  ];

  const merged = mergeLessonsWithCloud(local, cloud);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].title, 'Volcans (Mis à jour)');
  assert.equal(merged[0].mediaAttachments?.[0].url, 'data:application/vnd.ms-powerpoint;base64,XYZ');
});
