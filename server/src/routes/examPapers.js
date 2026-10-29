import express from 'express';
import pool from '../config/database.js';
import { trimStringFields } from '../utils/trimHelper.js';

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

export default router;
