import pool from '../config/database.js';

// 부교재: 책 이름과 하위범위(1장, 2장 등)
async function migrate() {
  const client = await pool.connect();
  try {
    console.log('supplementary_books 테이블 생성 중...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS supplementary_books (
        id SERIAL PRIMARY KEY,
        book_name VARCHAR(200) NOT NULL,
        sub_scope VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT supplementary_books_book_name_sub_scope_key UNIQUE (book_name, sub_scope)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_supplementary_books_book_name ON supplementary_books(book_name)
    `);

    const columns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'supplementary_books'
      ORDER BY ordinal_position
    `);
    console.log(`열: ${columns.rows.map((row) => row.column_name).join(', ')}`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
