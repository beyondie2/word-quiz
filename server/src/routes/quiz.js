import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// 정답 비교용 정규화: 앞뒤 공백 제거 + 연속 공백을 하나로
function normalizeAnswer(str) {
  return (str || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// POST /api/quiz/check - 정답 확인
router.post('/check', async (req, res) => {
  const {
    userId,
    wordId,
    userAnswer,
    practiceMode,
    koreanAnswerType,
    bookName,
    unit,
    round,
    unitReviewCount
  } = req.body;

  try {
    // 단어 정보 조회
    const wordResult = await pool.query(
      'SELECT id, english, korean, example FROM books WHERE id = $1',
      [wordId]
    );

    if (wordResult.rows.length === 0) {
      return res.status(404).json({ error: '단어를 찾을 수 없습니다' });
    }

    const word = wordResult.rows[0];
    let isCorrect = false;
    let correctAnswer = '';

    // 연습 모드에 따라 정답 확인 (trim + 연속 공백 정규화 적용)
    if (practiceMode === 'english') {
      // 영어를 보고 한국어로 답하는 경우
      correctAnswer = word.korean;
      const koreanAnswers = word.korean.split(',').map(s => normalizeAnswer(s));
      const userAnswerNormalized = normalizeAnswer(userAnswer);

      if (koreanAnswerType === 'one') {
        // 하나만 맞아도 정답
        isCorrect = koreanAnswers.some(answer => answer === userAnswerNormalized);
      } else {
        // 전부 맞아야 정답
        const userAnswers = userAnswerNormalized.split(',').map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean).sort();
        const sortedCorrect = koreanAnswers.filter(Boolean).sort();
        isCorrect = JSON.stringify(userAnswers) === JSON.stringify(sortedCorrect);
      }
    } else {
      // 한국어를 보고 영어로 답하는 경우
      correctAnswer = word.english;
      isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(word.english);
    }

    // 학습 기록 저장
    await pool.query(
      `INSERT INTO user_progress 
       (user_id, book_name, unit, english, korean, wrong_answer, practice_mode, korean_answer_type, round, unit_review_count, is_correct)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        bookName,
        unit,
        word.english,
        word.korean,
        isCorrect ? null : userAnswer,
        practiceMode,
        koreanAnswerType,
        round,
        unitReviewCount,
        isCorrect
      ]
    );

    res.json({
      correct: isCorrect,
      correctAnswer: isCorrect ? null : correctAnswer,
      word
    });
  } catch (error) {
    console.error('Error checking answer:', error);
    res.status(500).json({ error: 'Failed to check answer' });
  }
});

export default router;
