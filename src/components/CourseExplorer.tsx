import React, { useState } from 'react';
import {
  BookOpen, Search, Filter, Clock, CheckCircle2, ChevronRight,
  FlaskConical, Award, FileText, ArrowRight, Sparkles, Layers,
  ExternalLink, Printer, Check
} from 'lucide-react';
import { Lesson, GradeLevel } from '../types/svt';

interface CourseExplorerProps {
  lessons: Lesson[];
  gradeLevel: GradeLevel;
  onSelectLesson: (lesson: Lesson) => void;
  onStartExperiment: (experimentId: string) => void;
  onStartQuiz: (quizId: string) => void;
  completedLessonIds: string[];
  language: 'fr' | 'ar';
}

export const CourseExplorer: React.FC<CourseExplorerProps> = ({
  lessons,
  gradeLevel,
  onSelectLesson,
  onStartExperiment,
  onStartQuiz,
  completedLessonIds,
  language
}) => {
  const isAr = language === 'ar';
  const [search, setSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<'all' | '1' | '2'>('all');

  const visibleLessons = lessons.filter(l => {
    if (l.gradeLevel !== gradeLevel) return false;
    // Hide archived from student view
    if (l.status === 'archived') return false;
    if (semesterFilter !== 'all' && String(l.semester || 1) !== semesterFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.titleAr.includes(q) ||
        l.chapterTitle.toLowerCase().includes(q) ||
        l.themeTitle.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group lessons by Semester and Theme
  const themesMap = visibleLessons.reduce((acc, lesson) => {
    const key = isAr ? lesson.themeTitleAr : lesson.themeTitle;
    if (!acc[key]) acc[key] = [];
    acc[key].push(lesson);
    return acc;
  }, {} as Record<string, Lesson[]>);

  const completedCount = visibleLessons.filter(l => completedLessonIds.includes(l.id)).length;
  const progressPercent = visibleLessons.length > 0 ? Math.round((completedCount / visibleLessons.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Grade Level Banner */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-500/25 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              {gradeLevel === '1AC' ? (isAr ? 'الأولى ثانوي إعدادي' : '1ère Année Collège (1AC)') :
               gradeLevel === '2AC' ? (isAr ? 'الثانية ثانوي إعدادي' : '2ème Année Collège (2AC)') :
               (isAr ? 'الثالثة ثانوي إعدادي - سنة إشهادية' : '3ème Année Collège (3AC) - Brevet')}
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
              {isAr ? 'برنامج علوم الحياة والأرض الرسمي' : 'Programme Officiel SVT Collège'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              {isAr
                ? 'دروس تفاعلية مدعومة بالرسوم التخطيطية، التجارب الافتراضية، التمارين والامتحانات الموحدة.'
                : 'Leçons structurées, schémas scientifiques commentés, expériences virtuelles et examens blancs certifiés.'}
            </p>
          </div>

          {/* Student Progress Widget */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 min-w-[200px] shrink-0">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>{isAr ? 'نسبة التقدم' : 'Progression'}</span>
              <span className="font-bold text-emerald-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 text-center">
              {completedCount} / {visibleLessons.length} {isAr ? 'دروس مكتملة' : 'cours validés'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? 'ابحث في الدروس والمفاهيم العلمية...' : 'Rechercher une notion, un chapitre...'}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Semester Buttons */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
          <button
            onClick={() => setSemesterFilter('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              semesterFilter === 'all' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'الكل' : 'Tous'}
          </button>
          <button
            onClick={() => setSemesterFilter('1')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              semesterFilter === '1' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'الدورة 1' : 'Semestre 1'}
          </button>
          <button
            onClick={() => setSemesterFilter('2')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              semesterFilter === '2' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? 'الدورة 2' : 'Semestre 2'}
          </button>
        </div>
      </div>

      {/* Course Listing by Theme */}
      <div className="space-y-8">
        {Object.keys(themesMap).length === 0 ? (
          <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
            <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">
              {isAr ? 'لا توجد دروس متطابقة في هذا المستوى' : 'Aucun cours disponible pour cette sélection.'}
            </p>
          </div>
        ) : (
          Object.entries(themesMap).map(([themeTitle, themeLessons]) => (
            <div key={themeTitle} className="space-y-3">
              {/* Theme Header */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-sm sm:text-base font-bold text-emerald-400 uppercase tracking-wide">
                  {themeTitle}
                </h2>
              </div>

              {/* Lesson Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {themeLessons.map(lesson => {
                  const isCompleted = completedLessonIds.includes(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg transition-all duration-200 flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        {/* Meta Tags */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-700/80 text-[11px] font-semibold text-slate-300">
                            {isAr ? `الدورة ${lesson.semester || 1}` : `Semestre ${lesson.semester || 1}`}
                          </span>

                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              <Check className="w-3 h-3 stroke-[3]" />
                              {isAr ? 'تمت دراسته' : 'Terminé'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {lesson.estimatedMinutes} min
                            </span>
                          )}
                        </div>

                        {/* Title & Chapter */}
                        <div>
                          <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider line-clamp-1">
                            {isAr ? lesson.chapterTitleAr : lesson.chapterTitle}
                          </p>
                          <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors mt-0.5 line-clamp-2">
                            {isAr ? (lesson.titleAr || lesson.title) : lesson.title}
                          </h3>
                        </div>

                        {/* Summary */}
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {isAr ? (lesson.summaryAr || lesson.summary) : lesson.summary}
                        </p>

                        {/* Objectives preview */}
                        <div className="space-y-1 pt-1">
                          {lesson.objectives.slice(0, 2).map((obj, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                              <span className="line-clamp-1">{isAr ? (lesson.objectivesAr[idx] || obj) : obj}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-4 mt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {lesson.linkedExperimentId && (
                            <button
                              onClick={() => onStartExperiment(lesson.linkedExperimentId!)}
                              className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-colors"
                              title={isAr ? 'المختبر الافتراضي' : 'Laboratoire Virtuel'}
                            >
                              <FlaskConical className="w-4 h-4" />
                            </button>
                          )}
                          {lesson.linkedQuizId && (
                            <button
                              onClick={() => onStartQuiz(lesson.linkedQuizId!)}
                              className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors"
                              title={isAr ? 'اختبار وتقويم' : 'Quiz & Exercices'}
                            >
                              <Award className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => onSelectLesson(lesson)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1 shadow-sm transition-all group-hover:scale-105"
                        >
                          <span>{isAr ? 'دراسة الدرس' : 'Lire le cours'}</span>
                          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
