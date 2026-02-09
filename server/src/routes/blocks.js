import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// POST /api/blocks/progress - 블럭영작 수행 기록 저장 (전체 문장 모드)
router.post('/progress', async (req, res) => {
  const { userId, blocksId, book, lesson, sentenceNumber, english, correctAnswer, wrongAnswer, isCorrect } = req.body;

  if (!userId) {
    return res.status(400).json({ error: '사용자 정보가 필요합니다' });
  }

  try {
    await pool.query(`
      INSERT INTO blocks_progress 
      (user_id, blocks_id, book, lesson, sentence_number, english, correct_answer, wrong_answer, phase, round, is_correct)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'full', $9, $10)
    `, [
      userId,
      blocksId || null,
      book || null,
      lesson || null,
      sentenceNumber ?? null,
      english || null,
      correctAnswer || null,
      isCorrect ? null : (wrongAnswer || null),
      1, // round
      !!isCorrect
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving blocks progress:', error);
    res.status(500).json({ error: '블럭영작 수행 기록 저장에 실패했습니다' });
  }
});

// GET /api/blocks/progress - 블럭영작 수행 기록 조회
router.get('/progress', async (req, res) => {
  const { requesterId, userId, date } = req.query;

  try {
    const requesterResult = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [requesterId]
    );
    const isAdmin = requesterResult.rows[0]?.is_admin || false;

    let query = `
      SELECT bp.id, bp.user_id, bp.blocks_id, bp.book, bp.lesson, bp.sentence_number,
             bp.english, bp.correct_answer, bp.wrong_answer, bp.phase, bp.round,
             bp.is_correct, bp.created_at, u.username
      FROM blocks_progress bp
      JOIN users u ON bp.user_id = u.id
      WHERE bp.phase = 'full'
    `;
    const params = [];
    let paramIndex = 1;

    if (!isAdmin) {
      query += ` AND bp.user_id = $${paramIndex}`;
      params.push(requesterId);
      paramIndex++;
    } else if (userId) {
      query += ` AND bp.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (date) {
      query += ` AND DATE(bp.created_at) = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    query += ' ORDER BY bp.created_at DESC LIMIT 500';

    const result = await pool.query(query, params);
    const records = result.rows;

    const totalQuestions = records.length;
    const correctCount = records.filter(r => r.is_correct).length;
    const wrongCount = totalQuestions - correctCount;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    res.json({
      records,
      stats: { totalQuestions, correctCount, wrongCount, accuracy }
    });
  } catch (error) {
    console.error('Error fetching blocks progress:', error);
    res.status(500).json({ error: '블럭영작 수행 기록 조회에 실패했습니다' });
  }
});

// GET /api/blocks - 블럭영작 문제 전체 목록 조회
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, book, lesson, sentence_number, english, korean_blocks, korean_full, created_at
      FROM blocks 
      ORDER BY book, lesson, sentence_number, id
    `);
    res.json({ blocks: result.rows });
  } catch (error) {
    console.error('Error fetching blocks:', error);
    res.status(500).json({ error: '블럭영작 목록 조회에 실패했습니다' });
  }
});

// GET /api/blocks/books - 책 목록 조회
router.get('/books', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT book 
      FROM blocks 
      WHERE book IS NOT NULL AND book != ''
      ORDER BY book
    `);
    res.json({ books: result.rows.map(row => row.book) });
  } catch (error) {
    console.error('Error fetching blockwriting books:', error);
    res.status(500).json({ error: '책 목록 조회에 실패했습니다' });
  }
});

// GET /api/blocks/lessons - 레슨 목록 조회
router.get('/lessons', async (req, res) => {
  const { book } = req.query;

  if (!book) {
    return res.status(400).json({ error: '책을 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT lesson 
      FROM blocks 
      WHERE book = $1 AND lesson IS NOT NULL AND lesson != ''
      ORDER BY lesson
    `, [book]);
    res.json({ lessons: result.rows.map(row => row.lesson) });
  } catch (error) {
    console.error('Error fetching blockwriting lessons:', error);
    res.status(500).json({ error: '레슨 목록 조회에 실패했습니다' });
  }
});

// GET /api/blocks/sentence-numbers - 문장번호 목록 조회
router.get('/sentence-numbers', async (req, res) => {
  const { book, lesson } = req.query;

  if (!book || !lesson) {
    return res.status(400).json({ error: '책과 레슨을 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT sentence_number 
      FROM blocks 
      WHERE book = $1 AND lesson = $2 AND sentence_number IS NOT NULL
      ORDER BY sentence_number
    `, [book, lesson]);
    res.json({ sentenceNumbers: result.rows.map(row => row.sentence_number) });
  } catch (error) {
    console.error('Error fetching sentence numbers:', error);
    res.status(500).json({ error: '문장번호 목록 조회에 실패했습니다' });
  }
});

// GET /api/blocks/questions - 문제 목록 조회
router.get('/questions', async (req, res) => {
  const { book, lesson, sentenceNumber } = req.query;

  try {
    let query = `
      SELECT id, book, lesson, sentence_number, english, korean_blocks, korean_full
      FROM blocks 
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (book) {
      query += ` AND book = $${paramIndex++}`;
      params.push(book);
    }

    if (lesson) {
      query += ` AND lesson = $${paramIndex++}`;
      params.push(lesson);
    }

    if (sentenceNumber) {
      query += ` AND sentence_number = $${paramIndex++}`;
      params.push(sentenceNumber);
    }

    query += ` ORDER BY sentence_number, id`;

    const result = await pool.query(query, params);
    res.json({ questions: result.rows });
  } catch (error) {
    console.error('Error fetching blockwriting questions:', error);
    res.status(500).json({ error: '문제 목록 조회에 실패했습니다' });
  }
});

// POST /api/blocks/upload - 엑셀 파일로 블럭영작 문제 업로드
router.post('/upload', async (req, res) => {
  const { data } = req.body;

  if (!data || !Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: '업로드할 데이터가 없습니다' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of data) {
      const { book, lesson, sentence_number, english, korean_blocks, korean_full } = row;
      
      // 필수 필드 확인
      if (!english || !korean_blocks || !korean_full) {
        skippedCount++;
        continue;
      }

      await client.query(`
        INSERT INTO blocks (book, lesson, sentence_number, english, korean_blocks, korean_full)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [book || null, lesson || null, sentence_number || null, english, korean_blocks, korean_full]);
      
      insertedCount++;
    }

    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `${insertedCount}개의 블럭영작 문제가 추가되었습니다.${skippedCount > 0 ? ` (${skippedCount}개 건너뜀)` : ''}`,
      insertedCount,
      skippedCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading blocks:', error);
    res.status(500).json({ error: '블럭영작 문제 업로드에 실패했습니다' });
  } finally {
    client.release();
  }
});

// DELETE /api/blocks/:id - 블럭영작 문제 삭제
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM blocks WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '문제를 찾을 수 없습니다' });
    }

    res.json({ success: true, message: '블럭영작 문제가 삭제되었습니다' });
  } catch (error) {
    console.error('Error deleting block:', error);
    res.status(500).json({ error: '블럭영작 문제 삭제에 실패했습니다' });
  }
});

// DELETE /api/blocks - 블럭영작 문제 전체 삭제
router.delete('/', async (req, res) => {
  try {
    await pool.query('DELETE FROM blocks');
    res.json({ success: true, message: '모든 블럭영작 문제가 삭제되었습니다' });
  } catch (error) {
    console.error('Error deleting all blocks:', error);
    res.status(500).json({ error: '블럭영작 문제 전체 삭제에 실패했습니다' });
  }
});

export default router;
