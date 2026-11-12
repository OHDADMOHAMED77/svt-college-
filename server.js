// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { GoogleGenAI } from "@google/genai";
var require2 = createRequire(import.meta.url);
var pdfParse = require2("pdf-parse");
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
var HOST = "0.0.0.0";
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.get("/healthz", (_req, res) => {
  res.status(200).send("OK");
});
app.post("/api/parse-pdf", async (req, res) => {
  try {
    const { pdfBase64, filename } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "Fichier PDF manquant (base64 requis)." });
    }
    const cleanBase64 = String(pdfBase64).replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    let pdfData = { text: "", numpages: 1, info: {} };
    try {
      pdfData = await pdfParse(buffer);
    } catch (parseErr) {
      console.warn("PDF parse warning, processing as scanned document:", parseErr?.message);
    }
    const rawText = (pdfData.text || "").trim();
    const isScanned = rawText.length < 40;
    const analysis = analyzeSvtPdfContent(rawText, filename || "cours.pdf", pdfData.info);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!isScanned && apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const geminiPrompt = `Tu es un inspecteur p\xE9dagogique expert de SVT au coll\xE8ge marocain (1AC, 2AC, 3AC).
Analyse cet extrait de cours PDF et renvoie UNIQUEMENT un objet JSON valide avec cette structure :
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

Texte extrait du document PDF :
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
      hasText: !isScanned,
      isScanned,
      pageCount: pdfData.numpages || 1,
      extracted: analysis,
      rawSnippet: rawText.slice(0, 400)
    });
  } catch (err) {
    console.error("Server error /api/parse-pdf:", err);
    res.status(500).json({ error: "Erreur interne lors du traitement du fichier PDF." });
  }
});
function analyzeSvtPdfContent(rawText, filename, info) {
  const lower = (rawText + " " + filename).toLowerCase();
  let gradeLevel = "3AC";
  if (lower.includes("1ac") || lower.includes("1 asc") || lower.includes("premi\xE8re ann\xE9e") || lower.includes("\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0623\u0648\u0644\u0649") || lower.includes("milieu naturel") || lower.includes("respiration des \xEAtres vivants") || lower.includes("v\xE9g\xE9taux chlorophylliens")) {
    gradeLevel = "1AC";
  } else if (lower.includes("2ac") || lower.includes("2 asc") || lower.includes("deuxi\xE8me ann\xE9e") || lower.includes("\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u062B\u0627\u0646\u064A\u0629") || lower.includes("tectonique") || lower.includes("s\xE9isme") || lower.includes("volcan") || lower.includes("d\xE9rive des continents") || lower.includes("roches magmatiques")) {
    gradeLevel = "2AC";
  } else if (lower.includes("3ac") || lower.includes("3 asc") || lower.includes("troisi\xE8me ann\xE9e") || lower.includes("\u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u062B\u0627\u0644\u062B\u0629") || lower.includes("digestion") || lower.includes("nerveux") || lower.includes("immunit\xE9") || lower.includes("nutriment") || lower.includes("absorption")) {
    gradeLevel = "3AC";
  }
  let semester = 1;
  if (lower.includes("semestre 2") || lower.includes("s2") || lower.includes("\u0627\u0644\u062F\u0648\u0631\u0629 \u0627\u0644\u062B\u0627\u0646\u064A\u0629") || lower.includes("syst\xE8me nerveux") || lower.includes("immunit\xE9") || lower.includes("g\xE9ologie externe") || lower.includes("reproduction chez les animaux")) {
    semester = 2;
  }
  let themeTitle = gradeLevel === "1AC" ? "Unit\xE9 1 : Les relations entre les \xEAtres vivants et leurs interactions avec les milieux" : gradeLevel === "2AC" ? "Unit\xE9 1 : Les ph\xE9nom\xE8nes g\xE9ologiques internes" : semester === 2 ? "Unit\xE9 2 : Les fonctions de communication et l'immunit\xE9" : "Unit\xE9 1 : Les fonctions de nutrition et l'\xE9ducation nutritionnelle";
  let themeTitleAr = gradeLevel === "1AC" ? "\u0627\u0644\u0648\u062D\u062F\u0629 1 : \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A \u0628\u064A\u0646 \u0627\u0644\u0643\u0627\u0626\u0646\u0627\u062A \u0627\u0644\u062D\u064A\u0629 \u0648\u062A\u0641\u0627\u0639\u0644\u0647\u0627 \u0645\u0639 \u0623\u0648\u0633\u0627\u0637 \u0639\u064A\u0634\u0647\u0627" : gradeLevel === "2AC" ? "\u0627\u0644\u0648\u062D\u062F\u0629 1 : \u0627\u0644\u0638\u0648\u0627\u0647\u0631 \u0627\u0644\u062C\u064A\u0648\u0644\u0648\u062C\u064A\u0629 \u0627\u0644\u0628\u0627\u0637\u0646\u064A\u0629" : semester === 2 ? "\u0627\u0644\u0648\u062D\u062F\u0629 2 : \u0648\u0638\u0627\u0626\u0641 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0648\u0627\u0644\u0645\u0646\u0627\u0639\u0629" : "\u0627\u0644\u0648\u062D\u062F\u0629 1 : \u0648\u0638\u0627\u0626\u0641 \u0627\u0644\u0627\u0642\u062A\u064A\u0627\u062A \u0648\u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u063A\u0630\u0627\u0626\u064A\u0629";
  let title = "";
  let titleAr = "";
  if (info && info.Title && typeof info.Title === "string" && info.Title.trim().length > 4 && !info.Title.toLowerCase().includes("untitled")) {
    title = info.Title.trim();
  }
  if (!title && rawText) {
    const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 80);
    for (const line of lines) {
      const match = line.match(/(?:le[çc]on|chapitre|cours|titre|module)\s*[:\-–]\s*(.+)/i);
      if (match && match[1]) {
        title = match[1].trim();
        break;
      }
    }
    if (!title && lines.length > 0) {
      const candidate = lines.find((l) => /^(le|la|les|l'|d'|étude|notion|introduction|structure)\s+/i.test(l) && l.length < 70);
      if (candidate) title = candidate;
    }
  }
  if (!title) {
    const clean = filename.replace(/\.[^/.]+$/, "").replace(/[_\-]+/g, " ").replace(/\b(cours|svt|college|pro|1ac|2ac|3ac|s1|s2|pdf|doc)\b/gi, "").trim();
    if (clean.length > 3) {
      title = clean.charAt(0).toUpperCase() + clean.slice(1);
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
  } else if (titleLower.includes("s\xE9isme") || titleLower.includes("seisme")) {
    titleAr = "\u0627\u0644\u0632\u0644\u0627\u0632\u0644 \u0648\u0639\u0644\u0627\u0642\u062A\u0647\u0627 \u0628\u062A\u0643\u062A\u0648\u0646\u064A\u0629 \u0627\u0644\u0635\u0641\u0627\u0626\u062D";
  } else if (titleLower.includes("tectonique") || titleLower.includes("d\xE9rive")) {
    titleAr = "\u062A\u0643\u062A\u0648\u0646\u064A\u0629 \u0627\u0644\u0635\u0641\u0627\u0626\u062D \u0648\u0632\u062D\u0632\u062D\u0629 \u0627\u0644\u0642\u0627\u0631\u0627\u062A";
  } else if (titleLower.includes("milieu")) {
    titleAr = "\u0627\u0633\u062A\u0643\u0634\u0627\u0641 \u0648\u0633\u0637 \u0637\u0628\u064A\u0639\u064A \u0648\u0645\u0644\u0627\u062D\u0638\u0629 \u0627\u0644\u062E\u0644\u064A\u0629";
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
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
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
