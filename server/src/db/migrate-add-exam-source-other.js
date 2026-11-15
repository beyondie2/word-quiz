import pool from '../config/database.js';

// exam_papers 출처구분에 "기타"를 추가한다.
const SOURCE_TYPES = ['교과서', '모의고사', '부교재', '자작', '외부지문', '기타'];

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('exam_papers 출처구분에 기타 추가 중...');

    await client.query(`
      ALTER TABLE exam_papers DROP CONSTRAINT IF EXISTS exam_papers_source_type_check
    `);
    await client.query(`
      ALTER TABLE exam_papers
        ADD CONSTRAINT exam_papers_source_type_check
        CHECK (source_type IS NULL OR source_type IN ('교과서', '모의고사', '부교재', '자작', '외부지문', '기타'))
    `);

    const check = await client.query(`
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conname = 'exam_papers_source_type_check'
    `);
    console.log(check.rows[0]?.definition || '제약 조건을 찾지 못했습니다');
    console.log(`허용 출처구분: ${SOURCE_TYPES.join(', ')}`);
    console.log('exam_papers 출처구분 기타 추가 완료');
  } catch (error) {
    console.error('마이그레이션 실패:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
