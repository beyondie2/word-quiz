import pool from '../config/database.js';

// 교과서 제목과 단원
async function migrate() {
  const client = await pool.connect();
  try {
    console.log('textbooks 테이블 생성 중...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS textbooks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL UNIQUE,
        unit VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE textbooks
      ADD COLUMN IF NOT EXISTS unit VARCHAR(100)
    `);

    console.log('textbooks 테이블 준비 완료');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
