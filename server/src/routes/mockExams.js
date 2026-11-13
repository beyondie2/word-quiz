import express from 'express';
import pool from '../config/database.js';
import { trimStringFields } from '../utils/trimHelper.js';

const router = express.Router();

// GET /api/mock-exams - mock_exams.name 목록
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT name
      FROM mock_exams
      WHERE name IS NOT NULL AND TRIM(name) != ''
      ORDER BY id
    `);
    const rows = trimStringFields(result.rows);
    res.json({ mockExams: rows.map(row => row.name) });
  } catch (error) {
    console.error('Error fetching mock exams:', error);
    res.status(500).json({ error: '모의고사 목록 조회에 실패했습니다' });
  }
});

export default router;
