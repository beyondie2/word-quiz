import express from 'express';
import pool from '../config/database.js';
import { trimStringFields } from '../utils/trimHelper.js';

const router = express.Router();

// GET /api/schools/sido - schools.sido 고유 목록
router.get('/sido', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sido
      FROM schools
      WHERE sido IS NOT NULL AND TRIM(sido) != ''
      GROUP BY sido
      ORDER BY MIN(id)
    `);
    const rows = trimStringFields(result.rows);
    res.json({ sido: rows.map(row => row.sido) });
  } catch (error) {
    console.error('Error fetching sido:', error);
    res.status(500).json({ error: '시도 목록 조회에 실패했습니다' });
  }
});

// GET /api/schools/sigungu?sido= - 선택한 시도의 sigungu 고유 목록
router.get('/sigungu', async (req, res) => {
  const sido = String(req.query.sido || '').trim();
  if (!sido) {
    return res.status(400).json({ error: '시도를 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT sigungu
      FROM (
        SELECT DISTINCT sigungu
        FROM schools
        WHERE sido = $1 AND sigungu IS NOT NULL AND TRIM(sigungu) != ''
      ) regions
      ORDER BY sigungu COLLATE "C"
    `, [sido]);
    const rows = trimStringFields(result.rows);
    res.json({ sigungu: rows.map(row => row.sigungu) });
  } catch (error) {
    console.error('Error fetching sigungu:', error);
    res.status(500).json({ error: '시군구 목록 조회에 실패했습니다' });
  }
});

// GET /api/schools/names?sido=&sigungu= - 선택한 시도·시군구의 school_name 목록
router.get('/names', async (req, res) => {
  const sido = String(req.query.sido || '').trim();
  const sigungu = String(req.query.sigungu || '').trim();
  if (!sido || !sigungu) {
    return res.status(400).json({ error: '시도와 시군구를 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT school_name
      FROM schools
      WHERE sido = $1
        AND sigungu = $2
        AND school_name IS NOT NULL
        AND TRIM(school_name) != ''
      ORDER BY school_name COLLATE "C"
    `, [sido, sigungu]);
    const rows = trimStringFields(result.rows);
    res.json({ schools: rows.map(row => row.school_name) });
  } catch (error) {
    console.error('Error fetching school names:', error);
    res.status(500).json({ error: '학교 목록 조회에 실패했습니다' });
  }
});

export default router;
