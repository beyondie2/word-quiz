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

// POST /api/spoken/progress - web book 수행 기록 (user_progress)
router.post('/progress', async (req, res) => {
  const { userId, book, unit, engSen, korSen, wrongAnswer, isCorrect } = req.body;

  if (!userId || !book || !unit || !engSen || !korSen) {
    return res.status(400).json({ error: '필수 필드가 누락되었습니다' });
  }

  if (typeof isCorrect !== 'boolean') {
    return res.status(400).json({ error: 'isCorrect 값이 필요합니다' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO user_progress
       (user_id, book_name, unit, english, korean, wrong_answer, practice_mode, korean_answer_type, round, unit_review_count, is_correct)
       VALUES ($1, $2, $3, $4, $5, $6, 'english', 'one', 1, 0, $7)
       RETURNING id`,
      [
        userId,
        book,
        unit,
        engSen,
        korSen,
        isCorrect ? null : (wrongAnswer || null),
        isCorrect
      ]
    );

    res.json({ success: true, progressId: result.rows[0].id });
  } catch (error) {
    console.error('Error saving spoken progress:', error);
    res.status(500).json({ success: false, error: '수행 기록 저장에 실패했습니다' });
  }
});

export default router;
