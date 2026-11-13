import React, { useState } from 'react';
import {
  X, LogIn, LogOut, ShieldCheck, UserCheck, GraduationCap,
  Sparkles, CheckCircle2, AlertCircle, Mail, Key, User
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut } from '../firebase/config';
import { UserProfile, UserRole, GradeLevel } from '../types/svt';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  userProfile: UserProfile;
  onUpdateProfile: (profile: Partial<UserProfile>) => void;
  language: 'fr' | 'ar';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onUpdateProfile,
  language
}) => {
  if (!isOpen) return null;

  const isAr = language === 'ar';
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole>(userProfile.role);
  const [customName, setCustomName] = useState(userProfile.displayName || '');

  // Real Google Sign In via Firebase Popup
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const isAdmin = user.email === 'ohdadmohamed77@gmail.com' && user.emailVerified;
      onUpdateProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Utilisateur SVT',
        role: isAdmin ? 'admin' : userProfile.role,
      });
      onClose();
    } catch (err: any) {
      console.warn('Firebase popup sign-in note:', err?.message);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError(
          isAr
            ? 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.'
            : 'Fenêtre de connexion Google fermée avant confirmation.'
        );
      } else {
        setAuthError(
          isAr
            ? 'تعذر فتح نافذة Google (تحقق من السماح للنوافذ المنبثقة أو استخدم الحساب السريع أدناه).'
            : 'Impossible d\'ouvrir la fenêtre Google (autorisez les popups ou utilisez le profil rapide ci-dessous).'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onUpdateProfile({
        uid: 'guest_student',
        email: '',
        displayName: isAr ? 'تلميذ زائر' : 'Élève Invité',
        role: 'student'
      });
      onClose();
    } catch (err: any) {
      console.warn('Sign out error:', err);
    }
  };

  const handleSaveDemoProfile = () => {
    onUpdateProfile({
      displayName: customName.trim() || (selectedDemoRole === 'admin' ? 'Administrateur SVT' : selectedDemoRole === 'teacher' ? 'Professeur SVT' : 'Élève SVT'),
      role: selectedDemoRole
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <UserCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h3 className="text-xl font-bold text-white">
            {currentUser ? (isAr ? 'حسابي البيداغوجي' : 'Mon Compte SVT') : (isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Connexion & Profil SVT')}
          </h3>
          <p className="text-xs text-slate-400">
            {isAr
              ? 'مصادقة آمنة عبر Google و Firebase مع مزامنة التقدم في Firestore'
              : 'Authentification Google Firebase sécurisée et sauvegarde cloud Firestore'}
          </p>
        </div>

        {/* Current Auth Status Card */}
        {currentUser ? (
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="w-11 h-11 rounded-full border-2 border-emerald-500" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
                  {userProfile.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{userProfile.displayName}</h4>
                <p className="text-xs text-slate-400 truncate">{currentUser.email || userProfile.email || 'Compte local'}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    userProfile.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                    userProfile.role === 'teacher' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {userProfile.role === 'admin' ? (isAr ? '🛡️ مشرف المنصة' : '🛡️ Administrateur') :
                     userProfile.role === 'teacher' ? (isAr ? '👨‍🏫 أستاذ المادة' : '👨‍🏫 Enseignant') :
                     (isAr ? '👤 تلميذ مسجل' : '👤 Élève')}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    {isAr ? 'مزامن مع Firestore' : 'Synchronisé Firestore'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{isAr ? 'تسجيل الخروج' : 'Se déconnecter'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Real Firebase Google Login Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 text-xs font-bold flex items-center justify-center gap-3 shadow-md transition-all active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>
                {isLoading
                  ? (isAr ? 'جاري الاتصال بـ Google...' : 'Connexion à Google...')
                  : (isAr ? 'تسجيل الدخول بحساب Google' : 'Continuer avec Google (Firebase)')}
              </span>
            </button>

            {authError && (
              <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
                {authError}
              </p>
            )}

            <div className="flex items-center gap-3">
              <div className="border-t border-slate-800 flex-1" />
              <span className="text-[11px] text-slate-500 font-semibold uppercase shrink-0">
                {isAr ? 'أو تخصيص الحساب المحلي' : 'Ou mode profil direct'}
              </span>
              <div className="border-t border-slate-800 flex-1" />
            </div>

            {/* Direct Profile Role Customization */}
            <div className="space-y-3 bg-slate-800/60 border border-slate-700/80 p-4 rounded-2xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isAr ? 'الاسم الظاهر' : 'Nom d\'affichage'}
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex : Mohamed O. / Élève 3AC"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isAr ? 'الرتبة والدور في المنصة' : 'Rôle et Permissions'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDemoRole('student')}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all ${
                      selectedDemoRole === 'student'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    👤 {isAr ? 'تلميذ' : 'Élève'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDemoRole('teacher')}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all ${
                      selectedDemoRole === 'teacher'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    👨‍🏫 {isAr ? 'أستاذ' : 'Prof'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDemoRole('admin')}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all ${
                      selectedDemoRole === 'admin'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    🛡️ {isAr ? 'مشرف' : 'Admin'}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveDemoProfile}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-[0.98]"
              >
                {isAr ? 'تطبيق وحفظ الحساب' : 'Valider ce profil'}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
          >
            {isAr ? 'إغلاق' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
};
