import pool from '../config/database.js';

// exam_papers에 시험지를 만든 사용자 id를 추가한다. 기준 시험지는 비워 둔다.
async function migrate() {
  const client = await pool.connect();
  try {
    console.log('exam_papers에 user_id 열 추가 중...');

    await client.query(`
      ALTER TABLE exam_papers
      ADD COLUMN IF NOT EXISTS user_id INTEGER
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'exam_papers_user_id_fkey'
        ) THEN
          ALTER TABLE exam_papers
            ADD CONSTRAINT exam_papers_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_papers_user_id ON exam_papers(user_id)
    `);

    await client.query(`
      COMMENT ON COLUMN exam_papers.user_id IS
      '시험지를 만든 사용자 id. 기준 시험지는 비어 있다'
    `);

    const column = await client.query(`
      SELECT data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'exam_papers'
        AND column_name = 'user_id'
    `);
    const filled = await client.query(`
      SELECT COUNT(*)::int AS rows,
             COUNT(user_id)::int AS with_user_id
      FROM exam_papers
    `);
    const info = column.rows[0];
    console.log(`열 user_id: ${info?.data_type}, nullable=${info?.is_nullable}`);
    console.log(`행 ${filled.rows[0].rows}건, 사용자id가 있는 행 ${filled.rows[0].with_user_id}건`);
    console.log('exam_papers user_id 준비 완료');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
