import React, { useMemo, useRef, useState } from 'react';
import {
  FileText,
  Upload,
  MessageSquare,
  LayoutGrid,
  Download,
  RefreshCw,
  Send,
  Sparkles,
  BookOpen,
  Maximize2,
  X,
  Image as ImageIcon,
  AlertCircle,
  ArrowRight,
  GitBranch,
  Table2,
  Layers,
} from 'lucide-react';
import { GradeLevel, Lesson } from '../types/svt';
import type {
  InfographicLayout,
  PdfInfographicData,
  PdfOutlineSection,
} from '../../server/pdfAiEngine';
import { InfographicTheme, renderInfographicSvg } from '../utils/infographicSvg';

interface PdfAiStudioProps {
  gradeLevel: GradeLevel;
  language: 'fr' | 'ar';
  lessons?: Lesson[];
}

interface ExtractedPdfImageItem {
  id: string;
  title: string;
  titleAr: string;
  url: string;
  description: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LoadedPdfState {
  filename: string;
  pageCount: number;
  isScanned: boolean;
  rawText: string;
  pdfBase64: string;
  title: string;
  titleAr: string;
  summaryFr: string;
  summaryAr: string;
  outline: PdfOutlineSection[];
  suggestedQuestions: { fr: string; ar: string }[];
  extractedImages: ExtractedPdfImageItem[];
  infographic: PdfInfographicData;
}

function renderFormattedReply(content: string, isAr: boolean): React.ReactNode {
  const lines = (content || '').replace(/\r\n?/g, '\n').split('\n');
  const nodes: React.ReactNode[] = [];

  const renderInline = (txt: string) =>
    txt.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((tok, i) => {
      if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
        return (
          <strong key={i} className="text-white font-semibold">
            {tok.slice(2, -2)}
          </strong>
        );
      }
      if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
        return (
          <em key={i} className="text-emerald-300 not-italic font-medium">
            {tok.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={i}>{tok}</React.Fragment>;
    });

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    if (line.includes('|')) {
      const tbl: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().includes('|')) {
        tbl.push(lines[j].trim());
        j++;
      }
      if (tbl.length >= 2) {
        const parseRow = (r: string) =>
          r
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map(c => c.trim());
        const isSep = (r: string) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(r);
        const headers = parseRow(tbl[0]);
        const bodyRows = tbl
          .slice(isSep(tbl[1]) ? 2 : 1)
          .filter(r => !isSep(r))
          .map(parseRow);
        if (headers.length >= 2) {
          nodes.push(
            <div key={`t-${i}`} className="overflow-x-auto my-2 rounded-lg border border-slate-700 bg-slate-950/80">
              <table className={`w-full text-xs border-collapse ${isAr ? 'text-right' : 'text-left'}`}>
                <thead>
                  <tr className="bg-emerald-950/70 text-emerald-300 border-b border-slate-700">
                    {headers.map((h, hi) => (
                      <th key={hi} className="px-2.5 py-1.5 font-bold whitespace-nowrap">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {bodyRows.map((row, ri) => (
                    <tr key={ri}>
                      {headers.map((_, ci) => (
                        <td key={ci} className="px-2.5 py-1.5 align-top">
                          {renderInline(row[ci] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          i = j;
          continue;
        }
      }
    }

    if (/^#{2,4}\s+/.test(line)) {
      nodes.push(
        <h4 key={`h-${i}`} className="text-sm font-bold text-emerald-300 pt-1">
          {renderInline(line.replace(/^#{2,4}\s+/, ''))}
        </h4>
      );
      i++;
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = [];
      let j = i;
      while (j < lines.length && /^[-*•]\s+/.test(lines[j].trim())) {
        items.push(lines[j].trim().replace(/^[-*•]\s+/, ''));
        j++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="space-y-1 ps-4 list-disc marker:text-emerald-400">
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(it)}
            </li>
          ))}
        </ul>
      );
      i = j;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      let j = i;
      while (j < lines.length && /^\d+\.\s+/.test(lines[j].trim())) {
        items.push(lines[j].trim().replace(/^\d+\.\s+/, ''));
        j++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="space-y-1 ps-5 list-decimal marker:text-emerald-400 marker:font-bold">
          {items.map((it, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(it)}
            </li>
          ))}
        </ol>
      );
      i = j;
      continue;
    }

    nodes.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-2">{nodes}</div>;
}

export const PdfAiStudio: React.FC<PdfAiStudioProps> = ({
  gradeLevel,
  language,
  lessons = [],
}) => {
  const isAr = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<LoadedPdfState | null>(null);

  // Left Panel View: Chat vs Reader
  const [leftTab, setLeftTab] = useState<'chat' | 'reader'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  // Right Panel Infographic Studio Controls
  const [layout, setLayout] = useState<InfographicLayout>('summary');
  const [theme, setTheme] = useState<InfographicTheme>('emerald');
  const [infographicLang, setInfographicLang] = useState<'fr' | 'ar'>(language);
  const [focusPrompt, setFocusPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Collect any existing course PDFs so the user can analyze them in 1 click
  const availableCoursePdfs = useMemo(() => {
    const items: { lessonTitle: string; attachmentTitle: string; url: string }[] = [];
    for (const l of lessons) {
      for (const att of l.mediaAttachments || []) {
        if (att.type === 'pdf' && att.url && att.url.startsWith('data:application/pdf')) {
          items.push({
            lessonTitle: isAr ? (l.titleAr || l.title) : l.title,
            attachmentTitle: att.title || `${l.title}.pdf`,
            url: att.url,
          });
        }
      }
    }
    return items.slice(0, 6);
  }, [lessons, isAr]);

  const infographicSvg = useMemo(() => {
    if (!pdfData) return '';
    return renderInfographicSvg(pdfData.infographic, {
      layout,
      theme,
      language: infographicLang,
    });
  }, [pdfData, layout, theme, infographicLang]);

  const analyzeBase64Pdf = async (fileBase64: string, filename: string) => {
    setErrorMsg(null);
    setIsAnalyzing(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 24000);

    try {
      const res = await fetch('/api/pdf-ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ fileBase64, filename }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const data = await res.json();

      setPdfData({
        filename: data.filename || filename,
        pageCount: data.pageCount || 1,
        isScanned: Boolean(data.isScanned),
        rawText: data.rawText || '',
        pdfBase64: fileBase64,
        title: data.title || filename,
        titleAr: data.titleAr || data.title || filename,
        summaryFr: data.summaryFr || '',
        summaryAr: data.summaryAr || '',
        outline: Array.isArray(data.outline) ? data.outline : [],
        suggestedQuestions: Array.isArray(data.suggestedQuestions) ? data.suggestedQuestions : [],
        extractedImages: Array.isArray(data.extractedImages) ? data.extractedImages : [],
        infographic: data.infographic,
      });

      setInfographicLang(language);
      setLeftTab('chat');
      setMessages([
        {
          role: 'assistant',
          content: isAr
            ? `### 📄 تمت قراءة الملف بنجاح : **${data.titleAr || data.title}**\n\n${data.summaryAr}\n\nاطرح أي سؤال حول هذا الملف أو اختر أحد الأسئلة المقترحة أدناه، وعاين الإنفوغرافيك التفاعلي جانباً.`
            : `### 📄 Document lu et analysé : **${data.title}**\n\n${data.summaryFr}\n\nPosez-moi n'importe quelle question sur ce PDF ou personnalisez votre infographie à droite.`,
        },
      ]);
    } catch (err: any) {
      setErrorMsg(
        isAr
          ? `تعذر تحليل ملف PDF (${err?.message || 'خطأ تقني'}). يرجى المحاولة بملف PDF صالح.`
          : `Impossible d'analyser ce fichier PDF (${err?.message || 'Erreur réseau'}). Veuillez réessayer.`
      );
    } finally {
      window.clearTimeout(timeout);
      setIsAnalyzing(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMsg(
        isAr
          ? 'يرجى اختيار ملف بصيغة PDF فقط.'
          : 'Veuillez sélectionner un document au format PDF uniquement.'
      );
      return;
    }
    if (file.size > 35 * 1024 * 1024) {
      setErrorMsg(
        isAr ? 'حجم الملف يتجاوز الحد المسموح به (35 ميغابايت).' : 'Le fichier dépasse la limite de 35 Mo.'
      );
      return;
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await analyzeBase64Pdf(base64, file.name);
  };

  const handleSendChat = async (customQuestion?: string) => {
    if (!pdfData || isChatLoading) return;
    const q = (customQuestion || questionInput).trim();
    if (!q) return;

    const updatedHistory = [...messages, { role: 'user' as const, content: q }];
    setMessages(updatedHistory);
    if (!customQuestion) setQuestionInput('');
    setIsChatLoading(true);
    setErrorMsg(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 22000);

    try {
      const res = await fetch('/api/pdf-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          rawText: pdfData.rawText,
          pdfBase64: pdfData.isScanned ? pdfData.pdfBase64 : undefined,
          filename: pdfData.filename,
          question: q,
          history: updatedHistory.slice(-6),
          language,
          gradeLevel,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: json.reply || '' }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: isAr
            ? 'تعذر الحصول على رد فوري من الخادم. يرجى إعادة المحاولة.'
            : 'La requête a expiré temporairement. Veuillez réessayer votre question.',
        },
      ]);
    } finally {
      window.clearTimeout(timeout);
      setIsChatLoading(false);
    }
  };

  const handleRegenerateInfographic = async () => {
    if (!pdfData || isRegenerating) return;
    setIsRegenerating(true);
    setErrorMsg(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 22000);

    try {
      const res = await fetch('/api/pdf-ai/infographic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          rawText: pdfData.rawText,
          filename: pdfData.filename,
          focusPrompt: focusPrompt.trim(),
          layout,
          pageCount: pdfData.pageCount,
          imageCount: pdfData.extractedImages.length,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.infographic) {
        setPdfData(prev => (prev ? { ...prev, infographic: json.infographic } : prev));
      }
    } catch (err: any) {
      setErrorMsg(
        isAr
          ? 'تعذر تحديث الإنفوغرافيك، تم الاحتفاظ بالنسخة الحالية.'
          : 'Impossible de régénérer l\'infographie pour le moment.'
      );
    } finally {
      window.clearTimeout(timeout);
      setIsRegenerating(false);
    }
  };

  const handleDownloadSvg = () => {
    if (!infographicSvg || !pdfData) return;
    const blob = new Blob([infographicSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pdfData.filename.replace(/\.pdf$/i, '')}-infographie-${layout}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = async () => {
    if (!infographicSvg || !pdfData) return;
    try {
      const svgBlob = new Blob([infographicSvg], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = `${pdfData.filename.replace(/\.pdf$/i, '')}-infographie-${layout}.png`;
          a.click();
        }
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    } catch {
      handleDownloadSvg();
    }
  };

  const layoutTabs: { id: InfographicLayout; labelFr: string; labelAr: string; icon: React.ReactNode }[] = [
    { id: 'summary', labelFr: 'Synthèse', labelAr: 'ملخص بصري', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'process', labelFr: 'Processus', labelAr: 'مسار المراحل', icon: <ArrowRight className="w-3.5 h-3.5" /> },
    { id: 'comparison', labelFr: 'Comparatif', labelAr: 'جدول مقارن', icon: <Table2 className="w-3.5 h-3.5" /> },
    { id: 'mindmap', labelFr: 'Carte Mentale', labelAr: 'خريطة ذهنية', icon: <GitBranch className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Studio Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-emerald-400 tracking-wide">
              {isAr ? 'أداة الذكاء الاصطناعي للوثائق · قراءة · حوار · إنفوغرافيك' : 'Outil IA Documentaire · Lecture · Discussion · Infographies'}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
              {isAr ? 'استوديو قراءة ملفات PDF وصناعة الإنفوغرافيك' : 'Studio IA Lecteur PDF & Infographies'}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isAr
                ? 'استورد أي ملف PDF لقراءته آلياً، التحاور مع محتواه بالعربية أو الفرنسية، وتحويله إلى إنفوغرافيك احترافي قابل للتنزيل.'
                : 'Importez un PDF pour l\'analyser automatiquement, dialoguer avec son contenu et générer des infographies pédagogiques exportables en PNG ou SVG.'}
            </p>
          </div>

          {pdfData && (
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <Upload className="w-4 h-4" />
                <span>{isAr ? 'فتح ملف PDF آخر' : 'Importer un autre PDF'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) handleFileSelected(f);
        }}
      />

      {/* Error Alert Banner */}
      {errorMsg && (
        <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-red-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-300 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload / Initial State */}
      {!pdfData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-xl space-y-8">
          {isAnalyzing ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white">
                  {isAr ? 'جاري قراءة الوثيقة وإعداد الإنفوغرافيك...' : 'Lecture du PDF et génération de l\'infographie en cours...'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isAr ? 'استخراج النصوص والجداول والأشكال وتلخيص المحاور' : 'Extraction des textes, tableaux, figures et structuration visuelle'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) handleFileSelected(dropped);
                }}
                className="block border-2 border-dashed border-slate-700 hover:border-emerald-500/80 rounded-2xl p-10 text-center cursor-pointer transition-colors bg-slate-950/50 hover:bg-emerald-950/20"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-7 h-7" />
                </div>
                <span className="text-base font-bold text-white block">
                  {isAr ? 'انقر لاختيار ملف PDF أو اسحبه إلى هنا' : 'Cliquez pour sélectionner un fichier PDF ou glissez-le ici'}
                </span>
                <span className="text-xs text-slate-400 block mt-1.5">
                  {isAr ? 'يدعم الدروس والوثائق العلمية والجداول والملفات الممسوحة ضوئياً (حتى 35 ميغابايت)' : 'Cours, fiches SVT, polycopiés avec tableaux, schémas ou PDF scannés (jusqu\'à 35 Mo)'}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) handleFileSelected(f);
                  }}
                />
              </label>

              {/* 3 Capabilities Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>{isAr ? '1. قراءة وهيكلة ذكية' : '1. Lecture & Plan Structuré'}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isAr ? 'استخراج النصوص، الجداول، الصور، مع ملخص ثنائي اللغة.' : 'Extraction du texte, tableaux, images intégrées et résumé bilingue.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <MessageSquare className="w-4 h-4" />
                    <span>{isAr ? '2. حوار تفاعلي مع PDF' : '2. Discuter avec le PDF'}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isAr ? 'طرح الأسئلة وطلب الشروح أو التمارين استناداً إلى محتوى الملف.' : 'Posez vos questions, demandez des explications ou un quiz basé sur le PDF.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Layers className="w-4 h-4" />
                    <span>{isAr ? '3. صناعة إنفوغرافيك متعدد' : '3. Infographies Multi-Modèles'}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isAr ? 'ملخص بصري، مسار مراحل، جدول مقارن، وخريطة ذهنية للتنزيل.' : 'Synthèse, processus, comparatif ou carte mentale téléchargeables en PNG/SVG.'}
                  </p>
                </div>
              </div>

              {/* Quick Launch from Uploaded Course PDFs if any */}
              {availableCoursePdfs.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <h3 className="text-xs font-bold text-slate-300">
                    {isAr ? 'أو افتح مباشرة ملف PDF من الدروس المنشورة:' : 'Ou analysez directement un PDF déjà présent dans vos cours :'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableCoursePdfs.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => analyzeBase64Pdf(item.url, `${item.attachmentTitle}.pdf`)}
                        className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{item.attachmentTitle}</div>
                          <div className="text-[11px] text-slate-400 truncate">{item.lessonTitle}</div>
                        </div>
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Active Split Workspace when PDF is Loaded */}
      {pdfData && (
        <div className="space-y-4">
          {/* Document Info Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {isAr ? pdfData.titleAr : pdfData.title}
                </div>
                <div className="text-xs text-slate-400 tabular-nums flex items-center gap-2">
                  <span className="truncate max-w-[220px]">{pdfData.filename}</span>
                  <span aria-hidden="true">·</span>
                  <span>{pdfData.pageCount} {pdfData.pageCount > 1 ? 'pages' : 'page'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{pdfData.isScanned ? (isAr ? 'وثيقة مصورة' : 'PDF scanné') : (isAr ? 'نص مفهرس' : 'Texte indexé')}</span>
                </div>
              </div>
            </div>

            {isAnalyzing && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {isAr ? 'جاري التحليل...' : 'Analyse en cours...'}
              </span>
            )}
          </div>

          {/* 2-Column Main Split: Left (Reader + Chat) & Right (Infographic Studio) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* LEFT PANEL (5 cols): Chat & PDF Reader */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl min-h-[620px]">
              {/* Panel Switcher */}
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full">
                  <button
                    type="button"
                    onClick={() => setLeftTab('chat')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                      leftTab === 'chat'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{isAr ? 'مناقشة PDF' : 'Discuter le PDF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftTab('reader')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                      leftTab === 'reader'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{isAr ? 'قراءة وتلخيص' : 'Lecture & Plan'}</span>
                  </button>
                </div>
              </div>

              {leftTab === 'chat' ? (
                <>
                  {/* Suggested Questions */}
                  <div className="px-4 py-2.5 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
                    {pdfData.suggestedQuestions.map((sq, idx) => {
                      const qLabel = isAr ? sq.ar : sq.fr;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendChat(qLabel)}
                          disabled={isChatLoading}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-200 shrink-0 transition-colors max-w-[240px] truncate"
                          title={qLabel}
                        >
                          {qLabel}
                        </button>
                      );
                    })}
                  </div>

                  {/* Chat History */}
                  <div className="flex-1 p-4 space-y-3.5 overflow-y-auto max-h-[460px]">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-3 text-xs sm:text-sm max-w-[92%] ${
                            msg.role === 'user'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-950 border border-slate-800 text-slate-200'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
                          ) : (
                            renderFormattedReply(msg.content, isAr)
                          )}
                        </div>
                      </div>
                    ))}

                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="rounded-2xl px-4 py-3 bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                          <span>{isAr ? 'جاري قراءة PDF وإعداد الجواب...' : 'Analyse du PDF en cours...'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="p-3 border-t border-slate-800 bg-slate-950/60">
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1.5">
                      <input
                        type="text"
                        value={questionInput}
                        onChange={(e) => setQuestionInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                        placeholder={
                          isAr
                            ? 'اسأل عن أي فقرة أو جدول داخل ملف PDF...'
                            : 'Posez une question sur le PDF (résumé, tableau, notion...)'
                        }
                        className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendChat()}
                        disabled={!questionInput.trim() || isChatLoading}
                        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 whitespace-nowrap shrink-0 transition-colors"
                      >
                        <span>{isAr ? 'إرسال' : 'Envoyer'}</span>
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* READER TAB: Summary, Outline, Extracted Images, Raw Text */
                <div className="flex-1 p-4 space-y-5 overflow-y-auto max-h-[560px]">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <h3 className="text-xs font-bold text-emerald-400">
                      {isAr ? 'ملخص الوثيقة' : 'Résumé du document'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {isAr ? pdfData.summaryAr : pdfData.summaryFr}
                    </p>
                  </div>

                  {/* Outline */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-slate-300">
                      {isAr ? 'الهيكلة والمحاور الرئيسية' : 'Plan détecté'}
                    </h3>
                    {pdfData.outline.map((sec, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                        <div className="text-xs font-bold text-emerald-300">
                          {isAr ? sec.headingAr : sec.heading}
                        </div>
                        <ul className="space-y-1 text-xs text-slate-300 ps-4 list-disc">
                          {(isAr ? sec.keyPointsAr : sec.keyPoints).map((pt, pIdx) => (
                            <li key={pIdx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Extracted Images */}
                  {pdfData.extractedImages.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isAr ? 'الصور والأشكال المستخرجة' : 'Figures extraites du PDF'}</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-2.5">
                        {pdfData.extractedImages.map((img) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => setZoomImageUrl(img.url)}
                            className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left space-y-1.5 transition-colors"
                          >
                            <img
                              src={img.url}
                              alt={img.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-24 object-contain rounded-lg bg-slate-900"
                            />
                            <div className="text-[11px] font-semibold text-slate-300 truncate">
                              {isAr ? img.titleAr : img.title}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Extracted Text Toggle */}
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowRawText(!showRawText)}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                    >
                      {showRawText
                        ? (isAr ? 'إخفاء النص الخام المستخرج' : 'Masquer le texte brut extrait')
                        : (isAr ? 'عرض النص الخام والجداول المستخرجة' : 'Afficher le texte brut & tableaux extraits')}
                    </button>
                    {showRawText && (
                      <pre className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">
                        {pdfData.rawText || (isAr ? 'لا توجد طبقة نصية (وثيقة مصورة).' : 'Aucune couche texte brute (document scanné).')}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL (7 cols): Infographic Studio */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
              {/* Studio Controls Bar */}
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
                {/* Layout Selector */}
                <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
                  {layoutTabs.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setLayout(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                        layout === tab.id
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.icon}
                      <span>{isAr ? tab.labelAr : tab.labelFr}</span>
                    </button>
                  ))}
                </div>

                {/* Theme & Language & Export Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                    {([
                      { id: 'emerald', label: 'Émeraude', color: 'bg-emerald-500' },
                      { id: 'ocean', label: 'Océan', color: 'bg-sky-500' },
                      { id: 'amber', label: 'Ambre', color: 'bg-amber-500' },
                    ] as const).map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        title={t.label}
                        className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          theme === t.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                        <span className="hidden sm:inline">{t.label}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setInfographicLang(prev => (prev === 'fr' ? 'ar' : 'fr'))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 whitespace-nowrap shrink-0"
                  >
                    {infographicLang === 'fr' ? 'FR → AR' : 'AR → FR'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
                    title={isAr ? 'عرض مكبر' : 'Agrandir'}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSvg}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>SVG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PNG</span>
                  </button>
                </div>
              </div>

              {/* Vector Infographic Preview Stage */}
              <div className="flex-1 p-4 bg-slate-950/80 flex items-center justify-center overflow-auto min-h-[430px]">
                <div
                  className="w-full max-w-[920px] rounded-xl overflow-hidden shadow-2xl border border-slate-800 [&>svg]:w-full [&>svg]:h-auto [&>svg]:block"
                  dangerouslySetInnerHTML={{ __html: infographicSvg }}
                />
              </div>

              {/* Custom Focus Regeneration Bar */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1.5">
                  <input
                    type="text"
                    value={focusPrompt}
                    onChange={(e) => setFocusPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegenerateInfographic()}
                    placeholder={
                      isAr
                        ? 'تخصيص الإنفوغرافيك (مثال: ركز على مقارنة التنفس المائي والهوائي)...'
                        : 'Personnaliser l\'infographie (ex : Focus sur le mécanisme principal ou comparaison)...'
                    }
                    className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleRegenerateInfographic}
                    disabled={isRegenerating}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'تحديث الإنفوغرافيك' : 'Régénérer'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Infographic Lightbox */}
      {isZoomOpen && infographicSvg && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm p-4 sm:p-8 flex items-center justify-center overflow-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                {isAr ? pdfData?.infographic.titleAr : pdfData?.infographic.title}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsZoomOpen(false)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div
              className="w-full rounded-xl overflow-hidden [&>svg]:w-full [&>svg]:h-auto [&>svg]:block"
              dangerouslySetInnerHTML={{ __html: infographicSvg }}
            />
          </div>
        </div>
      )}

      {/* Extracted PDF Figure Zoom Lightbox */}
      {zoomImageUrl && (
        <div
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 p-6 flex items-center justify-center"
        >
          <img
            src={zoomImageUrl}
            alt="Figure extraite du PDF"
            className="max-w-full max-h-[85vh] rounded-xl border border-slate-700 shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
