import pool from '../config/database.js';

// exam_questions.exam_scope의 짧은 이름을 교과서 단원명, 모의고사 정식 이름으로 바꾼다.
const RENAMES = [
  ['지학(신상근)2고2과', 'Lesson 2 The Future on Our Plates'],
  ['지학(신상근)2고3과', 'Lesson 3 Mathematics Is More Than Just Numbers'],
  ['지학(신상근)2고4과', 'Lesson 4 Colorful Stories of Colors'],
  ['지학(신상근)2고5과', 'Lesson 5 Winning with AI'],
  ['지학(신상근)2고6과', 'Lesson 6 Adventures in Literature'],
  ['24년10월2', '2024학년도 10월 고2 전국연합학력평가'],
  ['25년10월2', '2025학년도 10월 고2 전국연합학력평가'],
  ['26년10월2', '2026학년도 10월 고2 전국연합학력평가'],
];

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('exam_scope 이름 변경 중...');
    await client.query('BEGIN');

    let questionTotal = 0;
    for (const [from, to] of RENAMES) {
      const result = await client.query(
        `UPDATE exam_questions
         SET exam_scope = $2
         WHERE exam_scope = $1`,
        [from, to]
      );
      questionTotal += result.rowCount;
      console.log(`exam_questions ${from} → ${to}: ${result.rowCount}건`);
    }

    let paperTotal = 0;
    for (const [from, to] of RENAMES) {
      const result = await client.query(
        `UPDATE exam_papers
         SET sources = REPLACE(sources, $1, $2)
         WHERE sources LIKE '%' || $1 || '%'`,
        [from, to]
      );
      paperTotal += result.rowCount;
      if (result.rowCount > 0) {
        console.log(`exam_papers 출처 ${from}: ${result.rowCount}건`);
      }
    }

    const remaining = await client.query(
      `SELECT exam_scope, COUNT(*)::int AS count
       FROM exam_questions
       WHERE exam_scope = ANY($1::text[])
       GROUP BY exam_scope
       ORDER BY exam_scope`,
      [RENAMES.map(([from]) => from)]
    );

    await client.query('COMMIT');
    console.log(`문제 ${questionTotal}건, 시험지 출처 ${paperTotal}건 변경`);
    console.log(`남은 이전 이름: ${remaining.rows.length}종`);
    console.log('exam_scope 이름 변경 완료');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
