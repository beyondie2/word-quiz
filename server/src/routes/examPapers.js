import express from 'express';
import pool from '../config/database.js';
import { trimStringFields } from '../utils/trimHelper.js';
import { buildExamSheetPdf } from '../utils/examSheetPdf.js';
import { authenticateToken } from '../middleware/auth.js';

const SOURCE_TYPES = ['교과서', '모의고사', '부교재', '자작', '외부지문'];

const router = express.Router();

// GET /api/exam-papers/schools - exam_papers.school 고유 목록
// 기본 시험지와 사용자가 저장한 시험지 학교를 모두 보여 준다.
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
  if (Array.isArray(sources)) {
    return sources.map((source) => String(source).trim()).filter(Boolean);
  }
  const text = String(sources || '').trim();
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((source) => String(source).trim()).filter(Boolean);
      }
    } catch {
      // 예전 쉼표 구분 문자열로 읽는다
    }
  }
  return text
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
    let papersResult = await pool.query(`
      SELECT order_no, composition_no, sources, source_type, question, answer_format, question_type
      FROM exam_papers
      WHERE paper_id IS NULL
        AND user_id IS NULL
        AND school = $1 AND exam_sheet = $2
      ORDER BY order_no ASC
    `, [school, examSheet]);

    if (papersResult.rows.length === 0) {
      papersResult = await pool.query(`
        SELECT order_no, composition_no, sources, source_type, question, answer_format, question_type
        FROM exam_papers
        WHERE school = $1 AND exam_sheet = $2
          AND paper_id = (
            SELECT MAX(paper_id)
            FROM exam_papers
            WHERE school = $1 AND exam_sheet = $2 AND paper_id IS NOT NULL
          )
        ORDER BY order_no ASC
      `, [school, examSheet]);
    }

    const papers = trimStringFields(papersResult.rows);
    const usedQuestionIds = new Set();
    const items = [];

    for (const paper of papers) {
      const sources = parseSources(paper.sources);
      const storedQuestion = String(paper.question || '').trim();
      let picked = null;

      if (!storedQuestion && sources.length > 0) {
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
        sourceType: paper.source_type || null,
        questionType: paper.question_type,
        answerFormat: paper.answer_format,
        questionId: storedQuestion ? null : (picked ? picked.id : null),
        examScope: storedQuestion ? null : (picked ? picked.exam_scope : null),
        question: storedQuestion || (picked ? picked.question : null)
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

function modelSourceList(value) {
  if (!Array.isArray(value)) return null;
  const sources = value.map((source) => String(source ?? '').trim()).filter(Boolean);
  if (sources.length > 100) return null;
  if (sources.some((source) => source.length > 200)) return null;
  return sources;
}

// POST /api/exam-papers/model
// 학교, 시험지, 사용자가 같으면 그 시험지 문항을 고치고, 없으면 새 시험지id로 넣는다.
router.post('/model', authenticateToken, async (req, res) => {
  const school = String(req.body?.school || '').trim();
  const examSheet = String(req.body?.examSheet || '').trim();
  const items = req.body?.items;
  const userId = Number(req.user?.id);

  if (!school || !examSheet) {
    return res.status(400).json({ error: '학교와 시험지를 선택해주세요' });
  }
  if (school.length > 100 || examSheet.length > 200) {
    return res.status(400).json({ error: '학교는 100자, 시험지는 200자 이하여야 합니다' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '저장할 문항이 없습니다' });
  }
  if (items.length > 300) {
    return res.status(400).json({ error: '문항이 너무 많습니다' });
  }
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(403).json({ error: '사용자를 찾을 수 없습니다' });
  }

  const rows = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] || {};
    const compositionNo = String(item.compositionNo ?? '').trim();
    const sourceType = String(item.sourceType ?? '').trim();
    const answerFormat = String(item.answerFormat ?? '').trim();
    const questionType = String(item.questionType ?? '').trim();
    const question = String(item.question ?? '').trim();
    const sources = modelSourceList(item.sources);
    const rowNum = i + 1;

    if (!compositionNo || compositionNo.length > 50) {
      return res.status(400).json({ error: `${rowNum}번 문항 번호가 없거나 너무 깁니다` });
    }
    if (!SOURCE_TYPES.includes(sourceType)) {
      return res.status(400).json({ error: `${rowNum}번 문항의 출처를 선택해주세요` });
    }
    if (!['객관식', '주관식'].includes(answerFormat)) {
      return res.status(400).json({ error: `${rowNum}번 문항의 객주를 알 수 없습니다` });
    }
    if (!questionType || questionType.length > 100) {
      return res.status(400).json({ error: `${rowNum}번 문항의 유형이 없거나 너무 깁니다` });
    }
    if (sources == null) {
      return res.status(400).json({ error: `${rowNum}번 문항의 시험범위가 올바르지 않습니다` });
    }
    rows.push({
      orderNo: rowNum,
      compositionNo,
      sourceType,
      sources: JSON.stringify(sources),
      question: question || null,
      answerFormat,
      questionType,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [814201]);

    const existing = await client.query(
      `SELECT paper_id
       FROM exam_papers
       WHERE school = $1 AND exam_sheet = $2 AND user_id = $3
         AND paper_id IS NOT NULL
       ORDER BY paper_id
       LIMIT 1`,
      [school, examSheet, userId]
    );
    const existingPaperId = existing.rows[0]?.paper_id ?? null;

    if (existingPaperId != null) {
      await client.query(
        `DELETE FROM exam_papers
         WHERE school = $1 AND exam_sheet = $2 AND user_id = $3`,
        [school, examSheet, userId]
      );
    }

    const paperId = existingPaperId ?? (await client.query(
      `SELECT COALESCE(MAX(paper_id), 0) + 1 AS paper_id FROM exam_papers`
    )).rows[0].paper_id;

    for (const row of rows) {
      await client.query(
        `INSERT INTO exam_papers
           (school, exam_sheet, order_no, composition_no, sources, source_type, question, answer_format, question_type, paper_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          school,
          examSheet,
          row.orderNo,
          row.compositionNo,
          row.sources,
          row.sourceType,
          row.question,
          row.answerFormat,
          row.questionType,
          paperId,
          userId,
        ]
      );
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      paperId,
      updated: existingPaperId != null,
      itemCount: rows.length,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving exam paper model:', error);
    res.status(500).json({ error: '시험지모델을 저장하지 못했습니다' });
  } finally {
    client.release();
  }
});

export default router;
