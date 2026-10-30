import express from 'express';
import pool from '../config/database.js';
import { trimStringFields } from '../utils/trimHelper.js';
import { buildExamSheetPdf } from '../utils/examSheetPdf.js';

const router = express.Router();

// GET /api/exam-papers/schools - exam_papers.school 고유 목록
router.get('/schools', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT school
      FROM exam_papers
      WHERE school IS NOT NULL AND TRIM(school) != ''
      ORDER BY school
    `);
    const rows = trimStringFields(result.rows);
    res.json({ schools: rows.map(row => row.school) });
  } catch (error) {
    console.error('Error fetching exam paper schools:', error);
    res.status(500).json({ error: '학교 목록 조회에 실패했습니다' });
  }
});

// GET /api/exam-papers/sheets?school= - 선택한 학교의 exam_sheet 고유 목록
router.get('/sheets', async (req, res) => {
  const { school } = req.query;

  if (!school || !String(school).trim()) {
    return res.status(400).json({ error: '학교를 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT exam_sheet
      FROM exam_papers
      WHERE school = $1 AND exam_sheet IS NOT NULL AND TRIM(exam_sheet) != ''
      ORDER BY exam_sheet
    `, [String(school).trim()]);
    const rows = trimStringFields(result.rows);
    res.json({ examSheets: rows.map(row => row.exam_sheet) });
  } catch (error) {
    console.error('Error fetching exam sheets:', error);
    res.status(500).json({ error: '시험지 목록 조회에 실패했습니다' });
  }
});

function parseSources(sources) {
  return String(sources || '')
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean);
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

// GET /api/exam-papers/build?school=&examSheet=
// order_no 1번부터 끝까지, 출처·유형·객주에 맞는 문제 중 하나를 무작위로 고른다.
router.get('/build', async (req, res) => {
  const school = String(req.query.school || '').trim();
  const examSheet = String(req.query.examSheet || '').trim();

  if (!school || !examSheet) {
    return res.status(400).json({ error: '학교와 시험지를 선택해주세요' });
  }

  try {
    const papersResult = await pool.query(`
      SELECT order_no, composition_no, sources, answer_format, question_type
      FROM exam_papers
      WHERE school = $1 AND exam_sheet = $2
      ORDER BY order_no ASC
    `, [school, examSheet]);

    const papers = trimStringFields(papersResult.rows);
    const usedQuestionIds = new Set();
    const items = [];

    for (const paper of papers) {
      const sources = parseSources(paper.sources);
      let picked = null;

      if (sources.length > 0) {
        const questionsResult = await pool.query(`
          SELECT id, exam_scope, question
          FROM exam_questions
          WHERE exam_scope = ANY($1::text[])
            AND question_type = $2
            AND answer_format = $3
        `, [sources, paper.question_type, paper.answer_format]);

        const candidates = trimStringFields(questionsResult.rows);
        const unused = candidates.filter((question) => !usedQuestionIds.has(question.id));
        const poolToPick = unused.length > 0 ? unused : candidates;

        if (poolToPick.length > 0) {
          picked = pickRandom(poolToPick);
          usedQuestionIds.add(picked.id);
        }
      }

      items.push({
        orderNo: paper.order_no,
        compositionNo: paper.composition_no,
        sources,
        questionType: paper.question_type,
        answerFormat: paper.answer_format,
        questionId: picked ? picked.id : null,
        examScope: picked ? picked.exam_scope : null,
        question: picked ? picked.question : null
      });
    }

    res.json({ school, examSheet, items });
  } catch (error) {
    console.error('Error building exam paper:', error);
    res.status(500).json({ error: '시험 문제를 만들지 못했습니다' });
  }
});

function questionIdsOf(items) {
  return [...new Set(
    items
      .map((item) => Number(item?.questionId))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];
}

async function answersByQuestionId(items) {
  const ids = questionIdsOf(items);
  if (ids.length === 0) return new Map();

  const result = await pool.query(
    `SELECT id, answer FROM exam_questions WHERE id = ANY($1::int[])`,
    [ids]
  );
  const rows = trimStringFields(result.rows);
  return new Map(rows.map((row) => [Number(row.id), row.answer]));
}

// POST /api/exam-papers/pdf
// 화면 문항으로 시험지를 만들고, answer는 여기서만 읽어 맨 뒤 답지에 넣는다.
router.post('/pdf', async (req, res) => {
  const school = String(req.body?.school || '').trim();
  const examSheet = String(req.body?.examSheet || '').trim();
  const items = req.body?.items;

  if (!school || !examSheet) {
    return res.status(400).json({ error: '학교와 시험지를 선택해주세요' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '받을 문항이 없습니다' });
  }
  if (items.length > 300) {
    return res.status(400).json({ error: '문항이 너무 많습니다' });
  }

  try {
    const answers = await answersByQuestionId(items);
    const pdfItems = items.map((item) => {
      const questionId = Number(item?.questionId);
      const answer = Number.isInteger(questionId) ? answers.get(questionId) : '';
      return {
        orderNo: item?.orderNo ?? '',
        compositionNo: item?.compositionNo ?? '',
        examScope: item?.examScope ?? '',
        questionType: item?.questionType ?? '',
        question: item?.question ?? '',
        answer: answer ?? ''
      };
    });
    const pdf = await buildExamSheetPdf({ school, examSheet, items: pdfItems });
    const filename = `${school}_${examSheet}.pdf`.replace(/[\\/:*?"<>|]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="exam-sheet.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.send(pdf);
  } catch (error) {
    console.error('Error creating exam sheet PDF:', error);
    const message = String(error?.message || '');
    const clientError = message.includes('글꼴') ? message : 'PDF를 만들지 못했습니다';
    res.status(500).json({ error: clientError });
  }
});

export default router;
