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

    const deleted = await client.query('DELETE FROM textbooks');
    await client.query('ALTER SEQUENCE textbooks_id_seq RESTART WITH 1');

    const count = await client.query('SELECT COUNT(*)::int AS count FROM textbooks');
    console.log(`제목 ${deleted.rowCount}건 삭제, 남은 행 ${count.rows[0].count}건`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
