import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackPdfAnalysis,
  buildFallbackPdfChatReply,
} from './pdfAiEngine';
import { renderInfographicSvg } from '../src/utils/infographicSvg';

const SAMPLE_PDF_TEXT = `1AC - Semestre 1 : La respiration dans différents milieux
I. Les organes respiratoires
Les êtres vivants prélèvent le dioxygène dans leur milieu grâce à des organes spécialisés.

| Milieu | Organe | Exemple |
| --- | --- | --- |
| Aérien | Poumons | Homme |
| Aquatique | Branchies | Poisson |

II. Mécanismes des échanges gazeux
Alvéole pulmonaire : Sac aérien microscopique où se font les échanges gazeux avec le sang.
À retenir : Les branchies assurent la respiration dans l'eau.`;

test('buildFallbackPdfAnalysis builds complete outline, comparison table, and infographic blueprint', () => {
  const result = buildFallbackPdfAnalysis(SAMPLE_PDF_TEXT, 'respiration_1ac.pdf', 3, 2);

  assert.equal(result.infographic.gradeLevel, '1AC');
  assert.ok(result.outline.length >= 2);
  assert.equal(result.infographic.comparisonTable.headers[0], 'Milieu');
  assert.equal(result.infographic.comparisonTable.rows.length, 2);
  assert.ok(result.infographic.glossary.some(g => g.term.includes('Alvéole')));
  assert.equal(result.infographic.keyMetrics[0].value, '3');
  assert.ok(result.suggestedQuestions.length >= 3);
});

test('buildFallbackPdfChatReply answers summary, quiz, and keyword questions in FR and AR', () => {
  const summaryReply = buildFallbackPdfChatReply(
    SAMPLE_PDF_TEXT,
    'Résume les points essentiels',
    'respiration_1ac.pdf',
    'fr'
  );
  assert.ok(summaryReply.includes('Synthèse du document'));

  const branchiesReply = buildFallbackPdfChatReply(
    SAMPLE_PDF_TEXT,
    'Quel organe permet la respiration aquatique ?',
    'respiration_1ac.pdf',
    'fr'
  );
  assert.ok(branchiesReply.toLowerCase().includes('branchies') || branchiesReply.toLowerCase().includes('aquatique'));

  const arQuiz = buildFallbackPdfChatReply(
    SAMPLE_PDF_TEXT,
    'اقترح اختبار قصير',
    'respiration_1ac.pdf',
    'ar'
  );
  assert.ok(arQuiz.includes('تمرين'));
});

test('renderInfographicSvg outputs valid escaped SVG across all 4 layouts and FR/AR', () => {
  const { infographic } = buildFallbackPdfAnalysis(SAMPLE_PDF_TEXT, 'respiration_1ac.pdf', 2, 1);

  for (const layout of ['summary', 'process', 'comparison', 'mindmap'] as const) {
    const svgFr = renderInfographicSvg(infographic, {
      layout,
      theme: 'emerald',
      language: 'fr',
    });
    assert.ok(svgFr.startsWith('<svg '));
    assert.ok(svgFr.endsWith('</svg>'));
    assert.ok(svgFr.includes('SVT COLLÈGE PRO'));

    const svgAr = renderInfographicSvg(infographic, {
      layout,
      theme: 'ocean',
      language: 'ar',
    });
    assert.ok(svgAr.includes('direction="rtl"'));
  }
});
