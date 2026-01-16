import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET /api/users - 모든 사용자 목록 조회
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username FROM users ORDER BY username'
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users/verify - 사용자 이름 확인 및 책 목록 반환
router.post('/verify', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, message: '이름을 입력해주세요' });
  }

  try {
    // 사용자 확인
    const userResult = await pool.query(
      'SELECT id, username, is_admin FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.json({ success: false, message: '등록되지 않은 사용자입니다' });
    }

    const user = userResult.rows[0];

    // 책 목록 조회
    const booksResult = await pool.query(
      'SELECT DISTINCT book_name FROM books ORDER BY book_name'
    );

    const books = booksResult.rows.map(row => row.book_name);

    res.json({
      success: true,
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin || false,
      books
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다' });
  }
});

export default router;
