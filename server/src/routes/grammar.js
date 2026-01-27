import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET /api/grammar/category1 - 분류1 목록 조회
router.get('/category1', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT category1 
      FROM grammar 
      WHERE category1 IS NOT NULL AND category1 != ''
      ORDER BY category1
    `);
    res.json({ category1List: result.rows.map(row => row.category1) });
  } catch (error) {
    console.error('Error fetching category1:', error);
    res.status(500).json({ error: '분류1 목록 조회에 실패했습니다' });
  }
});

// GET /api/grammar/category2 - 분류2 목록 조회 (분류1 기반)
router.get('/category2', async (req, res) => {
  const { category1 } = req.query;
  
  if (!category1) {
    return res.status(400).json({ error: '분류1을 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT category2 
      FROM grammar 
      WHERE category1 = $1 AND category2 IS NOT NULL AND category2 != ''
      ORDER BY category2
    `, [category1]);
    res.json({ category2List: result.rows.map(row => row.category2) });
  } catch (error) {
    console.error('Error fetching category2:', error);
    res.status(500).json({ error: '분류2 목록 조회에 실패했습니다' });
  }
});

// GET /api/grammar/levels - 수준 목록 조회 (분류1, 분류2 기반)
router.get('/levels', async (req, res) => {
  const { category1, category2 } = req.query;
  
  if (!category1 || !category2) {
    return res.status(400).json({ error: '분류1, 분류2를 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT level 
      FROM grammar 
      WHERE category1 = $1 AND category2 = $2 AND level IS NOT NULL AND level != ''
      ORDER BY level
    `, [category1, category2]);
    res.json({ levelList: result.rows.map(row => row.level) });
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ error: '수준 목록 조회에 실패했습니다' });
  }
});

// GET /api/grammar/instructions - 지시사항 목록 조회 (분류1, 분류2, 수준 기반)
router.get('/instructions', async (req, res) => {
  const { category1, category2, level } = req.query;
  
  if (!category1 || !category2 || !level) {
    return res.status(400).json({ error: '분류1, 분류2, 수준을 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT instruction 
      FROM grammar 
      WHERE category1 = $1 AND category2 = $2 AND level = $3 
        AND instruction IS NOT NULL AND instruction != ''
      ORDER BY instruction
    `, [category1, category2, level]);
    res.json({ instructionList: result.rows.map(row => row.instruction) });
  } catch (error) {
    console.error('Error fetching instructions:', error);
    res.status(500).json({ error: '지시사항 목록 조회에 실패했습니다' });
  }
});

// GET /api/grammar/questions - 문제 목록 조회 (모든 필터 기반)
router.get('/questions', async (req, res) => {
  const { category1, category2, level, instruction } = req.query;
  
  if (!category1 || !category2 || !level || !instruction) {
    return res.status(400).json({ error: '모든 필터를 선택해주세요' });
  }

  try {
    const result = await pool.query(`
      SELECT id, question, answer, sentence1, sentence2, sentence3, 
             translation1, translation2, translation3, image_file
      FROM grammar 
      WHERE category1 = $1 AND category2 = $2 AND level = $3 AND instruction = $4
      ORDER BY id
    `, [category1, category2, level, instruction]);
    res.json({ questions: result.rows });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: '문제 목록 조회에 실패했습니다' });
  }
});

// POST /api/grammar/check - 정답 확인
router.post('/check', async (req, res) => {
  const { userId, questionId, userAnswer, category1, category2, level, instruction, round } = req.body;

  if (!questionId || userAnswer === undefined || userAnswer === null) {
    return res.status(400).json({ error: '필수 정보가 누락되었습니다' });
  }

  try {
    // 정답 및 문제 조회
    const questionResult = await pool.query(
      'SELECT question, answer FROM grammar WHERE id = $1',
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: '문제를 찾을 수 없습니다' });
    }

    const { question, answer: correctAnswer } = questionResult.rows[0];
    
    // 정답 비교 (대소문자 무시, 앞뒤 공백 제거)
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();
    
    // 정답이 여러 개일 수 있음 (쉼표로 구분)
    const possibleAnswers = normalizedCorrectAnswer.split(',').map(a => a.trim().toLowerCase());
    const isCorrect = possibleAnswers.some(answer => answer === normalizedUserAnswer);

    // 학습 기록 저장 (userId가 있을 때만)
    if (userId) {
      try {
        await pool.query(`
          INSERT INTO grammar_progress 
          (user_id, grammar_id, category1, category2, level, instruction, question, correct_answer, wrong_answer, round, is_correct)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          userId, 
          questionId, 
          category1, 
          category2, 
          level, 
          instruction,
          question,
          correctAnswer,
          isCorrect ? null : userAnswer.trim(),
          round || 1,
          isCorrect
        ]);
      } catch (progressError) {
        console.error('Grammar progress save error:', progressError);
      }
    }

    res.json({
      correct: isCorrect,
      correctAnswer: correctAnswer,
      userAnswer: userAnswer.trim()
    });
  } catch (error) {
    console.error('Error checking grammar answer:', error);
    res.status(500).json({ error: '정답 확인에 실패했습니다' });
  }
});

// GET /api/grammar/progress - 문법 학습 기록 조회
router.get('/progress', async (req, res) => {
  const { requesterId, userId, date } = req.query;

  try {
    // 요청자 정보 확인
    const requesterResult = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [requesterId]
    );
    
    const isAdmin = requesterResult.rows[0]?.is_admin || false;

    let query = `
      SELECT gp.*, u.username
      FROM grammar_progress gp
      JOIN users u ON gp.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // 관리자가 아니면 자신의 기록만
    if (!isAdmin) {
      query += ` AND gp.user_id = $${paramIndex}`;
      params.push(requesterId);
      paramIndex++;
    } else if (userId) {
      query += ` AND gp.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (date) {
      query += ` AND DATE(gp.created_at) = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    query += ' ORDER BY gp.created_at DESC LIMIT 500';

    const result = await pool.query(query, params);

    // 통계 계산
    const records = result.rows;
    const totalQuestions = records.length;
    const correctCount = records.filter(r => r.is_correct).length;
    const wrongCount = totalQuestions - correctCount;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    res.json({
      records,
      stats: {
        totalQuestions,
        correctCount,
        wrongCount,
        accuracy
      }
    });
  } catch (error) {
    console.error('Error fetching grammar progress:', error);
    res.status(500).json({ error: '학습 기록 조회에 실패했습니다' });
  }
});

// POST /api/grammar/next-round - 라운드 증가
router.post('/next-round', async (req, res) => {
  const { userId, category1, category2, level, instruction, currentRound } = req.body;

  try {
    const newRound = (currentRound || 1) + 1;
    res.json({ success: true, newRound });
  } catch (error) {
    console.error('Error incrementing round:', error);
    res.status(500).json({ error: '라운드 증가에 실패했습니다' });
  }
});

export default router;
