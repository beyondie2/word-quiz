import pool from '../config/database.js';

// 모의고사 이름으로 고1 / 고2 / 고3을 구분하는 열을 추가하고 기존 행을 채운다.
// 고1, 고2가 아니면 대학수학능력시험 모의평가를 포함해 모두 고3이다.
async function migrate() {
  const client = await pool.connect();
  try {
    console.log('mock_exams 학년구분 열 추가 중...');

    await client.query(`
      ALTER TABLE mock_exams
      ADD COLUMN IF NOT EXISTS grade VARCHAR(10)
    `);

    const updated = await client.query(`
      UPDATE mock_exams
      SET grade = CASE
        WHEN name LIKE '%고1%' THEN '고1'
        WHEN name LIKE '%고2%' THEN '고2'
        ELSE '고3'
      END
      WHERE grade IS NULL OR BTRIM(grade) = ''
    `);

    await client.query(`
      ALTER TABLE mock_exams
      ALTER COLUMN grade SET NOT NULL
    `);

    await client.query(`
      COMMENT ON COLUMN mock_exams.grade IS '학년구분. 이름에 고1이 있으면 고1, 고2가 있으면 고2, 그 외는 고3'
    `);

    const summary = await client.query(`
      SELECT grade, COUNT(*)::int AS rows
      FROM mock_exams
      GROUP BY grade
      ORDER BY grade
    `);

    console.log(`비어 있던 행 ${updated.rowCount}건을 채웠습니다`);
    for (const row of summary.rows) {
      console.log(`${row.grade}: ${row.rows}건`);
    }
    console.log('mock_exams 학년구분 열 준비 완료');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
