export type InfographicLayout = 'summary' | 'process' | 'comparison' | 'mindmap';

export interface InfographicMetric {
  value: string;
  label: string;
  labelAr: string;
  detail: string;
  detailAr: string;
}

export interface InfographicStep {
  stepNumber: number;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
}

export interface InfographicBranch {
  branchTitle: string;
  branchTitleAr: string;
  points: string[];
  pointsAr: string[];
}

export interface InfographicComparison {
  headers: string[];
  headersAr: string[];
  rows: string[][];
  rowsAr: string[][];
}

export interface InfographicGlossaryItem {
  term: string;
  termAr: string;
  definition: string;
  definitionAr: string;
}

export interface PdfInfographicData {
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  gradeLevel: '1AC' | '2AC' | '3AC';
  subjectTag: string;
  subjectTagAr: string;
  keyMetrics: InfographicMetric[];
  processSteps: InfographicStep[];
  mindMapBranches: InfographicBranch[];
  comparisonTable: InfographicComparison;
  keyTakeaways: { fr: string; ar: string }[];
  glossary: InfographicGlossaryItem[];
}

export interface PdfOutlineSection {
  heading: string;
  headingAr: string;
  keyPoints: string[];
  keyPointsAr: string[];
}

export interface PdfAiAnalysisResult {
  title: string;
  titleAr: string;
  summaryFr: string;
  summaryAr: string;
  outline: PdfOutlineSection[];
  suggestedQuestions: { fr: string; ar: string }[];
  infographic: PdfInfographicData;
}

function cleanLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function detectGrade(text: string, filename: string): '1AC' | '2AC' | '3AC' {
  const combined = `${filename} ${text.slice(0, 3000)}`.toLowerCase();
  if (/\b1\s*ac\b|1ère\s*année|1ere\s*annee|milieu\s*naturel|cellule|respiration/.test(combined)) {
    return '1AC';
  }
  if (/\b2\s*ac\b|2ème\s*année|2eme\s*annee|tectonique|séisme|seisme|volcan|reproduction/.test(combined)) {
    return '2AC';
  }
  return '3AC';
}

function extractFirstMarkdownTable(rawText: string): { headers: string[]; rows: string[][] } | null {
  const lines = rawText.replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (!line.includes('|')) continue;
    const block: string[] = [];
    let j = i;
    while (j < lines.length && lines[j].trim().includes('|')) {
      block.push(lines[j].trim());
      j++;
    }
    if (block.length >= 2) {
      const parseRow = (r: string) =>
        r
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map(c => c.trim())
          .filter((_, idx, arr) => !(arr.length === 1 && arr[0] === ''));
      const isSep = (r: string) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(r);
      const headers = parseRow(block[0]).slice(0, 4);
      const rows = block
        .slice(isSep(block[1]) ? 2 : 1)
        .filter(r => !isSep(r))
        .map(r => parseRow(r).slice(0, 4))
        .filter(r => r.length >= 2)
        .slice(0, 5);
      if (headers.length >= 2 && rows.length >= 1) {
        return { headers, rows };
      }
    }
  }
  return null;
}

export function buildFallbackPdfAnalysis(
  rawText: string,
  filename: string,
  pageCount = 1,
  imageCount = 0
): PdfAiAnalysisResult {
  const cleanName = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lines = rawText
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(cleanLine)
    .filter(l => l.length > 0 && !/^page\s+\d+/i.test(l) && !/^---+\s*page/i.test(l));

  const headingPattern = /^(?:[IVX]+\.\s+|\d+[.)]\s+|chapitre\s+\d+|unité\s+\d+|partie\s+\d+)/i;
  const headings = lines.filter(l => headingPattern.test(l) && l.length <= 100);
  const proseLines = lines.filter(
    l => !l.includes('|') && l.length >= 24 && !headingPattern.test(l)
  );

  const detectedTitle =
    lines.find(l => l.length >= 6 && l.length <= 95 && !l.includes('|')) ||
    cleanName ||
    'Document de cours SVT';

  const gradeLevel = detectGrade(rawText, filename);

  // Extract definitions ("Terme : Définition")
  const glossary: InfographicGlossaryItem[] = [];
  for (const line of lines) {
    if (glossary.length >= 4) break;
    const match = line.match(/^([A-ZÀ-ÿ][^:]{2,42})\s*:\s*(.{15,220})$/);
    if (match && !/^(à retenir|remarque|exemple|objectif|chapitre|partie|nb)/i.test(match[1])) {
      glossary.push({
        term: match[1].trim(),
        termAr: match[1].trim(),
        definition: match[2].trim(),
        definitionAr: match[2].trim(),
      });
    }
  }
  if (glossary.length === 0) {
    glossary.push({
      term: 'Notions essentielles',
      termAr: 'المفاهيم الأساسية',
      definition: proseLines[0] || `Concepts scientifiques clés extraits du document ${detectedTitle}.`,
      definitionAr: proseLines[0] || `المفاهيم العلمية المستخلصة من وثيقة ${detectedTitle}.`,
    });
  }

  // Extract table or build concept comparison
  const tableFromPdf = extractFirstMarkdownTable(rawText);
  const comparisonTable: InfographicComparison = tableFromPdf
    ? {
        headers: tableFromPdf.headers,
        headersAr: tableFromPdf.headers,
        rows: tableFromPdf.rows,
        rowsAr: tableFromPdf.rows,
      }
    : {
        headers: ['Axe du document', 'Observation / Mécanisme', 'À retenir'],
        headersAr: ['محور الوثيقة', 'الملاحظة / الآلية', 'الخلاصة'],
        rows: (headings.length > 0 ? headings : [detectedTitle, 'Analyse scientifique', 'Synthèse'])
          .slice(0, 3)
          .map((h, i) => [
            h.slice(0, 48),
            (proseLines[i] || 'Étude des mécanismes et données expérimentales').slice(0, 70),
            (proseLines[i + 1] || 'Validation de la notion du programme SVT').slice(0, 60),
          ]),
        rowsAr: (headings.length > 0 ? headings : [detectedTitle, 'التحليل العلمي', 'الخلاصة'])
          .slice(0, 3)
          .map((h, i) => [
            h.slice(0, 48),
            (proseLines[i] || 'دراسة الظواهر والمعطيات التجريبية').slice(0, 70),
            (proseLines[i + 1] || 'استخلاص القاعدة العلمية للمقرر').slice(0, 60),
          ]),
      };

  const outline: PdfOutlineSection[] = (headings.length > 0 ? headings.slice(0, 5) : [detectedTitle]).map(
    (h, idx) => ({
      heading: h,
      headingAr: h,
      keyPoints: proseLines.slice(idx * 2, idx * 2 + 2).length > 0
        ? proseLines.slice(idx * 2, idx * 2 + 2)
        : [`Synthèse de la section ${idx + 1}`],
      keyPointsAr: proseLines.slice(idx * 2, idx * 2 + 2).length > 0
        ? proseLines.slice(idx * 2, idx * 2 + 2)
        : [`خلاصة المحور ${idx + 1}`],
    })
  );

  const stepCandidates = (headings.length >= 2 ? headings : proseLines).slice(0, 4);
  const processSteps: InfographicStep[] =
    stepCandidates.length > 0
      ? stepCandidates.map((item, idx) => ({
          stepNumber: idx + 1,
          title: item.slice(0, 52),
          titleAr: item.slice(0, 52),
          description: (proseLines[idx] || item).slice(0, 120),
          descriptionAr: (proseLines[idx] || item).slice(0, 120),
        }))
      : [
          {
            stepNumber: 1,
            title: 'Observation initiale',
            titleAr: 'الملاحظة الأولية',
            description: `Analyse du document ${detectedTitle}.`,
            descriptionAr: `تحليل معطيات وثيقة ${detectedTitle}.`,
          },
          {
            stepNumber: 2,
            title: 'Interprétation scientifique',
            titleAr: 'التفسير العلمي',
            description: 'Mise en relation des faits et mécanismes biologiques ou géologiques.',
            descriptionAr: 'ربط المعطيات التجريبية بالآليات العلمية.',
          },
          {
            stepNumber: 3,
            title: 'Bilan à retenir',
            titleAr: 'الحصيلة المعرفية',
            description: 'Formulation de la conclusion conforme au programme SVT.',
            descriptionAr: 'صياغة الاستنتاج العام حسب المقرر المغربي.',
          },
        ];

  const mindMapBranches: InfographicBranch[] = outline.slice(0, 4).map((sec, idx) => ({
    branchTitle: sec.heading.slice(0, 42),
    branchTitleAr: sec.headingAr.slice(0, 42),
    points: sec.keyPoints.map(p => p.slice(0, 68)).slice(0, 2),
    pointsAr: sec.keyPointsAr.map(p => p.slice(0, 68)).slice(0, 2),
  }));
  while (mindMapBranches.length < 3) {
    const idx = mindMapBranches.length + 1;
    mindMapBranches.push({
      branchTitle: idx === 2 ? 'Mécanismes clés' : 'Points à retenir',
      branchTitleAr: idx === 2 ? 'الآليات الأساسية' : 'نقط للحفظ',
      points: [proseLines[idx - 1]?.slice(0, 68) || 'Démarche scientifique expérimentale'],
      pointsAr: [proseLines[idx - 1]?.slice(0, 68) || 'النهج التجريبي في علوم الحياة والأرض'],
    });
  }

  const summaryFr =
    proseLines.slice(0, 3).join(' ').slice(0, 420) ||
    `Document pédagogique SVT (${gradeLevel}) analysé sur ${pageCount} page(s). Utilisez le chat pour poser vos questions ou générez une infographie de révision.`;
  const summaryAr =
    `تحليل شامل لوثيقة "${detectedTitle}" (${gradeLevel} • ${pageCount} صفحة). يمكنك طرح أي سؤال حول المحتوى أو تصدير الإنفوغرافيك للمراجعة.`;

  const keyTakeaways = (proseLines.length > 0 ? proseLines.slice(0, 3) : [summaryFr]).map(line => ({
    fr: line.slice(0, 140),
    ar: line.slice(0, 140),
  }));

  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;

  return {
    title: detectedTitle,
    titleAr: detectedTitle,
    summaryFr,
    summaryAr,
    outline,
    suggestedQuestions: [
      {
        fr: `Résume les points essentiels de "${detectedTitle.slice(0, 45)}" en 5 puces`,
        ar: `لخص أهم أفكار "${detectedTitle.slice(0, 40)}" في 5 نقط مركزة`,
      },
      {
        fr: 'Explique-moi les notions difficiles de ce PDF avec des exemples simples',
        ar: 'اشرح لي المفاهيم الصعبة في هذا الملف بأمثلة مبسطة',
      },
      {
        fr: 'Propose un quiz de 3 questions corrigées basé uniquement sur ce PDF',
        ar: 'اقترح اختباراً من 3 أسئلة مع التصحيح انطلاقاً من هذا الملف',
      },
      {
        fr: 'Quels tableaux ou schémas faut-il retenir pour le contrôle ?',
        ar: 'ما هي الجداول أو الرسومات الأساسية التي يجب حفظها للفرض؟',
      },
    ],
    infographic: {
      title: detectedTitle,
      titleAr: detectedTitle,
      subtitle: `Synthèse Visuelle PDF · Programme SVT ${gradeLevel}`,
      subtitleAr: `ملخص بصري للوثيقة · علوم الحياة والأرض ${gradeLevel}`,
      gradeLevel,
      subjectTag: 'SVT Collège Maroc',
      subjectTagAr: 'علوم الحياة والأرض',
      keyMetrics: [
        {
          value: String(pageCount),
          label: pageCount > 1 ? 'Pages analysées' : 'Page analysée',
          labelAr: 'عدد الصفحات',
          detail: 'Document source PDF',
          detailAr: 'الوثيقة الأصلية',
        },
        {
          value: String(Math.max(outline.length, 1)),
          label: 'Axes structurés',
          labelAr: 'المحاور المهيكلة',
          detail: 'Plan du chapitre',
          detailAr: 'هيكلة الدرس',
        },
        {
          value: String(wordCount || imageCount || 1),
          label: wordCount > 0 ? 'Mots extraits' : 'Figures détectées',
          labelAr: wordCount > 0 ? 'الكلمات المستخرجة' : 'الأشكال المكتشفة',
          detail: wordCount > 0 ? 'Contenu indexé' : 'Visuels PDF',
          detailAr: wordCount > 0 ? 'محتوى مفهرس' : 'صور الوثيقة',
        },
        {
          value: gradeLevel,
          label: 'Niveau ciblé',
          labelAr: 'المستوى الدراسي',
          detail: 'Collège marocain',
          detailAr: 'الثانوي الإعدادي',
        },
      ],
      processSteps,
      mindMapBranches,
      comparisonTable,
      keyTakeaways,
      glossary,
    },
  };
}

export function buildFallbackPdfChatReply(
  rawText: string,
  question: string,
  filename: string,
  language: 'fr' | 'ar'
): string {
  const isAr = language === 'ar';
  const lines = rawText
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(cleanLine)
    .filter(l => l.length > 6);

  if (lines.length === 0) {
    return isAr
      ? `تم تحميل الملف **${filename}** وهو عبارة عن وثيقة مصورة/ممسوحة ضوئياً بدون طبقة نصية قابلة للقراءة المباشرة بدون مفتاح Gemini. يمكنك تعديل أو إضافة النقاط الرئيسية أو استخدام الإنفوغرافيك البصري.`
      : `Le document **${filename}** semble être un PDF scanné (sans couche texte directe). Sans connexion active au modèle multimodal, je ne peux pas lire les pixels de la page, mais vous pouvez consulter les figures extraites et personnaliser l'infographie.`;
  }

  const q = question.toLowerCase();
  const tokens = q
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3);

  // If user asks for a summary or general overview
  if (/résum|synthes|points?\s+essentiel|تلخيص|لخص|أهم/i.test(q)) {
    const top = lines.slice(0, 6).map(l => `- ${l}`).join('\n');
    return isAr
      ? `### 📄 خلاصة الوثيقة (${filename})\n\nإليك أبرز المعطيات المستخرجة مباشرة من ملف PDF:\n\n${top}`
      : `### 📄 Synthèse du document (${filename})\n\nVoici les points clés extraits directement de votre PDF :\n\n${top}`;
  }

  // If user asks for a quiz
  if (/quiz|question|exercice|اختبار|تمرين|أسئلة/i.test(q)) {
    const sampleA = lines[0] || filename;
    const sampleB = lines[1] || lines[0] || filename;
    return isAr
      ? `### 🎯 تمرين تفاعلي انطلاقاً من ملف PDF\n\n1. **سؤال 1:** اشرح الفكرة الواردة في الوثيقة: *"${sampleA.slice(0, 110)}"*.\n2. **سؤال 2:** ما العلاقة العلمية المستخلصة من: *"${sampleB.slice(0, 110)}"*؟\n3. **سؤال 3:** صغ استنتاجاً عاماً يربط بين معطيات هذا الدرس.`
      : `### 🎯 Auto-évaluation basée sur votre PDF\n\n1. **Question 1 :** Expliquez la notion suivante tirée du document : *"${sampleA.slice(0, 110)}"*.\n2. **Question 2 :** Quel mécanisme ou relation est décrit dans : *"${sampleB.slice(0, 110)}"* ?\n3. **Question 3 :** Rédigez une conclusion synthétique à retenir pour le contrôle.`;
  }

  // Keyword relevance ranking across PDF lines
  const scored = lines
    .map(line => {
      const lower = line.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (lower.includes(tok)) score += 2;
      }
      if (line.includes('|')) score += 1;
      return { line, score };
    })
    .sort((a, b) => b.score - a.score);

  const matches = scored.filter(s => s.score > 0).slice(0, 5).map(s => s.line);
  const selected = matches.length > 0 ? matches : lines.slice(0, 4);

  if (isAr) {
    return `### 💡 إجابة انطلاقاً من محتوى PDF (${filename})\n\nبناءً على مقاطع الوثيقة المرتبطة بسؤالك **"${question}"**:\n\n${selected
      .map(s => `- ${s}`)
      .join('\n')}\n\nيمكنك طلب **تلخيص شامل**، **اختبار قصير**، أو **تحويل أي محور إلى إنفوغرافيك**.`;
  }

  return `### 💡 Réponse basée sur votre PDF (${filename})\n\nVoici les passages les plus pertinents extraits du document concernant **"${question}"** :\n\n${selected
    .map(s => `- ${s}`)
    .join('\n')}\n\nVous pouvez me demander un **résumé**, un **quiz corrigé**, ou de **générer une infographie** ciblée sur ce passage.`;
}
