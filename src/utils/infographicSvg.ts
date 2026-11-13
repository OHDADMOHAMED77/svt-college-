import type { InfographicLayout, PdfInfographicData } from '../../server/pdfAiEngine';

export type InfographicTheme = 'emerald' | 'ocean' | 'amber';

interface ThemePalette {
  bg: string;
  bgEnd: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  textPrimary: string;
  textMuted: string;
}

const THEMES: Record<InfographicTheme, ThemePalette> = {
  emerald: {
    bg: '#020617',
    bgEnd: '#06201a',
    surface: '#0f172a',
    surfaceAlt: '#132035',
    border: '#1e3a34',
    accent: '#10b981',
    accentSoft: '#064e3b',
    accentText: '#34d399',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
  },
  ocean: {
    bg: '#020617',
    bgEnd: '#091933',
    surface: '#0f172a',
    surfaceAlt: '#12203b',
    border: '#1e3a5f',
    accent: '#0ea5e9',
    accentSoft: '#0c4a6e',
    accentText: '#38bdf8',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
  },
  amber: {
    bg: '#09090b',
    bgEnd: '#231606',
    surface: '#111827',
    surfaceAlt: '#1e2230',
    border: '#452c10',
    accent: '#f59e0b',
    accentSoft: '#451a03',
    accentText: '#fbbf24',
    textPrimary: '#fafafa',
    textMuted: '#a1a1aa',
  },
};

export function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function wrapSvgLines(text: string, maxChars: number, maxLines = 3): string[] {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [''];
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (lines.length >= maxLines) break;
      current = word.length > maxChars ? word.slice(0, maxChars - 1) + '…' : word;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const last = lines[maxLines - 1];
    if (!last.endsWith('…')) {
      lines[maxLines - 1] = last.slice(0, Math.max(4, maxChars - 1)) + '…';
    }
  }
  return lines;
}

function renderWrappedText(
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  attrs: {
    fill: string;
    fontSize: number;
    fontWeight?: string | number;
    anchor?: 'start' | 'middle' | 'end';
    dir?: 'ltr' | 'rtl';
    fontFamily?: string;
  }
): string {
  const rawAnchor = attrs.anchor || 'start';
  const anchor = attrs.dir === 'rtl'
    ? (rawAnchor === 'end' ? 'start' : rawAnchor === 'start' ? 'end' : 'middle')
    : rawAnchor;
  const weight = attrs.fontWeight || 500;
  const family = attrs.fontFamily || "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
  const dirAttr = attrs.dir ? ` direction="${attrs.dir}" unicode-bidi="plaintext"` : '';
  return lines
    .map(
      (line, idx) =>
        `<text x="${x}" y="${y + idx * lineHeight}" fill="${attrs.fill}" font-size="${attrs.fontSize}" font-weight="${weight}" font-family="${escapeXml(family)}" text-anchor="${anchor}"${dirAttr}>${escapeXml(line)}</text>`
    )
    .join('\n');
}

export interface RenderInfographicOptions {
  layout: InfographicLayout;
  theme: InfographicTheme;
  language: 'fr' | 'ar';
}

export function renderInfographicSvg(
  data: PdfInfographicData,
  options: RenderInfographicOptions
): string {
  const p = THEMES[options.theme] || THEMES.emerald;
  const isAr = options.language === 'ar';
  const dir: 'ltr' | 'rtl' = isAr ? 'rtl' : 'ltr';
  const width = 960;

  const title = isAr ? (data.titleAr || data.title) : data.title;
  const subtitle = isAr ? (data.subtitleAr || data.subtitle) : data.subtitle;
  const subjectTag = isAr ? (data.subjectTagAr || data.subjectTag) : data.subjectTag;

  const titleLines = wrapSvgLines(title, 44, 2);
  const subtitleLines = wrapSvgLines(subtitle, 72, 2);
  const headerBottom = 152 + (titleLines.length - 1) * 32;

  let bodySvg = '';
  let totalHeight = headerBottom + 560;

  if (options.layout === 'summary') {
    // 1. Key Metrics Strip (dynamically fills 864px width for 1..4 cards)
    const metrics = (data.keyMetrics || []).slice(0, 4);
    const count = Math.max(metrics.length, 1);
    const gap = 16;
    const cardW = (864 - gap * (count - 1)) / count;
    const startX = 48;
    const kpiY = headerBottom + 20;
    const maxLabelChars = Math.max(18, Math.floor(cardW / 8.5));
    const maxDetailChars = Math.max(22, Math.floor(cardW / 7.5));

    const kpiCards = metrics
      .map((m, idx) => {
        const x = startX + idx * (cardW + gap);
        const label = isAr ? (m.labelAr || m.label) : m.label;
        const detail = isAr ? (m.detailAr || m.detail) : m.detail;
        const valLines = wrapSvgLines(m.value, Math.max(12, Math.floor(cardW / 14)), 1);
        const labelLines = wrapSvgLines(label, maxLabelChars, 2);
        return `
          <rect x="${x}" y="${kpiY}" width="${cardW}" height="106" rx="14" fill="${p.surface}" stroke="${p.border}" stroke-width="1.2" />
          <rect x="${isAr ? x + cardW - 50 : x + 14}" y="${kpiY + 14}" width="36" height="4" rx="2" fill="${p.accent}" />
          ${renderWrappedText(valLines, isAr ? x + cardW - 14 : x + 14, kpiY + 46, 26, {
            fill: p.accentText,
            fontSize: 23,
            fontWeight: 800,
            anchor: isAr ? 'end' : 'start',
            dir,
          })}
          ${renderWrappedText(labelLines, isAr ? x + cardW - 14 : x + 14, kpiY + 70, 16, {
            fill: p.textPrimary,
            fontSize: 12.5,
            fontWeight: 600,
            anchor: isAr ? 'end' : 'start',
            dir,
          })}
          ${renderWrappedText(wrapSvgLines(detail, maxDetailChars, 1), isAr ? x + cardW - 14 : x + 14, kpiY + 95, 14, {
            fill: p.textMuted,
            fontSize: 11,
            anchor: isAr ? 'end' : 'start',
            dir,
          })}
        `;
      })
      .join('\n');

    // 2. Process Steps Left Column + Glossary Right Column
    const colsY = kpiY + 130;
    const steps = (data.processSteps || []).slice(0, 4);
    const glossary = (data.glossary || []).slice(0, 4);
    const takeaways = (data.keyTakeaways || []).slice(0, 3);

    const stepsSectionTitle = isAr ? 'المراحل والمحاور الأساسية' : 'Axes & Mécanismes Clés';
    const glossarySectionTitle = isAr ? 'المفاهيم والمصطلحات' : 'Notions & Définitions';

    const leftX = isAr ? 500 : 48;
    const rightX = isAr ? 48 : 500;

    const stepCards = steps
      .map((s, idx) => {
        const y = colsY + 42 + idx * 82;
        const stTitle = isAr ? (s.titleAr || s.title) : s.title;
        const stDesc = isAr ? (s.descriptionAr || s.description) : s.description;
        return `
          <rect x="${leftX}" y="${y}" width="412" height="70" rx="12" fill="${p.surface}" stroke="${p.border}" stroke-width="1" />
          <circle cx="${isAr ? leftX + 382 : leftX + 30}" cy="${y + 35}" r="15" fill="${p.accentSoft}" stroke="${p.accent}" stroke-width="1.5" />
          <text x="${isAr ? leftX + 382 : leftX + 30}" y="${y + 40}" fill="${p.accentText}" font-size="13" font-weight="800" text-anchor="middle">${s.stepNumber || idx + 1}</text>
          ${renderWrappedText(wrapSvgLines(stTitle, 38, 1), isAr ? leftX + 356 : leftX + 56, y + 27, 16, {
            fill: p.textPrimary,
            fontSize: 13.5,
            fontWeight: 700,
            anchor: isAr ? 'end' : 'start',
            dir,
          })}
          ${renderWrappedText(wrapSvgLines(stDesc, 48, 2), isAr ? leftX + 356 : leftX + 56, y + 46, 15, {
            fill: p.textMuted,
            fontSize: 11.5,
            anchor: isAr ? 'end' : 'start',
            dir,
          })}
        `;
      })
      .join('\n');

    const glossaryCards = glossary
      .map((g, idx) => {
        const y = colsY + 42 + idx * 82;
        const term = isAr ? (g.termAr || g.term) : g.term;
        const def = isAr ? (g.definitionAr || g.definition) : g.definition;
        return `
          <rect x="${rightX}" y="${y}" width="412" height="70" rx="12" fill="${p.surfaceAlt}" stroke="${p.border}" stroke-width="1" />
          ${renderWrappedText(wrapSvgLines(term, 38, 1), isAr ? rightX + 394 : rightX + 18, y + 25, 16, {
            fill: p.accentText,
            fontSize: 13.5,
            fontWeight: 700,
            anchor: isAr ? 'end' : 'start',
            dir,
          })}
          ${renderWrappedText(wrapSvgLines(def, 52, 2), isAr ? rightX + 394 : rightX + 18, y + 45, 15, {
            fill: p.textPrimary,
            fontSize: 11.5,
            anchor: isAr ? 'end' : 'start',
            dir,
          })}
        `;
      })
      .join('\n');

    const colBottom = colsY + 42 + Math.max(steps.length, glossary.length, 1) * 82 + 16;
    const takeawayCards = takeaways
      .map((t, idx) => {
        const y = colBottom + 44 + idx * 42;
        const txt = isAr ? (t.ar || t.fr) : t.fr;
        return `
          <rect x="48" y="${y}" width="864" height="34" rx="8" fill="${p.surface}" stroke="${p.border}" stroke-width="1" />
          <circle cx="${isAr ? 894 : 66}" cy="${y + 17}" r="4.5" fill="${p.accent}" />
          ${renderWrappedText(wrapSvgLines(txt, 95, 1), isAr ? 880 : 82, y + 21, 15, {
            fill: p.textPrimary,
            fontSize: 12.5,
            fontWeight: 600,
            anchor: isAr ? 'end' : 'start',
            dir,
          })}
        `;
      })
      .join('\n');

    totalHeight = colBottom + 56 + takeaways.length * 42 + 44;

    bodySvg = `
      ${kpiCards}
      <text x="${isAr ? leftX + 412 : leftX}" y="${colsY + 24}" fill="${p.accentText}" font-size="15" font-weight="800" text-anchor="start" direction="${dir}">${escapeXml(stepsSectionTitle)}</text>
      <text x="${isAr ? rightX + 412 : rightX}" y="${colsY + 24}" fill="${p.accentText}" font-size="15" font-weight="800" text-anchor="start" direction="${dir}">${escapeXml(glossarySectionTitle)}</text>
      ${stepCards}
      ${glossaryCards}
      <text x="${isAr ? 912 : 48}" y="${colBottom + 28}" fill="${p.accentText}" font-size="15" font-weight="800" text-anchor="start" direction="${dir}">${escapeXml(isAr ? 'خلاصات أساسية للحفظ' : 'Points Clés à Retenir')}</text>
      ${takeawayCards}
    `;
  } else if (options.layout === 'process') {
    const steps = (data.processSteps || []).slice(0, 5);
    const startY = headerBottom + 28;
    const nodeH = 104;
    const gapY = 30;

    const nodes = steps
      .map((s, idx) => {
        const y = startY + idx * (nodeH + gapY);
        const stTitle = isAr ? (s.titleAr || s.title) : s.title;
        const stDesc = isAr ? (s.descriptionAr || s.description) : s.description;
        const isEven = idx % 2 === 0;
        const cardX = isEven ? 72 : 168;
        const cardW = 720;

        const arrow =
          idx < steps.length - 1
            ? `
              <line x1="480" y1="${y + nodeH}" x2="480" y2="${y + nodeH + gapY - 6}" stroke="${p.accent}" stroke-width="2.5" stroke-dasharray="5 3" />
              <polygon points="473,${y + nodeH + gapY - 8} 487,${y + nodeH + gapY - 8} 480,${y + nodeH + gapY}" fill="${p.accent}" />
            `
            : '';

        return `
          <rect x="${cardX}" y="${y}" width="${cardW}" height="${nodeH}" rx="16" fill="${p.surface}" stroke="${p.border}" stroke-width="1.4" />
          <rect x="${isAr ? cardX + cardW - 70 : cardX + 18}" y="${y + 22}" width="52" height="52" rx="14" fill="${p.accentSoft}" stroke="${p.accent}" stroke-width="1.5" />
          <text x="${isAr ? cardX + cardW - 44 : cardX + 44}" y="${y + 56}" fill="${p.accentText}" font-size="22" font-weight="800" text-anchor="middle">${s.stepNumber || idx + 1}</text>
          ${renderWrappedText(wrapSvgLines(stTitle, 54, 1), isAr ? cardX + cardW - 88 : cardX + 88, y + 38, 20, {
            fill: p.textPrimary,
            fontSize: 16.5,
            fontWeight: 800,
            anchor: isAr ? 'end' : 'start',
            dir,
          })}
          ${renderWrappedText(wrapSvgLines(stDesc, 74, 2), isAr ? cardX + cardW - 88 : cardX + 88, y + 63, 18, {
            fill: p.textMuted,
            fontSize: 13.5,
            anchor: isAr ? 'end' : 'start',
            dir,
          })}
          ${arrow}
        `;
      })
      .join('\n');

    totalHeight = startY + steps.length * (nodeH + gapY) + 40;
    bodySvg = nodes;
  } else if (options.layout === 'comparison') {
    const tbl = data.comparisonTable;
    const headers = isAr ? (tbl.headersAr?.length ? tbl.headersAr : tbl.headers) : tbl.headers;
    const rows = isAr ? (tbl.rowsAr?.length ? tbl.rowsAr : tbl.rows) : tbl.rows;
    const colCount = Math.max(2, Math.min(4, headers.length));
    const tableW = 864;
    const colW = tableW / colCount;
    const startY = headerBottom + 30;
    const rowH = 74;

    const headerCells = headers
      .slice(0, colCount)
      .map((h, cIdx) => {
        const cx = 48 + (isAr ? colCount - 1 - cIdx : cIdx) * colW + colW / 2;
        return renderWrappedText(wrapSvgLines(h, Math.floor(colW / 9), 2), cx, startY + 28, 17, {
          fill: p.accentText,
          fontSize: 14,
          fontWeight: 800,
          anchor: 'middle',
          dir,
        });
      })
      .join('\n');

    const bodyRows = rows
      .slice(0, 5)
      .map((row, rIdx) => {
        const y = startY + 54 + rIdx * rowH;
        const bg = rIdx % 2 === 0 ? p.surface : p.surfaceAlt;
        const cells = Array.from({ length: colCount })
          .map((_, cIdx) => {
            const cellText = row[cIdx] || '-';
            const cx = 48 + (isAr ? colCount - 1 - cIdx : cIdx) * colW + 16;
            const lines = wrapSvgLines(cellText, Math.floor((colW - 28) / 7.2), 3);
            return renderWrappedText(lines, isAr ? cx + colW - 32 : cx, y + 24, 16, {
              fill: cIdx === 0 ? p.textPrimary : p.textMuted,
              fontSize: 12.5,
              fontWeight: cIdx === 0 ? 700 : 500,
              anchor: isAr ? 'end' : 'start',
              dir,
            });
          })
          .join('\n');

        return `
          <rect x="48" y="${y}" width="${tableW}" height="${rowH}" fill="${bg}" stroke="${p.border}" stroke-width="0.8" />
          ${cells}
        `;
      })
      .join('\n');

    const tableBottom = startY + 54 + Math.min(rows.length, 5) * rowH + 28;
    const takeaways = (data.keyTakeaways || []).slice(0, 3);
    const takeawayCards = takeaways
      .map((t, idx) => {
        const y = tableBottom + 36 + idx * 42;
        return `
          <rect x="48" y="${y}" width="864" height="34" rx="8" fill="${p.surface}" stroke="${p.border}" stroke-width="1" />
          ${renderWrappedText(wrapSvgLines(isAr ? (t.ar || t.fr) : t.fr, 95, 1), isAr ? 892 : 68, y + 21, 15, {
            fill: p.textPrimary,
            fontSize: 12.5,
            fontWeight: 600,
            anchor: isAr ? 'end' : 'start',
            dir,
          })}
        `;
      })
      .join('\n');

    totalHeight = tableBottom + 56 + takeaways.length * 42 + 30;
    bodySvg = `
      <rect x="48" y="${startY}" width="${tableW}" height="54" rx="10" fill="${p.accentSoft}" stroke="${p.accent}" stroke-width="1.2" />
      ${headerCells}
      ${bodyRows}
      <text x="${isAr ? 912 : 48}" y="${tableBottom + 20}" fill="${p.accentText}" font-size="15" font-weight="800" text-anchor="start" direction="${dir}">${escapeXml(isAr ? 'خلاصات المقارنة' : 'Synthèse du Tableau')}</text>
      ${takeawayCards}
    `;
  } else {
    // 'mindmap' radial SVG diagram
    const branches = (data.mindMapBranches || []).slice(0, 6);
    const centerX = 480;
    const isCompact = branches.length <= 2;
    const isMedium = branches.length > 2 && branches.length <= 4;
    const centerY = headerBottom + (isCompact ? 175 : isMedium ? 210 : 255);
    totalHeight = headerBottom + (isCompact ? 340 : isMedium ? 410 : 540);

    const positions: { x: number; y: number }[] = isCompact
      ? [
          { x: 205, y: headerBottom + 95 },
          { x: 755, y: headerBottom + 95 },
        ]
      : [
          { x: 185, y: headerBottom + 95 },
          { x: 775, y: headerBottom + 95 },
          { x: 175, y: headerBottom + 255 },
          { x: 785, y: headerBottom + 255 },
          { x: 195, y: headerBottom + 415 },
          { x: 765, y: headerBottom + 415 },
        ];

    const branchSvgs = branches
      .map((b, idx) => {
        const pos = positions[idx % positions.length];
        const bTitle = isAr ? (b.branchTitleAr || b.branchTitle) : b.branchTitle;
        const pts = isAr ? (b.pointsAr?.length ? b.pointsAr : b.points) : b.points;
        const cardW = 270;
        const cardH = 112;
        const boxX = pos.x - cardW / 2;
        const boxY = pos.y - cardH / 2;
        const ctrlX = (centerX + pos.x) / 2;

        return `
          <path d="M ${centerX} ${centerY} Q ${ctrlX} ${centerY} ${pos.x} ${pos.y}" fill="none" stroke="${p.accent}" stroke-width="2.2" stroke-opacity="0.7" />
          <rect x="${boxX}" y="${boxY}" width="${cardW}" height="${cardH}" rx="14" fill="${p.surface}" stroke="${p.border}" stroke-width="1.3" />
          ${renderWrappedText(wrapSvgLines(bTitle, 28, 1), isAr ? boxX + cardW - 16 : boxX + 16, boxY + 26, 16, {
            fill: p.accentText,
            fontSize: 13.5,
            fontWeight: 800,
            anchor: isAr ? 'end' : 'start',
            dir,
          })}
          ${pts
            .slice(0, 2)
            .map((pt, pIdx) =>
              renderWrappedText(
                wrapSvgLines(`• ${pt}`, 34, 2),
                isAr ? boxX + cardW - 16 : boxX + 16,
                boxY + 50 + pIdx * 30,
                14,
                {
                  fill: p.textPrimary,
                  fontSize: 11.5,
                  anchor: isAr ? 'end' : 'start',
                  dir,
                }
              )
            )
            .join('\n')}
        `;
      })
      .join('\n');

    const centralNode = `
      <rect x="${centerX - 110}" y="${centerY - 56}" width="220" height="112" rx="22" fill="${p.accentSoft}" stroke="${p.accent}" stroke-width="2.5" />
      ${renderWrappedText(wrapSvgLines(title, 20, 3), centerX, centerY - 12, 20, {
        fill: p.textPrimary,
        fontSize: 15.5,
        fontWeight: 800,
        anchor: 'middle',
        dir,
      })}
    `;

    bodySvg = `
      ${branchSvgs}
      ${centralNode}
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalHeight}" width="${width}" height="${totalHeight}" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.bg}" />
      <stop offset="100%" stop-color="${p.bgEnd}" />
    </linearGradient>
    <linearGradient id="headerGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0.04" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${totalHeight}" fill="url(#bgGrad)" rx="20" />
  <rect x="24" y="24" width="${width - 48}" height="${totalHeight - 48}" rx="18" fill="none" stroke="${p.border}" stroke-width="1.2" />

  <!-- Header Band -->
  <rect x="40" y="38" width="${width - 80}" height="${headerBottom - 44}" rx="16" fill="url(#headerGlow)" stroke="${p.border}" stroke-width="1" />
  <text x="${isAr ? width - 64 : 64}" y="68" fill="${p.accentText}" font-size="12" font-weight="800" letter-spacing="0.06em" text-anchor="start" direction="${dir}">${escapeXml(`${data.gradeLevel} · ${subjectTag}`)}</text>
  ${renderWrappedText(titleLines, isAr ? width - 64 : 64, 102, 32, {
    fill: p.textPrimary,
    fontSize: 25,
    fontWeight: 800,
    anchor: isAr ? 'end' : 'start',
    dir,
  })}
  ${renderWrappedText(subtitleLines, isAr ? width - 64 : 64, 102 + titleLines.length * 32, 18, {
    fill: p.textMuted,
    fontSize: 13.5,
    anchor: isAr ? 'end' : 'start',
    dir,
  })}

  <!-- Main Infographic Content -->
  ${bodySvg}

  <!-- Clean Footer -->
  <text x="${width / 2}" y="${totalHeight - 12}" fill="${p.textMuted}" font-size="11" font-weight="600" text-anchor="middle">SVT COLLÈGE PRO · Infographie Pédagogique</text>
</svg>`;
}
