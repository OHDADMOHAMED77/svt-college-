import React from 'react';
import {
  BookOpen, FlaskConical, Award, Bot, Users, ShieldCheck,
  Smartphone, Monitor, Globe, Sparkles, GraduationCap, ChevronDown,
  User, LogIn
} from 'lucide-react';
import { GradeLevel, UserRole } from '../types/svt';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  selectedGrade: GradeLevel;
  onSelectGrade: (grade: GradeLevel) => void;
  role: UserRole;
  onSelectRole: (role: UserRole) => void;
  language: 'fr' | 'ar';
  onToggleLanguage: () => void;
  isPhoneMockup: boolean;
  onTogglePhoneMockup: () => void;
  points: number;
  level: number;
  userName: string;
  userEmail?: string;
  isLoggedIn: boolean;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  selectedGrade,
  onSelectGrade,
  role,
  onSelectRole,
  language,
  onToggleLanguage,
  isPhoneMockup,
  onTogglePhoneMockup,
  points,
  level,
  userName,
  userEmail,
  isLoggedIn,
  onOpenAuthModal
}) => {
  const isAr = language === 'ar';

  const navItems = [
    { id: 'courses', labelFr: 'Cours', labelAr: 'الدروس', icon: BookOpen },
    { id: 'lab', labelFr: 'Labo Virtuel', labelAr: 'المختبر الافتراضي', icon: FlaskConical },
    { id: 'quiz', labelFr: 'Quiz & Examens', labelAr: 'التقويمات والامتحانات', icon: Award },
    { id: 'ai', labelFr: 'Tuteur IA', labelAr: 'المساعد الذكي', icon: Bot },
    ...(role === 'teacher' || role === 'admin'
      ? [{ id: 'teacher', labelFr: 'Enseignant', labelAr: 'فضاء الأستاذ', icon: Users }]
      : []),
    ...(role === 'admin'
      ? [{ id: 'admin', labelFr: 'Admin CMS', labelAr: 'إدارة الدروس (CMS)', icon: ShieldCheck }]
      : [])
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo */}
          <div
            onClick={() => onSelectTab('courses')}
            className="flex items-center gap-2.5 cursor-pointer shrink-0 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <FlaskConical className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
                  SVT COLLÈGE
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-black text-[10px] tracking-wider uppercase">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-emerald-400/80 font-medium tracking-wide">
                {isAr ? 'المنهاج المغربي الرسمي' : 'Collège Marocain • 1AC 2AC 3AC'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{isAr ? item.labelAr : item.labelFr}</span>
                </button>
              );
            })}
          </nav>

          {/* Controls Bar: Grade, Role, Lang, Phone View, Points, Auth */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Grade Selector (1AC, 2AC, 3AC) */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-bold">
              {(['1AC', '2AC', '3AC'] as GradeLevel[]).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => onSelectGrade(lvl)}
                  className={`px-2 py-1 rounded-md transition-all ${
                    selectedGrade === lvl
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Role Switcher Pill */}
            <div className="relative">
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value as UserRole;
                  onSelectRole(newRole);
                  if (newRole === 'admin') onSelectTab('admin');
                  if (newRole === 'teacher') onSelectTab('teacher');
                }}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border focus:outline-none appearance-none cursor-pointer pr-6 ${
                  role === 'admin'
                    ? 'bg-purple-950/80 border-purple-500/40 text-purple-300'
                    : role === 'teacher'
                    ? 'bg-blue-950/80 border-blue-500/40 text-blue-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <option value="student">{isAr ? '👤 تلميذ' : '👤 Élève'}</option>
                <option value="teacher">{isAr ? '👨‍🏫 أستاذ' : '👨‍🏫 Enseignant'}</option>
                <option value="admin">{isAr ? '🛡️ مشرف CMS' : '🛡️ Admin CMS'}</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Language Switcher (FR / AR) */}
            <button
              onClick={onToggleLanguage}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1 transition-colors"
              title={isAr ? 'Changer en Français' : 'تغيير إلى العربية'}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'FR' : 'عربي'}</span>
            </button>

            {/* Smartphone View Mockup Toggle */}
            <button
              onClick={onTogglePhoneMockup}
              className={`p-2 rounded-lg border transition-colors hidden sm:flex items-center gap-1 text-xs font-semibold ${
                isPhoneMockup
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title={isPhoneMockup ? 'Passer en plein écran' : 'Mode Smartphone Android'}
            >
              {isPhoneMockup ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </button>

            {/* User Account Button (Auth trigger) */}
            <button
              onClick={onOpenAuthModal}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 text-xs font-bold transition-colors"
              title={isLoggedIn ? userName : (isAr ? 'تسجيل الدخول' : 'Connexion')}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                role === 'admin' ? 'bg-purple-500/20 text-purple-300' :
                role === 'teacher' ? 'bg-blue-500/20 text-blue-300' :
                'bg-emerald-500/20 text-emerald-400'
              }`}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden lg:inline-block max-w-[90px] truncate">{userName}</span>
            </button>

            {/* Gamification Points Pill */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{points} XP</span>
              <span className="text-[10px] text-amber-400/70 font-normal">Niv. {level}</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800/80 overflow-x-auto gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[11px]">{isAr ? item.labelAr : item.labelFr}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
