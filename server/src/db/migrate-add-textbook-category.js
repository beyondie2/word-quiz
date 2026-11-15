import pool from '../config/database.js';

// 교과서 제목으로 공통영어 / 심화영어를 구분하는 열을 추가하고 기존 행을 채운다
async function migrate() {
  const client = await pool.connect();
  try {
    console.log('textbooks 분류 열 추가 중...');

    await client.query(`
      ALTER TABLE textbooks
      ADD COLUMN IF NOT EXISTS category VARCHAR(50)
    `);

    const updated = await client.query(`
      UPDATE textbooks
      SET category = CASE
        WHEN title LIKE '%공통영어%' THEN '공통영어'
        ELSE '심화영어'
      END
      WHERE category IS NULL OR BTRIM(category) = ''
    `);

    await client.query(`
      ALTER TABLE textbooks
      ALTER COLUMN category SET NOT NULL
    `);

    await client.query(`
      COMMENT ON COLUMN textbooks.category IS '공통영어, 심화영어 등. 제목에 공통영어가 있으면 공통영어, 없으면 심화영어'
    `);

    const summary = await client.query(`
      SELECT category, COUNT(DISTINCT title)::int AS titles, COUNT(*)::int AS rows
      FROM textbooks
      GROUP BY category
      ORDER BY category
    `);

    console.log(`비어 있던 행 ${updated.rowCount}건을 채웠습니다`);
    for (const row of summary.rows) {
      console.log(`${row.category}: 제목 ${row.titles}종, 행 ${row.rows}건`);
    }
    console.log('textbooks 분류 열 준비 완료');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
