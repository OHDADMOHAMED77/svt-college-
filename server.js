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
      const cleanLine2 = textRuns.replace(/\s+/g, " ").trim();
      if (cleanLine2) {
        lines.push(cleanLine2);
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
  const structured = buildStructuredCourseFromText(rawText, title, titleAr);
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
    ],
    contentSections: structured.contentSections,
    definitions: structured.definitions
  };
}
function isSectionHeadingLine(line) {
  if (!line || line.length < 3 || line.length > 105) return false;
  if (line.startsWith("|")) return false;
  if (/^(?:[IVX]{1,4}\s*[\.\-–:]|[0-9]{1,2}(?:\.[0-9]{1,2})?\s*[\.\)\-–:]|(?:chapitre|activité|activite|partie|bilan|conclusion|introduction|expérience|experience|observation|interprétation|interpretation|résumé|resume|définition|definition|remarque|tableau)\b)/i.test(line)) {
    return true;
  }
  return false;
}
function buildStructuredCourseFromText(rawText, title, titleAr) {
  const cleanText = (rawText || "").replace(/\r\n?/g, "\n").trim();
  if (!cleanText || cleanText.length < 20) {
    return {
      contentSections: [
        {
          heading: `1. ${title || "Support de cours"}`,
          headingAr: `1. ${titleAr || title || "\u062F\u0639\u0627\u0645\u0629 \u0627\u0644\u062F\u0631\u0633"}`,
          bodyMarkdown: "Consultez les figures et le document PDF ci-dessous pour suivre l'ensemble des activit\xE9s, sch\xE9mas et exp\xE9riences du cours.",
          bodyMarkdownAr: "\u0631\u0627\u062C\u0639 \u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0648\u062B\u064A\u0642\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0629 \u0623\u0633\u0641\u0644\u0647 \u0644\u0644\u0627\u0637\u0644\u0627\u0639 \u0639\u0644\u0649 \u0623\u0646\u0634\u0637\u0629 \u0648\u0631\u0633\u0648\u0645\u0627\u062A \u0648\u062A\u062C\u0627\u0631\u0628 \u0627\u0644\u062F\u0631\u0633.",
          keyTakeaway: "Document PDF pr\xEAt pour l'\xE9tude et le t\xE9l\xE9chargement.",
          keyTakeawayAr: "\u0648\u062B\u064A\u0642\u0629 \u0627\u0644\u062F\u0631\u0633 \u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0644\u062A\u062D\u0645\u064A\u0644."
        }
      ],
      definitions: []
    };
  }
  const lines = cleanText.split("\n").map((l) => l.replace(/[ \u00A0]+/g, " ").trim()).filter((l, idx, arr) => l.length > 0 || idx > 0 && arr[idx - 1].length > 0);
  const sections = [];
  const definitions = [];
  const seenTerms = /* @__PURE__ */ new Set();
  let currentHeading = `1. ${title || "Notions et Activit\xE9s du Cours"}`;
  let currentLines = [];
  let currentTakeaway = "";
  const flushSection = () => {
    const body = currentLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!body) return;
    sections.push({
      heading: currentHeading.slice(0, 140),
      headingAr: currentHeading.slice(0, 140),
      bodyMarkdown: body.slice(0, 6e3),
      bodyMarkdownAr: body.slice(0, 6e3),
      ...currentTakeaway ? {
        keyTakeaway: currentTakeaway.slice(0, 350),
        keyTakeawayAr: currentTakeaway.slice(0, 350)
      } : {}
    });
    currentLines = [];
    currentTakeaway = "";
  };
  for (const line of lines) {
    if (/^(?:à retenir|conclusion|bilan|en résumé|remarque importante)\s*[:\-–]/i.test(line)) {
      currentTakeaway = line.replace(/^(?:à retenir|conclusion|bilan|en résumé|remarque importante)\s*[:\-–]\s*/i, "").trim();
      continue;
    }
    const defMatch = !line.startsWith("|") && line.match(/^([A-ZÀ-Ÿ\u0600-\u06FF][a-zA-ZÀ-ÿ\u0600-\u06FF\s'’\-]{2,36})\s*:\s*(.{18,260})$/);
    if (defMatch && definitions.length < 15 && !isSectionHeadingLine(line)) {
      const term = defMatch[1].trim();
      const definition = defMatch[2].trim();
      const key = term.toLowerCase();
      if (!seenTerms.has(key) && !/^(page|figure|tableau|remarque|exemple|nb|source|semestre|unité|à retenir|conclusion|bilan)/i.test(term)) {
        seenTerms.add(key);
        definitions.push({
          term,
          termAr: term,
          definition,
          definitionAr: definition
        });
      }
    }
    if (isSectionHeadingLine(line) && currentLines.join("").length > 60 && sections.length < 24) {
      flushSection();
      currentHeading = line;
      continue;
    }
    if (currentLines.length === 0 && isSectionHeadingLine(line) && sections.length === 0) {
      currentHeading = line;
      continue;
    }
    const normalizedLine = line.replace(/^[•▪▫◦➢►]\s*/, "- ");
    currentLines.push(normalizedLine);
  }
  flushSection();
  if (sections.length === 0) {
    return {
      contentSections: [
        {
          heading: `1. ${title || "Contenu du cours"}`,
          headingAr: `1. ${titleAr || title || "\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u062F\u0631\u0633"}`,
          bodyMarkdown: cleanText.slice(0, 6e3),
          bodyMarkdownAr: cleanText.slice(0, 6e3)
        }
      ],
      definitions
    };
  }
  return { contentSections: sections, definitions };
}

// server/pdfRichExtractor.ts
import zlib from "zlib";
import crypto from "crypto";
function buildPageTextWithTables(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  const normalized = items.filter((item) => item && typeof item.str === "string" && item.str.trim().length > 0 && Array.isArray(item.transform)).map((item) => ({
    str: item.str.replace(/\s+/g, " ").trim(),
    x: Number(item.transform[4]) || 0,
    y: Number(item.transform[5]) || 0,
    width: Math.max(Number(item.width) || item.str.length * 4.5, 4),
    height: Math.abs(Number(item.height) || Number(item.transform[3]) || 10)
  }));
  if (normalized.length === 0) return "";
  normalized.sort((a, b) => {
    if (Math.abs(b.y - a.y) > 3.5) return b.y - a.y;
    return a.x - b.x;
  });
  const rows = [];
  for (const item of normalized) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(lastRow[0].y - item.y) <= Math.max(3.5, Math.min(lastRow[0].height, item.height) * 0.45)) {
      lastRow.push(item);
    } else {
      rows.push([item]);
    }
  }
  const rawLines = rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    let line = row[0].str;
    let prevEnd = row[0].x + row[0].width;
    for (let i = 1; i < row.length; i++) {
      const curr = row[i];
      const gap = curr.x - prevEnd;
      const avgCharW = Math.max(3.5, curr.width / Math.max(curr.str.length, 1));
      if (gap > Math.max(14, avgCharW * 2.8)) {
        line += "	" + curr.str;
      } else if (gap > Math.max(1.2, avgCharW * 0.22)) {
        line += " " + curr.str;
      } else {
        if (/[a-zA-Z0-9À-ÿ\u0600-\u06FF]$/.test(line) && /^[a-zA-Z0-9À-ÿ\u0600-\u06FF]/.test(curr.str)) {
          line += " " + curr.str;
        } else {
          line += curr.str;
        }
      }
      prevEnd = Math.max(prevEnd, curr.x + curr.width);
    }
    return line.trim();
  });
  return convertTabBlocksToMarkdownTables(rawLines).join("\n");
}
function convertTabBlocksToMarkdownTables(lines) {
  const output = [];
  let i = 0;
  while (i < lines.length) {
    const cells = lines[i].split("	").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 2 && cells.length <= 8) {
      const block = [cells];
      let j = i + 1;
      while (j < lines.length) {
        const nextCells = lines[j].split("	").map((c) => c.trim()).filter(Boolean);
        if (nextCells.length >= 2 && nextCells.length <= 8) {
          block.push(nextCells);
          j++;
        } else {
          break;
        }
      }
      if (block.length >= 2) {
        const colCount = Math.max(...block.map((r) => r.length));
        const padRow = (row) => {
          const padded = [...row];
          while (padded.length < colCount) padded.push("");
          return `| ${padded.map((cell) => cell.replace(/\|/g, "/")).join(" | ")} |`;
        };
        output.push("");
        output.push(padRow(block[0]));
        output.push(`| ${Array(colCount).fill("---").join(" | ")} |`);
        for (let r = 1; r < block.length; r++) {
          output.push(padRow(block[r]));
        }
        output.push("");
        i = j;
        continue;
      } else {
        output.push(cells.join(" \u2014 "));
        i++;
        continue;
      }
    }
    output.push(lines[i].replace(/\t+/g, " "));
    i++;
  }
  return output;
}
function createCoordinatePageRenderer() {
  return async function renderCoordinatePage(pageData) {
    const textContent = await pageData.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false
    });
    return buildPageTextWithTables(textContent?.items || []);
  };
}
var CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(buf) {
  let c = 4294967295;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 255] ^ c >>> 8;
  }
  return (c ^ 4294967295) >>> 0;
}
function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}
function unfilterPngPredictorRows(raw, width, bytesPerPixel, stride) {
  const rowSize = stride + 1;
  const height = Math.floor(raw.length / rowSize);
  const out = Buffer.alloc(height * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };
  for (let y = 0; y < height; y++) {
    const filterType = raw[y * rowSize];
    const inOff = y * rowSize + 1;
    const outOff = y * stride;
    const prevOff = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const val = raw[inOff + x];
      const left = x >= bytesPerPixel ? out[outOff + x - bytesPerPixel] : 0;
      const up = y > 0 ? out[prevOff + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? out[prevOff + x - bytesPerPixel] : 0;
      let recon = val;
      if (filterType === 1) recon = val + left & 255;
      else if (filterType === 2) recon = val + up & 255;
      else if (filterType === 3) recon = val + Math.floor((left + up) / 2) & 255;
      else if (filterType === 4) recon = val + paeth(left, up, upLeft) & 255;
      out[outOff + x] = recon;
    }
  }
  void width;
  return out;
}
function encodePixelsToPng(pixels, width, height, channels) {
  const colorType = channels === 1 ? 0 : channels === 3 ? 2 : 6;
  const stride = width * channels;
  if (pixels.length < stride * height) {
    throw new Error("Insufficient pixel buffer length for PNG encoding");
  }
  const rawWithFilters = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    rawWithFilters[y * (stride + 1)] = 0;
    pixels.copy(rawWithFilters, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const compressedIdat = zlib.deflateSync(rawWithFilters, { level: 6 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makePngChunk("IHDR", ihdr),
    makePngChunk("IDAT", compressedIdat),
    makePngChunk("IEND", Buffer.alloc(0))
  ]);
}
function parseIntField(dictText, key) {
  const m = dictText.match(new RegExp(`/${key}\\s+(\\d+)\\b`));
  return m ? Number(m[1]) : null;
}
function extractImagesFromPdfBuffer(buffer, maxImages = 10) {
  if (!buffer || buffer.length < 32) return [];
  const text = buffer.toString("latin1");
  const results = [];
  const seenHashes = /* @__PURE__ */ new Set();
  const streamKeyword = "stream";
  let cursor = 0;
  while (cursor < text.length && results.length < maxImages) {
    const streamIdx = text.indexOf(streamKeyword, cursor);
    if (streamIdx === -1) break;
    const prevChar = streamIdx > 0 ? text[streamIdx - 1] : " ";
    const afterChar = text[streamIdx + streamKeyword.length] || "";
    if (!/[\s>]/.test(prevChar) || afterChar !== "\n" && afterChar !== "\r") {
      cursor = streamIdx + streamKeyword.length;
      continue;
    }
    const lookbackStart = Math.max(0, streamIdx - 900);
    const dictSlice = text.slice(lookbackStart, streamIdx);
    const dictOpen = dictSlice.lastIndexOf("<<");
    const dictClose = dictSlice.lastIndexOf(">>");
    cursor = streamIdx + streamKeyword.length;
    if (dictOpen === -1 || dictClose === -1 || dictClose < dictOpen) {
      continue;
    }
    const dictText = dictSlice.slice(dictOpen, dictClose + 2);
    if (!/\/Subtype\s*\/Image\b/.test(dictText)) {
      continue;
    }
    if (/\/ImageMask\s+true\b/i.test(dictText)) {
      continue;
    }
    const width = parseIntField(dictText, "Width") || 0;
    const height = parseIntField(dictText, "Height") || 0;
    if (width < 48 || height < 48 || width > 6e3 || height > 6e3) {
      continue;
    }
    let dataStart = streamIdx + streamKeyword.length;
    if (buffer[dataStart] === 13 && buffer[dataStart + 1] === 10) {
      dataStart += 2;
    } else if (buffer[dataStart] === 10 || buffer[dataStart] === 13) {
      dataStart += 1;
    } else {
      continue;
    }
    const declaredLength = parseIntField(dictText, "Length");
    let dataEnd = -1;
    if (declaredLength && dataStart + declaredLength <= buffer.length) {
      dataEnd = dataStart + declaredLength;
    } else {
      const endStreamIdx = text.indexOf("endstream", dataStart);
      if (endStreamIdx !== -1) {
        dataEnd = endStreamIdx;
        while (dataEnd > dataStart && (buffer[dataEnd - 1] === 10 || buffer[dataEnd - 1] === 13)) {
          dataEnd--;
        }
      }
    }
    if (dataEnd <= dataStart) continue;
    const streamBytes = buffer.subarray(dataStart, dataEnd);
    cursor = Math.max(cursor, dataEnd);
    const isDct = /\/DCTDecode\b/.test(dictText);
    const isFlate = /\/FlateDecode\b/.test(dictText) && !/\/ASCII85Decode\b|\/ASCIIHexDecode\b|\/LZWDecode\b|\/JPXDecode\b/.test(dictText);
    let outMime = null;
    let outBuffer = null;
    if (isDct) {
      const soi = streamBytes.indexOf(Buffer.from([255, 216]));
      const eoi = streamBytes.lastIndexOf(Buffer.from([255, 217]));
      if (soi !== -1 && eoi > soi) {
        outBuffer = streamBytes.subarray(soi, eoi + 2);
        outMime = "image/jpeg";
      } else if (streamBytes.length > 200) {
        outBuffer = streamBytes;
        outMime = "image/jpeg";
      }
    } else if (isFlate) {
      const bpc = parseIntField(dictText, "BitsPerComponent") || 8;
      if (bpc !== 8) continue;
      let channels = null;
      const isCmyk = /\/DeviceCMYK\b/.test(dictText);
      if (/\/DeviceRGB\b/.test(dictText)) channels = 3;
      else if (/\/DeviceGray\b/.test(dictText)) channels = 1;
      else if (isCmyk) channels = 4;
      if (!channels) continue;
      try {
        let inflated = zlib.inflateSync(streamBytes);
        const predictor = parseIntField(dictText, "Predictor") || 1;
        const stride = width * channels;
        if (predictor >= 10 && inflated.length >= height * (stride + 1)) {
          inflated = unfilterPngPredictorRows(inflated, width, channels, stride);
        }
        if (isCmyk) {
          const rgb = Buffer.alloc(width * height * 3);
          for (let p = 0; p < width * height && p * 4 + 3 < inflated.length; p++) {
            const c = inflated[p * 4] / 255;
            const m = inflated[p * 4 + 1] / 255;
            const y = inflated[p * 4 + 2] / 255;
            const k = inflated[p * 4 + 3] / 255;
            rgb[p * 3] = Math.round(255 * (1 - c) * (1 - k));
            rgb[p * 3 + 1] = Math.round(255 * (1 - m) * (1 - k));
            rgb[p * 3 + 2] = Math.round(255 * (1 - y) * (1 - k));
          }
          outBuffer = encodePixelsToPng(rgb, width, height, 3);
        } else {
          outBuffer = encodePixelsToPng(inflated, width, height, channels);
        }
        outMime = "image/png";
      } catch {
      }
    }
    if (!outBuffer || !outMime || outBuffer.length > 900 * 1024) {
      continue;
    }
    const digest = crypto.createHash("sha1").update(outBuffer).digest("hex");
    if (seenHashes.has(digest)) continue;
    seenHashes.add(digest);
    const idx = results.length + 1;
    results.push({
      id: `med_pdf_img_${Date.now()}_${idx}`,
      title: `Figure / Sch\xE9ma ${idx} (PDF)`,
      titleAr: `\u0631\u0633\u0645 / \u0648\u062B\u064A\u0642\u0629 ${idx} (PDF)`,
      url: `data:${outMime};base64,${outBuffer.toString("base64")}`,
      width,
      height,
      mimeType: outMime,
      description: `Image extraite du PDF (${width}\xD7${height} px \u2022 ${Math.max(1, Math.round(outBuffer.length / 1024))} Ko)`
    });
  }
  return results;
}

// server/pdfAiEngine.ts
function cleanLine(line) {
  return line.replace(/\s+/g, " ").trim();
}
function detectGrade(text, filename) {
  const combined = `${filename} ${text.slice(0, 3e3)}`.toLowerCase();
  if (/\b1\s*ac\b|1ère\s*année|1ere\s*annee|milieu\s*naturel|cellule|respiration/.test(combined)) {
    return "1AC";
  }
  if (/\b2\s*ac\b|2ème\s*année|2eme\s*annee|tectonique|séisme|seisme|volcan|reproduction/.test(combined)) {
    return "2AC";
  }
  return "3AC";
}
function extractFirstMarkdownTable(rawText) {
  const lines = rawText.replace(/\r\n?/g, "\n").split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (!line.includes("|")) continue;
    const block = [];
    let j = i;
    while (j < lines.length && lines[j].trim().includes("|")) {
      block.push(lines[j].trim());
      j++;
    }
    if (block.length >= 2) {
      const parseRow = (r) => r.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()).filter((_, idx, arr) => !(arr.length === 1 && arr[0] === ""));
      const isSep = (r) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(r);
      const headers = parseRow(block[0]).slice(0, 4);
      const rows = block.slice(isSep(block[1]) ? 2 : 1).filter((r) => !isSep(r)).map((r) => parseRow(r).slice(0, 4)).filter((r) => r.length >= 2).slice(0, 5);
      if (headers.length >= 2 && rows.length >= 1) {
        return { headers, rows };
      }
    }
  }
  return null;
}
function buildFallbackPdfAnalysis(rawText, filename, pageCount = 1, imageCount = 0) {
  const cleanName = filename.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const lines = rawText.replace(/\r\n?/g, "\n").split("\n").map(cleanLine).filter((l) => l.length > 0 && !/^page\s+\d+/i.test(l) && !/^---+\s*page/i.test(l));
  const headingPattern = /^(?:[IVX]+\.\s+|\d+[.)]\s+|chapitre\s+\d+|unité\s+\d+|partie\s+\d+)/i;
  const headings = lines.filter((l) => headingPattern.test(l) && l.length <= 100);
  const proseLines = lines.filter(
    (l) => !l.includes("|") && l.length >= 24 && !headingPattern.test(l)
  );
  const detectedTitle = lines.find((l) => l.length >= 6 && l.length <= 95 && !l.includes("|")) || cleanName || "Document de cours SVT";
  const gradeLevel = detectGrade(rawText, filename);
  const glossary = [];
  for (const line of lines) {
    if (glossary.length >= 4) break;
    const match = line.match(/^([A-ZÀ-ÿ][^:]{2,42})\s*:\s*(.{15,220})$/);
    if (match && !/^(à retenir|remarque|exemple|objectif|chapitre|partie|nb)/i.test(match[1])) {
      glossary.push({
        term: match[1].trim(),
        termAr: match[1].trim(),
        definition: match[2].trim(),
        definitionAr: match[2].trim()
      });
    }
  }
  if (glossary.length === 0) {
    glossary.push({
      term: "Notions essentielles",
      termAr: "\u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      definition: proseLines[0] || `Concepts scientifiques cl\xE9s extraits du document ${detectedTitle}.`,
      definitionAr: proseLines[0] || `\u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u0644\u0635\u0629 \u0645\u0646 \u0648\u062B\u064A\u0642\u0629 ${detectedTitle}.`
    });
  }
  const tableFromPdf = extractFirstMarkdownTable(rawText);
  const comparisonTable = tableFromPdf ? {
    headers: tableFromPdf.headers,
    headersAr: tableFromPdf.headers,
    rows: tableFromPdf.rows,
    rowsAr: tableFromPdf.rows
  } : {
    headers: ["Axe du document", "Observation / M\xE9canisme", "\xC0 retenir"],
    headersAr: ["\u0645\u062D\u0648\u0631 \u0627\u0644\u0648\u062B\u064A\u0642\u0629", "\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0629 / \u0627\u0644\u0622\u0644\u064A\u0629", "\u0627\u0644\u062E\u0644\u0627\u0635\u0629"],
    rows: (headings.length > 0 ? headings : [detectedTitle, "Analyse scientifique", "Synth\xE8se"]).slice(0, 3).map((h, i) => [
      h.slice(0, 48),
      (proseLines[i] || "\xC9tude des m\xE9canismes et donn\xE9es exp\xE9rimentales").slice(0, 70),
      (proseLines[i + 1] || "Validation de la notion du programme SVT").slice(0, 60)
    ]),
    rowsAr: (headings.length > 0 ? headings : [detectedTitle, "\u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0639\u0644\u0645\u064A", "\u0627\u0644\u062E\u0644\u0627\u0635\u0629"]).slice(0, 3).map((h, i) => [
      h.slice(0, 48),
      (proseLines[i] || "\u062F\u0631\u0627\u0633\u0629 \u0627\u0644\u0638\u0648\u0627\u0647\u0631 \u0648\u0627\u0644\u0645\u0639\u0637\u064A\u0627\u062A \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629").slice(0, 70),
      (proseLines[i + 1] || "\u0627\u0633\u062A\u062E\u0644\u0627\u0635 \u0627\u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0644\u0644\u0645\u0642\u0631\u0631").slice(0, 60)
    ])
  };
  const outline = (headings.length > 0 ? headings.slice(0, 5) : [detectedTitle]).map(
    (h, idx) => ({
      heading: h,
      headingAr: h,
      keyPoints: proseLines.slice(idx * 2, idx * 2 + 2).length > 0 ? proseLines.slice(idx * 2, idx * 2 + 2) : [`Synth\xE8se de la section ${idx + 1}`],
      keyPointsAr: proseLines.slice(idx * 2, idx * 2 + 2).length > 0 ? proseLines.slice(idx * 2, idx * 2 + 2) : [`\u062E\u0644\u0627\u0635\u0629 \u0627\u0644\u0645\u062D\u0648\u0631 ${idx + 1}`]
    })
  );
  const stepCandidates = (headings.length >= 2 ? headings : proseLines).slice(0, 4);
  const processSteps = stepCandidates.length > 0 ? stepCandidates.map((item, idx) => ({
    stepNumber: idx + 1,
    title: item.slice(0, 52),
    titleAr: item.slice(0, 52),
    description: (proseLines[idx] || item).slice(0, 120),
    descriptionAr: (proseLines[idx] || item).slice(0, 120)
  })) : [
    {
      stepNumber: 1,
      title: "Observation initiale",
      titleAr: "\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0629 \u0627\u0644\u0623\u0648\u0644\u064A\u0629",
      description: `Analyse du document ${detectedTitle}.`,
      descriptionAr: `\u062A\u062D\u0644\u064A\u0644 \u0645\u0639\u0637\u064A\u0627\u062A \u0648\u062B\u064A\u0642\u0629 ${detectedTitle}.`
    },
    {
      stepNumber: 2,
      title: "Interpr\xE9tation scientifique",
      titleAr: "\u0627\u0644\u062A\u0641\u0633\u064A\u0631 \u0627\u0644\u0639\u0644\u0645\u064A",
      description: "Mise en relation des faits et m\xE9canismes biologiques ou g\xE9ologiques.",
      descriptionAr: "\u0631\u0628\u0637 \u0627\u0644\u0645\u0639\u0637\u064A\u0627\u062A \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0628\u0627\u0644\u0622\u0644\u064A\u0627\u062A \u0627\u0644\u0639\u0644\u0645\u064A\u0629."
    },
    {
      stepNumber: 3,
      title: "Bilan \xE0 retenir",
      titleAr: "\u0627\u0644\u062D\u0635\u064A\u0644\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u064A\u0629",
      description: "Formulation de la conclusion conforme au programme SVT.",
      descriptionAr: "\u0635\u064A\u0627\u063A\u0629 \u0627\u0644\u0627\u0633\u062A\u0646\u062A\u0627\u062C \u0627\u0644\u0639\u0627\u0645 \u062D\u0633\u0628 \u0627\u0644\u0645\u0642\u0631\u0631 \u0627\u0644\u0645\u063A\u0631\u0628\u064A."
    }
  ];
  const mindMapBranches = outline.slice(0, 4).map((sec, idx) => ({
    branchTitle: sec.heading.slice(0, 42),
    branchTitleAr: sec.headingAr.slice(0, 42),
    points: sec.keyPoints.map((p) => p.slice(0, 68)).slice(0, 2),
    pointsAr: sec.keyPointsAr.map((p) => p.slice(0, 68)).slice(0, 2)
  }));
  while (mindMapBranches.length < 3) {
    const idx = mindMapBranches.length + 1;
    mindMapBranches.push({
      branchTitle: idx === 2 ? "M\xE9canismes cl\xE9s" : "Points \xE0 retenir",
      branchTitleAr: idx === 2 ? "\u0627\u0644\u0622\u0644\u064A\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629" : "\u0646\u0642\u0637 \u0644\u0644\u062D\u0641\u0638",
      points: [proseLines[idx - 1]?.slice(0, 68) || "D\xE9marche scientifique exp\xE9rimentale"],
      pointsAr: [proseLines[idx - 1]?.slice(0, 68) || "\u0627\u0644\u0646\u0647\u062C \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A \u0641\u064A \u0639\u0644\u0648\u0645 \u0627\u0644\u062D\u064A\u0627\u0629 \u0648\u0627\u0644\u0623\u0631\u0636"]
    });
  }
  const summaryFr = proseLines.slice(0, 3).join(" ").slice(0, 420) || `Document p\xE9dagogique SVT (${gradeLevel}) analys\xE9 sur ${pageCount} page(s). Utilisez le chat pour poser vos questions ou g\xE9n\xE9rez une infographie de r\xE9vision.`;
  const summaryAr = `\u062A\u062D\u0644\u064A\u0644 \u0634\u0627\u0645\u0644 \u0644\u0648\u062B\u064A\u0642\u0629 "${detectedTitle}" (${gradeLevel} \u2022 ${pageCount} \u0635\u0641\u062D\u0629). \u064A\u0645\u0643\u0646\u0643 \u0637\u0631\u062D \u0623\u064A \u0633\u0624\u0627\u0644 \u062D\u0648\u0644 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0623\u0648 \u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0625\u0646\u0641\u0648\u063A\u0631\u0627\u0641\u064A\u0643 \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629.`;
  const keyTakeaways = (proseLines.length > 0 ? proseLines.slice(0, 3) : [summaryFr]).map((line) => ({
    fr: line.slice(0, 140),
    ar: line.slice(0, 140)
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
        fr: `R\xE9sume les points essentiels de "${detectedTitle.slice(0, 45)}" en 5 puces`,
        ar: `\u0644\u062E\u0635 \u0623\u0647\u0645 \u0623\u0641\u0643\u0627\u0631 "${detectedTitle.slice(0, 40)}" \u0641\u064A 5 \u0646\u0642\u0637 \u0645\u0631\u0643\u0632\u0629`
      },
      {
        fr: "Explique-moi les notions difficiles de ce PDF avec des exemples simples",
        ar: "\u0627\u0634\u0631\u062D \u0644\u064A \u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0627\u0644\u0635\u0639\u0628\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641 \u0628\u0623\u0645\u062B\u0644\u0629 \u0645\u0628\u0633\u0637\u0629"
      },
      {
        fr: "Propose un quiz de 3 questions corrig\xE9es bas\xE9 uniquement sur ce PDF",
        ar: "\u0627\u0642\u062A\u0631\u062D \u0627\u062E\u062A\u0628\u0627\u0631\u0627\u064B \u0645\u0646 3 \u0623\u0633\u0626\u0644\u0629 \u0645\u0639 \u0627\u0644\u062A\u0635\u062D\u064A\u062D \u0627\u0646\u0637\u0644\u0627\u0642\u0627\u064B \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641"
      },
      {
        fr: "Quels tableaux ou sch\xE9mas faut-il retenir pour le contr\xF4le ?",
        ar: "\u0645\u0627 \u0647\u064A \u0627\u0644\u062C\u062F\u0627\u0648\u0644 \u0623\u0648 \u0627\u0644\u0631\u0633\u0648\u0645\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0627\u0644\u062A\u064A \u064A\u062C\u0628 \u062D\u0641\u0638\u0647\u0627 \u0644\u0644\u0641\u0631\u0636\u061F"
      }
    ],
    infographic: {
      title: detectedTitle,
      titleAr: detectedTitle,
      subtitle: `Synth\xE8se Visuelle PDF \xB7 Programme SVT ${gradeLevel}`,
      subtitleAr: `\u0645\u0644\u062E\u0635 \u0628\u0635\u0631\u064A \u0644\u0644\u0648\u062B\u064A\u0642\u0629 \xB7 \u0639\u0644\u0648\u0645 \u0627\u0644\u062D\u064A\u0627\u0629 \u0648\u0627\u0644\u0623\u0631\u0636 ${gradeLevel}`,
      gradeLevel,
      subjectTag: "SVT Coll\xE8ge Maroc",
      subjectTagAr: "\u0639\u0644\u0648\u0645 \u0627\u0644\u062D\u064A\u0627\u0629 \u0648\u0627\u0644\u0623\u0631\u0636",
      keyMetrics: [
        {
          value: String(pageCount),
          label: pageCount > 1 ? "Pages analys\xE9es" : "Page analys\xE9e",
          labelAr: "\u0639\u062F\u062F \u0627\u0644\u0635\u0641\u062D\u0627\u062A",
          detail: "Document source PDF",
          detailAr: "\u0627\u0644\u0648\u062B\u064A\u0642\u0629 \u0627\u0644\u0623\u0635\u0644\u064A\u0629"
        },
        {
          value: String(Math.max(outline.length, 1)),
          label: "Axes structur\xE9s",
          labelAr: "\u0627\u0644\u0645\u062D\u0627\u0648\u0631 \u0627\u0644\u0645\u0647\u064A\u0643\u0644\u0629",
          detail: "Plan du chapitre",
          detailAr: "\u0647\u064A\u0643\u0644\u0629 \u0627\u0644\u062F\u0631\u0633"
        },
        {
          value: String(wordCount || imageCount || 1),
          label: wordCount > 0 ? "Mots extraits" : "Figures d\xE9tect\xE9es",
          labelAr: wordCount > 0 ? "\u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C\u0629" : "\u0627\u0644\u0623\u0634\u0643\u0627\u0644 \u0627\u0644\u0645\u0643\u062A\u0634\u0641\u0629",
          detail: wordCount > 0 ? "Contenu index\xE9" : "Visuels PDF",
          detailAr: wordCount > 0 ? "\u0645\u062D\u062A\u0648\u0649 \u0645\u0641\u0647\u0631\u0633" : "\u0635\u0648\u0631 \u0627\u0644\u0648\u062B\u064A\u0642\u0629"
        },
        {
          value: gradeLevel,
          label: "Niveau cibl\xE9",
          labelAr: "\u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062F\u0631\u0627\u0633\u064A",
          detail: "Coll\xE8ge marocain",
          detailAr: "\u0627\u0644\u062B\u0627\u0646\u0648\u064A \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u064A"
        }
      ],
      processSteps,
      mindMapBranches,
      comparisonTable,
      keyTakeaways,
      glossary
    }
  };
}
function buildFallbackPdfChatReply(rawText, question, filename, language) {
  const isAr = language === "ar";
  const lines = rawText.replace(/\r\n?/g, "\n").split("\n").map(cleanLine).filter((l) => l.length > 6);
  if (lines.length === 0) {
    return isAr ? `\u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0644\u0641 **${filename}** \u0648\u0647\u0648 \u0639\u0628\u0627\u0631\u0629 \u0639\u0646 \u0648\u062B\u064A\u0642\u0629 \u0645\u0635\u0648\u0631\u0629/\u0645\u0645\u0633\u0648\u062D\u0629 \u0636\u0648\u0626\u064A\u0627\u064B \u0628\u062F\u0648\u0646 \u0637\u0628\u0642\u0629 \u0646\u0635\u064A\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0628\u062F\u0648\u0646 \u0645\u0641\u062A\u0627\u062D Gemini. \u064A\u0645\u0643\u0646\u0643 \u062A\u0639\u062F\u064A\u0644 \u0623\u0648 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0623\u0648 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0625\u0646\u0641\u0648\u063A\u0631\u0627\u0641\u064A\u0643 \u0627\u0644\u0628\u0635\u0631\u064A.` : `Le document **${filename}** semble \xEAtre un PDF scann\xE9 (sans couche texte directe). Sans connexion active au mod\xE8le multimodal, je ne peux pas lire les pixels de la page, mais vous pouvez consulter les figures extraites et personnaliser l'infographie.`;
  }
  const q = question.toLowerCase();
  const tokens = q.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 3);
  if (/résum|synthes|points?\s+essentiel|تلخيص|لخص|أهم/i.test(q)) {
    const top = lines.slice(0, 6).map((l) => `- ${l}`).join("\n");
    return isAr ? `### \u{1F4C4} \u062E\u0644\u0627\u0635\u0629 \u0627\u0644\u0648\u062B\u064A\u0642\u0629 (${filename})

\u0625\u0644\u064A\u0643 \u0623\u0628\u0631\u0632 \u0627\u0644\u0645\u0639\u0637\u064A\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0646 \u0645\u0644\u0641 PDF:

${top}` : `### \u{1F4C4} Synth\xE8se du document (${filename})

Voici les points cl\xE9s extraits directement de votre PDF :

${top}`;
  }
  if (/quiz|question|exercice|اختبار|تمرين|أسئلة/i.test(q)) {
    const sampleA = lines[0] || filename;
    const sampleB = lines[1] || lines[0] || filename;
    return isAr ? `### \u{1F3AF} \u062A\u0645\u0631\u064A\u0646 \u062A\u0641\u0627\u0639\u0644\u064A \u0627\u0646\u0637\u0644\u0627\u0642\u0627\u064B \u0645\u0646 \u0645\u0644\u0641 PDF

1. **\u0633\u0624\u0627\u0644 1:** \u0627\u0634\u0631\u062D \u0627\u0644\u0641\u0643\u0631\u0629 \u0627\u0644\u0648\u0627\u0631\u062F\u0629 \u0641\u064A \u0627\u0644\u0648\u062B\u064A\u0642\u0629: *"${sampleA.slice(0, 110)}"*.
2. **\u0633\u0624\u0627\u0644 2:** \u0645\u0627 \u0627\u0644\u0639\u0644\u0627\u0642\u0629 \u0627\u0644\u0639\u0644\u0645\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u0644\u0635\u0629 \u0645\u0646: *"${sampleB.slice(0, 110)}"*\u061F
3. **\u0633\u0624\u0627\u0644 3:** \u0635\u063A \u0627\u0633\u062A\u0646\u062A\u0627\u062C\u0627\u064B \u0639\u0627\u0645\u0627\u064B \u064A\u0631\u0628\u0637 \u0628\u064A\u0646 \u0645\u0639\u0637\u064A\u0627\u062A \u0647\u0630\u0627 \u0627\u0644\u062F\u0631\u0633.` : `### \u{1F3AF} Auto-\xE9valuation bas\xE9e sur votre PDF

1. **Question 1 :** Expliquez la notion suivante tir\xE9e du document : *"${sampleA.slice(0, 110)}"*.
2. **Question 2 :** Quel m\xE9canisme ou relation est d\xE9crit dans : *"${sampleB.slice(0, 110)}"* ?
3. **Question 3 :** R\xE9digez une conclusion synth\xE9tique \xE0 retenir pour le contr\xF4le.`;
  }
  const scored = lines.map((line) => {
    const lower = line.toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (lower.includes(tok)) score += 2;
    }
    if (line.includes("|")) score += 1;
    return { line, score };
  }).sort((a, b) => b.score - a.score);
  const matches = scored.filter((s) => s.score > 0).slice(0, 5).map((s) => s.line);
  const selected = matches.length > 0 ? matches : lines.slice(0, 4);
  if (isAr) {
    return `### \u{1F4A1} \u0625\u062C\u0627\u0628\u0629 \u0627\u0646\u0637\u0644\u0627\u0642\u0627\u064B \u0645\u0646 \u0645\u062D\u062A\u0648\u0649 PDF (${filename})

\u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0645\u0642\u0627\u0637\u0639 \u0627\u0644\u0648\u062B\u064A\u0642\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0633\u0624\u0627\u0644\u0643 **"${question}"**:

${selected.map((s) => `- ${s}`).join("\n")}

\u064A\u0645\u0643\u0646\u0643 \u0637\u0644\u0628 **\u062A\u0644\u062E\u064A\u0635 \u0634\u0627\u0645\u0644**\u060C **\u0627\u062E\u062A\u0628\u0627\u0631 \u0642\u0635\u064A\u0631**\u060C \u0623\u0648 **\u062A\u062D\u0648\u064A\u0644 \u0623\u064A \u0645\u062D\u0648\u0631 \u0625\u0644\u0649 \u0625\u0646\u0641\u0648\u063A\u0631\u0627\u0641\u064A\u0643**.`;
  }
  return `### \u{1F4A1} R\xE9ponse bas\xE9e sur votre PDF (${filename})

Voici les passages les plus pertinents extraits du document concernant **"${question}"** :

${selected.map((s) => `- ${s}`).join("\n")}

Vous pouvez me demander un **r\xE9sum\xE9**, un **quiz corrig\xE9**, ou de **g\xE9n\xE9rer une infographie** cibl\xE9e sur ce passage.`;
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
    let extractedImages = [];
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
        const pdfData = await pdfParse(buffer, {
          pagerender: createCoordinatePageRenderer()
        });
        rawText = (pdfData.text || "").replace(/\r\n?/g, "\n").trim();
        pageCount = pdfData.numpages || 1;
        docInfo = pdfData.info || {};
      } catch (parseErr) {
        console.warn("PDF parse warning, processing as scanned document:", parseErr?.message);
      }
      try {
        extractedImages = extractImagesFromPdfBuffer(buffer, 10);
      } catch (imgErr) {
        console.warn("PDF embedded image extraction warning:", imgErr?.message);
      }
    }
    rawText = rawText.replace(/\r\n?/g, "\n").trim();
    const compactText = rawText.replace(/\s+/g, " ").trim();
    const hasReadableWords = /[a-zA-ZÀ-ÿ\u0600-\u06FF]{3,}/.test(compactText);
    const isScanned = compactText.length < 12 || !hasReadableWords;
    const analysis = analyzeSvtDocumentContent(rawText, filename, docInfo);
    const apiKey = process.env.GEMINI_API_KEY;
    const canAttachPdfMultimodal = kind === "pdf" && buffer.length <= 12 * 1024 * 1024;
    if ((!isScanned || canAttachPdfMultimodal) && apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } }
        });
        const docLabel = kind === "pdf" ? "PDF" : "PowerPoint";
        const geminiPrompt = `Tu es un inspecteur p\xE9dagogique expert de SVT au coll\xE8ge marocain (1AC, 2AC, 3AC).
Extrais le cours complet \xE0 partir de ce document ${docLabel} en conservant fid\xE8lement TOUT le contenu p\xE9dagogique : titres, paragraphes structur\xE9s, listes, d\xE9finitions ET TOUS LES TABLEAUX (format\xE9s en tableaux Markdown valides | Col 1 | Col 2 |).
Renvoie UNIQUEMENT un objet JSON valide respectant exactement ce sch\xE9ma :
{
  "title": "Titre du cours en fran\xE7ais (fid\xE8le au document)",
  "titleAr": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062F\u0631\u0633 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u062D\u0633\u0628 \u0627\u0644\u0645\u0642\u0631\u0631 \u0627\u0644\u0645\u063A\u0631\u0628\u064A \u0627\u0644\u0631\u0633\u0645\u064A",
  "gradeLevel": "1AC" ou "2AC" ou "3AC",
  "semester": 1 ou 2,
  "themeTitle": "Unit\xE9 / Th\xE8me officiel marocain",
  "themeTitleAr": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0648\u062D\u062F\u0629 \u0627\u0644\u0631\u0633\u0645\u064A",
  "chapterTitle": "Titre du chapitre",
  "chapterTitleAr": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0641\u0635\u0644",
  "summary": "R\xE9sum\xE9 scientifique fid\xE8le en fran\xE7ais (2-3 phrases)",
  "summaryAr": "\u0645\u0644\u062E\u0635 \u0639\u0644\u0645\u064A \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
  "objectives": ["Objectif p\xE9dagogique 1", "Objectif 2"],
  "objectivesAr": ["\u0647\u062F\u0641 \u062A\u0639\u0644\u0645\u064A 1", "\u0647\u062F\u0641 2"],
  "contentSections": [
    {
      "heading": "1. Titre de la partie",
      "headingAr": "1. \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0641\u0642\u0631\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      "bodyMarkdown": "Contenu complet en Markdown (paragraphes, **mots cl\xE9s**, listes - ..., et tableaux Markdown | Col 1 | Col 2 |\\n| --- | --- |\\n| ... | ... |)",
      "bodyMarkdownAr": "\u0646\u0641\u0633 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0648\u0627\u0644\u062C\u062F\u0648\u0644 \u0645\u062A\u0631\u062C\u0645\u0627\u064B \u0628\u062F\u0642\u0629 \u0639\u0644\u0645\u064A\u0629 \u0625\u0644\u0649 \u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      "keyTakeaway": "Id\xE9e cl\xE9 \xE0 retenir",
      "keyTakeawayAr": "\u062E\u0644\u0627\u0635\u0629 \u0645\u0631\u0643\u0632\u0629 \u0644\u0644\u062D\u0641\u0638"
    }
  ],
  "definitions": [
    {
      "term": "Terme scientifique",
      "termAr": "\u0627\u0644\u0645\u0635\u0637\u0644\u062D \u0627\u0644\u0639\u0644\u0645\u064A",
      "definition": "D\xE9finition exacte",
      "definitionAr": "\u0627\u0644\u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0639\u0644\u0645\u064A \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629"
    }
  ]
}

Texte et tableaux d\xE9j\xE0 pr\xE9-extraits du document ${docLabel} :
${rawText ? rawText.slice(0, 14e3) : "(Document scann\xE9 ou sans couche texte : lis directement le PDF joint.)"}`;
        const parts = [];
        if (canAttachPdfMultimodal) {
          parts.push({
            inlineData: {
              mimeType: "application/pdf",
              data: cleanBase64
            }
          });
        }
        parts.push({ text: geminiPrompt });
        const geminiTimeoutMs = 15e3;
        const abortController = new AbortController();
        const timeoutHandle = setTimeout(() => abortController.abort(), geminiTimeoutMs);
        let response = null;
        try {
          response = await Promise.race([
            ai.models.generateContent({
              model: "gemini-4-hydrogen",
              contents: { parts },
              config: {
                responseMimeType: "application/json",
                abortSignal: abortController.signal
              }
            }),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error("Gemini extraction timeout")), geminiTimeoutMs)
            )
          ]);
        } finally {
          clearTimeout(timeoutHandle);
        }
        if (response?.text) {
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
          if (Array.isArray(parsed.contentSections) && parsed.contentSections.length > 0) {
            analysis.contentSections = parsed.contentSections.filter((s) => s && (s.heading || s.bodyMarkdown)).slice(0, 30).map((s, idx) => ({
              heading: String(s.heading || `${idx + 1}. Partie du cours`).slice(0, 160),
              headingAr: String(s.headingAr || s.heading || `${idx + 1}. \u0641\u0642\u0631\u0629 \u0645\u0646 \u0627\u0644\u062F\u0631\u0633`).slice(0, 160),
              bodyMarkdown: String(s.bodyMarkdown || "").slice(0, 8e3),
              bodyMarkdownAr: String(s.bodyMarkdownAr || s.bodyMarkdown || "").slice(0, 8e3),
              ...s.keyTakeaway ? { keyTakeaway: String(s.keyTakeaway).slice(0, 400) } : {},
              ...s.keyTakeawayAr ? { keyTakeawayAr: String(s.keyTakeawayAr).slice(0, 400) } : {}
            }));
          }
          if (Array.isArray(parsed.definitions) && parsed.definitions.length > 0) {
            analysis.definitions = parsed.definitions.filter((d) => d && d.term && d.definition).slice(0, 30).map((d) => ({
              term: String(d.term).slice(0, 120),
              termAr: String(d.termAr || d.term).slice(0, 120),
              definition: String(d.definition).slice(0, 800),
              definitionAr: String(d.definitionAr || d.definition).slice(0, 800)
            }));
          }
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
      extractedImages,
      rawSnippet: rawText.slice(0, 600)
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
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } }
        });
        const response = await ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
          config: {
            systemInstruction
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
async function runGeminiWithTimeout(apiKey, params, timeoutMs = 18e3) {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } }
  });
  const abortController = new AbortController();
  const handle = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    const config = { abortSignal: abortController.signal };
    if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
    if (params.responseMimeType) config.responseMimeType = params.responseMimeType;
    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: params.contents,
        config
      }),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Gemini PDF AI timeout")), timeoutMs)
      )
    ]);
    return response?.text || null;
  } finally {
    clearTimeout(handle);
  }
}
function mergeInfographicData(base, candidate) {
  if (!candidate || typeof candidate !== "object") return base;
  return {
    title: candidate.title ? String(candidate.title).slice(0, 110) : base.title,
    titleAr: candidate.titleAr ? String(candidate.titleAr).slice(0, 110) : base.titleAr,
    subtitle: candidate.subtitle ? String(candidate.subtitle).slice(0, 140) : base.subtitle,
    subtitleAr: candidate.subtitleAr ? String(candidate.subtitleAr).slice(0, 140) : base.subtitleAr,
    gradeLevel: ["1AC", "2AC", "3AC"].includes(String(candidate.gradeLevel)) ? candidate.gradeLevel : base.gradeLevel,
    subjectTag: candidate.subjectTag ? String(candidate.subjectTag).slice(0, 50) : base.subjectTag,
    subjectTagAr: candidate.subjectTagAr ? String(candidate.subjectTagAr).slice(0, 50) : base.subjectTagAr,
    keyMetrics: Array.isArray(candidate.keyMetrics) && candidate.keyMetrics.length > 0 ? candidate.keyMetrics.slice(0, 4).map((m, idx) => ({
      value: String(m?.value || base.keyMetrics[idx]?.value || "-").slice(0, 22),
      label: String(m?.label || base.keyMetrics[idx]?.label || "Indicateur").slice(0, 45),
      labelAr: String(m?.labelAr || m?.label || base.keyMetrics[idx]?.labelAr || "\u0645\u0624\u0634\u0631").slice(0, 45),
      detail: String(m?.detail || base.keyMetrics[idx]?.detail || "").slice(0, 60),
      detailAr: String(m?.detailAr || m?.detail || base.keyMetrics[idx]?.detailAr || "").slice(0, 60)
    })) : base.keyMetrics,
    processSteps: Array.isArray(candidate.processSteps) && candidate.processSteps.length > 0 ? candidate.processSteps.slice(0, 5).map((s, idx) => ({
      stepNumber: idx + 1,
      title: String(s?.title || `\xC9tape ${idx + 1}`).slice(0, 60),
      titleAr: String(s?.titleAr || s?.title || `\u0627\u0644\u0645\u0631\u062D\u0644\u0629 ${idx + 1}`).slice(0, 60),
      description: String(s?.description || "").slice(0, 150),
      descriptionAr: String(s?.descriptionAr || s?.description || "").slice(0, 150)
    })) : base.processSteps,
    mindMapBranches: Array.isArray(candidate.mindMapBranches) && candidate.mindMapBranches.length > 0 ? candidate.mindMapBranches.slice(0, 6).map((b, idx) => ({
      branchTitle: String(b?.branchTitle || `Axe ${idx + 1}`).slice(0, 48),
      branchTitleAr: String(b?.branchTitleAr || b?.branchTitle || `\u0627\u0644\u0645\u062D\u0648\u0631 ${idx + 1}`).slice(0, 48),
      points: Array.isArray(b?.points) ? b.points.slice(0, 3).map((p) => String(p).slice(0, 80)) : ["Notion cl\xE9"],
      pointsAr: Array.isArray(b?.pointsAr) ? b.pointsAr.slice(0, 3).map((p) => String(p).slice(0, 80)) : ["\u0641\u0643\u0631\u0629 \u0623\u0633\u0627\u0633\u064A\u0629"]
    })) : base.mindMapBranches,
    comparisonTable: candidate.comparisonTable && Array.isArray(candidate.comparisonTable.headers) && candidate.comparisonTable.headers.length >= 2 && Array.isArray(candidate.comparisonTable.rows) && candidate.comparisonTable.rows.length > 0 ? {
      headers: candidate.comparisonTable.headers.slice(0, 4).map((h) => String(h).slice(0, 40)),
      headersAr: (Array.isArray(candidate.comparisonTable.headersAr) && candidate.comparisonTable.headersAr.length >= 2 ? candidate.comparisonTable.headersAr : candidate.comparisonTable.headers).slice(0, 4).map((h) => String(h).slice(0, 40)),
      rows: candidate.comparisonTable.rows.slice(0, 5).map((r) => Array.isArray(r) ? r.slice(0, 4).map((c) => String(c).slice(0, 80)) : []),
      rowsAr: (Array.isArray(candidate.comparisonTable.rowsAr) && candidate.comparisonTable.rowsAr.length > 0 ? candidate.comparisonTable.rowsAr : candidate.comparisonTable.rows).slice(0, 5).map((r) => Array.isArray(r) ? r.slice(0, 4).map((c) => String(c).slice(0, 80)) : [])
    } : base.comparisonTable,
    keyTakeaways: Array.isArray(candidate.keyTakeaways) && candidate.keyTakeaways.length > 0 ? candidate.keyTakeaways.slice(0, 4).map((k) => ({
      fr: String(k?.fr || "").slice(0, 160),
      ar: String(k?.ar || k?.fr || "").slice(0, 160)
    })) : base.keyTakeaways,
    glossary: Array.isArray(candidate.glossary) && candidate.glossary.length > 0 ? candidate.glossary.slice(0, 6).map((g) => ({
      term: String(g?.term || "").slice(0, 60),
      termAr: String(g?.termAr || g?.term || "").slice(0, 60),
      definition: String(g?.definition || "").slice(0, 180),
      definitionAr: String(g?.definitionAr || g?.definition || "").slice(0, 180)
    })) : base.glossary
  };
}
app.post("/api/pdf-ai/analyze", async (req, res) => {
  try {
    const rawBase64 = req.body.fileBase64 || req.body.pdfBase64;
    const filename = req.body.filename || "document.pdf";
    if (!rawBase64) {
      return res.status(400).json({ error: "Fichier PDF manquant (base64 requis)." });
    }
    const cleanBase64 = String(rawBase64).replace(/^data:[^;]*;base64,/i, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    let rawText = "";
    let pageCount = 1;
    let extractedImages = [];
    try {
      const pdfData = await pdfParse(buffer, {
        pagerender: createCoordinatePageRenderer()
      });
      rawText = (pdfData.text || "").replace(/\r\n?/g, "\n").trim();
      pageCount = pdfData.numpages || 1;
    } catch (err) {
      console.warn("PDF AI parse warning:", err?.message);
    }
    try {
      extractedImages = extractImagesFromPdfBuffer(buffer, 6);
    } catch (err) {
      console.warn("PDF AI image extraction warning:", err?.message);
    }
    const compactText = rawText.replace(/\s+/g, " ").trim();
    const isScanned = compactText.length < 15 || !/[a-zA-ZÀ-ÿ\u0600-\u06FF]{3,}/.test(compactText);
    const fallback = buildFallbackPdfAnalysis(
      rawText,
      filename,
      pageCount,
      extractedImages.length
    );
    let result = fallback;
    let source = "pdf-local-engine";
    const apiKey = process.env.GEMINI_API_KEY;
    const canAttachPdf = buffer.length <= 12 * 1024 * 1024;
    if ((!isScanned || canAttachPdf) && apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        const prompt = `Tu es un assistant IA expert en lecture de documents PDF et en cr\xE9ation d'infographies p\xE9dagogiques bilingues (Fran\xE7ais & Arabe) pour SVT Coll\xE8ge Maroc.
Lis attentivement ce PDF (${pageCount} page(s)) et g\xE9n\xE8re UNIQUEMENT un objet JSON valide respectant exactement cette structure :
{
  "title": "Titre clair du document en fran\xE7ais",
  "titleAr": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0648\u062B\u064A\u0642\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
  "summaryFr": "R\xE9sum\xE9 structur\xE9 complet et fid\xE8le en fran\xE7ais (3-4 phrases)",
  "summaryAr": "\u0645\u0644\u062E\u0635 \u0639\u0644\u0645\u064A \u0634\u0627\u0645\u0644 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 (3-4 \u062C\u0645\u0644)",
  "outline": [
    {
      "heading": "Axe / Chapitre",
      "headingAr": "\u0627\u0644\u0645\u062D\u0648\u0631 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
      "keyPoints": ["Point cl\xE9 1", "Point cl\xE9 2"],
      "keyPointsAr": ["\u0641\u0643\u0631\u0629 \u0631\u0626\u064A\u0633\u064A\u0629 1", "\u0641\u0643\u0631\u0629 \u0631\u0626\u064A\u0633\u064A\u0629 2"]
    }
  ],
  "suggestedQuestions": [
    { "fr": "Question pertinente sur ce PDF ?", "ar": "\u0633\u0624\u0627\u0644 \u0645\u0647\u0645 \u062D\u0648\u0644 \u0647\u0630\u0647 \u0627\u0644\u0648\u062B\u064A\u0642\u0629\u061F" }
  ],
  "infographic": {
    "title": "Titre court pour l'infographie",
    "titleAr": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0625\u0646\u0641\u0648\u063A\u0631\u0627\u0641\u064A\u0643",
    "subtitle": "Sous-titre synth\xE9tique",
    "subtitleAr": "\u0639\u0646\u0648\u0627\u0646 \u0641\u0631\u0639\u064A",
    "gradeLevel": "1AC" | "2AC" | "3AC",
    "subjectTag": "Th\xE8me SVT",
    "subjectTagAr": "\u0645\u0648\u0636\u0648\u0639 \u0627\u0644\u062F\u0631\u0633",
    "keyMetrics": [
      { "value": "Chiffre/Mot cl\xE9 court", "label": "Libell\xE9", "labelAr": "\u0627\u0644\u062A\u0633\u0645\u064A\u0629", "detail": "Pr\xE9cision courte", "detailAr": "\u062A\u0648\u0636\u064A\u062D" }
    ],
    "processSteps": [
      { "stepNumber": 1, "title": "\xC9tape 1", "titleAr": "\u0627\u0644\u0645\u0631\u062D\u0644\u0629 1", "description": "Explication concise (max 100 car.)", "descriptionAr": "\u0634\u0631\u062D \u0645\u0648\u062C\u0632" }
    ],
    "mindMapBranches": [
      { "branchTitle": "Branche", "branchTitleAr": "\u0627\u0644\u0641\u0631\u0639", "points": ["Sous-point 1", "Sous-point 2"], "pointsAr": ["\u0639\u0646\u0635\u0631 1", "\u0639\u0646\u0635\u0631 2"] }
    ],
    "comparisonTable": {
      "headers": ["Crit\xE8re", "\xC9l\xE9ment A", "\xC9l\xE9ment B"],
      "headersAr": ["\u0627\u0644\u0645\u0639\u064A\u0627\u0631", "\u0627\u0644\u0639\u0646\u0635\u0631 \u0623", "\u0627\u0644\u0639\u0646\u0635\u0631 \u0628"],
      "rows": [["Ligne 1", "Valeur", "Valeur"]],
      "rowsAr": [["\u0633\u0637\u0631 1", "\u0642\u064A\u0645\u0629", "\u0642\u064A\u0645\u0629"]]
    },
    "keyTakeaways": [{ "fr": "Id\xE9e cl\xE9 \xE0 retenir", "ar": "\u0641\u0643\u0631\u0629 \u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u062D\u0641\u0638" }],
    "glossary": [{ "term": "Terme", "termAr": "\u0627\u0644\u0645\u0635\u0637\u0644\u062D", "definition": "D\xE9finition courte", "definitionAr": "\u062A\u0639\u0631\u064A\u0641 \u0645\u0648\u062C\u0632" }]
  }
}

Texte pr\xE9-extrait du PDF :
${rawText ? rawText.slice(0, 15e3) : "(PDF scann\xE9 : lis directement le document PDF joint.)"}`;
        const parts = [];
        if (canAttachPdf) {
          parts.push({ inlineData: { mimeType: "application/pdf", data: cleanBase64 } });
        }
        parts.push({ text: prompt });
        const jsonText = await runGeminiWithTimeout(apiKey, {
          contents: { parts },
          responseMimeType: "application/json"
        });
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          result = {
            title: parsed.title ? String(parsed.title).slice(0, 140) : fallback.title,
            titleAr: parsed.titleAr ? String(parsed.titleAr).slice(0, 140) : fallback.titleAr,
            summaryFr: parsed.summaryFr ? String(parsed.summaryFr).slice(0, 1400) : fallback.summaryFr,
            summaryAr: parsed.summaryAr ? String(parsed.summaryAr).slice(0, 1400) : fallback.summaryAr,
            outline: Array.isArray(parsed.outline) && parsed.outline.length > 0 ? parsed.outline.slice(0, 8).map((o, idx) => ({
              heading: String(o?.heading || `Section ${idx + 1}`).slice(0, 120),
              headingAr: String(o?.headingAr || o?.heading || `\u0627\u0644\u0645\u062D\u0648\u0631 ${idx + 1}`).slice(0, 120),
              keyPoints: Array.isArray(o?.keyPoints) ? o.keyPoints.slice(0, 4).map((p) => String(p).slice(0, 200)) : [],
              keyPointsAr: Array.isArray(o?.keyPointsAr) ? o.keyPointsAr.slice(0, 4).map((p) => String(p).slice(0, 200)) : []
            })) : fallback.outline,
            suggestedQuestions: Array.isArray(parsed.suggestedQuestions) && parsed.suggestedQuestions.length > 0 ? parsed.suggestedQuestions.slice(0, 4).map((q) => ({
              fr: String(q?.fr || "").slice(0, 160),
              ar: String(q?.ar || q?.fr || "").slice(0, 160)
            })) : fallback.suggestedQuestions,
            infographic: mergeInfographicData(fallback.infographic, parsed.infographic)
          };
          source = "gemini-4-hydrogen";
        }
      } catch (geminiErr) {
        console.warn("Gemini PDF AI analyze fallback:", geminiErr?.message);
      }
    }
    return res.json({
      success: true,
      filename,
      pageCount,
      isScanned,
      rawText: rawText.slice(0, 3e4),
      extractedImages,
      source,
      ...result
    });
  } catch (err) {
    console.error("Server error /api/pdf-ai/analyze:", err);
    return res.status(500).json({ error: "Erreur lors de l'analyse IA du PDF." });
  }
});
app.post("/api/pdf-ai/chat", async (req, res) => {
  try {
    const {
      rawText = "",
      pdfBase64,
      filename = "document.pdf",
      question,
      history = [],
      language = "fr",
      gradeLevel = "3AC"
    } = req.body;
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: "La question est requise." });
    }
    const q = String(question).trim();
    const lang = language === "ar" ? "ar" : "fr";
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        const cleanBase64 = pdfBase64 ? String(pdfBase64).replace(/^data:[^;]*;base64,/i, "") : "";
        const pdfBytesLen = cleanBase64 ? Buffer.byteLength(cleanBase64, "base64") : 0;
        const shouldAttachPdf = Boolean(cleanBase64 && pdfBytesLen > 0 && pdfBytesLen <= 8 * 1024 * 1024);
        const recentHistory = Array.isArray(history) ? history.slice(-6).map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${String(m.content || "").slice(0, 600)}`).join("\n") : "";
        const systemInstruction = `Tu es l'assistant IA lecteur de PDF de SVT COLL\xC8GE PRO (${gradeLevel}).
Tu dois discuter du document "${filename}" avec pr\xE9cision et p\xE9dagogie en ${lang === "ar" ? "arabe scientifique clair (\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629)" : "fran\xE7ais scientifique rigoureux et clair"}.
Appuie-toi exclusivement sur le contenu du PDF fourni (texte, tableaux et pages). Formate tes r\xE9ponses en Markdown clair (titres ###, puces -, **mots cl\xE9s**, tableaux Markdown | Col 1 | Col 2 | si utile).`;
        const promptText = `${recentHistory ? `Historique r\xE9cent de la discussion :
${recentHistory}

` : ""}Contenu extrait du PDF (${filename}) :
${rawText ? String(rawText).slice(0, 2e4) : "(Utilise le fichier PDF joint)"}

Question de l'utilisateur :
${q}`;
        const parts = [];
        if (shouldAttachPdf) {
          parts.push({ inlineData: { mimeType: "application/pdf", data: cleanBase64 } });
        }
        parts.push({ text: promptText });
        const reply = await runGeminiWithTimeout(apiKey, {
          contents: { parts },
          systemInstruction
        });
        if (reply) {
          return res.json({ reply, source: "gemini-4-hydrogen" });
        }
      } catch (geminiErr) {
        console.warn("Gemini PDF chat fallback:", geminiErr?.message);
      }
    }
    const fallbackReply = buildFallbackPdfChatReply(String(rawText), q, String(filename), lang);
    return res.json({ reply: fallbackReply, source: "pdf-local-engine" });
  } catch (err) {
    console.error("Server error /api/pdf-ai/chat:", err);
    return res.status(500).json({ error: "Erreur lors de la discussion avec le PDF." });
  }
});
app.post("/api/pdf-ai/infographic", async (req, res) => {
  try {
    const {
      rawText = "",
      filename = "document.pdf",
      focusPrompt = "",
      layout = "summary",
      pageCount = 1,
      imageCount = 0
    } = req.body;
    const fallback = buildFallbackPdfAnalysis(
      String(rawText),
      String(filename),
      Number(pageCount) || 1,
      Number(imageCount) || 0
    ).infographic;
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        const prompt = `G\xE9n\xE8re une infographie p\xE9dagogique structur\xE9e (JSON uniquement) \xE0 partir de ce document PDF (${filename}).
Mode visuel cibl\xE9 : ${layout}.
Consigne personnalis\xE9e de l'utilisateur : ${focusPrompt || "Synth\xE8se visuelle compl\xE8te et claire du cours"}.
Renvoie UNIQUEMENT un objet JSON valide :
{
  "title": "Titre concis de l'infographie",
  "titleAr": "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0625\u0646\u0641\u0648\u063A\u0631\u0627\u0641\u064A\u0643",
  "subtitle": "Sous-titre explicatif",
  "subtitleAr": "\u0639\u0646\u0648\u0627\u0646 \u0641\u0631\u0639\u064A",
  "gradeLevel": "1AC" | "2AC" | "3AC",
  "subjectTag": "Cat\xE9gorie",
  "subjectTagAr": "\u0627\u0644\u062A\u0635\u0646\u064A\u0641",
  "keyMetrics": [{ "value": "Valeur", "label": "Libell\xE9", "labelAr": "\u0627\u0644\u062A\u0633\u0645\u064A\u0629", "detail": "D\xE9tail", "detailAr": "\u062A\u0641\u0635\u064A\u0644" }],
  "processSteps": [{ "stepNumber": 1, "title": "\xC9tape", "titleAr": "\u0645\u0631\u062D\u0644\u0629", "description": "Description concise", "descriptionAr": "\u0648\u0635\u0641" }],
  "mindMapBranches": [{ "branchTitle": "Branche", "branchTitleAr": "\u0641\u0631\u0639", "points": ["Point 1", "Point 2"], "pointsAr": ["\u0646\u0642\u0637\u0629 1", "\u0646\u0642\u0637\u0629 2"] }],
  "comparisonTable": { "headers": ["A", "B", "C"], "headersAr": ["\u0623", "\u0628", "\u062C"], "rows": [["1", "2", "3"]], "rowsAr": [["1", "2", "3"]] },
  "keyTakeaways": [{ "fr": "\xC0 retenir", "ar": "\u062E\u0644\u0627\u0635\u0629" }],
  "glossary": [{ "term": "Terme", "termAr": "\u0645\u0635\u0637\u0644\u062D", "definition": "D\xE9finition", "definitionAr": "\u062A\u0639\u0631\u064A\u0641" }]
}

Texte du PDF :
${String(rawText).slice(0, 16e3)}`;
        const jsonText = await runGeminiWithTimeout(apiKey, {
          contents: prompt,
          responseMimeType: "application/json"
        });
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          return res.json({
            infographic: mergeInfographicData(fallback, parsed),
            source: "gemini-4-hydrogen"
          });
        }
      } catch (err) {
        console.warn("Gemini infographic regeneration fallback:", err?.message);
      }
    }
    return res.json({ infographic: fallback, source: "pdf-local-engine" });
  } catch (err) {
    console.error("Server error /api/pdf-ai/infographic:", err);
    return res.status(500).json({ error: "Erreur lors de la g\xE9n\xE9ration de l'infographie." });
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
