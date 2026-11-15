import pool from '../config/database.js';

// 모의고사 이름 목록. 입력 순서가 목록 순서다.
const MOCK_EXAM_NAMES = [
  '2022학년도 3월 고1 전국연합학력평가',
  '2022학년도 6월 고1 전국연합학력평가',
  '2022학년도 9월 고1 전국연합학력평가',
  '2022학년도 11월 고1 전국연합학력평가',
  '2022학년도 3월 고2 전국연합학력평가',
  '2022학년도 6월 고2 전국연합학력평가',
  '2022학년도 9월 고2 전국연합학력평가',
  '2022학년도 11월 고2 전국연합학력평가',
  '2022학년도 3월 고3 전국연합학력평가',
  '2022학년도 4월 고3 전국연합학력평가',
  '2023학년도 6월 대학수학능력시험 모의평가',
  '2022학년도 7월 고3 전국연합학력평가',
  '2023학년도 9월 대학수학능력시험 모의평가',
  '2022학년도 10월 고3 전국연합학력평가',
  '2023학년도 3월 고1 전국연합학력평가',
  '2023학년도 6월 고1 전국연합학력평가',
  '2023학년도 9월 고1 전국연합학력평가',
  '2023학년도 11월 고1 전국연합학력평가',
  '2023학년도 3월 고2 전국연합학력평가',
  '2023학년도 6월 고2 전국연합학력평가',
  '2023학년도 9월 고2 전국연합학력평가',
  '2023학년도 11월 고2 전국연합학력평가',
  '2023학년도 3월 고3 전국연합학력평가',
  '2023학년도 5월 고3 전국연합학력평가',
  '2024학년도 6월 대학수학능력시험 모의평가',
  '2023학년도 7월 고3 전국연합학력평가',
  '2024학년도 9월 대학수학능력시험 모의평가',
  '2023학년도 10월 고3 전국연합학력평가',
  '2024학년도 3월 고1 전국연합학력평가',
  '2024학년도 6월 고1 전국연합학력평가',
  '2024학년도 9월 고1 전국연합학력평가',
  '2024학년도 10월 고1 전국연합학력평가',
  '2024학년도 3월 고2 전국연합학력평가',
  '2024학년도 6월 고2 전국연합학력평가',
  '2024학년도 9월 고2 전국연합학력평가',
  '2024학년도 10월 고2 전국연합학력평가',
  '2024학년도 3월 고3 전국연합학력평가',
  '2024학년도 5월 고3 전국연합학력평가',
  '2025학년도 6월 대학수학능력시험 모의평가',
  '2024학년도 7월 고3 전국연합학력평가',
  '2025학년도 9월 대학수학능력시험 모의평가',
  '2024학년도 10월 고3 전국연합학력평가',
  '2025학년도 3월 고1 전국연합학력평가',
  '2025학년도 6월 고1 전국연합학력평가',
  '2025학년도 9월 고1 전국연합학력평가',
  '2025학년도 10월 고1 전국연합학력평가',
  '2025학년도 3월 고2 전국연합학력평가',
  '2025학년도 6월 고2 전국연합학력평가',
  '2025학년도 9월 고2 전국연합학력평가',
  '2025학년도 10월 고2 전국연합학력평가',
  '2025학년도 3월 고3 전국연합학력평가',
  '2025학년도 5월 고3 전국연합학력평가',
  '2026학년도 6월 대학수학능력시험 모의평가',
  '2025학년도 7월 고3 전국연합학력평가',
  '2026학년도 9월 대학수학능력시험 모의평가',
  '2025학년도 10월 고3 전국연합학력평가',
  '2026학년도 3월 고1 전국연합학력평가',
  '2026학년도 6월 고1 전국연합학력평가',
  '2026학년도 9월 고1 전국연합학력평가',
  '2026학년도 10월 고1 전국연합학력평가',
  '2026학년도 3월 고2 전국연합학력평가',
  '2026학년도 6월 고2 전국연합학력평가',
  '2026학년도 9월 고2 전국연합학력평가',
  '2026학년도 10월 고2 전국연합학력평가',
  '2026학년도 3월 고3 전국연합학력평가',
  '2026학년도 5월 고3 전국연합학력평가',
  '2027학년도 6월 대학수학능력시험 모의평가',
  '2026학년도 7월 고3 전국연합학력평가',
  '2027학년도 9월 대학수학능력시험 모의평가',
  '2026학년도 10월 고3 전국연합학력평가',
];

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('mock_exams 테이블 생성 중...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS mock_exams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL UNIQUE,
        grade VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE mock_exams
      ADD COLUMN IF NOT EXISTS grade VARCHAR(10)
    `);

    const result = await client.query(
      `INSERT INTO mock_exams (name, grade)
       SELECT name,
         CASE
           WHEN name LIKE '%고1%' THEN '고1'
           WHEN name LIKE '%고2%' THEN '고2'
           ELSE '고3'
         END
       FROM unnest($1::text[]) WITH ORDINALITY AS listed(name, ord)
       ORDER BY ord
       ON CONFLICT (name) DO NOTHING`,
      [MOCK_EXAM_NAMES]
    );

    const count = await client.query('SELECT COUNT(*)::int AS count FROM mock_exams');
    const first = await client.query('SELECT name FROM mock_exams ORDER BY id LIMIT 1');
    const last = await client.query('SELECT name FROM mock_exams ORDER BY id DESC LIMIT 1');
    console.log(`목록 ${MOCK_EXAM_NAMES.length}건, 새로 추가 ${result.rowCount}건, 테이블 합계 ${count.rows[0].count}건`);
    console.log(`처음: ${first.rows[0]?.name}`);
    console.log(`마지막: ${last.rows[0]?.name}`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
