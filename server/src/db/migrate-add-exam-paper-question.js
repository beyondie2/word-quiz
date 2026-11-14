import pool from '../config/database.js';

// exam_papers에 문제 본문(question)과 출처 구분(source_type)을 추가한다.
const SOURCE_TYPES = ['교과서', '모의고사', '부교재', '자작', '외부지문'];

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('exam_papers에 question, source_type 열 추가 중...');

    await client.query(`
      ALTER TABLE exam_papers
      ADD COLUMN IF NOT EXISTS question TEXT
    `);

    await client.query(`
      ALTER TABLE exam_papers
      ADD COLUMN IF NOT EXISTS source_type VARCHAR(20)
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'exam_papers_source_type_check'
        ) THEN
          ALTER TABLE exam_papers
            ADD CONSTRAINT exam_papers_source_type_check
            CHECK (source_type IS NULL OR source_type IN ('교과서', '모의고사', '부교재', '자작', '외부지문'));
        END IF;
      END $$
    `);

    await client.query(`
      UPDATE exam_papers
      SET source_type = '모의고사'
      WHERE source_type IS NULL
        AND sources = '24년10월2,25년10월2,26년10월2'
    `);

    await client.query(`
      UPDATE exam_papers
      SET source_type = '교과서'
      WHERE source_type IS NULL
        AND sources = '지학(신상근)2고2과,지학(신상근)2고3과,지학(신상근)2고4과'
    `);

    await client.query(`
      UPDATE exam_papers
      SET source_type = '외부지문'
      WHERE source_type IS NULL
        AND sources = '외부'
    `);

    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exam_papers'
        AND column_name IN ('question', 'source_type')
      ORDER BY column_name
    `);
    const filled = await client.query(`
      SELECT source_type, COUNT(*)::int AS count
      FROM exam_papers
      GROUP BY source_type
      ORDER BY source_type NULLS LAST
    `);

    console.log(`허용 출처구분: ${SOURCE_TYPES.join(', ')}`);
    for (const column of columns.rows) {
      console.log(`열 ${column.column_name}: ${column.data_type}, nullable=${column.is_nullable}`);
    }
    for (const row of filled.rows) {
      console.log(`출처구분 ${row.source_type ?? '(비어 있음)'}: ${row.count}건`);
    }
    console.log('exam_papers question, source_type 준비 완료');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
