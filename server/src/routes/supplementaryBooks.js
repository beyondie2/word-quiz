import express from 'express';
import pool from '../config/database.js';
import { trimStringFields } from '../utils/trimHelper.js';

const router = express.Router();

// GET /api/supplementary-books/names - 부교재 책 이름 목록
router.get('/names', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT book_name
      FROM supplementary_books
      WHERE book_name IS NOT NULL AND TRIM(book_name) != ''
      GROUP BY book_name
      ORDER BY MIN(id)
    `);
    const rows = trimStringFields(result.rows);
    res.json({ bookNames: rows.map(row => row.book_name) });
  } catch (error) {
    console.error('Error fetching supplementary book names:', error);
    res.status(500).json({ error: '부교재 목록 조회에 실패했습니다' });
  }
});

// GET /api/supplementary-books/scopes?bookName= - 선택한 부교재의 하위범위
router.get('/scopes', async (req, res) => {
  const bookName = String(req.query.bookName || '').trim();
  if (!bookName) {
    return res.status(400).json({ error: '부교재를 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT sub_scope
      FROM supplementary_books
      WHERE book_name = $1 AND sub_scope IS NOT NULL AND TRIM(sub_scope) != ''
      ORDER BY id
    `, [bookName]);
    const rows = trimStringFields(result.rows);
    res.json({ scopes: rows.map(row => row.sub_scope) });
  } catch (error) {
    console.error('Error fetching supplementary book scopes:', error);
    res.status(500).json({ error: '하위범위 목록 조회에 실패했습니다' });
  }
});

export default router;
