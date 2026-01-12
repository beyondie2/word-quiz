import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

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

    // 연습 모드에 따라 정답 확인
    if (practiceMode === 'english') {
      // 영어를 보고 한국어로 답하는 경우
      correctAnswer = word.korean;
      const koreanAnswers = word.korean.split(',').map(s => s.trim().toLowerCase());
      const userAnswerTrimmed = userAnswer.trim().toLowerCase();

      if (koreanAnswerType === 'one') {
        // 하나만 맞아도 정답
        isCorrect = koreanAnswers.some(answer => answer === userAnswerTrimmed);
      } else {
        // 전부 맞아야 정답
        const userAnswers = userAnswerTrimmed.split(',').map(s => s.trim()).sort();
        const sortedCorrect = koreanAnswers.sort();
        isCorrect = JSON.stringify(userAnswers) === JSON.stringify(sortedCorrect);
      }
    } else {
      // 한국어를 보고 영어로 답하는 경우
      correctAnswer = word.english;
      isCorrect = userAnswer.trim().toLowerCase() === word.english.trim().toLowerCase();
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
