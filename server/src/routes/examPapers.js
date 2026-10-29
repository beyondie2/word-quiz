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

export default router;
