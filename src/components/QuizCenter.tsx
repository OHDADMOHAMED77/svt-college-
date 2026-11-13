import React, { useState, useEffect } from 'react';
import {
  Award, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight,
  RotateCcw, Sparkles, Check, HelpCircle, Trophy, FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MOROCCAN_SVT_QUIZZES, MOROCCAN_EXAMENS_BLANCS } from '../data/moroccanSvtCurriculum';
import { Quiz, QuizQuestion, QuizResult, GradeLevel } from '../types/svt';
import { calculateQuizScore, calculateEarnedXP } from '../utils/svtLogic';

interface QuizCenterProps {
  initialQuizId?: string;
  gradeLevel: GradeLevel;
  onQuizCompleted: (quizId: string, scoreOver20: number, xpEarned: number, resultPayload?: Omit<QuizResult, 'studentId' | 'studentName'>) => void;
  language: 'fr' | 'ar';
}

export const QuizCenter: React.FC<QuizCenterProps> = ({
  initialQuizId,
  gradeLevel,
  onQuizCompleted,
  language
}) => {
  const isAr = language === 'ar';

  const allAvailableQuizzes = [...MOROCCAN_SVT_QUIZZES, ...MOROCCAN_EXAMENS_BLANCS];
  const matchingQuizzes = allAvailableQuizzes.filter(q => q.gradeLevel === gradeLevel);

  const [activeQuizId, setActiveQuizId] = useState<string>(
    initialQuizId || (matchingQuizzes[0]?.id || allAvailableQuizzes[0].id)
  );

  const currentQuiz: Quiz = allAvailableQuizzes.find(q => q.id === activeQuizId) || allAvailableQuizzes[0];

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(currentQuiz.durationMinutes * 60);

  // Switch Quiz
  const handleSelectQuiz = (quiz: Quiz) => {
    setActiveQuizId(quiz.id);
    setCurrentQuestionIdx(0);
    setUserAnswers({});
    setIsSubmitted(false);
    setTimeLeftSeconds(quiz.durationMinutes * 60);
  };

  // Timer countdown
  useEffect(() => {
    if (isSubmitted || timeLeftSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          setIsSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted, timeLeftSeconds]);

  const currentQuestion: QuizQuestion = currentQuiz.questions[currentQuestionIdx];

  const handleSelectAnswer = (ans: any) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: ans }));
  };

  const handleFinish = () => {
    setIsSubmitted(true);
    const scoreData = calculateQuizScore(currentQuiz.questions, userAnswers);
    const earnedXP = calculateEarnedXP(scoreData.scoreOver20);

    if (scoreData.passed) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Safe if confetti fails
      }
    }

    const timeSpent = Math.max(1, currentQuiz.durationMinutes * 60 - timeLeftSeconds);
    onQuizCompleted(currentQuiz.id, scoreData.scoreOver20, earnedXP, {
      id: `res_${Date.now()}`,
      quizId: currentQuiz.id,
      quizTitle: currentQuiz.title,
      gradeLevel: currentQuiz.gradeLevel,
      score: scoreData.scoreOver20,
      percentage: scoreData.percentage,
      passed: scoreData.passed,
      timeSpentSeconds: timeSpent,
      completedAt: new Date().toISOString(),
      answers: userAnswers,
    });
  };

  const scoreResult = isSubmitted ? calculateQuizScore(currentQuiz.questions, userAnswers) : null;

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-emerald-950/80 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-2">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              {isAr ? 'مركز الاختبارات والتقويمات المصححة' : 'Centre d\'Évaluation & Quiz SVT'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isAr ? 'اختبر معارفك العلمية وتدرب للامتحان' : 'Évaluations Formatives & Examens Blancs'}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {isAr
                ? 'تنقيط رسمي على 20، مؤقت زمني، تصحيح مفصل مع الشروحات البيداغوجية، وربح نقاط الخبرة والشارات.'
                : 'Barème officiel sur 20 points, chronomètre, corrigés détaillés et déblocage de récompenses.'}
            </p>
          </div>

          {/* Timer Display */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-4 py-2.5 rounded-xl shrink-0">
            <Clock className={`w-4 h-4 ${timeLeftSeconds < 120 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
            <div className="text-right rtl:text-left">
              <span className="text-[10px] text-slate-400 block">{isAr ? 'الوقت المتبقي' : 'Temps restant'}</span>
              <span className="font-mono font-bold text-sm text-white">{formattedTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quizzes Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {matchingQuizzes.map(q => {
          const isActive = q.id === activeQuizId;
          return (
            <button
              key={q.id}
              onClick={() => handleSelectQuiz(q)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-2 border ${
                isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{q.isExam ? '📝' : '⚡'}</span>
              <span>{isAr ? q.titleAr : q.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main Quiz Area */}
      {!isSubmitted ? (
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* Question Stepper */}
          <div className="flex items-center justify-between border-b border-slate-700 pb-4">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {isAr ? `السؤال ${currentQuestionIdx + 1} من ${currentQuiz.questions.length}` : `Question ${currentQuestionIdx + 1} sur ${currentQuiz.questions.length}`}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-700 text-xs text-slate-300 font-semibold">
              {currentQuestion.points} points
            </span>
          </div>

          {/* Question Prompt */}
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {isAr ? currentQuestion.promptAr : currentQuestion.prompt}
            </h3>
            {currentQuestion.documentTitle && (
              <p className="text-xs text-slate-400 italic">
                {currentQuestion.documentTitle}
              </p>
            )}
          </div>

          {/* Options Display */}
          <div className="space-y-3 pt-2">
            {currentQuestion.type === 'true_false' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleSelectAnswer(true)}
                  className={`p-4 rounded-2xl border text-sm font-bold transition-all text-center ${
                    userAnswers[currentQuestion.id] === true
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {isAr ? '✓ صحيح (Vrai)' : '✓ Vrai'}
                </button>
                <button
                  onClick={() => handleSelectAnswer(false)}
                  className={`p-4 rounded-2xl border text-sm font-bold transition-all text-center ${
                    userAnswers[currentQuestion.id] === false
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {isAr ? '✗ خطأ (Faux)' : '✗ Faux'}
                </button>
              </div>
            ) : (
              currentQuestion.options?.map((opt, idx) => {
                const isSelected = userAnswers[currentQuestion.id] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(idx)}
                    className={`w-full text-left rtl:text-right p-4 rounded-2xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md'
                        : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{isAr ? (currentQuestion.optionsAr?.[idx] || opt) : opt}</span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-amber-400 bg-amber-500 text-slate-950 font-bold' : 'border-slate-600'}`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between border-t border-slate-700 pt-5">
            <button
              onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIdx === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 text-xs font-semibold"
            >
              {isAr ? 'السابق' : 'Précédent'}
            </button>

            {currentQuestionIdx < currentQuiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 transition-transform hover:scale-105"
              >
                <span>{isAr ? 'التالي' : 'Suivant'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Trophy className="w-4 h-4 stroke-[2.5]" />
                <span>{isAr ? 'تسليم الإجابات والحصول على النقطة' : 'Valider & Obtenir ma note /20'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Results Report Card */
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center font-black text-2xl shadow-xl ${
              scoreResult!.scoreOver20 >= 10
                ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-400 border-2 border-rose-500/40'
            }`}>
              {scoreResult!.scoreOver20} / 20
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              {isAr ? scoreResult!.appreciationAr : scoreResult!.appreciationFr}
            </h2>
            <p className="text-xs text-slate-400">
              {scoreResult!.correctCount} / {scoreResult!.totalQuestions} {isAr ? 'إجابات صحيحة' : 'réponses correctes'} ({scoreResult!.percentage}%)
            </p>
          </div>

          {/* Question by Question Correction Breakdown */}
          <div className="space-y-4 pt-4 border-t border-slate-700">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {isAr ? 'التصحيح المفصل مع الشروحات البيداغوجية' : 'Corrigé Détaillé et Justifications'}
            </h3>

            <div className="space-y-3">
              {currentQuiz.questions.map((q, idx) => {
                const userAns = userAnswers[q.id];
                const isCorrect = typeof q.correctAnswer === 'boolean'
                  ? userAns === q.correctAnswer
                  : Number(userAns) === Number(q.correctAnswer);

                return (
                  <div key={q.id} className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-400">Question {idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {isCorrect ? (isAr ? '✓ صحيح (+5 ن)' : '✓ Correct (+5 pts)') : (isAr ? '✗ خطأ (0 ن)' : '✗ Incorrect (0 pt)')}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-white">
                      {isAr ? q.promptAr : q.prompt}
                    </p>

                    <div className="p-3 bg-slate-800/80 rounded-xl text-xs space-y-1">
                      <p className="text-emerald-300 font-medium">
                        <span className="font-bold">{isAr ? '💡 التعليل البيداغوجي: ' : '💡 Justification : '}</span>
                        {isAr ? q.explanationAr : q.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => handleSelectQuiz(currentQuiz)}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {isAr ? 'إعادة المحاولة' : 'Refaire le Quiz'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
