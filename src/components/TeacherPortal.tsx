import React, { useState } from 'react';
import {
  Users, Plus, Key, BookOpen, Award, CheckCircle, BarChart3,
  Download, Clock, ArrowRight, Check, Sparkles, UserCheck
} from 'lucide-react';
import { ClassRoom, GradeLevel } from '../types/svt';

interface TeacherPortalProps {
  language: 'fr' | 'ar';
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({ language }) => {
  const isAr = language === 'ar';

  const [classes, setClasses] = useState<ClassRoom[]>([
    {
      id: 'cls_3ac_a',
      name: '3AC - Classe Alpha (SVT)',
      gradeLevel: '3AC',
      academicYear: '2025/2026',
      accessCode: 'SVT-3AC9',
      teacherId: 'teacher_1',
      teacherName: 'Prof. Mohamed O.',
      studentsCount: 34,
      activeQuizzesCount: 3,
      averageScore: 14.8
    },
    {
      id: 'cls_2ac_b',
      name: '2AC - Groupe Géologie',
      gradeLevel: '2AC',
      academicYear: '2025/2026',
      accessCode: 'GEO-2AC4',
      teacherId: 'teacher_1',
      teacherName: 'Prof. Mohamed O.',
      studentsCount: 30,
      activeQuizzesCount: 2,
      averageScore: 13.5
    }
  ]);

  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState<GradeLevel>('3AC');

  const handleCreateClass = () => {
    if (!newClassName.trim()) return;
    const randomCode = `SVT-${newClassGrade}${Math.floor(100 + Math.random() * 900)}`;
    const newClass: ClassRoom = {
      id: `cls_${Date.now()}`,
      name: newClassName.trim(),
      gradeLevel: newClassGrade,
      academicYear: '2025/2026',
      accessCode: randomCode,
      teacherId: 'teacher_1',
      teacherName: 'Prof. Enseignant SVT',
      studentsCount: 0,
      activeQuizzesCount: 0,
      averageScore: 0
    };
    setClasses([...classes, newClass]);
    setNewClassName('');
    setIsCreatingClass(false);
  };

  return (
    <div className="space-y-6">
      {/* Teacher Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-2">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              {isAr ? 'فضاء الأستاذ التربوي' : 'Portail Enseignant SVT'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isAr ? 'إدارة الأقسام والواجبات وتتبع نتائج التلاميذ' : 'Gestion des Classes & Suivi Pédagogique'}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {isAr
                ? 'أنشئ فصولك الافتراضية، وزع أكواد الانضمام على تلاميذك، وعين لهم الأنشطة التفاعلية مع تتبع معدلات التحصيل.'
                : 'Créez vos classes, générez des codes d\'accès uniques pour vos élèves et suivez les moyennes et progressions.'}
            </p>
          </div>

          <button
            onClick={() => setIsCreatingClass(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-transform hover:scale-105 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            {isAr ? 'إنشاء قسم جديد' : 'Créer une classe'}
          </button>
        </div>
      </div>

      {/* Create Class Modal */}
      {isCreatingClass && (
        <div className="bg-slate-800/90 border border-blue-500/40 p-5 rounded-2xl space-y-4 shadow-2xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" />
            {isAr ? 'إضافة قسم دراسي جديد' : 'Ajouter une nouvelle classe'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isAr ? 'اسم القسم' : 'Nom de la classe'}
              </label>
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Ex : 3AC - Groupe SVT Bilingue..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isAr ? 'المستوى' : 'Niveau'}
              </label>
              <select
                value={newClassGrade}
                onChange={(e) => setNewClassGrade(e.target.value as GradeLevel)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="1AC">1AC</option>
                <option value="2AC">2AC</option>
                <option value="3AC">3AC</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsCreatingClass(false)}
              className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              {isAr ? 'إلغاء' : 'Annuler'}
            </button>
            <button
              onClick={handleCreateClass}
              className="px-5 py-2 rounded-xl bg-blue-500 text-slate-950 text-xs font-bold"
            >
              {isAr ? 'تأكيد الإنشاء' : 'Créer et générer le code'}
            </button>
          </div>
        </div>
      )}

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classes.map(cls => (
          <div
            key={cls.id}
            className="bg-slate-800/80 border border-slate-700/80 hover:border-blue-500/40 rounded-2xl p-5 space-y-4 shadow-xl transition-all"
          >
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300">
                  {cls.gradeLevel} • {cls.academicYear}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {cls.name}
                </h3>
              </div>

              {/* Unique Class Code */}
              <div className="text-right rtl:text-left bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 block">{isAr ? 'رمز الانضمام' : 'Code élève'}</span>
                <span className="font-mono font-bold text-xs text-emerald-400 select-all">
                  {cls.accessCode}
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{isAr ? 'التلاميذ' : 'Élèves'}</span>
                <span className="font-bold text-white text-sm">{cls.studentsCount}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{isAr ? 'الأنشطة' : 'Activités'}</span>
                <span className="font-bold text-white text-sm">{cls.activeQuizzesCount}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{isAr ? 'معدل القسم' : 'Moyenne'}</span>
                <span className="font-bold text-emerald-400 text-sm">{cls.averageScore} / 20</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                {isAr ? 'الأستاذ المشرف: ' : 'Enseignant : '} {cls.teacherName}
              </span>

              <button
                onClick={() => alert(isAr ? `رمز الانضمام للقسم: ${cls.accessCode}` : `Code d'accès pour vos élèves : ${cls.accessCode}`)}
                className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs text-white font-semibold flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5 text-blue-400" />
                <span>{isAr ? 'مشاركة الرمز' : 'Partager le code'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
