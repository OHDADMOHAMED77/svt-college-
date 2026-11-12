import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CourseExplorer } from './components/CourseExplorer';
import { LessonModal } from './components/LessonModal';
import { VirtualLab } from './components/VirtualLab';
import { QuizCenter } from './components/QuizCenter';
import { AiTutor } from './components/AiTutor';
import { TeacherPortal } from './components/TeacherPortal';
import { AdminCms } from './components/AdminCms';
import { FreeSubscriptionModal } from './components/FreeSubscriptionModal';
import { AuthModal } from './components/AuthModal';
import { PhoneMockup } from './components/PhoneMockup';
import { MOROCCAN_SVT_LESSONS } from './data/moroccanSvtCurriculum';
import { Lesson, GradeLevel, UserRole, UserProfile } from './types/svt';
import { calculateLevelFromXP, checkNewUnlockedBadges } from './utils/svtLogic';
import { auth, onAuthStateChanged, db, handleFirestoreError, OperationType } from './firebase/config';
import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { ShieldAlert } from 'lucide-react';

/** Reads a JSON value from localStorage, falling back when it is missing or corrupted. */
function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [language, setLanguage] = useState<'fr' | 'ar'>('fr');
  const isAr = language === 'ar';

  const [role, setRole] = useState<UserRole>('student');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('3AC');
  const [currentTab, setCurrentTab] = useState<string>('courses');
  const [isPhoneMockup, setIsPhoneMockup] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('svt_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.displayName) return parsed;
      }
    } catch (e) {
      console.warn('UserProfile read error:', e);
    }
    return {
      uid: 'guest_student',
      displayName: 'Élève Invité',
      email: '',
      role: 'student',
      gradeLevel: '3AC',
      points: 120,
      completedLessons: ['lesson_1ac_milieu_naturel'],
      unlockedBadges: ['badge_first_quiz']
    };
  });

  // Track real Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (user) {
        setCurrentUser(user);
        const isAdmin = user.email === 'ohdadmohamed77@gmail.com';
        setUserProfile(prev => {
          const next = {
            ...prev,
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || prev.displayName,
            role: (isAdmin ? 'admin' : prev.role) as UserRole,
          };
          try {
            localStorage.setItem('svt_user_profile', JSON.stringify(next));
          } catch {}
          return next;
        });
        if (isAdmin) {
          setRole('admin');
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Synchronize HTML dir attribute for full RTL support
  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = isAr ? 'ar' : 'fr';
  }, [isAr]);

  // Persistent Lessons state (Synced with LocalStorage and Firestore)
  const [lessons, setLessons] = useState<Lesson[]>(() => {
    try {
      const saved = localStorage.getItem('svt_college_pro_lessons');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }
    return MOROCCAN_SVT_LESSONS;
  });

  // Try to load additional custom lessons from Firestore on mount
  useEffect(() => {
    async function loadFirestoreLessons() {
      try {
        const snapshot = await getDocs(collection(db, 'lessons'));
        if (!snapshot.empty) {
          const cloudLessons: Lesson[] = [];
          snapshot.forEach(docSnap => {
            cloudLessons.push(docSnap.data() as Lesson);
          });
          if (cloudLessons.length > 0) {
            setLessons(prev => {
              const map = new Map<string, Lesson>();
              prev.forEach(l => map.set(l.id, l));
              cloudLessons.forEach(l => map.set(l.id, l));
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'lessons');
      }
    }
    loadFirestoreLessons();
  }, []);

  // Save lessons to LocalStorage and attempt Firestore sync
  const saveLesson = async (updatedLesson: Lesson) => {
    setLessons(prev => {
      const exists = prev.some(l => l.id === updatedLesson.id);
      const next = exists
        ? prev.map(l => (l.id === updatedLesson.id ? updatedLesson : l))
        : [updatedLesson, ...prev];
      try {
        localStorage.setItem('svt_college_pro_lessons', JSON.stringify(next));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
      return next;
    });

    // Cloud Firestore Sync
    try {
      await setDoc(doc(db, 'lessons', updatedLesson.id), updatedLesson);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lessons/${updatedLesson.id}`);
    }
  };

  const deleteLesson = async (lessonId: string) => {
    setLessons(prev => {
      const next = prev.filter(l => l.id !== lessonId);
      try {
        localStorage.setItem('svt_college_pro_lessons', JSON.stringify(next));
      } catch (e) {
        console.warn('LocalStorage delete error:', e);
      }
      return next;
    });

    // Also delete it in Firestore, otherwise it is merged back on the next page load
    try {
      await deleteDoc(doc(db, 'lessons', lessonId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `lessons/${lessonId}`);
    }
  };

  const duplicateLesson = (lessonToDuplicate: Lesson) => {
    const clone: Lesson = {
      ...JSON.parse(JSON.stringify(lessonToDuplicate)),
      id: `lesson_${Date.now()}`,
      title: `${lessonToDuplicate.title} (Copie)`,
      titleAr: `${lessonToDuplicate.titleAr || lessonToDuplicate.title} (نسخة)`,
      status: 'draft'
    };
    saveLesson(clone);
  };

  // Student Profile State
  const [points, setPoints] = useState<number>(() => {
    return Number(localStorage.getItem('svt_points') || '120');
  });

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('svt_completed_lessons');
      return saved ? JSON.parse(saved) : ['lesson_1ac_milieu_naturel'];
    } catch {
      return ['lesson_1ac_milieu_naturel'];
    }
  });

  const [unlockedBadges, setUnlockedBadges] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('svt_badges');
      return saved ? JSON.parse(saved) : ['badge_first_quiz'];
    } catch {
      return ['badge_first_quiz'];
    }
  });

  // Best score per quiz (quizId -> score /20), distinct experiments done, and free codes already used
  const [quizBestScores, setQuizBestScores] = useState<Record<string, number>>(() =>
    readStored<Record<string, number>>('svt_quiz_best_scores', {})
  );
  const [completedExperiments, setCompletedExperiments] = useState<string[]>(() =>
    readStored<string[]>('svt_completed_experiments', [])
  );
  const [activatedCodes, setActivatedCodes] = useState<string[]>(() =>
    readStored<string[]>('svt_activated_codes', [])
  );

  const levelInfo = calculateLevelFromXP(points);

  // Lesson Modal Reader State
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [initialLabExpId, setInitialLabExpId] = useState<string | undefined>();
  const [initialQuizId, setInitialQuizId] = useState<string | undefined>();
  const [isFreeModalOpen, setIsFreeModalOpen] = useState(false);

  const addXP = (amount: number) => {
    const newXP = points + amount;
    setPoints(newXP);
    localStorage.setItem('svt_points', String(newXP));
  };

  // Badge statistics computed from real progress (previously hard-coded to 1)
  const buildBadgeStats = (
    lessonCount: number,
    quizScores: Record<string, number>,
    experiments: string[]
  ) => ({
    totalCompletedLessons: lessonCount,
    perfectScoresCount: Object.values(quizScores).filter(score => score >= 20).length,
    totalQuizzesTaken: Object.keys(quizScores).length,
    experimentsConducted: experiments.length,
    gradeLevel: selectedGrade
  });

  const unlockNewBadges = (stats: ReturnType<typeof buildBadgeStats>) => {
    const newBadges = checkNewUnlockedBadges(unlockedBadges, stats);
    if (newBadges.length > 0) {
      const merged = [...unlockedBadges, ...newBadges];
      setUnlockedBadges(merged);
      localStorage.setItem('svt_badges', JSON.stringify(merged));
    }
  };

  const handleCompleteLesson = (lessonId: string) => {
    if (completedLessonIds.includes(lessonId)) return;

    const updated = [...completedLessonIds, lessonId];
    setCompletedLessonIds(updated);
    localStorage.setItem('svt_completed_lessons', JSON.stringify(updated));
    addXP(50);
    unlockNewBadges(buildBadgeStats(updated.length, quizBestScores, completedExperiments));
  };

  const handleQuizCompleted = (quizId: string, scoreOver20: number, xpEarned: number) => {
    const isFirstCompletion = !(quizId in quizBestScores);
    const nextScores = {
      ...quizBestScores,
      [quizId]: Math.max(scoreOver20, quizBestScores[quizId] || 0)
    };
    setQuizBestScores(nextScores);
    localStorage.setItem('svt_quiz_best_scores', JSON.stringify(nextScores));

    // XP is granted only the first time a quiz is completed, so retrying cannot farm points
    if (isFirstCompletion) {
      addXP(xpEarned);
    }
    unlockNewBadges(buildBadgeStats(completedLessonIds.length, nextScores, completedExperiments));
  };

  const handleExperimentCompleted = (expId: string) => {
    // The lab fires this event every time the last step is ticked again: reward each experiment once
    if (completedExperiments.includes(expId)) return;

    const nextExperiments = [...completedExperiments, expId];
    setCompletedExperiments(nextExperiments);
    localStorage.setItem('svt_completed_experiments', JSON.stringify(nextExperiments));
    addXP(40);
    unlockNewBadges(buildBadgeStats(completedLessonIds.length, quizBestScores, nextExperiments));
  };

  const handleActivateFreeCode = (code: string) => {
    const isKnownCode = code === 'MAROC-SVT-2025' || code.startsWith('SVT-');
    if (!isKnownCode) return false;

    // A code grants its bonus only once on this device
    if (activatedCodes.includes(code)) return true;

    const nextCodes = [...activatedCodes, code];
    setActivatedCodes(nextCodes);
    localStorage.setItem('svt_activated_codes', JSON.stringify(nextCodes));
    addXP(200);
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Global Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        selectedGrade={selectedGrade}
        onSelectGrade={setSelectedGrade}
        role={role}
        onSelectRole={(newRole) => {
          setRole(newRole);
          setUserProfile(prev => {
            const next = { ...prev, role: newRole };
            try { localStorage.setItem('svt_user_profile', JSON.stringify(next)); } catch {}
            return next;
          });
        }}
        language={language}
        onToggleLanguage={() => setLanguage(prev => (prev === 'fr' ? 'ar' : 'fr'))}
        isPhoneMockup={isPhoneMockup}
        onTogglePhoneMockup={() => setIsPhoneMockup(!isPhoneMockup)}
        points={points}
        level={levelInfo.level}
        userName={userProfile.displayName}
        userEmail={userProfile.email}
        isLoggedIn={!!currentUser || !!userProfile.email}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area Wrapped with Responsive Phone Mockup if enabled */}
      <PhoneMockup enabled={isPhoneMockup}>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
          {currentTab === 'courses' && (
            <CourseExplorer
              lessons={lessons}
              gradeLevel={selectedGrade}
              onSelectLesson={(lesson) => setSelectedLesson(lesson)}
              onStartExperiment={(expId) => {
                setInitialLabExpId(expId);
                setCurrentTab('lab');
              }}
              onStartQuiz={(quizId) => {
                setInitialQuizId(quizId);
                setCurrentTab('quiz');
              }}
              completedLessonIds={completedLessonIds}
              language={language}
            />
          )}

          {currentTab === 'lab' && (
            <VirtualLab
              initialExperimentId={initialLabExpId}
              gradeLevel={selectedGrade}
              onExperimentCompleted={handleExperimentCompleted}
              language={language}
            />
          )}

          {currentTab === 'quiz' && (
            <QuizCenter
              initialQuizId={initialQuizId}
              gradeLevel={selectedGrade}
              onQuizCompleted={handleQuizCompleted}
              language={language}
            />
          )}

          {currentTab === 'ai' && (
            <AiTutor
              gradeLevel={selectedGrade}
              language={language}
            />
          )}

          {currentTab === 'teacher' && (
            role === 'student' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-xl mx-auto my-8 space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  {isAr ? 'فضاء خاص بالأساتذة' : 'Espace Réservé aux Enseignants'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isAr
                    ? 'هذا الفضاء مخصص للأساتذة لإنشاء وتدبير الأقسام ومتابعة نتائج التلاميذ وإرسال التعيينات.'
                    : 'Cet espace permet aux enseignants de gérer leurs classes, générer des codes d\'accès et suivre la progression des élèves.'}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setRole('teacher');
                      setUserProfile(prev => ({ ...prev, role: 'teacher' }));
                    }}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    {isAr ? 'تفعيل وضع الأستاذ' : 'Passer en Mode Enseignant'}
                  </button>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
                  >
                    {isAr ? 'تسجيل الدخول' : 'Connexion'}
                  </button>
                </div>
              </div>
            ) : (
              <TeacherPortal
                language={language}
              />
            )
          )}

          {currentTab === 'admin' && (
            role !== 'admin' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-xl mx-auto my-8 space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 mx-auto flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  {isAr ? 'منطقة مخصصة للمشرفين (CMS)' : 'Espace Administrateur Réservé (CMS)'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isAr
                    ? 'تتطلب إدارة الدروس والمحتوى صلاحيات المشرف. يمكنك تسجيل الدخول بحساب المشرف أو تفعيل وضع الإشراف.'
                    : 'La gestion et publication des cours nécessite des droits d\'administration. Connectez-vous avec vos identifiants autorisés.'}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    {isAr ? 'تسجيل الدخول كمشرف' : 'Se connecter en tant qu\'Admin'}
                  </button>
                  <button
                    onClick={() => {
                      setRole('admin');
                      setUserProfile(prev => ({ ...prev, role: 'admin' }));
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
                  >
                    {isAr ? 'تفعيل وضع المشرف السريع' : 'Passer en rôle Administrateur'}
                  </button>
                </div>
              </div>
            ) : (
              <AdminCms
                lessons={lessons}
                onSaveLesson={saveLesson}
                onDeleteLesson={deleteLesson}
                onDuplicateLesson={duplicateLesson}
                onPreviewLesson={(lesson) => setSelectedLesson(lesson)}
                language={language}
              />
            )
          )}
        </main>
      </PhoneMockup>

      {/* Interactive Lesson Modal Reader */}
      <LessonModal
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
        onCompleteLesson={handleCompleteLesson}
        isCompleted={selectedLesson ? completedLessonIds.includes(selectedLesson.id) : false}
        onOpenLab={(expId) => {
          setInitialLabExpId(expId);
          setCurrentTab('lab');
        }}
        onOpenQuiz={(quizId) => {
          setInitialQuizId(quizId);
          setCurrentTab('quiz');
        }}
        language={language}
      />

      {/* Free Public Pass / Voucher Modal */}
      <FreeSubscriptionModal
        isOpen={isFreeModalOpen}
        onClose={() => setIsFreeModalOpen(false)}
        onActivateCode={handleActivateFreeCode}
        currentPlan="free_public"
        language={language}
      />

      {/* Real Firebase & Role Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        onUpdateProfile={(updated) => {
          setUserProfile(prev => {
            const next = { ...prev, ...updated };
            if (updated.role) setRole(updated.role);
            try { localStorage.setItem('svt_user_profile', JSON.stringify(next)); } catch {}
            return next;
          });
        }}
        language={language}
      />

      {/* Footer */}
      <footer className="bg-slate-900/80 border-t border-slate-800 py-6 text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left rtl:sm:text-right">
          <div>
            <span className="font-bold text-white">SVT COLLÈGE PRO</span>
            <span className="mx-2">•</span>
            <span>{isAr ? 'منصة تربوية لتعليم علوم الحياة والأرض بالمغرب' : 'Plateforme éducative conforme aux directives du Ministère de l\'Éducation Nationale du Maroc'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFreeModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-4"
            >
              {isAr ? '🎁 كود المؤسسة المجاني' : '🎁 Accès Établissement Gratuit'}
            </button>
            <span>•</span>
            <span className="text-slate-500 font-mono">v2.5.0-pro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
