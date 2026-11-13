import React, { useState } from 'react';
import {
  Plus, Edit3, Trash2, Copy, Eye, CheckCircle, FileText,
  Search, Filter, Save, X, BookOpen, AlertCircle, ArrowLeft,
  Sparkles, Layers, ListPlus, ShieldCheck, Download, Upload,
  Image, Video, FileDown, CheckSquare, HelpCircle, EyeOff,
  FolderTree, Calendar, Lock, Unlock, Database, Loader2,
  AlertTriangle, FileUp, Presentation
} from 'lucide-react';
import { Lesson, GradeLevel, Definition, ScientificDiagram, MediaAttachment, QuizQuestion } from '../types/svt';

interface AdminCmsProps {
  lessons: Lesson[];
  onSaveLesson: (lesson: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onDuplicateLesson: (lesson: Lesson) => void;
  onPreviewLesson: (lesson: Lesson) => void;
  language: 'fr' | 'ar';
}

export const AdminCms: React.FC<AdminCmsProps> = ({
  lessons,
  onSaveLesson,
  onDeleteLesson,
  onDuplicateLesson,
  onPreviewLesson,
  language
}) => {
  const isAr = language === 'ar';
  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [selectedSemester, setSelectedSemester] = useState<'all' | '1' | '2'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'sections' | 'definitions' | 'media' | 'exercises'>('info');

  const emptyLesson: Lesson = {
    id: `lesson_${Date.now()}`,
    gradeLevel: '3AC',
    semester: 1,
    themeId: 'theme_custom',
    themeTitle: 'Unité 1 : Sciences de la Vie et de la Terre',
    themeTitleAr: 'الوحدة 1: علوم الحياة والأرض',
    chapterTitle: 'Chapitre 1 : Nouveau Chapitre d\'apprentissage',
    chapterTitleAr: 'الفصل 1: فصل دراسي جديد',
    title: '',
    titleAr: '',
    summary: '',
    summaryAr: '',
    objectives: ['Comprendre les concepts scientifiques clés.', 'Développer la démarche expérimentale.'],
    objectivesAr: ['فهم المفاهيم العلمية الأساسية.', 'تطوير النهج التجريبي العلمي.'],
    contentSections: [
      {
        heading: '1. Introduction et Problématique Scientifique',
        headingAr: '1. تمهيد وإشكالية علمية',
        bodyMarkdown: 'Décrivez ici l\'observation de départ, le contexte environnemental ou biologique, et la question scientifique à laquelle répond ce cours.',
        bodyMarkdownAr: 'اكتب هنا الملاحظة العلمية والانطلاق من المحيط البيئي أو البيولوجي لطرح الإشكالية.',
        keyTakeaway: 'Idée maîtresse à retenir par l\'élève.',
        keyTakeawayAr: 'الفكرة الأساسية التي ينبغي على التلميذ تذكرها.'
      }
    ],
    definitions: [
      {
        term: 'Terme clé',
        termAr: 'مصطلح رئيسي',
        definition: 'Définition officielle et précise du terme selon le manuel scolaire marocain.',
        definitionAr: 'التعريف الرسمي والدقيق للمصطلح وفق المقرر الدراسي المغربي.'
      }
    ],
    diagrams: [],
    mediaAttachments: [
      {
        id: 'med_1',
        type: 'image',
        title: 'Schéma d\'observation scientifique',
        titleAr: 'رسم تخطيطي للملاحظة العلمية',
        url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
        description: 'Observation des structures cellulaires au microscope optique.'
      }
    ],
    embeddedExercises: [
      {
        id: `q_${Date.now()}_1`,
        type: 'qcm',
        prompt: 'Question d\'évaluation formative sur la leçon :',
        promptAr: 'سؤال تقويم تكويني على الدرس:',
        options: ['Proposition A', 'Proposition B (Correcte)', 'Proposition C'],
        optionsAr: ['الاقتراح أ', 'الاقتراح ب (صحيح)', 'الاقتراح ج'],
        correctAnswer: 1,
        explanation: 'Explication pédagogique de la réponse.',
        explanationAr: 'التعليل البيداغوجي للإجابة الصحيحة.',
        points: 5
      }
    ],
    status: 'published',
    isPremium: false,
    estimatedMinutes: 25
  };

  const [formData, setFormData] = useState<Lesson>(emptyLesson);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Smart PDF Import State
  const [isPdfImportModalOpen, setIsPdfImportModalOpen] = useState(false);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [pdfAnalysisNotice, setPdfAnalysisNotice] = useState<string | null>(null);
  const [pdfScannedWarning, setPdfScannedWarning] = useState(false);
  const [pdfImportProgress, setPdfImportProgress] = useState(0);

  // Filter lessons
  const filteredLessons = lessons.filter(lesson => {
    if (selectedGrade !== 'all' && lesson.gradeLevel !== selectedGrade) return false;
    if (selectedSemester !== 'all' && String(lesson.semester) !== selectedSemester) return false;
    if (statusFilter !== 'all' && lesson.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        lesson.title.toLowerCase().includes(q) ||
        lesson.titleAr.includes(q) ||
        lesson.chapterTitle.toLowerCase().includes(q) ||
        lesson.themeTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenCreate = () => {
    setFormData({
      ...emptyLesson,
      id: `lesson_${Date.now()}`,
      gradeLevel: selectedGrade === 'all' ? '3AC' : selectedGrade,
      semester: selectedSemester === 'all' ? 1 : Number(selectedSemester) as 1 | 2
    });
    setIsEditingExisting(false);
    setPdfAnalysisNotice(null);
    setPdfScannedWarning(false);
    setActiveTab('info');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (lesson: Lesson) => {
    setFormData(JSON.parse(JSON.stringify(lesson)));
    setIsEditingExisting(true);
    setPdfAnalysisNotice(null);
    setPdfScannedWarning(false);
    setActiveTab('info');
    setIsEditorOpen(true);
  };

  const handleSave = (forcedStatus?: 'published' | 'draft' | 'archived') => {
    if (isAnalyzingPdf) {
      alert(
        isAr
          ? 'جاري تحليل الوثيقة حالياً، يرجى الانتظار لحظة...'
          : 'Analyse du document en cours, veuillez patienter un instant avant d\'enregistrer.'
      );
      return;
    }

    if (!formData.title.trim()) {
      alert(
        isAr
          ? 'يرجى إدخال عنوان الدرس باللغة الفرنسية (مطلوب قبل الحفظ)'
          : 'Veuillez saisir au moins le titre du cours en français (requis avant enregistrement).'
      );
      setActiveTab('info');
      return;
    }

    const finalStatus = forcedStatus || formData.status || 'published';
    const lessonToSave: Lesson = {
      ...formData,
      status: finalStatus
    };

    onSaveLesson(lessonToSave);

    const isDraft = finalStatus === 'draft';
    setSaveNotification(
      isAr
        ? isDraft
          ? 'تم حفظ الدرس كمسودة بنجاح (غير مرئي للتلاميذ حتى يتم نشره)!'
          : 'تم حفظ ونشر الدرس بنجاح في قاعدة البيانات وفي فضاء التلاميذ!'
        : isDraft
          ? 'Cours enregistré en tant que brouillon (non visible aux élèves tant qu\'il n\'est pas publié).'
          : 'Cours enregistré avec succès et synchronisé en temps réel dans l\'espace élèves !'
    );
    setTimeout(() => {
      setSaveNotification(null);
      setIsEditorOpen(false);
      setPdfAnalysisNotice(null);
      setPdfScannedWarning(false);
    }, 1300);
  };

  // Smart PDF & PowerPoint (PPT / PPTX) Course Import
  const handleSmartPdfImport = async (file: File) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const isPdfFile = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
    const isPptFile =
      lowerName.endsWith('.ppt') ||
      lowerName.endsWith('.pptx') ||
      file.type === 'application/vnd.ms-powerpoint' ||
      file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    if (!isPdfFile && !isPptFile) {
      alert(
        isAr
          ? 'يرجى اختيار ملف بصيغة PDF أو PowerPoint (.ppt / .pptx) فقط'
          : 'Veuillez sélectionner un fichier au format PDF ou PowerPoint (.ppt, .pptx) uniquement.'
      );
      return;
    }

    if (file.size > 40 * 1024 * 1024) {
      alert(isAr ? 'حجم الملف كبير جداً (الحد الأقصى 40 ميغابايت)' : 'Le fichier dépasse la taille maximale autorisée (40 Mo).');
      return;
    }

    setIsAnalyzingPdf(true);
    setPdfImportProgress(25);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setPdfImportProgress(55);

      const response = await fetch('/api/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64Data,
          filename: file.name
        })
      });

      setPdfImportProgress(85);

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`);
      }

      const result = await response.json();
      setPdfImportProgress(100);

      const detectedType: 'pdf' | 'ppt' = result.fileType === 'ppt' || isPptFile ? 'ppt' : 'pdf';
      const slideOrPageCount = result.slideCount || result.pageCount || 1;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);

      const docAttachment: MediaAttachment = {
        id: `med_${detectedType}_${Date.now()}`,
        type: detectedType,
        title: file.name.replace(/\.[^/.]+$/, ''),
        titleAr: file.name.replace(/\.[^/.]+$/, ''),
        url: base64Data,
        description:
          detectedType === 'ppt'
            ? `Présentation PowerPoint (${lowerName.endsWith('.pptx') ? 'PPTX' : 'PPT'} • ${slideOrPageCount} diapositives • ${sizeMb} Mo)`
            : `Document PDF officiel (${slideOrPageCount} pages • ${sizeMb} Mo)`
      };

      const extracted = result.extracted || {};
      const proposedTitle = (extracted.title || '').trim();
      const proposedTitleAr = (extracted.titleAr || proposedTitle).trim();
      const isScanned = Boolean(result.isScanned || !result.hasText);
      const needsManualTitle = !proposedTitle;

      setPdfScannedWarning(isScanned || needsManualTitle);

      const newLessonData: Lesson = {
        ...emptyLesson,
        id: `lesson_${Date.now()}`,
        gradeLevel: (extracted.gradeLevel as GradeLevel) || '3AC',
        semester: (extracted.semester as (1 | 2)) || 1,
        themeTitle: extracted.themeTitle || emptyLesson.themeTitle,
        themeTitleAr: extracted.themeTitleAr || emptyLesson.themeTitleAr,
        chapterTitle: extracted.chapterTitle || emptyLesson.chapterTitle,
        chapterTitleAr: extracted.chapterTitleAr || emptyLesson.chapterTitleAr,
        title: proposedTitle,
        titleAr: proposedTitleAr,
        summary:
          extracted.summary ||
          (needsManualTitle
            ? ''
            : detectedType === 'ppt'
            ? 'Synthèse pédagogique de la présentation PowerPoint importée.'
            : 'Synthèse pédagogique du document PDF importé.'),
        summaryAr: extracted.summaryAr || (needsManualTitle ? '' : 'خلاصة بيداغوجية للوثيقة المستوردة.'),
        objectives: Array.isArray(extracted.objectives) && extracted.objectives.length > 0 ? extracted.objectives : emptyLesson.objectives,
        objectivesAr: Array.isArray(extracted.objectivesAr) && extracted.objectivesAr.length > 0 ? extracted.objectivesAr : emptyLesson.objectivesAr,
        mediaAttachments: [docAttachment],
        status: 'draft', // CRITICAL: ALWAYS draft so admin validates first before publishing!
        isPremium: false,
        estimatedMinutes: 30
      };

      setFormData(newLessonData);
      setIsEditingExisting(false);

      const docTypeLabel = detectedType === 'ppt' ? 'PowerPoint' : 'PDF';

      if (needsManualTitle) {
        setPdfAnalysisNotice(
          isAr
            ? `⚠️ تم استيراد ملف ${docTypeLabel} ولكن بدون نص أو عنوان قابل للاستخراج. تم إرفاق الملف الأصلي للتنزيل. يرجى إدخال عنوان الدرس يدوياً أدناه قبل الحفظ.`
            : `⚠️ Document ${docTypeLabel} sans texte ni titre identifiable : le fichier original est attaché pour le téléchargement. Veuillez saisir manuellement le titre du cours en français ci-dessous.`
        );
      } else if (isScanned) {
        setPdfAnalysisNotice(
          isAr
            ? `⚠️ ملف ${docTypeLabel} بدون نص رقمي، لكن تم اقتراح العنوان التالي تلقائياً: "${proposedTitle}" (${extracted.gradeLevel}، الدورة ${extracted.semester}). يرجى المراجعة والتعديل قبل النشر.`
            : `⚠️ Document ${docTypeLabel} sans texte extrait, mais le titre "${proposedTitle}" a été proposé (${extracted.gradeLevel}, Semestre ${extracted.semester}). Vérifiez et validez avant publication.`
        );
      } else {
        setPdfAnalysisNotice(
          isAr
            ? `✓ تم استيراد وتحليل عرض/ملف ${docTypeLabel} بنجاح: "${proposedTitle}" (المستوى: ${extracted.gradeLevel}، الدورة: ${extracted.semester}). تم إعداده كمسودة للمراجعة قبل النشر.`
            : `✓ Extraction intelligente ${docTypeLabel} réussie : Titre "${proposedTitle}" détecté (${extracted.gradeLevel}, Semestre ${extracted.semester}). Le cours est ouvert en mode brouillon pour validation avant publication.`
        );
      }

      setIsPdfImportModalOpen(false);
      setActiveTab('info');
      setIsEditorOpen(true);
    } catch (err: any) {
      console.error('Erreur import document:', err);
      alert(isAr ? 'حدث خطأ أثناء معالجة الملف. يرجى التأكد من سلامة الملف.' : `Échec de l'analyse automatique du document : ${err.message || 'Erreur'}.`);
    } finally {
      setIsAnalyzingPdf(false);
      setPdfImportProgress(0);
    }
  };

  // Add / Remove Handlers for Dynamic Arrays
  const handleAddObjective = () => {
    setFormData({
      ...formData,
      objectives: [...formData.objectives, 'Nouvel objectif'],
      objectivesAr: [...formData.objectivesAr, 'هدف جديد']
    });
  };

  const handleRemoveObjective = (idx: number) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter((_, i) => i !== idx),
      objectivesAr: formData.objectivesAr.filter((_, i) => i !== idx)
    });
  };

  const handleAddSection = () => {
    setFormData({
      ...formData,
      contentSections: [
        ...formData.contentSections,
        {
          heading: `${formData.contentSections.length + 1}. Nouvelle partie`,
          headingAr: `${formData.contentSections.length + 1}. فقرة جديدة`,
          bodyMarkdown: 'Contenu scientifique...',
          bodyMarkdownAr: 'المحتوى العلمي...',
          keyTakeaway: 'À retenir...',
          keyTakeawayAr: 'خلاصة...'
        }
      ]
    });
  };

  const handleRemoveSection = (idx: number) => {
    setFormData({
      ...formData,
      contentSections: formData.contentSections.filter((_, i) => i !== idx)
    });
  };

  const handleAddDefinition = () => {
    setFormData({
      ...formData,
      definitions: [
        ...formData.definitions,
        {
          term: 'Nouveau terme',
          termAr: 'مصطلح جديد',
          definition: 'Définition...',
          definitionAr: 'التعريف...'
        }
      ]
    });
  };

  const handleRemoveDefinition = (idx: number) => {
    setFormData({
      ...formData,
      definitions: formData.definitions.filter((_, i) => i !== idx)
    });
  };

  const handleAddMedia = (type: 'image' | 'pdf' | 'ppt' | 'video') => {
    const newMedia: MediaAttachment = {
      id: `med_${Date.now()}`,
      type,
      title:
        type === 'pdf'
          ? 'Document / Fiche PDF'
          : type === 'ppt'
          ? 'Présentation PowerPoint'
          : type === 'video'
          ? 'Vidéo Explicative'
          : 'Image / Schéma',
      titleAr:
        type === 'pdf'
          ? 'وثيقة PDF علمية'
          : type === 'ppt'
          ? 'عرض تقديمي PowerPoint'
          : type === 'video'
          ? 'فيديو توضيحي'
          : 'صورة أو رسم بياني',
      url:
        type === 'video'
          ? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          : 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80',
      description: 'Description du document attaché...'
    };
    setFormData({
      ...formData,
      mediaAttachments: [...(formData.mediaAttachments || []), newMedia]
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'pdf' | 'ppt') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const newMedia: MediaAttachment = {
        id: `med_${Date.now()}`,
        type,
        title: file.name.replace(/\.[^/.]+$/, ""),
        titleAr: file.name.replace(/\.[^/.]+$/, ""),
        url: result,
        description: `${file.name} (${(file.size / 1024).toFixed(1)} Ko)`
      };
      setFormData(prev => ({
        ...prev,
        mediaAttachments: [...(prev.mediaAttachments || []), newMedia]
      }));

      // If PDF or PowerPoint (PPT/PPTX), trigger smart extraction to auto-fill title/metadata if not yet entered
      if (type === 'pdf' || type === 'ppt') {
        const docLabel = type === 'ppt' ? 'PowerPoint' : 'PDF';
        setIsAnalyzingPdf(true);
        try {
          const res = await fetch('/api/parse-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: result, filename: file.name })
          });
          if (res.ok) {
            const data = await res.json();
            const extractedTitle = (data.extracted?.title || '').trim();
            const isScanned = Boolean(data.isScanned || !data.hasText);

            if (extractedTitle) {
              setFormData(prev => ({
                ...prev,
                title: prev.title.trim() ? prev.title : extractedTitle,
                titleAr: prev.titleAr.trim() ? prev.titleAr : (data.extracted.titleAr || extractedTitle),
                gradeLevel: prev.gradeLevel || data.extracted.gradeLevel || '3AC',
                semester: prev.semester || data.extracted.semester || 1,
                themeTitle: prev.themeTitle === emptyLesson.themeTitle && data.extracted.themeTitle ? data.extracted.themeTitle : prev.themeTitle,
                themeTitleAr: prev.themeTitleAr === emptyLesson.themeTitleAr && data.extracted.themeTitleAr ? data.extracted.themeTitleAr : prev.themeTitleAr,
                chapterTitle: prev.chapterTitle === emptyLesson.chapterTitle && data.extracted.chapterTitle ? data.extracted.chapterTitle : prev.chapterTitle,
                chapterTitleAr: prev.chapterTitleAr === emptyLesson.chapterTitleAr && data.extracted.chapterTitleAr ? data.extracted.chapterTitleAr : prev.chapterTitleAr,
                summary: prev.summary.trim() ? prev.summary : (data.extracted.summary || prev.summary),
                summaryAr: prev.summaryAr.trim() ? prev.summaryAr : (data.extracted.summaryAr || prev.summaryAr)
              }));
              setPdfScannedWarning(isScanned);
              setPdfAnalysisNotice(
                isAr
                  ? `✓ تم تحديد عنوان الدرس تلقائياً من ملف ${docLabel}: "${extractedTitle}"`
                  : `✓ Titre détecté automatiquement depuis le document ${docLabel} : "${extractedTitle}"`
              );
            } else {
              setPdfScannedWarning(true);
              setPdfAnalysisNotice(
                isAr
                  ? `⚠️ ملف ${docLabel} بدون عنوان قابل للاستخراج. يرجى إدخال عنوان الدرس في علامة التبويب 1.`
                  : `⚠️ Document ${docLabel} sans titre détectable : veuillez saisir le titre du cours dans l'onglet 1 (Infos).`
              );
            }
          }
        } catch (err) {
          console.warn('Auto-extract title silent fallback:', err);
        } finally {
          setIsAnalyzingPdf(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = (idx: number) => {
    setFormData({
      ...formData,
      mediaAttachments: (formData.mediaAttachments || []).filter((_, i) => i !== idx)
    });
  };

  const handleAddExercise = () => {
    const newQ: QuizQuestion = {
      id: `q_${Date.now()}`,
      type: 'qcm',
      prompt: 'Nouvelle question d\'auto-évaluation :',
      promptAr: 'سؤال تقويمي جديد:',
      options: ['Option 1', 'Option 2 (Correcte)', 'Option 3'],
      optionsAr: ['الخيار 1', 'الخيار 2 (الصحيح)', 'الخيار 3'],
      correctAnswer: 1,
      explanation: 'Explication détaillée de la réponse.',
      explanationAr: 'شرح مفصل للإجابة الصحيحة.',
      points: 5
    };
    setFormData({
      ...formData,
      embeddedExercises: [...(formData.embeddedExercises || []), newQ]
    });
  };

  const handleRemoveExercise = (idx: number) => {
    setFormData({
      ...formData,
      embeddedExercises: (formData.embeddedExercises || []).filter((_, i) => i !== idx)
    });
  };

  return (
    <div className="space-y-6">
      {/* Admin Hero Bar */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {isAr ? 'فضاء المشرف الكامل (CMS بدون برمجة)' : 'CMS Administrateur Autonome (Zero-Code)'}
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {isAr ? 'إدارة وتأليف مقررات SVT Collège Maroc' : 'Gestion & Édition des Cours SVT Collège'}
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {isAr
                ? 'أضف مئات الدروس والتمارين لجميع المستويات (1AC, 2AC, 3AC) مقسمة بالدورات والوحدات، مع الصور وملفات PDF و PowerPoint والفيديوهات والتقويمات، وحفظها فورياً للعموم.'
                : 'Créez, modifiez, classez par semestre et unité, attachez des PDF, présentations PowerPoint (PPT/PPTX), vidéos, schémas et exercices corrigés avec synchronisation immédiate pour les élèves.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsPdfImportModalOpen(true)}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileUp className="w-5 h-5" />
              {isAr ? '📥 استيراد ذكي (PDF / PPT)' : '📥 Importer Cours PDF / PPT'}
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              {isAr ? 'إضافة درس جديد' : 'Nouveau Cours'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Organization Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? 'بحث في الدروس، الفصول، والوحدات...' : 'Recherche cours, thèmes, chapitres...'}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">{isAr ? 'جميع المستويات' : 'Tous niveaux (1AC, 2AC, 3AC)'}</option>
            <option value="1AC">1AC (1ère Année)</option>
            <option value="2AC">2AC (2ème Année)</option>
            <option value="3AC">3AC (3ème Année)</option>
          </select>
        </div>

        <div>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">{isAr ? 'الدورتان 1 و 2' : 'Semestres 1 & 2'}</option>
            <option value="1">{isAr ? 'الدورة الأولى (Semestre 1)' : 'Semestre 1'}</option>
            <option value="2">{isAr ? 'الدورة الثانية (Semestre 2)' : 'Semestre 2'}</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">{isAr ? 'جميع الحالات' : 'Tous statuts'}</option>
            <option value="published">{isAr ? 'منشور (Publié)' : 'Publiés'}</option>
            <option value="draft">{isAr ? 'مسودة (Brouillon)' : 'Brouillons'}</option>
            <option value="archived">{isAr ? 'مؤرشف (Archivé)' : 'Archivés'}</option>
          </select>
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-3">
        {filteredLessons.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700">
            <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">
              {isAr ? 'لا توجد دروس مطابقة لمعايير البحث' : 'Aucun cours trouvé avec ces critères.'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-3 px-4 py-2 bg-emerald-500 text-slate-950 font-semibold text-xs rounded-lg inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {isAr ? 'إنشاء درس الآن' : 'Créer un premier cours'}
            </button>
          </div>
        ) : (
          filteredLessons.map(lesson => (
            <div
              key={lesson.id}
              className="bg-slate-800/90 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                    {lesson.gradeLevel}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-medium">
                    {isAr ? `الدورة ${lesson.semester || 1}` : `Semestre ${lesson.semester || 1}`}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    lesson.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    lesson.status === 'draft' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {lesson.status === 'published' ? (isAr ? '✓ منشور للعموم' : '✓ Publié') :
                     lesson.status === 'draft' ? (isAr ? '📝 مسودة' : '📝 Brouillon') :
                     (isAr ? '📦 مؤرشف' : '📦 Archivé')}
                  </span>
                  <span className="text-xs text-slate-400 truncate max-w-[280px]">
                    {isAr ? lesson.themeTitleAr : lesson.themeTitle}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white hover:text-emerald-400 transition-colors">
                  {isAr ? (lesson.titleAr || lesson.title) : lesson.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-1">
                  {isAr ? (lesson.summaryAr || lesson.summary) : lesson.summary}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span>⏱ {lesson.estimatedMinutes} min</span>
                  <span>📑 {lesson.contentSections.length} sections</span>
                  <span>📖 {lesson.definitions.length} définitions</span>
                  {lesson.mediaAttachments && lesson.mediaAttachments.length > 0 && (
                    <span className="text-cyan-400 font-medium">📎 {lesson.mediaAttachments.length} pièces jointes</span>
                  )}
                  {lesson.embeddedExercises && lesson.embeddedExercises.length > 0 && (
                    <span className="text-amber-400 font-medium">🎯 {lesson.embeddedExercises.length} questions corrigées</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  onClick={() => onPreviewLesson(lesson)}
                  className="p-2.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Prévisualiser comme un élève"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenEdit(lesson)}
                  className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isAr ? 'تعديل' : 'Modifier'}
                </button>
                <button
                  onClick={() => onDuplicateLesson(lesson)}
                  className="p-2.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Dupliquer ce cours"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(isAr ? 'هل تريد حذف هذا الدرس نهائياً؟' : 'Confirmer la suppression définitive de ce cours ?')) {
                      onDeleteLesson(lesson.id);
                    }
                  }}
                  className="p-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ==================== COMPLETE CMS MODAL EDITOR ==================== */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isEditingExisting ? (isAr ? 'تعديل الدرس في المنظومة' : 'Modifier le Cours SVT') : (isAr ? 'إنشاء درس SVT جديد' : 'Créer un Nouveau Cours SVT')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'تحرير متكامل: مستويات 1AC/2AC/3AC، دورات، وسائط، ملفات PDF، وتمارين مصححة' : 'Formulaire autonome : niveaux, semestres, médias, documents PDF et exercices corrigés'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification alert if saved */}
            {saveNotification && (
              <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 px-6 py-2.5 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                {saveNotification}
              </div>
            )}

            {/* Smart PDF Import Analysis Notification */}
            {pdfAnalysisNotice && (
              <div
                className={`border-b px-6 py-3 text-xs font-semibold flex items-start sm:items-center justify-between gap-3 ${
                  pdfScannedWarning
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {pdfScannedWarning ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
                  )}
                  <span>{pdfAnalysisNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPdfAnalysisNotice(null)}
                  className="p-1 hover:bg-slate-800/60 rounded text-slate-400 hover:text-white shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Editor Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto shrink-0">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'info'
                    ? 'border-emerald-500 text-emerald-400 bg-slate-800/80'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                1. {isAr ? 'البيانات والتنظيم' : 'Infos & Organisation'}
              </button>
              <button
                onClick={() => setActiveTab('sections')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'sections'
                    ? 'border-emerald-500 text-emerald-400 bg-slate-800/80'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                2. {isAr ? 'نصوص وفقرات الدرس' : 'Contenu & Paragraphes'} ({formData.contentSections.length})
              </button>
              <button
                onClick={() => setActiveTab('definitions')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'definitions'
                    ? 'border-emerald-500 text-emerald-400 bg-slate-800/80'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                3. {isAr ? 'المفاهيم العلمية' : 'Définitions'} ({formData.definitions.length})
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'media'
                    ? 'border-emerald-500 text-emerald-400 bg-slate-800/80'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                4. {isAr ? 'الصور، PDF، PowerPoint والفيديو' : 'Médias, PDF, PPT & Vidéos'} ({formData.mediaAttachments?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('exercises')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'exercises'
                    ? 'border-emerald-500 text-emerald-400 bg-slate-800/80'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                5. {isAr ? 'التمارين والـ QCM مع التصحيح' : 'Exercices & QCM'} ({formData.embeddedExercises?.length || 0})
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* TAB 1 : INFO & ORGANISATION */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isAr ? 'المستوى الدراسي *' : 'Niveau Scolaire *'}
                      </label>
                      <select
                        value={formData.gradeLevel}
                        onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value as GradeLevel })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="1AC">1AC (1ère Année Collège)</option>
                        <option value="2AC">2AC (2ème Année Collège)</option>
                        <option value="3AC">3AC (3ème Année Collège)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isAr ? 'الدورة / السداسي *' : 'Semestre *'}
                      </label>
                      <select
                        value={formData.semester}
                        onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) as 1 | 2 })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value={1}>{isAr ? 'الدورة الأولى (Semestre 1)' : 'Semestre 1'}</option>
                        <option value={2}>{isAr ? 'الدورة الثانية (Semestre 2)' : 'Semestre 2'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isAr ? 'حالة النشر *' : 'Statut de Publication *'}
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="published">{isAr ? '✓ منشور (مرئي للجميع)' : '✓ Publié (Visible aux élèves)'}</option>
                        <option value="draft">{isAr ? '📝 مسودة (خاص بالمشرف)' : '📝 Brouillon (Non visible)'}</option>
                        <option value="archived">{isAr ? '📦 مؤرشف (مخفي)' : '📦 Archivé / Masqué'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {isAr ? 'المدة التقديرية (بالدقائق)' : 'Durée estimée (min)'}
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={formData.estimatedMinutes}
                        onChange={(e) => setFormData({ ...formData, estimatedMinutes: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Bilingual Titles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Titre du cours (Français) *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex : La respiration dans différents milieux..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        عنوان الدرس (بالعربية) *
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        value={formData.titleAr}
                        onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                        placeholder="مثال: التنفس في أوساط عيش مختلفة..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Units and Chapters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Unité / Thème (Français)
                      </label>
                      <input
                        type="text"
                        value={formData.themeTitle}
                        onChange={(e) => setFormData({ ...formData, themeTitle: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        الوحدة / المجزوءة (بالعربية)
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        value={formData.themeTitleAr}
                        onChange={(e) => setFormData({ ...formData, themeTitleAr: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Chapitre (Français)
                      </label>
                      <input
                        type="text"
                        value={formData.chapterTitle}
                        onChange={(e) => setFormData({ ...formData, chapterTitle: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        الفصل الدراسي (بالعربية)
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        value={formData.chapterTitleAr}
                        onChange={(e) => setFormData({ ...formData, chapterTitleAr: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Summaries */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Résumé introductif (Français)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.summary}
                        onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        ملخص تقديمي للدرس (بالعربية)
                      </label>
                      <textarea
                        rows={2}
                        dir="rtl"
                        value={formData.summaryAr}
                        onChange={(e) => setFormData({ ...formData, summaryAr: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Objectives list */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        {isAr ? 'الأهداف البيداغوجية للدرس' : 'Objectifs d\'apprentissage'}
                      </span>
                      <button
                        type="button"
                        onClick={handleAddObjective}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold inline-flex items-center gap-1 border border-slate-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? 'إضافة هدف' : 'Ajouter un objectif'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formData.objectives.map((obj, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={obj}
                            onChange={(e) => {
                              const updated = [...formData.objectives];
                              updated[i] = e.target.value;
                              setFormData({ ...formData, objectives: updated });
                            }}
                            className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                            placeholder="Objectif en français..."
                          />
                          <input
                            type="text"
                            dir="rtl"
                            value={formData.objectivesAr[i] || ''}
                            onChange={(e) => {
                              const updated = [...formData.objectivesAr];
                              updated[i] = e.target.value;
                              setFormData({ ...formData, objectivesAr: updated });
                            }}
                            className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                            placeholder="الهدف بالعربية..."
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveObjective(i)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2 : SECTIONS & CONTENT */}
              {activeTab === 'sections' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {isAr
                        ? 'قسم الدرس إلى فقرات واضحة ومرتبة مع إبراز خلاصات الحفظ.'
                        : 'Structurez le contenu scientifique par grandes parties avec points clés.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5 border border-emerald-500/30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isAr ? 'إضافة فقرة' : 'Ajouter une section'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.contentSections.map((sec, idx) => (
                      <div key={idx} className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                          <span className="text-xs font-bold text-emerald-400">Section {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(idx)}
                            disabled={formData.contentSections.length <= 1}
                            className="text-xs text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={sec.heading}
                            onChange={(e) => {
                              const updated = [...formData.contentSections];
                              updated[idx].heading = e.target.value;
                              setFormData({ ...formData, contentSections: updated });
                            }}
                            placeholder="Titre de la section..."
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                          <input
                            type="text"
                            dir="rtl"
                            value={sec.headingAr}
                            onChange={(e) => {
                              const updated = [...formData.contentSections];
                              updated[idx].headingAr = e.target.value;
                              setFormData({ ...formData, contentSections: updated });
                            }}
                            placeholder="عنوان الفقرة بالعربية..."
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <textarea
                            rows={4}
                            value={sec.bodyMarkdown}
                            onChange={(e) => {
                              const updated = [...formData.contentSections];
                              updated[idx].bodyMarkdown = e.target.value;
                              setFormData({ ...formData, contentSections: updated });
                            }}
                            placeholder="Texte explicatif détaillé (Français)..."
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                          <textarea
                            rows={4}
                            dir="rtl"
                            value={sec.bodyMarkdownAr}
                            onChange={(e) => {
                              const updated = [...formData.contentSections];
                              updated[idx].bodyMarkdownAr = e.target.value;
                              setFormData({ ...formData, contentSections: updated });
                            }}
                            placeholder="النص العلمي المفصل (بالعربية)..."
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <input
                            type="text"
                            value={sec.keyTakeaway || ''}
                            onChange={(e) => {
                              const updated = [...formData.contentSections];
                              updated[idx].keyTakeaway = e.target.value;
                              setFormData({ ...formData, contentSections: updated });
                            }}
                            placeholder="💡 Point clé à retenir (FR)..."
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-emerald-300"
                          />
                          <input
                            type="text"
                            dir="rtl"
                            value={sec.keyTakeawayAr || ''}
                            onChange={(e) => {
                              const updated = [...formData.contentSections];
                              updated[idx].keyTakeawayAr = e.target.value;
                              setFormData({ ...formData, contentSections: updated });
                            }}
                            placeholder="💡 خلاصة أساسية للتذكر (AR)..."
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-emerald-300"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3 : DEFINITIONS */}
              {activeTab === 'definitions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {isAr ? 'قائمة المصطلحات العلمية المعيارية المقررة بالثانوي الإعدادي.' : 'Vocabulaire scientifique officiel.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleAddDefinition}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5 border border-emerald-500/30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isAr ? 'إضافة مصطلح' : 'Ajouter un terme'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.definitions.map((def, idx) => (
                      <div key={idx} className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                          <span className="text-xs font-bold text-slate-300">Terme #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDefinition(idx)}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={def.term}
                            onChange={(e) => {
                              const updated = [...formData.definitions];
                              updated[idx].term = e.target.value;
                              setFormData({ ...formData, definitions: updated });
                            }}
                            placeholder="Terme en français..."
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                          <input
                            type="text"
                            dir="rtl"
                            value={def.termAr}
                            onChange={(e) => {
                              const updated = [...formData.definitions];
                              updated[idx].termAr = e.target.value;
                              setFormData({ ...formData, definitions: updated });
                            }}
                            placeholder="المصطلح بالعربية..."
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <textarea
                            rows={2}
                            value={def.definition}
                            onChange={(e) => {
                              const updated = [...formData.definitions];
                              updated[idx].definition = e.target.value;
                              setFormData({ ...formData, definitions: updated });
                            }}
                            placeholder="Définition officielle en français..."
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                          <textarea
                            rows={2}
                            dir="rtl"
                            value={def.definitionAr}
                            onChange={(e) => {
                              const updated = [...formData.definitions];
                              updated[idx].definitionAr = e.target.value;
                              setFormData({ ...formData, definitions: updated });
                            }}
                            placeholder="التعريف الرسمي بالعربية..."
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4 : MEDIA, PDF, PPT & VIDEOS */}
              {activeTab === 'media' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-400">
                      {isAr
                        ? 'أرفق ملفات PDF أو عروض PowerPoint (.ppt / .pptx)، صور توضيحية علمية، أو روابط فيديو من يوتيوب.'
                        : 'Ajoutez des schémas, documents PDF, présentations PowerPoint (PPT/PPTX) ou vidéos scientifiques YouTube.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <label className="px-2.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-xs font-semibold inline-flex items-center gap-1 border border-blue-500/30 cursor-pointer">
                        <Image className="w-3.5 h-3.5" />
                        <span>{isAr ? '+ صورة محلية' : '+ Téléverser Image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'image')}
                        />
                      </label>

                      <label className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold inline-flex items-center gap-1 border border-rose-500/30 cursor-pointer">
                        {isAnalyzingPdf ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isAnalyzingPdf
                            ? (isAr ? 'جاري التحليل...' : 'Analyse...')
                            : (isAr ? '+ ملف PDF' : '+ Téléverser PDF')}
                        </span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'pdf')}
                        />
                      </label>

                      <label className="px-2.5 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 text-xs font-semibold inline-flex items-center gap-1 border border-orange-500/30 cursor-pointer">
                        {isAnalyzingPdf ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Presentation className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isAnalyzingPdf
                            ? (isAr ? 'جاري التحليل...' : 'Analyse...')
                            : (isAr ? '+ عرض PPT / PPTX' : '+ Téléverser PPT / PPTX')}
                        </span>
                        <input
                          type="file"
                          accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'ppt')}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handleAddMedia('video')}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold inline-flex items-center gap-1 border border-amber-500/30"
                      >
                        <Video className="w-3.5 h-3.5" />
                        + Vidéo URL
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(!formData.mediaAttachments || formData.mediaAttachments.length === 0) ? (
                      <div className="text-center py-10 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 text-xs text-slate-400">
                        Aucun fichier ou média attaché pour le moment.
                      </div>
                    ) : (
                      formData.mediaAttachments.map((med, idx) => (
                        <div key={med.id || idx} className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                            <span className="text-xs font-bold flex items-center gap-1.5 text-cyan-400">
                              {med.type === 'pdf' && <FileDown className="w-4 h-4 text-rose-400" />}
                              {med.type === 'ppt' && <Presentation className="w-4 h-4 text-orange-400" />}
                              {med.type === 'video' && <Video className="w-4 h-4 text-amber-400" />}
                              {med.type === 'image' && <Image className="w-4 h-4 text-blue-400" />}
                              Pièce #{idx + 1} ({med.type === 'ppt' ? 'PPT / PPTX' : med.type.toUpperCase()})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMedia(idx)}
                              className="text-slate-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={med.title}
                              onChange={(e) => {
                                const updated = [...(formData.mediaAttachments || [])];
                                updated[idx].title = e.target.value;
                                setFormData({ ...formData, mediaAttachments: updated });
                              }}
                              placeholder="Titre du document..."
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                            />
                            <input
                              type="text"
                              value={med.url}
                              onChange={(e) => {
                                const updated = [...(formData.mediaAttachments || [])];
                                updated[idx].url = e.target.value;
                                setFormData({ ...formData, mediaAttachments: updated });
                              }}
                              placeholder="URL du fichier (Image, PDF, PPT ou Vidéo)..."
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-cyan-300 font-mono"
                            />
                          </div>

                          <input
                            type="text"
                            value={med.description || ''}
                            onChange={(e) => {
                              const updated = [...(formData.mediaAttachments || [])];
                              updated[idx].description = e.target.value;
                              setFormData({ ...formData, mediaAttachments: updated });
                            }}
                            placeholder="Description pédagogique de la ressource..."
                            className="w-full px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-300"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5 : EXERCISES & QCM */}
              {activeTab === 'exercises' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {isAr
                        ? 'أنشئ أسئلة QCM واختبارات مرفقة بالدرس مع تحديد الجواب الصحيح والشرح البيداغوجي.'
                        : 'Créez des QCM et exercices d\'évaluation directement rattachés avec réponses commentées.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleAddExercise}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5 border border-emerald-500/30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isAr ? 'إضافة سؤال تقويمي' : 'Ajouter un exercice'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(!formData.embeddedExercises || formData.embeddedExercises.length === 0) ? (
                      <div className="text-center py-10 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 text-xs text-slate-400">
                        Aucun exercice rattaché à ce cours pour le moment.
                      </div>
                    ) : (
                      formData.embeddedExercises.map((q, idx) => (
                        <div key={q.id || idx} className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                            <span className="text-xs font-bold text-amber-400">
                              Question #{idx + 1} ({q.type.toUpperCase()})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(idx)}
                              className="text-slate-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={q.prompt}
                              onChange={(e) => {
                                const updated = [...(formData.embeddedExercises || [])];
                                updated[idx].prompt = e.target.value;
                                setFormData({ ...formData, embeddedExercises: updated });
                              }}
                              placeholder="Énoncé de la question (FR)..."
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                            />
                            <input
                              type="text"
                              dir="rtl"
                              value={q.promptAr}
                              onChange={(e) => {
                                const updated = [...(formData.embeddedExercises || [])];
                                updated[idx].promptAr = e.target.value;
                                setFormData({ ...formData, embeddedExercises: updated });
                              }}
                              placeholder="نص السؤال (AR)..."
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                            />
                          </div>

                          {/* Options */}
                          <div className="space-y-1.5 pt-1">
                            <label className="block text-[11px] font-semibold text-slate-300">
                              Choix de réponses (Cocher la bonne réponse) :
                            </label>
                            {q.options?.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct_${q.id}`}
                                  checked={Number(q.correctAnswer) === optIdx}
                                  onChange={() => {
                                    const updated = [...(formData.embeddedExercises || [])];
                                    updated[idx].correctAnswer = optIdx;
                                    setFormData({ ...formData, embeddedExercises: updated });
                                  }}
                                  className="w-4 h-4 accent-emerald-500"
                                />
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const updated = [...(formData.embeddedExercises || [])];
                                    if (updated[idx].options) {
                                      updated[idx].options![optIdx] = e.target.value;
                                      setFormData({ ...formData, embeddedExercises: updated });
                                    }
                                  }}
                                  className="flex-1 px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                                />
                              </div>
                            ))}
                          </div>

                          {/* Correction explanation */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                            <textarea
                              rows={2}
                              value={q.explanation}
                              onChange={(e) => {
                                const updated = [...(formData.embeddedExercises || [])];
                                updated[idx].explanation = e.target.value;
                                setFormData({ ...formData, embeddedExercises: updated });
                              }}
                              placeholder="Explication détaillée de la correction..."
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-emerald-300"
                            />
                            <textarea
                              rows={2}
                              dir="rtl"
                              value={q.explanationAr}
                              onChange={(e) => {
                                const updated = [...(formData.embeddedExercises || [])];
                                updated[idx].explanationAr = e.target.value;
                                setFormData({ ...formData, embeddedExercises: updated });
                              }}
                              placeholder="التعليل البيداغوجي للتصحيح بالعربية..."
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-emerald-300"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                {isAr ? 'إلغاء' : 'Annuler'}
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPreviewLesson(formData)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  {isAr ? 'معاينة' : 'Aperçu'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSave('draft')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                  title="Enregistrer en tant que brouillon (non visible aux élèves)"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  {isAr ? 'حفظ كمسودة' : 'Enregistrer brouillon'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSave('published')}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 inline-flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  title="Valider et publier immédiatement dans l'espace élèves"
                >
                  <Save className="w-4 h-4" />
                  {isAr ? 'حفظ ونشر للتلاميذ' : 'Enregistrer & Publier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SMART PDF & POWERPOINT IMPORT MODAL ==================== */}
      {isPdfImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isAr ? 'استيراد ذكي لدرس SVT (PDF / PowerPoint)' : 'Importation Intelligente de Cours (PDF / PPT)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'استخراج تلقائي للعنوان والمستوى والتنظيم المغربي من ملفات PDF أو PPT / PPTX' : 'Détection automatique du titre, niveau (1AC, 2AC, 3AC) et semestre (PDF, PPT, PPTX)'}
                  </p>
                </div>
              </div>

              {!isAnalyzingPdf && (
                <button
                  onClick={() => setIsPdfImportModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {isAnalyzingPdf ? (
                <div className="py-8 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                    <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {isAr ? 'جاري تحليل الوثيقة واستخراج المعلومات البيداغوجية...' : 'Analyse pédagogique du document en cours...'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {isAr ? 'التعرف على المقرر الدراسي المغربي، المستوى، وعنوان الدرس' : 'Reconnaissance du programme SVT marocain, du niveau et du titre du cours'}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700 max-w-xs mx-auto">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-300"
                      style={{ width: `${pdfImportProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* File Drop Area */}
                  <label className="block border-2 border-dashed border-slate-700 hover:border-blue-500/80 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-800/40 hover:bg-blue-500/5 group">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 flex items-center justify-center mx-auto mb-3 transition-transform border border-blue-500/20">
                      <FileUp className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-white block">
                      {isAr ? 'انقر لاختيار ملف PDF أو PowerPoint (.ppt / .pptx) أو اسحبه إلى هنا' : 'Cliquez pour sélectionner un PDF ou PowerPoint (.ppt, .pptx)'}
                    </span>
                    <span className="text-xs text-slate-400 block mt-1">
                      {isAr ? 'يدعم وثائق الدروس وعروض الشرائح حتى 40 ميغابايت' : 'Fiches PDF ou présentations PowerPoint (.ppt, .pptx) jusqu\'à 40 Mo'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) handleSmartPdfImport(file);
                      }}
                    />
                  </label>

                  {/* Feature Highlights */}
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/80 space-y-2.5 text-xs text-slate-300">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        {isAr
                          ? 'استخراج آلي لعنوان الدرس بالفرنسية مع اقتراح المستوى (1AC أو 2AC أو 3AC) والدورة والوحدة.'
                          : 'Extraction automatique du titre en français, du niveau (1AC, 2AC ou 3AC), de l\'unité et du semestre.'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        {isAr
                          ? 'فتح الدرس فورياً كمسودة لتتمكن من مراجعة وتعديل كافة المعلومات قبل النشر النهائي.'
                          : 'Ouverture immédiate en tant que brouillon : vous gardez le contrôle total et vérifiez tout avant publication.'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        {isAr
                          ? 'حفظ ملف الـ PDF أو PowerPoint الأصلي ليكون متاحاً لتنزيل التلاميذ بجودة عالية.'
                          : 'Conservation du fichier original (PDF, PPT ou PPTX) dans les pièces jointes pour téléchargement direct par les élèves.'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-amber-300/90">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        {isAr
                          ? 'الوثائق الممسوحة ضوئياً أو العروض المصورة مدعومة بالكامل، مع إمكانية إدخال العنوان يدوياً بسهولة.'
                          : 'Les PDF scannés et présentations imagées sont acceptés : vous saisissez simplement le titre à la main sans blocage.'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
              <button
                type="button"
                disabled={isAnalyzingPdf}
                onClick={() => setIsPdfImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-50"
              >
                {isAr ? 'إغلاق' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
