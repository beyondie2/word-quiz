import pool from '../config/database.js';

// 시험지id(paper_id)와 사용자id를 잇는 시험지 소유자 테이블.
async function migrate() {
  const client = await pool.connect();
  try {
    console.log('exam_paper_owners 테이블 생성 중...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_paper_owners (
        id SERIAL PRIMARY KEY,
        paper_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT exam_paper_owners_paper_id_positive CHECK (paper_id > 0),
        CONSTRAINT exam_paper_owners_paper_id_key UNIQUE (paper_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_paper_owners_user_id ON exam_paper_owners(user_id)
    `);

    await client.query(`
      COMMENT ON TABLE exam_paper_owners IS
      '사용자가 제작한 시험지의 소유자. paper_id는 exam_papers.paper_id와 같다'
    `);

    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'exam_paper_owners'
      ORDER BY ordinal_position
    `);
    const constraints = await client.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'exam_paper_owners'::regclass
      ORDER BY conname
    `);

    console.log(`열: ${columns.rows.map((row) => row.column_name).join(', ')}`);
    console.log(`제약: ${constraints.rows.map((row) => row.conname).join(', ')}`);
    console.log('exam_paper_owners 준비 완료');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
