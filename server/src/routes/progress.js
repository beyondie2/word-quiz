import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET /api/progress - 수행 기록 조회
router.get('/', async (req, res) => {
  const { userId, date, requesterId } = req.query;

  try {
    // 요청자의 관리자 여부 확인
    let isAdmin = false;
    if (requesterId) {
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [requesterId]
      );
      if (adminCheck.rows.length > 0) {
        isAdmin = adminCheck.rows[0].is_admin || false;
      }
    }

    let query = `
      SELECT 
        up.id,
        up.book_name,
        up.unit,
        up.english,
        up.korean,
        up.wrong_answer,
        up.practice_mode,
        up.korean_answer_type,
        up.round,
        up.unit_review_count,
        up.is_correct,
        up.created_at,
        u.username
      FROM user_progress up
      JOIN users u ON up.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // 관리자가 아닌 경우 본인 기록만 조회 가능
    if (!isAdmin && requesterId) {
      params.push(requesterId);
      query += ` AND up.user_id = $${params.length}`;
    } else if (userId) {
      // 관리자인 경우 특정 사용자 필터링 가능
      params.push(userId);
      query += ` AND up.user_id = $${params.length}`;
    }

    if (date) {
      params.push(date);
      query += ` AND DATE(up.created_at) = $${params.length}`;
    }

    query += ' ORDER BY up.created_at DESC';

    const result = await pool.query(query, params);

    // 통계 계산
    const records = result.rows;
    const stats = calculateStats(records);

    res.json({ records, stats });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// POST /api/progress - 학습 기록 저장
router.post('/', async (req, res) => {
  const {
    userId,
    bookName,
    unit,
    english,
    korean,
    wrongAnswer,
    practiceMode,
    koreanAnswerType,
    round,
    unitReviewCount,
    isCorrect
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO user_progress 
       (user_id, book_name, unit, english, korean, wrong_answer, practice_mode, korean_answer_type, round, unit_review_count, is_correct)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [userId, bookName, unit, english, korean, wrongAnswer, practiceMode, koreanAnswerType, round, unitReviewCount, isCorrect]
    );

    res.json({ success: true, progressId: result.rows[0].id });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ success: false, error: 'Failed to save progress' });
  }
});

// GET /api/progress/:userId/wrong-words - 틀린 단어 목록 조회
router.get('/:userId/wrong-words', async (req, res) => {
  const { userId } = req.params;
  const { bookName, unit, round } = req.query;

  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (english) 
        id, english, korean, wrong_answer
       FROM user_progress 
       WHERE user_id = $1 
         AND book_name = $2 
         AND unit = $3 
         AND round = $4 
         AND is_correct = false
       ORDER BY english, created_at DESC`,
      [userId, bookName, unit, round]
    );

    if (result.rows.length === 0) {
      return res.json({
        wrongWords: [],
        message: '모든 단어를 맞추셨습니다!'
      });
    }

    res.json({ wrongWords: result.rows });
  } catch (error) {
    console.error('Error fetching wrong words:', error);
    res.status(500).json({ error: 'Failed to fetch wrong words' });
  }
});

// POST /api/progress/:userId/next-round - 라운드 증가
router.post('/:userId/next-round', async (req, res) => {
  const { userId } = req.params;
  const { bookName, unit } = req.body;

  try {
    // 현재 최대 라운드 조회
    const result = await pool.query(
      `SELECT MAX(round) as max_round 
       FROM user_progress 
       WHERE user_id = $1 AND book_name = $2 AND unit = $3`,
      [userId, bookName, unit]
    );

    const currentRound = result.rows[0].max_round || 0;
    const newRound = currentRound + 1;

    res.json({ success: true, newRound });
  } catch (error) {
    console.error('Error getting next round:', error);
    res.status(500).json({ success: false, error: 'Failed to get next round' });
  }
});

// 통계 계산 헬퍼 함수
function calculateStats(records) {
  if (records.length === 0) {
    return {
      totalWords: 0,
      correctCount: 0,
      wrongCount: 0,
      accuracy: 0
    };
  }

  const totalWords = records.length;
  const correctCount = records.filter(r => r.is_correct).length;
  const wrongCount = totalWords - correctCount;
  const accuracy = Math.round((correctCount / totalWords) * 100);

  return {
    totalWords,
    correctCount,
    wrongCount,
    accuracy
  };
}

export default router;
