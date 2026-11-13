import zlib from 'zlib';
import crypto from 'crypto';

export interface ExtractedPdfImage {
  id: string;
  title: string;
  titleAr: string;
  url: string;
  width: number;
  height: number;
  mimeType: 'image/jpeg' | 'image/png';
  description: string;
}

interface TextItemLike {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
}

/**
 * Reconstructs text lines and multi-column Markdown tables from pdf.js text items
 * using exact X/Y coordinates instead of pdf-parse's naive concatenation.
 */
export function buildPageTextWithTables(items: TextItemLike[]): string {
  if (!Array.isArray(items) || items.length === 0) return '';

  const normalized = items
    .filter(item => item && typeof item.str === 'string' && item.str.trim().length > 0 && Array.isArray(item.transform))
    .map(item => ({
      str: item.str.replace(/\s+/g, ' ').trim(),
      x: Number(item.transform[4]) || 0,
      y: Number(item.transform[5]) || 0,
      width: Math.max(Number(item.width) || item.str.length * 4.5, 4),
      height: Math.abs(Number(item.height) || Number(item.transform[3]) || 10),
    }));

  if (normalized.length === 0) return '';

  // Sort top-to-bottom (higher Y first in PDF coordinates), then left-to-right
  normalized.sort((a, b) => {
    if (Math.abs(b.y - a.y) > 3.5) return b.y - a.y;
    return a.x - b.x;
  });

  // Group items into visual rows
  const rows: Array<typeof normalized> = [];
  for (const item of normalized) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(lastRow[0].y - item.y) <= Math.max(3.5, Math.min(lastRow[0].height, item.height) * 0.45)) {
      lastRow.push(item);
    } else {
      rows.push([item]);
    }
  }

  // Convert each row into column cells separated by \t when horizontal gap is significant
  const rawLines: string[] = rows.map(row => {
    row.sort((a, b) => a.x - b.x);
    let line = row[0].str;
    let prevEnd = row[0].x + row[0].width;

    for (let i = 1; i < row.length; i++) {
      const curr = row[i];
      const gap = curr.x - prevEnd;
      const avgCharW = Math.max(3.5, curr.width / Math.max(curr.str.length, 1));

      if (gap > Math.max(14, avgCharW * 2.8)) {
        line += '\t' + curr.str;
      } else if (gap > Math.max(1.2, avgCharW * 0.22)) {
        line += ' ' + curr.str;
      } else {
        // Slightly overlapping or tight kerning: preserve space if two word tokens meet
        if (/[a-zA-Z0-9À-ÿ\u0600-\u06FF]$/.test(line) && /^[a-zA-Z0-9À-ÿ\u0600-\u06FF]/.test(curr.str)) {
          line += ' ' + curr.str;
        } else {
          line += curr.str;
        }
      }
      prevEnd = Math.max(prevEnd, curr.x + curr.width);
    }

    return line.trim();
  });

  return convertTabBlocksToMarkdownTables(rawLines).join('\n');
}

/**
 * Converts consecutive multi-column tab-separated lines into clean Markdown tables.
 */
export function convertTabBlocksToMarkdownTables(lines: string[]): string[] {
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const cells = lines[i].split('\t').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 2 && cells.length <= 8) {
      const block: string[][] = [cells];
      let j = i + 1;
      while (j < lines.length) {
        const nextCells = lines[j].split('\t').map(c => c.trim()).filter(Boolean);
        if (nextCells.length >= 2 && nextCells.length <= 8) {
          block.push(nextCells);
          j++;
        } else {
          break;
        }
      }

      if (block.length >= 2) {
        const colCount = Math.max(...block.map(r => r.length));
        const padRow = (row: string[]) => {
          const padded = [...row];
          while (padded.length < colCount) padded.push('');
          return `| ${padded.map(cell => cell.replace(/\|/g, '/')).join(' | ')} |`;
        };

        output.push('');
        output.push(padRow(block[0]));
        output.push(`| ${Array(colCount).fill('---').join(' | ')} |`);
        for (let r = 1; r < block.length; r++) {
          output.push(padRow(block[r]));
        }
        output.push('');
        i = j;
        continue;
      } else {
        output.push(cells.join(' — '));
        i++;
        continue;
      }
    }

    output.push(lines[i].replace(/\t+/g, ' '));
    i++;
  }

  return output;
}

/**
 * Custom pdf-parse pagerender callback using coordinate-aware layout reconstruction.
 */
export function createCoordinatePageRenderer() {
  return async function renderCoordinatePage(pageData: any): Promise<string> {
    const textContent = await pageData.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    });
    return buildPageTextWithTables(textContent?.items || []);
  };
}

// ==================== PURE NODE.JS PNG ENCODER & PDF IMAGE EXTRACTOR ====================

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function unfilterPngPredictorRows(
  raw: Buffer,
  width: number,
  bytesPerPixel: number,
  stride: number
): Buffer {
  const rowSize = stride + 1;
  const height = Math.floor(raw.length / rowSize);
  const out = Buffer.alloc(height * stride);

  const paeth = (a: number, b: number, c: number) => {
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
      if (filterType === 1) recon = (val + left) & 0xff;
      else if (filterType === 2) recon = (val + up) & 0xff;
      else if (filterType === 3) recon = (val + Math.floor((left + up) / 2)) & 0xff;
      else if (filterType === 4) recon = (val + paeth(left, up, upLeft)) & 0xff;

      out[outOff + x] = recon;
    }
  }

  void width;
  return out;
}

export function encodePixelsToPng(
  pixels: Buffer,
  width: number,
  height: number,
  channels: 1 | 3 | 4
): Buffer {
  const colorType = channels === 1 ? 0 : channels === 3 ? 2 : 6;
  const stride = width * channels;
  if (pixels.length < stride * height) {
    throw new Error('Insufficient pixel buffer length for PNG encoding');
  }

  const rawWithFilters = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    rawWithFilters[y * (stride + 1)] = 0; // Filter None
    pixels.copy(rawWithFilters, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressedIdat = zlib.deflateSync(rawWithFilters, { level: 6 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressedIdat),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function parseIntField(dictText: string, key: string): number | null {
  const m = dictText.match(new RegExp(`/${key}\\s+(\\d+)\\b`));
  return m ? Number(m[1]) : null;
}

/**
 * Extracts embedded JPEG (/DCTDecode) and raster PNG-compatible (/FlateDecode)
 * images directly from PDF XObject streams without requiring native OS binaries.
 */
export function extractImagesFromPdfBuffer(
  buffer: Buffer,
  maxImages = 10
): ExtractedPdfImage[] {
  if (!buffer || buffer.length < 32) return [];

  const text = buffer.toString('latin1');
  const results: ExtractedPdfImage[] = [];
  const seenHashes = new Set<string>();

  const streamKeyword = 'stream';
  let cursor = 0;

  while (cursor < text.length && results.length < maxImages) {
    const streamIdx = text.indexOf(streamKeyword, cursor);
    if (streamIdx === -1) break;

    // Must be standalone keyword `stream` (never `endstream`), followed by CR/LF
    const prevChar = streamIdx > 0 ? text[streamIdx - 1] : ' ';
    const afterChar = text[streamIdx + streamKeyword.length] || '';
    if (!/[\s>]/.test(prevChar) || (afterChar !== '\n' && afterChar !== '\r')) {
      cursor = streamIdx + streamKeyword.length;
      continue;
    }

    // Inspect preceding dictionary << ... >>
    const lookbackStart = Math.max(0, streamIdx - 900);
    const dictSlice = text.slice(lookbackStart, streamIdx);
    const dictOpen = dictSlice.lastIndexOf('<<');
    const dictClose = dictSlice.lastIndexOf('>>');

    cursor = streamIdx + streamKeyword.length;
    if (dictOpen === -1 || dictClose === -1 || dictClose < dictOpen) {
      continue;
    }

    const dictText = dictSlice.slice(dictOpen, dictClose + 2);
    if (!/\/Subtype\s*\/Image\b/.test(dictText)) {
      continue;
    }

    // Skip alpha/soft masks and 1-bit stencil masks
    if (/\/ImageMask\s+true\b/i.test(dictText)) {
      continue;
    }

    const width = parseIntField(dictText, 'Width') || 0;
    const height = parseIntField(dictText, 'Height') || 0;
    if (width < 48 || height < 48 || width > 6000 || height > 6000) {
      continue;
    }

    // Determine exact byte start after `stream\r\n` or `stream\n`
    let dataStart = streamIdx + streamKeyword.length;
    if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) {
      dataStart += 2;
    } else if (buffer[dataStart] === 0x0a || buffer[dataStart] === 0x0d) {
      dataStart += 1;
    } else {
      continue;
    }

    const declaredLength = parseIntField(dictText, 'Length');
    let dataEnd = -1;
    if (declaredLength && dataStart + declaredLength <= buffer.length) {
      dataEnd = dataStart + declaredLength;
    } else {
      const endStreamIdx = text.indexOf('endstream', dataStart);
      if (endStreamIdx !== -1) {
        dataEnd = endStreamIdx;
        while (dataEnd > dataStart && (buffer[dataEnd - 1] === 0x0a || buffer[dataEnd - 1] === 0x0d)) {
          dataEnd--;
        }
      }
    }

    if (dataEnd <= dataStart) continue;
    const streamBytes = buffer.subarray(dataStart, dataEnd);
    cursor = Math.max(cursor, dataEnd);

    const isDct = /\/DCTDecode\b/.test(dictText);
    const isFlate = /\/FlateDecode\b/.test(dictText) && !/\/ASCII85Decode\b|\/ASCIIHexDecode\b|\/LZWDecode\b|\/JPXDecode\b/.test(dictText);

    let outMime: 'image/jpeg' | 'image/png' | null = null;
    let outBuffer: Buffer | null = null;

    if (isDct) {
      // Find JPEG SOI (FF D8) and EOI (FF D9)
      const soi = streamBytes.indexOf(Buffer.from([0xff, 0xd8]));
      const eoi = streamBytes.lastIndexOf(Buffer.from([0xff, 0xd9]));
      if (soi !== -1 && eoi > soi) {
        outBuffer = streamBytes.subarray(soi, eoi + 2);
        outMime = 'image/jpeg';
      } else if (streamBytes.length > 200) {
        outBuffer = streamBytes;
        outMime = 'image/jpeg';
      }
    } else if (isFlate) {
      const bpc = parseIntField(dictText, 'BitsPerComponent') || 8;
      if (bpc !== 8) continue;

      let channels: 1 | 3 | 4 | null = null;
      const isCmyk = /\/DeviceCMYK\b/.test(dictText);
      if (/\/DeviceRGB\b/.test(dictText)) channels = 3;
      else if (/\/DeviceGray\b/.test(dictText)) channels = 1;
      else if (isCmyk) channels = 4;

      if (!channels) continue;

      try {
        let inflated: Buffer = zlib.inflateSync(streamBytes);
        const predictor = parseIntField(dictText, 'Predictor') || 1;
        const stride = width * channels;
        if (predictor >= 10 && inflated.length >= height * (stride + 1)) {
          inflated = unfilterPngPredictorRows(inflated, width, channels, stride);
        }

        if (isCmyk) {
          // Convert CMYK -> RGB
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
        outMime = 'image/png';
      } catch {
        // Ignore unsupported Flate sub-streams
      }
    }

    if (!outBuffer || !outMime || outBuffer.length > 900 * 1024) {
      continue;
    }

    const digest = crypto.createHash('sha1').update(outBuffer).digest('hex');
    if (seenHashes.has(digest)) continue;
    seenHashes.add(digest);

    const idx = results.length + 1;
    results.push({
      id: `med_pdf_img_${Date.now()}_${idx}`,
      title: `Figure / Schéma ${idx} (PDF)`,
      titleAr: `رسم / وثيقة ${idx} (PDF)`,
      url: `data:${outMime};base64,${outBuffer.toString('base64')}`,
      width,
      height,
      mimeType: outMime,
      description: `Image extraite du PDF (${width}×${height} px • ${Math.max(1, Math.round(outBuffer.length / 1024))} Ko)`,
    });
  }

  return results;
}
