/**
 * Pure pedagogical and gamification calculations for SVT COLLÈGE PRO
 */

import { Badge, GradeLevel, Lesson, QuizQuestion } from '../types/svt';

export interface ScoreResult {
  correctCount: number;
  totalQuestions: number;
  scoreOver20: number;
  percentage: number;
  appreciationFr: string;
  appreciationAr: string;
  passed: boolean;
}

export function calculateQuizScore(
  questions: QuizQuestion[],
  answers: Record<string, any>
): ScoreResult {
  if (!questions || questions.length === 0) {
    return {
      correctCount: 0,
      totalQuestions: 0,
      scoreOver20: 0,
      percentage: 0,
      appreciationFr: 'Non évalué',
      appreciationAr: 'غير مقيم',
      passed: false
    };
  }

  let totalEarnedPoints = 0;
  let totalMaxPoints = 0;
  let correctCount = 0;

  for (const q of questions) {
    const qWeight = q.points || 1;
    totalMaxPoints += qWeight;
    const userAnswer = answers[q.id];

    if (userAnswer === undefined || userAnswer === null) {
      continue;
    }

    let isCorrect = false;
    if (typeof q.correctAnswer === 'boolean') {
      isCorrect = userAnswer === q.correctAnswer;
    } else if (typeof q.correctAnswer === 'number') {
      isCorrect = Number(userAnswer) === q.correctAnswer;
    } else if (Array.isArray(q.correctAnswer)) {
      const correctArr = q.correctAnswer as string[];
      if (Array.isArray(userAnswer)) {
        isCorrect =
          userAnswer.length === correctArr.length &&
          userAnswer.every((val, idx) => String(val).toLowerCase() === String(correctArr[idx]).toLowerCase());
      }
    } else {
      isCorrect = String(userAnswer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
    }

    if (isCorrect) {
      correctCount++;
      totalEarnedPoints += qWeight;
    }
  }

  const percentage = totalMaxPoints > 0 ? (totalEarnedPoints / totalMaxPoints) * 100 : 0;
  const scoreOver20 = Math.round((percentage / 5) * 10) / 10; // 0 to 20 rounded to 1 decimal
  const passed = scoreOver20 >= 10;

  let appreciationFr = 'Non acquis';
  let appreciationAr = 'غير مكتسب';

  if (scoreOver20 >= 16) {
    appreciationFr = 'Très Bien (Excellent)';
    appreciationAr = 'ممتاز (جيد جداً)';
  } else if (scoreOver20 >= 14) {
    appreciationFr = 'Bien (Bonne maîtrise)';
    appreciationAr = 'جيد (تمكن حسن)';
  } else if (scoreOver20 >= 12) {
    appreciationFr = 'Assez Bien (Satisfaisant)';
    appreciationAr = 'مستحسن (مرضٍ)';
  } else if (scoreOver20 >= 10) {
    appreciationFr = 'Passable (Acquis)';
    appreciationAr = 'متوسط (مكتسب)';
  }

  return {
    correctCount,
    totalQuestions: questions.length,
    scoreOver20,
    percentage: Math.round(percentage),
    appreciationFr,
    appreciationAr,
    passed
  };
}

export function calculateEarnedXP(scoreOver20: number, isFirstTry = true, streakDays = 1): number {
  const baseXP = scoreOver20 * 10; // 0 to 200 XP
  const bonusFirstTry = isFirstTry ? 25 : 10;
  const streakBonus = Math.min(streakDays * 5, 50);
  return Math.round(baseXP + bonusFirstTry + streakBonus);
}

export function calculateLevelFromXP(totalXP: number): { level: number; currentLevelXP: number; nextLevelXP: number; progressPercent: number } {
  // Thresholds: Level 1: 0, Level 2: 200, Level 3: 500, Level 4: 900, Level 5: 1400, Level 6: 2000
  const thresholds = [0, 200, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500, 8500, 11000];
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (totalXP >= thresholds[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const currentThreshold = thresholds[level - 1] || 0;
  const nextThreshold = thresholds[level] || currentThreshold + 2000;
  const currentLevelXP = Math.max(0, totalXP - currentThreshold);
  const neededXP = nextThreshold - currentThreshold;
  const progressPercent = Math.min(100, Math.round((currentLevelXP / neededXP) * 100));

  return {
    level,
    currentLevelXP,
    nextLevelXP: neededXP,
    progressPercent
  };
}

export function checkNewUnlockedBadges(
  currentBadges: string[],
  stats: {
    totalCompletedLessons: number;
    perfectScoresCount: number;
    totalQuizzesTaken: number;
    experimentsConducted: number;
    gradeLevel: GradeLevel;
  }
): string[] {
  const newBadges: string[] = [];

  const addIfEarned = (badgeId: string, condition: boolean) => {
    if (condition && !currentBadges.includes(badgeId)) {
      newBadges.push(badgeId);
    }
  };

  addIfEarned('badge_first_quiz', stats.totalQuizzesTaken >= 1);
  addIfEarned('badge_perfect_score', stats.perfectScoresCount >= 1);
  addIfEarned('badge_explorer_lab', stats.experimentsConducted >= 3);
  addIfEarned('badge_master_lab', stats.experimentsConducted >= 7);
  addIfEarned('badge_scholar_5', stats.totalCompletedLessons >= 5);
  addIfEarned('badge_svt_major', stats.totalCompletedLessons >= 10 && stats.perfectScoresCount >= 3);

  return newBadges;
}

export function filterLessons(
  lessons: Lesson[],
  gradeLevel: GradeLevel,
  searchQuery: string,
  themeFilter?: string
): Lesson[] {
  const query = searchQuery.trim().toLowerCase();
  return lessons.filter(lesson => {
    if (lesson.gradeLevel !== gradeLevel) return false;
    if (themeFilter && themeFilter !== 'all' && lesson.themeId !== themeFilter) return false;
    if (!query) return true;

    return (
      lesson.title.toLowerCase().includes(query) ||
      lesson.titleAr.includes(query) ||
      lesson.chapterTitle.toLowerCase().includes(query) ||
      lesson.themeTitle.toLowerCase().includes(query) ||
      lesson.summary.toLowerCase().includes(query)
    );
  });
}
