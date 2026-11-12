import React, { useState } from 'react';
import {
  X, BookOpen, CheckCircle, FlaskConical, Award, FileText,
  Volume2, Globe, Clock, Download, Check, Sparkles, ExternalLink,
  HelpCircle, Eye, ArrowLeft
} from 'lucide-react';
import { Lesson, QuizQuestion } from '../types/svt';
import { SimpleMarkdown } from './SimpleMarkdown';

interface LessonModalProps {
  lesson: Lesson | null;
  onClose: () => void;
  onCompleteLesson: (lessonId: string) => void;
  isCompleted: boolean;
  onOpenLab: (experimentId: string) => void;
  onOpenQuiz: (quizId: string) => void;
  language: 'fr' | 'ar';
}

export const LessonModal: React.FC<LessonModalProps> = ({
  lesson,
  onClose,
  onCompleteLesson,
  isCompleted,
  onOpenLab,
  onOpenQuiz,
  language
}) => {
  const [lessonLang, setLessonLang] = useState<'fr' | 'ar'>(language);
  const isAr = lessonLang === 'ar';
  const [selectedDiagramLabel, setSelectedDiagramLabel] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Self-evaluation exercises answers state
  const [exerciseAnswers, setExerciseAnswers] = useState<Record<string, number>>({});
  const [showCorrections, setShowCorrections] = useState<Record<string, boolean>>({});

  // Hooks must all run before this early return (Rules of Hooks)
  if (!lesson) return null;

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs shrink-0">
              {lesson.gradeLevel} • S{lesson.semester || 1}
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white truncate">
                {isAr ? (lesson.titleAr || lesson.title) : lesson.title}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {isAr ? lesson.themeTitleAr : lesson.themeTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bilingual toggle inside reader */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setLessonLang('fr')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  lessonLang === 'fr' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Français
              </button>
              <button
                onClick={() => setLessonLang('ar')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  lessonLang === 'ar' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                العربية
              </button>
            </div>

            {/* PDF Print / Export Button */}
            <button
              onClick={handlePrintPdf}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              title={isAr ? 'طباعة / حفظ الدرس بصيغة PDF' : 'Imprimer / Sauvegarder en PDF'}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{isAr ? 'PDF' : 'PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1" dir={isAr ? 'rtl' : 'ltr'}>
          {/* Summary Callout */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-800/60 to-slate-800/40 border border-emerald-500/30 rounded-2xl p-4 sm:p-5">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              {isAr ? 'الملخص العلمي للدرس' : 'Résumé Synthétique du Cours'}
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed">
              {isAr ? (lesson.summaryAr || lesson.summary) : lesson.summary}
            </p>
          </div>

          {/* Objectives */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isAr ? 'الأهداف التعلمية المحددة' : 'Objectifs pédagogiques visés'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {lesson.objectives.map((obj, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="text-xs text-slate-300">
                    {isAr ? (lesson.objectivesAr[idx] || obj) : obj}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Structured Content Sections */}
          <div className="space-y-6">
            {lesson.contentSections.map((sec, idx) => (
              <div key={idx} className="space-y-3 bg-slate-800/30 p-5 rounded-2xl border border-slate-800">
                <h3 className="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-2">
                  {isAr ? sec.headingAr : sec.heading}
                </h3>

                <SimpleMarkdown
                  text={(isAr ? sec.bodyMarkdownAr : sec.bodyMarkdown) || ''}
                  className="text-sm text-slate-300 leading-relaxed"
                />

                {(sec.keyTakeaway || sec.keyTakeawayAr) && (
                  <div className="bg-emerald-500/10 border-l-4 rtl:border-l-0 rtl:border-r-4 border-emerald-500 p-3 rounded-r-xl rtl:rounded-r-none rtl:rounded-l-xl text-xs text-emerald-300 font-medium">
                    <span className="font-bold">{isAr ? '💡 خلاصة أساسية: ' : '💡 Point clé à retenir : '}</span>
                    {isAr ? sec.keyTakeawayAr : sec.keyTakeaway}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Interactive Scientific Diagrams */}
          {lesson.diagrams && lesson.diagrams.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'الرسوم التخطيطية التفاعلية' : 'Schémas Scientifiques Interactifs'}
              </h3>
              {lesson.diagrams.map(diag => (
                <div key={diag.id} className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">
                      {isAr ? diag.titleAr : diag.title}
                    </h4>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      {isAr ? 'انقر على العناصر لاستكشافها' : 'Cliquez sur les repères'}
                    </span>
                  </div>

                  {/* Interactive SVG Diagram Box */}
                  <div className="relative w-full h-56 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center p-4">
                    {/* SVG Graphic representation */}
                    <svg viewBox="0 0 100 100" className="w-full h-full max-h-52">
                      <defs>
                        <linearGradient id="cellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#059669" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>

                      {diag.type === 'cell' && (
                        <g>
                          <rect x="15" y="15" width="70" height="70" rx="12" fill="url(#cellGrad)" stroke="#10b981" strokeWidth="1.5" />
                          <ellipse cx="50" cy="50" rx="12" ry="12" fill="#047857" stroke="#34d399" strokeWidth="1" />
                          <circle cx="50" cy="50" r="4" fill="#a7f3d0" />
                        </g>
                      )}

                      {diag.type === 'respiration' && (
                        <g>
                          <path d="M 20 50 Q 50 20 80 50 Q 50 80 20 50" fill="none" stroke="#06b6d4" strokeWidth="2" />
                          <circle cx="35" cy="45" r="5" fill="#0891b2" />
                          <circle cx="65" cy="55" r="5" fill="#0891b2" />
                        </g>
                      )}

                      {diag.type === 'plate_tectonics' && (
                        <g>
                          <path d="M 10 65 L 45 65 L 48 75 L 55 65 L 90 65" stroke="#f59e0b" strokeWidth="2" fill="none" />
                          <polygon points="45,65 50,45 55,65" fill="#d97706" />
                        </g>
                      )}

                      {diag.type === 'digestion' && (
                        <g>
                          <path d="M 50 15 C 30 30 30 70 50 85 C 70 70 70 30 50 15 Z" fill="#b45309" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1.5" />
                          <line x1="50" y1="20" x2="50" y2="80" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="2,2" />
                        </g>
                      )}

                      {/* Interactive Pin Labels */}
                      {diag.labels.map((lbl, idx) => (
                        <g
                          key={idx}
                          className="cursor-pointer transition-transform hover:scale-125"
                          onClick={() => setSelectedDiagramLabel(isAr ? lbl.textAr : lbl.text)}
                        >
                          <circle cx={lbl.x} cy={lbl.y} r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                          <text x={lbl.x + 4} y={lbl.y + 2} fill="#e2e8f0" fontSize="3.5" fontWeight="bold">
                            {isAr ? lbl.textAr : lbl.text}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>

                  {selectedDiagramLabel && (
                    <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-semibold flex items-center justify-between">
                      <span>✓ {selectedDiagramLabel}</span>
                      <button onClick={() => setSelectedDiagramLabel(null)} className="text-slate-400 hover:text-white">✕</button>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 italic">
                    {isAr ? diag.captionAr : diag.caption}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Definitions */}
          {lesson.definitions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'المعجم والمفاهيم العلمية للدرس' : 'Lexique & Définitions Clés'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lesson.definitions.map((def, idx) => (
                  <div key={idx} className="bg-slate-800/60 border border-slate-700/70 p-4 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-emerald-400">
                        {isAr ? def.termAr : def.term}
                      </span>
                      <span className="text-xs text-slate-400">
                        {isAr ? def.term : def.termAr}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isAr ? def.definitionAr : def.definition}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Media (PDF, Images, Videos) */}
          {lesson.mediaAttachments && lesson.mediaAttachments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'الموارد والوثائق الملحقة' : 'Documents & Ressources Attachés'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lesson.mediaAttachments.map((med, idx) => (
                  <div key={idx} className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-xl flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase">
                        {med.type}
                      </span>
                      <h4 className="text-xs font-bold text-white truncate">
                        {isAr ? (med.titleAr || med.title) : med.title}
                      </h4>
                      {med.description && (
                        <p className="text-[11px] text-slate-400 truncate">{med.description}</p>
                      )}
                    </div>
                    <a
                      href={med.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold shrink-0 inline-flex items-center gap-1"
                    >
                      <span>{isAr ? 'فتح' : 'Ouvrir'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Embedded Exercises */}
          {lesson.embeddedExercises && lesson.embeddedExercises.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                {isAr ? 'تمارين تقويمية فورية' : 'Auto-Évaluation Express'}
              </h3>
              <div className="space-y-3">
                {lesson.embeddedExercises.map((q, qIdx) => {
                  const selected = exerciseAnswers[q.id];
                  const isChecked = showCorrections[q.id];
                  const isCorrect = selected === Number(q.correctAnswer);

                  return (
                    <div key={q.id || qIdx} className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-white">
                        {isAr ? q.promptAr : q.prompt}
                      </p>

                      <div className="space-y-1.5">
                        {q.options?.map((opt, optIdx) => {
                          const isOptionCorrect = optIdx === Number(q.correctAnswer);
                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                setExerciseAnswers({ ...exerciseAnswers, [q.id]: optIdx });
                                setShowCorrections({ ...showCorrections, [q.id]: true });
                              }}
                              className={`w-full text-left rtl:text-right px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                                isChecked && isOptionCorrect
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                  : isChecked && selected === optIdx && !isOptionCorrect
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                                  : selected === optIdx
                                  ? 'bg-slate-700 text-white border-slate-500'
                                  : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                              }`}
                            >
                              {isAr ? (q.optionsAr?.[optIdx] || opt) : opt}
                            </button>
                          );
                        })}
                      </div>

                      {isChecked && (
                        <div className={`p-2.5 rounded-lg text-xs ${isCorrect ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                          <p className="font-bold">{isCorrect ? (isAr ? '✓ إجابة صحيحة!' : '✓ Bonne réponse !') : (isAr ? '✗ إجابة غير دقيقة' : '✗ Pas tout à fait...')}</p>
                          <p className="text-[11px] mt-0.5">{isAr ? q.explanationAr : q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {lesson.linkedExperimentId && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLab(lesson.linkedExperimentId!);
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <FlaskConical className="w-4 h-4" />
                {isAr ? 'التجربة في المختبر' : 'Expérience Labo'}
              </button>
            )}

            {lesson.linkedQuizId && (
              <button
                onClick={() => {
                  onClose();
                  onOpenQuiz(lesson.linkedQuizId!);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <Award className="w-4 h-4" />
                {isAr ? 'بدء الاختبار' : 'Passer le Quiz'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onCompleteLesson(lesson.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all ${
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-[1.02]'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              {isCompleted ? (isAr ? 'تم التحصيل (+50 XP)' : 'Cours validé (+50 XP)') : (isAr ? 'تأكيد إتمام الدرس' : 'Valider la leçon')}
            </button>
          </div>
        </div>

        {/* High-Resolution Image Lightbox Overlay */}
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <img src={lightboxImage} alt="Agrandissement" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
          </div>
        )}
      </div>
    </div>
  );
};
