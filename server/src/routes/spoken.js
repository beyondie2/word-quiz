import express from 'express';
import pool from '../config/database.js';
import { trimStringFields } from '../utils/trimHelper.js';

const router = express.Router();

// GET /api/spoken/books - 책 목록
router.get('/books', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT book
      FROM spoken_sentence
      WHERE book IS NOT NULL AND book != ''
      ORDER BY book
    `);
    const rows = trimStringFields(result.rows);
    res.json({ books: rows.map((row) => row.book) });
  } catch (error) {
    console.error('Error fetching spoken books:', error);
    res.status(500).json({ error: '책 목록 조회에 실패했습니다' });
  }
});

// GET /api/spoken/sections - 장(section) 목록
router.get('/sections', async (req, res) => {
  const { book } = req.query;

  if (!book) {
    return res.status(400).json({ error: '책을 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT section
      FROM spoken_sentence
      WHERE book = $1 AND section IS NOT NULL AND section != ''
      ORDER BY section
    `, [book]);
    const rows = trimStringFields(result.rows);
    res.json({ sections: rows.map((row) => row.section) });
  } catch (error) {
    console.error('Error fetching spoken sections:', error);
    res.status(500).json({ error: '장 목록 조회에 실패했습니다' });
  }
});

// GET /api/spoken/units - 단원(unit) 목록
router.get('/units', async (req, res) => {
  const { book, section } = req.query;

  if (!book || !section) {
    return res.status(400).json({ error: '책과 장을 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT unit
      FROM spoken_sentence
      WHERE book = $1 AND section = $2 AND unit IS NOT NULL AND unit != ''
      ORDER BY unit
    `, [book, section]);
    const rows = trimStringFields(result.rows);
    res.json({ units: rows.map((row) => row.unit) });
  } catch (error) {
    console.error('Error fetching spoken units:', error);
    res.status(500).json({ error: '단원 목록 조회에 실패했습니다' });
  }
});

// GET /api/spoken/sentences - 문장 목록
router.get('/sentences', async (req, res) => {
  const { book, section, unit } = req.query;

  if (!book || !section || !unit) {
    return res.status(400).json({ error: '책, 장, 단원을 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT id, book, section, unit, kor_sen, eng_sen
      FROM spoken_sentence
      WHERE book = $1 AND section = $2 AND unit = $3
      ORDER BY id
    `, [book, section, unit]);
    res.json({ sentences: trimStringFields(result.rows) });
  } catch (error) {
    console.error('Error fetching spoken sentences:', error);
    res.status(500).json({ error: '문장 목록 조회에 실패했습니다' });
  }
});

// GET /api/spoken/progress - web book 수행 기록 조회
router.get('/progress', async (req, res) => {
  const { requesterId, userId, date } = req.query;

  try {
    const requesterResult = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [requesterId]
    );
    const isAdmin = requesterResult.rows[0]?.is_admin || false;

    let query = `
      SELECT wp.id, wp.user_id, wp.spoken_sentence_id, wp.book, wp.section, wp.unit,
             wp.kor_sen, wp.eng_sen, wp.correct_answer, wp.user_answer, wp.wrong_answer,
             wp.wrong_attempts, wp.is_correct, wp.sentence_index, wp.total_sentences,
             wp.attempt_number, wp.round, wp.elapsed_seconds, wp.created_at, u.username
      FROM webbook_progress wp
      JOIN users u ON wp.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (!isAdmin) {
      query += ` AND wp.user_id = $${paramIndex}`;
      params.push(requesterId);
      paramIndex++;
    } else if (userId) {
      query += ` AND wp.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (date) {
      query += ` AND DATE(wp.created_at) = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    query += ' ORDER BY wp.created_at DESC LIMIT 500';

    const result = await pool.query(query, params);
    const records = trimStringFields(result.rows);

    const totalQuestions = records.length;
    const correctCount = records.filter((r) => r.is_correct).length;
    const wrongCount = totalQuestions - correctCount;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    res.json({
      records,
      stats: { totalQuestions, correctCount, wrongCount, accuracy }
    });
  } catch (error) {
    console.error('Error fetching webbook progress:', error);
    res.status(500).json({ error: 'web book 수행 기록 조회에 실패했습니다' });
  }
});

// POST /api/spoken/progress - web book 수행 기록 (webbook_progress)
router.post('/progress', async (req, res) => {
  const {
    userId,
    spokenSentenceId,
    book,
    section,
    unit,
    engSen,
    korSen,
    userAnswer,
    wrongAnswer,
    wrongAttempts,
    isCorrect,
    sentenceIndex,
    totalSentences,
    attemptNumber,
    round,
    elapsedSeconds
  } = req.body;

  if (!userId || !book || !unit || !engSen || !korSen) {
    return res.status(400).json({ error: '필수 필드가 누락되었습니다' });
  }

  if (typeof isCorrect !== 'boolean') {
    return res.status(400).json({ error: 'isCorrect 값이 필요합니다' });
  }

  const trimmedEng = String(engSen).trim();
  const trimmedKor = String(korSen).trim();
  const trimmedUserAnswer = userAnswer != null ? String(userAnswer).trim() : '';
  const trimmedWrongAnswer = wrongAnswer != null ? String(wrongAnswer).trim() : '';
  const answerForRow = trimmedUserAnswer || trimmedWrongAnswer;

  try {
    const result = await pool.query(
      `INSERT INTO webbook_progress
       (user_id, spoken_sentence_id, book, section, unit, kor_sen, eng_sen, correct_answer,
        user_answer, wrong_answer, wrong_attempts, is_correct, sentence_index, total_sentences,
        attempt_number, round, elapsed_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING id`,
      [
        userId,
        spokenSentenceId || null,
        book,
        section || null,
        unit,
        trimmedKor,
        trimmedEng,
        trimmedEng,
        answerForRow || null,
        isCorrect ? null : (answerForRow || null),
        wrongAttempts || null,
        isCorrect,
        sentenceIndex ?? null,
        totalSentences ?? null,
        attemptNumber ?? 1,
        round ?? 1,
        elapsedSeconds ?? null
      ]
    );

    res.json({ success: true, progressId: result.rows[0].id });
  } catch (error) {
    console.error('Error saving webbook progress:', error);
    res.status(500).json({ success: false, error: '수행 기록 저장에 실패했습니다' });
  }
});

export default router;
