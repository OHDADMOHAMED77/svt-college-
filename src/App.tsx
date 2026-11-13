import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CourseExplorer } from './components/CourseExplorer';
import { LessonModal } from './components/LessonModal';
import { VirtualLab } from './components/VirtualLab';
import { QuizCenter } from './components/QuizCenter';
import { AiTutor } from './components/AiTutor';
import { PdfAiStudio } from './components/PdfAiStudio';
import { TeacherPortal } from './components/TeacherPortal';
import { AdminCms } from './components/AdminCms';
import { FreeSubscriptionModal } from './components/FreeSubscriptionModal';
import { AuthModal } from './components/AuthModal';
import { PhoneMockup } from './components/PhoneMockup';
import { MOROCCAN_SVT_LESSONS } from './data/moroccanSvtCurriculum';
import { Lesson, GradeLevel, UserRole, UserProfile } from './types/svt';
import { calculateLevelFromXP, checkNewUnlockedBadges } from './utils/svtLogic';
import { auth, onAuthStateChanged, db, handleFirestoreError, OperationType } from './firebase/config';
import {
  ADMIN_EMAIL,
  deleteLessonFromFirestore,
  mergeLessonsWithCloud,
  persistUserProgress,
  saveLessonToFirestore,
  saveQuizResultToFirestore,
  syncUserProfileOnSignIn,
} from './firebase/firestoreService';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<'fr' | 'ar'>('fr');
  const isAr = language === 'ar';

  const [role, setRole] = useState<UserRole>('student');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('3AC');
  const [currentTab, setCurrentTab] = useState<string>('courses');
  const [isPhoneMockup, setIsPhoneMockup] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

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
      preferredLanguage: 'fr',
      points: 120,
      level: 1,
      streakDays: 1,
      badges: ['badge_first_quiz'],
      completedLessonIds: ['lesson_1ac_milieu_naturel'],
      quizScores: {},
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
    };
  });

  // Track real Firebase Authentication state & hydrate Firestore UserProfile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthReady(true);
        try {
          const persisted = await syncUserProfileOnSignIn(user, {
            gradeLevel: selectedGrade,
            preferredLanguage: language,
            points,
            completedLessonIds,
            badges: unlockedBadges,
          });

          setUserProfile(persisted);
          setRole(persisted.role);
          if (persisted.gradeLevel) setSelectedGrade(persisted.gradeLevel);
          if (persisted.preferredLanguage) setLanguage(persisted.preferredLanguage);
          if (typeof persisted.points === 'number') {
            setPoints(persisted.points);
            localStorage.setItem('svt_points', String(persisted.points));
          }
          if (Array.isArray(persisted.completedLessonIds)) {
            setCompletedLessonIds(persisted.completedLessonIds);
            localStorage.setItem('svt_completed_lessons', JSON.stringify(persisted.completedLessonIds));
          }
          if (Array.isArray(persisted.badges)) {
            setUnlockedBadges(persisted.badges);
            localStorage.setItem('svt_badges', JSON.stringify(persisted.badges));
          }
          try {
            localStorage.setItem('svt_user_profile', JSON.stringify(persisted));
          } catch {}
        } catch (err) {
          console.warn('Firestore profile sync warning:', err);
          const isAdmin = user.email === ADMIN_EMAIL && user.emailVerified;
          setUserProfile(prev => ({
            ...prev,
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || prev.displayName,
            role: (isAdmin ? 'admin' : prev.role) as UserRole,
          }));
          if (isAdmin) setRole('admin');
        }
      } else {
        setCurrentUser(null);
        setIsAuthReady(true);
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

  // Real-time Firestore lessons listener (only attached once Auth is ready & user signed in)
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    const isEmailAdmin =
      currentUser.email === ADMIN_EMAIL && currentUser.emailVerified === true;
    const lessonsQuery = isEmailAdmin
      ? collection(db, 'lessons')
      : query(collection(db, 'lessons'), where('status', '==', 'published'));

    const unsubscribe = onSnapshot(
      lessonsQuery,
      snapshot => {
        if (snapshot.empty) return;
        const cloudLessons: Lesson[] = [];
        snapshot.forEach(docSnap => {
          cloudLessons.push(docSnap.data() as Lesson);
        });
        if (cloudLessons.length > 0) {
          setLessons(prev => {
            const merged = mergeLessonsWithCloud(prev, cloudLessons);
            try {
              localStorage.setItem('svt_college_pro_lessons', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      },
      err => {
        try {
          handleFirestoreError(err, OperationType.GET, 'lessons');
        } catch (structuredErr) {
          console.warn('Lessons snapshot listener notice:', structuredErr);
        }
      }
    );

    return () => unsubscribe();
  }, [isAuthReady, currentUser]);

  // Save lessons to LocalStorage and sync to Firestore when authenticated
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

    if (currentUser?.uid && (role === 'admin' || role === 'teacher')) {
      try {
        await saveLessonToFirestore(updatedLesson);
      } catch (err) {
        console.warn('Firestore lesson save error:', err);
      }
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

    if (currentUser?.uid && (role === 'admin' || role === 'teacher')) {
      try {
        await deleteLessonFromFirestore(lessonId);
      } catch (err) {
        console.warn('Firestore lesson delete error:', err);
      }
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

  const levelInfo = calculateLevelFromXP(points);

  // Lesson Modal Reader State
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [initialLabExpId, setInitialLabExpId] = useState<string | undefined>();
  const [initialQuizId, setInitialQuizId] = useState<string | undefined>();
  const [isFreeModalOpen, setIsFreeModalOpen] = useState(false);

  const handleCompleteLesson = (lessonId: string) => {
    if (!completedLessonIds.includes(lessonId)) {
      const updated = [...completedLessonIds, lessonId];
      setCompletedLessonIds(updated);
      localStorage.setItem('svt_completed_lessons', JSON.stringify(updated));

      const newXP = points + 50;
      setPoints(newXP);
      localStorage.setItem('svt_points', String(newXP));

      // Check badges
      const newBadges = checkNewUnlockedBadges(unlockedBadges, {
        totalCompletedLessons: updated.length,
        perfectScoresCount: 1,
        totalQuizzesTaken: 1,
        experimentsConducted: 1,
        gradeLevel: selectedGrade
      });

      const mergedBadges = newBadges.length > 0 ? [...unlockedBadges, ...newBadges] : unlockedBadges;
      if (newBadges.length > 0) {
        setUnlockedBadges(mergedBadges);
        localStorage.setItem('svt_badges', JSON.stringify(mergedBadges));
      }

      if (currentUser?.uid) {
        persistUserProgress(currentUser.uid, {
          points: newXP,
          completedLessonIds: updated,
          badges: mergedBadges,
        }).catch(err => console.warn('Progress Firestore sync:', err));
      }
    }
  };

  const handleQuizCompleted = (quizId: string, scoreOver20: number, xpEarned: number, resultPayload?: any) => {
    const newXP = points + xpEarned;
    setPoints(newXP);
    localStorage.setItem('svt_points', String(newXP));

    const updatedScores = { ...(userProfile.quizScores || {}), [quizId]: scoreOver20 };
    setUserProfile(prev => ({ ...prev, points: newXP, quizScores: updatedScores }));

    if (currentUser?.uid) {
      persistUserProgress(currentUser.uid, {
        points: newXP,
        quizScores: updatedScores,
      }).catch(err => console.warn('Quiz XP Firestore sync:', err));

      if (resultPayload) {
        saveQuizResultToFirestore({
          ...resultPayload,
          studentId: currentUser.uid,
          studentName: userProfile.displayName || currentUser.displayName || 'Élève SVT',
        }).catch(err => console.warn('Quiz result Firestore save:', err));
      }
    }
  };

  const handleExperimentCompleted = (expId: string) => {
    const newXP = points + 40;
    setPoints(newXP);
    localStorage.setItem('svt_points', String(newXP));
    if (currentUser?.uid) {
      persistUserProgress(currentUser.uid, { points: newXP }).catch(err =>
        console.warn('Experiment XP Firestore sync:', err)
      );
    }
  };

  const handleActivateFreeCode = (code: string) => {
    if (code === 'MAROC-SVT-2025' || code.startsWith('SVT-')) {
      const bonusXP = points + 200;
      setPoints(bonusXP);
      localStorage.setItem('svt_points', String(bonusXP));
      if (currentUser?.uid) {
        persistUserProgress(currentUser.uid, { points: bonusXP }).catch(err =>
          console.warn('Voucher XP Firestore sync:', err)
        );
      }
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Global Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        selectedGrade={selectedGrade}
        onSelectGrade={(lvl) => {
          setSelectedGrade(lvl);
          if (currentUser?.uid) {
            persistUserProgress(currentUser.uid, { gradeLevel: lvl }).catch(() => {});
          }
        }}
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
        onToggleLanguage={() => {
          const nextLang = language === 'fr' ? 'ar' : 'fr';
          setLanguage(nextLang);
          if (currentUser?.uid) {
            persistUserProgress(currentUser.uid, { preferredLanguage: nextLang }).catch(() => {});
          }
        }}
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
              onOpenPdfStudio={() => setCurrentTab('pdf-ai')}
            />
          )}

          {currentTab === 'pdf-ai' && (
            <PdfAiStudio
              gradeLevel={selectedGrade}
              language={language}
              lessons={lessons}
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
                currentUser={currentUser}
                teacherName={userProfile.displayName}
                role={role}
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
