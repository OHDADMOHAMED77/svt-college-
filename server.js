// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { GoogleGenAI } from "@google/genai";

// server/documentParser.ts
import JSZip from "jszip";
function decodeXmlEntities(input) {
  return input.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}
function detectDocumentKind(filename, buffer) {
  const lower = (filename || "").toLowerCase().trim();
  if (lower.endsWith(".pptx")) return "pptx";
  if (lower.endsWith(".ppt")) return "ppt";
  if (lower.endsWith(".pdf")) return "pdf";
  if (buffer && buffer.length >= 4) {
    if (buffer[0] === 80 && buffer[1] === 75 && buffer[2] === 3 && buffer[3] === 4) {
      return "pptx";
    }
    if (buffer[0] === 208 && buffer[1] === 207 && buffer[2] === 17 && buffer[3] === 224) {
      return "ppt";
    }
    if (buffer.subarray(0, 4).toString("ascii") === "%PDF") {
      return "pdf";
    }
  }
  return "pdf";
}
async function extractPptxContent(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  let titleFromMeta = "";
  const coreXmlFile = zip.file("docProps/core.xml");
  if (coreXmlFile) {
    const coreXml = await coreXmlFile.async("string");
    const titleMatch = coreXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    if (titleMatch && titleMatch[1]) {
      titleFromMeta = decodeXmlEntities(titleMatch[1]).replace(/\s+/g, " ").trim();
    }
  }
  const slideEntries = Object.keys(zip.files).map((name) => {
    const m = name.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    return m ? { name, index: Number(m[1]) } : null;
  }).filter((item) => item !== null).sort((a, b) => a.index - b.index);
  const slideTexts = [];
  for (const slide of slideEntries) {
    const xml = await zip.file(slide.name).async("string");
    const paragraphs = xml.split(/<\/a:p>/i);
    const lines = [];
    for (const para of paragraphs) {
      const textRuns = [...para.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi)].map((m) => decodeXmlEntities(m[1])).join("");
      const cleanLine = textRuns.replace(/\s+/g, " ").trim();
      if (cleanLine) {
        lines.push(cleanLine);
      }
    }
    if (lines.length > 0) {
      slideTexts.push(lines.join("\n"));
    }
  }
  return {
    text: slideTexts.join("\n").trim(),
    slideCount: slideEntries.length || 1,
    titleFromMeta
  };
}
function extractLegacyPptText(buffer) {
  const extractedLines = [];
  const seen = /* @__PURE__ */ new Set();
  const noisePattern = /^(powerpoint document|current user|summaryinformation|documentsummaryinformation|root entry|microsoft|times new roman|arial|calibri|cambria|wingdings|symbol|tahoma|verdana|default design|slide\s*\d+|master|office theme|p[\x00-\x7f]{0,3}pt|content_types)/i;
  const pushCandidate = (raw) => {
    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (cleaned.length >= 5 && cleaned.length <= 240 && /[a-zA-ZÀ-ÿ\u0600-\u06FF]{3,}/.test(cleaned) && !noisePattern.test(cleaned) && !seen.has(cleaned)) {
      seen.add(cleaned);
      extractedLines.push(cleaned);
    }
  };
  let currentUtf16 = "";
  for (let i = 0; i + 1 < buffer.length; i += 2) {
    const code = buffer.readUInt16LE(i);
    const isReadableChar = code >= 32 && code <= 126 || code >= 160 && code <= 383 || code >= 1536 && code <= 1791;
    if (isReadableChar) {
      currentUtf16 += String.fromCharCode(code);
    } else {
      if (currentUtf16.length >= 5) {
        pushCandidate(currentUtf16);
      }
      currentUtf16 = "";
    }
  }
  if (currentUtf16.length >= 5) {
    pushCandidate(currentUtf16);
  }
  let currentByteStr = "";
  for (let i = 0; i < buffer.length; i++) {
    const b = buffer[i];
    const isReadableByte = b >= 32 && b <= 126 || b >= 192 && b <= 255;
    if (isReadableByte) {
      currentByteStr += String.fromCharCode(b);
    } else {
      if (currentByteStr.length >= 6) {
        pushCandidate(currentByteStr);
      }
      currentByteStr = "";
    }
  }
  if (currentByteStr.length >= 6) {
    pushCandidate(currentByteStr);
  }
  return {
    text: extractedLines.join("\n").trim(),
    slideCount: 1
  };
}
function isGenericDocumentName(value) {
  const normalized = value.toLowerCase().trim();
  return /^(untitled|sans titre|document\s*\d*|doc\s*\d*|scan\s*\d*|img\s*\d*|image\s*\d*|slide\s*\d*|diapositive\s*\d*|presentation\s*\d*|pr[ée]sentation\s*\d*|nouveau(\s+(document|cours))?|fichier\s*\d*|page\s*\d*|camscanner[\s\d_-]*|whatsapp[\s\d_-]*|pdf\s*\d*|pptx?\s*\d*|cours\s*\d*|svt\s*\d*|\d+)$/i.test(normalized);
}
function analyzeSvtDocumentContent(rawText, filename, info) {
  const lower = (rawText + " " + filename).toLowerCase();
  let gradeLevel = "3AC";
  if (lower.includes("1ac") || lower.includes("1 asc") || lower.includes("1\xE8re ann\xE9e") || lower.includes("premi\xE8re ann\xE9e") || lower.includes("\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0623\u0648\u0644\u0649") || lower.includes("milieu naturel") || lower.includes("respiration des \xEAtres vivants") || lower.includes("v\xE9g\xE9taux chlorophylliens") || lower.includes("relations alimentaires")) {
    gradeLevel = "1AC";
  } else if (lower.includes("2ac") || lower.includes("2 asc") || lower.includes("2\xE8me ann\xE9e") || lower.includes("deuxi\xE8me ann\xE9e") || lower.includes("\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u062B\u0627\u0646\u064A\u0629") || lower.includes("tectonique") || lower.includes("s\xE9isme") || lower.includes("seisme") || lower.includes("volcan") || lower.includes("d\xE9rive des continents") || lower.includes("roches magmatiques") || lower.includes("reproduction chez les animaux")) {
    gradeLevel = "2AC";
  } else if (lower.includes("3ac") || lower.includes("3 asc") || lower.includes("3\xE8me ann\xE9e") || lower.includes("troisi\xE8me ann\xE9e") || lower.includes("\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u062B\u0627\u0644\u062B\u0629") || lower.includes("digestion") || lower.includes("nerveux") || lower.includes("immunit\xE9") || lower.includes("immunite") || lower.includes("nutriment") || lower.includes("absorption") || lower.includes("circulation sanguine") || lower.includes("excr\xE9tion urinaire")) {
    gradeLevel = "3AC";
  }
  let semester = 1;
  if (lower.includes("semestre 2") || lower.includes("semestre ii") || /\bs2\b/.test(lower) || lower.includes("\u0627\u0644\u062F\u0648\u0631\u0629 \u0627\u0644\u062B\u0627\u0646\u064A\u0629") || lower.includes("syst\xE8me nerveux") || lower.includes("immunit\xE9") || lower.includes("immunite") || lower.includes("g\xE9ologie externe") || lower.includes("reproduction chez les animaux") || lower.includes("reproduction humaine")) {
    semester = 2;
  }
  const themeTitle = gradeLevel === "1AC" ? semester === 2 ? "Unit\xE9 2 : Les ph\xE9nom\xE8nes g\xE9ologiques externes" : "Unit\xE9 1 : Les relations entre les \xEAtres vivants et leurs interactions avec les milieux" : gradeLevel === "2AC" ? semester === 2 ? "Unit\xE9 2 : La reproduction chez les \xEAtres vivants et l'h\xE9r\xE9dit\xE9 humaine" : "Unit\xE9 1 : Les ph\xE9nom\xE8nes g\xE9ologiques internes" : semester === 2 ? "Unit\xE9 2 : Les fonctions de communication et l'immunit\xE9" : "Unit\xE9 1 : Les fonctions de nutrition et l'\xE9ducation nutritionnelle";
  const themeTitleAr = gradeLevel === "1AC" ? semester === 2 ? "\u0627\u0644\u0648\u062D\u062F\u0629 2 : \u0627\u0644\u0638\u0648\u0627\u0647\u0631 \u0627\u0644\u062C\u064A\u0648\u0644\u0648\u062C\u064A\u0629 \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629" : "\u0627\u0644\u0648\u062D\u062F\u0629 1 : \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0628\u064A\u0646 \u0627\u0644\u0643\u0627\u0626\u0646\u0627\u062A \u0627\u0644\u062D\u064A\u0629 \u0648\u062A\u0641\u0627\u0639\u0644\u0647\u0627 \u0645\u0639 \u0623\u0648\u0633\u0627\u0637 \u0639\u064A\u0634\u0647\u0627" : gradeLevel === "2AC" ? semester === 2 ? "\u0627\u0644\u0648\u062D\u062F\u0629 2 : \u0627\u0644\u062A\u0648\u0627\u0644\u062F \u0639\u0646\u062F \u0627\u0644\u0643\u0627\u0626\u0646\u0627\u062A \u0627\u0644\u062D\u064A\u0629 \u0648\u0627\u0644\u0648\u0631\u0627\u062B\u0629 \u0627\u0644\u0628\u0634\u0631\u064A\u0629" : "\u0627\u0644\u0648\u062D\u062F\u0629 1 : \u0627\u0644\u0638\u0648\u0627\u0647\u0631 \u0627\u0644\u062C\u064A\u0648\u0644\u0648\u062C\u064A\u0629 \u0627\u0644\u0628\u0627\u0637\u0646\u064A\u0629" : semester === 2 ? "\u0627\u0644\u0648\u062D\u062F\u0629 2 : \u0648\u0638\u0627\u0626\u0641 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0648\u0627\u0644\u0645\u0646\u0627\u0639\u0629" : "\u0627\u0644\u0648\u062D\u062F\u0629 1 : \u0648\u0638\u0627\u0626\u0641 \u0627\u0644\u0627\u0642\u062A\u064A\u0627\u062A \u0648\u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u063A\u0630\u0627\u0626\u064A\u0629";
  let title = "";
  let titleAr = "";
  if (info && info.Title && typeof info.Title === "string") {
    const cleanedMetaTitle = info.Title.replace(
      /^(microsoft word|microsoft powerpoint|powerpoint|word)\s*[-–:]\s*/i,
      ""
    ).replace(/\.(docx?|pptx?|pdf)$/i, "").trim();
    if (cleanedMetaTitle.length > 3 && !isGenericDocumentName(cleanedMetaTitle)) {
      title = cleanedMetaTitle;
    }
  }
  if (!title && rawText) {
    const lines = rawText.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l.length >= 4 && l.length <= 120);
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
    if (!title && lines.length > 0) {
      const candidate = lines.slice(0, 25).find((l) => {
        const stripped = l.replace(/^(?:[0-9]+|[ivx]+)[.)\-–]\s*/i, "").trim();
        return stripped.length >= 5 && stripped.length <= 100 && /^(le|la|les|l'|un|une|des|d'|étude|notion|introduction|structure|digestion|respiration|tectonique|séisme|seisme|volcan|immunité|reproduction|système|fonction|nutrition|alimentation|circulation|excrétion|relations?|découverte)\b/i.test(
          stripped
        ) && !isGenericDocumentName(stripped);
      });
      if (candidate) {
        title = candidate.replace(/^(?:[0-9]+|[ivx]+)[.)\-–]\s*/i, "").trim();
      }
    }
    if (!title && lines.length > 0) {
      const boilerplatePattern = /^(royaume du maroc|minist[èe]re|acad[ée]mie|direction|d[ée]l[ée]gation|ann[ée]e scolaire|coll[èe]ge|lyc[ée]e|sciences de la vie|svt\b|prof(?:esseur)?\b|pr\.|semestre\s*\d|unit[ée]\s*\d|page\s*\d|diapositive\s*\d|\d+\s*\/\s*\d+|1ac|2ac|3ac)/i;
      const meaningfulLine = lines.slice(0, 25).find((l) => {
        const hasFrenchLetters = /[a-zA-ZÀ-ÿ]{3,}/.test(l);
        const isBoilerplate = boilerplatePattern.test(l);
        return hasFrenchLetters && !isBoilerplate && !isGenericDocumentName(l) && l.length >= 6 && l.length <= 100;
      });
      if (meaningfulLine) {
        title = meaningfulLine;
      }
    }
  }
  if (!title && filename) {
    const rawBase = filename.replace(/\.[^/.]+$/, "").replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
    const withoutTags = rawBase.replace(/\b(cours|svt|college|pro|1ac|2ac|3ac|s1|s2|semestre\s*[12]|pdf|pptx?|doc|diapo|presentation|maroc)\b/gi, " ").replace(/\s+/g, " ").trim();
    const chosen = withoutTags.length > 3 ? withoutTags : rawBase;
    if (chosen.length > 3 && /[a-zA-ZÀ-ÿ]{3,}/.test(chosen) && !isGenericDocumentName(chosen)) {
      title = chosen.charAt(0).toUpperCase() + chosen.slice(1);
    }
  }
  const titleLower = title.toLowerCase();
  if (titleLower.includes("photosynth")) {
    titleAr = "\u0627\u0644\u062A\u0631\u0643\u064A\u0628 \u0627\u0644\u0636\u0648\u0626\u064A \u0648\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0645\u0627\u062F\u0629 \u0627\u0644\u0639\u0636\u0648\u064A\u0629";
  } else if (titleLower.includes("digestion")) {
    titleAr = "\u0647\u0636\u0645 \u0627\u0644\u0623\u063A\u0630\u064A\u0629 \u0648\u0627\u0644\u0627\u0645\u062A\u0635\u0627\u0635 \u0627\u0644\u0645\u0639\u0648\u064A";
  } else if (titleLower.includes("respiration")) {
    titleAr = "\u0627\u0644\u062A\u0646\u0641\u0633 \u0641\u064A \u0623\u0648\u0633\u0627\u0637 \u0639\u064A\u0634 \u0645\u062E\u062A\u0644\u0641\u0629";
  } else if (titleLower.includes("nerveux")) {
    titleAr = "\u0627\u0644\u062C\u0647\u0627\u0632 \u0627\u0644\u0639\u0635\u0628\u064A \u0648\u0627\u0644\u062A\u062D\u0631\u0643\u064A\u0629 \u0627\u0644\u0625\u0631\u0627\u062F\u064A\u0629 \u0648\u0627\u0644\u0644\u0627\u0625\u0631\u0627\u062F\u064A\u0629";
  } else if (titleLower.includes("immunit")) {
    titleAr = "\u0627\u0644\u0645\u0646\u0627\u0639\u0629 \u0648\u0639\u0644\u0645 \u0627\u0644\u0645\u0646\u0627\u0639\u0629";
  } else if (titleLower.includes("volcan")) {
    titleAr = "\u0627\u0644\u0628\u0631\u0627\u0643\u064A\u0646 \u0648\u0639\u0644\u0627\u0642\u062A\u0647\u0627 \u0628\u062A\u0643\u062A\u0648\u0646\u064A\u0629 \u0627\u0644\u0635\u0641\u0627\u0626\u062D";
  } else if (titleLower.includes("s\xE9isme") || titleLower.includes("seisme")) {
    titleAr = "\u0627\u0644\u0632\u0644\u0627\u0632\u0644 \u0648\u0639\u0644\u0627\u0642\u062A\u0647\u0627 \u0628\u062A\u0643\u062A\u0648\u0646\u064A\u0629 \u0627\u0644\u0635\u0641\u0627\u0626\u062D";
  } else if (titleLower.includes("tectonique") || titleLower.includes("d\xE9rive") || titleLower.includes("derive")) {
    titleAr = "\u062A\u0643\u062A\u0648\u0646\u064A\u0629 \u0627\u0644\u0635\u0641\u0627\u0626\u062D \u0648\u0632\u062D\u0632\u062D\u0629 \u0627\u0644\u0642\u0627\u0631\u0627\u062A";
  } else if (titleLower.includes("milieu") || titleLower.includes("cellule")) {
    titleAr = "\u0627\u0633\u062A\u0643\u0634\u0627\u0641 \u0648\u0633\u0637 \u0637\u0628\u064A\u0639\u064A \u0648\u0645\u0644\u0627\u062D\u0638\u0629 \u0627\u0644\u062E\u0644\u064A\u0629";
  } else if (titleLower.includes("circul") || titleLower.includes("sang")) {
    titleAr = "\u0627\u0644\u062F\u0648\u0631\u0627\u0646 \u0627\u0644\u062F\u0645\u0648\u064A \u0648\u0627\u0644\u0642\u0644\u0628";
  } else if (titleLower.includes("reproduct")) {
    titleAr = "\u0627\u0644\u062A\u0648\u0627\u0644\u062F \u0639\u0646\u062F \u0627\u0644\u0643\u0627\u0626\u0646\u0627\u062A \u0627\u0644\u062D\u064A\u0629";
  }
  return {
    title,
    titleAr,
    gradeLevel,
    semester,
    themeTitle,
    themeTitleAr,
    chapterTitle: `Chapitre : ${title || "Notions Fondamentales"}`,
    chapterTitleAr: `\u0627\u0644\u0641\u0635\u0644 : ${titleAr || "\u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629"}`,
    summary: rawText.length > 50 ? rawText.slice(0, 260).replace(/\s+/g, " ") + "..." : "Document et support de cours conforme aux orientations p\xE9dagogiques officielles du coll\xE8ge marocain.",
    summaryAr: "\u062F\u0631\u0633 \u0648\u0648\u062B\u064A\u0642\u0629 \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u062A\u0648\u062C\u064A\u0647\u0627\u062A \u0627\u0644\u062A\u0631\u0628\u0648\u064A\u0629 \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0644\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0648\u0637\u0646\u064A\u0629 \u0627\u0644\u0645\u063A\u0631\u0628\u064A\u0629.",
    objectives: [
      "Ma\xEEtriser les notions scientifiques cl\xE9s conform\xE9ment au manuel scolaire marocain.",
      "Exploiter les donn\xE9es d'observation et exp\xE9rimentales pr\xE9sent\xE9es dans la le\xE7on."
    ],
    objectivesAr: [
      "\u0627\u0633\u062A\u064A\u0639\u0627\u0628 \u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0648\u0641\u0642 \u0627\u0644\u0645\u0646\u0647\u0627\u062C \u0627\u0644\u062F\u0631\u0627\u0633\u064A \u0627\u0644\u0645\u063A\u0631\u0628\u064A.",
      "\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0645\u0639\u0637\u064A\u0627\u062A \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0629 \u0648\u0627\u0644\u062A\u062C\u0627\u0631\u0628 \u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0627\u0644\u0648\u0627\u0631\u062F\u0629 \u0641\u064A \u0627\u0644\u062F\u0631\u0633."
    ]
  };
}

// server.ts
var require2 = createRequire(import.meta.url);
var pdfParse = require2("pdf-parse");
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var getPort = () => {
  const portFlagIdx = process.argv.findIndex((arg) => arg === "--port" || arg === "-p");
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const cliPort = Number(process.argv[portFlagIdx + 1]);
    if (!Number.isNaN(cliPort) && cliPort > 0) return cliPort;
  }
  if (process.env.NODE_ENV !== "production" && process.env.PORT && process.env.NGINX_PORT && process.env.PORT === process.env.NGINX_PORT) {
    return Number(process.env.DEFAULT_APP_PORT) || 3e3;
  }
  return Number(process.env.PORT) || 3e3;
};
var app = express();
var PORT = getPort();
var HOST = "0.0.0.0";
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.get("/healthz", (_req, res) => {
  res.status(200).send("OK");
});
async function handleParseDocument(req, res) {
  try {
    const rawBase64 = req.body.fileBase64 || req.body.pdfBase64;
    const filename = req.body.filename || "cours.pdf";
    if (!rawBase64) {
      return res.status(400).json({ error: "Fichier document manquant (base64 requis)." });
    }
    const cleanBase64 = String(rawBase64).replace(/^data:[^;]*;base64,/i, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const kind = detectDocumentKind(filename, buffer);
    let rawText = "";
    let pageCount = 1;
    let docInfo = {};
    if (kind === "pptx") {
      try {
        const pptx = await extractPptxContent(buffer);
        rawText = pptx.text;
        pageCount = pptx.slideCount || 1;
        if (pptx.titleFromMeta) docInfo.Title = pptx.titleFromMeta;
      } catch (pptxErr) {
        console.warn("PPTX parse warning, continuing with filename/fallback:", pptxErr?.message);
      }
    } else if (kind === "ppt") {
      try {
        const ppt = extractLegacyPptText(buffer);
        rawText = ppt.text;
        pageCount = ppt.slideCount || 1;
      } catch (pptErr) {
        console.warn("PPT parse warning, continuing with filename/fallback:", pptErr?.message);
      }
    } else {
      try {
        const pdfData = await pdfParse(buffer);
        rawText = (pdfData.text || "").replace(/\r\n?/g, "\n").trim();
        pageCount = pdfData.numpages || 1;
        docInfo = pdfData.info || {};
      } catch (parseErr) {
        console.warn("PDF parse warning, processing as scanned document:", parseErr?.message);
      }
    }
    rawText = rawText.replace(/\r\n?/g, "\n").trim();
    const compactText = rawText.replace(/\s+/g, " ").trim();
    const hasReadableWords = /[a-zA-ZÀ-ÿ\u0600-\u06FF]{3,}/.test(compactText);
    const isScanned = compactText.length < 12 || !hasReadableWords;
    const analysis = analyzeSvtDocumentContent(rawText, filename, docInfo);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!isScanned && apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const docLabel = kind === "pdf" ? "PDF" : "PowerPoint";
        const geminiPrompt = `Tu es un inspecteur p\xE9dagogique expert de SVT au coll\xE8ge marocain (1AC, 2AC, 3AC).
Analyse cet extrait de cours ${docLabel} et renvoie UNIQUEMENT un objet JSON valide avec cette structure :
{
  "title": "Titre du cours en fran\xE7ais (court, fid\xE8le au programme marocain)",
  "titleAr": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062F\u0631\u0633 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u062D\u0633\u0628 \u0627\u0644\u0645\u0642\u0631\u0631 \u0627\u0644\u0645\u063A\u0631\u0628\u064A \u0627\u0644\u0631\u0633\u0645\u064A",
  "gradeLevel": "1AC" ou "2AC" ou "3AC",
  "semester": 1 ou 2,
  "themeTitle": "Unit\xE9 / Th\xE8me officiel marocain",
  "themeTitleAr": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0648\u062D\u062F\u0629 \u0627\u0644\u0631\u0633\u0645\u064A",
  "chapterTitle": "Titre du chapitre",
  "chapterTitleAr": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0641\u0635\u0644",
  "summary": "R\xE9sum\xE9 scientifique en fran\xE7ais (2-3 phrases)",
  "summaryAr": "\u0645\u0644\u062E\u0635 \u0639\u0644\u0645\u064A \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
  "objectives": ["Objectif p\xE9dagogique 1", "Objectif 2"],
  "objectivesAr": ["\u0647\u062F\u0641 \u062A\u0639\u0644\u0645\u064A 1", "\u0647\u062F\u0641 2"]
}

Texte extrait du document ${docLabel} :
${rawText.slice(0, 3500)}`;
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: geminiPrompt,
          config: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        });
        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.title) analysis.title = parsed.title;
          if (parsed.titleAr) analysis.titleAr = parsed.titleAr;
          if (["1AC", "2AC", "3AC"].includes(parsed.gradeLevel)) analysis.gradeLevel = parsed.gradeLevel;
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
      } catch (geminiErr) {
        console.warn("Gemini extraction refinement fallback:", geminiErr?.message);
      }
    }
    return res.json({
      success: true,
      documentKind: kind,
      fileType: kind === "pdf" ? "pdf" : "ppt",
      hasText: !isScanned,
      isScanned,
      pageCount,
      slideCount: kind === "pdf" ? void 0 : pageCount,
      extracted: analysis,
      rawSnippet: rawText.slice(0, 400)
    });
  } catch (err) {
    console.error("Server error /api/parse-document:", err);
    res.status(500).json({ error: "Erreur interne lors du traitement du document." });
  }
}
app.post("/api/parse-pdf", handleParseDocument);
app.post("/api/parse-document", handleParseDocument);
app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt, gradeLevel, language, mode } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Le prompt est requis." });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    const systemInstruction = `Tu es l'assistant p\xE9dagogique officiel de SVT COLL\xC8GE PRO, expert du programme marocain de Sciences de la Vie et de la Terre (SVT) pour le coll\xE8ge (1AC, 2AC, 3AC).
Langue de r\xE9ponse : ${language === "ar" ? "Arabe scientifique clair et pr\xE9cis (\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0639\u0644\u0645\u064A\u0629)" : "Fran\xE7ais scientifique rigoureux et accessible"}.
Niveau scolaire de l'\xE9l\xE8ve : ${gradeLevel || "Coll\xE8ge Marocain"}.
R\xE8gles :
1. Explique les concepts scientifiques avec p\xE9dagogie, clart\xE9 et pr\xE9cision conform\xE9ment aux manuels marocains officiels (Al Massar, Al Moufid, etc.).
2. N'invente jamais de faits scientifiques.
3. Si le mode est 'explain', donne une explication structur\xE9e avec analogies du quotidien.
4. Si le mode is 'quiz', g\xE9n\xE8re 3 questions d'entra\xEEnement avec bar\xE8me et correction d\xE9taill\xE9e.
5. Si le mode is 'fiche', g\xE9n\xE8re une fiche de r\xE9vision synth\xE9tique avec d\xE9finitions cl\xE9s et sch\xE9ma \xE0 retenir.
6. Sois bienveillant, encourageant et motivant.`;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.7
          }
        });
        const replyText = response.text || "";
        return res.json({ reply: replyText, source: "gemini-2.5-flash-free" });
      } catch (geminiError) {
        console.warn("Gemini API call failed, falling back to local SVT pedagogical engine:", geminiError?.message);
      }
    }
    const fallbackResponse = generateLocalSvtResponse(prompt, gradeLevel, language, mode);
    return res.json({ reply: fallbackResponse, source: "svt-pedagogical-engine" });
  } catch (err) {
    console.error("Server error /api/gemini:", err);
    res.status(500).json({ error: "Erreur interne lors du traitement de la requ\xEAte." });
  }
});
function generateLocalSvtResponse(prompt, gradeLevel = "3AC", language = "fr", mode = "explain") {
  const isAr = language === "ar";
  const query = prompt.toLowerCase();
  if (query.includes("photosynth") || query.includes("\u062A\u0631\u0643\u064A\u0628 \u0636\u0648\u0626\u064A") || query.includes("amidon") || query.includes("\u0646\u0634\u0627")) {
    if (isAr) {
      return `### \u{1F33F} \u0634\u0631\u062D \u0639\u0644\u0645\u064A \u0645\u0628\u0633\u0637: \u0627\u0644\u062A\u0631\u0643\u064A\u0628 \u0627\u0644\u0636\u0648\u0626\u064A (Photosynth\xE8se)

**1. \u0627\u0644\u0645\u0641\u0647\u0648\u0645 \u0627\u0644\u0623\u0633\u0627\u0633\u064A:**
\u0627\u0644\u062A\u0631\u0643\u064A\u0628 \u0627\u0644\u0636\u0648\u0626\u064A \u0647\u0648 \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u0627\u0644\u062D\u064A\u0648\u064A\u0629 \u0627\u0644\u062A\u064A \u062A\u0645\u0643\u0646 \u0627\u0644\u0646\u0628\u0627\u062A\u0627\u062A \u0627\u0644\u062E\u0636\u0631\u0627\u0621 (\u0627\u0644\u064A\u062E\u0636\u0648\u0631\u064A\u0629) \u0645\u0646 \u0625\u0646\u062A\u0627\u062C \u0645\u0627\u062F\u062A\u0647\u0627 \u0627\u0644\u0639\u0636\u0648\u064A\u0629 (\u0627\u0644\u0646\u0634\u0627 \u0648\u0627\u0644\u0633\u0643\u0631\u064A\u0627\u062A) \u0627\u0646\u0637\u0644\u0627\u0642\u0627\u064B \u0645\u0646 \u0639\u0646\u0627\u0635\u0631 \u0645\u0639\u062F\u0646\u064A\u0629 \u0628\u0633\u064A\u0637\u0629.

**2. \u0627\u0644\u0634\u0631\u0648\u0637 \u0627\u0644\u0636\u0631\u0648\u0631\u064A\u0629:**
- **\u0627\u0644\u0636\u0648\u0621:** \u0645\u0635\u062F\u0631 \u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A.
- **\u0627\u0644\u064A\u062E\u0636\u0648\u0631 (\u0627\u0644\u0643\u0644\u0648\u0631\u0648\u0641\u064A\u0644):** \u0635\u0628\u063A\u0629 \u062E\u0636\u0631\u0627\u0621 \u062A\u0645\u062A\u0635 \u0623\u0634\u0639\u0629 \u0627\u0644\u0634\u0645\u0633 \u0641\u064A \u0627\u0644\u0628\u0644\u0627\u0633\u062A\u064A\u062F\u0627\u062A \u0627\u0644\u062E\u0636\u0631\u0627\u0621.
- **\u062B\u0646\u0627\u0626\u064A \u0623\u0643\u0633\u064A\u062F \u0627\u0644\u0643\u0631\u0628\u0648\u0646 (CO2):** \u064A\u064F\u0645\u062A\u0635 \u0645\u0646 \u0627\u0644\u0647\u0648\u0627\u0621 \u0639\u0628\u0631 \u0627\u0644\u062B\u063A\u0648\u0631 \u0627\u0644\u0648\u0631\u0642\u064A\u0629.
- **\u0627\u0644\u0645\u0627\u0621 \u0648\u0627\u0644\u0623\u0645\u0644\u0627\u062D \u0627\u0644\u0645\u0639\u062F\u0646\u064A\u0629:** \u064A\u0645\u062A\u0635\u0647\u0627 \u0627\u0644\u0646\u0628\u0627\u062A \u0645\u0646 \u0627\u0644\u062A\u0631\u0628\u0629 \u0639\u0628\u0631 \u0627\u0644\u0632\u063A\u0628 \u0627\u0644\u0645\u0627\u0635 \u0628\u0627\u0644\u062C\u0630\u0648\u0631 (\u0627\u0644\u0646\u0633\u063A \u0627\u0644\u0646\u0627\u0642\u0635).

**3. \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0648\u0627\u0644\u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u062F\u0627\u0644\u0629:**
- \u062A\u0631\u0643\u064A\u0628 \u0645\u0627\u062F\u0629 \u0639\u0636\u0648\u064A\u0629 (\u0627\u0644\u0646\u0634\u0627 \u0627\u0644\u0630\u064A \u0646\u0643\u0634\u0641 \u0639\u0646\u0647 \u0628\u0648\u0627\u0633\u0637\u0629 **\u0627\u0644\u0645\u0627\u0621 \u0627\u0644\u064A\u0648\u062F\u064A** \u0641\u064A\u062A\u0644\u0648\u0646 \u0628\u0627\u0644\u0623\u0632\u0631\u0642 \u0627\u0644\u062F\u0627\u0643\u0646).
- \u0637\u0631\u062D \u063A\u0627\u0632 **\u062B\u0646\u0627\u0626\u064A \u0627\u0644\u0623\u0643\u0633\u062C\u064A\u0646 (O2)** \u0643\u0646\u0627\u062A\u062C \u062B\u0627\u0646\u0648\u064A \u064A\u0646\u0639\u0634 \u0627\u0644\u063A\u0644\u0627\u0641 \u0627\u0644\u062C\u0648\u064A!`;
    }
    return `### \u{1F33F} Fiche P\xE9dagogique : La Photosynth\xE8se (Programme 1AC & 3AC)

**1. D\xE9finition cl\xE9 :**
La photosynth\xE8se est le processus biochimique permettant aux v\xE9g\xE9taux chlorophylliens (producteurs primaires) de synth\xE9tiser leur propre mati\xE8re organique (amidon, glucides) \xE0 partir de mati\xE8re min\xE9rale.

**2. Les conditions indispensables :**
- **Lumi\xE8re solaire** : source d'\xE9nergie lumineuse capt\xE9e par les pigments.
- **Chlorophylle** : contenue dans les chloroplastes des cellules v\xE9g\xE9tales.
- **Dioxyde de carbone (CO2)** : absorb\xE9 dans l'air via les stomates foliaires.
- **Eau et sels min\xE9raux** : puis\xE9s dans le sol par les poils absorbants (s\xE8ve brute).

**3. Bilan chimique simplifi\xE9 :**
6 CO\u2082 + 6 H\u2082O + \xC9nergie lumineuse \u2794 C\u2086H\u2081\u2082O\u2086 (Glucose / Amidon) + 6 O\u2082

**4. Exp\xE9rience de confirmation :**
Le test \xE0 l'**eau iod\xE9e** (jaune-brun) permet de prouver la synth\xE8se d'amidon : la feuille d\xE9color\xE9e vire au bleu-noir uniquement dans les zones ayant re\xE7u de la lumi\xE8re.`;
  }
  if (query.includes("digestion") || query.includes("\u0647\u0636\u0645") || query.includes("enzyme") || query.includes("\u0642\u064A\u062A") || query.includes("amylase")) {
    if (isAr) {
      return `### \u{1F34E} \u062E\u0644\u0627\u0635\u0629 \u0647\u0636\u0645 \u0627\u0644\u0623\u063A\u0630\u064A\u0629 \u0648\u0645\u0648\u0627\u062F \u0627\u0644\u0642\u064A\u062A (3AC)

**1. \u062A\u0628\u0633\u064A\u0637 \u0627\u0644\u0623\u063A\u0630\u064A\u0629 \u0639\u0628\u0631 \u0627\u0644\u062C\u0647\u0627\u0632 \u0627\u0644\u0647\u0636\u0645\u064A:**
- **\u0627\u0644\u0646\u0634\u0627** (\u0633\u0643\u0631 \u0636\u062E\u0645) \u2794 \u0645\u0627\u0644\u062A\u0648\u0632 \u0628\u0648\u0627\u0633\u0637\u0629 **\u0623\u0646\u0632\u064A\u0645 \u0627\u0644\u0646\u0634\u0627\u0648\u0632 \u0627\u0644\u0644\u0639\u0627\u0628\u064A** \u0641\u064A \u0627\u0644\u0641\u0645 (37\xB0C) \u2794 \u063A\u0644\u0648\u0643\u0648\u0632 \u0628\u0648\u0627\u0633\u0637\u0629 \u0623\u0646\u0632\u064A\u0645 \u0627\u0644\u0645\u0627\u0644\u062A\u0627\u0632 \u0641\u064A \u0627\u0644\u0645\u0639\u064A \u0627\u0644\u062F\u0642\u064A\u0642.
- **\u0627\u0644\u0628\u0631\u0648\u062A\u064A\u062F\u0627\u062A** \u2794 \u0628\u0628\u062A\u064A\u062F\u0627\u062A \u2794 **\u0623\u062D\u0645\u0627\u0636 \u0623\u0645\u064A\u0646\u064A\u0629** \u0628\u0648\u0627\u0633\u0637\u0629 \u0623\u0646\u0632\u064A\u0645\u0627\u062A \u0627\u0644\u0628\u0631\u0648\u062A\u064A\u0627\u0632 \u0648\u0627\u0644\u0628\u064A\u0628\u062A\u064A\u062F\u0627\u0632.
- **\u0627\u0644\u062F\u0647\u0646\u064A\u0627\u062A** \u2794 \u0628\u0639\u062F \u0627\u0633\u062A\u062D\u064A\u0644\u0627\u0628\u0647\u0627 \u0628\u0623\u0645\u0644\u0627\u062D \u0627\u0644\u0635\u0641\u0631\u0627\u0621 \u0627\u0644\u0643\u0628\u062F\u064A\u0629 \u2794 **\u0623\u062D\u0645\u0627\u0636 \u062F\u0647\u0646\u064A\u0629 \u0648\u063A\u0644\u064A\u0633\u064A\u0631\u0648\u0644** \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0644\u064A\u0628\u0627\u0632.

**2. \u0645\u0635\u064A\u0631 \u0645\u0648\u0627\u062F \u0627\u0644\u0642\u064A\u062A:**
\u062A\u0645\u0631 \u0645\u0648\u0627\u062F \u0627\u0644\u0642\u064A\u062A \u0627\u0644\u0646\u0627\u062A\u062C\u0629 \u0639\u0628\u0631 \u062C\u062F\u0627\u0631 **\u0627\u0644\u062E\u0645\u0644\u0627\u062A \u0627\u0644\u0645\u0639\u0648\u064A\u0629** \u0641\u064A \u0638\u0627\u0647\u0631\u0629 \u062A\u062F\u0639\u0649 **\u0627\u0644\u0627\u0645\u062A\u0635\u0627\u0635 \u0627\u0644\u0645\u0639\u0648\u064A** :
- \u0627\u0644\u0645\u0633\u0644\u0643 \u0627\u0644\u062F\u0645\u0648\u064A : \u0627\u0644\u0645\u0627\u0621\u060C \u0627\u0644\u0623\u0645\u0644\u0627\u062D\u060C \u0627\u0644\u0641\u064A\u062A\u0627\u0645\u064A\u0646\u0627\u062A\u060C \u0627\u0644\u063A\u0644\u0648\u0643\u0648\u0632\u060C \u0627\u0644\u0623\u062D\u0645\u0627\u0636 \u0627\u0644\u0623\u0645\u064A\u0646\u064A\u0629.
- \u0627\u0644\u0645\u0633\u0644\u0643 \u0627\u0644\u0644\u0645\u0641\u0627\u0648\u064A : \u0627\u0644\u0623\u062D\u0645\u0627\u0636 \u0627\u0644\u062F\u0647\u0646\u064A\u0629 \u0648\u0627\u0644\u063A\u0644\u064A\u0633\u064A\u0631\u0648\u0644.`;
    }
    return `### \u{1F34E} Fiche de R\xE9vision SVT 3AC : La Digestion Chimique

**1. La simplification mol\xE9culaire :**
Les grosses mol\xE9cules alimentaires insolubles sont d\xE9coup\xE9es en nutriments simples assimilables :
- **Amidon** \u2794 Maltose (par l'amylase salivaire \xE0 37\xB0C) \u2794 **Glucose** (par la maltase intestinale).
- **Prot\xE9ines** \u2794 Peptides \u2794 **Acides amin\xE9s** (par les prot\xE9ases et peptidases).
- **Lipides** \u2794 \xC9mulsionn\xE9s par la bile \u2794 **Acides gras + Glyc\xE9rol** (par la lipase pancr\xE9atique).

**2. L'absorption intestinale :**
Elle s'op\xE8re au niveau des **villosit\xE9s intestinales** qui offrent une immense surface d'\xE9change vascularis\xE9e (~300 m\xB2).`;
  }
  if (isAr) {
    return `### \u{1F4A1} \u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0628\u064A\u062F\u0627\u063A\u0648\u062C\u064A \u0644\u0640 SVT COLL\xC8GE PRO (${gradeLevel})

\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643 \u064A\u0627 \u0628\u0637\u0644 \u0627\u0644\u0639\u0644\u0648\u0645! \u0628\u0627\u0644\u0646\u0633\u0628\u0629 \u0644\u0633\u0624\u0627\u0644\u0643: **"${prompt}"**

**\u062E\u0644\u0627\u0635\u0629 \u0645\u0646\u0647\u062C\u064A\u0629 \u062D\u0633\u0628 \u0627\u0644\u0645\u0642\u0631\u0631 \u0627\u0644\u0645\u063A\u0631\u0628\u064A \u0627\u0644\u0631\u0633\u0645\u064A:**
1. \u062A\u0630\u0643\u0631 \u062F\u0627\u0626\u0645\u0627\u064B \u0627\u0644\u0628\u062F\u0621 \u0628\u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u0627\u0644\u0628\u064A\u0648\u0644\u0648\u062C\u064A\u0629 \u0623\u0648 \u0627\u0644\u062C\u064A\u0648\u0644\u0648\u062C\u064A\u0629 \u0648\u0645\u0644\u0627\u062D\u0638\u0629 \u0627\u0644\u0645\u0639\u0637\u064A\u0627\u062A \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629.
2. \u0645\u064A\u0632 \u0628\u064A\u0646 \u0627\u0644\u0641\u0631\u0636\u064A\u0629 \u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0648\u0627\u0644\u0627\u0633\u062A\u0646\u062A\u0627\u062C \u0627\u0644\u0645\u0628\u0646\u064A \u0639\u0644\u0649 \u0627\u0644\u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0645\u0644\u0645\u0648\u0633\u0629.
3. \u064A\u0645\u0643\u0646\u0643 \u0627\u062E\u062A\u0628\u0627\u0631 \u0647\u0630\u0647 \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u0639\u0645\u0644\u064A\u0627\u064B \u0641\u064A **\u0627\u0644\u0645\u062E\u062A\u0628\u0631 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A** \u0644\u0644\u062A\u0637\u0628\u064A\u0642 \u0648\u062A\u062B\u0628\u064A\u062A \u0627\u0644\u0645\u0639\u0627\u0631\u0641!

\u0647\u0644 \u062A\u0648\u062F \u0623\u0646 \u0646\u0637\u0631\u062D \u0639\u0644\u064A\u0643 \u062A\u0645\u0631\u064A\u0646\u0627\u064B \u062A\u062F\u0631\u064A\u0628\u064A\u0627\u064B \u0645\u0639 \u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0648\u0633\u0644\u0645 \u0627\u0644\u062A\u0646\u0642\u064A\u0637\u061F`;
  }
  return `### \u{1F4A1} R\xE9ponse du Tuteur P\xE9dagogique SVT COLL\xC8GE PRO (${gradeLevel})

Excellente question relative au programme de SVT coll\xE8ge marocain !

Concernant : **"${prompt}"**

**M\xE9thode de raisonnement scientifique :**
1. **Observation** : Analyser les donn\xE9es ou le document fourni (graphique, sch\xE9ma, tableau).
2. **Interpr\xE9tation** : Mettre en relation la cause et la cons\xE9quence biologique ou g\xE9ologique.
3. **Conclusion** : Formuler la r\xE8gle scientifique valid\xE9e par l'exp\xE9rience.

N'h\xE9site pas \xE0 explorer notre **Laboratoire Virtuel** pour manipuler cette exp\xE9rience en direct et consolider tes acquis pour le brevet !`;
}
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  const distPath = path.resolve(process.cwd(), "dist");
  if (!isProduction) {
    const hmrDisabled = process.env.DISABLE_HMR === "true";
    const vitePromise = import("vite").then(
      ({ createServer: createViteServer }) => createViteServer({
        server: {
          middlewareMode: true,
          hmr: hmrDisabled ? false : void 0
        },
        appType: "spa"
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
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
  const server = app.listen(PORT, HOST, () => {
    console.log(`SVT COLL\xC8GE PRO server running on http://${HOST}:${PORT} (NODE_ENV=${process.env.NODE_ENV || "development"})`);
  });
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing server");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
  process.on("SIGINT", () => {
    console.log("SIGINT signal received: closing server");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception logged:", err);
  });
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  });
}
startServer();
