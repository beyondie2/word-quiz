import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import usersRouter from './routes/users.js';
import booksRouter from './routes/books.js';
import quizRouter from './routes/quiz.js';
import progressRouter from './routes/progress.js';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',  // 로컬 개발용
  'http://localhost:4173',  // 로컬 프리뷰용
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // 서버 간 요청이나 Postman 등은 origin이 없을 수 있음
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(null, true); // 일단 모두 허용 (디버깅용, 추후 제한 가능)
    }
  },
  credentials: true
}));
app.use(express.json());

// 라우터
app.use('/api/users', usersRouter);
app.use('/api/books', booksRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/progress', progressRouter);

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Word Quiz API Server is running' });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
