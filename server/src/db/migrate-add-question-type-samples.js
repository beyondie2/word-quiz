import pool from '../config/database.js';

// 유형 샘플 테이블: 업로드된 시험지의 문항 유형을 분석할 때 참고하는 유형별 예시 문제
async function migrate() {
  try {
    console.log('Creating question_type_samples table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_type_samples (
        id SERIAL PRIMARY KEY,
        question_type VARCHAR(100) NOT NULL,
        question TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_question_type_samples_question_type ON question_type_samples(question_type)
    `);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
