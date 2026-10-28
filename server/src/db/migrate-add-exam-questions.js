import pool from '../config/database.js';

async function migrate() {
  try {
    console.log('Creating exam_questions table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS exam_questions (
        id SERIAL PRIMARY KEY,
        exam_scope VARCHAR(200) NOT NULL,
        question_type VARCHAR(100) NOT NULL,
        answer_format VARCHAR(20) NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT exam_questions_answer_format_check CHECK (answer_format IN ('객관식', '주관식'))
      )
    `);

    console.log('Creating indexes...');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_scope ON exam_questions(exam_scope)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_questions_question_type ON exam_questions(question_type)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_exam_questions_answer_format ON exam_questions(answer_format)
    `);

    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exam_questions'
      ORDER BY ordinal_position
    `);

    console.log('exam_questions columns:');
    columns.rows.forEach((row) => {
      console.log(`  - ${row.column_name} (${row.data_type}, nullable=${row.is_nullable})`);
    });

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
