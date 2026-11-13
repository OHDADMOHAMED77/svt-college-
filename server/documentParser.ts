import JSZip from 'jszip';

export type DocumentKind = 'pdf' | 'pptx' | 'ppt';

export interface SvtExtractedMetadata {
  title: string;
  titleAr: string;
  gradeLevel: '1AC' | '2AC' | '3AC';
  semester: 1 | 2;
  themeTitle: string;
  themeTitleAr: string;
  chapterTitle: string;
  chapterTitleAr: string;
  summary: string;
  summaryAr: string;
  objectives: string[];
  objectivesAr: string[];
}

export interface PptxExtractionResult {
  text: string;
  slideCount: number;
  titleFromMeta: string;
}

export function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

export function detectDocumentKind(filename: string, buffer?: Buffer): DocumentKind {
  const lower = (filename || '').toLowerCase().trim();
  if (lower.endsWith('.pptx')) return 'pptx';
  if (lower.endsWith('.ppt')) return 'ppt';
  if (lower.endsWith('.pdf')) return 'pdf';

  if (buffer && buffer.length >= 4) {
    // ZIP magic bytes: PK\x03\x04 (PPTX)
    if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
      return 'pptx';
    }
    // OLE2 Compound File Binary Format magic bytes (legacy .ppt)
    if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
      return 'ppt';
    }
    // PDF magic bytes: %PDF
    if (buffer.subarray(0, 4).toString('ascii') === '%PDF') {
      return 'pdf';
    }
  }

  return 'pdf';
}

export async function extractPptxContent(buffer: Buffer): Promise<PptxExtractionResult> {
  const zip = await JSZip.loadAsync(buffer);

  let titleFromMeta = '';
  const coreXmlFile = zip.file('docProps/core.xml');
  if (coreXmlFile) {
    const coreXml = await coreXmlFile.async('string');
    const titleMatch = coreXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    if (titleMatch && titleMatch[1]) {
      titleFromMeta = decodeXmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim();
    }
  }

  const slideEntries = Object.keys(zip.files)
    .map(name => {
      const m = name.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
      return m ? { name, index: Number(m[1]) } : null;
    })
    .filter((item): item is { name: string; index: number } => item !== null)
    .sort((a, b) => a.index - b.index);

  const slideTexts: string[] = [];

  for (const slide of slideEntries) {
    const xml = await zip.file(slide.name)!.async('string');
    const paragraphs = xml.split(/<\/a:p>/i);
    const lines: string[] = [];

    for (const para of paragraphs) {
      const textRuns = [...para.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi)]
        .map(m => decodeXmlEntities(m[1]))
        .join('');
      const cleanLine = textRuns.replace(/\s+/g, ' ').trim();
      if (cleanLine) {
        lines.push(cleanLine);
      }
    }

    if (lines.length > 0) {
      slideTexts.push(lines.join('\n'));
    }
  }

  return {
    text: slideTexts.join('\n').trim(),
    slideCount: slideEntries.length || 1,
    titleFromMeta,
  };
}

export function extractLegacyPptText(buffer: Buffer): { text: string; slideCount: number } {
  const extractedLines: string[] = [];
  const seen = new Set<string>();

  const noisePattern = /^(powerpoint document|current user|summaryinformation|documentsummaryinformation|root entry|microsoft|times new roman|arial|calibri|cambria|wingdings|symbol|tahoma|verdana|default design|slide\s*\d+|master|office theme|p[\x00-\x7f]{0,3}pt|content_types)/i;

  const pushCandidate = (raw: string) => {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (
      cleaned.length >= 5 &&
      cleaned.length <= 240 &&
      /[a-zA-ZÀ-ÿ\u0600-\u06FF]{3,}/.test(cleaned) &&
      !noisePattern.test(cleaned) &&
      !seen.has(cleaned)
    ) {
      seen.add(cleaned);
      extractedLines.push(cleaned);
    }
  };

  // Scan UTF-16LE runs (standard encoding for TextCharsAtom in legacy .ppt)
  let currentUtf16 = '';
  for (let i = 0; i + 1 < buffer.length; i += 2) {
    const code = buffer.readUInt16LE(i);
    const isReadableChar =
      (code >= 0x20 && code <= 0x7e) ||
      (code >= 0x00a0 && code <= 0x017f) ||
      (code >= 0x0600 && code <= 0x06ff);

    if (isReadableChar) {
      currentUtf16 += String.fromCharCode(code);
    } else {
      if (currentUtf16.length >= 5) {
        pushCandidate(currentUtf16);
      }
      currentUtf16 = '';
    }
  }
  if (currentUtf16.length >= 5) {
    pushCandidate(currentUtf16);
  }

  // Fallback: scan Latin-1 / Windows-1252 single-byte runs (TextBytesAtom)
  let currentByteStr = '';
  for (let i = 0; i < buffer.length; i++) {
    const b = buffer[i];
    const isReadableByte = (b >= 0x20 && b <= 0x7e) || (b >= 0xc0 && b <= 0xff);
    if (isReadableByte) {
      currentByteStr += String.fromCharCode(b);
    } else {
      if (currentByteStr.length >= 6) {
        pushCandidate(currentByteStr);
      }
      currentByteStr = '';
    }
  }
  if (currentByteStr.length >= 6) {
    pushCandidate(currentByteStr);
  }

  return {
    text: extractedLines.join('\n').trim(),
    slideCount: 1,
  };
}

export function isGenericDocumentName(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return /^(untitled|sans titre|document\s*\d*|doc\s*\d*|scan\s*\d*|img\s*\d*|image\s*\d*|slide\s*\d*|diapositive\s*\d*|presentation\s*\d*|pr[ée]sentation\s*\d*|nouveau(\s+(document|cours))?|fichier\s*\d*|page\s*\d*|camscanner[\s\d_-]*|whatsapp[\s\d_-]*|pdf\s*\d*|pptx?\s*\d*|cours\s*\d*|svt\s*\d*|\d+)$/i.test(normalized);
}

export function analyzeSvtDocumentContent(
  rawText: string,
  filename: string,
  info?: { Title?: string }
): SvtExtractedMetadata {
  const lower = (rawText + ' ' + filename).toLowerCase();

  // Grade level detection for Moroccan Collège
  let gradeLevel: '1AC' | '2AC' | '3AC' = '3AC';
  if (
    lower.includes('1ac') ||
    lower.includes('1 asc') ||
    lower.includes('1ère année') ||
    lower.includes('première année') ||
    lower.includes('السنة الأولى') ||
    lower.includes('milieu naturel') ||
    lower.includes('respiration des êtres vivants') ||
    lower.includes('végétaux chlorophylliens') ||
    lower.includes('relations alimentaires')
  ) {
    gradeLevel = '1AC';
  } else if (
    lower.includes('2ac') ||
    lower.includes('2 asc') ||
    lower.includes('2ème année') ||
    lower.includes('deuxième année') ||
    lower.includes('السنة الثانية') ||
    lower.includes('tectonique') ||
    lower.includes('séisme') ||
    lower.includes('seisme') ||
    lower.includes('volcan') ||
    lower.includes('dérive des continents') ||
    lower.includes('roches magmatiques') ||
    lower.includes('reproduction chez les animaux')
  ) {
    gradeLevel = '2AC';
  } else if (
    lower.includes('3ac') ||
    lower.includes('3 asc') ||
    lower.includes('3ème année') ||
    lower.includes('troisième année') ||
    lower.includes('السنة الثالثة') ||
    lower.includes('digestion') ||
    lower.includes('nerveux') ||
    lower.includes('immunité') ||
    lower.includes('immunite') ||
    lower.includes('nutriment') ||
    lower.includes('absorption') ||
    lower.includes('circulation sanguine') ||
    lower.includes('excrétion urinaire')
  ) {
    gradeLevel = '3AC';
  }

  // Semester detection
  let semester: 1 | 2 = 1;
  if (
    lower.includes('semestre 2') ||
    lower.includes('semestre ii') ||
    /\bs2\b/.test(lower) ||
    lower.includes('الدورة الثانية') ||
    lower.includes('système nerveux') ||
    lower.includes('immunité') ||
    lower.includes('immunite') ||
    lower.includes('géologie externe') ||
    lower.includes('reproduction chez les animaux') ||
    lower.includes('reproduction humaine')
  ) {
    semester = 2;
  }

  // Moroccan official unit titles
  const themeTitle =
    gradeLevel === '1AC'
      ? semester === 2
        ? 'Unité 2 : Les phénomènes géologiques externes'
        : 'Unité 1 : Les relations entre les êtres vivants et leurs interactions avec les milieux'
      : gradeLevel === '2AC'
      ? semester === 2
        ? "Unité 2 : La reproduction chez les êtres vivants et l'hérédité humaine"
        : 'Unité 1 : Les phénomènes géologiques internes'
      : semester === 2
      ? "Unité 2 : Les fonctions de communication et l'immunité"
      : "Unité 1 : Les fonctions de nutrition et l'éducation nutritionnelle";

  const themeTitleAr =
    gradeLevel === '1AC'
      ? semester === 2
        ? 'الوحدة 2 : الظواهر الجيولوجية الخارجية'
        : 'الوحدة 1 : العلاقات بين الكائنات الحية وتفاعلها مع أوساط عيشها'
      : gradeLevel === '2AC'
      ? semester === 2
        ? 'الوحدة 2 : التوالد عند الكائنات الحية والوراثة البشرية'
        : 'الوحدة 1 : الظواهر الجيولوجية الباطنية'
      : semester === 2
      ? 'الوحدة 2 : وظائف التواصل والمناعة'
      : 'الوحدة 1 : وظائف الاقتيات والتربية الغذائية';

  // Title detection
  let title = '';
  let titleAr = '';

  // 1. Check document metadata Title (cleaning Word/PowerPoint prefixes)
  if (info && info.Title && typeof info.Title === 'string') {
    const cleanedMetaTitle = info.Title.replace(
      /^(microsoft word|microsoft powerpoint|powerpoint|word)\s*[-–:]\s*/i,
      ''
    )
      .replace(/\.(docx?|pptx?|pdf)$/i, '')
      .trim();
    if (cleanedMetaTitle.length > 3 && !isGenericDocumentName(cleanedMetaTitle)) {
      title = cleanedMetaTitle;
    }
  }

  // 2. Scan extracted document text for headers and French titles
  if (!title && rawText) {
    const lines = rawText
      .split('\n')
      .map(l => l.replace(/\s+/g, ' ').trim())
      .filter(l => l.length >= 4 && l.length <= 120);

    // 2a. Explicit French heading labels (e.g. "Chapitre 1 : La digestion", "Leçon n°2 - ...")
    for (const line of lines.slice(0, 30)) {
      const match = line.match(
        /^(?:le[çc]on|chapitre|cours|titre|module|th[èe]me|s[ée]quence|partie)\s*(?:n[°o]?|num[ée]ro)?\s*[0-9ivx]*\s*[:\-–.]\s*(.+)/i
      );
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (candidate.length >= 4 && /[a-zA-ZÀ-ÿ]{3,}/.test(candidate) && !isGenericDocumentName(candidate)) {
          title = candidate;
          break;
        }
      }
    }

    // 2b. Known French SVT title openers (including "L'absorption...", "1. La digestion...")
    if (!title && lines.length > 0) {
      const candidate = lines.slice(0, 25).find(l => {
        const stripped = l.replace(/^(?:[0-9]+|[ivx]+)[.)\-–]\s*/i, '').trim();
        return (
          stripped.length >= 5 &&
          stripped.length <= 100 &&
          /^(le|la|les|l'|un|une|des|d'|étude|notion|introduction|structure|digestion|respiration|tectonique|séisme|seisme|volcan|immunité|reproduction|système|fonction|nutrition|alimentation|circulation|excrétion|relations?|découverte)\b/i.test(
            stripped
          ) &&
          !isGenericDocumentName(stripped)
        );
      });
      if (candidate) {
        title = candidate.replace(/^(?:[0-9]+|[ivx]+)[.)\-–]\s*/i, '').trim();
      }
    }

    // 2c. Fallback to first meaningful French line skipping administrative headers
    if (!title && lines.length > 0) {
      const boilerplatePattern =
        /^(royaume du maroc|minist[èe]re|acad[ée]mie|direction|d[ée]l[ée]gation|ann[ée]e scolaire|coll[èe]ge|lyc[ée]e|sciences de la vie|svt\b|prof(?:esseur)?\b|pr\.|semestre\s*\d|unit[ée]\s*\d|page\s*\d|diapositive\s*\d|\d+\s*\/\s*\d+|1ac|2ac|3ac)/i;
      const meaningfulLine = lines.slice(0, 25).find(l => {
        const hasFrenchLetters = /[a-zA-ZÀ-ÿ]{3,}/.test(l);
        const isBoilerplate = boilerplatePattern.test(l);
        return hasFrenchLetters && !isBoilerplate && !isGenericDocumentName(l) && l.length >= 6 && l.length <= 100;
      });
      if (meaningfulLine) {
        title = meaningfulLine;
      }
    }
  }

  // 3. Clean filename fallback (works even if PDF was scanned or PPT had images only)
  if (!title && filename) {
    const rawBase = filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const withoutTags = rawBase
      .replace(/\b(cours|svt|college|pro|1ac|2ac|3ac|s1|s2|semestre\s*[12]|pdf|pptx?|doc|diapo|presentation|maroc)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const chosen = withoutTags.length > 3 ? withoutTags : rawBase;
    if (chosen.length > 3 && /[a-zA-ZÀ-ÿ]{3,}/.test(chosen) && !isGenericDocumentName(chosen)) {
      title = chosen.charAt(0).toUpperCase() + chosen.slice(1);
    }
  }

  // Arabic counterpart mapping for Moroccan SVT curriculum
  const titleLower = title.toLowerCase();
  if (titleLower.includes('photosynth')) {
    titleAr = 'التركيب الضوئي وإنتاج المادة العضوية';
  } else if (titleLower.includes('digestion')) {
    titleAr = 'هضم الأغذية والامتصاص المعوي';
  } else if (titleLower.includes('respiration')) {
    titleAr = 'التنفس في أوساط عيش مختلفة';
  } else if (titleLower.includes('nerveux')) {
    titleAr = 'الجهاز العصبي والتحركية الإرادية واللاإرادية';
  } else if (titleLower.includes('immunit')) {
    titleAr = 'المناعة وعلم المناعة';
  } else if (titleLower.includes('volcan')) {
    titleAr = 'البراكين وعلاقتها بتكتونية الصفائح';
  } else if (titleLower.includes('séisme') || titleLower.includes('seisme')) {
    titleAr = 'الزلازل وعلاقتها بتكتونية الصفائح';
  } else if (titleLower.includes('tectonique') || titleLower.includes('dérive') || titleLower.includes('derive')) {
    titleAr = 'تكتونية الصفائح وزحزحة القارات';
  } else if (titleLower.includes('milieu') || titleLower.includes('cellule')) {
    titleAr = 'استكشاف وسط طبيعي وملاحظة الخلية';
  } else if (titleLower.includes('circul') || titleLower.includes('sang')) {
    titleAr = 'الدوران الدموي والقلب';
  } else if (titleLower.includes('reproduct')) {
    titleAr = 'التوالد عند الكائنات الحية';
  }

  return {
    title,
    titleAr,
    gradeLevel,
    semester,
    themeTitle,
    themeTitleAr,
    chapterTitle: `Chapitre : ${title || 'Notions Fondamentales'}`,
    chapterTitleAr: `الفصل : ${titleAr || 'المفاهيم الأساسية'}`,
    summary:
      rawText.length > 50
        ? rawText.slice(0, 260).replace(/\s+/g, ' ') + '...'
        : 'Document et support de cours conforme aux orientations pédagogiques officielles du collège marocain.',
    summaryAr: 'درس ووثيقة مطابقة للتوجيهات التربوية الرسمية لوزارة التربية الوطنية المغربية.',
    objectives: [
      'Maîtriser les notions scientifiques clés conformément au manuel scolaire marocain.',
      "Exploiter les données d'observation et expérimentales présentées dans la leçon.",
    ],
    objectivesAr: [
      'استيعاب المفاهيم العلمية الأساسية وفق المنهاج الدراسي المغربي.',
      'استثمار معطيات الملاحظة والتجارب العلمية الواردة في الدرس.',
    ],
  };
}
