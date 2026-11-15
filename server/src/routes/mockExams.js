import express from 'express';
import pool from '../config/database.js';
import { trimStringFields } from '../utils/trimHelper.js';

const router = express.Router();

function sortKorean(values) {
  return [...values].sort((a, b) => a.localeCompare(b, 'ko'));
}

function sortKoreanDesc(values) {
  return [...values].sort((a, b) => b.localeCompare(a, 'ko'));
}

// GET /api/mock-exams/grades - mock_exams.grade 고유 목록 (고1, 고2, 고3)
router.get('/grades', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT grade
      FROM mock_exams
      WHERE grade IS NOT NULL AND TRIM(grade) != ''
    `);
    const rows = trimStringFields(result.rows);
    res.json({ grades: sortKorean(rows.map(row => row.grade)) });
  } catch (error) {
    console.error('Error fetching mock exam grades:', error);
    res.status(500).json({ error: '모의고사 학년 조회에 실패했습니다' });
  }
});

// GET /api/mock-exams?grade= - mock_exams.name 목록. 학년을 주면 이름은 역자모순
router.get('/', async (req, res) => {
  const grade = String(req.query.grade || '').trim();
  const params = [];
  let where = `name IS NOT NULL AND TRIM(name) != ''`;
  if (grade) {
    params.push(grade);
    where += ` AND grade = $${params.length}`;
  }

  try {
    const result = await pool.query(`
      SELECT name
      FROM mock_exams
      WHERE ${where}
      ORDER BY id
    `, params);
    const names = trimStringFields(result.rows).map(row => row.name);
    res.json({ mockExams: grade ? sortKoreanDesc(names) : names });
  } catch (error) {
    console.error('Error fetching mock exams:', error);
    res.status(500).json({ error: '모의고사 목록 조회에 실패했습니다' });
  }
});

export default router;
