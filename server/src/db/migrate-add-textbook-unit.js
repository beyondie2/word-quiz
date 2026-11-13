import pool from '../config/database.js';

// 교과서 제목을 비우고 단원 열을 추가한다
async function migrate() {
  const client = await pool.connect();
  try {
    console.log('textbooks 단원 열 추가 중...');

    await client.query(`
      ALTER TABLE textbooks
      ADD COLUMN IF NOT EXISTS unit VARCHAR(100)
    `);

    console.log('textbooks 단원 열 준비 완료');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
