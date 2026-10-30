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

function splitQuestion(body) {
  const newline = body.indexOf('\n');
  if (newline === -1) return { first: body, rest: '' };
  return {
    first: body.slice(0, newline),
    rest: body.slice(newline + 1)
  };
}

const BUNDLED_FONT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../fonts'
);

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
  doc.text(`기준 시험지 : ${examSheet}`, x, doc.y, { width });
  doc.moveDown(0.55);
  drawDoubleRule(doc);
}

function measureItem(doc, item, width) {
  const body = questionBody(item.question);
  const { first, rest } = splitQuestion(body);
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
    bodyHeight += doc.font(FONT.regular).fontSize(QUESTION_SIZE).heightOfString(body, {
      width,
      lineGap: QUESTION_LINE_GAP
    });
  } else {
    bodyHeight += doc.heightOfString(first || ' ', {
      width: width - labelWidth,
      lineGap: QUESTION_LINE_GAP
    });
    if (rest) {
      bodyHeight += doc.heightOfString(rest, { width, lineGap: QUESTION_LINE_GAP });
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
  const { first, rest } = splitQuestion(body);

  if (!stacked) {
    doc.fillColor('#000000').text(label, x, y, { lineBreak: false });
    doc.font(FONT.regular).fontSize(QUESTION_SIZE).fillColor('#000000');
    doc.text(first || ' ', x + labelWidth, y, {
      width: width - labelWidth,
      lineGap: QUESTION_LINE_GAP
    });
    if (rest) {
      doc.text(rest, x, doc.y, { width, lineGap: QUESTION_LINE_GAP });
    }
  } else {
    if (label) {
      doc.fillColor('#000000').text(label.trim(), x, y, { width });
    }
    doc.font(FONT.regular).fontSize(QUESTION_SIZE).fillColor('#000000');
    doc.text(body, x, doc.y, { width, lineGap: QUESTION_LINE_GAP });
  }

  doc.x = x;
  doc.y += 16;
}

function measureLabeledBody(doc, label, body, width, gapAfter) {
  const { first, rest } = splitQuestion(body);
  doc.font(FONT.bold).fontSize(QUESTION_SIZE);
  const labelWidth = label ? doc.widthOfString(label) : 0;
  const stacked = !label || labelWidth > width * 0.45;
  let bodyHeight = 0;

  if (stacked) {
    if (label) {
      bodyHeight += doc.font(FONT.bold).fontSize(QUESTION_SIZE).heightOfString(label.trim(), { width });
    }
    bodyHeight += doc.font(FONT.regular).fontSize(QUESTION_SIZE).heightOfString(body, {
      width,
      lineGap: QUESTION_LINE_GAP
    });
  } else {
    doc.font(FONT.regular).fontSize(QUESTION_SIZE);
    bodyHeight += doc.heightOfString(first || ' ', {
      width: width - labelWidth,
      lineGap: QUESTION_LINE_GAP
    });
    if (rest) {
      bodyHeight += doc.heightOfString(rest, { width, lineGap: QUESTION_LINE_GAP });
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
  const { first, rest } = splitQuestion(body);

  if (!stacked) {
    doc.fillColor('#000000').text(label, x, y, { lineBreak: false });
    doc.font(FONT.regular).fontSize(QUESTION_SIZE).fillColor('#000000');
    doc.text(first || ' ', x + labelWidth, y, {
      width: width - labelWidth,
      lineGap: QUESTION_LINE_GAP
    });
    if (rest) {
      doc.text(rest, x, doc.y, { width, lineGap: QUESTION_LINE_GAP });
    }
  } else {
    if (label) {
      doc.fillColor('#000000').text(label.trim(), x, y, { width });
    }
    doc.font(FONT.regular).fontSize(QUESTION_SIZE).fillColor('#000000');
    doc.text(body, x, doc.y, { width, lineGap: QUESTION_LINE_GAP });
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
  doc.text(`기준 시험지 : ${examSheet}`, x, doc.y, { width });
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
        ? `학교 : ${school}    기준 시험지 : ${examSheet}    답지`
        : `학교 : ${school}    기준 시험지 : ${examSheet}`;
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
