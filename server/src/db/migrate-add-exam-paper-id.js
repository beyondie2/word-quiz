import pool from '../config/database.js';

// 사용자가 제작한 시험지를 구분하는 paper_id. 같은 시험지의 문항이 같은 값을 가진다.
async function migrate() {
  const client = await pool.connect();
  try {
    console.log('exam_papers에 paper_id 열 추가 중...');

    await client.query(`
      ALTER TABLE exam_papers
      ADD COLUMN IF NOT EXISTS paper_id INTEGER
    `);

    await client.query(`
      COMMENT ON COLUMN exam_papers.paper_id IS
      '사용자가 제작한 시험지를 구분하는 시험지id. 같은 시험지의 문항은 같은 값을 가진다'
    `);

    await client.query(`
      ALTER TABLE exam_papers
      DROP CONSTRAINT IF EXISTS exam_papers_school_sheet_order_key
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS exam_papers_template_order_key
      ON exam_papers (school, exam_sheet, order_no)
      WHERE paper_id IS NULL
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS exam_papers_user_paper_order_key
      ON exam_papers (paper_id, order_no)
      WHERE paper_id IS NOT NULL
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_papers_paper_id ON exam_papers(paper_id)
    `);

    const column = await client.query(`
      SELECT data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'exam_papers'
        AND column_name = 'paper_id'
    `);
    const filled = await client.query(`
      SELECT COUNT(*)::int AS rows,
             COUNT(paper_id)::int AS with_paper_id
      FROM exam_papers
    `);

    const info = column.rows[0];
    console.log(`열 paper_id: ${info?.data_type}, nullable=${info?.is_nullable}`);
    console.log(`행 ${filled.rows[0].rows}건, 시험지id가 있는 행 ${filled.rows[0].with_paper_id}건`);
    console.log('exam_papers paper_id 준비 완료');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
