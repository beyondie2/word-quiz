import express from 'express';
import pool from '../config/database.js';
import { trimStringFields } from '../utils/trimHelper.js';

const router = express.Router();

function sortKorean(values) {
  return [...values].sort((a, b) => a.localeCompare(b, 'ko'));
}

// GET /api/textbooks/categories - textbooks.category 고유 목록 (자모순)
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT category
      FROM textbooks
      WHERE category IS NOT NULL AND TRIM(category) != ''
    `);
    const rows = trimStringFields(result.rows);
    res.json({ categories: sortKorean(rows.map(row => row.category)) });
  } catch (error) {
    console.error('Error fetching textbook categories:', error);
    res.status(500).json({ error: '교과서 분류 조회에 실패했습니다' });
  }
});

// GET /api/textbooks/titles?category= - textbooks.title 고유 목록 (자모순)
router.get('/titles', async (req, res) => {
  const category = String(req.query.category || '').trim();
  const params = [];
  let where = `title IS NOT NULL AND TRIM(title) != ''`;
  if (category) {
    params.push(category);
    where += ` AND category = $${params.length}`;
  }

  try {
    const result = await pool.query(`
      SELECT title
      FROM textbooks
      WHERE ${where}
      GROUP BY title
    `, params);
    const rows = trimStringFields(result.rows);
    res.json({ titles: sortKorean(rows.map(row => row.title)) });
  } catch (error) {
    console.error('Error fetching textbook titles:', error);
    res.status(500).json({ error: '교과서 목록 조회에 실패했습니다' });
  }
});

// GET /api/textbooks/units?title= - 선택한 교과서의 단원 목록
router.get('/units', async (req, res) => {
  const title = String(req.query.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: '교과서를 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT unit
      FROM textbooks
      WHERE title = $1 AND unit IS NOT NULL AND TRIM(unit) != ''
      ORDER BY id
    `, [title]);
    const rows = trimStringFields(result.rows);
    res.json({ units: rows.map(row => row.unit) });
  } catch (error) {
    console.error('Error fetching textbook units:', error);
    res.status(500).json({ error: '단원 목록 조회에 실패했습니다' });
  }
});

export default router;
