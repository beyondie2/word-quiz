import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET /api/books - 모든 책 목록 조회
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT book_name FROM books ORDER BY book_name'
    );
    res.json({ books: result.rows.map(row => row.book_name) });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// GET /api/books/:bookName/units - 특정 책의 단원 목록 조회
router.get('/:bookName/units', async (req, res) => {
  const { bookName } = req.params;

  try {
    const result = await pool.query(
      'SELECT DISTINCT unit FROM books WHERE book_name = $1 ORDER BY unit',
      [bookName]
    );
    res.json({ units: result.rows.map(row => row.unit) });
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

// GET /api/books/:bookName/units/:unit/words - 특정 책과 단원의 단어 목록 조회
router.get('/:bookName/units/:unit/words', async (req, res) => {
  const { bookName, unit } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, english, korean, example FROM books WHERE book_name = $1 AND unit = $2 ORDER BY id',
      [bookName, unit]
    );
    res.json({ words: result.rows });
  } catch (error) {
    console.error('Error fetching words:', error);
    res.status(500).json({ error: 'Failed to fetch words' });
  }
});

export default router;
