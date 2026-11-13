import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {
  analyzeSvtDocumentContent,
  detectDocumentKind,
  extractLegacyPptText,
  extractPptxContent,
} from './documentParser';

test('detectDocumentKind identifies pptx, ppt, and pdf by extension and magic bytes', () => {
  assert.equal(detectDocumentKind('cours_volcanisme.pptx'), 'pptx');
  assert.equal(detectDocumentKind('diapo_digestion.PPT'), 'ppt');
  assert.equal(detectDocumentKind('fiche_svt.pdf'), 'pdf');

  const zipMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
  assert.equal(detectDocumentKind('unknown.bin', zipMagic), 'pptx');

  const oleMagic = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1]);
  assert.equal(detectDocumentKind('unknown.bin', oleMagic), 'ppt');

  const pdfMagic = Buffer.from('%PDF-1.4\n', 'ascii');
  assert.equal(detectDocumentKind('unknown.bin', pdfMagic), 'pdf');
});

test('extractPptxContent extracts core.xml title and ordered slide paragraphs', async () => {
  const zip = new JSZip();
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title>La tectonique des plaques</dc:title>
    </cp:coreProperties>`
  );
  zip.file(
    'ppt/slides/slide1.xml',
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree><p:sp><p:txBody>
        <a:p><a:r><a:t>SVT Collège 2AC - Semestre 1</a:t></a:r></a:p>
        <a:p><a:r><a:t>Chapitre 1 : La dérive des continents &amp; tectonique</a:t></a:r></a:p>
      </p:txBody></p:sp></p:spTree></p:cSld>
    </p:sld>`
  );
  zip.file(
    'ppt/slides/slide2.xml',
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree><p:sp><p:txBody>
        <a:p><a:r><a:t>Les plaques lithosphériques et les séismes.</a:t></a:r></a:p>
      </p:txBody></p:sp></p:spTree></p:cSld>
    </p:sld>`
  );

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const result = await extractPptxContent(buffer);

  assert.equal(result.slideCount, 2);
  assert.equal(result.titleFromMeta, 'La tectonique des plaques');
  assert.ok(result.text.includes('SVT Collège 2AC - Semestre 1'));
  assert.ok(result.text.includes('dérive des continents & tectonique'));
  assert.ok(result.text.includes('Les plaques lithosphériques et les séismes.'));

  const analysis = analyzeSvtDocumentContent(result.text, 'diapo_2ac.pptx', {
    Title: result.titleFromMeta,
  });
  assert.equal(analysis.title, 'La tectonique des plaques');
  assert.equal(analysis.gradeLevel, '2AC');
  assert.equal(analysis.semester, 1);
  assert.ok(analysis.titleAr.includes('تكتونية'));
});

test('extractLegacyPptText extracts French UTF-16LE text and ignores boilerplate', () => {
  const sample = Buffer.concat([
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0x00, 0x00]),
    Buffer.from('PowerPoint Document\0', 'utf16le'),
    Buffer.from('Chapitre 2 : La digestion et absorption intestinale\0', 'utf16le'),
    Buffer.from('Programme 3AC Semestre 1\0', 'utf16le'),
  ]);

  const { text } = extractLegacyPptText(sample);
  assert.ok(text.includes('Chapitre 2 : La digestion et absorption intestinale'));
  assert.ok(!text.includes('PowerPoint Document'));

  const analysis = analyzeSvtDocumentContent(text, 'presentation_01.ppt');
  assert.equal(analysis.title, 'La digestion et absorption intestinale');
  assert.equal(analysis.gradeLevel, '3AC');
  assert.equal(analysis.semester, 1);
});

test('analyzeSvtDocumentContent returns empty title for generic image-only slides', () => {
  const analysis = analyzeSvtDocumentContent('', 'presentation_1.pptx');
  assert.equal(analysis.title, '');
});
