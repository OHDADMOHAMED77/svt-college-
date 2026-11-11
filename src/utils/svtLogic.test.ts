import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuizScore, calculateEarnedXP, calculateLevelFromXP, checkNewUnlockedBadges } from './svtLogic';
import { QuizQuestion } from '../types/svt';

test('calculateQuizScore computes Moroccan standard /20 accurately', () => {
  const mockQuestions: QuizQuestion[] = [
    {
      id: 'q1',
      type: 'qcm',
      prompt: 'Quel est l organite responsable de la photosynthèse ?',
      promptAr: 'ما هي العضية المسؤولة عن التركيب الضوئي؟',
      correctAnswer: 1,
      explanation: 'Le chloroplaste contient la chlorophylle.',
      explanationAr: 'البلاستيدات الخضراء تحتوي على اليخضور.',
      points: 1
    },
    {
      id: 'q2',
      type: 'true_false',
      prompt: 'La cellule végétale possède une paroi squelettique.',
      promptAr: 'الخلية النباتية تملك جداراً هيكلياً سليولوزياً.',
      correctAnswer: true,
      explanation: 'Vrai, elle assure la rigidité cellulaire.',
      explanationAr: 'صحيح، يؤمن الصلابة الخلوية.',
      points: 1
    }
  ];

  // Both correct -> 20/20
  const resultPerfect = calculateQuizScore(mockQuestions, { q1: 1, q2: true });
  assert.equal(resultPerfect.scoreOver20, 20);
  assert.equal(resultPerfect.percentage, 100);
  assert.equal(resultPerfect.passed, true);
  assert.equal(resultPerfect.appreciationFr, 'Très Bien (Excellent)');

  // 1 correct out of 2 -> 10/20
  const resultHalf = calculateQuizScore(mockQuestions, { q1: 1, q2: false });
  assert.equal(resultHalf.scoreOver20, 10);
  assert.equal(resultHalf.passed, true);
  assert.equal(resultHalf.appreciationFr, 'Passable (Acquis)');

  // 0 correct -> 0/20
  const resultZero = calculateQuizScore(mockQuestions, { q1: 0, q2: false });
  assert.equal(resultZero.scoreOver20, 0);
  assert.equal(resultZero.passed, false);
});

test('calculateLevelFromXP scales levels correctly', () => {
  const lvl1 = calculateLevelFromXP(50);
  assert.equal(lvl1.level, 1);

  const lvl2 = calculateLevelFromXP(250);
  assert.equal(lvl2.level, 2);

  const lvl3 = calculateLevelFromXP(600);
  assert.equal(lvl3.level, 3);
});

test('checkNewUnlockedBadges identifies new achievements', () => {
  const currentBadges: string[] = [];
  const unlocked = checkNewUnlockedBadges(currentBadges, {
    totalCompletedLessons: 5,
    perfectScoresCount: 1,
    totalQuizzesTaken: 2,
    experimentsConducted: 4,
    gradeLevel: '3AC'
  });

  assert.ok(unlocked.includes('badge_first_quiz'));
  assert.ok(unlocked.includes('badge_perfect_score'));
  assert.ok(unlocked.includes('badge_explorer_lab'));
  assert.ok(unlocked.includes('badge_scholar_5'));
  assert.ok(!unlocked.includes('badge_master_lab')); // needs 7 experiments
});
