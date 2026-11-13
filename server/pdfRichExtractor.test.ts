import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {
  buildPageTextWithTables,
  extractImagesFromPdfBuffer,
} from './pdfRichExtractor';
import { buildStructuredCourseFromText } from './documentParser';

test('buildPageTextWithTables reconstructs Markdown tables from X/Y coordinates', () => {
  const items = [
    // Normal intro line
    { str: 'Comparaison', transform: [1, 0, 0, 1, 50, 720], width: 65, height: 12 },
    { str: 'des organes', transform: [1, 0, 0, 1, 120, 720], width: 60, height: 12 },
    // Table header row (Y = 680)
    { str: 'Milieu', transform: [1, 0, 0, 1, 50, 680], width: 35, height: 12 },
    { str: 'Organe', transform: [1, 0, 0, 1, 200, 680], width: 40, height: 12 },
    { str: 'Exemple', transform: [1, 0, 0, 1, 350, 680], width: 45, height: 12 },
    // Table row 1 (Y = 660)
    { str: 'Aérien', transform: [1, 0, 0, 1, 50, 660], width: 35, height: 12 },
    { str: 'Poumons', transform: [1, 0, 0, 1, 200, 660], width: 45, height: 12 },
    { str: 'Homme', transform: [1, 0, 0, 1, 350, 660], width: 40, height: 12 },
    // Table row 2 (Y = 640)
    { str: 'Aquatique', transform: [1, 0, 0, 1, 50, 640], width: 50, height: 12 },
    { str: 'Branchies', transform: [1, 0, 0, 1, 200, 640], width: 50, height: 12 },
    { str: 'Poisson', transform: [1, 0, 0, 1, 350, 640], width: 42, height: 12 },
  ];

  const output = buildPageTextWithTables(items);
  assert.match(output, /Comparaison des organes/);
  assert.match(output, /\| Milieu \| Organe \| Exemple \|/);
  assert.match(output, /\| --- \| --- \| --- \|/);
  assert.match(output, /\| Aérien \| Poumons \| Homme \|/);
  assert.match(output, /\| Aquatique \| Branchies \| Poisson \|/);
});

test('extractImagesFromPdfBuffer extracts embedded JPEG and FlateDecode RGB PNG images', () => {
  // 1. Minimal synthetic JPEG stream (60x60 declared in PDF dict)
  const fakeJpegPayload = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.alloc(240, 0x42),
    Buffer.from([0xff, 0xd9]),
  ]);

  // 2. Real 50x50 RGB pixel buffer compressed with FlateDecode
  const w = 50;
  const h = 50;
  const rgbPixels = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    rgbPixels[i * 3] = 16;
    rgbPixels[i * 3 + 1] = 185;
    rgbPixels[i * 3 + 2] = 129;
  }
  const compressedRgb = zlib.deflateSync(rgbPixels);

  // 3. Tiny 16x16 icon stream that should be ignored
  const tinyCompressed = zlib.deflateSync(Buffer.alloc(16 * 16 * 3, 0xff));

  const pdfBuffer = Buffer.concat([
    Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Type /XObject /Subtype /Image /Width 60 /Height 60 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${fakeJpegPayload.length} >>\nstream\n`,
      'latin1'
    ),
    fakeJpegPayload,
    Buffer.from(
      `\nendstream\nendobj\n2 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressedRgb.length} >>\nstream\n`,
      'latin1'
    ),
    compressedRgb,
    Buffer.from(
      `\nendstream\nendobj\n3 0 obj\n<< /Type /XObject /Subtype /Image /Width 16 /Height 16 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${tinyCompressed.length} >>\nstream\n`,
      'latin1'
    ),
    tinyCompressed,
    Buffer.from('\nendstream\nendobj\n%%EOF\n', 'latin1'),
  ]);

  const images = extractImagesFromPdfBuffer(pdfBuffer);
  assert.equal(images.length, 2);
  assert.equal(images[0].mimeType, 'image/jpeg');
  assert.ok(images[0].url.startsWith('data:image/jpeg;base64,'));
  assert.equal(images[1].mimeType, 'image/png');
  assert.ok(images[1].url.startsWith('data:image/png;base64,'));
  const decodedPng = Buffer.from(images[1].url.split(',')[1], 'base64');
  assert.deepEqual(decodedPng.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
});

test('buildStructuredCourseFromText preserves headings, tables, takeaways, and definitions', () => {
  const sampleText = `
I. Les échanges gazeux respiratoires
Tous les êtres vivants absorbent du dioxygène et rejettent du CO2.
Amylase : Enzyme salivaire qui transforme l'amidon en maltose à 37°C.
À retenir : L'eau de chaux se trouble en présence de dioxyde de carbone.

II. Tableau comparatif des organes respiratoires
| Milieu | Organe | Exemple |
| --- | --- | --- |
| Aérien | Poumons | Homme |
| Aquatique | Branchies | Poisson |
`;

  const result = buildStructuredCourseFromText(sampleText, 'La respiration', 'التنفس');
  assert.equal(result.contentSections.length, 2);
  assert.match(result.contentSections[0].heading, /I\. Les échanges gazeux/);
  assert.match(result.contentSections[0].keyTakeaway || '', /eau de chaux/i);
  assert.match(result.contentSections[1].bodyMarkdown, /\| Milieu \| Organe \| Exemple \|/);
  assert.equal(result.definitions.length, 1);
  assert.equal(result.definitions[0].term, 'Amylase');
});
