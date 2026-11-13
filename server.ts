import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { GoogleGenAI } from '@google/genai';
import {
  analyzeSvtDocumentContent,
  detectDocumentKind,
  extractLegacyPptText,
  extractPptxContent,
} from './server/documentParser';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPort = (): number => {
  const portFlagIdx = process.argv.findIndex(arg => arg === '--port' || arg === '-p');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const cliPort = Number(process.argv[portFlagIdx + 1]);
    if (!Number.isNaN(cliPort) && cliPort > 0) return cliPort;
  }
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.PORT &&
    process.env.NGINX_PORT &&
    process.env.PORT === process.env.NGINX_PORT
  ) {
    return Number(process.env.DEFAULT_APP_PORT) || 3000;
  }
  return Number(process.env.PORT) || 3000;
};

const app = express();
const PORT = getPort();
const HOST = '0.0.0.0';

// Allow up to 50MB for rich PDF and PowerPoint uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cloud Healthcheck endpoint for Cloud Run and load balancers
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

// Intelligent PDF & PowerPoint (PPT / PPTX) Course Extraction Handler
async function handleParseDocument(req: Request, res: Response) {
  try {
    const rawBase64 = req.body.fileBase64 || req.body.pdfBase64;
    const filename: string = req.body.filename || 'cours.pdf';

    if (!rawBase64) {
      return res.status(400).json({ error: 'Fichier document manquant (base64 requis).' });
    }

    // Strip any data URI base64 prefix (application/pdf, vnd.ms-powerpoint, presentationml, octet-stream, etc.)
    const cleanBase64 = String(rawBase64).replace(/^data:[^;]*;base64,/i, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const kind = detectDocumentKind(filename, buffer);
    let rawText = '';
    let pageCount = 1;
    let docInfo: { Title?: string } = {};

    if (kind === 'pptx') {
      try {
        const pptx = await extractPptxContent(buffer);
        rawText = pptx.text;
        pageCount = pptx.slideCount || 1;
        if (pptx.titleFromMeta) docInfo.Title = pptx.titleFromMeta;
      } catch (pptxErr: any) {
        console.warn('PPTX parse warning, continuing with filename/fallback:', pptxErr?.message);
      }
    } else if (kind === 'ppt') {
      try {
        const ppt = extractLegacyPptText(buffer);
        rawText = ppt.text;
        pageCount = ppt.slideCount || 1;
      } catch (pptErr: any) {
        console.warn('PPT parse warning, continuing with filename/fallback:', pptErr?.message);
      }
    } else {
      try {
        const pdfData = await pdfParse(buffer);
        rawText = (pdfData.text || '').replace(/\r\n?/g, '\n').trim();
        pageCount = pdfData.numpages || 1;
        docInfo = pdfData.info || {};
      } catch (parseErr: any) {
        console.warn('PDF parse warning, processing as scanned document:', parseErr?.message);
      }
    }

    rawText = rawText.replace(/\r\n?/g, '\n').trim();
    const compactText = rawText.replace(/\s+/g, ' ').trim();
    const hasReadableWords = /[a-zA-ZÀ-ÿ\u0600-\u06FF]{3,}/.test(compactText);
    const isScanned = compactText.length < 12 || !hasReadableWords;

    // Analyze using Moroccan SVT curriculum heuristics
    const analysis = analyzeSvtDocumentContent(rawText, filename, docInfo);

    // If Gemini API is available and document contains text, refine analysis with AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!isScanned && apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const docLabel = kind === 'pdf' ? 'PDF' : 'PowerPoint';
        const geminiPrompt = `Tu es un inspecteur pédagogique expert de SVT au collège marocain (1AC, 2AC, 3AC).
Analyse cet extrait de cours ${docLabel} et renvoie UNIQUEMENT un objet JSON valide avec cette structure :
{
  "title": "Titre du cours en français (court, fidèle au programme marocain)",
  "titleAr": "عنوان الدرس بالعربية حسب المقرر المغربي الرسمي",
  "gradeLevel": "1AC" ou "2AC" ou "3AC",
  "semester": 1 ou 2,
  "themeTitle": "Unité / Thème officiel marocain",
  "themeTitleAr": "عنوان الوحدة الرسمي",
  "chapterTitle": "Titre du chapitre",
  "chapterTitleAr": "عنوان الفصل",
  "summary": "Résumé scientifique en français (2-3 phrases)",
  "summaryAr": "ملخص علمي باللغة العربية",
  "objectives": ["Objectif pédagogique 1", "Objectif 2"],
  "objectivesAr": ["هدف تعلمي 1", "هدف 2"]
}

Texte extrait du document ${docLabel} :
${rawText.slice(0, 3500)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: geminiPrompt,
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.title) analysis.title = parsed.title;
          if (parsed.titleAr) analysis.titleAr = parsed.titleAr;
          if (['1AC', '2AC', '3AC'].includes(parsed.gradeLevel)) analysis.gradeLevel = parsed.gradeLevel;
          if (parsed.semester === 1 || parsed.semester === 2) analysis.semester = parsed.semester;
          if (parsed.themeTitle) analysis.themeTitle = parsed.themeTitle;
          if (parsed.themeTitleAr) analysis.themeTitleAr = parsed.themeTitleAr;
          if (parsed.chapterTitle) analysis.chapterTitle = parsed.chapterTitle;
          if (parsed.chapterTitleAr) analysis.chapterTitleAr = parsed.chapterTitleAr;
          if (parsed.summary) analysis.summary = parsed.summary;
          if (parsed.summaryAr) analysis.summaryAr = parsed.summaryAr;
          if (Array.isArray(parsed.objectives) && parsed.objectives.length > 0) analysis.objectives = parsed.objectives;
          if (Array.isArray(parsed.objectivesAr) && parsed.objectivesAr.length > 0) analysis.objectivesAr = parsed.objectivesAr;
        }
      } catch (geminiErr: any) {
        console.warn('Gemini extraction refinement fallback:', geminiErr?.message);
      }
    }

    return res.json({
      success: true,
      documentKind: kind,
      fileType: kind === 'pdf' ? 'pdf' : 'ppt',
      hasText: !isScanned,
      isScanned,
      pageCount,
      slideCount: kind === 'pdf' ? undefined : pageCount,
      extracted: analysis,
      rawSnippet: rawText.slice(0, 400)
    });
  } catch (err: any) {
    console.error('Server error /api/parse-document:', err);
    res.status(500).json({ error: 'Erreur interne lors du traitement du document.' });
  }
}

app.post('/api/parse-pdf', handleParseDocument);
app.post('/api/parse-document', handleParseDocument);

// Dedicated SVT Pedagogical Gemini AI Endpoint
app.post('/api/gemini', async (req: Request, res: Response) => {
  try {
    const { prompt, gradeLevel, language, mode } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Le prompt est requis.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Free tier system instruction for Moroccan SVT
    const systemInstruction = `Tu es l'assistant pédagogique officiel de SVT COLLÈGE PRO, expert du programme marocain de Sciences de la Vie et de la Terre (SVT) pour le collège (1AC, 2AC, 3AC).
Langue de réponse : ${language === 'ar' ? 'Arabe scientifique clair et précis (اللغة العربية العلمية)' : 'Français scientifique rigoureux et accessible'}.
Niveau scolaire de l'élève : ${gradeLevel || 'Collège Marocain'}.
Règles :
1. Explique les concepts scientifiques avec pédagogie, clarté et précision conformément aux manuels marocains officiels (Al Massar, Al Moufid, etc.).
2. N'invente jamais de faits scientifiques.
3. Si le mode est 'explain', donne une explication structurée avec analogies du quotidien.
4. Si le mode is 'quiz', génère 3 questions d'entraînement avec barème et correction détaillée.
5. Si le mode is 'fiche', génère une fiche de révision synthétique avec définitions clés et schéma à retenir.
6. Sois bienveillant, encourageant et motivant.`;

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });

        const replyText = response.text || '';
        return res.json({ reply: replyText, source: 'gemini-2.5-flash-free' });
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to local SVT pedagogical engine:', geminiError?.message);
      }
    }

    // Intelligent built-in educational fallback (100% free, offline, instant)
    const fallbackResponse = generateLocalSvtResponse(prompt, gradeLevel, language, mode);
    return res.json({ reply: fallbackResponse, source: 'svt-pedagogical-engine' });
  } catch (err: any) {
    console.error('Server error /api/gemini:', err);
    res.status(500).json({ error: 'Erreur interne lors du traitement de la requête.' });
  }
});

function generateLocalSvtResponse(prompt: string, gradeLevel = '3AC', language = 'fr', mode = 'explain'): string {
  const isAr = language === 'ar';
  const query = prompt.toLowerCase();

  if (query.includes('photosynth') || query.includes('تركيب ضوئي') || query.includes('amidon') || query.includes('نشا')) {
    if (isAr) {
      return `### 🌿 شرح علمي مبسط: التركيب الضوئي (Photosynthèse)

**1. المفهوم الأساسي:**
التركيب الضوئي هو الظاهرة الحيوية التي تمكن النباتات الخضراء (اليخضورية) من إنتاج مادتها العضوية (النشا والسكريات) انطلاقاً من عناصر معدنية بسيطة.

**2. الشروط الضرورية:**
- **الضوء:** مصدر الطاقة الأساسي.
- **اليخضور (الكلوروفيل):** صبغة خضراء تمتص أشعة الشمس في البلاستيدات الخضراء.
- **ثنائي أكسيد الكربون (CO2):** يُمتص من الهواء عبر الثغور الورقية.
- **الماء والأملاح المعدنية:** يمتصها النبات من التربة عبر الزغب الماص بالجذور (النسغ الناقص).

**3. النتيجة والتجربة الدالة:**
- تركيب مادة عضوية (النشا الذي نكشف عنه بواسطة **الماء اليودي** فيتلون بالأزرق الداكن).
- طرح غاز **ثنائي الأكسجين (O2)** كناتج ثانوي ينعش الغلاف الجوي!`;
    }
    return `### 🌿 Fiche Pédagogique : La Photosynthèse (Programme 1AC & 3AC)

**1. Définition clé :**
La photosynthèse est le processus biochimique permettant aux végétaux chlorophylliens (producteurs primaires) de synthétiser leur propre matière organique (amidon, glucides) à partir de matière minérale.

**2. Les conditions indispensables :**
- **Lumière solaire** : source d'énergie lumineuse captée par les pigments.
- **Chlorophylle** : contenue dans les chloroplastes des cellules végétales.
- **Dioxyde de carbone (CO2)** : absorbé dans l'air via les stomates foliaires.
- **Eau et sels minéraux** : puisés dans le sol par les poils absorbants (sève brute).

**3. Bilan chimique simplifié :**
6 CO₂ + 6 H₂O + Énergie lumineuse ➔ C₆H₁₂O₆ (Glucose / Amidon) + 6 O₂

**4. Expérience de confirmation :**
Le test à l'**eau iodée** (jaune-brun) permet de prouver la synthèse d'amidon : la feuille décolorée vire au bleu-noir uniquement dans les zones ayant reçu de la lumière.`;
  }

  if (query.includes('digestion') || query.includes('هضم') || query.includes('enzyme') || query.includes('قيت') || query.includes('amylase')) {
    if (isAr) {
      return `### 🍎 خلاصة هضم الأغذية ومواد القيت (3AC)

**1. تبسيط الأغذية عبر الجهاز الهضمي:**
- **النشا** (سكر ضخم) ➔ مالتوز بواسطة **أنزيم النشاوز اللعابي** في الفم (37°C) ➔ غلوكوز بواسطة أنزيم المالتاز في المعي الدقيق.
- **البروتيدات** ➔ ببتيدات ➔ **أحماض أمينية** بواسطة أنزيمات البروتياز والبيبتيداز.
- **الدهنيات** ➔ بعد استحيلابها بأملاح الصفراء الكبدية ➔ **أحماض دهنية وغليسيرول** بواسطة الليباز.

**2. مصير مواد القيت:**
تمر مواد القيت الناتجة عبر جدار **الخملات المعوية** في ظاهرة تدعى **الامتصاص المعوي** :
- المسلك الدموي : الماء، الأملاح، الفيتامينات، الغلوكوز، الأحماض الأمينية.
- المسلك اللمفاوي : الأحماض الدهنية والغليسيرول.`;
    }
    return `### 🍎 Fiche de Révision SVT 3AC : La Digestion Chimique

**1. La simplification moléculaire :**
Les grosses molécules alimentaires insolubles sont découpées en nutriments simples assimilables :
- **Amidon** ➔ Maltose (par l'amylase salivaire à 37°C) ➔ **Glucose** (par la maltase intestinale).
- **Protéines** ➔ Peptides ➔ **Acides aminés** (par les protéases et peptidases).
- **Lipides** ➔ Émulsionnés par la bile ➔ **Acides gras + Glycérol** (par la lipase pancréatique).

**2. L'absorption intestinale :**
Elle s'opère au niveau des **villosités intestinales** qui offrent une immense surface d'échange vascularisée (~300 m²).`;
  }

  if (isAr) {
    return `### 💡 إجابة المساعد البيداغوجي لـ SVT COLLÈGE PRO (${gradeLevel})

مرحباً بك يا بطل العلوم! بالنسبة لسؤالك: **"${prompt}"**

**خلاصة منهجية حسب المقرر المغربي الرسمي:**
1. تذكر دائماً البدء بتحديد الظاهرة البيولوجية أو الجيولوجية وملاحظة المعطيات التجريبية.
2. ميز بين الفرضية العلمية والاستنتاج المبني على التجربة الملموسة.
3. يمكنك اختبار هذه الظاهرة عملياً في **المختبر الافتراضي** للتطبيق وتثبيت المعارف!

هل تود أن نطرح عليك تمريناً تدريبياً مع عناصر الإجابة وسلم التنقيط؟`;
  }

  return `### 💡 Réponse du Tuteur Pédagogique SVT COLLÈGE PRO (${gradeLevel})

Excellente question relative au programme de SVT collège marocain !

Concernant : **"${prompt}"**

**Méthode de raisonnement scientifique :**
1. **Observation** : Analyser les données ou le document fourni (graphique, schéma, tableau).
2. **Interprétation** : Mettre en relation la cause et la conséquence biologique ou géologique.
3. **Conclusion** : Formuler la règle scientifique validée par l'expérience.

N'hésite pas à explorer notre **Laboratoire Virtuel** pour manipuler cette expérience en direct et consolider tes acquis pour le brevet !`;
}

// Development or Production Server
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(process.cwd(), 'dist');

  if (!isProduction) {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: {
          middlewareMode: true,
          hmr: hmrDisabled ? false : undefined,
        },
        appType: 'spa',
      })
    );

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`SVT COLLÈGE PRO server running on http://${HOST}:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });

  // Graceful shutdown on Cloud Run container stop
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing server');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing server');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception logged:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

startServer();
