import pool from '../config/database.js';

const TEXTBOOK = '지학(신상근)2고2과,지학(신상근)2고3과,지학(신상근)2고4과';
const MOCK = '24년10월2,25년10월2,26년10월2';
const SCHOOL = '센텀여고';
const EXAM_SHEET = '26학년도2학년2학기중간';

// 순서번호, 구성번호, 출처들, 객주, 유형
const SEED_ROWS = [
  [1, '1', MOCK, '객관식', '주제'],
  [2, '2', TEXTBOOK, '객관식', '일치'],
  [3, '서답형 1', TEXTBOOK, '주관식', '국어영작'],
  [4, '3', '외부', '객관식', '어법'],
  [5, '4', TEXTBOOK, '객관식', '낱말'],
  [6, '5', TEXTBOOK, '객관식', '제목'],
  [7, '단답형 1', TEXTBOOK, '주관식', '국어낱말'],
  [8, '6', MOCK, '객관식', '낱말'],
  [9, '서답형 2', MOCK, '주관식', '국어영작'],
  [10, '7', TEXTBOOK, '객관식', '삽입'],
  [11, '8', MOCK, '객관식', '삽입'],
  [12, '단답형 2', TEXTBOOK, '주관식', '주관식요약'],
  [13, '9', MOCK, '객관식', '어법'],
  [14, '서답형 3', MOCK, '주관식', '추론영작'],
  [15, '10', TEXTBOOK, '객관식', '주제'],
  [16, '11', TEXTBOOK, '객관식', '어법'],
  [17, '12', '외부', '객관식', '순서'],
  [18, '13', MOCK, '객관식', '순서'],
  [19, '서답형 4', TEXTBOOK, '주관식', '국어영작'],
  [20, '14', TEXTBOOK, '객관식', '빈칸'],
  [21, '15', '외부', '객관식', '빈칸'],
  [22, '16', TEXTBOOK, '객관식', '빈칸'],
  [23, '17', TEXTBOOK, '객관식', '빈칸'],
  [24, '18', MOCK, '객관식', '빈칸'],
  [25, '19', MOCK, '객관식', '빈칸'],
  [26, '20', MOCK, '객관식', '삽입'],
  [27, '서답형 5', MOCK, '주관식', '추론영작'],
  [28, '21', TEXTBOOK, '객관식', '요약'],
  [29, '22', TEXTBOOK, '객관식', '순서'],
  [30, '23', TEXTBOOK, '객관식', '요지'],
  [31, '24', MOCK, '객관식', '요약'],
  [32, '서답형 6', '국어영작', '주관식', '국어영작'],
];

async function migrate() {
  try {
    console.log('Creating exam_papers table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS exam_papers (
        id SERIAL PRIMARY KEY,
        school VARCHAR(100) NOT NULL,
        exam_sheet VARCHAR(200) NOT NULL,
        order_no INTEGER NOT NULL,
        composition_no VARCHAR(50) NOT NULL,
        sources TEXT NOT NULL,
        answer_format VARCHAR(20) NOT NULL,
        question_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT exam_papers_answer_format_check CHECK (answer_format IN ('객관식', '주관식')),
        CONSTRAINT exam_papers_school_sheet_order_key UNIQUE (school, exam_sheet, order_no)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_papers_school_sheet ON exam_papers(school, exam_sheet)
    `);

    console.log('Seeding exam paper rows...');

    let inserted = 0;
    for (const [orderNo, compositionNo, sources, answerFormat, questionType] of SEED_ROWS) {
      const result = await pool.query(
        `INSERT INTO exam_papers
           (school, exam_sheet, order_no, composition_no, sources, answer_format, question_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (school, exam_sheet, order_no) DO NOTHING`,
        [SCHOOL, EXAM_SHEET, orderNo, compositionNo, sources, answerFormat, questionType]
      );
      inserted += result.rowCount;
    }

    const count = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM exam_papers
       WHERE school = $1 AND exam_sheet = $2`,
      [SCHOOL, EXAM_SHEET]
    );

    console.log(`Inserted ${inserted} rows. ${SCHOOL} / ${EXAM_SHEET}: ${count.rows[0].count} rows.`);
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
