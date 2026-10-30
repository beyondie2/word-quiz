import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const PAGE_MARGIN = { top: 58, bottom: 58, left: 54, right: 54 };
const QUESTION_SIZE = 12;
const QUESTION_LINE_GAP = 5;
const ANSWER_ITEM_GAP = 12;

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
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

function resolveKoreanFonts() {
  const windowsRoot = process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows';
  const regular = path.join(windowsRoot, 'Fonts', 'malgun.ttf');
  const bold = path.join(windowsRoot, 'Fonts', 'malgunbd.ttf');

  if (!fs.existsSync(regular)) {
    throw new Error('한글 PDF 글꼴(맑은 고딕)을 찾지 못했습니다');
  }

  return {
    regular,
    bold: fs.existsSync(bold) ? bold : regular
  };
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

  doc.font('Bold').fontSize(16).fillColor('#000000');
  doc.text(`학교 : ${school}`, x, doc.y, { width });
  doc.moveDown(0.35);
  doc.font('Regular').fontSize(12.5).fillColor('#000000');
  doc.text(`기준 시험지 : ${examSheet}`, x, doc.y, { width });
  doc.moveDown(0.55);
  drawDoubleRule(doc);
}

function measureItem(doc, item, width) {
  const body = questionBody(item.question);
  const { first, rest } = splitQuestion(body);
  doc.font('Regular').fontSize(10.5);
  const metaHeight = doc.heightOfString(examMetaLine(item), { width, lineGap: 2 });
  const label = examCompositionLabel(item.compositionNo);
  doc.font('Bold').fontSize(QUESTION_SIZE);
  const labelWidth = label ? doc.widthOfString(label) : 0;
  const stacked = !label || labelWidth > width * 0.45;
  doc.font('Regular').fontSize(QUESTION_SIZE);

  let bodyHeight = 0;
  if (stacked) {
    if (label) {
      bodyHeight += doc.font('Bold').fontSize(QUESTION_SIZE).heightOfString(label.trim(), { width });
    }
    bodyHeight += doc.font('Regular').fontSize(QUESTION_SIZE).heightOfString(body, {
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
  doc.font('Regular').fontSize(10.5).fillColor('#000000');
  doc.text(examMetaLine(item), x, doc.y, { width, lineGap: 2 });
  doc.y += 4;

  doc.font('Bold').fontSize(QUESTION_SIZE);
  const labelWidth = label ? doc.widthOfString(label) : 0;
  const stacked = !label || labelWidth > width * 0.45;
  const y = doc.y;
  const { first, rest } = splitQuestion(body);

  if (!stacked) {
    doc.fillColor('#000000').text(label, x, y, { lineBreak: false });
    doc.font('Regular').fontSize(QUESTION_SIZE).fillColor('#000000');
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
    doc.font('Regular').fontSize(QUESTION_SIZE).fillColor('#000000');
    doc.text(body, x, doc.y, { width, lineGap: QUESTION_LINE_GAP });
  }

  doc.x = x;
  doc.y += 16;
}

function measureLabeledBody(doc, label, body, width, gapAfter) {
  const { first, rest } = splitQuestion(body);
  doc.font('Bold').fontSize(QUESTION_SIZE);
  const labelWidth = label ? doc.widthOfString(label) : 0;
  const stacked = !label || labelWidth > width * 0.45;
  let bodyHeight = 0;

  if (stacked) {
    if (label) {
      bodyHeight += doc.font('Bold').fontSize(QUESTION_SIZE).heightOfString(label.trim(), { width });
    }
    bodyHeight += doc.font('Regular').fontSize(QUESTION_SIZE).heightOfString(body, {
      width,
      lineGap: QUESTION_LINE_GAP
    });
  } else {
    doc.font('Regular').fontSize(QUESTION_SIZE);
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
  doc.font('Bold').fontSize(QUESTION_SIZE);
  const labelWidth = label ? doc.widthOfString(label) : 0;
  const stacked = !label || labelWidth > width * 0.45;
  const y = doc.y;
  const { first, rest } = splitQuestion(body);

  if (!stacked) {
    doc.fillColor('#000000').text(label, x, y, { lineBreak: false });
    doc.font('Regular').fontSize(QUESTION_SIZE).fillColor('#000000');
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
    doc.font('Regular').fontSize(QUESTION_SIZE).fillColor('#000000');
    doc.text(body, x, doc.y, { width, lineGap: QUESTION_LINE_GAP });
  }

  doc.x = x;
}

function drawAnswerTitle(doc, school, examSheet) {
  const x = doc.page.margins.left;
  const width = contentWidth(doc);

  doc.font('Bold').fontSize(16).fillColor('#000000');
  doc.text('답지', x, doc.y, { width });
  doc.moveDown(0.35);
  doc.font('Regular').fontSize(12.5).fillColor('#000000');
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
      doc.font('Regular').fontSize(9).fillColor('#222222');
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

    doc.font('Regular').fontSize(10).fillColor('#111111');
    doc.text(`- ${pageNo} -`, 0, height - 34, {
      width,
      align: 'center',
      lineBreak: false
    });

    doc.page.margins.top = savedTop;
    doc.page.margins.bottom = savedBottom;
  }
}

export function buildExamSheetPdf({ school, examSheet, items }) {
  const fonts = resolveKoreanFonts();
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
        Title: `${school} ${examSheet}`,
        Author: school
      }
    });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      doc.registerFont('Regular', fonts.regular);
      doc.registerFont('Bold', fonts.bold);
      drawTitle(doc, school, examSheet);

      normalized.forEach((item) => {
        const needed = measureItem(doc, item, contentWidth(doc));
        ensureItemFits(doc, needed);
        drawItem(doc, item);
      });

      const answerPageStart = normalized.length > 0
        ? drawAnswerSheet(doc, school, examSheet, normalized)
        : null;
      drawPageFurniture(doc, school, examSheet, answerPageStart);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
