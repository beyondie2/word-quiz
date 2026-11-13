import express from 'express';
import pool from '../config/database.js';
import { trimStringFields } from '../utils/trimHelper.js';

const router = express.Router();

// GET /api/textbooks/titles - textbooks.title 고유 목록
router.get('/titles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT title
      FROM textbooks
      WHERE title IS NOT NULL AND TRIM(title) != ''
      GROUP BY title
      ORDER BY MIN(id)
    `);
    const rows = trimStringFields(result.rows);
    res.json({ titles: rows.map(row => row.title) });
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
