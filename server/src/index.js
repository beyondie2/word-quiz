import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import usersRouter from './routes/users.js';
import booksRouter from './routes/books.js';
import quizRouter from './routes/quiz.js';
import progressRouter from './routes/progress.js';
import adminRouter from './routes/admin.js';
import authRouter from './routes/auth.js';
import grammarRouter from './routes/grammar.js';
import blocksRouter from './routes/blocks.js';
import spokenRouter from './routes/spoken.js';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정 - 모든 origin 허용 (디버깅용)
app.use(cors());
app.use(express.json());

// 라우터
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/books', booksRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/progress', progressRouter);
app.use('/api/admin', adminRouter);
app.use('/api/grammar', grammarRouter);
app.use('/api/blocks', blocksRouter);
app.use('/api/spoken', spokenRouter);

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
