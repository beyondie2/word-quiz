import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const require = createRequire(import.meta.url);

const FONT = {
  regular: 'Regular',
  bold: 'Bold'
};

let embedUnicode = true;

const PAGE_MARGIN = { top: 58, bottom: 58, left: 54, right: 54 };
const QUESTION_SIZE = 12;
const QUESTION_LINE_GAP = 5;
const ANSWER_ITEM_GAP = 12;

function cleanText(value) {
  let text = String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  if (!embedUnicode) {
    text = text.replace(/[^\n\t\x20-\x7E]/g, '?');
  }
  return text;
}

export function examCompositionLabel(compositionNo) {
  const value = cleanText(compositionNo).trim();
  if (!value) return '';
  return /[.。]$/.test(value) ? `${value} ` : `${value}. `;
}

export function examMetaLine(item) {
  const tail = [item.examScope, item.questionType]
    .map((part) => cleanText(part).trim())
    .filter(Boolean)
    .join(' ');
  const orderNo = cleanText(item.orderNo).trim();
  return tail ? `${orderNo}] ${tail}` : `${orderNo}]`;
}

function questionBody(question) {
  const text = cleanText(question).trim().slice(0, 20000);
  return text || '조건에 맞는 문제가 없습니다.';
}

const UNDERLINE_TAG = /<u>([\s\S]*?)<\/u>/gi;

function examTextRuns(text) {
  const source = String(text ?? '');
  const runs = [];
  let cursor = 0;
  UNDERLINE_TAG.lastIndex = 0;
  for (const match of source.matchAll(UNDERLINE_TAG)) {
    if (match.index > cursor) {
      runs.push({ text: source.slice(cursor, match.index), underline: false });
    }
    if (match[1]) runs.push({ text: match[1], underline: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length || runs.length === 0) {
    runs.push({ text: source.slice(cursor), underline: false });
  }
  return runs;
}

function runsToText(runs) {
  return runs.map((run) => run.text).join('');
}

function hasUnderline(runs) {
  return runs.some((run) => run.underline);
}

function fitCount(doc, text, maxWidth) {
  if (doc.widthOfString(text) <= maxWidth) return text.length;
  let best = 1;
  let low = 1;
  let high = text.length;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (doc.widthOfString(text.slice(0, mid)) <= maxWidth) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

function wrapExamRuns(doc, runs, width) {
  const atoms = [];
  for (const run of runs) {
    const pieces = run.text.split(/(\n)/);
    for (const piece of pieces) {
      if (piece === '\n') {
        atoms.push({ newline: true });
        continue;
      }
      for (const bit of piece.split(/([ \t]+)/)) {
        if (bit) atoms.push({ text: bit, underline: run.underline });
      }
    }
  }

  const lines = [];
  let line = [];
  let lineWidth = 0;
  const pushLine = () => {
    lines.push(line);
    line = [];
    lineWidth = 0;
  };

  for (const atom of atoms) {
    if (atom.newline) {
      pushLine();
      continue;
    }
    const space = /^[ \t]+$/.test(atom.text);
    if (space) {
      if (line.length === 0) continue;
      const spaceWidth = doc.widthOfString(atom.text);
      if (lineWidth + spaceWidth > width) {
        pushLine();
        continue;
      }
      line.push(atom);
      lineWidth += spaceWidth;
      continue;
    }

    let rest = atom.text;
    while (rest) {
      const room = width - lineWidth;
      if (line.length > 0 && doc.widthOfString(rest) > room) {
        pushLine();
        continue;
      }
      const count = fitCount(doc, rest, width - lineWidth);
      const taken = rest.slice(0, count);
      line.push({ text: taken, underline: atom.underline });
      lineWidth += doc.widthOfString(taken);
      rest = rest.slice(count);
      if (rest) pushLine();
    }
  }
  if (line.length > 0 || lines.length === 0) lines.push(line);
  return lines;
}

function coalesceLine(line) {
  const merged = [];
  for (const seg of line) {
    const prev = merged[merged.length - 1];
    if (prev && prev.underline === seg.underline) prev.text += seg.text;
    else merged.push({ text: seg.text, underline: seg.underline });
  }
  return merged;
}

function examRunsHeight(doc, runs, width, lineGap) {
  const parts = runs.filter((run) => run.text.length > 0);
  const gap = lineGap || 0;
  if (!hasUnderline(parts)) {
    return doc.heightOfString(runsToText(parts) || ' ', { width, lineGap: gap });
  }
  return wrapExamRuns(doc, parts, width).length * (doc.currentLineHeight(true) + gap);
}

function splitExamRuns(text) {
  const first = [];
  const rest = [];
  let seenBreak = false;
  for (const run of examTextRuns(text)) {
    if (seenBreak) {
      rest.push(run);
      continue;
    }
    const newline = run.text.indexOf('\n');
    if (newline === -1) {
      first.push(run);
      continue;
    }
    if (newline > 0) first.push({ text: run.text.slice(0, newline), underline: run.underline });
    const after = run.text.slice(newline + 1);
    if (after) rest.push({ text: after, underline: run.underline });
    seenBreak = true;
  }
  return { first, rest };
}

function drawExamRuns(doc, runs, x, y, options) {
  const parts = runs.filter((run) => run.text.length > 0);
  if (!hasUnderline(parts)) {
    doc.text(runsToText(parts) || ' ', x, y, options);
    return;
  }

  const width = options.width;
  const lineGap = options.lineGap || 0;
  const lines = wrapExamRuns(doc, parts, width);
  const lineHeight = doc.currentLineHeight(true) + lineGap;
  const stroke = doc._fontSize < 10 ? 0.5 : Math.floor(doc._fontSize / 10);
  let cursorY = y;

  doc.fillColor('#000000');
  for (const rawLine of lines) {
    let cursorX = x;
    for (const seg of coalesceLine(rawLine)) {
      const segWidth = doc.widthOfString(seg.text);
      doc.text(seg.text, cursorX, cursorY, { lineBreak: false });
      if (seg.underline && seg.text.trim()) {
        const lineY = cursorY + doc.currentLineHeight() - stroke;
        doc.save();
        doc.strokeColor('#000000').lineWidth(stroke);
        doc.moveTo(cursorX, lineY).lineTo(cursorX + segWidth, lineY).stroke();
        doc.restore();
      }
      cursorX += segWidth;
    }
    cursorY += lineHeight;
  }

  doc.x = x;
  doc.y = cursorY;
}

function answerBody(answer) {
  const text = cleanText(answer).trim().slice(0, 20000);
  return text || '—';
}

function answerLabel(item) {
  const label = examCompositionLabel(item.compositionNo);
  if (label) return label;
  const orderNo = cleanText(item.orderNo).trim();
  return orderNo ? `${orderNo}. ` : '';
}

const BUNDLED_FONT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../fonts'
);
const SYMBOL_FONT_PATH = path.join(BUNDLED_FONT_DIR, 'NotoSansSymbols-Regular.ttf');
const SYMBOL_FONT_NAME = 'SymbolFallback';

const FONT_PAIRS = [
  ['malgun.ttf', 'malgunbd.ttf'],
  ['malgunsl.ttf', 'malgunbd.ttf'],
  ['nanumgothic.ttf', 'nanumgothicbold.ttf'],
  ['nanumgothic-regular.ttf', 'nanumgothic-bold.ttf'],
  ['nanumbarungothic.ttf', 'nanumbarungothicbold.ttf'],
  ['nanummyeongjo.ttf', 'nanummyeongjobold.ttf'],
  ['notosanskr-regular.otf', 'notosanskr-bold.otf'],
  ['notosanskr-regular.ttf', 'notosanskr-bold.ttf'],
  ['notosanscjkkr-regular.otf', 'notosanscjkkr-bold.otf'],
  ['notoserifcjkkr-regular.otf', 'notoserifcjkkr-bold.otf'],
  ['hancom gothic regular.ttf', 'hancom gothic bold.ttf'],
  ['handotum.ttf', 'handotumb.ttf'],
  ['hanbatang.ttf', 'hanbatangb.ttf'],
  ['hansantteutdotum-regular.ttf', 'hansantteutdotum-bold.ttf'],
  ['ngulim.ttf', 'ngulim.ttf'],
  ['h2gtre.ttf', 'h2gtrm.ttf'],
  ['applegothic.ttf', null],
  ['undotum.ttf', 'undotumbold.ttf'],
  ['unbatang.ttf', 'unbatangbold.ttf'],
  ['baekmukdotum.ttf', null],
  ['baekmukbatang.ttf', null]
];

const KOREAN_FONT_NAME = /malgun|nanum|noto.*(kr|cjk)|source.?han|gulim|batang|dotum|ngulim|h2g|hancom|applegothic|sdgothic|spoqa|pretendard|kopub|gowun|maruburi|unbatang|undotum|baekmuk|hygothic/i;

let cachedFonts = null;

function loadFontkit() {
  try {
    return require('fontkit');
  } catch {
    return null;
  }
}

function defaultFontDirs() {
  const windowsRoot = process.env.SystemRoot || process.env.WINDIR || (process.platform === 'win32' ? 'C:\\Windows' : '');
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const localApp = process.env.LOCALAPPDATA || '';
  const dirs = [];
  if (windowsRoot) dirs.push(path.join(windowsRoot, 'Fonts'));
  if (localApp) dirs.push(path.join(localApp, 'Microsoft', 'Windows', 'Fonts'));
  dirs.push(
    '/usr/share/fonts',
    '/usr/local/share/fonts',
    '/System/Library/Fonts',
    '/System/Library/Fonts/Supplemental',
    '/Library/Fonts',
    BUNDLED_FONT_DIR
  );
  if (home) {
    dirs.push(
      path.join(home, '.local', 'share', 'fonts'),
      path.join(home, '.fonts'),
      path.join(home, 'Library', 'Fonts')
    );
  }
  return dirs;
}

function indexFontFiles(dirs) {
  const index = new Map();
  const seen = new Set();

  const walk = (dir, depth) => {
    if (!dir || depth > 5) return;
    let real = dir;
    try {
      real = fs.realpathSync(dir);
    } catch {
      return;
    }
    if (seen.has(real)) return;
    seen.add(real);

    let entries;
    try {
      entries = fs.readdirSync(real, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(real, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile() || !/\.(ttf|otf)$/i.test(entry.name)) continue;
      const key = entry.name.toLowerCase();
      if (!index.has(key)) index.set(key, full);
    }
  };

  dirs.forEach((dir) => walk(dir, 0));
  return index;
}

function inspectFont(filePath) {
  const fontkit = loadFontkit();
  if (!fontkit) return { ok: true, hangul: true };
  try {
    const opened = fontkit.openSync(filePath);
    const face = opened.fonts ? opened.fonts[0] : opened;
    if (!face || typeof face.hasGlyphForCodePoint !== 'function') {
      return { ok: false, hangul: false };
    }
    return { ok: true, hangul: face.hasGlyphForCodePoint(0xac00) };
  } catch {
    return { ok: false, hangul: false };
  }
}

function isBoldFontName(name) {
  return /bold|black|heavy|extrabold|(^|[^a-z])bd([^a-z]|$)/i.test(name)
    && !/italic|oblique/i.test(name);
}

function builtinFonts() {
  return {
    regular: null,
    bold: null,
    embedUnicode: false,
    source: 'Helvetica'
  };
}

function fileFonts(regular, bold) {
  return {
    regular,
    bold: bold || regular,
    embedUnicode: true,
    source: regular
  };
}

export function resolveExamPdfFonts(options = {}) {
  if (!options.dirs && cachedFonts) return cachedFonts;

  const index = indexFontFiles(options.dirs || defaultFontDirs());
  let resolved = null;

  for (const [regularName, boldName] of FONT_PAIRS) {
    const regular = index.get(regularName);
    if (!regular) continue;
    const regularInfo = inspectFont(regular);
    if (!regularInfo.ok || !regularInfo.hangul) continue;
    const boldPath = boldName ? index.get(boldName) : null;
    const boldInfo = boldPath ? inspectFont(boldPath) : { ok: false, hangul: false };
    resolved = fileFonts(regular, boldInfo.ok && boldInfo.hangul ? boldPath : regular);
    break;
  }

  if (!resolved) {
    const hangulFonts = [];
    for (const [name, filePath] of index) {
      if (!KOREAN_FONT_NAME.test(name)) continue;
      const info = inspectFont(filePath);
      if (info.ok && info.hangul) hangulFonts.push({ name, filePath });
    }
    if (hangulFonts.length > 0) {
      const regular = hangulFonts.find((font) => !isBoldFontName(font.name)) || hangulFonts[0];
      const bold = hangulFonts.find((font) => isBoldFontName(font.name)) || regular;
      resolved = fileFonts(regular.filePath, bold.filePath);
    }
  }

  if (!resolved) {
    for (const filePath of index.values()) {
      if (!inspectFont(filePath).ok) continue;
      resolved = fileFonts(filePath, filePath);
      break;
    }
  }

  if (!resolved) resolved = builtinFonts();

  if (!options.dirs) {
    cachedFonts = resolved;
    if (!/malgun\.ttf$/i.test(resolved.source || '')) {
      console.info(`Exam PDF font fallback: ${path.basename(resolved.source)}`);
    }
  }
  return resolved;
}

function contentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function drawDoubleRule(doc) {
  const x = doc.page.margins.left;
  const width = contentWidth(doc);
  const lineY = doc.y;

  doc.save();
  doc.strokeColor('#111111')
    .lineWidth(1.4)
    .moveTo(x, lineY)
    .lineTo(x + width, lineY)
    .stroke();
  doc.lineWidth(0.4)
    .moveTo(x, lineY + 3.5)
    .lineTo(x + width, lineY + 3.5)
    .stroke();
  doc.restore();

  doc.x = x;
  doc.y = lineY + 18;
}

function drawTitle(doc, school, examSheet) {
  const x = doc.page.margins.left;
  const width = contentWidth(doc);

  doc.font(FONT.bold).fontSize(16).fillColor('#000000');
  doc.text(`학교 : ${school}`, x, doc.y, { width });
  doc.moveDown(0.35);
  doc.font(FONT.regular).fontSize(12.5).fillColor('#000000');
  doc.text(`기준이 되는 기출 시험지 : ${examSheet}`, x, doc.y, { width });
  doc.moveDown(0.55);
  drawDoubleRule(doc);
}

function measureItem(doc, item, width) {
  const body = questionBody(item.question);
  const { first, rest } = splitExamRuns(body);
  doc.font(FONT.regular).fontSize(10.5);
  const metaHeight = doc.heightOfString(examMetaLine(item), { width, lineGap: 2 });
  const label = examCompositionLabel(item.compositionNo);
  doc.font(FONT.bold).fontSize(QUESTION_SIZE);
  const labelWidth = label ? doc.widthOfString(label) : 0;
  const stacked = !label || labelWidth > width * 0.45;
  doc.font(FONT.regular).fontSize(QUESTION_SIZE);

  let bodyHeight = 0;
  if (stacked) {
    if (label) {
      bodyHeight += doc.font(FONT.bold).fontSize(QUESTION_SIZE).heightOfString(label.trim(), { width });
    }
    doc.font(FONT.regular).fontSize(QUESTION_SIZE);
    bodyHeight += examRunsHeight(doc, examTextRuns(body), width, QUESTION_LINE_GAP);
  } else {
    bodyHeight += examRunsHeight(doc, first, width - labelWidth, QUESTION_LINE_GAP);
    if (runsToText(rest)) {
      bodyHeight += examRunsHeight(doc, rest, width, QUESTION_LINE_GAP);
    }
  }

  return metaHeight + 4 + bodyHeight + 16;
}

function ensureItemFits(doc, needed) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  const available = bottom - doc.y;
  const pageRoom = bottom - doc.page.margins.top;
  if (needed > available && available < pageRoom * 0.35) {
    doc.addPage();
  }
}

function drawItem(doc, item) {
  const x = doc.page.margins.left;
  const width = contentWidth(doc);
  const body = questionBody(item.question);
  const label = examCompositionLabel(item.compositionNo);

  doc.x = x;
  doc.font(FONT.regular).fontSize(10.5).fillColor('#000000');
  doc.text(examMetaLine(item), x, doc.y, { width, lineGap: 2 });
  doc.y += 4;

  doc.font(FONT.bold).fontSize(QUESTION_SIZE);
  const labelWidth = label ? doc.widthOfString(label) : 0;
  const stacked = !label || labelWidth > width * 0.45;
  const y = doc.y;
  const { first, rest } = splitExamRuns(body);

  if (!stacked) {
    doc.fillColor('#000000').text(label, x, y, { lineBreak: false });
    doc.font(FONT.regular).fontSize(QUESTION_SIZE).fillColor('#000000');
    drawExamRuns(doc, first, x + labelWidth, y, {
      width: width - labelWidth,
      lineGap: QUESTION_LINE_GAP
    });
    if (runsToText(rest)) {
      drawExamRuns(doc, rest, x, doc.y, { width, lineGap: QUESTION_LINE_GAP });
    }
  } else {
    if (label) {
      doc.fillColor('#000000').text(label.trim(), x, y, { width });
    }
    doc.font(FONT.regular).fontSize(QUESTION_SIZE).fillColor('#000000');
    drawExamRuns(doc, examTextRuns(body), x, doc.y, { width, lineGap: QUESTION_LINE_GAP });
  }

  doc.x = x;
  doc.y += 16;
}

function measureLabeledBody(doc, label, body, width, gapAfter) {
  const { first, rest } = splitExamRuns(body);
  doc.font(FONT.bold).fontSize(QUESTION_SIZE);
  const labelWidth = label ? doc.widthOfString(label) : 0;
  const stacked = !label || labelWidth > width * 0.45;
  let bodyHeight = 0;

  if (stacked) {
    if (label) {
      bodyHeight += doc.font(FONT.bold).fontSize(QUESTION_SIZE).heightOfString(label.trim(), { width });
    }
    doc.font(FONT.regular).fontSize(QUESTION_SIZE);
    bodyHeight += examRunsHeight(doc, examTextRuns(body), width, QUESTION_LINE_GAP);
  } else {
    doc.font(FONT.regular).fontSize(QUESTION_SIZE);
    bodyHeight += examRunsHeight(doc, first, width - labelWidth, QUESTION_LINE_GAP);
    if (runsToText(rest)) {
      bodyHeight += examRunsHeight(doc, rest, width, QUESTION_LINE_GAP);
    }
  }

  return bodyHeight + gapAfter;
}

function drawLabeledBody(doc, label, body) {
  const x = doc.page.margins.left;
  const width = contentWidth(doc);
  doc.font(FONT.bold).fontSize(QUESTION_SIZE);
  const labelWidth = label ? doc.widthOfString(label) : 0;
  const stacked = !label || labelWidth > width * 0.45;
  const y = doc.y;
  const { first, rest } = splitExamRuns(body);

  if (!stacked) {
    doc.fillColor('#000000').text(label, x, y, { lineBreak: false });
    doc.font(FONT.regular).fontSize(QUESTION_SIZE).fillColor('#000000');
    drawExamRuns(doc, first, x + labelWidth, y, {
      width: width - labelWidth,
      lineGap: QUESTION_LINE_GAP
    });
    if (runsToText(rest)) {
      drawExamRuns(doc, rest, x, doc.y, { width, lineGap: QUESTION_LINE_GAP });
    }
  } else {
    if (label) {
      doc.fillColor('#000000').text(label.trim(), x, y, { width });
    }
    doc.font(FONT.regular).fontSize(QUESTION_SIZE).fillColor('#000000');
    drawExamRuns(doc, examTextRuns(body), x, doc.y, { width, lineGap: QUESTION_LINE_GAP });
  }

  doc.x = x;
}

function drawAnswerTitle(doc, school, examSheet) {
  const x = doc.page.margins.left;
  const width = contentWidth(doc);

  doc.font(FONT.bold).fontSize(16).fillColor('#000000');
  doc.text('답지', x, doc.y, { width });
  doc.moveDown(0.35);
  doc.font(FONT.regular).fontSize(12.5).fillColor('#000000');
  doc.text(`학교 : ${school}`, x, doc.y, { width });
  doc.moveDown(0.2);
  doc.text(`기준이 되는 기출 시험지 : ${examSheet}`, x, doc.y, { width });
  doc.moveDown(0.55);
  drawDoubleRule(doc);
}

function drawAnswerSheet(doc, school, examSheet, items) {
  const before = doc.bufferedPageRange();
  const answerPageStart = before.start + before.count;

  doc.addPage();
  drawAnswerTitle(doc, school, examSheet);

  items.forEach((item) => {
    const needed = measureLabeledBody(
      doc,
      answerLabel(item),
      answerBody(item.answer),
      contentWidth(doc),
      ANSWER_ITEM_GAP
    );
    ensureItemFits(doc, needed);
    doc.x = doc.page.margins.left;
    drawLabeledBody(doc, answerLabel(item), answerBody(item.answer));
    doc.y += ANSWER_ITEM_GAP;
  });

  return answerPageStart;
}

function drawPageFurniture(doc, school, examSheet, answerPageStart) {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const savedTop = doc.page.margins.top;
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.top = 0;
    doc.page.margins.bottom = 0;

    const { width, height } = doc.page;
    const pageNo = i - range.start + 1;
    const isLaterAnswerPage = answerPageStart != null && i > answerPageStart;

    if (pageNo > 1 && i !== answerPageStart) {
      const header = isLaterAnswerPage
        ? `학교 : ${school}    기준이 되는 기출 시험지 : ${examSheet}    답지`
        : `학교 : ${school}    기준이 되는 기출 시험지 : ${examSheet}`;
      doc.font(FONT.regular).fontSize(9).fillColor('#222222');
      doc.text(header, PAGE_MARGIN.left, 30, {
        width: width - PAGE_MARGIN.left - PAGE_MARGIN.right,
        lineBreak: false,
        ellipsis: true
      });
      doc.save();
      doc.strokeColor('#222222')
        .lineWidth(0.6)
        .moveTo(PAGE_MARGIN.left, 46)
        .lineTo(width - PAGE_MARGIN.right, 46)
        .stroke();
      doc.restore();
    }

    doc.save();
    doc.strokeColor('#222222')
      .lineWidth(0.4)
      .moveTo(PAGE_MARGIN.left, height - 42)
      .lineTo(width - PAGE_MARGIN.right, height - 42)
      .stroke();
    doc.restore();

    doc.font(FONT.regular).fontSize(10).fillColor('#111111');
    doc.text(`- ${pageNo} -`, 0, height - 34, {
      width,
      align: 'center',
      lineBreak: false
    });

    doc.page.margins.top = savedTop;
    doc.page.margins.bottom = savedBottom;
  }
}

function fontFace(embedded) {
  return embedded?.font;
}

function fontSupports(embedded, codePoint) {
  const face = fontFace(embedded);
  if (!face || typeof face.hasGlyphForCodePoint !== 'function') return true;
  return face.hasGlyphForCodePoint(codePoint);
}

function splitGlyphRuns(text, mainFont, symbolFont) {
  const runs = [];
  let buffer = '';
  let useSymbol = false;
  let started = false;

  for (const ch of String(text ?? '')) {
    const symbol = !fontSupports(mainFont, ch.codePointAt(0))
      && fontSupports(symbolFont, ch.codePointAt(0));
    if (!started) {
      useSymbol = symbol;
      started = true;
    }
    if (symbol !== useSymbol) {
      runs.push({ symbol: useSymbol, text: buffer });
      buffer = ch;
      useSymbol = symbol;
    } else {
      buffer += ch;
    }
  }
  if (buffer) runs.push({ symbol: useSymbol, text: buffer });
  return runs;
}

function installGlyphFallback(doc) {
  if (!fs.existsSync(SYMBOL_FONT_PATH)) return;
  doc.registerFont(SYMBOL_FONT_NAME, SYMBOL_FONT_PATH);
  const previousFont = doc._font;
  doc.font(SYMBOL_FONT_NAME);
  const symbolFont = doc._font;
  if (previousFont) doc._font = previousFont;

  const originalWidth = doc.widthOfString.bind(doc);
  const originalFragment = doc._fragment.bind(doc);

  doc.widthOfString = function widthOfString(string, options) {
    const text = string == null ? '' : `${string}`;
    const mainFont = this._font;
    const runs = splitGlyphRuns(text, mainFont, symbolFont);
    if (runs.length === 0 || (runs.length === 1 && !runs[0].symbol)) {
      return originalWidth(text, options);
    }
    let total = 0;
    for (const run of runs) {
      this._font = run.symbol ? symbolFont : mainFont;
      total += originalWidth(run.text, options);
    }
    this._font = mainFont;
    return total;
  };

  doc._fragment = function fragment(text, x, y, options = {}) {
    const mainFont = this._font;
    const runs = splitGlyphRuns(text, mainFont, symbolFont);
    if (runs.length === 0 || runs.every((run) => !run.symbol)) {
      return originalFragment(text, x, y, options);
    }

    let startX = x;
    if (options.align === 'center' && options.lineWidth) {
      const textWidth = options.textWidth ?? this.widthOfString(text, options);
      startX += options.lineWidth / 2 - textWidth / 2;
    } else if (options.align === 'right' && options.lineWidth) {
      const textWidth = this.widthOfString(String(text).replace(/\s+$/, ''), options);
      startX += options.lineWidth - textWidth;
    }

    const plainOptions = {
      ...options,
      align: 'left',
      width: undefined,
      link: undefined,
      goTo: undefined,
      destination: undefined,
      underline: false,
      strike: false
    };
    let cursor = startX;
    const baselineShift = ((symbolFont.ascender || 0) - (mainFont.ascender || 0)) / 1000 * this._fontSize;
    for (const run of runs) {
      this._font = run.symbol ? symbolFont : mainFont;
      originalFragment(run.text, cursor, run.symbol ? y - baselineShift : y, plainOptions);
      cursor += originalWidth(run.text, options);
    }
    this._font = mainFont;
    if (options.underline || options.strike) {
      const lineWidth = this._fontSize < 10 ? 0.5 : Math.floor(this._fontSize / 10);
      this.save();
      if (!options.stroke && this._fillColor?.length) this.strokeColor(...this._fillColor);
      this.lineWidth(lineWidth);
      if (options.underline) {
        const lineY = y + this.currentLineHeight() - lineWidth;
        this.moveTo(startX, lineY).lineTo(cursor, lineY).stroke();
      }
      if (options.strike) {
        const lineY = y + this.currentLineHeight() / 2;
        this.moveTo(startX, lineY).lineTo(cursor, lineY).stroke();
      }
      this.restore();
    }
  };
}

function applyFonts(doc, fonts) {
  FONT.regular = 'Regular';
  FONT.bold = 'Bold';
  embedUnicode = fonts.embedUnicode !== false;
  if (!fonts.regular) {
    FONT.regular = 'Helvetica';
    FONT.bold = 'Helvetica-Bold';
    embedUnicode = false;
    const wrap = (method) => {
      const original = doc[method].bind(doc);
      doc[method] = (text, ...args) => original(
        typeof text === 'string' ? cleanText(text) : text,
        ...args
      );
    };
    wrap('text');
    wrap('widthOfString');
    wrap('heightOfString');
    return;
  }
  doc.registerFont('Regular', fonts.regular);
  doc.registerFont('Bold', fonts.bold || fonts.regular);
  installGlyphFallback(doc);
}

const ANALYSIS_ITEM_GAP = 14;

function analysisHeading(item) {
  const number = cleanText(item.number).trim();
  const type = cleanText(item.questionType).trim();
  if (number && type) return `${number}. ${type}`;
  return number || type || '문항';
}

function analysisQuestion(question) {
  return cleanText(question).trim().slice(0, 20000);
}

function measureAnalysisItem(doc, item, width) {
  doc.font(FONT.bold).fontSize(QUESTION_SIZE);
  let height = doc.heightOfString(analysisHeading(item), { width, lineGap: 2 });
  const question = analysisQuestion(item.question);
  doc.font(FONT.regular).fontSize(QUESTION_SIZE);
  height += 4 + examRunsHeight(doc, examTextRuns(question), width, QUESTION_LINE_GAP);
  const source = cleanText(item.sourceLabel).trim();
  if (source) {
    doc.font(FONT.regular).fontSize(10);
    height += 4 + doc.heightOfString(source, { width, lineGap: 1 });
  }
  return height + ANALYSIS_ITEM_GAP;
}

function drawAnalysisItem(doc, item) {
  const x = doc.page.margins.left;
  const width = contentWidth(doc);
  const question = analysisQuestion(item.question);
  const source = cleanText(item.sourceLabel).trim();

  doc.x = x;
  doc.font(FONT.bold).fontSize(QUESTION_SIZE).fillColor('#000000');
  doc.text(analysisHeading(item), x, doc.y, { width, lineGap: 2 });
  doc.y += 4;
  doc.font(FONT.regular).fontSize(QUESTION_SIZE).fillColor('#000000');
  drawExamRuns(doc, examTextRuns(question), x, doc.y, {
    width,
    lineGap: QUESTION_LINE_GAP
  });
  if (source) {
    doc.y += 4;
    doc.font(FONT.regular).fontSize(10).fillColor('#333333');
    doc.text(source, x, doc.y, { width, lineGap: 1 });
    doc.fillColor('#000000');
  }
  doc.x = x;
  doc.y += ANALYSIS_ITEM_GAP;
}

function drawAnalysisTitle(doc, school, examSheet) {
  const x = doc.page.margins.left;
  const width = contentWidth(doc);

  doc.font(FONT.bold).fontSize(16).fillColor('#000000');
  doc.text('문항 분석', x, doc.y, { width });
  doc.moveDown(0.35);
  doc.font(FONT.regular).fontSize(12.5).fillColor('#000000');
  if (school) doc.text(`학교 : ${school}`, x, doc.y, { width });
  if (examSheet) {
    if (school) doc.moveDown(0.2);
    doc.text(`기준이 되는 기출 시험지 : ${examSheet}`, x, doc.y, { width });
  }
  doc.moveDown(0.55);
  drawDoubleRule(doc);
}

function drawAnalysisFurniture(doc, school, examSheet) {
  const range = doc.bufferedPageRange();
  const titleBits = ['문항 분석', school && `학교 : ${school}`, examSheet && `기준이 되는 기출 시험지 : ${examSheet}`]
    .filter(Boolean);

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const savedTop = doc.page.margins.top;
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.top = 0;
    doc.page.margins.bottom = 0;

    const { width, height } = doc.page;
    const pageNo = i - range.start + 1;
    if (pageNo > 1) {
      doc.font(FONT.regular).fontSize(9).fillColor('#222222');
      doc.text(titleBits.join('    '), PAGE_MARGIN.left, 30, {
        width: width - PAGE_MARGIN.left - PAGE_MARGIN.right,
        lineBreak: false,
        ellipsis: true
      });
      doc.save();
      doc.strokeColor('#222222')
        .lineWidth(0.6)
        .moveTo(PAGE_MARGIN.left, 46)
        .lineTo(width - PAGE_MARGIN.right, 46)
        .stroke();
      doc.restore();
    }

    doc.save();
    doc.strokeColor('#222222')
      .lineWidth(0.4)
      .moveTo(PAGE_MARGIN.left, height - 42)
      .lineTo(width - PAGE_MARGIN.right, height - 42)
      .stroke();
    doc.restore();

    doc.font(FONT.regular).fontSize(10).fillColor('#111111');
    doc.text(`- ${pageNo} -`, 0, height - 34, {
      width,
      align: 'center',
      lineBreak: false
    });

    doc.page.margins.top = savedTop;
    doc.page.margins.bottom = savedBottom;
  }
}

export function buildExamAnalysisPdf({ school, examSheet, items, fontDirs } = {}) {
  const fonts = resolveExamPdfFonts(fontDirs ? { dirs: fontDirs } : {});
  embedUnicode = fonts.embedUnicode !== false && Boolean(fonts.regular);
  const normalized = (Array.isArray(items) ? items : []).slice(0, 300).map((item) => ({
    number: item?.number ?? '',
    questionType: item?.questionType ?? '',
    question: item?.question ?? '',
    sourceLabel: item?.sourceLabel ?? ''
  }));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: PAGE_MARGIN,
      bufferPages: true,
      info: {
        Title: cleanText(`문항 분석 ${school} ${examSheet}`) || '문항 분석',
        Author: cleanText(school) || 'exam'
      }
    });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      applyFonts(doc, fonts);
      const safeSchool = cleanText(school);
      const safeSheet = cleanText(examSheet);
      drawAnalysisTitle(doc, safeSchool, safeSheet);
      normalized.forEach((item) => {
        const needed = measureAnalysisItem(doc, item, contentWidth(doc));
        ensureItemFits(doc, needed);
        drawAnalysisItem(doc, item);
      });
      drawAnalysisFurniture(doc, safeSchool, safeSheet);
      doc.end();
    } catch (error) {
      reject(error);
    } finally {
      embedUnicode = true;
      FONT.regular = 'Regular';
      FONT.bold = 'Bold';
    }
  });
}

export function buildExamSheetPdf({ school, examSheet, items, fontDirs } = {}) {
  const fonts = resolveExamPdfFonts(fontDirs ? { dirs: fontDirs } : {});
  embedUnicode = fonts.embedUnicode !== false && Boolean(fonts.regular);
  const normalized = (Array.isArray(items) ? items : []).slice(0, 300).map((item) => ({
    orderNo: item?.orderNo ?? '',
    compositionNo: item?.compositionNo ?? '',
    examScope: item?.examScope ?? '',
    questionType: item?.questionType ?? '',
    question: item?.question ?? '',
    answer: item?.answer ?? ''
  }));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: PAGE_MARGIN,
      bufferPages: true,
      info: {
        Title: cleanText(`${school} ${examSheet}`) || 'exam',
        Author: cleanText(school) || 'exam'
      }
    });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      applyFonts(doc, fonts);
      const safeSchool = cleanText(school);
      const safeSheet = cleanText(examSheet);
      drawTitle(doc, safeSchool, safeSheet);

      normalized.forEach((item) => {
        const needed = measureItem(doc, item, contentWidth(doc));
        ensureItemFits(doc, needed);
        drawItem(doc, item);
      });

      const answerPageStart = normalized.length > 0
        ? drawAnswerSheet(doc, safeSchool, safeSheet, normalized)
        : null;
      drawPageFurniture(doc, safeSchool, safeSheet, answerPageStart);
      doc.end();
    } catch (error) {
      reject(error);
    } finally {
      embedUnicode = true;
      FONT.regular = 'Regular';
      FONT.bold = 'Bold';
    }
  });
}
