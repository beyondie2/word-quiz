import pool from '../config/database.js';

// 문제은행: 출처 구분, 책 제목, 단원명, 나누어진 지문
async function migrate() {
  const client = await pool.connect();
  try {
    console.log('question_bank 테이블 생성 중...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS question_bank (
        id SERIAL PRIMARY KEY,
        source_type VARCHAR(20) NOT NULL,
        title VARCHAR(200) NOT NULL,
        unit_name VARCHAR(200) NOT NULL,
        passage TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT question_bank_source_type_check CHECK (
          source_type IN ('교과서', '모의고사', '부교재', '자작', '외부지문', '기타')
        )
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_question_bank_source
        ON question_bank(source_type, title, unit_name)
    `);

    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'question_bank'
      ORDER BY ordinal_position
    `);
    console.log(columns.rows.map((row) => `${row.column_name} ${row.data_type}`).join(', '));

    const check = await client.query(`
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conname = 'question_bank_source_type_check'
    `);
    console.log(check.rows[0]?.definition || '제약 조건을 찾지 못했습니다');
    console.log('question_bank 테이블 생성 완료');
  } catch (error) {
    console.error('마이그레이션 실패:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
